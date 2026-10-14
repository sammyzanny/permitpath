import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { dueReminders, formatDate } from "./expiry";
import { listDocuments, listRegistrations, listMembers } from "./queries";
import { reminderMail, sendMail, trialEndingMail } from "./email";
import { effectiveLimits, trialDaysLeft } from "./plans";

const { reminders, organizations } = schema;

export interface ReminderRunResult {
  orgsProcessed: number;
  created: number;
  sent: number;
  skipped: number;
  subjects: string[];
}

async function recipientsFor(orgId: number, orgReminderEmail: string | null): Promise<string[]> {
  const members = await listMembers(orgId);
  const list = members.filter((m) => m.membership.notifyEmail).map((m) => m.user.email);
  if (orgReminderEmail) list.push(orgReminderEmail);
  return [...new Set(list)];
}

/**
 * Walk one org: every active registration and every document, work out which
 * ladder steps are due, send those not already logged. Idempotent by (target, step).
 */
export async function runRemindersForOrg(orgId: number, today = new Date()): Promise<ReminderRunResult> {
  const db = await getDb();
  const result: ReminderRunResult = { orgsProcessed: 1, created: 0, sent: 0, skipped: 0, subjects: [] };
  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
  if (!org) return result;
  // Lapsed accounts keep their data but stop receiving reminders.
  if (effectiveLimits(org, today).readOnly) return result;

  const to = await recipientsFor(orgId, org.reminderEmail);
  if (to.length === 0) return result;

  type Target = { type: "registration" | "document"; id: number; title: string; expiresOn: string; details: string[]; href: string };
  const targets: Target[] = [];

  for (const r of await listRegistrations(orgId, today)) {
    if (!r.registration.expiresOn || r.health === "not_registered") continue;
    const j = r.jurisdiction;
    targets.push({
      type: "registration",
      id: r.registration.id,
      title: `${j.name} contractor registration`,
      expiresOn: r.registration.expiresOn,
      href: `/app/towns/${r.registration.id}`,
      details: [
        `Fee: ${j.feeGcText ?? "not published"}`,
        `Bond: ${j.bondText ?? "not published"}`,
        `Submit: ${j.submissionText ?? j.submissionChannel}`,
        j.renewalWindow && !/^not published/i.test(j.renewalWindow) ? `Renewal window: ${j.renewalWindow}` : "",
        j.phone ? `Village phone: ${j.phone}` : "",
        j.applicationUrl ? `Form: ${j.applicationUrl}` : "",
      ].filter(Boolean),
    });
  }
  for (const d of await listDocuments(orgId, today)) {
    if (!d.document.expiresOn) continue;
    targets.push({
      type: "document",
      id: d.document.id,
      title: d.document.title,
      expiresOn: d.document.expiresOn,
      href: "/app/documents",
      details: [d.document.issuer ? `Issuer: ${d.document.issuer}` : "", d.document.policyOrBondNumber ? `Number: ${d.document.policyOrBondNumber}` : "", d.jurisdiction ? `Town: ${d.jurisdiction.name}` : ""].filter(Boolean),
    });
  }

  for (const t of targets) {
    for (const due of dueReminders(t.expiresOn, today)) {
      const [already] = await db
        .select({ id: reminders.id })
        .from(reminders)
        .where(and(eq(reminders.targetType, t.type), eq(reminders.targetId, t.id), eq(reminders.daysBefore, due.daysBefore)))
        .limit(1);
      if (already) {
        result.skipped++;
        continue;
      }
      const mail = reminderMail({ to, orgName: org.name, title: t.title, daysBefore: due.daysBefore, expiresOn: formatDate(t.expiresOn), details: t.details, href: t.href });
      const res = await sendMail(mail);
      await db
        .insert(reminders)
        .values({ orgId, targetType: t.type, targetId: t.id, daysBefore: due.daysBefore, dueOn: due.dueOn, sentAt: res.ok ? new Date() : null, recipients: to, subject: mail.subject })
        .onConflictDoNothing();
      result.created++;
      if (res.ok) result.sent++;
      result.subjects.push(mail.subject);
    }
  }
  return result;
}

/** Daily job across every org. */
export async function runRemindersForAllOrgs(today = new Date()): Promise<ReminderRunResult> {
  const db = await getDb();
  const orgs = await db.select({ id: organizations.id }).from(organizations);
  const total: ReminderRunResult = { orgsProcessed: 0, created: 0, sent: 0, skipped: 0, subjects: [] };
  for (const o of orgs) {
    const r = await runRemindersForOrg(o.id, today);
    total.orgsProcessed++;
    total.created += r.created;
    total.sent += r.sent;
    total.skipped += r.skipped;
    total.subjects.push(...r.subjects);
  }
  return total;
}

/** Trial-ending notices at 3 days and 1 day. Uses the reminders table with targetType "trial". */
export async function runTrialNotices(today = new Date()): Promise<{ sent: number }> {
  const db = await getDb();
  const orgs = await db.select().from(organizations).where(eq(organizations.plan, "trial"));
  let sent = 0;
  for (const org of orgs) {
    const left = trialDaysLeft(org.trialEndsAt, today);
    if (left === null || (left !== 3 && left !== 1)) continue;
    const [already] = await db
      .select({ id: reminders.id })
      .from(reminders)
      .where(and(eq(reminders.targetType, "trial"), eq(reminders.targetId, org.id), eq(reminders.daysBefore, left)))
      .limit(1);
    if (already) continue;
    const to = await recipientsFor(org.id, org.reminderEmail);
    if (to.length === 0) continue;
    const mail = trialEndingMail({ to, orgName: org.name, daysLeft: left });
    const res = await sendMail(mail);
    await db.insert(reminders).values({ orgId: org.id, targetType: "trial", targetId: org.id, daysBefore: left, dueOn: today.toISOString().slice(0, 10), sentAt: res.ok ? new Date() : null, recipients: to, subject: mail.subject }).onConflictDoNothing();
    if (res.ok) sent++;
  }
  return { sent };
}
