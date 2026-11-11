import { ImageResponse } from "next/og";
import { OgCard, OG_SIZE } from "@/components/og-card";
import { getJurisdictionBySlug } from "@/lib/queries";
import { money } from "@/lib/expiry";

export const alt = "Contractor registration requirements";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const j = await getJurisdictionBySlug(slug);
  if (!j || !j.published) {
    return new ImageResponse(<OgCard eyebrow="Contractor registration tracker" title="Town not found" subtitle="Browse every south-suburban jurisdiction at towncert.com/rules." footer="Chicago's south suburbs" />, { ...size });
  }
  const chips = [
    j.feeGc !== null ? `Fee ${money(j.feeGc)}` : "Fee not published",
    j.bondAmount ? `Bond ${money(j.bondAmount)}` : j.bondAmount === 0 ? "No bond" : "Bond not published",
    `Expires ${j.expiryLabel}`,
  ];
  return new ImageResponse(
    (
      <OgCard
        eyebrow={`${j.county} County, Illinois`}
        title={`${j.name} contractor registration`}
        subtitle={`What ${j.name} requires to register a contractor, how to submit, and when it expires — compiled from the village's own sources.`}
        chips={chips}
        footer={`Verified rules · ${j.submissionChannel}`}
      />
    ),
    { ...size }
  );
}
