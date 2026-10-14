import { NextResponse, type NextRequest } from "next/server";
import { env } from "./env";

/**
 * Cron endpoints accept `Authorization: Bearer <CRON_SECRET>` (what Vercel Cron sends)
 * or `?secret=` for other schedulers. Without CRON_SECRET set they are open only in dev.
 */
export function checkCronAuth(req: NextRequest): NextResponse | null {
  if (!env.cronSecret) {
    if (env.isProd) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
    return null;
  }
  const header = req.headers.get("authorization");
  const query = req.nextUrl.searchParams.get("secret");
  if (header === `Bearer ${env.cronSecret}` || query === env.cronSecret) return null;
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
