"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrg, requireRole } from "@/lib/tenancy";
import { runRemindersForOrg } from "@/lib/reminders";
import { audit } from "@/lib/audit";

export async function runRemindersNow() {
  const ctx = await requireOrg("/app/calendar");
  requireRole(ctx, ["owner", "admin"]);
  const result = await runRemindersForOrg(ctx.org.id);
  await audit({ orgId: ctx.org.id, userId: ctx.user.id, action: "reminders.manual_run", meta: { sent: result.sent, skipped: result.skipped } });
  revalidatePath("/app/calendar");
  redirect(`/app/calendar?ran=1&sent=${result.sent}&skipped=${result.skipped}`);
}
