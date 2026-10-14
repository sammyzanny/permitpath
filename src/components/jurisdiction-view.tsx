import { Card, ConfidencePill, Fact, Pill } from "@/components/ui";
import { formatDate, money, nextFixedDeadline, type TermType } from "@/lib/expiry";
import type { Jurisdiction } from "@/db/schema";
import type { ReactNode } from "react";

export function isGap(v: string | null | undefined) {
  return !v || /^not published/i.test(v) || /^unknown/i.test(v);
}

/**
 * The per-town rules view, shared by the public SEO page, the in-app rules page
 * and the admin preview. `aside` slots in the caller's context-specific cards.
 */
export function JurisdictionView({ j, aside, headerExtra }: { j: Jurisdiction; aside?: ReactNode; headerExtra?: ReactNode }) {
  const rule = { termType: j.termType as TermType, fixedMonth: j.fixedMonth, fixedDay: j.fixedDay };
  const next = nextFixedDeadline(rule);

  const checklist: Array<{ label: string; detail: string | null; gap: boolean }> = [
    { label: "Completed application form", detail: j.applicationUrl ? "Use the link in the sidebar." : "Form not found online — call the department.", gap: !j.applicationUrl },
    { label: `Registration fee — ${j.feeGcText ?? "not published"}`, detail: j.otherFees && !isGap(j.otherFees) ? j.otherFees : null, gap: isGap(j.feeGcText) },
    { label: `License & permit bond — ${j.bondText ?? "not published"}`, detail: j.bondPayee && !isGap(j.bondPayee) ? `Obligee: ${j.bondPayee}` : "Obligee not published — ask who the bond should name.", gap: isGap(j.bondText) },
    { label: "Certificate of insurance", detail: j.liabilityMin ?? "Minimums not published", gap: isGap(j.liabilityMin) },
    { label: "Workers' compensation", detail: j.workersComp ?? "Not published", gap: isGap(j.workersComp) },
    { label: "Trade credentials", detail: j.otherRequirements, gap: isGap(j.otherRequirements) },
  ];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-600">{j.county} County, Illinois</span>
        <ConfidencePill level={j.confidence} />
        <Pill tone={j.expiryLabel === "Unknown" ? "amber" : "slate"}>Expires: {j.expiryLabel}</Pill>
        {j.lastVerifiedAt ? <span className="text-xs text-slate-500">Last verified {formatDate(j.lastVerifiedAt)}</span> : null}
        {headerExtra}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Renewal checklist">
            <ol className="space-y-3">
              {checklist.map((c, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white">{i + 1}</span>
                  <div>
                    <div className={`text-sm font-medium ${c.gap ? "text-amber-800" : "text-slate-900"}`}>
                      {c.label}
                      {c.gap ? <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800">confirm by phone</span> : null}
                    </div>
                    {c.detail ? <div className="mt-0.5 text-sm text-slate-600">{c.detail}</div> : null}
                  </div>
                </li>
              ))}
              <li className="flex gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white">{checklist.length + 1}</span>
                <div>
                  <div className="text-sm font-medium text-slate-900">Submit: {j.submissionChannel}</div>
                  {j.submissionText ? <div className="mt-0.5 text-sm text-slate-600">{j.submissionText}</div> : null}
                  {j.portalVendor && !/^none/i.test(j.portalVendor) && !isGap(j.portalVendor) ? <div className="mt-0.5 text-xs text-slate-500">Portal: {j.portalVendor}</div> : null}
                </div>
              </li>
            </ol>
          </Card>

          <Card title="Term & renewal">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Fact label="License term (as published)" value={j.licenseTermText ?? "not published"} />
              <Fact
                label="Expiry model"
                value={
                  j.termType === "rolling"
                    ? "Rolling — one year from your issue date. Every contractor has a different deadline."
                    : j.termType === "calendar"
                      ? `Calendar year — everyone expires Dec 31. Next: ${formatDate(next)}`
                      : j.termType === "fixed"
                        ? `Fixed year — everyone expires ${j.expiryLabel}. Next: ${formatDate(next)}`
                        : "Not published — use the expiry date on your certificate."
                }
              />
              <Fact label="Renewal window / late fees" value={j.renewalWindow ?? "not published"} wide />
            </dl>
          </Card>

          <Card title="Fees, bond & insurance (as published)">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Fact label="General contractor fee" value={j.feeGcText ?? "not published"} />
              <Fact label="Subcontractor / trade fee" value={j.feeSubText ?? "not published"} />
              <Fact label="Other fees & penalties" value={j.otherFees ?? "not published"} wide />
              <Fact label="Bond" value={j.bondText ?? "not published"} />
              <Fact label="Bond payee / obligee" value={j.bondPayee ?? "not published"} />
              <Fact label="Liability insurance minimum" value={j.liabilityMin ?? "not published"} wide />
              <Fact label="Workers' compensation" value={j.workersComp ?? "not published"} wide />
              <Fact label="Other requirements" value={j.otherRequirements ?? "not published"} wide />
              <Fact label="Trades covered" value={j.tradesCovered ?? "not published"} wide />
            </dl>
          </Card>

          {j.notes ? (
            <Card title="Notes">
              <p className="whitespace-pre-line text-sm text-slate-700">{j.notes}</p>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          {aside}
          <Card title="At a glance">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-600">GC fee</dt>
                <dd className="font-medium tabular-nums">{money(j.feeGc)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-600">Sub fee</dt>
                <dd className="font-medium tabular-nums">{money(j.feeSub)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-600">Bond</dt>
                <dd className="font-medium tabular-nums">{money(j.bondAmount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-600">Expires</dt>
                <dd className="font-medium">{j.expiryLabel}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Submit via</dt>
                <dd className="text-right font-medium">{j.submissionChannel}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Contact">
            <dl className="space-y-3 text-sm">
              <Fact label="Department" value={j.department ?? "—"} />
              <Fact label="Phone" value={j.phone ?? "—"} />
              {j.email ? <Fact label="Email" value={j.email} /> : null}
              <Fact label="Address" value={j.address ?? "—"} />
            </dl>
            {j.applicationUrl ? (
              <a href={j.applicationUrl} target="_blank" rel="noreferrer" className="btn-secondary mt-4 w-full justify-center">
                Open application / info page ↗
              </a>
            ) : null}
          </Card>

          <Card title="Sources">
            <ul className="space-y-2 text-xs">
              {(j.sourceUrls ?? []).map((u) => (
                <li key={u} className="truncate">
                  <a href={u} target="_blank" rel="noreferrer nofollow" className="text-sky-700 hover:underline">
                    {u.replace(/^https?:\/\//, "")}
                  </a>
                </li>
              ))}
            </ul>
            {j.sourceDate && !isGap(j.sourceDate) ? <p className="mt-3 text-xs text-slate-500">Form / source date: {j.sourceDate}</p> : null}
          </Card>
        </div>
      </div>
    </>
  );
}
