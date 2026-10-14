import Link from "next/link";
import { Card, Empty, PageHeader, Pill } from "@/components/ui";
import { listReports } from "@/lib/admin-queries";
import { resolveReport } from "@/lib/actions/admin";

export default async function AdminReports(props: PageProps<"/admin/reports">) {
  const sp = await props.searchParams;
  const status = typeof sp.status === "string" ? sp.status : "open";
  const rows = await listReports(status === "all" ? undefined : status);
  return (
    <>
      <PageHeader
        title="Rule reports"
        subtitle="Customers telling us a village's rule is wrong or out of date. Verify with the village, edit the jurisdiction, then resolve."
        actions={
          <div className="flex gap-1">
            {["open", "resolved", "dismissed", "all"].map((s) => (
              <Link key={s} href={`/admin/reports?status=${s}`} className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${status === s ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-700 ring-slate-300"}`}>
                {s}
              </Link>
            ))}
          </div>
        }
      />
      {rows.length === 0 ? (
        <Empty>No {status === "all" ? "" : status} reports.</Empty>
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100">
            {rows.map(({ report, jurisdiction, org, user }) => (
              <li key={report.id} className="flex flex-wrap items-start justify-between gap-4 py-4">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/jurisdictions/${jurisdiction.slug}`} className="font-medium text-slate-900 hover:underline">{jurisdiction.name}</Link>
                    {report.field ? <Pill>{report.field}</Pill> : null}
                    <Pill tone={report.status === "open" ? "amber" : report.status === "resolved" ? "green" : "slate"}>{report.status}</Pill>
                  </div>
                  <p className="mt-1 text-sm text-slate-800">{report.message}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {user?.email ?? "unknown"} {org ? `· ${org.name}` : ""} · {report.createdAt.toLocaleString("en-US", { timeZone: "America/Chicago" })}
                  </p>
                </div>
                <form action={resolveReport} className="flex items-center gap-1">
                  <input type="hidden" name="id" value={report.id} />
                  <select name="status" defaultValue={report.status} className="input py-1 text-xs">
                    <option value="open">open</option>
                    <option value="resolved">resolved</option>
                    <option value="dismissed">dismissed</option>
                  </select>
                  <button className="btn-secondary py-1 text-xs" type="submit">Update</button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
