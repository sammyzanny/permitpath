# Deploying PermitPath to production

Everything below is a one-time setup. Budget an afternoon. Each step ends with how to confirm it worked.

## 0. Prerequisites

- A GitHub account with this repo pushed to it.
- Accounts (all have free tiers that cover launch): [Vercel](https://vercel.com), [Neon](https://neon.tech) (Postgres), [Clerk](https://clerk.com), [Stripe](https://stripe.com), [Resend](https://resend.com), and either [Cloudflare R2](https://developers.cloudflare.com/r2/) or AWS S3 for files.
- A domain you control (for Clerk production keys, Resend sending, and Stripe redirect URLs).

## 1. Database — Neon

1. Create a project → copy the **pooled** connection string (ends in `?sslmode=require`).
2. In Vercel → Project → Settings → Environment Variables, add `DATABASE_URL`.
3. Migrations run during the Vercel build via `npm run deploy:build` (see step 6). To run them manually: `DATABASE_URL=... npm run db:migrate && DATABASE_URL=... npm run seed`.

**Confirm:** `https://<your-domain>/api/health` returns `{"ok":true,"jurisdictions":37}`.

## 2. Authentication — Clerk

1. Create an application. Enable **Email address** as an identifier; enable email code and/or Google. Organizations are *not* needed (PermitPath manages teams itself).
2. Copy `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` into Vercel.
3. In Clerk → Paths, set: Sign-in `/sign-in`, Sign-up `/sign-up`, After sign-up `/onboarding`, After sign-in `/app`.
4. For production keys, add your domain under Clerk → Domains and follow the DNS instructions.

**Confirm:** `/sign-up` shows the Clerk widget; after signing up you land on `/onboarding`.

Make sure `ALLOW_DEV_AUTH` is **unset** in production. The dev login is then fully disabled.

## 3. Billing — Stripe

1. Products → create three recurring monthly prices: Solo $19, Crew $39, Office $79. Copy each **price ID** (`price_…`) into `STRIPE_PRICE_SOLO`, `STRIPE_PRICE_CREW`, `STRIPE_PRICE_OFFICE`.
2. Developers → API keys → copy the secret key into `STRIPE_SECRET_KEY`.
3. Developers → Webhooks → Add endpoint `https://<your-domain>/api/webhooks/stripe` with events:
   `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.
   Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
4. Settings → Billing → Customer portal: enable it and allow plan switching between the three prices, and cancellation.

**Confirm:** In test mode, choose a plan on `/app/settings/billing`, pay with `4242 4242 4242 4242`, and the plan badge updates within a few seconds (webhook). `/admin/orgs` shows the Stripe customer ID.

Trial logic: the app runs its own 14-day trial with no card. When a customer subscribes with days left, those days are passed to Stripe as `trial_period_days`, so they are not charged early.

## 4. Email — Resend

1. Add and verify your sending domain (SPF + DKIM records).
2. Create an API key → `RESEND_API_KEY`. Set `EMAIL_FROM` to an address on that domain.

**Confirm:** Invite a teammate from `/app/settings/team`; the email arrives and `/admin/outbox` shows `resend · sent`.

## 5. File storage — R2 or S3

Cloudflare R2 (cheapest, no egress fees):
1. Create a bucket (private). Create an API token with Object Read & Write.
2. Set `S3_BUCKET`, `S3_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com`, `S3_REGION=auto`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`.

AWS S3: same variables, leave `S3_ENDPOINT` empty and set `S3_REGION` to the bucket's region.

Files are served through `/api/files/[id]` using 5-minute signed URLs; the bucket never needs to be public.

**Confirm:** Upload a PDF on `/app/documents` and open it.

## 6. Hosting — Vercel

1. Import the GitHub repo. Framework: Next.js.
2. Settings → General → **Build Command**: `npm run deploy:build` (runs migrations, seeds/refreshes the jurisdiction rules, then builds). Install command: `npm install --legacy-peer-deps`.
3. Add every variable from `.env.example` that you have values for, plus:
   - `NEXT_PUBLIC_APP_URL=https://<your-domain>`
   - `ADMIN_EMAILS=<your email>`
   - `CRON_SECRET=<long random string>` — Vercel Cron sends it automatically.
4. `vercel.json` already schedules the two daily jobs (reminders 13:00 UTC = 8 am Central, trial notices 13:30 UTC).
5. Add your domain under Settings → Domains.

**Confirm:** Vercel → Cron Jobs shows both jobs; trigger one manually and see `{"ok":true,...}`. Visit `/admin` with your admin email and check the **Integrations** card — everything should read "connected".

## 7. After launch

- **Verify rules by phone.** `/admin` lists the most-tracked towns and how long since each was verified. Use the "Mark verified today" button as you go. The companion spreadsheet's *Gaps – To Call* sheet has the 105 unpublished fields.
- **Customer reports** land in `/admin/reports`. Fix the town, add a revision note, resolve.
- **Adding a town:** `/admin/jurisdictions/new`. Publish only when the core fields are confirmed.
- **Legal pages** (`/legal/terms`, `/legal/privacy`) are templates. Have a lawyer review before charging customers.
- **Monitoring:** point an uptime monitor at `/api/health`. To add Sentry, initialize it in `src/lib/audit.ts → reportError`.
- **Backups:** Neon keeps point-in-time history; R2/S3 versioning is optional but cheap.

## Local development recap

```bash
npm install --legacy-peer-deps
npm run seed:demo          # embedded Postgres + 37 towns + demo org
npm run dev                # http://localhost:3000 → /dev-login as demo@permitpath.app
ADMIN_EMAILS=you@x.com npm run dev   # to reach /admin, sign in with that email
npm test                   # unit + integration tests (in-memory Postgres)
npm run build && ./scripts/dev-server.sh &  npx playwright test   # full e2e
```
