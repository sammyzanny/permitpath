import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, HealthBadge, Notice, PageHeader } from "@/components/ui";
import { JurisdictionView } from "@/components/jurisdiction-view";
import { requireOrg } from "@/lib/tenancy";
import { getJurisdictionBySlug, getRegistrationForJurisdiction } from "@/lib/queries";
import { addRegistration } from "@/lib/actions/registrations";
import { submitRuleReport } from "@/lib/actions/admin";
import { daysUntil, formatDate, health } from "@/lib/expiry";

export const dynamic = "force-dynamic";

export default async function RuleDetail(props: PageProps<"/app/rules/[slug]">) {
  const { slug } = await props.params;
  const sp = await props.searchParams;
  const ctx = await requireOrg(`/app/rules/${slug}`);
  const j = await getJurisdictionBySlug(slug);
  if (!j || !j.published) notFound();
  const reg = await getRegistrationForJurisdiction(ctx.org.id, j.id);

  return (
    <>
      <div className="mb-2 text-sm text-slate-500">
        <Link href="/app/rules" className="hover:underline">
          Jurisdiction rules
        </Link>{" "}
        / {j.name}
      </div>
      <PageHeader
        title={j.name}
        actions={
          reg ? (
            <Link href={`/app/towns/${reg.id}`} className="btn-secondary">
              View my registration →
            </Link>
          ) : (
            <form action={addRegistration}>
              <input type="hidden" name="jurisdictionId" value={j.id} />
              <input type="hidden" name="back" value={`/app/rules/${j.slug}`} />
              <button className="btn-primary" type="submit" disabled={ctx.limits.readOnly}>
                + I work here — track it
              </button>
            </form>
          )
        }
      />
      {typeof sp.error === "string" ? <Notice tone="red">{sp.error}</Notice> : null}
      {sp.reported ? <Notice>Thanks — we&apos;ll verify with the village and update the rule. You&apos;ll see the change reflected here.</Notice> : null}
      {reg ? (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <span>
            Your registration: <strong className="capitalize">{reg.status}</strong>
            {reg.expiresOn ? <> · expires {formatDate(reg.expiresOn)}</> : null}
          </span>
          {reg.expiresOn ? <HealthBadge health={health(reg.expiresOn)} daysLeft={daysUntil(reg.expiresOn)} /> : null}
        </div>
      ) : null}

      <JurisdictionView
        j={j}
        aside={
          <Card title="Something wrong?">
            <p className="mb-3 text-xs text-slate-600">Villages change fees and forms without notice. Tell us and we&apos;ll re-verify.</p>
            <form action={submitRuleReport} className="space-y-2">
              <input type="hidden" name="jurisdictionId" value={j.id} />
              <input type="hidden" name="slug" value={j.slug} />
              <select name="field" className="input text-xs" defaultValue="">
                <option value="">Which part?</option>
                <option>Fee</option>
                <option>Bond</option>
                <option>Insurance</option>
                <option>Term / expiry</option>
                <option>Submission method</option>
                <option>Contact info</option>
                <option>Other</option>
              </select>
              <textarea name="message" rows={3} className="input text-xs" placeholder="e.g. Village Hall told me the GC fee is now $175 and they take email." required />
              <button className="btn-secondary w-full justify-center text-xs" type="submit">
                Report a problem
              </button>
            </form>
          </Card>
        }
      />
    </>
  );
}
