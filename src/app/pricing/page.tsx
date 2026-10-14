import Link from "next/link";
import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";
import { PLANS, PLAN_ORDER } from "@/lib/plans";
import { BRAND, env } from "@/lib/env";

export const metadata: Metadata = { title: "Pricing", description: `${BRAND} plans for solo contractors, crews and offices.` };

export default function Pricing() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Simple pricing</h1>
        <p className="mt-3 text-lg text-slate-600">Every plan starts with a {env.trialDays}-day free trial. No card required. Cancel any time — your data stays.</p>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {PLAN_ORDER.map((id, idx) => {
          const p = PLANS[id];
          const featured = idx === 1;
          return (
            <div key={id} className={`card flex flex-col p-6 ${featured ? "ring-2 ring-slate-900" : ""}`}>
              {featured ? <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Most popular</div> : null}
              <h2 className="text-lg font-semibold text-slate-900">{p.name}</h2>
              <p className="text-sm text-slate-600">{p.tagline}</p>
              <div className="mt-4 text-4xl font-semibold tabular-nums text-slate-900">
                ${p.priceMonthly}
                <span className="text-base font-normal text-slate-500">/month</span>
              </div>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-700">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-emerald-600">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/sign-up" className={`${featured ? "btn-primary" : "btn-secondary"} mt-6 w-full justify-center`}>
                Start free trial
              </Link>
            </div>
          );
        })}
      </div>
      <div className="mx-auto mt-14 max-w-3xl">
        <h2 className="text-xl font-semibold text-slate-900">Questions</h2>
        <dl className="mt-4 space-y-5 text-sm">
          <div>
            <dt className="font-medium text-slate-900">Where do the town rules come from?</dt>
            <dd className="mt-1 text-slate-600">Each municipality&apos;s own website, application form, or codified ordinance, with the source linked on every page. Fields a village doesn&apos;t publish are flagged so you know to call. Customers can report a change from inside the app and we re-verify.</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-900">Is this a license?</dt>
            <dd className="mt-1 text-slate-600">No. {BRAND} tracks and reminds; you still register with each village. Think of it as the office manager who never forgets a date.</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-900">My town isn&apos;t listed.</dt>
            <dd className="mt-1 text-slate-600">Email us and we&apos;ll add it — usually within a few business days.</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-900">What happens if I cancel?</dt>
            <dd className="mt-1 text-slate-600">Your account goes read-only. Nothing is deleted; subscribe again and reminders resume.</dd>
          </div>
        </dl>
      </div>
    </PublicShell>
  );
}
