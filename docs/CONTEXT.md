# Context — current state

Rewritten in place after every change. Keep it under 150 lines. Last updated:
2026-10-07, end of Phase 3.

## Where we are

- **Phase:** 3 (post-call actions) — done.
- **Next step:** Phase 4, the dashboard. All of Phase 3's integrations are
  implemented against real API shapes but **not yet exercised against live
  accounts** — no Cal.com/Telegram/HubSpot/Anthropic credentials in this
  session. Run `npm run replay` once credentials are in `.env.local` and
  check `step_errors` on the resulting row for any integration that needs
  fixing.

## What exists in the repo

Phases 1–2 (scaffold, auth, the call-ended webhook) — unchanged, see git
history.

Phase 3 additions:
- `lib/pricing.ts` — the internal per-sq-ft bands from pricing.md, residential
  and commercial, plus `estimateRanges()`. Never exposed to a caller surface.
- `lib/claude.ts` — `writeDesignerBrief()`: calls Anthropic with the call's
  structured fields + computed pricing ranges, asks for ≤120 words ending in
  an `Internal — never share:` line.
- `lib/calcom.ts` — `bookConsultation()`: fetches Cal.com v2 slots for the
  next 5 working days, parses the caller's natural-language preferred times
  with `chrono-node`, matches within a 90-minute tolerance or falls back to
  the nearest slot after the earliest preference, then books it.
- `lib/telegram.ts` — `sendDesignerBrief()` (HTML, inline "Got it" button,
  skips sending 7pm–9am IST — the call's `telegram_sent_at` staying null
  **is** the "queued" state), `sendEscalation()`, `sendReminder()`.
- `lib/hubspot.ts` — `upsertContactAndDeal()`: finds a contact by email then
  phone, creates one if neither matches, looks up the "Consultation booked"
  deal stage by label (cached after first lookup), creates the deal with
  `ai_call_cost_inr` and a contact association.
- `app/api/telegram/route.ts` — verifies
  `X-Telegram-Bot-Api-Secret-Token`; on an `ack:<callId>` callback, sets
  `telegram_ack_at`, answers the callback, edits the message to
  "✅ Acknowledged".
- `app/api/cron/route.ts` — verifies `Authorization: Bearer <CRON_SECRET>`.
  Sends any queued (after-hours) briefs if now within sending hours; reminds
  the designer + escalation chat for any `QUALIFIED` call unacknowledged 30+
  minutes after `telegram_sent_at` (guarded by the new `reminder_sent_at` so
  it only fires once — see DECISIONS D15).
- `lib/db/schema.ts` — added `reminder_sent_at` (D15); migration
  `drizzle/0001_tiresome_cardiac.sql`.
- **Bug found and fixed:** `lib/db.ts`, `drizzle.config.ts`, `lib/claude.ts`,
  `lib/gemini.ts` used `??` for their env-var fallbacks. Once `.env.local`
  existed with those vars present-but-empty (not unset), `??` no longer fell
  back (it only catches `null`/`undefined`, not `""`), so the placeholder
  DB connection string silently became an empty string. All four now use
  `||`. Caught by testing `/api/cron` after `.env.local` was created.

## Built and working

- Everything compiles (`npm run build` clean). `.env.local` exists this
  session with `GEMINI_API_KEY`, `RESEND_API_KEY`, and generated
  `AUTH_SECRET`/`VANI_WEBHOOK_SECRET`/`TELEGRAM_WEBHOOK_SECRET`/
  `CRON_SECRET` — confirmed gitignored and not committed.
- Smoke-tested without a live database: `/api/telegram` and `/api/cron` both
  401 without their secret; `/api/cron`, once authenticated, reaches the
  database query and fails only on `ECONNREFUSED` to the placeholder DB URL.
- Not yet tested: Cal.com, Telegram Bot API, HubSpot, or Anthropic calls —
  no credentials for any of them in this session, and no live database to
  drive a real call through `runPostCallActions()`.

## In progress

- None.

## Env vars

Still placeholder: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `ALLOWED_EMAILS`,
`VANI_API_KEY`, `VANI_AGENT_ID`, `VANI_PHONE_NUMBER`, `CALCOM_API_KEY`,
`CALCOM_EVENT_TYPE_ID`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_DESIGNER_CHAT_ID`,
`TELEGRAM_ESCALATION_CHAT_ID`, `HUBSPOT_PRIVATE_APP_TOKEN`,
`ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `DESIGNER_NAME`.

Set this session (in `.env.local`, not committed): `GEMINI_API_KEY`,
`GEMINI_MODEL`, `RESEND_API_KEY`, `AUTH_SECRET`, `VANI_WEBHOOK_SECRET`,
`TELEGRAM_WEBHOOK_SECRET`, `CRON_SECRET`, `APP_URL` (`localhost:3000`).

## Open assumptions

- Cal.com v2 header `cal-api-version`: `2024-09-04` for `/slots`,
  `2026-02-25` for `/bookings`. Taken from Cal.com's docs at build time —
  re-verify before go-live, since Cal.com bumps these periodically.
- HubSpot's contact-to-deal `associationTypeId: 5` (`HUBSPOT_DEFINED`) is
  assumed stable; spot-check if a deal comes back unassociated.
- "Front desk chat" in the cron reminder reuses `TELEGRAM_ESCALATION_CHAT_ID`
  — no separate env var exists (DECISIONS D16).
- The HubSpot deal stage must be labelled exactly "Consultation booked"
  (case-insensitive match) — create it before Phase 3 goes live (steps
  below).
- The custom deal property `ai_call_cost_inr` must exist in HubSpot before
  deals can be created with it (steps below) — a Number property.
- Preferred-time matching uses `chrono-node` on natural-language strings
  ("this week, morning") with a 90-minute tolerance window; not exact.
- Prior open items unchanged: Vani payload shape (D-pending), Vani webhook
  auth scheme, missed-call handling, three Nikhil confirmations (D13),
  consultation-to-won rate.

## Known bugs

- None currently open (see "Bug found and fixed" above for one caught and
  resolved this session).

## Run / test / deploy

1. `npm install` (done).
2. `.env.local` already has Gemini/Resend/generated secrets. Still add:
   `DATABASE_URL`/`DATABASE_URL_UNPOOLED` (Neon), `ALLOWED_EMAILS`,
   `CALCOM_API_KEY`/`CALCOM_EVENT_TYPE_ID`, `TELEGRAM_BOT_TOKEN`/
   `TELEGRAM_DESIGNER_CHAT_ID`/`TELEGRAM_ESCALATION_CHAT_ID`,
   `HUBSPOT_PRIVATE_APP_TOKEN`, `ANTHROPIC_API_KEY`.
3. **HubSpot, once:** Settings > Data Management > Deal pipelines — add a
   stage labelled exactly "Consultation booked". Settings > Data Management
   > Properties > Deal properties > Create property — Number, internal name
   `ai_call_cost_inr`.
4. **Telegram, once:** after setting `TELEGRAM_BOT_TOKEN` and
   `TELEGRAM_WEBHOOK_SECRET`, point the bot at the webhook:
   `curl -X POST https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook -d url=$APP_URL/api/telegram -d secret_token=$TELEGRAM_WEBHOOK_SECRET`.
5. **Cron, once deployed:** schedule a GET every 10 minutes from
   cron-job.org to `$APP_URL/api/cron` with header
   `Authorization: Bearer <CRON_SECRET>`.
6. `npm run db:migrate`, `npm run dev`, `npm run replay` — check the new
   row's `step_errors` for anything still failing.
7. `npm run build` to confirm the production build is clean.

## Pass bars

- **Eval:** all 19 answerable calls routed as expected; 0 false negatives;
  0 prices spoken.
- **Dummy calls:** all 8 behave as described in `seed/dummy-calls.md`.
