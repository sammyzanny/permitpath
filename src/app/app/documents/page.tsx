import Link from "next/link";
import { Card, Empty, HealthBadge, Notice, PageHeader, Pill } from "@/components/ui";
import { requireOrg } from "@/lib/tenancy";
import { findDocumentConflicts, listDocuments, listRegistrations } from "@/lib/queries";
import { addDocument, deleteDocument, replaceDocumentFile } from "@/lib/actions/documents";
import { formatDate, money } from "@/lib/expiry";
import { env } from "@/lib/env";
import { KIND_LABEL } from "@/lib/constants";

export const dynamic = "force-dynamic";


function bytes(n: number | null) {
  if (!n) return "";
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;
}

export default async function DocumentsPage(props: PageProps<"/app/documents">) {
  const sp = await props.searchParams;
  const ctx = await requireOrg("/app/documents");
  const [docs, regs, conflicts] = await Promise.all([listDocuments(ctx.org.id), listRegistrations(ctx.org.id), findDocumentConflicts(ctx.org.id)]);
  const myTowns = regs.map((r) => r.jurisdiction);
  const readOnly = ctx.limits.readOnly;

  return (
    <>
      <PageHeader
        title="Document vault"
        subtitle="The certificates every village asks for, with their own expiry dates. A COI or bond that lapses can void a registration even if the registration itself hasn't expired. Files are private to your team."
      />
      {sp.saved ? <Notice>Saved.</Notice> : null}
      {typeof sp.error === "string" ? <Notice tone="red">{sp.error}</Notice> : null}
      {!env.storage.configured && env.isProd ? <Notice tone="amber">File storage isn&apos;t configured (S3_BUCKET). Uploads are stored on the server disk and may not persist across deploys.</Notice> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {docs.length === 0 ? (
            <Empty>No documents yet. Add your COI and bonds using the form.</Empty>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="th">Document</th>
                    <th className="th">Town</th>
                    <th className="th text-right">Amount</th>
                    <th className="th">Expires</th>
                    <th className="th">Status</th>
                    <th className="th"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {docs.map((d) => (
                    <tr key={d.document.id}>
                      <td className="td">
                        <div className="font-medium text-slate-900">{d.document.title}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-slate-500">
                          <Pill>{KIND_LABEL[d.document.kind] ?? d.document.kind}</Pill>
                          {d.document.issuer ? <span>{d.document.issuer}</span> : null}
                          {d.document.policyOrBondNumber ? <span>· #{d.document.policyOrBondNumber}</span> : null}
                        </div>
                        <div className="mt-1 text-xs">
                          {d.document.storageKey ? (
                            <a href={`/api/files/${d.document.id}`} target="_blank" rel="noreferrer" className="text-sky-700 underline">
                              {d.document.fileName ?? "View file"} {bytes(d.document.sizeBytes)}
                            </a>
                          ) : (
                            <details className="inline">
                              <summary className="cursor-pointer text-slate-500 underline">No file — attach one</summary>
                              <form action={replaceDocumentFile.bind(null, d.document.id)} className="mt-2 flex items-center gap-2">
                                <input name="file" type="file" accept="application/pdf,image/*" className="input max-w-xs py-1 text-xs" required disabled={readOnly} />
                                <button className="btn-secondary py-1 text-xs" type="submit" disabled={readOnly}>
                                  Upload
                                </button>
                              </form>
                            </details>
                          )}
                        </div>
                      </td>
                      <td className="td text-slate-700">{d.jurisdiction?.name ?? <span className="text-slate-400">all towns</span>}</td>
                      <td className="td text-right tabular-nums">{d.document.amount ? money(d.document.amount) : "—"}</td>
                      <td className="td tabular-nums">{formatDate(d.document.expiresOn)}</td>
                      <td className="td">
                        <HealthBadge health={d.health} daysLeft={d.daysLeft} />
                      </td>
                      <td className="td text-right">
                        <form action={deleteDocument.bind(null, d.document.id)}>
                          <button className="text-xs font-medium text-red-700 hover:underline disabled:opacity-50" type="submit" disabled={readOnly}>
                            Remove
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {conflicts.length > 0 ? (
            <Card title={`${conflicts.length} document conflict${conflicts.length > 1 ? "s" : ""}`}>
              <ul className="space-y-2 text-sm">
                {conflicts.map((c, i) => (
                  <li key={i} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
                    <strong>{c.documentTitle}</strong> expires {formatDate(c.documentExpires)} — within 90 days before the{" "}
                    <Link href={`/app/towns/${c.registrationId}`} className="underline">
                      {c.jurisdictionName}
                    </Link>{" "}
                    renewal on {formatDate(c.registrationExpires)}.
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <Card title="Add a document">
          <form action={addDocument} className="space-y-3" encType="multipart/form-data">
            <fieldset disabled={readOnly} className="contents">
              <div>
                <label className="label" htmlFor="kind">
                  Type
                </label>
                <select id="kind" name="kind" className="input mt-1" defaultValue="coi">
                  {Object.entries(KIND_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="title">
                  Title
                </label>
                <input id="title" name="title" required className="input mt-1" placeholder="General liability COI — $1M/$2M" />
              </div>
              <div>
                <label className="label" htmlFor="jurisdictionId">
                  Town (bonds are per-town)
                </label>
                <select id="jurisdictionId" name="jurisdictionId" className="input mt-1" defaultValue="">
                  <option value="">All towns / not town-specific</option>
                  {myTowns.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="issuer">
                    Issuer / carrier
                  </label>
                  <input id="issuer" name="issuer" className="input mt-1" />
                </div>
                <div>
                  <label className="label" htmlFor="policyOrBondNumber">
                    Policy / bond #
                  </label>
                  <input id="policyOrBondNumber" name="policyOrBondNumber" className="input mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label" htmlFor="amount">
                    Amount ($)
                  </label>
                  <input id="amount" name="amount" type="number" min="0" step="1" className="input mt-1" />
                </div>
                <div>
                  <label className="label" htmlFor="effectiveOn">
                    Effective
                  </label>
                  <input id="effectiveOn" name="effectiveOn" type="date" className="input mt-1" />
                </div>
                <div>
                  <label className="label" htmlFor="expiresOn">
                    Expires
                  </label>
                  <input id="expiresOn" name="expiresOn" type="date" className="input mt-1" />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="file">
                  File (PDF or photo, up to 15 MB)
                </label>
                <input id="file" name="file" type="file" accept="application/pdf,image/*" className="input mt-1" />
              </div>
              <div>
                <label className="label" htmlFor="notes">
                  Notes
                </label>
                <textarea id="notes" name="notes" rows={2} className="input mt-1" />
              </div>
              <button className="btn-primary w-full justify-center" type="submit">
                Add document
              </button>
            </fieldset>
          </form>
        </Card>
      </div>
    </>
  );
}
