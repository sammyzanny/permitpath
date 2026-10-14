# TownCert

Multi-tenant SaaS for contractors working Chicago's south suburbs, where every village runs its own contractor registration with its own fee, bond, insurance minimums, expiry date and submission method. TownCert keeps the rules for every jurisdiction, computes each renewal from that town's actual rule, stores the supporting documents, and reminds the whole team before a village stops issuing permits.

## What's in the box

**Customer app** (`/app`)
- Onboarding: create a company, pick the towns you work in; 14-day trial, no card.
- My towns: every registration with status, issue date, and an expiry computed from the town's rule (fixed year, calendar year, or rolling from issue date). Plan limits enforced.
- Renewal calendar with 60/30/14/day-of reminder ladder, manual run, and an `.ics` feed for Google/Apple/Outlook.
- Document vault: COI, workers' comp, per-town bonds, state licenses, electrical credentials — real file uploads served only to the owning org; conflict detection when a certificate lapses in the 90 days before a renewal.
- Rules directory with per-town checklist and "report a problem".
- Settings: company, team with roles and email invitations, plan & billing (Stripe Checkout + portal), activity log.

**Public site** — landing, pricing, and an SEO directory with one page per jurisdiction (`/rules/[slug]`, JSON-LD, sitemap).

**Admin** (`/admin`, email allow-list) — overview with integration status, jurisdiction editor with full revision history, customer rule reports, customer list, email outbox.

**Platform** — Next.js 16 App Router, TypeScript, Tailwind v4, Drizzle ORM on Postgres (embedded PGlite locally, Neon/any Postgres in prod), Clerk auth with a cookie dev-login fallback, Stripe subscriptions with idempotent webhooks, Resend email with a DB outbox fallback, S3-compatible storage with local-disk fallback, cron endpoints secured by a shared secret, audit log on every write.

Every integration is optional at runtime: with zero keys the whole product works locally using the fallbacks, and each one switches to the real provider when its env vars appear.

## Quick start

```bash
npm install --legacy-peer-deps
npm run seed:demo     # creates ./data/pglite (embedded Postgres), loads 37 jurisdictions + a demo company
npm run dev           # http://localhost:3000
```

Sign in at `/dev-login` as `demo@towncert.com`. To see `/admin`, run with `ADMIN_EMAILS=demo@towncert.com`.

## Tests

```bash
npm test                     # 34 unit + integration tests (vitest, in-memory Postgres)
npm run build
./scripts/dev-server.sh &    # production build in dev-auth mode on :3210
npx playwright test          # 10 end-to-end scenarios covering the whole product
```

## Project layout

```
data/jurisdictions.json        rules database seed (37 south-suburban jurisdictions)
drizzle/                        SQL migrations (drizzle-kit)
scripts/seed.ts, migrate.ts     deploy-time scripts
src/db/schema.ts                Postgres schema (users, organizations, memberships, invitations,
                                jurisdictions + revisions, registrations, documents, reminders,
                                rule_reports, audit_events, email_outbox, stripe_events)
src/db/index.ts                 driver selection: PGlite (local) / postgres.js (DATABASE_URL)
src/lib/env.ts                  all env-driven config + "configured?" flags
src/lib/auth.ts                 Clerk or dev-cookie identity
src/lib/tenancy.ts              current user/org context, roles, guards
src/lib/plans.ts                tiers and limit enforcement
src/lib/billing.ts              Stripe checkout, portal, webhook processing
src/lib/email.ts                Resend/outbox + templates
src/lib/storage.ts              S3/local file storage
src/lib/expiry.ts               expiry & reminder-ladder math (pure, unit-tested)
src/lib/reminders.ts            multi-org reminder engine, trial notices
src/lib/queries.ts              org-scoped reads; admin-queries.ts for /admin
src/lib/actions/*.ts            server actions (org, registrations, documents, billing, admin, dev-auth)
src/proxy.ts                    route protection (Clerk middleware or dev cookie)
src/app/                        routes: public, (auth), onboarding, invite, app/*, admin/*, api/*
e2e/                            Playwright suites
DEPLOY.md                       step-by-step production setup
```

## Deploying

See **DEPLOY.md** — Neon, Clerk, Stripe, Resend, R2/S3, Vercel, in that order, each with a confirmation step.

## Data caveats

Rules were read from official municipal sources in September 2026 and change without notice. Fields no village publishes online are flagged "confirm by phone" in the UI and listed in the companion spreadsheet. Known conflicts: University Park bond ($5k web vs $10k form), Harvey bond ($20k form vs $10k code), Homewood fee (2017 form; village says fees rose May 2026). Use `/admin` to correct and stamp verified as you confirm each one.
