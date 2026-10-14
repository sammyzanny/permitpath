import { NextResponse, type NextRequest } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";
import { runRemindersForAllOrgs } from "@/lib/reminders";
import { reportError } from "@/lib/audit";

export const maxDuration = 300;

/** Daily: send the 60/30/14/0-day reminders for every org. Idempotent. */
export async function GET(req: NextRequest) {
  const denied = checkCronAuth(req);
  if (denied) return denied;
  try {
    const result = await runRemindersForAllOrgs();
    return NextResponse.json({ ok: true, ...result, subjects: result.subjects.slice(0, 50) });
  } catch (err) {
    reportError(err, { job: "reminders" });
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
