import "server-only";
import { desc, eq, sql, asc } from "drizzle-orm";
import { getDb, schema } from "@/db";

const { jurisdictions, jurisdictionRevisions, ruleReports, organizations, memberships, registrations, users, emailOutbox, reminders } = schema;

export async function adminOverview() {
  const db = await getDb();
  const [[orgs], [regs], [openReports], [stale], [emails], [remindersSent]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int`, trial: sql<number>`count(*) filter (where plan = 'trial')::int`, paying: sql<number>`count(*) filter (where plan in ('solo','crew','office') and plan_status in ('active','trialing','past_due'))::int` }).from(organizations),
    db.select({ n: sql<number>`count(*)::int` }).from(registrations),
    db.select({ n: sql<number>`count(*)::int` }).from(ruleReports).where(eq(ruleReports.status, "open")),
    db.select({ n: sql<number>`count(*)::int` }).from(jurisdictions).where(sql`last_verified_at is null or last_verified_at < (current_date - interval '180 days')`),
    db.select({ n: sql<number>`count(*)::int`, failed: sql<number>`count(*) filter (where status = 'failed')::int` }).from(emailOutbox),
    db.select({ n: sql<number>`count(*)::int` }).from(reminders).where(sql`sent_at is not null`),
  ]);
  return { orgs, regs: regs.n, openReports: openReports.n, stale: stale.n, emails, remindersSent: remindersSent.n };
}

/** Which towns customers actually track — tells you where to focus verification. */
export async function jurisdictionDemand() {
  const db = await getDb();
  return db
    .select({ id: jurisdictions.id, slug: jurisdictions.slug, name: jurisdictions.name, confidence: jurisdictions.confidence, lastVerifiedAt: jurisdictions.lastVerifiedAt, published: jurisdictions.published, trackers: sql<number>`count(${registrations.id})::int` })
    .from(jurisdictions)
    .leftJoin(registrations, eq(registrations.jurisdictionId, jurisdictions.id))
    .groupBy(jurisdictions.id)
    .orderBy(desc(sql`count(${registrations.id})`), asc(jurisdictions.name));
}

export async function listRevisions(jurisdictionId: number, limit = 30) {
  const db = await getDb();
  return db
    .select({ rev: jurisdictionRevisions, user: users })
    .from(jurisdictionRevisions)
    .leftJoin(users, eq(jurisdictionRevisions.editedByUserId, users.id))
    .where(eq(jurisdictionRevisions.jurisdictionId, jurisdictionId))
    .orderBy(desc(jurisdictionRevisions.createdAt))
    .limit(limit);
}

export async function listReports(status?: string) {
  const db = await getDb();
  const q = db
    .select({ report: ruleReports, jurisdiction: jurisdictions, org: organizations, user: users })
    .from(ruleReports)
    .innerJoin(jurisdictions, eq(ruleReports.jurisdictionId, jurisdictions.id))
    .leftJoin(organizations, eq(ruleReports.orgId, organizations.id))
    .leftJoin(users, eq(ruleReports.userId, users.id))
    .orderBy(desc(ruleReports.createdAt));
  return status ? q.where(eq(ruleReports.status, status)) : q;
}

export async function listOrgsAdmin() {
  const db = await getDb();
  return db
    .select({
      org: organizations,
      members: sql<number>`(select count(*) from ${memberships} m where m.org_id = ${organizations.id})::int`,
      towns: sql<number>`(select count(*) from ${registrations} r where r.org_id = ${organizations.id})::int`,
    })
    .from(organizations)
    .orderBy(desc(organizations.createdAt));
}

export async function listOutbox(limit = 100) {
  const db = await getDb();
  return db.select().from(emailOutbox).orderBy(desc(emailOutbox.createdAt)).limit(limit);
}
