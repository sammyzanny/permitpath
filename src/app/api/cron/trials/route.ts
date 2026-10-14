import { NextResponse, type NextRequest } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";
import { runTrialNotices } from "@/lib/reminders";
import { reportError } from "@/lib/audit";

/** Daily: trial-ending notices at 3 days and 1 day. */
export async function GET(req: NextRequest) {
  const denied = checkCronAuth(req);
  if (denied) return denied;
  try {
    const result = await runTrialNotices();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    reportError(err, { job: "trials" });
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
