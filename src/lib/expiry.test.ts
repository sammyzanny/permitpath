import { describe, it, expect } from "vitest";
import { computeExpiry, health, dueReminders, nextFixedDeadline, daysUntil } from "./expiry";

const apr30 = { termType: "fixed" as const, fixedMonth: 4, fixedDay: 30 };
const mar31 = { termType: "fixed" as const, fixedMonth: 3, fixedDay: 31 };
const calendar = { termType: "calendar" as const, fixedMonth: 12, fixedDay: 31 };
const rolling = { termType: "rolling" as const, fixedMonth: null, fixedDay: null };
const unknown = { termType: "unknown" as const, fixedMonth: null, fixedDay: null };

describe("computeExpiry", () => {
  it("fixed Apr 30 town (Steger): issued before Apr 30 ends same year", () => {
    expect(computeExpiry(apr30, "2026-03-10")).toBe("2026-04-30");
  });
  it("fixed Apr 30 town: issued after Apr 30 ends next year", () => {
    expect(computeExpiry(apr30, "2026-06-01")).toBe("2027-04-30");
  });
  it("fixed Apr 30 town: issued exactly on Apr 30 ends that day", () => {
    expect(computeExpiry(apr30, "2026-04-30")).toBe("2026-04-30");
  });
  it("Peotone Apr 1–Mar 31", () => {
    expect(computeExpiry(mar31, "2026-04-01")).toBe("2027-03-31");
    expect(computeExpiry(mar31, "2026-02-15")).toBe("2026-03-31");
  });
  it("calendar year (Tinley Park) always Dec 31 of issue year", () => {
    expect(computeExpiry(calendar, "2026-01-05")).toBe("2026-12-31");
    expect(computeExpiry(calendar, "2026-11-20")).toBe("2026-12-31");
  });
  it("rolling (Park Forest, Oak Forest) is one year from issue", () => {
    expect(computeExpiry(rolling, "2026-09-25")).toBe("2027-09-25");
  });
  it("rolling handles leap day", () => {
    expect(computeExpiry(rolling, "2028-02-29")).toBe("2029-02-28");
  });
  it("unknown term returns null", () => {
    expect(computeExpiry(unknown, "2026-09-25")).toBeNull();
  });
  it("bad date returns null", () => {
    expect(computeExpiry(apr30, "not-a-date")).toBeNull();
  });
});

describe("nextFixedDeadline", () => {
  it("gives the next Apr 30 from today", () => {
    expect(nextFixedDeadline(apr30, new Date(2026, 8, 25))).toBe("2027-04-30");
    expect(nextFixedDeadline(apr30, new Date(2027, 0, 2))).toBe("2027-04-30");
  });
  it("null for rolling", () => {
    expect(nextFixedDeadline(rolling)).toBeNull();
  });
});

describe("health", () => {
  const today = new Date(2026, 8, 25); // Sep 25, 2026
  it("active when > 60 days out", () => expect(health("2027-04-30", today)).toBe("active"));
  it("expiring within 60 days", () => expect(health("2026-11-01", today)).toBe("expiring"));
  it("expiring on the day itself", () => expect(health("2026-09-25", today)).toBe("expiring"));
  it("expired when past", () => expect(health("2026-09-24", today)).toBe("expired"));
  it("unknown when missing", () => expect(health(null, today)).toBe("unknown"));
});

describe("dueReminders", () => {
  const exp = "2026-12-31";
  it("nothing due 90 days out", () => {
    expect(dueReminders(exp, new Date(2026, 9, 1))).toEqual([]);
  });
  it("60-day step due at 60 days", () => {
    const r = dueReminders(exp, new Date(2026, 10, 1)); // Nov 1 = 60 days before Dec 31
    expect(r.map((x) => x.daysBefore)).toEqual([60]);
    expect(r[0].dueOn).toBe("2026-11-01");
  });
  it("60 and 30 due at 20 days out (catch-up), 14 not yet", () => {
    const r = dueReminders(exp, new Date(2026, 11, 11));
    expect(r.map((x) => x.daysBefore)).toEqual([60, 30]);
  });
  it("all steps due once expired", () => {
    const r = dueReminders(exp, new Date(2027, 0, 5));
    expect(r.map((x) => x.daysBefore)).toEqual([60, 30, 14, 0]);
  });
});

describe("daysUntil", () => {
  it("counts calendar days", () => {
    expect(daysUntil("2026-10-05", new Date(2026, 8, 25))).toBe(10);
  });
});
