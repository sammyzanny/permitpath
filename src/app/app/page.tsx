import Link from "next/link";
import { Card, Empty, HealthBadge, Notice, PageHeader, Stat } from "@/components/ui";
import { requireOrg } from "@/lib/tenancy";
import { buildCalendar, dashboardStats, findDocumentConflicts, jurisdictionStats } from "@/lib/queries";
import { formatDate, money } from "@/lib/expiry";

export const dynamic = "force-dynamic";

export default async function Dashboard(props: PageProps<"/app">) {
  const sp = await props.searchParams;
  const ctx = await requireOrg();
  const [stats, calendar, conflicts, jstats] = await Promise.all([dashboardStats(ctx.org.id), buildCalendar(ctx.org.id), findDocumentConflicts(ctx.org.id), jurisdictionStats()]);
  const upcoming = calendar.filter((i) => i.daysLeft !== null && i.daysLeft <= 90 && i.daysLeft >= -365).slice(0, 8);
  const attention = stats.regs.filter((r) => r.health === "expired" || r.health === "expiring");
  const firstName = ctx.user.name?.split(" ")[0];

  return (
    <>
      <PageHeader
        title={firstName ? `Good day, ${firstName}` : ctx.org.name}
        subtitle={`${ctx.org.trade ?? "Contractor"} · tracking ${stats.total} town${stats.total === 1 ? "" : "s"} across ${jstats.count} jurisdictions on file.`}
        actions={
          <Link href="/app/towns/add" className="btn-primary">
            + Add towns
          </Link>
        }
      />

      {sp.welcome ? <Notice>Welcome! Your towns are added as &ldquo;planned&rdquo;. Open each one and enter the issue date from your certificate so we can compute the renewal.</Notice> : null}
      {sp.joined ? <Notice>You&apos;ve joined {ctx.org.name}.</Notice> : null}
      {sp.denied === "admin" ? <Notice tone="amber">That area is for platform administrators.</Notice> : null}

      {stats.expired > 0 ? (
        <Notice tone="red">
          <strong>
            {stats.expired} registration{stats.expired > 1 ? "s have" : " has"} lapsed.
          </strong>{" "}
          Villages will not issue permits to an unregistered contractor — renew before your next job there.
        </Notice>
      ) : null}

      {stats.total === 0 ? (
        <Empty action={{ href: "/app/towns/add", label: "Add your first town" }}>You haven&apos;t added any towns yet. Pick the municipalities you pull permits in and we&apos;ll build your renewal calendar.</Empty>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Active" value={stats.active} tone="good" hint="renewal more than 60 days out" />
            <Stat label="Expiring ≤ 60 days" value={stats.expiring} tone={stats.expiring ? "warn" : "default"} />
            <Stat label="Expired" value={stats.expired} tone={stats.expired ? "bad" : "default"} />
            <Stat label="Not yet registered" value={stats.notRegistered} hint="planned or submitted" />
            <Stat label="Documents expiring" value={stats.docsExpiring} tone={stats.docsExpiring ? "warn" : "default"} hint="COI, bonds, credentials" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card title="Needs attention" className="lg:col-span-2">
              {attention.length === 0 ? (
                <Empty>Nothing is expiring in the next 60 days.</Empty>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {attention.map((r) => (
                    <li key={r.registration.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <Link href={`/app/towns/${r.registration.id}`} className="font-medium text-slate-900 hover:underline">
                          {r.jurisdiction.name}
                        </Link>
                        <div className="text-xs text-slate-500">
                          Expires {formatDate(r.registration.expiresOn)} · {r.jurisdiction.expiryLabel} · {r.jurisdiction.submissionChannel}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-600">{money(r.jurisdiction.feeGc)}</span>
                        <HealthBadge health={r.health} daysLeft={r.daysLeft} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Your annual compliance cost">
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-600">Registration fees (GC rate)</dt>
                  <dd className="font-medium tabular-nums">{money(stats.feeTotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-600">Bonds required</dt>
                  <dd className="font-medium tabular-nums">{stats.bondCount} separate bonds</dd>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-3">
                  <dt className="text-slate-600">Total bond face value</dt>
                  <dd className="font-medium tabular-nums">{money(stats.bondTotal)}</dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-slate-500">Bond premiums typically run 1–3% of face value per year. Each town needs its own bond naming that village as obligee.</p>
            </Card>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card
              title="Next 90 days"
              className="lg:col-span-2"
              actions={
                <Link href="/app/calendar" className="text-xs font-medium text-slate-600 hover:underline">
                  Full calendar →
                </Link>
              }
            >
              {upcoming.length === 0 ? (
                <Empty>No deadlines in the next 90 days.</Empty>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="th">Date</th>
                      <th className="th">Item</th>
                      <th className="th">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {upcoming.map((i) => (
                      <tr key={i.kind + i.href + i.date + i.title}>
                        <td className="td whitespace-nowrap tabular-nums">{formatDate(i.date)}</td>
                        <td className="td">
                          <Link href={i.href} className="font-medium hover:underline">
                            {i.title}
                          </Link>
                          <div className="text-xs text-slate-500">{i.subtitle}</div>
                        </td>
                        <td className="td">
                          <HealthBadge health={i.health} daysLeft={i.daysLeft} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            <Card title="Document conflicts">
              {conflicts.length === 0 ? (
                <p className="text-sm text-slate-600">No insurance or bond certificate lapses in the 90 days before a renewal.</p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {conflicts.slice(0, 6).map((c, i) => (
                    <li key={i} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
                      <div className="font-medium">{c.documentTitle}</div>
                      <div className="text-xs">
                        expires {formatDate(c.documentExpires)}, before your{" "}
                        <Link href={`/app/towns/${c.registrationId}`} className="underline">
                          {c.jurisdictionName}
                        </Link>{" "}
                        renewal on {formatDate(c.registrationExpires)}. Renew the certificate first or the village may reject it.
                      </div>
                    </li>
                  ))}
                  {conflicts.length > 6 ? <li className="text-xs text-slate-500">+{conflicts.length - 6} more on the Documents page</li> : null}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </>
  );
}
