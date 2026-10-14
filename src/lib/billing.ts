import "server-only";
import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { APP_URL, env } from "./env";
import { PLANS, isPlanId, type PlanId } from "./plans";
import { audit, reportError } from "./audit";
import { paymentFailedMail, sendMail } from "./email";
import type { Organization } from "@/db/schema";

const { organizations, stripeEvents, memberships, users } = schema;

let stripeSingleton: Stripe | null = null;
export async function getStripe(): Promise<Stripe> {
  if (!env.stripe.configured) throw new Error("Stripe is not configured (STRIPE_SECRET_KEY).");
  if (!stripeSingleton) {
    const StripeCtor = (await import("stripe")).default;
    stripeSingleton = new StripeCtor(env.stripe.secretKey, { typescript: true });
  }
  return stripeSingleton;
}

export function priceIdFor(plan: PlanId) {
  const id = env.stripe.prices[plan];
  if (!id) throw new Error(`Missing STRIPE_PRICE_${plan.toUpperCase()}`);
  return id;
}

export function planForPriceId(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  for (const p of Object.keys(PLANS) as PlanId[]) if (env.stripe.prices[p] === priceId) return p;
  return null;
}

async function ensureCustomer(org: Organization, email: string): Promise<string> {
  if (org.stripeCustomerId) return org.stripeCustomerId;
  const stripe = await getStripe();
  const customer = await stripe.customers.create({ name: org.name, email, metadata: { orgId: String(org.id), orgSlug: org.slug } });
  const db = await getDb();
  await db.update(organizations).set({ stripeCustomerId: customer.id }).where(eq(organizations.id, org.id));
  return customer.id;
}

/** Start Stripe Checkout for a plan. Returns the URL to redirect the browser to. */
export async function createCheckoutUrl(org: Organization, plan: PlanId, email: string, userId: number): Promise<string> {
  const stripe = await getStripe();
  const customer = await ensureCustomer(org, email);

  // An org that already has a live subscription must change its price, not start a
  // second subscription (which would double-bill). Send them through the portal's
  // confirm-update flow so Stripe shows the proration and handles it.
  if (org.stripeSubscriptionId) {
    const sub = await stripe.subscriptions.retrieve(org.stripeSubscriptionId).catch(() => null);
    const live = sub && !["canceled", "incomplete_expired"].includes(sub.status);
    const item = live ? sub.items.data[0] : undefined;
    if (live && item) {
      const session = await stripe.billingPortal.sessions.create({
        customer,
        return_url: `${APP_URL}/app/settings/billing?checkout=success`,
        flow_data: {
          type: "subscription_update_confirm",
          subscription_update_confirm: { subscription: sub.id, items: [{ id: item.id, price: priceIdFor(plan), quantity: 1 }] },
          after_completion: { type: "redirect", redirect: { return_url: `${APP_URL}/app/settings/billing?checkout=success` } },
        },
      });
      await audit({ orgId: org.id, userId, action: "billing.plan_change_started", meta: { from: org.plan, to: plan } });
      return session.url;
    }
  }

  const neverPaid = !org.stripeSubscriptionId;
  const trialDaysLeft = org.trialEndsAt ? Math.max(0, Math.ceil((org.trialEndsAt.getTime() - Date.now()) / 86_400_000)) : 0;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price: priceIdFor(plan), quantity: 1 }],
    allow_promotion_codes: true,
    subscription_data: {
      metadata: { orgId: String(org.id) },
      // Carry over whatever is left of the in-app trial so nobody is charged early.
      ...(neverPaid && trialDaysLeft > 0 ? { trial_period_days: trialDaysLeft } : {}),
    },
    success_url: `${APP_URL}/app/settings/billing?checkout=success`,
    cancel_url: `${APP_URL}/app/settings/billing?checkout=canceled`,
    metadata: { orgId: String(org.id), plan },
  });
  await audit({ orgId: org.id, userId, action: "billing.checkout_started", meta: { plan } });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

export async function createPortalUrl(org: Organization, email: string): Promise<string> {
  const stripe = await getStripe();
  const customer = await ensureCustomer(org, email);
  const session = await stripe.billingPortal.sessions.create({ customer, return_url: `${APP_URL}/app/settings/billing` });
  return session.url;
}

function mapStatus(s: Stripe.Subscription.Status): string {
  switch (s) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    case "unpaid":
      return "unpaid";
    default:
      return "active"; // incomplete / paused — treat as active until Stripe says otherwise
  }
}

function periodEnd(sub: Stripe.Subscription): Date | null {
  const item = sub.items?.data?.[0] as (Stripe.SubscriptionItem & { current_period_end?: number }) | undefined;
  const ts = item?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end;
  return ts ? new Date(ts * 1000) : null;
}

/** Write a Stripe subscription's state onto the org row. */
export async function syncSubscription(sub: Stripe.Subscription) {
  const db = await getDb();
  const orgId = Number(sub.metadata?.orgId);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const [org] = orgId
    ? await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1)
    : await db.select().from(organizations).where(eq(organizations.stripeCustomerId, customerId)).limit(1);
  if (!org) {
    reportError(new Error("Stripe subscription for unknown org"), { subscription: sub.id, customerId });
    return;
  }
  const priceId = sub.items.data[0]?.price?.id ?? null;
  const plan = planForPriceId(priceId);
  const status = mapStatus(sub.status);
  await db
    .update(organizations)
    .set({
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId,
      plan: status === "canceled" ? "canceled" : (plan ?? org.plan),
      planStatus: status,
      currentPeriodEnd: periodEnd(sub),
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    })
    .where(eq(organizations.id, org.id));
  await audit({ orgId: org.id, action: "billing.subscription_synced", meta: { status, plan, subscription: sub.id } });
}

async function ownerEmails(orgId: number): Promise<string[]> {
  const db = await getDb();
  const rows = await db
    .select({ email: users.email, role: memberships.role })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.orgId, orgId));
  const owners = rows.filter((r) => r.role === "owner" || r.role === "admin").map((r) => r.email);
  return owners.length ? owners : rows.map((r) => r.email);
}

/** Idempotent webhook processor. */
export async function handleStripeEvent(event: Stripe.Event): Promise<"processed" | "duplicate" | "ignored"> {
  const db = await getDb();
  const seen = await db.select().from(stripeEvents).where(eq(stripeEvents.id, event.id)).limit(1);
  if (seen[0]) return "duplicate";

  let outcome: "processed" | "ignored" = "ignored";
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode === "subscription" && session.subscription) {
        const stripe = await getStripe();
        const sub = await stripe.subscriptions.retrieve(typeof session.subscription === "string" ? session.subscription : session.subscription.id);
        if (!sub.metadata?.orgId && session.metadata?.orgId) sub.metadata = { ...sub.metadata, orgId: session.metadata.orgId };
        await syncSubscription(sub);
        outcome = "processed";
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await syncSubscription(event.data.object);
      outcome = "processed";
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (customerId) {
        const [org] = await db.select().from(organizations).where(eq(organizations.stripeCustomerId, customerId)).limit(1);
        if (org) {
          await db.update(organizations).set({ planStatus: "past_due" }).where(eq(organizations.id, org.id));
          await sendMail(paymentFailedMail({ to: await ownerEmails(org.id), orgName: org.name }));
          await audit({ orgId: org.id, action: "billing.payment_failed" });
        }
      }
      outcome = "processed";
      break;
    }
    default:
      outcome = "ignored";
  }
  await db.insert(stripeEvents).values({ id: event.id, type: event.type });
  return outcome;
}

/**
 * Dev-mode plan switch (no Stripe). Lets you exercise plan limits locally.
 * Refused in production unless ALLOW_DEV_AUTH=1.
 */
export async function setPlanWithoutStripe(orgId: number, plan: PlanId | "trial", userId: number) {
  if (env.stripe.configured) throw new Error("Stripe is configured — use Checkout.");
  if (!env.allowDevAuth) throw new Error("Not allowed in production.");
  if (plan !== "trial" && !isPlanId(plan)) throw new Error("Bad plan");
  const db = await getDb();
  await db
    .update(organizations)
    .set(plan === "trial" ? { plan: "trial", planStatus: "trialing", trialEndsAt: new Date(Date.now() + env.trialDays * 86_400_000) } : { plan, planStatus: "active", currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000) })
    .where(eq(organizations.id, orgId));
  await audit({ orgId, userId, action: "billing.dev_plan_set", meta: { plan } });
}
