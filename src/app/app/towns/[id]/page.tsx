import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Fact, HealthBadge, Notice, PageHeader, Pill } from "@/components/ui";
import { requireOrg } from "@/lib/tenancy";
import { getRegistration, listDocuments, nextFixedDeadline, ruleOf } from "@/lib/queries";
import { deleteRegistration, updateRegistration } from "@/lib/actions/registrations";
import { daysUntil, formatDate, health, money } from "@/lib/expiry";

export const dynamic = "force-dynamic";

export default async function TownDetail(props: PageProps<"/app/towns/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const ctx = await requireOrg(`/app/towns/${id}`);
  const row = await getRegistration(ctx.org.id, Number(id));
  if (!row) notFound();
  const { registration: r, jurisdiction: j } = row;

  const next = nextFixedDeadline(ruleOf(j));
  const h = r.status === "planned" || r.status === "submitted" ? "not_registered" : health(r.expiresOn);
  const docs = (await listDocuments(ctx.org.id)).filter((d) => d.document.kind === "coi" || d.document.kind === "workers_comp" || (d.document.kind === "bond" && d.document.jurisdictionId === j.id));
  const update = updateRegistration.bind(null, r.id);
  const remove = deleteRegistration.bind(null, r.id);
  const readOnly = ctx.limits.readOnly;

  return (
    <>
      <div className="mb-2 text-sm text-slate-500">
        <Link href="/app/towns" className="hover:underline">
          My towns
        </Link>{" "}
        / {j.name}
      </div>
      <PageHeader
        title={`${j.name} registration`}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <HealthBadge health={h} daysLeft={daysUntil(r.expiresOn)} />
            <Pill tone={j.expiryLabel === "Unknown" ? "amber" : "slate"}>Town rule: expires {j.expiryLabel}</Pill>
            <Link href={`/app/rules/${j.slug}`} className="text-sm text-sky-700 hover:underline">
              Full checklist for {j.name} →
            </Link>
          </span>
        }
      />
      {sp.saved ? <Notice>Saved.</Notice> : null}
      {typeof sp.error === "string" ? <Notice tone="red">{sp.error}</Notice> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Registration details">
            <form action={update} className="grid gap-4 sm:grid-cols-2">
              <fieldset disabled={readOnly} className="contents">
                <div>
                  <label className="label" htmlFor="status">
                    Status
                  </label>
                  <select id="status" name="status" defaultValue={r.status} className="input mt-1">
                    <option value="planned">Planned — not yet applied</option>
                    <option value="submitted">Submitted — waiting on the village</option>
                    <option value="active">Active — registered</option>
                    <option value="lapsed">Lapsed — let it expire on purpose</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="licenseNumber">
                    License / registration #
                  </label>
                  <input id="licenseNumber" name="licenseNumber" defaultValue={r.licenseNumber ?? ""} className="input mt-1" placeholder="e.g. GC-26-118" />
                </div>
                <div>
                  <label className="label" htmlFor="issuedOn">
                    Issued on
                  </label>
                  <input id="issuedOn" name="issuedOn" type="date" defaultValue={r.issuedOn ?? ""} className="input mt-1" />
                  <p className="mt-1 text-xs text-slate-500">
                    {j.termType === "rolling"
                      ? "Rolling term: expiry = issue date + 1 year."
                      : j.termType === "unknown"
                        ? "This town doesn't publish its term — enter the expiry from your certificate."
                        : `Fixed deadline: everyone expires ${j.expiryLabel}. Next is ${formatDate(next)}.`}
                  </p>
                </div>
                <div>
                  <label className="label" htmlFor="expiresOn">
                    Expires on
                  </label>
                  <input id="expiresOn" name="expiresOn" type="date" defaultValue={r.expiresOn ?? ""} className="input mt-1" />
                  <p className="mt-1 text-xs text-slate-500">Leave blank to compute from the issue date and the town&apos;s rule.</p>
                </div>
                <div>
                  <label className="label" htmlFor="feePaid">
                    Fee paid ($)
                  </label>
                  <input id="feePaid" name="feePaid" type="number" step="0.01" min="0" defaultValue={r.feePaid ?? ""} className="input mt-1" placeholder={j.feeGc?.toString() ?? ""} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="notes">
                    Notes
                  </label>
                  <textarea id="notes" name="notes" rows={3} defaultValue={r.notes ?? ""} className="input mt-1" placeholder="Who you spoke to, what they asked for, confirmation numbers…" />
                </div>
                <div className="flex items-center gap-3 sm:col-span-2">
                  <button className="btn-primary" type="submit">
                    Save
                  </button>
                  {readOnly ? <span className="text-xs text-red-700">Read-only until you choose a plan.</span> : null}
                </div>
              </fieldset>
            </form>
          </Card>

          <Card title={`What ${j.name} requires`}>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Fact label="Fee" value={j.feeGcText ?? "not published"} />
              <Fact label="Bond" value={j.bondText ?? "not published"} />
              <Fact label="Insurance minimum" value={j.liabilityMin ?? "not published"} wide />
              <Fact label="Renewal window" value={j.renewalWindow ?? "not published"} wide />
              <Fact label="How to submit" value={j.submissionText ?? j.submissionChannel} wide />
              <Fact label="Phone" value={j.phone ?? "—"} />
              <Fact label="Department" value={j.department ?? "—"} />
            </dl>
            {j.applicationUrl ? (
              <a href={j.applicationUrl} target="_blank" rel="noreferrer" className="btn-secondary mt-4">
                Open the town&apos;s application page ↗
              </a>
            ) : null}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Supporting documents">
            {docs.length === 0 ? (
              <p className="text-sm text-slate-600">No COI, workers&apos; comp or bond on file for this town yet.</p>
            ) : (
              <ul className="space-y-3">
                {docs.map((d) => {
                  const gap = r.expiresOn && d.document.expiresOn ? daysUntil(r.expiresOn, new Date(d.document.expiresOn + "T00:00:00")) : null;
                  const conflict = gap !== null && gap > 0 && gap <= 90;
                  return (
                    <li key={d.document.id} className={`rounded-lg border p-3 text-sm ${conflict ? "border-amber-200 bg-amber-50" : "border-slate-200"}`}>
                      <div className="font-medium text-slate-900">{d.document.title}</div>
                      <div className="mt-0.5 flex items-center justify-between text-xs text-slate-600">
                        <span>expires {formatDate(d.document.expiresOn)}</span>
                        <HealthBadge health={d.health} daysLeft={d.daysLeft} />
                      </div>
                      {d.document.storageKey ? (
                        <a href={`/api/files/${d.document.id}`} className="mt-1 inline-block text-xs text-sky-700 underline" target="_blank" rel="noreferrer">
                          View file
                        </a>
                      ) : null}
                      {conflict ? <div className="mt-1 text-xs text-amber-900">Lapses shortly before this renewal — renew the certificate first.</div> : null}
                    </li>
                  );
                })}
              </ul>
            )}
            <Link href="/app/documents" className="btn-secondary mt-4 w-full justify-center">
              Manage documents
            </Link>
          </Card>

          <Card title="Cost">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-600">Annual fee (GC)</dt>
                <dd className="font-medium">{money(j.feeGc)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-600">Bond face value</dt>
                <dd className="font-medium">{money(j.bondAmount)}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Remove">
            <form action={remove}>
              <button className="btn-danger w-full justify-center" type="submit">
                Stop tracking {j.name}
              </button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
