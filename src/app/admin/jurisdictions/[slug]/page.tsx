import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Notice, PageHeader } from "@/components/ui";
import { getJurisdictionBySlug } from "@/lib/queries";
import { listRevisions } from "@/lib/admin-queries";
import { markVerified, saveJurisdiction } from "@/lib/actions/admin";
import type { Jurisdiction } from "@/db/schema";

const EMPTY: Jurisdiction = {
  id: 0,
  slug: "new",
  name: "",
  state: "IL",
  county: "Cook",
  registrationRequired: "yes",
  published: false,
  feeGc: null,
  feeSub: null,
  bondAmount: null,
  termType: "unknown",
  fixedMonth: null,
  fixedDay: null,
  expiryLabel: "Unknown",
  renewalOpensMonth: null,
  renewalOpensDay: null,
  submissionChannel: "Not published",
  portalVendor: null,
  confidence: "low",
  feeGcText: null,
  feeSubText: null,
  otherFees: null,
  bondText: null,
  bondPayee: null,
  liabilityMin: null,
  workersComp: null,
  otherRequirements: null,
  tradesCovered: null,
  licenseTermText: null,
  renewalWindow: null,
  submissionText: null,
  department: null,
  phone: null,
  email: null,
  address: null,
  applicationUrl: null,
  sourceUrls: [],
  sourceDate: null,
  notes: null,
  lastVerifiedAt: null,
  updatedAt: new Date(),
};

function Field({ label, name, value, type = "text", hint, wide = false }: { label: string; name: string; value: string | number | null; type?: string; hint?: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input id={name} name={name} type={type} defaultValue={value ?? ""} className="input mt-1" step={type === "number" ? "any" : undefined} />
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function Area({ label, name, value, rows = 2 }: { label: string; name: string; value: string | null; rows?: number }) {
  return (
    <div className="sm:col-span-2">
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <textarea id={name} name={name} rows={rows} defaultValue={value ?? ""} className="input mt-1" />
    </div>
  );
}

export default async function AdminJurisdictionEdit(props: PageProps<"/admin/jurisdictions/[slug]">) {
  const { slug } = await props.params;
  const sp = await props.searchParams;
  const isNew = slug === "new";
  const j = isNew ? EMPTY : await getJurisdictionBySlug(slug);
  if (!j) notFound();
  const revisions = isNew ? [] : await listRevisions(j.id);
  const save = saveJurisdiction.bind(null, slug);

  return (
    <>
      <div className="mb-2 text-sm text-slate-500">
        <Link href="/admin/jurisdictions" className="hover:underline">
          Jurisdictions
        </Link>{" "}
        / {isNew ? "New" : j.name}
      </div>
      <PageHeader
        title={isNew ? "Add a jurisdiction" : `Edit ${j.name}`}
        actions={
          !isNew ? (
            <>
              <Link href={`/rules/${j.slug}`} className="btn-secondary" target="_blank">
                View public page ↗
              </Link>
              <form action={markVerified.bind(null, j.id)}>
                <button className="btn-primary" type="submit">
                  Mark verified today
                </button>
              </form>
            </>
          ) : null
        }
      />
      {sp.saved ? <Notice>Saved.</Notice> : null}
      {typeof sp.error === "string" ? <Notice tone="red">{sp.error}</Notice> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <form action={save} className="space-y-6 lg:col-span-2">
          <Card title="Identity">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" name="name" value={j.name} />
              <Field label="County" name="county" value={j.county} hint="Cook, Will, or 'Cook / Will'" />
              <div>
                <label className="label" htmlFor="registrationRequired">
                  Registration required?
                </label>
                <select id="registrationRequired" name="registrationRequired" defaultValue={j.registrationRequired} className="input mt-1">
                  <option value="yes">yes</option>
                  <option value="no">no</option>
                  <option value="unknown">unknown</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="confidence">
                  Confidence
                </label>
                <select id="confidence" name="confidence" defaultValue={j.confidence} className="input mt-1">
                  <option value="high">high — read from official page/form/code</option>
                  <option value="medium">medium — official but incomplete</option>
                  <option value="low">low — unverified</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" name="published" defaultChecked={j.published} className="h-4 w-4" /> Published (visible to customers and on the public site)
              </label>
            </div>
          </Card>

          <Card title="Normalized values (drive the app logic)">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="GC fee ($)" name="feeGc" value={j.feeGc} type="number" hint="Blank = not published" />
              <Field label="Sub / trade fee ($)" name="feeSub" value={j.feeSub} type="number" />
              <Field label="Bond ($)" name="bondAmount" value={j.bondAmount} type="number" hint="0 = no bond required; blank = not published" />
              <div>
                <label className="label" htmlFor="termType">
                  Term type
                </label>
                <select id="termType" name="termType" defaultValue={j.termType} className="input mt-1">
                  <option value="fixed">fixed — same date for everyone (e.g. Apr 30)</option>
                  <option value="calendar">calendar — Dec 31</option>
                  <option value="rolling">rolling — 1 year from issue</option>
                  <option value="unknown">unknown</option>
                </select>
              </div>
              <Field label="Fixed month (1–12)" name="fixedMonth" value={j.fixedMonth} type="number" hint="For fixed/calendar terms" />
              <Field label="Fixed day" name="fixedDay" value={j.fixedDay} type="number" />
              <Field label="Expiry label" name="expiryLabel" value={j.expiryLabel} hint="Shown in tables: 'Apr 30', 'Dec 31', 'Rolling (1 yr from issue)', 'Unknown'" />
              <Field label="Submission channel (short)" name="submissionChannel" value={j.submissionChannel} hint="e.g. 'Email', 'Online portal only', 'In person / mail only (no email)'" />
              <Field label="Renewal opens — month" name="renewalOpensMonth" value={j.renewalOpensMonth} type="number" hint="Optional, e.g. Chicago Heights opens Mar 15" />
              <Field label="Renewal opens — day" name="renewalOpensDay" value={j.renewalOpensDay} type="number" />
              <Field label="Portal vendor" name="portalVendor" value={j.portalVendor} wide />
            </div>
          </Card>

          <Card title="As published (shown verbatim to customers)">
            <div className="grid gap-4 sm:grid-cols-2">
              <Area label="GC fee text" name="feeGcText" value={j.feeGcText} />
              <Area label="Sub fee text" name="feeSubText" value={j.feeSubText} />
              <Area label="Other fees / penalties" name="otherFees" value={j.otherFees} />
              <Area label="Bond text" name="bondText" value={j.bondText} />
              <Area label="Bond payee / obligee" name="bondPayee" value={j.bondPayee} />
              <Area label="Liability insurance minimum" name="liabilityMin" value={j.liabilityMin} />
              <Area label="Workers' comp" name="workersComp" value={j.workersComp} />
              <Area label="Other requirements" name="otherRequirements" value={j.otherRequirements} rows={3} />
              <Area label="Trades covered" name="tradesCovered" value={j.tradesCovered} rows={3} />
              <Area label="License term text" name="licenseTermText" value={j.licenseTermText} />
              <Area label="Renewal window / late fees" name="renewalWindow" value={j.renewalWindow} />
              <Area label="Submission method text" name="submissionText" value={j.submissionText} rows={3} />
              <Area label="Notes" name="notes" value={j.notes} rows={3} />
            </div>
          </Card>

          <Card title="Contact & sources">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Department" name="department" value={j.department} wide />
              <Field label="Phone" name="phone" value={j.phone} />
              <Field label="Email" name="email" value={j.email} />
              <Field label="Address" name="address" value={j.address} wide />
              <Field label="Application URL" name="applicationUrl" value={j.applicationUrl} wide />
              <Area label="Source URLs (one per line)" name="sourceUrls" value={(j.sourceUrls ?? []).join("\n")} rows={4} />
              <Field label="Source / form date" name="sourceDate" value={j.sourceDate} />
              <Field label="Last verified (YYYY-MM-DD)" name="lastVerifiedAt" value={j.lastVerifiedAt} type="date" />
            </div>
          </Card>

          <Card title="Save">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1">
                <label className="label" htmlFor="revisionNote">
                  Revision note
                </label>
                <input id="revisionNote" name="revisionNote" className="input mt-1" placeholder="e.g. Called Village Hall 9/25 — fee now $175, takes email" />
              </div>
              <button className="btn-primary" type="submit">
                {isNew ? "Create jurisdiction" : "Save changes"}
              </button>
            </div>
          </Card>
        </form>

        <div className="space-y-6">
          <Card title="Revision history">
            {revisions.length === 0 ? (
              <p className="text-sm text-slate-500">No edits yet.</p>
            ) : (
              <ul className="space-y-3 text-xs">
                {revisions.map(({ rev, user }) => (
                  <li key={rev.id} className="rounded border border-slate-200 p-2">
                    <div className="flex justify-between text-slate-500">
                      <span>{user?.email ?? "system"}</span>
                      <time>{rev.createdAt.toLocaleString("en-US", { timeZone: "America/Chicago" })}</time>
                    </div>
                    {rev.note ? <div className="mt-1 font-medium text-slate-800">{rev.note}</div> : null}
                    <ul className="mt-1 space-y-0.5 text-slate-700">
                      {Object.entries(rev.changes)
                        .slice(0, 8)
                        .map(([k, v]) => (
                          <li key={k}>
                            <span className="font-mono text-[11px] text-slate-500">{k}</span>: <span className="line-through text-slate-400">{String(v.from ?? "—").slice(0, 40)}</span> → <span>{String(v.to ?? "—").slice(0, 60)}</span>
                          </li>
                        ))}
                      {Object.keys(rev.changes).length > 8 ? <li className="text-slate-400">+{Object.keys(rev.changes).length - 8} more fields</li> : null}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
