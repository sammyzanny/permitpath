import Link from "next/link";
import { Card, Notice, PageHeader } from "@/components/ui";
import { TownPicker } from "@/components/town-picker";
import { requireOrg } from "@/lib/tenancy";
import { listJurisdictions, listRegistrations } from "@/lib/queries";
import { addRegistrationsBulk } from "@/lib/actions/registrations";

export const dynamic = "force-dynamic";

export default async function AddTowns(props: PageProps<"/app/towns/add">) {
  const sp = await props.searchParams;
  const ctx = await requireOrg("/app/towns/add");
  const [towns, regs] = await Promise.all([listJurisdictions(), listRegistrations(ctx.org.id)]);
  const have = regs.map((r) => r.jurisdiction.id);
  const remaining = ctx.limits.maxTowns === null ? null : Math.max(0, ctx.limits.maxTowns - have.length);

  return (
    <>
      <PageHeader title="Add towns" subtitle="Select every municipality you pull permits in. Towns you already track are greyed out." />
      {typeof sp.error === "string" ? <Notice tone="red">{sp.error}</Notice> : null}
      {ctx.limits.readOnly ? (
        <Notice tone="red">
          Your subscription is inactive.{" "}
          <Link href="/app/settings/billing" className="underline">
            Choose a plan
          </Link>{" "}
          to add towns.
        </Notice>
      ) : remaining === 0 ? (
        <Notice tone="amber">
          You&apos;ve reached the {ctx.limits.label} plan limit of {ctx.limits.maxTowns} towns.{" "}
          <Link href="/app/settings/billing" className="underline">
            Upgrade
          </Link>{" "}
          for unlimited towns.
        </Notice>
      ) : null}
      <form action={addRegistrationsBulk}>
        <Card>
          <TownPicker towns={towns.map((t) => ({ id: t.id, name: t.name, county: t.county, feeGc: t.feeGc, expiryLabel: t.expiryLabel, confidence: t.confidence }))} disabledIds={have} max={remaining} />
        </Card>
        <div className="mt-4 flex items-center justify-end gap-3">
          <Link href="/app/towns" className="btn-secondary">
            Cancel
          </Link>
          <button className="btn-primary" type="submit" disabled={ctx.limits.readOnly || remaining === 0}>
            Add selected towns
          </button>
        </div>
      </form>
      <p className="mt-6 text-xs text-slate-500">
        Don&apos;t see a town?{" "}
        <Link href="/app/rules" className="underline">
          Browse all jurisdiction rules
        </Link>{" "}
        or email us — we add municipalities on request.
      </p>
    </>
  );
}
