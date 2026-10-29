/** Facts that appear in the Terms of Service and Privacy Policy. Keep in one place. */
export const LEGAL = {
  entity: "Samuel C. Zandi, doing business as TownCert",
  shortEntity: "TownCert",
  address: "Steger, Illinois 60475, United States",
  effective: "October 29, 2026",
  governingLaw: "the State of Illinois",
  venue: "the state or federal courts located in Cook County, Illinois",
  retentionAfterCancelMonths: 12,
  deletionRequestDays: 30,
  priceChangeNoticeDays: 30,
  subprocessors: [
    { name: "Vercel, Inc.", purpose: "Application hosting, scheduled jobs and web analytics", location: "United States" },
    { name: "Neon, Inc.", purpose: "Database hosting (PostgreSQL)", location: "United States (us-east-2)" },
    { name: "Clerk, Inc.", purpose: "Sign-in and account security", location: "United States" },
    { name: "Stripe, Inc.", purpose: "Subscription billing and payment processing", location: "United States" },
    { name: "Resend, Inc.", purpose: "Transactional email (reminders, invitations, receipts)", location: "United States" },
    { name: "Cloudflare, Inc.", purpose: "Encrypted storage of uploaded documents (R2)", location: "United States" },
  ],
} as const;
