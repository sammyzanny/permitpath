"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { requirePlatformAdmin, requireOrg } from "../tenancy";
import { audit } from "../audit";
import { formError, optNum, optText, reqText, str, withError, withOk } from "../forms";
import { getJurisdictionBySlug, getJurisdictionById } from "../queries";
import { slugify } from "../tenancy";

const { jurisdictions, jurisdictionRevisions, ruleReports } = schema;

const TEXT_FIELDS = [
  "feeGcText",
  "feeSubText",
  "otherFees",
  "bondText",
  "bondPayee",
  "liabilityMin",
  "workersComp",
  "otherRequirements",
  "tradesCovered",
  "licenseTermText",
  "renewalWindow",
  "submissionText",
  "department",
  "phone",
  "email",
  "address",
  "applicationUrl",
  "sourceDate",
  "notes",
  "portalVendor",
] as const;

const JurisdictionInput = z.object({
  name: reqText("Name", 120),
  county: reqText("County", 60),
  registrationRequired: z.enum(["yes", "no", "unknown"]),
  published: z.boolean(),
  feeGc: optNum,
  feeSub: optNum,
  bondAmount: optNum,
  termType: z.enum(["fixed", "calendar", "rolling", "unknown"]),
  fixedMonth: optNum,
  fixedDay: optNum,
  expiryLabel: reqText("Expiry label", 60),
  renewalOpensMonth: optNum,
  renewalOpensDay: optNum,
  submissionChannel: reqText("Submission channel", 120),
  confidence: z.enum(["high", "medium", "low"]),
  sourceUrls: z.array(z.string().url()).max(20),
  lastVerifiedAt: z
    .string()
    .trim()
    .transform((s) => (s === "" ? null : s))
    .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()),
  ...Object.fromEntries(TEXT_FIELDS.map((f) => [f, optText])),
});

function diff(before: Record<string, unknown>, after: Record<string, unknown>) {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const k of Object.keys(after)) {
    const a = JSON.stringify(before[k] ?? null);
    const b = JSON.stringify(after[k] ?? null);
    if (a !== b) changes[k] = { from: before[k] ?? null, to: after[k] ?? null };
  }
  return changes;
}

export async function saveJurisdiction(slug: string, formData: FormData) {
  const admin = await requirePlatformAdmin();
  try {
    const raw: Record<string, unknown> = {
      name: str(formData, "name"),
      county: str(formData, "county"),
      registrationRequired: str(formData, "registrationRequired"),
      published: str(formData, "published") === "on",
      feeGc: str(formData, "feeGc"),
      feeSub: str(formData, "feeSub"),
      bondAmount: str(formData, "bondAmount"),
      termType: str(formData, "termType"),
      fixedMonth: str(formData, "fixedMonth"),
      fixedDay: str(formData, "fixedDay"),
      expiryLabel: str(formData, "expiryLabel"),
      renewalOpensMonth: str(formData, "renewalOpensMonth"),
      renewalOpensDay: str(formData, "renewalOpensDay"),
      submissionChannel: str(formData, "submissionChannel"),
      confidence: str(formData, "confidence"),
      sourceUrls: str(formData, "sourceUrls")
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean),
      lastVerifiedAt: str(formData, "lastVerifiedAt"),
    };
    for (const f of TEXT_FIELDS) raw[f] = str(formData, f);
    const parsed = JurisdictionInput.parse(raw) as Record<string, unknown>;
    // integer-ish fields
    for (const k of ["fixedMonth", "fixedDay", "renewalOpensMonth", "renewalOpensDay"]) if (parsed[k] !== null) parsed[k] = Math.trunc(parsed[k] as number);

    const db = await getDb();
    const existing = slug === "new" ? null : await getJurisdictionBySlug(slug);
    const note = str(formData, "revisionNote").trim() || null;

    if (!existing) {
      const newSlug = slugify(parsed.name as string);
      const [row] = await db
        .insert(jurisdictions)
        .values({ ...(parsed as typeof jurisdictions.$inferInsert), slug: newSlug, state: "IL", updatedAt: new Date() })
        .returning();
      await db.insert(jurisdictionRevisions).values({ jurisdictionId: row.id, editedByUserId: admin.id, changes: diff({}, parsed), note: note ?? "Created" });
      await audit({ userId: admin.id, action: "admin.jurisdiction_create", targetType: "jurisdiction", targetId: row.id });
      revalidatePath("/rules", "layout");
      revalidatePath("/app", "layout");
      redirect(withOk(`/admin/jurisdictions/${row.slug}`));
    }

    const changes = diff(existing as unknown as Record<string, unknown>, parsed);
    if (Object.keys(changes).length > 0) {
      await db
        .update(jurisdictions)
        .set({ ...(parsed as Partial<typeof jurisdictions.$inferInsert>), updatedAt: new Date() })
        .where(eq(jurisdictions.id, existing.id));
      await db.insert(jurisdictionRevisions).values({ jurisdictionId: existing.id, editedByUserId: admin.id, changes, note });
      await audit({ userId: admin.id, action: "admin.jurisdiction_update", targetType: "jurisdiction", targetId: existing.id, meta: { fields: Object.keys(changes) } });
    }
  } catch (err) {
    unstable_rethrow(err);
    redirect(withError(`/admin/jurisdictions/${slug}`, formError(err)));
  }
  revalidatePath("/rules", "layout");
  revalidatePath("/app", "layout");
  revalidatePath(`/admin/jurisdictions/${slug}`);
  redirect(withOk(`/admin/jurisdictions/${slug}`));
}

/** One-click "I checked this today" stamp. */
export async function markVerified(id: number) {
  const admin = await requirePlatformAdmin();
  const db = await getDb();
  const j = await getJurisdictionById(id);
  if (!j) redirect("/admin/jurisdictions");
  const today = new Date().toISOString().slice(0, 10);
  await db.update(jurisdictions).set({ lastVerifiedAt: today, confidence: "high", updatedAt: new Date() }).where(eq(jurisdictions.id, id));
  await db.insert(jurisdictionRevisions).values({ jurisdictionId: id, editedByUserId: admin.id, changes: { lastVerifiedAt: { from: j.lastVerifiedAt, to: today }, confidence: { from: j.confidence, to: "high" } }, note: "Marked verified" });
  revalidatePath("/rules", "layout");
  revalidatePath(`/admin/jurisdictions/${j.slug}`);
  redirect(`/admin/jurisdictions/${j.slug}?saved=1`);
}

export async function resolveReport(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const id = Number(str(formData, "id"));
  const status = str(formData, "status");
  if (!["resolved", "dismissed", "open"].includes(status)) throw new Error("Bad status");
  const db = await getDb();
  await db.update(ruleReports).set({ status, resolvedAt: status === "open" ? null : new Date() }).where(eq(ruleReports.id, id));
  await audit({ userId: admin.id, action: "admin.report_" + status, targetType: "rule_report", targetId: id });
  revalidatePath("/admin/reports");
  redirect("/admin/reports");
}

/** Customer-facing: "this rule looks wrong". */
export async function submitRuleReport(formData: FormData) {
  const ctx = await requireOrg("/app/rules");
  const jurisdictionId = Number(str(formData, "jurisdictionId"));
  const slug = str(formData, "slug");
  try {
    const message = z.string().trim().min(5, "Tell us what's wrong (at least a few words)").max(2000).parse(str(formData, "message"));
    const field = str(formData, "field").trim().slice(0, 60) || null;
    const db = await getDb();
    await db.insert(ruleReports).values({ jurisdictionId, orgId: ctx.org.id, userId: ctx.user.id, field, message });
    await audit({ orgId: ctx.org.id, userId: ctx.user.id, action: "rule_report.create", targetType: "jurisdiction", targetId: jurisdictionId });
  } catch (err) {
    unstable_rethrow(err);
    redirect(withError(`/app/rules/${slug}`, formError(err)));
  }
  redirect(withOk(`/app/rules/${slug}`, "reported"));
}
