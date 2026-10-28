import "server-only";
import { cache } from "react";
import { env } from "./env";
import { getStripe } from "./billing";
import { reportError } from "./audit";
import type { PlanId } from "./plans";

/** The founding-customer offer: the first N contractors get Solo at a locked-in price. */
export const FOUNDING = {
  plan: "solo" as PlanId,
  priceMonthly: 9,
  code: "FOUNDING",
  spots: 25,
};

export interface FoundingOffer {
  active: boolean;
  left: number;
  total: number;
  claimed: number;
  promoId: string;
}

/**
 * Live state of the offer from Stripe (redemptions are counted there, so it is
 * correct even across deploys). Null when Stripe or the promo isn't configured.
 * Wrapped in cache() so a page that shows it in several places asks Stripe once.
 */
export const getFoundingOffer = cache(async (): Promise<FoundingOffer | null> => {
  if (!env.stripe.configured || !env.stripe.foundingPromo) return null;
  try {
    const stripe = await getStripe();
    const promo = await stripe.promotionCodes.retrieve(env.stripe.foundingPromo);
    const total = promo.max_redemptions ?? FOUNDING.spots;
    const claimed = promo.times_redeemed;
    const left = Math.max(0, total - claimed);
    const expired = promo.expires_at ? promo.expires_at * 1000 < Date.now() : false;
    return { active: promo.active && !expired && left > 0, left, total, claimed, promoId: promo.id };
  } catch (err) {
    reportError(err, { where: "getFoundingOffer" });
    return null;
  }
});
