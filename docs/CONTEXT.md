# Context — current state

Rewritten in place after every change. Keep it under 150 lines. Last updated:
2026-10-09, deployed to production; Phase 3 confirmed working end-to-end
against the real database and Gemini; login running in test mode.

## Where we are

This is an internal capability-testing build, not a live business — no real
customer data. Noted here so "test mode" / open-access items below are read
as config state, not incidents.

- **Login is in test mode:** `ALLOWED_EMAILS` is empty, so any email can
  sign into the live dashboard at https://aangan-build-kit.vercel.app. The
  login page shows a visible warning. Set `ALLOWED_EMAILS` (locally and on
  Vercel) when real access control is wanted — see DECISIONS D17.

- **Phase:** 3 (post-call actions) — done and verified live, including
  against real third-party accounts where credentials exist so far.
  **Deployed**: https://aangan-build-kit.vercel.app (Vercel project
  `vishu-mesa/aangan-build-kit`), code pushed to the private GitHub repo
  `Vishweshwar-Mesa/Aangan-Inbound-Calls-Agent`. Vercel's default SSO
  deployment protection was disabled (it would have blocked Vani/Telegram/
  cron-job.org, which are plain HTTP callers with no Vercel login).
- **Verified via `npm run replay` against the real Neon database:**
  - Webhook upsert, Gemini re-score, and `final_route` decision logic are
    all correct (routed the sample T12 call `QUALIFIED` with the `LARGE`
    flag — matches rubric.txt's expected answer exactly).
  - **Cal.com booking confirmed working end-to-end** against a real Cal.com
    account: fetched real slots, matched/fell back correctly, created a
    real booking (`calcom_booking_id` populated, `booked_at` set). Two test
    bookings were created on the real calendar during testing (Oct 12) —
    safe to delete manually from Cal.com.
  - **Telegram confirmed working end-to-end** against a real bot: the
    designer brief sent with a "Got it" button, the webhook (registered at
    `https://aangan-build-kit.vercel.app/api/telegram`) received the tap,
    and `telegram_ack_at` was set correctly.
  - **HubSpot confirmed working end-to-end** against a real account: found
    the hardcoded association type id (5) was wrong for this portal —
    corrected to 3 by querying the API directly (DECISIONS D18) — then
    contact create, deal create, "Consultation booked" stage, and the
    `ai_call_cost_inr` property all worked (`hubspot_contact_id`/
    `hubspot_deal_id` populated).
  - Only Claude fails into `step_errors` now — no `ANTHROPIC_API_KEY` yet.
    No step ever blocks another.
- **Next step:** Phase 4, the dashboard. Just `ANTHROPIC_API_KEY` left
  before every Phase 3 integration is live — re-run `npm run replay` after
  adding it and check `step_errors` on the resulting row.
- GitHub repo is **private** (was public when created — changed this
  session, since it holds real call transcripts and internal pricing data).
  GitHub→Vercel auto-deploy-on-push is **not yet connected** (needs a
  one-time authorization in the Vercel dashboard, Settings → Git) —
  deploys are manual (`npx vercel --prod`) until then.

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
- **Bug found and fixed:** `drizzle.config.ts` and `scripts/replay.ts` used
  `import "dotenv/config"`, which only loads `.env` by default — not
  `.env.local`. Both ran with every var undefined, silently falling back to
  the placeholder `localhost:5432` connection, which is what made
  `npm run db:migrate` hang indefinitely (drizzle-kit was trying to reach a
  Postgres that doesn't exist, not a real connectivity problem). Both now
  call `config({ path: ".env.local" })` explicitly.
- **Stale model name:** `GEMINI_MODEL` defaulted to `gemini-2.0-flash`,
  which the Gemini API now rejects with a 404 telling callers to use
  `gemini-3.8-flash`. Updated the fallback in `lib/gemini.ts` and the value
  in `.env.local`/Vercel. (Google's own API error is the source of truth
  here, not my training data — re-check if this 404s again later.)

## Built and working

- Everything compiles (`npm run build` clean) and is deployed to Vercel
  production. Migrations applied to the real Neon database
  (`npm run db:migrate`, using the `pg` driver — drizzle-kit auto-selects it
  over `@neondatabase/serverless` once `pg` is installed, which also sidesteps
  the websocket-based migrate path).
- `npm run replay` against the real database and Gemini confirmed the whole
  webhook flow end-to-end: upsert, re-score, route decision, and
  `step_errors` isolation per post-call step (see "Where we are" above for
  the result). The test row was deleted afterward — it was replay/demo data,
  not a real call.
- `/api/telegram` and `/api/cron` both 401 without their secret; confirmed
  on the live deployment too.

## In progress

- None.

## Env vars

Set, locally and on Vercel: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`,
`GEMINI_API_KEY`, `GEMINI_MODEL`, `RESEND_API_KEY`, `AUTH_SECRET`,
`VANI_WEBHOOK_SECRET`, `TELEGRAM_WEBHOOK_SECRET`, `CRON_SECRET`, `APP_URL`
(production value is the real Vercel URL; `.env.local` keeps `localhost:3000`
for local dev), `CALCOM_API_KEY`, `CALCOM_EVENT_TYPE_ID` (Cal.com's default
"30 min meeting", id `7409849` — no dedicated "Design Consultation" event
type exists yet), `TELEGRAM_BOT_TOKEN` (@Aangan_Inbound_BOT),
`TELEGRAM_DESIGNER_CHAT_ID`, `TELEGRAM_ESCALATION_CHAT_ID` (both the same
chat ID for now — one person's private chat with the bot; split later if a
real designer/front-desk distinction is wanted). Telegram's webhook is
registered against the production URL. `HUBSPOT_PRIVATE_APP_TOKEN` — note
this account issues HubSpot's newer "service key" (prefix `pat-na2-...`),
not the classic "private app" token; same Bearer auth, works as a drop-in.
The "Consultation booked" stage and `ai_call_cost_inr` property both exist
in HubSpot (created via the API directly, not the UI).

Still placeholder (everywhere): `ALLOWED_EMAILS` (empty = test mode, see
above), `VANI_API_KEY`, `VANI_AGENT_ID`, `VANI_PHONE_NUMBER`,
`ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `DESIGNER_NAME`.

## Open assumptions

- Cal.com v2 header `cal-api-version`: `2024-09-04` for `/slots`,
  `2026-02-25` for `/bookings`. Taken from Cal.com's docs at build time —
  re-verify before go-live, since Cal.com bumps these periodically.
- "Front desk chat" in the cron reminder reuses `TELEGRAM_ESCALATION_CHAT_ID`
  — no separate env var exists (DECISIONS D16).
- Preferred-time matching uses `chrono-node` on natural-language strings
  ("this week, morning") with a 90-minute tolerance window; not exact.
- Prior open items unchanged: Vani payload shape (D-pending), Vani webhook
  auth scheme, missed-call handling, three Nikhil confirmations (D13),
  consultation-to-won rate.

## Known bugs

- None currently open (see "Bug found and fixed" above for one caught and
  resolved this session).

## Run / test / deploy

**Already done this session:** `npm install`, `npm run db:migrate` against
the real Neon database, pushed to GitHub (private repo), deployed to Vercel
production, Vercel's default SSO deployment protection disabled (it blocked
plain-HTTP callers like Vani/Telegram/cron-job.org), Cal.com/Telegram/
HubSpot all wired up and confirmed working against real accounts (booking,
brief send + "Got it" ack, contact/deal creation).

**Still to do:**
1. Add to both `.env.local` and Vercel's env vars: `ALLOWED_EMAILS`,
   `ANTHROPIC_API_KEY`.
2. **Cron:** schedule a GET every 10 minutes from cron-job.org to
   `$APP_URL/api/cron` with header `Authorization: Bearer <CRON_SECRET>`.
3. **GitHub auto-deploy** isn't connected yet — Vercel dashboard, project
   Settings > Git > Connect Git Repository, authorize the private repo.
4. After adding `ANTHROPIC_API_KEY`, `npm run replay` locally and check
   `step_errors` on the new row — `claude` should finally succeed too.

## Pass bars

- **Eval:** all 19 answerable calls routed as expected; 0 false negatives;
  0 prices spoken.
- **Dummy calls:** all 8 behave as described in `seed/dummy-calls.md`.
