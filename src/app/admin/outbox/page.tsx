import { Card, Empty, PageHeader, Pill } from "@/components/ui";
import { listOutbox } from "@/lib/admin-queries";
import { env } from "@/lib/env";

export default async function AdminOutbox() {
  const rows = await listOutbox(100);
  return (
    <>
      <PageHeader title="Email outbox" subtitle={env.email.configured ? "Every email sent through Resend, with delivery status." : "Resend isn't configured — emails are captured here instead of being delivered. Set RESEND_API_KEY to send for real."} />
      {rows.length === 0 ? (
        <Empty>No emails yet.</Empty>
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100">
            {rows.map((m) => (
              <li key={m.id} className="py-3">
                <details>
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-sm">
                    <span>
                      <span className="font-medium text-slate-900">{m.subject}</span>
                      <span className="ml-2 text-xs text-slate-500">→ {m.toAddresses.join(", ")}</span>
                    </span>
                    <span className="flex items-center gap-2 text-xs text-slate-500">
                      {m.template ? <Pill>{m.template}</Pill> : null}
                      <Pill tone={m.status === "sent" ? "green" : m.status === "failed" ? "red" : "amber"}>{m.provider} · {m.status}</Pill>
                      {m.createdAt.toLocaleString("en-US", { timeZone: "America/Chicago" })}
                    </span>
                  </summary>
                  <pre className="mt-3 whitespace-pre-wrap rounded bg-slate-50 p-3 text-xs text-slate-700">{m.text}</pre>
                  {m.error ? <p className="mt-2 text-xs text-red-700">{m.error}</p> : null}
                </details>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
