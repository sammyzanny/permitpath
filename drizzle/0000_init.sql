CREATE TABLE "audit_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"user_id" integer,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" integer,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"jurisdiction_id" integer,
	"issuer" text,
	"policy_or_bond_number" text,
	"amount" numeric(12, 2),
	"effective_on" date,
	"expires_on" date,
	"storage_key" text,
	"file_name" text,
	"content_type" text,
	"size_bytes" integer,
	"notes" text,
	"uploaded_by_user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_outbox" (
	"id" serial PRIMARY KEY NOT NULL,
	"to_addresses" jsonb NOT NULL,
	"subject" text NOT NULL,
	"text" text NOT NULL,
	"html" text,
	"template" text,
	"provider" text NOT NULL,
	"provider_id" text,
	"status" text NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"token" text NOT NULL,
	"invited_by_user_id" integer,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jurisdiction_revisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"jurisdiction_id" integer NOT NULL,
	"edited_by_user_id" integer,
	"changes" jsonb NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jurisdictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"state" text DEFAULT 'IL' NOT NULL,
	"county" text NOT NULL,
	"registration_required" text DEFAULT 'yes' NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"fee_gc" numeric(10, 2),
	"fee_sub" numeric(10, 2),
	"bond_amount" numeric(12, 2),
	"term_type" text DEFAULT 'unknown' NOT NULL,
	"fixed_month" integer,
	"fixed_day" integer,
	"expiry_label" text DEFAULT 'Unknown' NOT NULL,
	"renewal_opens_month" integer,
	"renewal_opens_day" integer,
	"submission_channel" text DEFAULT 'Not published' NOT NULL,
	"portal_vendor" text,
	"confidence" text DEFAULT 'medium' NOT NULL,
	"fee_gc_text" text,
	"fee_sub_text" text,
	"other_fees" text,
	"bond_text" text,
	"bond_payee" text,
	"liability_min" text,
	"workers_comp" text,
	"other_requirements" text,
	"trades_covered" text,
	"license_term_text" text,
	"renewal_window" text,
	"submission_text" text,
	"department" text,
	"phone" text,
	"email" text,
	"address" text,
	"application_url" text,
	"source_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_date" text,
	"notes" text,
	"last_verified_at" date,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"notify_email" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"trade" text,
	"phone" text,
	"address" text,
	"reminder_email" text,
	"plan" text DEFAULT 'trial' NOT NULL,
	"plan_status" text DEFAULT 'trialing' NOT NULL,
	"trial_ends_at" timestamp with time zone,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"stripe_price_id" text,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_user_id" integer
);
--> statement-breakpoint
CREATE TABLE "registrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"jurisdiction_id" integer NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"license_number" text,
	"issued_on" date,
	"expires_on" date,
	"fee_paid" numeric(10, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"target_type" text NOT NULL,
	"target_id" integer NOT NULL,
	"days_before" integer NOT NULL,
	"due_on" date NOT NULL,
	"sent_at" timestamp with time zone,
	"recipients" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"subject" text
);
--> statement-breakpoint
CREATE TABLE "rule_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"jurisdiction_id" integer NOT NULL,
	"org_id" integer,
	"user_id" integer,
	"field" text,
	"message" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"auth_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_jurisdiction_id_jurisdictions_id_fk" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdictions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jurisdiction_revisions" ADD CONSTRAINT "jurisdiction_revisions_jurisdiction_id_jurisdictions_id_fk" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdictions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jurisdiction_revisions" ADD CONSTRAINT "jurisdiction_revisions_edited_by_user_id_users_id_fk" FOREIGN KEY ("edited_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_jurisdiction_id_jurisdictions_id_fk" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdictions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_reports" ADD CONSTRAINT "rule_reports_jurisdiction_id_jurisdictions_id_fk" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdictions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_reports" ADD CONSTRAINT "rule_reports_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_reports" ADD CONSTRAINT "rule_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_org_idx" ON "audit_events" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "documents_org_idx" ON "documents" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "documents_expires_idx" ON "documents" USING btree ("expires_on");--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_token_idx" ON "invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "invitations_org_idx" ON "invitations" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "jurisdiction_revisions_j_idx" ON "jurisdiction_revisions" USING btree ("jurisdiction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "jurisdictions_slug_idx" ON "jurisdictions" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "jurisdictions_county_idx" ON "jurisdictions" USING btree ("county");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_org_user_idx" ON "memberships" USING btree ("org_id","user_id");--> statement-breakpoint
CREATE INDEX "memberships_user_idx" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_idx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "organizations_stripe_customer_idx" ON "organizations" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "registrations_org_j_idx" ON "registrations" USING btree ("org_id","jurisdiction_id");--> statement-breakpoint
CREATE INDEX "registrations_expires_idx" ON "registrations" USING btree ("expires_on");--> statement-breakpoint
CREATE UNIQUE INDEX "reminders_target_step_idx" ON "reminders" USING btree ("target_type","target_id","days_before");--> statement-breakpoint
CREATE INDEX "reminders_org_idx" ON "reminders" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "rule_reports_status_idx" ON "rule_reports" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "users_auth_id_idx" ON "users" USING btree ("auth_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");