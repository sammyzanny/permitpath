import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";
import { BRAND, SUPPORT_EMAIL } from "@/lib/env";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function Privacy() {
  return (
    <PublicShell>
      <article className="mx-auto max-w-3xl text-slate-700">
        <h1 className="text-3xl font-semibold text-slate-900">Privacy Policy</h1>
        <p className="mt-2 text-xs text-slate-500">Template — have a lawyer review before launch.</p>
        <h2 className="mt-8 text-lg font-semibold text-slate-900">What we collect</h2>
        <p className="mt-2">Account details (name, email) from our sign-in provider; your company profile; the registrations, dates, notes and documents you enter; billing details held by Stripe (we never see full card numbers); and standard server logs.</p>
        <h2 className="mt-6 text-lg font-semibold text-slate-900">How we use it</h2>
        <p className="mt-2">To run {BRAND}: computing deadlines, sending the reminders you configured, letting your teammates collaborate, and billing. We do not sell personal information or share it with advertisers.</p>
        <h2 className="mt-6 text-lg font-semibold text-slate-900">Who we share it with</h2>
        <p className="mt-2">Service providers that host the app, database, files and email delivery, and Stripe for payments — each bound to process data only on our instructions. Uploaded documents are stored privately and served only to members of your company.</p>
        <h2 className="mt-6 text-lg font-semibold text-slate-900">Retention and deletion</h2>
        <p className="mt-2">Data is kept while your account exists. Email {SUPPORT_EMAIL} to export or delete it; we complete deletion within 30 days.</p>
        <h2 className="mt-6 text-lg font-semibold text-slate-900">Contact</h2>
        <p className="mt-2">{SUPPORT_EMAIL}</p>
      </article>
    </PublicShell>
  );
}
