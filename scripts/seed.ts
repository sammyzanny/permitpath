/**
 * Seed / refresh the jurisdiction rules from data/jurisdictions.json.
 *
 *   npm run seed            → upsert jurisdictions (safe to re-run; never touches tenant data)
 *   npm run seed -- --demo  → also create a demo org + user with sample registrations
 *
 * Works against DATABASE_URL (Postgres) or the local PGlite database.
 */
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../src/db";
import { computeExpiry } from "../src/lib/expiry";

const { jurisdictions, users, organizations, memberships, registrations, documents } = schema;

type Seed = {
  slug: string;
  name: string;
  county: string;
  registrationRequired: string;
  feeGc: number | null;
  feeSub: number | null;
  bondAmount: number | null;
  termType: string;
  fixedMonth: number | null;
  fixedDay: number | null;
  expiryLabel: string;
  submissionChannel: string;
  portalVendor: string | null;
  confidence: string;
  sourceUrls: string[];
  lastVerified: string | null;
  [k: string]: unknown;
};

async function main() {
  const db = await getDb();
  const file = path.join(process.cwd(), "data", "jurisdictions.json");
  const seeds: Seed[] = JSON.parse(fs.readFileSync(file, "utf8"));
  const text = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v : null);

  let upserted = 0;
  for (const s of seeds) {
    const values: typeof jurisdictions.$inferInsert = {
      slug: s.slug,
      name: s.name,
      state: "IL",
      county: s.county,
      registrationRequired: s.registrationRequired,
      published: true,
      feeGc: s.feeGc,
      feeSub: s.feeSub,
      bondAmount: s.bondAmount,
      termType: s.termType,
      fixedMonth: s.fixedMonth,
      fixedDay: s.fixedDay,
      expiryLabel: s.expiryLabel,
      submissionChannel: s.submissionChannel,
      portalVendor: text(s.portalVendor),
      confidence: s.confidence,
      feeGcText: text(s.feeGcText),
      feeSubText: text(s.feeSubText),
      otherFees: text(s.otherFees),
      bondText: text(s.bondText),
      bondPayee: text(s.bondPayee),
      liabilityMin: text(s.liabilityMin),
      workersComp: text(s.workersComp),
      otherRequirements: text(s.otherRequirements),
      tradesCovered: text(s.tradesCovered),
      licenseTermText: text(s.licenseTermText),
      renewalWindow: text(s.renewalWindow),
      submissionText: text(s.submissionText),
      department: text(s.department),
      phone: text(s.phone),
      address: text(s.address),
      applicationUrl: text(s.applicationUrl),
      sourceUrls: s.sourceUrls ?? [],
      sourceDate: text(s.sourceDate),
      notes: text(s.notes),
      lastVerifiedAt: s.lastVerified ?? null,
      updatedAt: new Date(),
    };
    // Only overwrite fields the JSON knows about; admin-edited rows keep their edits unless the JSON changed.
    await db.insert(jurisdictions).values(values).onConflictDoUpdate({ target: jurisdictions.slug, set: values });
    upserted++;
  }
  console.log(`Upserted ${upserted} jurisdictions`);

  if (process.argv.includes("--demo")) {
    const email = "demo@towncert.com";
    let [user] = await db.select().from(users).where(eq(users.authId, `dev:${email}`)).limit(1);
    if (!user) [user] = await db.insert(users).values({ authId: `dev:${email}`, email, name: "Demo Owner" }).returning();

    let [org] = await db.select().from(organizations).where(eq(organizations.slug, "southland-electric")).limit(1);
    if (!org) {
      [org] = await db
        .insert(organizations)
        .values({ slug: "southland-electric", name: "Southland Electric LLC", trade: "Electrical", phone: "(708) 555-0100", plan: "trial", planStatus: "trialing", trialEndsAt: new Date(Date.now() + 14 * 86_400_000), createdByUserId: user.id })
        .returning();
      await db.insert(memberships).values({ orgId: org.id, userId: user.id, role: "owner" });

      const bySlug = async (slug: string) => (await db.select().from(jurisdictions).where(eq(jurisdictions.slug, slug)).limit(1))[0];
      const regs: Array<{ slug: string; status: string; issuedOn: string | null; licenseNumber?: string; overrideExpiry?: string }> = [
        { slug: "steger", status: "active", issuedOn: "2026-05-04", licenseNumber: "GC-26-118" },
        { slug: "south-chicago-heights", status: "active", issuedOn: "2026-05-11" },
        { slug: "chicago-heights", status: "active", issuedOn: "2026-04-20" },
        { slug: "park-forest", status: "active", issuedOn: "2025-10-14" },
        { slug: "tinley-park", status: "active", issuedOn: "2026-01-12" },
        { slug: "orland-park", status: "active", issuedOn: "2026-02-03" },
        { slug: "oak-forest", status: "active", issuedOn: "2025-11-02" },
        { slug: "matteson", status: "submitted", issuedOn: null },
        { slug: "lansing", status: "active", issuedOn: "2026-03-01", overrideExpiry: "2027-03-01" },
        { slug: "crete", status: "planned", issuedOn: null },
        { slug: "homewood", status: "planned", issuedOn: null },
      ];
      for (const r of regs) {
        const j = await bySlug(r.slug);
        if (!j) continue;
        const expiresOn = r.overrideExpiry ?? (r.issuedOn ? computeExpiry({ termType: j.termType as never, fixedMonth: j.fixedMonth, fixedDay: j.fixedDay }, r.issuedOn) : null);
        await db.insert(registrations).values({ orgId: org.id, jurisdictionId: j.id, status: r.status, issuedOn: r.issuedOn, expiresOn, licenseNumber: r.licenseNumber ?? null, feePaid: r.status === "active" ? j.feeGc : null }).onConflictDoNothing();
      }
      const docs = [
        { kind: "coi", title: "General liability COI — $1M/$2M", issuer: "West Bend Mutual", policyOrBondNumber: "GL-4471820", amount: 1_000_000, effectiveOn: "2025-11-15", expiresOn: "2026-11-15" },
        { kind: "workers_comp", title: "Workers' compensation certificate", issuer: "Illinois Casualty", policyOrBondNumber: "WC-88213", amount: 500_000, effectiveOn: "2026-01-01", expiresOn: "2027-01-01" },
        { kind: "bond", title: "License & permit bond — Village of Steger", slug: "steger", issuer: "Merchants Bonding", policyOrBondNumber: "IL-1029384", amount: 10_000, effectiveOn: "2026-05-01", expiresOn: "2027-04-30" },
        { kind: "bond", title: "License & permit bond — Village of Park Forest", slug: "park-forest", issuer: "Merchants Bonding", policyOrBondNumber: "IL-1029385", amount: 10_000, effectiveOn: "2025-10-14", expiresOn: "2026-10-14" },
        { kind: "bond", title: "License & permit bond — City of Oak Forest", slug: "oak-forest", issuer: "Merchants Bonding", policyOrBondNumber: "IL-1029391", amount: 10_000, effectiveOn: "2025-11-02", expiresOn: "2026-11-02" },
        { kind: "electrical_credential", title: "Electrical contractor license — Village of Orland Park (tested)", issuer: "Village of Orland Park", policyOrBondNumber: "EC-2211", amount: null, effectiveOn: "2026-01-01", expiresOn: "2026-12-31" },
      ];
      for (const d of docs) {
        const j = "slug" in d && d.slug ? await bySlug(d.slug) : null;
        await db.insert(documents).values({ orgId: org.id, kind: d.kind, title: d.title, jurisdictionId: j?.id ?? null, issuer: d.issuer, policyOrBondNumber: d.policyOrBondNumber, amount: d.amount, effectiveOn: d.effectiveOn, expiresOn: d.expiresOn, uploadedByUserId: user.id });
      }
      console.log(`Created demo org "Southland Electric LLC" — sign in at /dev-login as ${email}`);
    } else {
      console.log("Demo org already exists — skipped");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
