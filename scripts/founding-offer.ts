/**
 * Creates (or finds) the founding-customer offer in Stripe: a coupon that takes
 * Solo from $19 to $9/month forever, exposed as promotion code FOUNDING with a
 * cap on redemptions. Prints the STRIPE_FOUNDING_PROMO line to paste.
 *
 *   npm run founding:offer            # uses STRIPE_SECRET_KEY from .env.production.local
 *   npm run founding:offer -- --spots 25
 *
 * Idempotent: re-running finds the existing promotion code. Changing the cap
 * updates max_redemptions in place. Run once per Stripe mode (test, live).
 */
import Stripe from "stripe";
import { PLANS } from "../src/lib/plans";
import { loadEnvFile } from "./load-env";

const envFile = loadEnvFile();
if (envFile) console.log(`Loaded ${envFile}`);
const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY is empty — set it in .env.production.local first.");
  process.exit(1);
}
const stripe = new Stripe(key, { typescript: true });
const mode = /^(sk|rk)_live/.test(key) ? "LIVE" : "TEST";

const CODE = "FOUNDING";
const FOUNDING_PRICE = 9; // USD / month
const spotsArg = process.argv.indexOf("--spots");
const SPOTS = spotsArg > -1 ? Number(process.argv[spotsArg + 1]) : 25;
if (!Number.isInteger(SPOTS) || SPOTS < 1) {
  console.error("--spots must be a positive integer");
  process.exit(1);
}

async function main() {
  console.log(`Stripe ${mode} mode\n`);
  const solo = PLANS.solo;
  const amountOff = (solo.priceMonthly - FOUNDING_PRICE) * 100;

  // The Solo product (created by setup:stripe) scopes the coupon so it can't be applied to Crew/Office.
  const soloPriceId = process.env.STRIPE_PRICE_SOLO;
  if (!soloPriceId) {
    console.error("STRIPE_PRICE_SOLO is empty — run npm run setup:stripe first.");
    process.exit(1);
  }
  const soloPrice = await stripe.prices.retrieve(soloPriceId);
  const soloProductId = typeof soloPrice.product === "string" ? soloPrice.product : soloPrice.product.id;

  const existing = await stripe.promotionCodes.list({ code: CODE, limit: 1 });
  let promo: Stripe.PromotionCode | undefined = existing.data[0];
  if (promo) {
    if (promo.max_redemptions !== SPOTS) {
      // max_redemptions is immutable on a promotion code; archive and re-create so the cap matches.
      await stripe.promotionCodes.update(promo.id, { active: false });
      console.log(`Promotion code ${promo.id} had a cap of ${promo.max_redemptions}; archived it to re-create with ${SPOTS}.`);
      promo = undefined;
    } else {
      console.log(`Promotion code: ${promo.id} (existing) · ${promo.times_redeemed}/${promo.max_redemptions} redeemed · ${promo.active ? "active" : "INACTIVE"}`);
    }
  }
  if (!promo) {
    const coupon = await stripe.coupons.create({
      name: `Founding customer — Solo $${FOUNDING_PRICE}/mo for life`,
      amount_off: amountOff,
      currency: "usd",
      duration: "forever",
      applies_to: { products: [soloProductId] },
      metadata: { offer: "founding" },
    });
    promo = await stripe.promotionCodes.create({
      promotion: { type: "coupon", coupon: coupon.id },
      code: CODE,
      max_redemptions: SPOTS,
      restrictions: { first_time_transaction: true },
      metadata: { offer: "founding" },
    });
    console.log(`Coupon: ${coupon.id} ($${amountOff / 100} off Solo, forever)`);
    console.log(`Promotion code: ${promo.id} (created) · 0/${SPOTS} redeemed`);
  }

  console.log("\nAdd this to Vercel (Production) and .env.production.local:\n");
  console.log(`STRIPE_FOUNDING_PROMO=${promo.id}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
