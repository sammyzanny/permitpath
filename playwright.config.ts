import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: { viewport: { width: 1280, height: 800 }, launchOptions: { executablePath: "/opt/pw-browsers/chromium" } },
  reporter: [["list"]],
});
