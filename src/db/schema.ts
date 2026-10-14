import { pgTable, text, integer, boolean, timestamp, date, numeric, jsonb, serial, uniqueIndex, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Identity & tenancy
// ---------------------------------------------------------------------------

/** A person. `authId` is the Clerk user id (or "dev:<email>" in dev mode). */
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    authId: text("auth_id").notNull(),
    email: text("email").notNull(),
    name: text("name"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("users_auth_id_idx").on(t.authId), index("users_email_idx").on(t.email)]
);

/** A contractor business (tenant). Everything customer-facing is scoped by orgId. */
export const organizations = pgTable(
  "organizations",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    trade: text("trade"),
    phone: text("phone"),
    address: text("address"),
    reminderEmail: text("reminder_email"), // optional shared inbox; members also get copies if they opt in
    // Billing
    plan: text("plan").notNull().default("trial"), // trial | solo | crew | office | canceled
    planStatus: text("plan_status").notNull().default("trialing"), // trialing | active | past_due | canceled | unpaid
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    stripePriceId: text("stripe_price_id"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdByUserId: integer("created_by_user_id").references(() => users.id),
  },
  (t) => [uniqueIndex("organizations_slug_idx").on(t.slug), index("organizations_stripe_customer_idx").on(t.stripeCustomerId)]
);

export const memberships = pgTable(
  "memberships",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"), // owner | admin | member
    notifyEmail: boolean("notify_email").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("memberships_org_user_idx").on(t.orgId, t.userId), index("memberships_user_idx").on(t.userId)]
);

export const invitations = pgTable(
  "invitations",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").notNull().default("member"),
    token: text("token").notNull(),
    invitedByUserId: integer("invited_by_user_id").references(() => users.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("invitations_token_idx").on(t.token), index("invitations_org_idx").on(t.orgId)]
);

// ---------------------------------------------------------------------------
// Jurisdiction rules (the data moat) — shared across all tenants
// ---------------------------------------------------------------------------

export const jurisdictions = pgTable(
  "jurisdictions",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    state: text("state").notNull().default("IL"),
    county: text("county").notNull(),
    registrationRequired: text("registration_required").notNull().default("yes"), // yes | no | unknown
    published: boolean("published").notNull().default(true), // admin can hide a town while researching

    feeGc: numeric("fee_gc", { precision: 10, scale: 2, mode: "number" }),
    feeSub: numeric("fee_sub", { precision: 10, scale: 2, mode: "number" }),
    bondAmount: numeric("bond_amount", { precision: 12, scale: 2, mode: "number" }), // null = not published, 0 = none required

    termType: text("term_type").notNull().default("unknown"), // fixed | calendar | rolling | unknown
    fixedMonth: integer("fixed_month"),
    fixedDay: integer("fixed_day"),
    expiryLabel: text("expiry_label").notNull().default("Unknown"),
    renewalOpensMonth: integer("renewal_opens_month"), // optional: when the village starts accepting renewals
    renewalOpensDay: integer("renewal_opens_day"),

    submissionChannel: text("submission_channel").notNull().default("Not published"),
    portalVendor: text("portal_vendor"),
    confidence: text("confidence").notNull().default("medium"), // high | medium | low

    feeGcText: text("fee_gc_text"),
    feeSubText: text("fee_sub_text"),
    otherFees: text("other_fees"),
    bondText: text("bond_text"),
    bondPayee: text("bond_payee"),
    liabilityMin: text("liability_min"),
    workersComp: text("workers_comp"),
    otherRequirements: text("other_requirements"),
    tradesCovered: text("trades_covered"),
    licenseTermText: text("license_term_text"),
    renewalWindow: text("renewal_window"),
    submissionText: text("submission_text"),

    department: text("department"),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    applicationUrl: text("application_url"),
    sourceUrls: jsonb("source_urls").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    sourceDate: text("source_date"),
    notes: text("notes"),
    lastVerifiedAt: date("last_verified_at"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("jurisdictions_slug_idx").on(t.slug), index("jurisdictions_county_idx").on(t.county)]
);

/** Every admin edit to a jurisdiction, with the before/after diff. */
export const jurisdictionRevisions = pgTable(
  "jurisdiction_revisions",
  {
    id: serial("id").primaryKey(),
    jurisdictionId: integer("jurisdiction_id")
      .notNull()
      .references(() => jurisdictions.id, { onDelete: "cascade" }),
    editedByUserId: integer("edited_by_user_id").references(() => users.id),
    changes: jsonb("changes").$type<Record<string, { from: unknown; to: unknown }>>().notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("jurisdiction_revisions_j_idx").on(t.jurisdictionId)]
);

/** A customer telling us a rule is wrong or out of date. */
export const ruleReports = pgTable(
  "rule_reports",
  {
    id: serial("id").primaryKey(),
    jurisdictionId: integer("jurisdiction_id")
      .notNull()
      .references(() => jurisdictions.id, { onDelete: "cascade" }),
    orgId: integer("org_id").references(() => organizations.id, { onDelete: "set null" }),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    field: text("field"),
    message: text("message").notNull(),
    status: text("status").notNull().default("open"), // open | resolved | dismissed
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("rule_reports_status_idx").on(t.status)]
);

// ---------------------------------------------------------------------------
// Tenant data
// ---------------------------------------------------------------------------

export const registrations = pgTable(
  "registrations",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    jurisdictionId: integer("jurisdiction_id")
      .notNull()
      .references(() => jurisdictions.id),
    status: text("status").notNull().default("planned"), // planned | submitted | active | lapsed
    licenseNumber: text("license_number"),
    issuedOn: date("issued_on"),
    expiresOn: date("expires_on"),
    feePaid: numeric("fee_paid", { precision: 10, scale: 2, mode: "number" }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("registrations_org_j_idx").on(t.orgId, t.jurisdictionId), index("registrations_expires_idx").on(t.expiresOn)]
);

export const documents = pgTable(
  "documents",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // coi | bond | state_license | electrical_credential | workers_comp | other
    title: text("title").notNull(),
    jurisdictionId: integer("jurisdiction_id").references(() => jurisdictions.id),
    issuer: text("issuer"),
    policyOrBondNumber: text("policy_or_bond_number"),
    amount: numeric("amount", { precision: 12, scale: 2, mode: "number" }),
    effectiveOn: date("effective_on"),
    expiresOn: date("expires_on"),
    // storage
    storageKey: text("storage_key"),
    fileName: text("file_name"),
    contentType: text("content_type"),
    sizeBytes: integer("size_bytes"),
    notes: text("notes"),
    uploadedByUserId: integer("uploaded_by_user_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("documents_org_idx").on(t.orgId), index("documents_expires_idx").on(t.expiresOn)]
);

export const reminders = pgTable(
  "reminders",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    targetType: text("target_type").notNull(), // registration | document
    targetId: integer("target_id").notNull(),
    daysBefore: integer("days_before").notNull(),
    dueOn: date("due_on").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    recipients: jsonb("recipients").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    subject: text("subject"),
  },
  (t) => [uniqueIndex("reminders_target_step_idx").on(t.targetType, t.targetId, t.daysBefore), index("reminders_org_idx").on(t.orgId)]
);

// ---------------------------------------------------------------------------
// Ops
// ---------------------------------------------------------------------------

export const auditEvents = pgTable(
  "audit_events",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(), // registration.create, document.delete, billing.checkout, ...
    targetType: text("target_type"),
    targetId: integer("target_id"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_events_org_idx").on(t.orgId, t.createdAt)]
);

/** Every email we try to send. With no RESEND_API_KEY this is the only "delivery". */
export const emailOutbox = pgTable("email_outbox", {
  id: serial("id").primaryKey(),
  toAddresses: jsonb("to_addresses").$type<string[]>().notNull(),
  subject: text("subject").notNull(),
  text: text("text").notNull(),
  html: text("html"),
  template: text("template"),
  provider: text("provider").notNull(), // resend | outbox
  providerId: text("provider_id"),
  status: text("status").notNull(), // sent | queued | failed
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Stripe events we've processed (idempotency). */
export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
export type Jurisdiction = typeof jurisdictions.$inferSelect;
export type Registration = typeof registrations.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Reminder = typeof reminders.$inferSelect;
export type RuleReport = typeof ruleReports.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
