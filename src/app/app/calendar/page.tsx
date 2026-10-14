import Link from "next/link";
import { Card, Empty, HealthBadge, Notice, PageHeader, Pill } from "@/components/ui";
import { requireOrg } from "@/lib/tenancy";
import { buildCalendar, listReminderLog } from "@/lib/queries";
import { formatDate } from "@/lib/expiry";
import { runRemindersNow } from "./actions";

export const dynamic = "force-dynamic";

export default async function CalendarPage(props: PageProps<"/app/calendar">) {
  const sp = await props.searchParams;
  const ctx = await requireOrg("/app/calendar");
  const [items, log] = await Promise.all([buildCalendar(ctx.org.id), listReminderLog(ctx.org.id, 12)]);

  const groups = new Map<string, typeof items>();
  for (const it of items) groups.set(it.date.slice(0, 7), [...(groups.get(it.date.slice(0, 7)) ?? []), it]);
  const monthLabel = (ym: string) => new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const icsHref = "/api/calendar.ics";

  return (
    <>
      <PageHeader
        title="Renewal calendar"
        subtitle="Every registration and document deadline in one place. Reminders go out 60, 30 and 14 days before, and on the day, to every teammate who has notifications on."
        actions={
          <>
            <a href={icsHref} className="btn-secondary" download>
              Subscribe (.ics)
            </a>
            {ctx.role !== "member" ? (
              <form action={runRemindersNow}>
                <button className="btn-secondary" type="submit">
                  Run reminder check now
                </button>
              </form>
            ) : null}
          </>
        }
      />
      {sp.ran ? (
        <Notice>
          Reminder check complete: {sp.sent} sent, {sp.skipped} already sent earlier. The daily job does this automatically.
        </Notice>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {items.length === 0 ? (
            <Empty action={{ href: "/app/towns/add", label: "Add towns" }}>No dated items yet. Add towns and enter issue dates.</Empty>
          ) : (
            [...groups.entries()].map(([ym, list]) => (
              <Card key={ym} title={monthLabel(ym)}>
                <ul className="divide-y divide-slate-100">
                  {list.map((it, i) => (
                    <li key={i} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="flex items-start gap-4">
                        <div className="w-14 shrink-0 text-center">
                          <div className="text-2xl font-semibold tabular-nums text-slate-900">{Number(it.date.slice(8, 10))}</div>
                          <div className="text-[10px] font-semibold uppercase text-slate-500">{new Date(it.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" })}</div>
                        </div>
                        <div>
                          <Link href={it.href} className="font-medium text-slate-900 hover:underline">
                            {it.title}
                          </Link>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <Pill tone={it.kind === "document" ? "blue" : "slate"}>{it.kind}</Pill>
                            <span>{it.subtitle}</span>
                          </div>
                        </div>
                      </div>
                      <HealthBadge health={it.health} daysLeft={it.daysLeft} />
                    </li>
                  ))}
                </ul>
              </Card>
            ))
          )}
        </div>

        <div className="space-y-6">
          <Card title="Reminder ladder">
            <ol className="space-y-2 text-sm text-slate-700">
              <li className="flex justify-between">
                <span>60 days before</span>
                <span className="text-slate-500">order bond & COI renewals</span>
              </li>
              <li className="flex justify-between">
                <span>30 days before</span>
                <span className="text-slate-500">submit application</span>
              </li>
              <li className="flex justify-between">
                <span>14 days before</span>
                <span className="text-slate-500">chase the village</span>
              </li>
              <li className="flex justify-between">
                <span>Day of</span>
                <span className="text-slate-500">stop pulling permits until renewed</span>
              </li>
            </ol>
            <p className="mt-3 text-xs text-slate-500">Who gets them: everyone on your team with notifications on, plus the shared reminder inbox in Settings if you set one.</p>
          </Card>

          <Card title="Recent reminders">
            {log.length === 0 ? (
              <p className="text-sm text-slate-600">None sent yet.</p>
            ) : (
              <ul className="space-y-2 text-xs text-slate-700">
                {log.map((l) => (
                  <li key={l.id} className="rounded border border-slate-200 p-2">
                    <div className="font-medium text-slate-900">{l.subject}</div>
                    <div className="text-slate-500">
                      {l.daysBefore === 0 ? "day-of" : `${l.daysBefore}-day`} · {l.sentAt ? `sent ${formatDate(l.sentAt.toISOString().slice(0, 10))}` : "delivery failed"} · {l.recipients.length} recipient{l.recipients.length === 1 ? "" : "s"}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
