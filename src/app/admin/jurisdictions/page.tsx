import Link from "next/link";
import { ConfidencePill, PageHeader } from "@/components/ui";
import { jurisdictionDemand } from "@/lib/admin-queries";
import { formatDate } from "@/lib/expiry";

export default async function AdminJurisdictions() {
  const rows = await jurisdictionDemand();
  return (
    <>
      <PageHeader
        title="Jurisdictions"
        subtitle="Edit any town's rules. Every save is logged with a before/after diff."
        actions={<Link href="/admin/jurisdictions/new" className="btn-primary">+ Add a jurisdiction</Link>}
      />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="th">Name</th>
              <th className="th">Data quality</th>
              <th className="th">Last verified</th>
              <th className="th text-right">Customers tracking</th>
              <th className="th">Visible</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((j) => (
              <tr key={j.id} className="hover:bg-slate-50/60">
                <td className="td font-medium">{j.name}</td>
                <td className="td"><ConfidencePill level={j.confidence} /></td>
                <td className="td text-slate-600">{j.lastVerifiedAt ? formatDate(j.lastVerifiedAt) : <span className="text-amber-700">never</span>}</td>
                <td className="td text-right tabular-nums">{j.trackers}</td>
                <td className="td">{j.published ? "yes" : <span className="text-slate-400">hidden</span>}</td>
                <td className="td text-right">
                  <Link href={`/admin/jurisdictions/${j.slug}`} className="text-sm font-medium text-slate-600 hover:underline">Edit →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
