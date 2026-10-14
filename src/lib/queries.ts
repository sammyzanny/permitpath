import "server-only";
import { and, asc, desc, eq, sql, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { health, daysUntil, nextFixedDeadline, type RegistrationHealth, type TermType } from "./expiry";
import type { Jurisdiction, Registration, Document } from "@/db/schema";

const { jurisdictions, registrations, documents, reminders, memberships, users, invitations, auditEvents } = schema;

// ---------------------------------------------------------------------------
// Jurisdictions (shared)
// ---------------------------------------------------------------------------

export async function listJurisdictions(opts: { includeUnpublished?: boolean } = {}) {
  const db = await getDb();
  const q = db.select().from(jurisdictions).orderBy(asc(jurisdictions.name));
  if (opts.includeUnpublished) return q;
  return q.where(eq(jurisdictions.published, true));
}

export async function getJurisdictionBySlug(slug: string) {
  const db = await getDb();
  const [j] = await db.select().from(jurisdictions).where(eq(jurisdictions.slug, slug)).limit(1);
  return j ?? null;
}

export async function getJurisdictionById(id: number) {
  const db = await getDb();
  const [j] = await db.select().from(jurisdictions).where(eq(jurisdictions.id, id)).limit(1);
  return j ?? null;
}

export function ruleOf(j: Pick<Jurisdiction, "termType" | "fixedMonth" | "fixedDay">) {
  return { termType: j.termType as TermType, fixedMonth: j.fixedMonth, fixedDay: j.fixedDay };
}

export async function jurisdictionStats() {
  const all = await listJurisdictions();
  const byExpiry = new Map<string, number>();
  for (const j of all) {
    const k = j.expiryLabel.startsWith("Rolling") ? "Rolling" : j.expiryLabel;
    byExpiry.set(k, (byExpiry.get(k) ?? 0) + 1);
  }
  return { count: all.length, byExpiry, verified: all.filter((j) => j.confidence === "high").length, counties: [...new Set(all.map((j) => j.county))] };
}

// ---------------------------------------------------------------------------
// Registrations (org-scoped)
// ---------------------------------------------------------------------------

export interface RegistrationRow {
  registration: Registration;
  jurisdiction: Jurisdiction;
  health: RegistrationHealth;
  daysLeft: number | null;
}

function decorate(r: { registration: Registration; jurisdiction: Jurisdiction }, today: Date): RegistrationRow {
  const pending = r.registration.status === "planned" || r.registration.status === "submitted";
  return { ...r, health: pending ? "not_registered" : health(r.registration.expiresOn, today), daysLeft: daysUntil(r.registration.expiresOn, today) };
}

export async function listRegistrations(orgId: number, today = new Date()): Promise<RegistrationRow[]> {
  const db = await getDb();
  const rows = await db
    .select({ registration: registrations, jurisdiction: jurisdictions })
    .from(registrations)
    .innerJoin(jurisdictions, eq(registrations.jurisdictionId, jurisdictions.id))
    .where(eq(registrations.orgId, orgId))
    .orderBy(asc(registrations.expiresOn), asc(jurisdictions.name));
  return rows.map((r) => decorate(r, today));
}

export async function getRegistration(orgId: number, id: number) {
  const db = await getDb();
  const [row] = await db
    .select({ registration: registrations, jurisdiction: jurisdictions })
    .from(registrations)
    .innerJoin(jurisdictions, eq(registrations.jurisdictionId, jurisdictions.id))
    .where(and(eq(registrations.orgId, orgId), eq(registrations.id, id)))
    .limit(1);
  return row ?? null;
}

export async function getRegistrationForJurisdiction(orgId: number, jurisdictionId: number) {
  const db = await getDb();
  const [r] = await db.select().from(registrations).where(and(eq(registrations.orgId, orgId), eq(registrations.jurisdictionId, jurisdictionId))).limit(1);
  return r ?? null;
}

export async function countRegistrations(orgId: number) {
  const db = await getDb();
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(registrations).where(eq(registrations.orgId, orgId));
  return row?.n ?? 0;
}

// ---------------------------------------------------------------------------
// Documents (org-scoped)
// ---------------------------------------------------------------------------

export interface DocumentRow {
  document: Document;
  jurisdiction: Jurisdiction | null;
  health: RegistrationHealth;
  daysLeft: number | null;
}

export async function listDocuments(orgId: number, today = new Date()): Promise<DocumentRow[]> {
  const db = await getDb();
  const rows = await db
    .select({ document: documents, jurisdiction: jurisdictions })
    .from(documents)
    .leftJoin(jurisdictions, eq(documents.jurisdictionId, jurisdictions.id))
    .where(eq(documents.orgId, orgId))
    .orderBy(asc(documents.expiresOn));
  return rows.map((r) => ({ ...r, health: health(r.document.expiresOn, today), daysLeft: daysUntil(r.document.expiresOn, today) }));
}

export async function getDocument(orgId: number, id: number) {
  const db = await getDb();
  const [d] = await db.select().from(documents).where(and(eq(documents.orgId, orgId), eq(documents.id, id))).limit(1);
  return d ?? null;
}

// ---------------------------------------------------------------------------
// Calendar, conflicts, stats
// ---------------------------------------------------------------------------

export interface CalendarItem {
  date: string;
  kind: "registration" | "document";
  title: string;
  subtitle: string;
  href: string;
  health: RegistrationHealth;
  daysLeft: number | null;
}

export async function buildCalendar(orgId: number, today = new Date()): Promise<CalendarItem[]> {
  const [regs, docs] = await Promise.all([listRegistrations(orgId, today), listDocuments(orgId, today)]);
  const items: CalendarItem[] = [];
  for (const r of regs) {
    if (!r.registration.expiresOn) continue;
    items.push({
      date: r.registration.expiresOn,
      kind: "registration",
      title: `${r.jurisdiction.name} contractor registration`,
      subtitle: `${r.jurisdiction.expiryLabel} · ${r.jurisdiction.submissionChannel}`,
      href: `/app/towns/${r.registration.id}`,
      health: r.health,
      daysLeft: r.daysLeft,
    });
  }
  for (const d of docs) {
    if (!d.document.expiresOn) continue;
    items.push({ date: d.document.expiresOn, kind: "document", title: d.document.title, subtitle: d.document.issuer ?? d.document.kind, href: `/app/documents`, health: d.health, daysLeft: d.daysLeft });
  }
  return items.sort((a, b) => a.date.localeCompare(b.date));
}

export interface DocumentConflict {
  registrationId: number;
  jurisdictionName: string;
  registrationExpires: string;
  documentId: number;
  documentTitle: string;
  documentExpires: string;
}

const CONFLICT_WINDOW_DAYS = 90;

/** A COI / workers' comp / that town's bond lapsing in the 90 days before a renewal. */
export async function findDocumentConflicts(orgId: number, today = new Date()): Promise<DocumentConflict[]> {
  const [regs, docs] = await Promise.all([listRegistrations(orgId, today), listDocuments(orgId, today)]);
  const out: DocumentConflict[] = [];
  for (const r of regs) {
    if (!r.registration.expiresOn || r.health === "not_registered") continue;
    for (const d of docs) {
      if (!d.document.expiresOn) continue;
      const relevant = d.document.kind === "coi" || d.document.kind === "workers_comp" || (d.document.kind === "bond" && d.document.jurisdictionId === r.jurisdiction.id);
      if (!relevant) continue;
      const gap = daysUntil(r.registration.expiresOn, new Date(d.document.expiresOn + "T00:00:00"));
      if (gap !== null && gap > 0 && gap <= CONFLICT_WINDOW_DAYS) {
        out.push({ registrationId: r.registration.id, jurisdictionName: r.jurisdiction.name, registrationExpires: r.registration.expiresOn, documentId: d.document.id, documentTitle: d.document.title, documentExpires: d.document.expiresOn });
      }
    }
  }
  return out;
}

export async function dashboardStats(orgId: number, today = new Date()) {
  const [regs, docs] = await Promise.all([listRegistrations(orgId, today), listDocuments(orgId, today)]);
  const feeTotal = regs.reduce((s, r) => s + (r.jurisdiction.feeGc ?? 0), 0);
  const bondTotal = regs.reduce((s, r) => s + (r.jurisdiction.bondAmount ?? 0), 0);
  const bondCount = regs.filter((r) => (r.jurisdiction.bondAmount ?? 0) > 0).length;
  return {
    total: regs.length,
    active: regs.filter((r) => r.health === "active").length,
    expiring: regs.filter((r) => r.health === "expiring").length,
    expired: regs.filter((r) => r.health === "expired").length,
    notRegistered: regs.filter((r) => r.health === "not_registered").length,
    unknown: regs.filter((r) => r.health === "unknown").length,
    docsExpiring: docs.filter((d) => d.health === "expiring" || d.health === "expired").length,
    feeTotal,
    bondTotal,
    bondCount,
    regs,
  };
}

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------

export async function listMembers(orgId: number) {
  const db = await getDb();
  return db
    .select({ membership: memberships, user: users })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.orgId, orgId))
    .orderBy(asc(memberships.createdAt));
}

export async function countMembers(orgId: number) {
  const db = await getDb();
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(memberships).where(eq(memberships.orgId, orgId));
  return row?.n ?? 0;
}

export async function listPendingInvitations(orgId: number) {
  const db = await getDb();
  const rows = await db.select().from(invitations).where(eq(invitations.orgId, orgId)).orderBy(desc(invitations.createdAt));
  return rows.filter((i) => !i.acceptedAt && i.expiresAt.getTime() > Date.now());
}

export async function listReminderLog(orgId: number, limit = 20) {
  const db = await getDb();
  return db.select().from(reminders).where(eq(reminders.orgId, orgId)).orderBy(desc(reminders.sentAt)).limit(limit);
}

export async function listAudit(orgId: number, limit = 50) {
  const db = await getDb();
  return db
    .select({ event: auditEvents, user: users })
    .from(auditEvents)
    .leftJoin(users, eq(auditEvents.userId, users.id))
    .where(eq(auditEvents.orgId, orgId))
    .orderBy(desc(auditEvents.createdAt))
    .limit(limit);
}

export async function jurisdictionsByIds(ids: number[]) {
  if (ids.length === 0) return [];
  const db = await getDb();
  return db.select().from(jurisdictions).where(inArray(jurisdictions.id, ids));
}

export { nextFixedDeadline };
