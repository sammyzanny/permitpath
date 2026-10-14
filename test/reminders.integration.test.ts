import { describe, it, expect, beforeAll } from "vitest";
import { getDb, schema } from "@/db";
import { runRemindersForOrg, runTrialNotices } from "@/lib/reminders";
import { findDocumentConflicts, listRegistrations } from "@/lib/queries";
import { eq } from "drizzle-orm";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const day = 86_400_000;

let orgId: number;
let userId: number;
let steger: number;

beforeAll(async () => {
  const db = await getDb();
  const [u] = await db.insert(schema.users).values({ authId: "dev:t@example.com", email: "t@example.com", name: "T" }).returning();
  userId = u.id;
  const [o] = await db.insert(schema.organizations).values({ slug: "t-org", name: "T Org", plan: "trial", planStatus: "trialing", trialEndsAt: new Date(Date.now() + 3 * day), createdByUserId: userId }).returning();
  orgId = o.id;
  await db.insert(schema.memberships).values({ orgId, userId, role: "owner" });
  const [j] = await db
    .insert(schema.jurisdictions)
    .values({ slug: "steger", name: "Steger", county: "Cook / Will", termType: "fixed", fixedMonth: 4, fixedDay: 30, expiryLabel: "Apr 30", submissionChannel: "In person only", confidence: "high", feeGc: 150, bondAmount: 10000, feeGcText: "$150", bondText: "$10,000 bond", sourceUrls: [] })
    .returning();
  steger = j.id;
});

describe("reminder engine (PGlite, in-memory)", () => {
  it("sends the due ladder steps once and is idempotent", async () => {
    const db = await getDb();
    const expires = new Date(Date.now() + 20 * day); // 60 and 30 due, 14 not yet
    await db.insert(schema.registrations).values({ orgId, jurisdictionId: steger, status: "active", issuedOn: "2026-05-01", expiresOn: iso(expires) });

    const first = await runRemindersForOrg(orgId);
    expect(first.created).toBe(2);
    expect(first.sent).toBe(2);
    expect(first.subjects.some((s) => s.includes("expires in 60 days"))).toBe(true);
    expect(first.subjects.some((s) => s.includes("expires in 30 days"))).toBe(true);

    const second = await runRemindersForOrg(orgId);
    expect(second.created).toBe(0);
    expect(second.skipped).toBe(2);

    const outbox = await db.select().from(schema.emailOutbox);
    expect(outbox.length).toBe(2);
    expect(outbox[0].toAddresses).toEqual(["t@example.com"]);
    expect(outbox[0].provider).toBe("outbox");
  });

  it("skips planned registrations and lapsed accounts", async () => {
    const db = await getDb();
    const [j2] = await db.insert(schema.jurisdictions).values({ slug: "x", name: "X", county: "Cook", termType: "rolling", expiryLabel: "Rolling", submissionChannel: "Email", confidence: "low", sourceUrls: [] }).returning();
    await db.insert(schema.registrations).values({ orgId, jurisdictionId: j2.id, status: "planned", expiresOn: iso(new Date(Date.now() + 5 * day)) });
    const r = await runRemindersForOrg(orgId);
    expect(r.created).toBe(0);

    await db.update(schema.organizations).set({ plan: "crew", planStatus: "canceled" }).where(eq(schema.organizations.id, orgId));
    await db.insert(schema.registrations).values({ orgId, jurisdictionId: j2.id, status: "active", expiresOn: iso(new Date(Date.now() + 5 * day)) }).onConflictDoUpdate({ target: [schema.registrations.orgId, schema.registrations.jurisdictionId], set: { status: "active" } });
    const lapsed = await runRemindersForOrg(orgId);
    expect(lapsed.created).toBe(0);
    await db.update(schema.organizations).set({ plan: "trial", planStatus: "trialing" }).where(eq(schema.organizations.id, orgId));
  });

  it("trial notices fire at 3 days and only once", async () => {
    const a = await runTrialNotices();
    expect(a.sent).toBe(1);
    const b = await runTrialNotices();
    expect(b.sent).toBe(0);
  });
});

describe("document conflicts", () => {
  it("flags a COI lapsing inside 90 days before a renewal, not one far earlier", async () => {
    const db = await getDb();
    const regs = await listRegistrations(orgId);
    const stegerReg = regs.find((r) => r.jurisdiction.id === steger)!;
    const regExp = new Date(stegerReg.registration.expiresOn! + "T00:00:00");
    await db.insert(schema.documents).values({ orgId, kind: "coi", title: "COI near", expiresOn: iso(new Date(regExp.getTime() - 10 * day)) });
    await db.insert(schema.documents).values({ orgId, kind: "coi", title: "COI far", expiresOn: iso(new Date(regExp.getTime() - 200 * day)) });
    await db.insert(schema.documents).values({ orgId, kind: "bond", title: "Other town bond", jurisdictionId: steger + 1, expiresOn: iso(new Date(regExp.getTime() - 10 * day)) });
    const conflicts = await findDocumentConflicts(orgId);
    const titles = conflicts.filter((c) => c.registrationId === stegerReg.registration.id).map((c) => c.documentTitle);
    expect(titles).toContain("COI near");
    expect(titles).not.toContain("COI far");
    expect(titles).not.toContain("Other town bond");
  });
});
