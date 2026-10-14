import { PageHeader } from "@/components/ui";
import { FilterBar, JurisdictionTable, filterJurisdictions } from "@/components/jurisdiction-table";
import { requireOrg } from "@/lib/tenancy";
import { listJurisdictions, listRegistrations } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function RulesPage(props: PageProps<"/app/rules">) {
  const sp = await props.searchParams;
  const ctx = await requireOrg("/app/rules");
  const [all, regs] = await Promise.all([listJurisdictions(), listRegistrations(ctx.org.id)]);
  const mine = new Set(regs.map((r) => r.jurisdiction.id));
  const { rows, q, expiry, county } = filterJurisdictions(all, sp);
  return (
    <>
      <PageHeader
        title="Jurisdiction rules"
        subtitle="Every municipality on file, with fees, bond, insurance, term and how to submit — as published by the village. Amber-flagged fields were not published online; confirm by phone before you rely on them."
      />
      <FilterBar base="/app/rules" q={q} expiry={expiry} county={county} />
      <JurisdictionTable rows={rows} hrefBase="/app/rules" mine={mine} total={all.length} />
    </>
  );
}
