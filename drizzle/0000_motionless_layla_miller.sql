CREATE TABLE "account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vani_call_id" text NOT NULL,
	"raw_payload" jsonb,
	"caller_number" text,
	"caller_name" text,
	"caller_email" text,
	"started_at" timestamp with time zone,
	"duration_s" integer,
	"ended_reason" text,
	"recording_url" text,
	"transcript" text,
	"agent_route" text,
	"gemini_route" text,
	"final_route" text,
	"criteria" jsonb,
	"reasons" text,
	"fields" jsonb,
	"flags" text[],
	"confidence" numeric,
	"price_mentioned" boolean,
	"preferred_times" jsonb,
	"calcom_booking_id" text,
	"booked_at" timestamp with time zone,
	"invite_bounced" boolean DEFAULT false,
	"brief" text,
	"telegram_sent_at" timestamp with time zone,
	"telegram_ack_at" timestamp with time zone,
	"hubspot_contact_id" text,
	"hubspot_deal_id" text,
	"review_outcome" text,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"step_errors" jsonb,
	"cost_inr" numeric,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "calls_vani_call_id_unique" UNIQUE("vani_call_id")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp,
	"image" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calls_started_at_idx" ON "calls" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "calls_final_route_idx" ON "calls" USING btree ("final_route");--> statement-breakpoint
CREATE INDEX "calls_review_outcome_idx" ON "calls" USING btree ("review_outcome");