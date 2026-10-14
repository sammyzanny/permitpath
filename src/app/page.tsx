import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { listJurisdictions } from "@/lib/queries";
import { BRAND, env } from "@/lib/env";
import { PLANS } from "@/lib/plans";
import { money } from "@/lib/expiry";

export const dynamic = "force-dynamic";

export default async function Landing() {
  const towns = await listJurisdictions();
  const withFee = towns.filter((t) => t.feeGc !== null);
  const feeTotal = withFee.reduce((s, t) => s + (t.feeGc ?? 0), 0);
  const patterns = new Set(towns.map((t) => (t.expiryLabel.startsWith("Rolling") ? "Rolling" : t.expiryLabel))).size;
  const bonds = towns.filter((t) => (t.bondAmount ?? 0) > 0).length;
  const sample = towns.filter((t) => ["steger", "tinley-park", "park-forest", "orland-park", "chicago-heights", "oak-forest"].includes(t.slug));

  return (
    <PublicShell>
      <section className="grid items-center gap-10 py-6 lg:grid-cols-2">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">For contractors working Chicago&apos;s south suburbs</p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Every village. Every renewal. One calendar.</h1>
          <p className="mt-5 max-w-xl text-lg text-slate-600">
            Illinois has no statewide contractor license, so every town you pull permits in runs its own registration with its own fee, bond, insurance minimum, expiry date and way of submitting. {BRAND} knows them all, computes each renewal from that town&apos;s rule, and reminds you before a
            village stops issuing your permits.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/sign-up" className="btn-primary px-5 py-3 text-base">
              Start your {env.trialDays}-day free trial
            </Link>
            <Link href="/rules" className="btn-secondary px-5 py-3 text-base">
              Browse the town rules
            </Link>
          </div>
          <p className="mt-3 text-xs text-slate-500">No card required. Plans from ${PLANS.solo.priceMonthly}/month.</p>
        </div>
        <div className="card p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">What the south suburbs actually look like</div>
          <dl className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-slate-600">Jurisdictions on file</dt>
              <dd className="text-3xl font-semibold tabular-nums text-slate-900">{towns.length}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-600">Different expiry patterns</dt>
              <dd className="text-3xl font-semibold tabular-nums text-slate-900">{patterns}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-600">Towns wanting their own bond</dt>
              <dd className="text-3xl font-semibold tabular-nums text-slate-900">{bonds}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-600">Fees if you register everywhere</dt>
              <dd className="text-3xl font-semibold tabular-nums text-slate-900">{money(feeTotal)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-slate-500">Compiled from each municipality&apos;s website, application form or ordinance, and re-verified on a schedule.</p>
        </div>
      </section>

      <section className="py-12">
        <h2 className="text-2xl font-semibold text-slate-900">Same job, six different rulebooks</h2>
        <p className="mt-2 max-w-2xl text-slate-600">A sample of what changes from one village line to the next. Click any town for the full checklist.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sample.map((t) => (
            <Link key={t.id} href={`/rules/${t.slug}`} className="card p-5 transition-shadow hover:shadow-md">
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold text-slate-900">{t.name}</h3>
                <span className="text-sm tabular-nums text-slate-600">{t.feeGc === null ? "fee n/p" : money(t.feeGc)}</span>
              </div>
              <dl className="mt-3 space-y-1 text-sm text-slate-600">
                <div className="flex justify-between">
                  <dt>Expires</dt>
                  <dd className="font-medium text-slate-800">{t.expiryLabel}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Bond</dt>
                  <dd className="font-medium text-slate-800">{t.bondAmount === null ? "n/p" : t.bondAmount === 0 ? "none" : money(t.bondAmount)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Submit</dt>
                  <dd className="text-right font-medium text-slate-800">{t.submissionChannel}</dd>
                </div>
              </dl>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 py-12 md:grid-cols-3">
        {[
          { t: "Pick your towns", d: "Choose the municipalities you work in. Each gets a checklist: fee, bond and who it names, insurance minimums, credentials, forms, and exactly how the village accepts applications." },
          { t: "Enter your issue dates", d: "We compute each expiry from that town's real rule — fixed year (May 1–Apr 30), calendar year, or rolling one year from your certificate — so nothing is guessed." },
          { t: "Get reminded, on time", d: "60, 30 and 14 days out, and on the day, to everyone on your team. Plus alerts when a COI or bond lapses right before a renewal, because villages reject those." },
        ].map((s, i) => (
          <div key={i} className="card p-6">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-sm font-semibold text-white">{i + 1}</div>
            <h3 className="mt-3 font-semibold text-slate-900">{s.t}</h3>
            <p className="mt-1 text-sm text-slate-600">{s.d}</p>
          </div>
        ))}
      </section>

      <section className="card my-6 flex flex-wrap items-center justify-between gap-6 bg-slate-900 p-8 text-white">
        <div>
          <h2 className="text-2xl font-semibold">One missed renewal costs more than a year of {BRAND}.</h2>
          <p className="mt-1 text-slate-300">A lapsed registration means no permits in that town until it&apos;s fixed — and some villages charge late fees or penalties on top.</p>
        </div>
        <Link href="/sign-up" className="btn bg-white px-5 py-3 text-base text-slate-900 hover:bg-slate-100">
          Start free trial
        </Link>
      </section>
    </PublicShell>
  );
}
