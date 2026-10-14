import Link from "next/link";
import { Card, PageHeader, Stat } from "@/components/ui";
import { adminOverview, jurisdictionDemand } from "@/lib/admin-queries";
import { env } from "@/lib/env";
import { formatDate } from "@/lib/expiry";

export default async function AdminHome() {
  const [o, demand] = await Promise.all([adminOverview(), jurisdictionDemand()]);
  const top = demand.slice(0, 10);
  const integrations = [
    ["Auth (Clerk)", env.clerk.configured],
    ["Billing (Stripe)", env.stripe.configured],
    ["Email (Resend)", env.email.configured],
    ["File storage (S3)", env.storage.configured],
    ["Database (Postgres URL)", Boolean(process.env.DATABASE_URL)],
    ["Cron secret", Boolean(env.cronSecret)],
  ] as const;

  return (
    <>
      <PageHeader title="Overview" subtitle="Platform health at a glance." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Customers" value={o.orgs.n} hint={`${o.orgs.trial} trialing · ${o.orgs.paying} paying`} />
        <Stat label="Registrations tracked" value={o.regs} />
        <Stat label="Open rule reports" value={o.openReports} tone={o.openReports ? "warn" : "default"} />
        <Stat label="Towns not verified in 180 days" value={o.stale} tone={o.stale ? "warn" : "good"} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Most-tracked jurisdictions (verify these first)">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {top.map((j) => (
                <tr key={j.id}>
                  <td className="py-2">
                    <Link href={`/admin/jurisdictions/${j.slug}`} className="font-medium hover:underline">{j.name}</Link>
                    {!j.published ? <span className="ml-2 text-xs text-slate-400">(hidden)</span> : null}
                  </td>
                  <td className="py-2 text-right tabular-nums text-slate-600">{j.trackers} tracking</td>
                  <td className="py-2 text-right text-xs text-slate-500">{j.lastVerifiedAt ? `verified ${formatDate(j.lastVerifiedAt)}` : "never verified"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="Integrations">
          <ul className="space-y-2 text-sm">
            {integrations.map(([name, ok]) => (
              <li key={name} className="flex items-center justify-between">
                <span>{name}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{ok ? "connected" : "local fallback"}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">Emails logged: {o.emails.n} ({o.emails.failed} failed) · Reminders sent: {o.remindersSent}. See DEPLOY.md for connecting each service.</p>
        </Card>
      </div>
    </>
  );
}
