/**
 * Verifies every production integration with a real round-trip, so you know a
 * key works before you deploy. Reads .env.production.local (or whatever file
 * you pass) plus the process environment.
 *
 *   npm run check:env                      # uses .env.production.local if present
 *   npm run check:env -- .env.staging
 *
 * Nothing is written anywhere except a Resend test email to ADMIN_EMAILS[0]
 * when --send-test-email is passed.
 */

import { loadEnvFile } from "./load-env";
const file = process.argv.find((a) => a.startsWith(".env")) ?? ".env.production.local";
const loaded = loadEnvFile(file);
console.log(loaded ? `Loaded ${loaded}\n` : `(no ${file} found — checking process environment only)\n`);

type Result = { name: string; status: "ok" | "skip" | "fail"; detail: string };
const results: Result[] = [];
const ok = (name: string, detail: string) => results.push({ name, status: "ok", detail });
const skip = (name: string, detail: string) => results.push({ name, status: "skip", detail });
const fail = (name: string, detail: string) => results.push({ name, status: "fail", detail });

async function checkCore() {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) fail("NEXT_PUBLIC_APP_URL", "missing — emails and Stripe redirects need the public URL");
  else if (!/^https:\/\//.test(url)) fail("NEXT_PUBLIC_APP_URL", `${url} — must be https in production`);
  else ok("NEXT_PUBLIC_APP_URL", url);
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (admins.length) ok("ADMIN_EMAILS", admins.join(", "));
  else fail("ADMIN_EMAILS", "missing — nobody will be able to open /admin");
  if ((process.env.CRON_SECRET ?? "").length >= 24) ok("CRON_SECRET", "set");
  else fail("CRON_SECRET", "missing or shorter than 24 chars — run npm run gen:secrets");
  if (process.env.ALLOW_DEV_AUTH === "1") fail("ALLOW_DEV_AUTH", "is 1 — this enables passwordless dev login in production. Remove it.");
  else ok("ALLOW_DEV_AUTH", "not set (good)");
}

async function checkDb() {
  const url = process.env.DATABASE_URL;
  if (!url) return fail("Database", "DATABASE_URL missing — app would fall back to embedded PGlite, which does not persist on Vercel");
  try {
    const postgres = (await import("postgres")).default;
    const sql = postgres(url, { max: 1, connect_timeout: 10, prepare: false });
    const [v] = await sql`select version() as v`;
    const tables = await sql`select count(*)::int as n from information_schema.tables where table_schema='public' and table_name='jurisdictions'`;
    await sql.end();
    ok("Database", `${String(v.v).split(",")[0]} · jurisdictions table ${tables[0].n ? "present" : "NOT yet migrated (deploy:build will do it)"}`);
  } catch (e) {
    fail("Database", `cannot connect: ${(e as Error).message}`);
  }
}

async function checkClerk() {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const sk = process.env.CLERK_SECRET_KEY;
  if (!pk || !sk) return fail("Clerk", "keys missing — production would have NO login at all (dev login is disabled in prod)");
  try {
    const res = await fetch("https://api.clerk.com/v1/users?limit=1", { headers: { Authorization: `Bearer ${sk}` } });
    if (!res.ok) return fail("Clerk", `secret key rejected (${res.status})`);
    const live = sk.startsWith("sk_live") && pk.startsWith("pk_live");
    ok("Clerk", `secret key valid · ${live ? "LIVE keys" : "TEST keys (fine for staging; switch to live for launch)"}`);
  } catch (e) {
    fail("Clerk", (e as Error).message);
  }
}

async function checkStripe() {
  const sk = process.env.STRIPE_SECRET_KEY;
  if (!sk) return skip("Stripe", "not configured — billing page will set plans locally; fine for a free launch");
  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(sk, { typescript: true });
    const bal = await stripe.balance.retrieve();
    const acctLabel = `${bal.livemode ? "live" : "test"} account`;
    const missing: string[] = [];
    for (const p of ["SOLO", "CREW", "OFFICE"]) {
      const id = process.env[`STRIPE_PRICE_${p}`];
      if (!id) {
        missing.push(`STRIPE_PRICE_${p}`);
        continue;
      }
      try {
        const price = await stripe.prices.retrieve(id);
        if (!price.active || price.type !== "recurring") missing.push(`${p} (price not active/recurring)`);
      } catch {
        missing.push(`${p} (price id not found)`);
      }
    }
    if (missing.length) fail("Stripe", `key OK (${acctLabel}) but prices: ${missing.join(", ")} — run npm run setup:stripe`);
    else ok("Stripe", `${acctLabel} · all 3 prices valid`);
    if (!process.env.STRIPE_WEBHOOK_SECRET) fail("Stripe webhook", "STRIPE_WEBHOOK_SECRET missing — subscriptions won't sync after checkout");
    else ok("Stripe webhook", "secret set (verify the endpoint exists in the dashboard)");
  } catch (e) {
    fail("Stripe", (e as Error).message);
  }
}

async function checkResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return skip("Resend", "not configured — emails go to /admin/outbox instead of inboxes");
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(key);
    const domains = await resend.domains.list();
    if (domains.error) return fail("Resend", domains.error.message);
    const from = process.env.EMAIL_FROM ?? "";
    const fromDomain = from.match(/@([^>\s]+)/)?.[1];
    const list = (domains.data?.data ?? []) as Array<{ name: string; status: string }>;
    const match = list.find((d) => d.name === fromDomain);
    if (!fromDomain) fail("Resend", "EMAIL_FROM is not set to an address on your verified domain");
    else if (!match) fail("Resend", `key OK but domain ${fromDomain} is not added in Resend (found: ${list.map((d) => d.name).join(", ") || "none"})`);
    else if (match.status !== "verified") fail("Resend", `domain ${fromDomain} status is "${match.status}" — finish DNS verification`);
    else ok("Resend", `domain ${fromDomain} verified`);
    if (process.argv.includes("--send-test-email") && match?.status === "verified") {
      const to = (process.env.ADMIN_EMAILS ?? "").split(",")[0].trim();
      const r = await resend.emails.send({ from, to, subject: "TownCert test email", text: "If you can read this, Resend is wired up." });
      if (r.error) fail("Resend test email", r.error.message);
      else ok("Resend test email", `sent to ${to} (id ${r.data?.id})`);
    }
  } catch (e) {
    fail("Resend", (e as Error).message);
  }
}

async function checkStorage() {
  const { S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_ENDPOINT, S3_REGION } = process.env;
  if (!S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) return skip("File storage", "S3_* not configured — uploads go to server disk, which is NOT durable on Vercel");
  try {
    const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({ region: S3_REGION ?? "auto", endpoint: S3_ENDPOINT || undefined, forcePathStyle: Boolean(S3_ENDPOINT), credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY } });
    const key = `_healthcheck/${Date.now()}.txt`;
    await client.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body: "ok", ContentType: "text/plain" }));
    await client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    await client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    ok("File storage", `bucket ${S3_BUCKET} — write/read/delete OK`);
  } catch (e) {
    fail("File storage", (e as Error).message);
  }
}

async function main() {
  await checkCore();
  await Promise.all([checkDb(), checkClerk(), checkStripe(), checkResend(), checkStorage()]);
  const icon = { ok: "✔", skip: "–", fail: "✘" };
  for (const r of results) console.log(`${icon[r.status]}  ${r.name.padEnd(20)} ${r.detail}`);
  const fails = results.filter((r) => r.status === "fail").length;
  console.log(`\n${fails === 0 ? "Ready to deploy." : `${fails} item${fails === 1 ? "" : "s"} to fix before launch.`}`);
  process.exit(fails ? 1 : 0);
}
main();
