import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { BRAND, SUPPORT_EMAIL } from "@/lib/env";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Privacy Policy", description: `What ${BRAND} collects, why, who it is shared with, and how to delete it.` };

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 text-lg font-semibold text-slate-900">{children}</h2>;
}

export default function Privacy() {
  return (
    <PublicShell>
      <article className="mx-auto max-w-3xl text-[15px] leading-relaxed text-slate-700">
        <h1 className="text-3xl font-semibold text-slate-900">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-500">Effective {LEGAL.effective}</p>

        <p className="mt-6">
          This policy explains what {BRAND} collects, why, who we share it with, and the choices you have. {BRAND} is operated by {LEGAL.entity}, {LEGAL.address} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). It applies to towncert.com and the {BRAND} application. Our{" "}
          <Link href="/legal/terms" className="underline">Terms of Service</Link> govern your use of the Service.
        </p>
        <p className="mt-3">
          The short version: we collect what we need to run a registration tracker for your business, we don&rsquo;t sell it or use it for advertising, and you can export or delete it whenever you like.
        </p>

        <H2>What we collect</H2>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li><strong>Account information.</strong> Your name and email address, received from our sign-in provider (Clerk) when you create an account or sign in. If you sign in with Google, we receive the name and email on that Google account; we do not receive your Google password.</li>
          <li><strong>Company information.</strong> The company name, trade and towns you tell us about, and the teammates you invite (their email addresses).</li>
          <li><strong>Registration and document data.</strong> The registrations, dates, license numbers, notes and reminder settings you enter, and the files you upload to the document vault (for example certificates of insurance and bond documents). These may contain information about your business and, where you include it, about individuals such as a company officer.</li>
          <li><strong>Billing information.</strong> Your plan, subscription status and invoice history. Payment card details are collected and stored by Stripe, not by us; we see only the card brand and last four digits.</li>
          <li><strong>Usage and technical data.</strong> Server logs (IP address, browser type, pages requested, timestamps), an activity log of changes made inside your company account (who changed what, for your own audit trail), and delivery status of the emails we send. If we use web analytics, it is aggregate and cookieless.</li>
          <li><strong>Correspondence.</strong> Emails you send us, including rule-change reports submitted through the app.</li>
        </ul>
        <p className="mt-3">We do not knowingly collect information from anyone under 18; the Service is for businesses.</p>

        <H2>How we use it</H2>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>To provide the Service: computing renewal dates, storing documents, letting your team collaborate, and sending the reminders and notifications you have turned on.</li>
          <li>To bill you and manage your subscription.</li>
          <li>To send transactional email: welcome and invitation messages, reminders, payment notices, and responses to your requests. We do not send marketing email without your consent, and any such email includes an unsubscribe link.</li>
          <li>To keep the Service secure, prevent abuse, debug problems and understand how it is used in aggregate.</li>
          <li>To improve the municipal rules database, using your rule-change reports (never your private registration data).</li>
          <li>To comply with law and enforce our Terms.</li>
        </ul>
        <p className="mt-3">We do not sell personal information, share it with data brokers, or use it for third-party advertising.</p>

        <H2>Cookies</H2>
        <p className="mt-2">
          We use only cookies that are necessary for the Service to work: a session cookie from our sign-in provider so you stay signed in, and a cookie remembering which company you are viewing. We do not use advertising or cross-site tracking cookies.
        </p>

        <H2>Who we share it with</H2>
        <p className="mt-2">We share data only with the service providers below, each of which processes it on our instructions to run the Service, and with no one else except as required by law or to protect the Service and its users.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-4 font-medium">Provider</th>
                <th className="py-2 pr-4 font-medium">Purpose</th>
                <th className="py-2 font-medium">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {LEGAL.subprocessors.map((s) => (
                <tr key={s.name}>
                  <td className="py-2 pr-4 font-medium text-slate-900">{s.name}</td>
                  <td className="py-2 pr-4">{s.purpose}</td>
                  <td className="py-2">{s.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3">
          Uploaded documents are stored encrypted and served only through short-lived signed links to signed-in members of your company. We may disclose information if required by law, subpoena or court order, or to prevent fraud or harm, and we will tell you when we are allowed to. If {BRAND} is ever acquired or merged, your data would transfer to the new owner under this policy, and you would be notified.
        </p>

        <H2>How long we keep it</H2>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li><strong>While your account is active:</strong> everything you have stored.</li>
          <li><strong>After you cancel or your trial ends:</strong> your account becomes read-only and your data is kept for {LEGAL.retentionAfterCancelMonths} months so you can resubscribe without starting over. After that it is deleted.</li>
          <li><strong>On request:</strong> email {SUPPORT_EMAIL} and we delete your company&rsquo;s data within {LEGAL.deletionRequestDays} days, except billing records we must keep for tax and accounting purposes.</li>
          <li><strong>Server logs</strong> are kept for about 30 days. Encrypted database backups age out within a few weeks of deletion.</li>
        </ul>

        <H2>Security</H2>
        <p className="mt-2">
          Data is encrypted in transit (TLS) and at rest with our providers. Access to your data inside the Service is limited to members of your company, and access to production systems is limited to the operator. No system is perfectly secure; if we learn of a breach affecting your personal information we will notify you as required by law, including the Illinois Personal Information Protection Act.
        </p>

        <H2>Your choices and rights</H2>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li><strong>Access and export:</strong> everything you have entered is visible in the app, and registrations can be exported from the calendar as an .ics file; email us for a full export.</li>
          <li><strong>Correction:</strong> edit your account and company details in the app at any time.</li>
          <li><strong>Deletion:</strong> email {SUPPORT_EMAIL}.</li>
          <li><strong>Email preferences:</strong> reminder notifications can be turned on or off per teammate in the app. Transactional messages about your account and billing are sent regardless while you have an account.</li>
          <li>Depending on where you live you may have additional rights under state or national privacy laws, such as the right to know, correct or delete personal information, or to opt out of its sale (we do not sell it). To exercise any right, email {SUPPORT_EMAIL}; we will respond within 45 days and will not discriminate against you for exercising it.</li>
        </ul>

        <H2>Changes to this policy</H2>
        <p className="mt-2">
          We may update this policy as the Service changes. For material changes we will email account owners or post a notice in the app before the change takes effect. The effective date above shows the current version.
        </p>

        <H2>Contact</H2>
        <p className="mt-2">
          {LEGAL.entity}
          <br />
          {LEGAL.address}
          <br />
          {SUPPORT_EMAIL}
        </p>
      </article>
    </PublicShell>
  );
}
