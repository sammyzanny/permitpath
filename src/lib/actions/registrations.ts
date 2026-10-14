"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { requireOrg } from "../tenancy";
import { audit } from "../audit";
import { computeExpiry } from "../expiry";
import { formError, optDate, optNum, optText, str, withError, withOk } from "../forms";
import { countRegistrations, getJurisdictionById, getRegistrationForJurisdiction, ruleOf } from "../queries";

const { registrations, reminders } = schema;

function revalidateAll(id?: number) {
  revalidatePath("/app");
  revalidatePath("/app/towns");
  revalidatePath("/app/calendar");
  revalidatePath("/app/documents");
  if (id) revalidatePath(`/app/towns/${id}`);
}

async function guardCanAdd(ctx: Awaited<ReturnType<typeof requireOrg>>) {
  if (ctx.limits.readOnly) throw new Error("Your subscription is inactive. Choose a plan to add towns.");
  if (ctx.limits.maxTowns !== null) {
    const n = await countRegistrations(ctx.org.id);
    if (n >= ctx.limits.maxTowns) throw new Error(`The ${ctx.limits.label} plan tracks up to ${ctx.limits.maxTowns} towns. Upgrade to add more.`);
  }
}

/** Add a jurisdiction to the org's towns (status: planned) and open it. */
export async function addRegistration(formData: FormData) {
  const ctx = await requireOrg("/app/towns");
  const jurisdictionId = Number(str(formData, "jurisdictionId"));
  const back = str(formData, "back") || "/app/towns";
  let newId: number;
  try {
    const j = await getJurisdictionById(jurisdictionId);
    if (!j) throw new Error("Unknown jurisdiction");
    const existing = await getRegistrationForJurisdiction(ctx.org.id, jurisdictionId);
    if (existing) redirect(`/app/towns/${existing.id}`);
    await guardCanAdd(ctx);
    const db = await getDb();
    const [row] = await db.insert(registrations).values({ orgId: ctx.org.id, jurisdictionId, status: "planned" }).returning();
    newId = row.id;
    await audit({ orgId: ctx.org.id, userId: ctx.user.id, action: "registration.create", targetType: "registration", targetId: row.id, meta: { jurisdiction: j.slug } });
  } catch (err) {
    unstable_rethrow(err);
    redirect(withError(back, formError(err)));
  }
  revalidateAll(newId);
  redirect(`/app/towns/${newId}`);
}

/** Bulk add from the onboarding-style picker. */
export async function addRegistrationsBulk(formData: FormData) {
  const ctx = await requireOrg("/app/towns");
  const ids = formData.getAll("townIds").map(Number).filter((n) => Number.isInteger(n) && n > 0);
  try {
    if (ctx.limits.readOnly) throw new Error("Your subscription is inactive. Choose a plan to add towns.");
    if (ctx.limits.maxTowns !== null) {
      const n = await countRegistrations(ctx.org.id);
      if (n + ids.length > ctx.limits.maxTowns) throw new Error(`The ${ctx.limits.label} plan tracks up to ${ctx.limits.maxTowns} towns (you have ${n}). Upgrade to add more.`);
    }
    if (ids.length) {
      const db = await getDb();
      await db.insert(registrations).values(ids.map((jurisdictionId) => ({ orgId: ctx.org.id, jurisdictionId, status: "planned" }))).onConflictDoNothing();
      await audit({ orgId: ctx.org.id, userId: ctx.user.id, action: "registration.bulk_create", meta: { count: ids.length } });
    }
  } catch (err) {
    unstable_rethrow(err);
    redirect(withError("/app/towns/add", formError(err)));
  }
  revalidateAll();
  redirect(withOk("/app/towns", "added"));
}

const RegistrationInput = z.object({
  status: z.enum(["planned", "submitted", "active", "lapsed"]),
  licenseNumber: optText,
  issuedOn: optDate,
  expiresOn: optDate,
  feePaid: optNum,
  notes: optText,
});

export async function updateRegistration(id: number, formData: FormData) {
  const ctx = await requireOrg(`/app/towns/${id}`);
  try {
    if (ctx.limits.readOnly) throw new Error("Your subscription is inactive. Choose a plan to make changes.");
    const parsed = RegistrationInput.parse({
      status: str(formData, "status"),
      licenseNumber: str(formData, "licenseNumber"),
      issuedOn: str(formData, "issuedOn"),
      expiresOn: str(formData, "expiresOn"),
      feePaid: str(formData, "feePaid"),
      notes: str(formData, "notes"),
    });
    const db = await getDb();
    const [existing] = await db.select().from(registrations).where(and(eq(registrations.id, id), eq(registrations.orgId, ctx.org.id))).limit(1);
    if (!existing) throw new Error("Registration not found");
    const j = (await getJurisdictionById(existing.jurisdictionId))!;

    let expiresOn = parsed.expiresOn;
    if (!expiresOn && parsed.issuedOn) expiresOn = computeExpiry(ruleOf(j), parsed.issuedOn);

    await db
      .update(registrations)
      .set({ ...parsed, expiresOn, updatedAt: new Date() })
      .where(eq(registrations.id, id));
    if (existing.expiresOn !== expiresOn) {
      // New deadline → the old reminder ladder no longer applies.
      await db.delete(reminders).where(and(eq(reminders.targetType, "registration"), eq(reminders.targetId, id)));
    }
    await audit({ orgId: ctx.org.id, userId: ctx.user.id, action: "registration.update", targetType: "registration", targetId: id, meta: { status: parsed.status, expiresOn } });
  } catch (err) {
    unstable_rethrow(err);
    redirect(withError(`/app/towns/${id}`, formError(err)));
  }
  revalidateAll(id);
  redirect(withOk(`/app/towns/${id}`));
}

export async function deleteRegistration(id: number) {
  const ctx = await requireOrg("/app/towns");
  const db = await getDb();
  await db.delete(reminders).where(and(eq(reminders.targetType, "registration"), eq(reminders.targetId, id), eq(reminders.orgId, ctx.org.id)));
  const deleted = await db.delete(registrations).where(and(eq(registrations.id, id), eq(registrations.orgId, ctx.org.id))).returning({ id: registrations.id });
  if (deleted.length) await audit({ orgId: ctx.org.id, userId: ctx.user.id, action: "registration.delete", targetType: "registration", targetId: id });
  revalidateAll();
  redirect("/app/towns");
}
