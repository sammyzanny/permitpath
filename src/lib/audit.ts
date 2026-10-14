import "server-only";
import { getDb, schema } from "@/db";

export async function audit(input: { orgId?: number | null; userId?: number | null; action: string; targetType?: string; targetId?: number | null; meta?: Record<string, unknown> }) {
  try {
    const db = await getDb();
    await db.insert(schema.auditEvents).values({
      orgId: input.orgId ?? null,
      userId: input.userId ?? null,
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      meta: input.meta ?? null,
    });
  } catch (err) {
    // Auditing must never break the user's action.
    console.error("[audit] failed", err);
  }
}

/** Central error hook — wire Sentry/Logtail here. */
export function reportError(err: unknown, context?: Record<string, unknown>) {
  console.error("[error]", err, context ?? "");
}
