import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { BRAND, SUPPORT_EMAIL, env } from "@/lib/env";
import { LEGAL } from "@/lib/legal";
import { PLANS } from "@/lib/plans";

export const metadata: Metadata = { title: "Terms of Service", description: `The agreement that governs use of ${BRAND}.` };

function H2({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="mt-8 text-lg font-semibold text-slate-900">
      {n}. {children}
    </h2>
  );
}

export default function Terms() {
  return (
    <PublicShell>
      <article className="mx-auto max-w-3xl text-[15px] leading-relaxed text-slate-700">
        <h1 className="text-3xl font-semibold text-slate-900">Terms of Service</h1>
        <p className="mt-2 text-sm text-slate-500">Effective {LEGAL.effective}</p>

        <p className="mt-6">
          These Terms of Service (the &ldquo;Terms&rdquo;) are an agreement between you and {LEGAL.entity}, located in {LEGAL.address} (&ldquo;{LEGAL.shortEntity}&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). They govern your use of the {BRAND} website and application at{" "}
          <Link href="/" className="underline">towncert.com</Link> (the &ldquo;Service&rdquo;). By creating an account or using the Service you agree to these Terms and to our{" "}
          <Link href="/legal/privacy" className="underline">Privacy Policy</Link>. If you are using the Service on behalf of a company, you represent that you have authority to bind that company, and &ldquo;you&rdquo; means the company.
        </p>

        <H2 n={1}>What the Service is — and is not</H2>
        <p className="mt-2">
          {BRAND} is a software tool that organizes publicly available information about municipal contractor-registration requirements, computes renewal dates from the information you enter, stores the documents you upload, and sends reminders. {BRAND} is <strong>not</strong> a government agency, is not affiliated with any municipality, does not register or license you with any municipality, does not file or submit anything on your behalf, and does not provide legal, tax or compliance advice. You remain solely responsible for registering with each municipality, paying its fees, and meeting its deadlines.
        </p>

        <H2 n={2}>Accuracy of municipal information</H2>
        <p className="mt-2">
          Municipal fees, forms, bond and insurance requirements, expiration rules and submission methods change without notice. We compile them from official municipal sources, cite the source on each town page, re-verify on a schedule, and clearly mark fields a municipality does not publish. Even so, <strong>the information may be incomplete, outdated or wrong, and the dates we compute depend on the dates you enter.</strong> Before relying on any requirement or deadline, confirm it directly with the municipality. Reminders are a convenience and may be delayed or fail to arrive because of email filtering, outages or errors. We are not responsible for lapsed registrations, rejected permits, penalties, lost work or any other loss arising from inaccurate information, incorrect entries, or missed, late or undelivered reminders.
        </p>

        <H2 n={3}>Accounts, companies and teams</H2>
        <p className="mt-2">
          You must be at least 18 and able to form a binding contract. You are responsible for the accuracy of your account information, for keeping your sign-in credentials secure, and for all activity under your account, including by teammates you invite. Company owners and admins can add, remove and change the roles of team members; the owner of a company account is responsible for its use and its bill.
        </p>

        <H2 n={4}>Free trial</H2>
        <p className="mt-2">
          New companies receive a {env.trialDays}-day free trial with full access and no payment card required. Nothing is charged unless you choose a plan. When the trial ends without a plan, the account becomes read-only: you can view everything, but cannot add or change registrations, and reminders stop until you subscribe. Your data is kept as described in Section 7.
        </p>

        <H2 n={5}>Plans, billing and price changes</H2>
        <p className="mt-2">
          Paid plans ({Object.values(PLANS).map((p) => `${p.name} $${p.priceMonthly}`).join(", ")} per month, plus any applicable taxes) are billed monthly in advance through Stripe, our payment processor. By subscribing you authorize recurring charges to your payment method until you cancel. If you subscribe while a trial is still running, the remaining trial days are honored and your first charge is made when they end. Promotional pricing, including founding-customer pricing, applies for as long as the subscription it was applied to remains continuously active; if you cancel and later resubscribe, current pricing applies. We may change prices with at least {LEGAL.priceChangeNoticeDays} days&rsquo; notice by email; continuing to use the Service after a price change takes effect constitutes acceptance. If a payment fails we will notify you and retry; if it continues to fail your account becomes read-only until a payment method is updated.
        </p>

        <H2 n={6}>Cancellation and refunds</H2>
        <p className="mt-2">
          You can cancel at any time from the billing page in the app or through the Stripe customer portal. Cancellation takes effect at the end of the current paid month: you keep full access until then, you are not charged again, and the account then becomes read-only. <strong>Payments are non-refundable and we do not prorate partial months</strong>, except where required by law or where we choose to issue a refund at our discretion (for example, a duplicate charge). The free trial is free; no refund is needed because nothing is charged.
        </p>

        <H2 n={7}>Your data</H2>
        <p className="mt-2">
          You own the registrations, dates, notes, company details and documents you store in the Service (&ldquo;Customer Data&rdquo;). You grant us a limited license to host, process, display and transmit Customer Data solely to provide and support the Service. We keep Customer Data while your account is active and for {LEGAL.retentionAfterCancelMonths} months after cancellation so you can resubscribe and pick up where you left off, after which it is deleted. You may export your data at any time from the app, or ask us to delete it sooner by emailing {SUPPORT_EMAIL}; we complete deletion within {LEGAL.deletionRequestDays} days. Our{" "}
          <Link href="/legal/privacy" className="underline">Privacy Policy</Link> explains what we collect and how we handle it.
        </p>

        <H2 n={8}>Acceptable use</H2>
        <p className="mt-2">
          You agree not to: access or attempt to access another customer&rsquo;s data; scrape, copy, resell or redistribute the municipal rules database or substantial parts of it; use the Service to send unsolicited messages; upload content you do not have the right to store; interfere with the Service&rsquo;s operation or security; or use the Service in violation of law. We may suspend or terminate accounts that violate these Terms.
        </p>

        <H2 n={9}>Our intellectual property</H2>
        <p className="mt-2">
          The Service, including its software, design, the compiled rules database and the {BRAND} name and mark, is owned by {LEGAL.shortEntity} and protected by law. Municipal requirements themselves are public information; our selection, organization, verification notes and presentation of them are ours. These Terms grant you a non-exclusive, non-transferable right to use the Service for your own business during your subscription and nothing more.
        </p>

        <H2 n={10}>Third-party services</H2>
        <p className="mt-2">
          The Service depends on third-party providers for hosting, database, authentication, payments, email delivery and file storage (listed in the Privacy Policy). Payments are handled by Stripe under its own terms; we never see your full card number. We are not responsible for outages or failures of third-party providers, though we will work to restore service promptly.
        </p>

        <H2 n={11}>Disclaimer of warranties</H2>
        <p className="mt-2 uppercase text-[13px] leading-relaxed">
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; To the fullest extent permitted by law, we disclaim all warranties, express or implied, including merchantability, fitness for a particular purpose, non-infringement, and any warranty that the information in the Service is accurate, complete or current, or that the Service will be uninterrupted or error-free.
        </p>

        <H2 n={12}>Limitation of liability</H2>
        <p className="mt-2 uppercase text-[13px] leading-relaxed">
          To the fullest extent permitted by law, {LEGAL.shortEntity} will not be liable for any indirect, incidental, special, consequential or punitive damages, or for lost profits, lost revenue, lost business, penalties, fines, or the cost of registrations or permits, arising out of or related to the Service or these Terms, even if advised of the possibility. Our total liability for all claims arising out of or related to the Service will not exceed the amount you paid us in the twelve (12) months before the event giving rise to the claim, or one hundred dollars ($100) if you have paid nothing. Some jurisdictions do not allow certain limitations; in those jurisdictions our liability is limited to the fullest extent permitted.
        </p>

        <H2 n={13}>Indemnity</H2>
        <p className="mt-2">
          You will defend and hold {LEGAL.shortEntity} harmless from claims and costs (including reasonable attorneys&rsquo; fees) arising from your Customer Data, your use of the Service in violation of these Terms or the law, or your dealings with any municipality.
        </p>

        <H2 n={14}>Termination</H2>
        <p className="mt-2">
          You may stop using the Service and cancel at any time. We may suspend or terminate your access if you materially breach these Terms, if required by law, or if we discontinue the Service, in which case we will give at least 30 days&rsquo; notice where practical and you will be able to export your data. Sections 2, 7, 9 and 11–16 survive termination.
        </p>

        <H2 n={15}>Changes to these Terms</H2>
        <p className="mt-2">
          We may update these Terms from time to time. For material changes we will notify you by email or in the app at least 14 days before they take effect. The &ldquo;Effective&rdquo; date above always shows the current version. Continued use after the effective date constitutes acceptance.
        </p>

        <H2 n={16}>Governing law and disputes</H2>
        <p className="mt-2">
          These Terms are governed by the laws of {LEGAL.governingLaw}, without regard to conflict-of-law rules. Any dispute will be brought exclusively in {LEGAL.venue}, and you consent to their jurisdiction. Before filing a claim, you agree to contact us at {SUPPORT_EMAIL} and allow 30 days to try to resolve it informally. If any provision of these Terms is unenforceable, the rest remain in effect. These Terms and the Privacy Policy are the entire agreement between you and us about the Service.
        </p>

        <H2 n={17}>Contact</H2>
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
