/**
 * Central place for environment-driven configuration. Every integration has a
 * "configured?" flag so the app runs end-to-end with zero keys (dev mode) and
 * upgrades to the real provider the moment a key is present.
 */
export const BRAND = "TownCert";
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? "support@towncert.com";
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const env = {
  isProd: process.env.NODE_ENV === "production",

  // Auth — Clerk when both keys exist; otherwise cookie-based dev login.
  clerk: {
    configured: Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY),
    webhookSecret: process.env.CLERK_WEBHOOK_SECRET ?? "",
  },
  /** Allow the dev-login fallback even in production builds (e.g. staging). Never leave on for real customers. */
  allowDevAuth: process.env.ALLOW_DEV_AUTH === "1" || process.env.NODE_ENV !== "production",

  admins: (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),

  stripe: {
    configured: Boolean(process.env.STRIPE_SECRET_KEY),
    secretKey: process.env.STRIPE_SECRET_KEY ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    prices: {
      solo: process.env.STRIPE_PRICE_SOLO ?? "",
      crew: process.env.STRIPE_PRICE_CREW ?? "",
      office: process.env.STRIPE_PRICE_OFFICE ?? "",
    },
    /** Promotion code id (promo_…) for the founding-customer offer; created by `npm run founding:offer`. */
    foundingPromo: process.env.STRIPE_FOUNDING_PROMO ?? "",
  },

  email: {
    configured: Boolean(process.env.RESEND_API_KEY),
    apiKey: process.env.RESEND_API_KEY ?? "",
    from: process.env.EMAIL_FROM ?? `${BRAND} <reminders@towncert.com>`,
  },

  storage: {
    configured: Boolean(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY),
    bucket: process.env.S3_BUCKET ?? "",
    region: process.env.S3_REGION ?? "auto",
    endpoint: process.env.S3_ENDPOINT, // set for R2 / Supabase / MinIO; leave empty for AWS
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  },

  cronSecret: process.env.CRON_SECRET ?? "",
  trialDays: Number(process.env.TRIAL_DAYS ?? 14),
};

export function isAdminEmail(email: string | null | undefined) {
  return Boolean(email && env.admins.includes(email.toLowerCase()));
}
