import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/env";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND,
    short_name: BRAND,
    description: "Municipal contractor registration tracking for Chicago's south suburbs.",
    start_url: "/app",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
