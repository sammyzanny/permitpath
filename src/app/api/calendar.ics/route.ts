import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/tenancy";
import { buildCalendar } from "@/lib/queries";
import { BRAND, APP_URL } from "@/lib/env";

/** iCalendar feed of every deadline, for Google/Apple/Outlook calendars. */
export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx) return new NextResponse("Unauthorized", { status: 401 });
  const items = await buildCalendar(ctx.org.id);
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:-//${BRAND}//EN`, `X-WR-CALNAME:${esc(`${BRAND} — ${ctx.org.name}`)}`];
  for (const it of items) {
    const d = it.date.replace(/-/g, "");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${it.kind}-${it.href.replace(/\W/g, "")}-${d}@permitpath`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${d}`,
      `SUMMARY:${esc(it.title + " expires")}`,
      `DESCRIPTION:${esc(`${it.subtitle}\n${APP_URL}${it.href}`)}`,
      `URL:${APP_URL}${it.href}`,
      "BEGIN:VALARM",
      "TRIGGER:-P30D",
      "ACTION:DISPLAY",
      `DESCRIPTION:${esc(it.title + " expires in 30 days")}`,
      "END:VALARM",
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return new NextResponse(lines.join("\r\n"), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="permitpath-${ctx.org.slug}.ics"`, "Cache-Control": "no-store" },
  });
}
