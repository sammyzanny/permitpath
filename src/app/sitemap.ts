import type { MetadataRoute } from "next";
import { listJurisdictions } from "@/lib/queries";
import { APP_URL } from "@/lib/env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const towns = await listJurisdictions();
  return [
    { url: APP_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${APP_URL}/pricing`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${APP_URL}/rules`, changeFrequency: "weekly", priority: 0.9 },
    ...towns.map((t) => ({ url: `${APP_URL}/rules/${t.slug}`, lastModified: t.updatedAt, changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
