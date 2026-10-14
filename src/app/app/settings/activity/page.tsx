import { Card, Empty, PageHeader } from "@/components/ui";
import { requireOrg } from "@/lib/tenancy";
import { listAudit } from "@/lib/queries";

export const dynamic = "force-dynamic";

const LABELS: Record<string, string> = {
  "org.create": "created the account",
  "org.update": "updated company details",
  "registration.create": "added a town",
  "registration.bulk_create": "added towns",
  "registration.update": "updated a registration",
  "registration.delete": "removed a town",
  "document.create": "added a document",
  "document.file_replaced": "replaced a file",
  "document.delete": "removed a document",
  "team.invite": "invited a teammate",
  "team.invite_revoked": "revoked an invitation",
  "team.joined": "joined the team",
  "team.role_changed": "changed a role",
  "team.removed": "removed a teammate",
  "billing.checkout_started": "started checkout",
  "billing.subscription_synced": "subscription updated (Stripe)",
  "billing.payment_failed": "payment failed (Stripe)",
  "billing.dev_plan_set": "set plan (dev)",
  "reminders.manual_run": "ran reminder check",
  "rule_report.create": "reported a rule problem",
};

export default async function ActivityPage() {
  const ctx = await requireOrg("/app/settings/activity");
  const rows = await listAudit(ctx.org.id, 100);
  return (
    <>
      <PageHeader title="Activity log" subtitle="Who changed what, and when. Useful when a village asks why a renewal was late." />
      {rows.length === 0 ? (
        <Empty>No activity yet.</Empty>
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100 text-sm">
            {rows.map(({ event, user }) => (
              <li key={event.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <span>
                  <span className="font-medium text-slate-900">{user?.name ?? user?.email ?? "System"}</span> <span className="text-slate-700">{LABELS[event.action] ?? event.action}</span>
                  {event.meta && Object.keys(event.meta).length ? <span className="ml-2 text-xs text-slate-500">{Object.entries(event.meta).map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}</span> : null}
                </span>
                <time className="text-xs tabular-nums text-slate-500">{event.createdAt.toLocaleString("en-US", { timeZone: "America/Chicago" })}</time>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
