/** Pricing tiers. Price IDs come from env; limits are enforced server-side. */
export type PlanId = "solo" | "crew" | "office";

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthly: number; // USD
  tagline: string;
  maxTowns: number | null; // null = unlimited
  maxUsers: number | null;
  features: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  solo: {
    id: "solo",
    name: "Solo",
    priceMonthly: 19,
    tagline: "One truck, a handful of towns.",
    maxTowns: 5,
    maxUsers: 1,
    features: ["Up to 5 towns", "Renewal calendar & 60/30/14-day reminders", "Per-town checklists with fees, bond & forms", "Document vault for COI, bonds & credentials"],
  },
  crew: {
    id: "crew",
    name: "Crew",
    priceMonthly: 39,
    tagline: "Working the whole south suburbs.",
    maxTowns: null,
    maxUsers: 3,
    features: ["Unlimited towns", "Up to 3 users", "Document conflict alerts", "Everything in Solo"],
  },
  office: {
    id: "office",
    name: "Office",
    priceMonthly: 79,
    tagline: "Office manager + field team.",
    maxTowns: null,
    maxUsers: null,
    features: ["Unlimited users", "Audit log of every change", "Priority rule verification requests", "Everything in Crew"],
  },
};

export const PLAN_ORDER: PlanId[] = ["solo", "crew", "office"];

export function isPlanId(s: string | null | undefined): s is PlanId {
  return s === "solo" || s === "crew" || s === "office";
}

export interface EffectiveLimits {
  maxTowns: number | null;
  maxUsers: number | null;
  label: string;
  readOnly: boolean; // subscription lapsed → can view, cannot add
}

/**
 * What an org may do right now. Trials get Office-level limits so people can
 * see everything; a lapsed subscription becomes read-only rather than deleting data.
 */
export function effectiveLimits(org: { plan: string; planStatus: string; trialEndsAt: Date | null }, now = new Date()): EffectiveLimits {
  if (org.plan === "trial") {
    const expired = org.trialEndsAt ? org.trialEndsAt.getTime() < now.getTime() : false;
    return { maxTowns: null, maxUsers: null, label: expired ? "Trial ended" : "Free trial", readOnly: expired };
  }
  if (isPlanId(org.plan)) {
    const p = PLANS[org.plan];
    const lapsed = org.planStatus === "canceled" || org.planStatus === "unpaid";
    return { maxTowns: p.maxTowns, maxUsers: p.maxUsers, label: p.name + (org.planStatus === "past_due" ? " (payment past due)" : ""), readOnly: lapsed };
  }
  return { maxTowns: 0, maxUsers: 1, label: "No plan", readOnly: true };
}

export function trialDaysLeft(trialEndsAt: Date | null, now = new Date()): number | null {
  if (!trialEndsAt) return null;
  return Math.ceil((trialEndsAt.getTime() - now.getTime()) / 86_400_000);
}
