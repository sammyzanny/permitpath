import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    env: { PGLITE_MEMORY: "1", NODE_ENV: "test" },
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "test/empty.ts"),
      "react": path.resolve(__dirname, "test/react-shim.ts"),
    },
  },
});
