import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { FilterBar, JurisdictionTable, filterJurisdictions } from "@/components/jurisdiction-table";
import { listJurisdictions } from "@/lib/queries";
import { BRAND } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Contractor registration rules for Chicago's south suburbs",
  description: "Fees, bonds, insurance minimums, expiry dates and how to apply for a contractor license in every south suburban Illinois municipality.",
};

export default async function PublicRules(props: PageProps<"/rules">) {
  const sp = await props.searchParams;
  const all = await listJurisdictions();
  const { rows, q, expiry, county } = filterJurisdictions(all, sp);
  return (
    <PublicShell wide>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Contractor registration rules, town by town</h1>
      <p className="mt-2 max-w-3xl text-slate-600">
        Illinois has no statewide general-contractor license. Each of these {all.length} south-suburban jurisdictions registers contractors itself. Here is what each one charges, requires and how it accepts applications — as published — with the source linked.{" "}
        <Link href="/sign-up" className="font-medium text-slate-900 underline">
          {BRAND} tracks all of them for you.
        </Link>
      </p>
      <div className="mt-6">
        <FilterBar base="/rules" q={q} expiry={expiry} county={county} />
        <JurisdictionTable rows={rows} hrefBase="/rules" total={all.length} />
      </div>
    </PublicShell>
  );
}
