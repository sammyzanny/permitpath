import { Card, PageHeader, Pill } from "@/components/ui";
import { listOrgsAdmin } from "@/lib/admin-queries";
import { formatDate } from "@/lib/expiry";

export default async function AdminOrgs() {
  const rows = await listOrgsAdmin();
  return (
    <>
      <PageHeader title="Customers" subtitle={`${rows.length} organizations.`} />
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="th">Organization</th>
              <th className="th">Plan</th>
              <th className="th text-right">Members</th>
              <th className="th text-right">Towns</th>
              <th className="th">Trial ends / renews</th>
              <th className="th">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ org, members, towns }) => (
              <tr key={org.id}>
                <td className="td">
                  <div className="font-medium">{org.name}</div>
                  <div className="text-xs text-slate-500">{org.trade ?? "—"} · {org.slug}{org.stripeCustomerId ? ` · ${org.stripeCustomerId}` : ""}</div>
                </td>
                <td className="td"><Pill tone={org.planStatus === "active" ? "green" : org.plan === "trial" ? "blue" : "amber"}>{org.plan} · {org.planStatus}</Pill></td>
                <td className="td text-right tabular-nums">{members}</td>
                <td className="td text-right tabular-nums">{towns}</td>
                <td className="td text-slate-600">{formatDate((org.currentPeriodEnd ?? org.trialEndsAt)?.toISOString().slice(0, 10))}</td>
                <td className="td text-slate-600">{formatDate(org.createdAt.toISOString().slice(0, 10))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
