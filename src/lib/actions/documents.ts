"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { requireOrg } from "../tenancy";
import { audit } from "../audit";
import { formError, optDate, optNum, optText, reqText, str, withError, withOk } from "../forms";
import { deleteFile, putFile, validateUpload } from "../storage";
import { getDocument } from "../queries";
import { DOCUMENT_KINDS } from "../constants";

const { documents, reminders } = schema;

const DocumentInput = z.object({
  kind: z.enum(DOCUMENT_KINDS),
  title: reqText("Title", 200),
  jurisdictionId: optNum,
  issuer: optText,
  policyOrBondNumber: optText,
  amount: optNum,
  effectiveOn: optDate,
  expiresOn: optDate,
  notes: optText,
});

function revalidateAll() {
  revalidatePath("/app");
  revalidatePath("/app/documents");
  revalidatePath("/app/calendar");
  revalidatePath("/app/towns");
}

export async function addDocument(formData: FormData) {
  const ctx = await requireOrg("/app/documents");
  try {
    if (ctx.limits.readOnly) throw new Error("Your subscription is inactive. Choose a plan to add documents.");
    const parsed = DocumentInput.parse({
      kind: str(formData, "kind"),
      title: str(formData, "title"),
      jurisdictionId: str(formData, "jurisdictionId"),
      issuer: str(formData, "issuer"),
      policyOrBondNumber: str(formData, "policyOrBondNumber"),
      amount: str(formData, "amount"),
      effectiveOn: str(formData, "effectiveOn"),
      expiresOn: str(formData, "expiresOn"),
      notes: str(formData, "notes"),
    });

    let stored: { key: string; size: number; contentType: string; fileName: string } | null = null;
    const file = formData.get("file");
    if (file instanceof File && file.size > 0) {
      const problem = validateUpload(file);
      if (problem) throw new Error(problem);
      const put = await putFile(ctx.org.id, file);
      stored = { ...put, fileName: file.name.slice(0, 200) };
    }

    const db = await getDb();
    const [row] = await db
      .insert(documents)
      .values({
        orgId: ctx.org.id,
        ...parsed,
        jurisdictionId: parsed.jurisdictionId ? Math.trunc(parsed.jurisdictionId) : null,
        storageKey: stored?.key ?? null,
        fileName: stored?.fileName ?? null,
        contentType: stored?.contentType ?? null,
        sizeBytes: stored?.size ?? null,
        uploadedByUserId: ctx.user.id,
      })
      .returning({ id: documents.id });
    await audit({ orgId: ctx.org.id, userId: ctx.user.id, action: "document.create", targetType: "document", targetId: row.id, meta: { kind: parsed.kind, hasFile: Boolean(stored) } });
  } catch (err) {
    unstable_rethrow(err);
    redirect(withError("/app/documents", formError(err)));
  }
  revalidateAll();
  redirect(withOk("/app/documents"));
}

export async function replaceDocumentFile(id: number, formData: FormData) {
  const ctx = await requireOrg("/app/documents");
  try {
    const doc = await getDocument(ctx.org.id, id);
    if (!doc) throw new Error("Document not found");
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new Error("Choose a file first.");
    const problem = validateUpload(file);
    if (problem) throw new Error(problem);
    const put = await putFile(ctx.org.id, file);
    await deleteFile(doc.storageKey);
    const db = await getDb();
    await db.update(documents).set({ storageKey: put.key, fileName: file.name.slice(0, 200), contentType: put.contentType, sizeBytes: put.size, uploadedByUserId: ctx.user.id }).where(eq(documents.id, id));
    await audit({ orgId: ctx.org.id, userId: ctx.user.id, action: "document.file_replaced", targetType: "document", targetId: id });
  } catch (err) {
    unstable_rethrow(err);
    redirect(withError("/app/documents", formError(err)));
  }
  revalidateAll();
  redirect(withOk("/app/documents"));
}

export async function deleteDocument(id: number) {
  const ctx = await requireOrg("/app/documents");
  const doc = await getDocument(ctx.org.id, id);
  if (doc) {
    const db = await getDb();
    await db.delete(reminders).where(and(eq(reminders.targetType, "document"), eq(reminders.targetId, id)));
    await db.delete(documents).where(and(eq(documents.id, id), eq(documents.orgId, ctx.org.id)));
    await deleteFile(doc.storageKey);
    await audit({ orgId: ctx.org.id, userId: ctx.user.id, action: "document.delete", targetType: "document", targetId: id });
  }
  revalidateAll();
  redirect("/app/documents");
}
