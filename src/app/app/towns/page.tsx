import Link from "next/link";
import { Empty, HealthBadge, Notice, PageHeader, Pill } from "@/components/ui";
import { requireOrg } from "@/lib/tenancy";
import { listRegistrations } from "@/lib/queries";
import { formatDate, money } from "@/lib/expiry";

export const dynamic = "force-dynamic";

export default async function TownsPage(props: PageProps<"/app/towns">) {
  const sp = await props.searchParams;
  const ctx = await requireOrg("/app/towns");
  const regs = await listRegistrations(ctx.org.id);
  const order = { expired: 0, expiring: 1, unknown: 2, active: 3, not_registered: 4 } as const;
  const sorted = [...regs].sort((a, b) => order[a.health] - order[b.health] || (a.registration.expiresOn ?? "9999").localeCompare(b.registration.expiresOn ?? "9999"));
  const limit = ctx.limits.maxTowns;

  return (
    <>
      <PageHeader
        title="My towns"
        subtitle={
          <>
            Every municipality you pull permits in, with the expiry computed from that town&apos;s own rule.
            {limit !== null ? (
              <>
                {" "}
                Using <strong>{regs.length}</strong> of {limit} towns on the {ctx.limits.label} plan.
              </>
            ) : null}
          </>
        }
        actions={
          <Link href="/app/towns/add" className="btn-primary">
            + Add towns
          </Link>
        }
      />
      {sp.added ? <Notice>Towns added. Open each one to enter its issue date.</Notice> : null}
      {typeof sp.error === "string" ? <Notice tone="red">{sp.error}</Notice> : null}

      {sorted.length === 0 ? (
        <Empty action={{ href: "/app/towns/add", label: "Add your first town" }}>You haven&apos;t added any towns yet.</Empty>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="th">Town</th>
                <th className="th">Status</th>
                <th className="th">Issued</th>
                <th className="th">Expires</th>
                <th className="th">Term</th>
                <th className="th text-right">Fee</th>
                <th className="th text-right">Bond</th>
                <th className="th">Submit via</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((r) => (
                <tr key={r.registration.id} className="hover:bg-slate-50/60">
                  <td className="td">
                    <Link href={`/app/towns/${r.registration.id}`} className="font-medium text-slate-900 hover:underline">
                      {r.jurisdiction.name}
                    </Link>
                    {r.registration.licenseNumber ? <div className="text-xs text-slate-500">#{r.registration.licenseNumber}</div> : null}
                  </td>
                  <td className="td">
                    <HealthBadge health={r.health} daysLeft={r.daysLeft} />
                    {r.health === "not_registered" ? <div className="mt-1 text-xs capitalize text-slate-500">{r.registration.status}</div> : null}
                  </td>
                  <td className="td tabular-nums">{formatDate(r.registration.issuedOn)}</td>
                  <td className="td tabular-nums">{formatDate(r.registration.expiresOn)}</td>
                  <td className="td">
                    <Pill tone={r.jurisdiction.expiryLabel === "Unknown" ? "amber" : r.jurisdiction.expiryLabel.startsWith("Rolling") ? "blue" : "slate"}>{r.jurisdiction.expiryLabel}</Pill>
                  </td>
                  <td className="td text-right tabular-nums">{money(r.jurisdiction.feeGc)}</td>
                  <td className="td text-right tabular-nums">{money(r.jurisdiction.bondAmount)}</td>
                  <td className="td text-slate-700">{r.jurisdiction.submissionChannel}</td>
                  <td className="td text-right">
                    <Link href={`/app/towns/${r.registration.id}`} className="text-sm font-medium text-slate-600 hover:underline">
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
