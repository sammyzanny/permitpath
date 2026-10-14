/**
 * One-shot Stripe setup: creates the PermitPath product and the three monthly
 * prices, enables the customer portal with plan switching, and prints the env
 * vars to paste. Safe to re-run — it looks up existing prices by lookup_key.
 *
 *   STRIPE_SECRET_KEY=sk_test_... npm run setup:stripe
 *   STRIPE_SECRET_KEY=sk_live_... npm run setup:stripe        (do it again for live mode)
 *
 * Optional: APP_URL=https://permitpath.app to also register the webhook endpoint
 * (prints STRIPE_WEBHOOK_SECRET — only shown once by Stripe).
 */
import Stripe from "stripe";
import { PLANS, PLAN_ORDER } from "../src/lib/plans";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("Set STRIPE_SECRET_KEY first (Stripe dashboard → Developers → API keys).");
  process.exit(1);
}
const stripe = new Stripe(key, { typescript: true });
const mode = /^(sk|rk)_live/.test(key) ? "LIVE" : "TEST";

async function main() {
  console.log(`Stripe ${mode} mode\n`);

  // Product
  const products = await stripe.products.search({ query: "name:'PermitPath'" });
  const product = products.data[0] ?? (await stripe.products.create({ name: "PermitPath", description: "Municipal contractor registration tracking for Chicago's south suburbs" }));
  console.log(`Product: ${product.id}`);

  // Prices (lookup keys make re-runs idempotent)
  const envLines: string[] = [];
  for (const id of PLAN_ORDER) {
    const plan = PLANS[id];
    const lookupKey = `permitpath_${id}_monthly`;
    const existing = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
    const price =
      existing.data[0] ??
      (await stripe.prices.create({
        product: product.id,
        currency: "usd",
        unit_amount: plan.priceMonthly * 100,
        recurring: { interval: "month" },
        nickname: `${plan.name} — $${plan.priceMonthly}/mo`,
        lookup_key: lookupKey,
      }));
    console.log(`  ${plan.name.padEnd(7)} $${plan.priceMonthly}/mo  ${price.id}${existing.data[0] ? " (existing)" : " (created)"}`);
    envLines.push(`STRIPE_PRICE_${id.toUpperCase()}=${price.id}`);
  }

  // Customer portal: allow switching between the three prices and cancelling.
  try {
    const configs = await stripe.billingPortal.configurations.list({ limit: 1, is_default: true });
    const priceIds = envLines.map((l) => l.split("=")[1]);
    const features: Stripe.BillingPortal.ConfigurationCreateParams.Features = {
      customer_update: { enabled: true, allowed_updates: ["email", "address"] },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true, mode: "at_period_end" },
      subscription_update: { enabled: true, default_allowed_updates: ["price"], products: [{ product: product.id, prices: priceIds }], proration_behavior: "create_prorations" },
    };
    if (configs.data[0]) await stripe.billingPortal.configurations.update(configs.data[0].id, { features });
    else await stripe.billingPortal.configurations.create({ business_profile: { headline: "PermitPath billing" }, features });
    console.log("Customer portal: configured (plan switching + cancel at period end)");
  } catch (err) {
    console.log("Customer portal: could not configure automatically — enable it in Settings → Billing → Customer portal.", (err as Error).message);
  }

  // Webhook (optional)
  if (process.env.APP_URL) {
    const url = `${process.env.APP_URL.replace(/\/$/, "")}/api/webhooks/stripe`;
    const hooks = await stripe.webhookEndpoints.list({ limit: 100 });
    const existing = hooks.data.find((h) => h.url === url);
    if (existing) {
      console.log(`Webhook: already registered (${existing.id}). Its secret is only shown at creation — find it in the dashboard if you lost it.`);
    } else {
      const hook = await stripe.webhookEndpoints.create({
        url,
        enabled_events: ["checkout.session.completed", "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted", "invoice.payment_failed"],
        description: "PermitPath subscription sync",
      });
      console.log(`Webhook: created ${hook.id} → ${url}`);
      envLines.push(`STRIPE_WEBHOOK_SECRET=${hook.secret}`);
    }
  } else {
    console.log("Webhook: skipped (set APP_URL=https://your-domain to register it). Add it manually otherwise — see DEPLOY.md §3.");
  }

  console.log("\nAdd these to Vercel (and .env.production.local):\n");
  console.log(`STRIPE_SECRET_KEY=${key}`);
  for (const l of envLines) console.log(l);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
