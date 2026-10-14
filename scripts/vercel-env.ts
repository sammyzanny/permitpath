/**
 * Pushes every variable in .env.production.local to a Vercel project in one go,
 * so you don't paste 20 values into the dashboard by hand.
 *
 *   npx vercel login && npx vercel link        (once, interactive)
 *   npm run vercel:env                          (reads .env.production.local)
 *
 * Variables are set for the Production environment. Existing values are replaced.
 */
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const file = process.argv[2] ?? ".env.production.local";
if (!fs.existsSync(file)) {
  console.error(`${file} not found. Copy .env.example to ${file} and fill it in.`);
  process.exit(1);
}
const pairs: Array<[string, string]> = [];
for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (!m || line.trim().startsWith("#")) continue;
  let v = m[2].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (v === "") continue;
  if (m[1] === "ALLOW_DEV_AUTH") continue; // never in production
  pairs.push([m[1], v]);
}
console.log(`Setting ${pairs.length} variables on Vercel (production)…`);
for (const [k, v] of pairs) {
  spawnSync("npx", ["vercel", "env", "rm", k, "production", "--yes"], { stdio: "ignore" });
  const r = spawnSync("npx", ["vercel", "env", "add", k, "production"], { input: v, encoding: "utf8" });
  console.log(`${r.status === 0 ? "✔" : "✘"} ${k}${r.status === 0 ? "" : ": " + (r.stderr || r.stdout).trim().split("\n").pop()}`);
}
console.log("\nDone. Trigger a redeploy for the new values to take effect: npx vercel --prod");
