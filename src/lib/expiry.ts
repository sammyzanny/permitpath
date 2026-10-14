import { addYears, differenceInCalendarDays, format, parseISO, isValid } from "date-fns";

export type TermType = "fixed" | "calendar" | "rolling" | "unknown";

export interface TermRule {
  termType: TermType;
  fixedMonth: number | null; // 1-12
  fixedDay: number | null;
}

export type RegistrationHealth = "active" | "expiring" | "expired" | "unknown" | "not_registered";

const iso = (d: Date) => format(d, "yyyy-MM-dd");

function safeParse(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = parseISO(s);
  return isValid(d) ? d : null;
}

/**
 * Compute when a registration issued on `issuedOn` expires under a
 * jurisdiction's term rule.
 *
 * fixed / calendar — every license ends on the same month/day. If issued
 *   on or before that date in a year, it ends that year; otherwise the next.
 *   (A license issued 2026-03-10 in an Apr 30 town expires 2026-04-30;
 *    issued 2026-06-01 → 2027-04-30.)
 * rolling — one year from issue. Park Forest's "twelfth month after the
 *   month of issuance" is treated the same way; the user can override.
 * unknown — cannot compute; return null so the UI asks for a date.
 */
export function computeExpiry(rule: TermRule, issuedOn: string | Date): string | null {
  const issued = typeof issuedOn === "string" ? safeParse(issuedOn) : issuedOn;
  if (!issued) return null;

  switch (rule.termType) {
    case "rolling":
      return iso(addYears(issued, 1));
    case "fixed":
    case "calendar": {
      const m = rule.fixedMonth ?? 12;
      const d = rule.fixedDay ?? 31;
      const sameYear = new Date(issued.getFullYear(), m - 1, d);
      if (issued <= sameYear) return iso(sameYear);
      return iso(new Date(issued.getFullYear() + 1, m - 1, d));
    }
    default:
      return null;
  }
}

/** Next occurrence of a fixed/calendar deadline on or after `today`. */
export function nextFixedDeadline(rule: TermRule, today: Date = new Date()): string | null {
  if (rule.termType !== "fixed" && rule.termType !== "calendar") return null;
  return computeExpiry(rule, today);
}

export function daysUntil(dateStr: string | null | undefined, today: Date = new Date()): number | null {
  const d = safeParse(dateStr);
  if (!d) return null;
  return differenceInCalendarDays(d, today);
}

/** Bucket a registration for dashboards. `expiringWithin` defaults to 60 days. */
export function health(
  expiresOn: string | null | undefined,
  today: Date = new Date(),
  expiringWithin = 60
): RegistrationHealth {
  const days = daysUntil(expiresOn, today);
  if (days === null) return "unknown";
  if (days < 0) return "expired";
  if (days <= expiringWithin) return "expiring";
  return "active";
}

/** The reminder ladder: how many days before expiry we nudge. */
export const REMINDER_LADDER = [60, 30, 14, 0] as const;

export interface DueReminder {
  daysBefore: (typeof REMINDER_LADDER)[number];
  dueOn: string; // the calendar day the reminder should fire
}

/**
 * Which ladder steps are due (on or before today) for a given expiry date.
 * Callers filter out steps already logged in the reminders table.
 */
export function dueReminders(expiresOn: string | null | undefined, today: Date = new Date()): DueReminder[] {
  const days = daysUntil(expiresOn, today);
  if (days === null || !expiresOn) return [];
  const exp = parseISO(expiresOn);
  return REMINDER_LADDER.filter((step) => days <= step).map((step) => {
    const due = new Date(exp);
    due.setDate(due.getDate() - step);
    return { daysBefore: step, dueOn: iso(due) };
  });
}

export function formatDate(s: string | null | undefined): string {
  const d = safeParse(s);
  return d ? format(d, "MMM d, yyyy") : "—";
}

export function money(n: number | null | undefined): string {
  if (n === null || n === undefined) return "not published";
  if (n === 0) return "none required";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
