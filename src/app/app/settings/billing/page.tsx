import { Card, Notice, PageHeader, Pill } from "@/components/ui";
import { requireOrg } from "@/lib/tenancy";
import { PLANS, PLAN_ORDER, trialDaysLeft } from "@/lib/plans";
import { openBillingPortal, resetTrialDev, startCheckout } from "@/lib/actions/billing";
import { env } from "@/lib/env";
import { formatDate } from "@/lib/expiry";
import { getFoundingOffer } from "@/lib/founding";
import { FoundingBanner, PlanPrice } from "@/components/founding";

export const dynamic = "force-dynamic";

export default async function BillingPage(props: PageProps<"/app/settings/billing">) {
  const sp = await props.searchParams;
  const ctx = await requireOrg("/app/settings/billing");
  const canManage = ctx.role !== "member";
  const org = ctx.org;
  const daysLeft = org.plan === "trial" ? trialDaysLeft(org.trialEndsAt) : null;
  // Only first-time subscribers can take the founding offer.
  const offer = org.stripeSubscriptionId ? null : await getFoundingOffer();

  return (
    <>
      <PageHeader title="Plan & billing" subtitle="Change plans any time; upgrades take effect immediately and downgrades at the end of the period." />
      {sp.checkout === "success" ? <Notice>You&apos;re subscribed. Thank you! It can take a few seconds for the plan to update.</Notice> : null}
      {sp.checkout === "canceled" ? <Notice tone="amber">Checkout canceled — nothing was charged.</Notice> : null}
      {sp.checkout === "dev" ? <Notice tone="amber">Plan set locally (Stripe not configured). In production this goes through Stripe Checkout.</Notice> : null}
      {typeof sp.error === "string" ? <Notice tone="red">{sp.error}</Notice> : null}

      <Card title="Current plan" className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              {ctx.limits.label}
              <Pill tone={ctx.limits.readOnly ? "red" : org.planStatus === "past_due" ? "amber" : "green"}>{org.plan === "trial" ? (ctx.limits.readOnly ? "ended" : "trialing") : org.planStatus}</Pill>
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {org.plan === "trial" && daysLeft !== null
                ? daysLeft > 0
                  ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left. Trial ends ${formatDate(org.trialEndsAt?.toISOString().slice(0, 10))}.`
                  : "Your trial has ended. Choose a plan to keep editing and receiving reminders."
                : org.currentPeriodEnd
                  ? `${org.cancelAtPeriodEnd ? "Cancels" : "Renews"} ${formatDate(org.currentPeriodEnd.toISOString().slice(0, 10))}.`
                  : ""}
            </div>
          </div>
          {canManage && org.stripeCustomerId && env.stripe.configured ? (
            <form action={openBillingPortal}>
              <button className="btn-secondary" type="submit">
                Manage payment method & invoices
              </button>
            </form>
          ) : null}
        </div>
      </Card>

      <FoundingBanner offer={offer} />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const p = PLANS[id];
          const current = org.plan === id && !ctx.limits.readOnly;
          return (
            <div key={id} className={`card flex flex-col p-5 ${current ? "ring-2 ring-slate-900" : ""}`}>
              <div className="flex items-baseline justify-between">
                <h3 className="text-base font-semibold text-slate-900">{p.name}</h3>
                <PlanPrice plan={p} offer={offer} />
              </div>
              <p className="mt-1 text-sm text-slate-600">{p.tagline}</p>
              <ul className="mt-4 flex-1 space-y-1.5 text-sm text-slate-700">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-emerald-600">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              {current ? (
                <div className="btn-secondary mt-5 w-full justify-center opacity-70">Current plan</div>
              ) : canManage ? (
                <form action={startCheckout} className="mt-5">
                  <input type="hidden" name="plan" value={id} />
                  <button className="btn-primary w-full justify-center" type="submit">
                    {org.plan === "trial" ? "Choose " + p.name : "Switch to " + p.name}
                  </button>
                </form>
              ) : (
                <div className="mt-5 text-center text-xs text-slate-500">Ask an owner or admin to change plans.</div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Prices in USD, billed monthly. Cancel any time; your data stays and the account becomes read-only. {org.plan === "trial" && daysLeft && daysLeft > 0 ? `Any remaining trial days carry over — you won't be charged until the trial ends.` : ""}
      </p>

      {!env.stripe.configured && env.allowDevAuth && ctx.role === "owner" ? (
        <Card title="Developer tools" className="mt-8">
          <p className="mb-3 text-xs text-slate-600">Stripe isn&apos;t configured. These buttons let you test plan limits locally.</p>
          <form action={resetTrialDev}>
            <button className="btn-secondary text-xs" type="submit">
              Reset to a fresh trial
            </button>
          </form>
        </Card>
      ) : null}
    </>
  );
}
