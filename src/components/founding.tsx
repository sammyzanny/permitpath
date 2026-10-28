import type { FoundingOffer } from "@/lib/founding";
import { FOUNDING } from "@/lib/founding";
import { PLANS, type Plan } from "@/lib/plans";

const FOUNDING_REGULAR = PLANS[FOUNDING.plan].priceMonthly;

/** Banner shown above the plan grid while founding spots remain. */
export function FoundingBanner({ offer }: { offer: FoundingOffer | null }) {
  if (!offer?.active) return null;
  return (
    <div className="mx-auto mt-8 max-w-3xl rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-semibold">Founding offer:</span> the first {offer.total} contractors get Solo for{" "}
          <span className="font-semibold">${FOUNDING.priceMonthly}/month</span>, locked in for as long as you stay subscribed.
        </div>
        <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
          {offer.left} of {offer.total} spots left
        </span>
      </div>
      <p className="mt-1 text-xs text-emerald-800">Applied automatically at checkout — no code to type. Regular price ${FOUNDING_REGULAR}/month after the spots are gone.</p>
    </div>
  );
}

/** Price block for a plan card; shows the founding price on Solo while the offer is active. */
export function PlanPrice({ plan, offer, size = "md" }: { plan: Plan; offer: FoundingOffer | null; size?: "md" | "lg" }) {
  const founding = offer?.active && plan.id === FOUNDING.plan;
  const big = size === "lg" ? "text-4xl" : "text-2xl";
  if (!founding) {
    return (
      <div className={`${big} font-semibold tabular-nums text-slate-900`}>
        ${plan.priceMonthly}
        <span className="text-base font-normal text-slate-500">/{size === "lg" ? "month" : "mo"}</span>
      </div>
    );
  }
  return (
    <div>
      <div className={`${big} font-semibold tabular-nums text-slate-900`}>
        ${FOUNDING.priceMonthly}
        <span className="text-base font-normal text-slate-500">/{size === "lg" ? "month" : "mo"}</span>
        <span className="ml-2 align-middle text-base font-normal text-slate-400 line-through">${plan.priceMonthly}</span>
      </div>
      <div className="mt-1 text-xs font-semibold text-emerald-700">Founding price · {offer!.left} of {offer!.total} spots left</div>
    </div>
  );
}
