import { describe, it, expect } from "vitest";
import { effectiveLimits, trialDaysLeft, PLANS } from "./plans";

const day = 86_400_000;

describe("effectiveLimits", () => {
  const now = new Date("2026-09-25T12:00:00Z");
  it("active trial gets unlimited, not read-only", () => {
    const l = effectiveLimits({ plan: "trial", planStatus: "trialing", trialEndsAt: new Date(now.getTime() + 5 * day) }, now);
    expect(l).toMatchObject({ maxTowns: null, maxUsers: null, readOnly: false, label: "Free trial" });
  });
  it("expired trial is read-only", () => {
    const l = effectiveLimits({ plan: "trial", planStatus: "trialing", trialEndsAt: new Date(now.getTime() - day) }, now);
    expect(l.readOnly).toBe(true);
    expect(l.label).toBe("Trial ended");
  });
  it("solo enforces 5 towns / 1 user", () => {
    const l = effectiveLimits({ plan: "solo", planStatus: "active", trialEndsAt: null }, now);
    expect(l).toMatchObject({ maxTowns: 5, maxUsers: 1, readOnly: false });
  });
  it("crew: unlimited towns, 3 users", () => {
    expect(effectiveLimits({ plan: "crew", planStatus: "active", trialEndsAt: null }, now)).toMatchObject({ maxTowns: null, maxUsers: 3 });
  });
  it("past_due stays usable but is labelled", () => {
    const l = effectiveLimits({ plan: "office", planStatus: "past_due", trialEndsAt: null }, now);
    expect(l.readOnly).toBe(false);
    expect(l.label).toContain("past due");
  });
  it("canceled / unpaid → read-only", () => {
    expect(effectiveLimits({ plan: "crew", planStatus: "canceled", trialEndsAt: null }, now).readOnly).toBe(true);
    expect(effectiveLimits({ plan: "crew", planStatus: "unpaid", trialEndsAt: null }, now).readOnly).toBe(true);
  });
  it("unknown plan string → locked", () => {
    expect(effectiveLimits({ plan: "canceled", planStatus: "canceled", trialEndsAt: null }, now)).toMatchObject({ maxTowns: 0, readOnly: true });
  });
});

describe("trialDaysLeft", () => {
  it("rounds up", () => {
    const now = new Date("2026-09-25T12:00:00Z");
    expect(trialDaysLeft(new Date("2026-09-28T00:00:00Z"), now)).toBe(3);
    expect(trialDaysLeft(null, now)).toBeNull();
  });
});

describe("PLANS", () => {
  it("prices ascend", () => {
    expect(PLANS.solo.priceMonthly).toBeLessThan(PLANS.crew.priceMonthly);
    expect(PLANS.crew.priceMonthly).toBeLessThan(PLANS.office.priceMonthly);
  });
});
