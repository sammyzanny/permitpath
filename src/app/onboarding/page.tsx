import { redirect } from "next/navigation";
import { PublicShell } from "@/components/public-shell";
import { Card, Notice } from "@/components/ui";
import { TownPicker } from "@/components/town-picker";
import { getOrgContext, requireUser } from "@/lib/tenancy";
import { listJurisdictions } from "@/lib/queries";
import { createOrganization } from "@/lib/actions/org";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

const TRADES = ["General", "Electrical", "HVAC", "Plumbing", "Roofing", "Concrete / Masonry", "Landscaping", "Other"];

export default async function Onboarding(props: PageProps<"/onboarding">) {
  const user = await requireUser("/onboarding");
  const existing = await getOrgContext();
  const sp = await props.searchParams;
  if (existing && sp.new !== "1") redirect("/app");
  const towns = await listJurisdictions();

  return (
    <PublicShell wide>
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold text-slate-900">Set up your business</h1>
        <p className="mt-1 text-sm text-slate-600">
          Signed in as {user.email}. Your {env.trialDays}-day free trial starts now — no card needed.
        </p>
        {typeof sp.error === "string" ? (
          <div className="mt-4">
            <Notice tone="red">{sp.error}</Notice>
          </div>
        ) : null}

        <form action={createOrganization} className="mt-6 space-y-6">
          <Card title="1. Your company">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="name">
                  Business name
                </label>
                <input id="name" name="name" required className="input mt-1" placeholder="Southland Electric LLC" />
              </div>
              <div>
                <label className="label" htmlFor="trade">
                  Primary trade
                </label>
                <select id="trade" name="trade" className="input mt-1" defaultValue="General">
                  {TRADES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="phone">
                  Phone
                </label>
                <input id="phone" name="phone" className="input mt-1" placeholder="(708) 555-0100" />
              </div>
            </div>
          </Card>

          <Card title="2. Which towns do you pull permits in?">
            <p className="mb-4 text-sm text-slate-600">Pick every municipality you work in. You can add or remove towns any time. Each one gets its own checklist and renewal date.</p>
            <TownPicker towns={towns.map((t) => ({ id: t.id, name: t.name, county: t.county, feeGc: t.feeGc, expiryLabel: t.expiryLabel, confidence: t.confidence }))} />
          </Card>

          <div className="flex items-center justify-end gap-3">
            <button className="btn-primary" type="submit">
              Create my account
            </button>
          </div>
        </form>
      </div>
    </PublicShell>
  );
}
