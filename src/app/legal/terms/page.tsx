import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";
import { BRAND, SUPPORT_EMAIL } from "@/lib/env";

export const metadata: Metadata = { title: "Terms of Service" };

export default function Terms() {
  return (
    <PublicShell>
      <article className="prose-sm mx-auto max-w-3xl text-slate-700">
        <h1 className="text-3xl font-semibold text-slate-900">Terms of Service</h1>
        <p className="mt-2 text-xs text-slate-500">Template — have a lawyer review before launch. Last updated {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.</p>
        <h2 className="mt-8 text-lg font-semibold text-slate-900">1. The service</h2>
        <p className="mt-2">{BRAND} is a software tool that organizes publicly available municipal contractor-registration information and sends reminders based on dates you enter. It is not a government agency, does not file anything on your behalf, and does not constitute legal advice.</p>
        <h2 className="mt-6 text-lg font-semibold text-slate-900">2. Accuracy of information</h2>
        <p className="mt-2">Municipal fees, forms, bond amounts, insurance requirements and deadlines change without notice. We compile them from official sources and re-verify on a schedule, and we mark fields that are not published online. You are responsible for confirming requirements with each municipality before relying on them, and for the accuracy of the dates you enter. We are not liable for lapsed registrations, penalties, lost work or other losses arising from inaccurate information or missed reminders.</p>
        <h2 className="mt-6 text-lg font-semibold text-slate-900">3. Accounts and teams</h2>
        <p className="mt-2">You are responsible for activity under your account and for people you invite. Owners and admins may add, remove and change the roles of team members.</p>
        <h2 className="mt-6 text-lg font-semibold text-slate-900">4. Billing</h2>
        <p className="mt-2">Plans are billed monthly in advance through Stripe. Trials convert only when you choose a plan. You may cancel at any time; access continues to the end of the paid period, after which the account becomes read-only. Fees are non-refundable except where required by law.</p>
        <h2 className="mt-6 text-lg font-semibold text-slate-900">5. Your data</h2>
        <p className="mt-2">You own the registrations, documents and notes you store. We use them only to provide the service. You may export or delete your data by contacting {SUPPORT_EMAIL}.</p>
        <h2 className="mt-6 text-lg font-semibold text-slate-900">6. Acceptable use</h2>
        <p className="mt-2">Do not misuse the service, attempt to access other customers&apos; data, or resell the rules database.</p>
        <h2 className="mt-6 text-lg font-semibold text-slate-900">7. Changes</h2>
        <p className="mt-2">We may update these terms; material changes will be announced in the app or by email.</p>
        <p className="mt-8 text-sm">Questions: {SUPPORT_EMAIL}</p>
      </article>
    </PublicShell>
  );
}
