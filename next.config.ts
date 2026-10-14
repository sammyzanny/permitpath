import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native/WASM-backed packages must be required at runtime, not bundled.
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb", // document uploads up to 15 MB + form fields
    },
  },
};

export default nextConfig;
