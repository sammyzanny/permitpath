import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: ["/", "/rules", "/pricing"], disallow: ["/app", "/admin", "/api", "/onboarding", "/invite", "/dev-login"] }], sitemap: `${APP_URL}/sitemap.xml` };
}
