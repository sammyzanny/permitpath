import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/public-shell";
import { JurisdictionView } from "@/components/jurisdiction-view";
import { Card } from "@/components/ui";
import { getJurisdictionBySlug, listJurisdictions } from "@/lib/queries";
import { BRAND, APP_URL, env } from "@/lib/env";
import { money } from "@/lib/expiry";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/rules/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const j = await getJurisdictionBySlug(slug);
  if (!j || !j.published) return { title: "Not found" };
  const desc = `${j.name}, IL contractor license: ${j.feeGc !== null ? money(j.feeGc) + " fee" : "fee not published"}, ${j.bondAmount ? money(j.bondAmount) + " bond" : j.bondAmount === 0 ? "no bond" : "bond not published"}, expires ${j.expiryLabel}. Requirements, insurance minimums, forms and how to apply.`;
  return {
    title: `${j.name} contractor license & registration requirements (${new Date().getFullYear()})`,
    description: desc,
    alternates: { canonical: `${APP_URL}/rules/${j.slug}` },
    openGraph: { title: `${j.name} contractor registration — fees, bond, expiry`, description: desc },
  };
}

export default async function PublicRule(props: PageProps<"/rules/[slug]">) {
  const { slug } = await props.params;
  const j = await getJurisdictionBySlug(slug);
  if (!j || !j.published) notFound();
  const others = (await listJurisdictions()).filter((x) => x.id !== j.id && x.county === j.county).slice(0, 8);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "GovernmentService",
    name: `${j.name} contractor registration`,
    serviceType: "Contractor license / registration",
    areaServed: { "@type": "City", name: j.name, containedInPlace: { "@type": "AdministrativeArea", name: `${j.county} County, Illinois` } },
    provider: { "@type": "GovernmentOrganization", name: j.department ?? `${j.name} Building Department`, telephone: j.phone ?? undefined, address: j.address ?? undefined },
    url: j.applicationUrl ?? undefined,
    offers: j.feeGc !== null ? { "@type": "Offer", price: j.feeGc, priceCurrency: "USD", description: "General contractor registration fee" } : undefined,
  };

  return (
    <PublicShell wide>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mb-2 text-sm text-slate-500">
        <Link href="/rules" className="hover:underline">
          Town rules
        </Link>{" "}
        / {j.name}
      </div>
      <h1 className="mb-1 text-3xl font-semibold tracking-tight text-slate-900">{j.name} contractor license &amp; registration requirements</h1>
      <p className="mb-4 max-w-3xl text-slate-600">
        What a contractor needs to register with {j.name}, Illinois — fee, bond, insurance, credentials, term and how to submit — compiled from the village&apos;s own published sources.
      </p>
      <JurisdictionView
        j={j}
        aside={
          <Card title={`Track ${j.name} automatically`} className="bg-slate-900 text-white">
            <p className="text-sm text-slate-200">
              {BRAND} computes your {j.name} renewal from the town&apos;s rule, keeps your bond and COI on file, and reminds you 60/30/14 days out — for every town you work in.
            </p>
            <Link href="/sign-up" className="btn mt-4 w-full justify-center bg-white text-slate-900 hover:bg-slate-100">
              Start {env.trialDays}-day free trial
            </Link>
          </Card>
        }
      />
      {others.length ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900">Other {j.county} County jurisdictions</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {others.map((o) => (
              <li key={o.id}>
                <Link href={`/rules/${o.slug}`} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-50">
                  {o.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </PublicShell>
  );
}
