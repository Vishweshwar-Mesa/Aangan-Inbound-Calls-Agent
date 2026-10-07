import type { AdapterAccountType } from "next-auth/adapters";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Auth.js (NextAuth) adapter tables — required by @auth/drizzle-adapter for
// the database session strategy. Schema follows the Auth.js Drizzle Postgres
// reference exactly; do not rename columns.
export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

// The app's one real table. See CLAUDE.md "Data model" for the column notes.
export const calls = pgTable(
  "calls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vaniCallId: text("vani_call_id").notNull().unique(),
    rawPayload: jsonb("raw_payload"),
    callerNumber: text("caller_number"),
    callerName: text("caller_name"),
    callerEmail: text("caller_email"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    durationS: integer("duration_s"),
    endedReason: text("ended_reason"),
    recordingUrl: text("recording_url"),
    transcript: text("transcript"),
    agentRoute: text("agent_route"),
    geminiRoute: text("gemini_route"),
    finalRoute: text("final_route"),
    criteria: jsonb("criteria"),
    reasons: text("reasons"),
    fields: jsonb("fields"),
    flags: text("flags").array(),
    confidence: numeric("confidence"),
    priceMentioned: boolean("price_mentioned"),
    preferredTimes: jsonb("preferred_times"),
    calcomBookingId: text("calcom_booking_id"),
    bookedAt: timestamp("booked_at", { withTimezone: true }),
    inviteBounced: boolean("invite_bounced").default(false),
    brief: text("brief"),
    telegramSentAt: timestamp("telegram_sent_at", { withTimezone: true }),
    telegramAckAt: timestamp("telegram_ack_at", { withTimezone: true }),
    hubspotContactId: text("hubspot_contact_id"),
    hubspotDealId: text("hubspot_deal_id"),
    reviewOutcome: text("review_outcome"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    stepErrors: jsonb("step_errors"),
    costInr: numeric("cost_inr"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("calls_started_at_idx").on(table.startedAt),
    index("calls_final_route_idx").on(table.finalRoute),
    index("calls_review_outcome_idx").on(table.reviewOutcome),
  ],
);
