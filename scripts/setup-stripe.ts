/**
 * One-shot Stripe setup: creates one product per plan with its monthly price, enables the customer portal with plan switching, and prints the env
 * vars to paste. Safe to re-run — it looks up existing prices by lookup_key.
 *
 *   STRIPE_SECRET_KEY=sk_test_... npm run setup:stripe
 *   STRIPE_SECRET_KEY=sk_live_... npm run setup:stripe        (do it again for live mode)
 *
 * Optional: APP_URL=https://towncert.com to also register the webhook endpoint
 * (prints STRIPE_WEBHOOK_SECRET — only shown once by Stripe).
 */
import Stripe from "stripe";
import { PLANS, PLAN_ORDER } from "../src/lib/plans";
import { loadEnvFile } from "./load-env";

const envFile = loadEnvFile();
if (envFile) console.log(`Loaded ${envFile}`);
const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY is empty. Put it in .env.production.local (or set it in the shell) — Stripe dashboard → Developers → API keys.");
  process.exit(1);
}
const stripe = new Stripe(key, { typescript: true });
const mode = /^(sk|rk)_live/.test(key) ? "LIVE" : "TEST";

async function main() {
  console.log(`Stripe ${mode} mode\n`);

  // One product per plan. Stripe's customer portal only allows plan switching when
  // every product has at most one price per billing interval, so the three monthly
  // prices cannot share a product. (Early runs created a single "PermitPath"/"TownCert"
  // product; prices found under it are archived and re-created under the right one.)
  const allProducts = (await stripe.products.list({ active: true, limit: 100 })).data;
  const envLines: string[] = [];
  const portalProducts: { product: string; prices: string[] }[] = [];
  for (const id of PLAN_ORDER) {
    const plan = PLANS[id];
    const productName = `TownCert ${plan.name}`;
    let product = allProducts.find((p) => p.name === productName);
    if (!product) {
      product = await stripe.products.create({ name: productName, description: `${plan.tagline} Municipal contractor registration tracking for Chicago's south suburbs.` });
      allProducts.push(product);
    }

    // Prices (lookup keys make re-runs idempotent; the key prefix predates the rename and must stay stable)
    const lookupKey = `permitpath_${id}_monthly`;
    let price: Stripe.Price | undefined = (await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 })).data[0];
    let note = "existing";
    if (price && (typeof price.product === "string" ? price.product : price.product.id) !== product.id) {
      // Existing subscriptions on the archived price keep billing; only new checkouts use the new one.
      await stripe.prices.update(price.id, { active: false });
      price = undefined;
      note = "moved from shared product";
    }
    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        currency: "usd",
        unit_amount: plan.priceMonthly * 100,
        recurring: { interval: "month" },
        nickname: `${plan.name} — $${plan.priceMonthly}/mo`,
        lookup_key: lookupKey,
        transfer_lookup_key: true,
      });
      if (note === "existing") note = "created";
    }
    console.log(`  ${plan.name.padEnd(7)} $${plan.priceMonthly}/mo  ${product.id}  ${price.id} (${note})`);
    envLines.push(`STRIPE_PRICE_${id.toUpperCase()}=${price.id}`);
    portalProducts.push({ product: product.id, prices: [price.id] });
  }
  // Retire the old shared product if nothing active is left on it.
  for (const old of allProducts.filter((p) => p.name === "TownCert" || p.name === "PermitPath")) {
    const live = await stripe.prices.list({ product: old.id, active: true, limit: 1 });
    if (!live.data.length) {
      await stripe.products.update(old.id, { active: false });
      console.log(`  (archived old shared product ${old.id})`);
    }
  }

  // Customer portal: allow switching between the three prices and cancelling.
  try {
    const configs = await stripe.billingPortal.configurations.list({ limit: 1, is_default: true });
    const features: Stripe.BillingPortal.ConfigurationCreateParams.Features = {
      customer_update: { enabled: true, allowed_updates: ["email", "address"] },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true, mode: "at_period_end" },
      subscription_update: { enabled: true, default_allowed_updates: ["price"], products: portalProducts, proration_behavior: "create_prorations" },
    };
    if (configs.data[0]) await stripe.billingPortal.configurations.update(configs.data[0].id, { features });
    else await stripe.billingPortal.configurations.create({ business_profile: { headline: "TownCert billing" }, features });
    console.log("Customer portal: configured (plan switching + cancel at period end)");
  } catch (err) {
    console.log("Customer portal: could not configure automatically — enable it in Settings → Billing → Customer portal.", (err as Error).message);
  }

  // Webhook (optional)
  const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl && /^https:\/\//.test(appUrl)) {
    const url = `${appUrl.replace(/\/$/, "")}/api/webhooks/stripe`;
    const hooks = await stripe.webhookEndpoints.list({ limit: 100 });
    const existing = hooks.data.find((h) => h.url === url);
    if (existing) {
      console.log(`Webhook: already registered (${existing.id}). Its secret is only shown at creation — find it in the dashboard if you lost it.`);
    } else {
      const hook = await stripe.webhookEndpoints.create({
        url,
        enabled_events: ["checkout.session.completed", "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted", "invoice.payment_failed"],
        description: "TownCert subscription sync",
      });
      console.log(`Webhook: created ${hook.id} → ${url}`);
      envLines.push(`STRIPE_WEBHOOK_SECRET=${hook.secret}`);
    }
  } else {
    console.log("Webhook: skipped — set NEXT_PUBLIC_APP_URL in .env.production.local (or APP_URL in the shell) to an https URL and re-run.");
  }

  console.log("\nAdd these to Vercel (and .env.production.local):\n");
  console.log(`STRIPE_SECRET_KEY=${key}`);
  for (const l of envLines) console.log(l);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
