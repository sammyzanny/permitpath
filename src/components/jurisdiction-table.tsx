import Link from "next/link";
import { ConfidencePill, Pill } from "@/components/ui";
import { money } from "@/lib/expiry";
import type { Jurisdiction } from "@/db/schema";

/** Sortable-by-URL directory table used on the public /rules page and in-app /app/rules. */
export function JurisdictionTable({ rows, hrefBase, mine = new Set<number>(), total }: { rows: Jurisdiction[]; hrefBase: string; mine?: Set<number>; total: number }) {
  return (
    <>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="th">Jurisdiction</th>
              <th className="th">County</th>
              <th className="th text-right">GC fee</th>
              <th className="th text-right">Sub fee</th>
              <th className="th text-right">Bond</th>
              <th className="th">Expires</th>
              <th className="th">Submit via</th>
              <th className="th">Data quality</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((j) => (
              <tr key={j.id} className="hover:bg-slate-50/60">
                <td className="td">
                  <Link href={`${hrefBase}/${j.slug}`} className="font-medium text-slate-900 hover:underline">
                    {j.name}
                  </Link>
                  {mine.has(j.id) ? (
                    <span className="ml-2">
                      <Pill tone="blue">my town</Pill>
                    </span>
                  ) : null}
                </td>
                <td className="td text-slate-600">{j.county}</td>
                <td className={`td text-right tabular-nums ${j.feeGc === null ? "italic text-slate-400" : ""}`}>{j.feeGc === null ? "n/p" : money(j.feeGc)}</td>
                <td className={`td text-right tabular-nums ${j.feeSub === null ? "italic text-slate-400" : ""}`}>{j.feeSub === null ? "n/p" : money(j.feeSub)}</td>
                <td className={`td text-right tabular-nums ${j.bondAmount === null ? "italic text-slate-400" : ""}`}>{j.bondAmount === null ? "n/p" : j.bondAmount === 0 ? "none" : money(j.bondAmount)}</td>
                <td className="td">
                  <Pill tone={j.expiryLabel === "Unknown" ? "amber" : j.expiryLabel.startsWith("Rolling") ? "blue" : "slate"}>{j.expiryLabel}</Pill>
                </td>
                <td className="td text-slate-700">{j.submissionChannel}</td>
                <td className="td">
                  <ConfidencePill level={j.confidence} />
                </td>
                <td className="td text-right">
                  <Link href={`${hrefBase}/${j.slug}`} className="text-sm font-medium text-slate-600 hover:underline">
                    Checklist →
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="td py-10 text-center text-slate-500">
                  No jurisdictions match those filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        n/p = not published online. {rows.length} of {total} jurisdictions shown.
      </p>
    </>
  );
}

export const EXPIRY_FILTERS = ["All", "Apr 30", "Dec 31", "Mar 31", "Rolling", "Unknown"] as const;

export function filterJurisdictions(all: Jurisdiction[], sp: Record<string, string | string[] | undefined>) {
  const q = typeof sp.q === "string" ? sp.q.toLowerCase() : "";
  const expiry = typeof sp.expiry === "string" ? sp.expiry : "All";
  const county = typeof sp.county === "string" ? sp.county : "All";
  let rows = all;
  if (q) rows = rows.filter((j) => j.name.toLowerCase().includes(q) || (j.portalVendor ?? "").toLowerCase().includes(q));
  if (expiry !== "All") rows = rows.filter((j) => (expiry === "Rolling" ? j.expiryLabel.startsWith("Rolling") : j.expiryLabel === expiry));
  if (county !== "All") rows = rows.filter((j) => j.county.includes(county));
  return { rows, q, expiry, county };
}

export function FilterBar({ base, q, expiry, county }: { base: string; q: string; expiry: string; county: string }) {
  const link = (over: Record<string, string>) => {
    const p = new URLSearchParams({ q, expiry, county, ...over });
    return `${base}?${p.toString()}`;
  };
  return (
    <div className="card mb-4 p-5">
      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="min-w-56 flex-1">
          <label className="label" htmlFor="q">
            Search
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Town or portal vendor…" className="input mt-1" />
        </div>
        <div>
          <label className="label" htmlFor="county">
            County
          </label>
          <select id="county" name="county" defaultValue={county} className="input mt-1">
            <option>All</option>
            <option>Cook</option>
            <option>Will</option>
          </select>
        </div>
        <input type="hidden" name="expiry" value={expiry} />
        <button className="btn-primary" type="submit">
          Filter
        </button>
        <Link href={base} className="btn-secondary">
          Reset
        </Link>
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        {EXPIRY_FILTERS.map((f) => (
          <Link key={f} href={link({ expiry: f })} className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${expiry === f ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50"}`}>
            {f === "All" ? "All expiry patterns" : f === "Rolling" ? "Rolling (1 yr from issue)" : f === "Unknown" ? "Term not published" : `Expires ${f}`}
          </Link>
        ))}
      </div>
    </div>
  );
}
