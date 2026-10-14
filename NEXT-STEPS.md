# TownCert — where the deploy stands (Oct 14, 2026)

The project is on your computer at **Documents\permitpath** with git history, the remote set to
`github.com/sammyzanny/permitpath`, and `.env.production.local` already holding the Neon, Clerk,
Stripe and Resend keys. Everything below runs from a terminal in that folder.

## Done for you

| Service | Status |
|---|---|
| Neon | Org "TownCert", project `permitpath` (US East 2, free). `DATABASE_URL` saved. |
| Clerk | App "TownCert" (email + Google). Keys saved. Paths set: `/sign-in`, `/sign-up`, sign-out → `/`. |
| Stripe | Test-mode restricted key "TownCert server (test)" created and saved. Prices not created yet (step 2). |
| Resend | API key saved. Sender set to `onboarding@resend.dev` (test sender — only delivers to your own address). |
| Vercel | Team "TownCert" (Hobby) created. Project not imported yet (step 3). |
| Cloudflare R2 | Needs you to click **Add R2 subscription** (asks for a card; free tier is $0). Then step 4. |
| GitHub | Repo exists, nothing pushed yet (step 1). |

## Your turn — in order, ~20 minutes

**1. Push the code** (your Windows git has your GitHub login; the sandbox doesn't)
```powershell
cd $HOME\Documents\permitpath
git push -u origin main
```

**2. Create the Stripe prices** (needs network the sandbox doesn't have)
```powershell
npm install --legacy-peer-deps
npm run setup:stripe
```
It prints `STRIPE_PRICE_SOLO/CREW/OFFICE=…` — paste those three lines into `.env.production.local`.
(The webhook secret comes in step 3b, once you have a URL.)

**3. Vercel**
a. The Vercel "New Project" tab is open. Click **GitHub**, authorize, import `sammyzanny/permitpath`.
   Before deploying: Build Command `npm run deploy:build`, Install Command `npm install --legacy-peer-deps`.
b. Deploy once to get your URL (e.g. `https://towncert.vercel.app`). Put it in `.env.production.local`
   as `NEXT_PUBLIC_APP_URL`, then register the Stripe webhook with it:
   ```powershell
   $env:APP_URL="https://towncert.vercel.app"; npm run setup:stripe
   ```
   and paste the printed `STRIPE_WEBHOOK_SECRET=…` into the env file.
c. Push all env vars to Vercel in one go, then redeploy:
   ```powershell
   npx vercel login
   npx vercel link        # pick the TownCert team / project
   npm run vercel:env
   npx vercel --prod
   ```

**4. Cloudflare R2** (file uploads — optional until you have paying customers; uploads fall back to server disk)
Click **Add R2 subscription** in the open Cloudflare tab, then tell me and I'll create the bucket + token,
or do it yourself: R2 → Create bucket `towncert-documents` → Manage API tokens → Object Read & Write →
copy Access Key ID / Secret / endpoint into `S3_*` in the env file.

**5. Verify everything**
```powershell
npm run check:env
```
Every line should read ✔ or – (skipped). Then open `https://<your-url>/admin` (sign in with
samuelczandi@gmail.com — it's on `ADMIN_EMAILS`) and check the Integrations card.

## Before charging real customers
- Clerk: switch to a production instance (needs your own domain) and swap to `pk_live/sk_live` keys.
- Stripe: run `npm run setup:stripe` again with a live key; add the live webhook.
- Resend: add your domain under Domains, verify DNS, change `EMAIL_FROM` to it.
- Vercel: the Hobby plan is for non-commercial use; move to Pro ($20/mo) when you start billing.
- Legal: have the Terms/Privacy templates reviewed.
