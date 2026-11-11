import { ImageResponse } from "next/og";
import { OgCard, OG_SIZE } from "@/components/og-card";
import { listJurisdictions } from "@/lib/queries";

export const alt = "TownCert — contractor registration tracker for Chicago's south suburbs";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  let towns = 0;
  try {
    towns = (await listJurisdictions()).length;
  } catch {
    // Render without the count rather than failing the preview.
  }
  return new ImageResponse(
    (
      <OgCard
        eyebrow="Contractor registration tracker · Chicago's south suburbs"
        title="Never lose a permit day to a lapsed registration."
        subtitle="Every village's fees, bonds, insurance minimums and expiry rules, on one calendar with reminders for the whole crew."
        chips={[towns ? `${towns} towns` : "South suburbs", "60 / 30 / 14-day reminders", "Free 30-day trial"]}
        footer="Live and taking customers"
      />
    ),
    { ...size }
  );
}
