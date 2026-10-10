# Changelog

One entry per commit, newest first: date, what changed, files, how tested.

## 2026-10-10 — fix: stale VANI_WEBHOOK_SECRET on Vercel production (D30)
- No code changed. A real WebRTC test call in Vaani's dashboard (their
  built-in no-phone-number test feature) never reached our dashboard;
  `vercel logs --json` showed the webhook fired but got 401'd. Vercel's
  `VANI_WEBHOOK_SECRET` had been set ~2 days before the webhook was
  registered in Vaani today, so it was almost certainly stale. Reset it to
  match `.env.local` via `vercel env rm`/`vercel env add`.
- Needs a fresh deploy (env var changes don't apply retroactively) and
  another test call to confirm fixed — not yet verified.

## 2026-10-10 — docs: update dummy-call test script for the D25 pricing change
- `seed/dummy-calls.md` scenario 6 (rude price push) still said the agent
  should "never say a number" — stale since D25 now lets it state one
  approved starting rate. Updated the expected behavior and the pass bar
  to match ("price overreach" instead of "prices spoken").

## 2026-10-10 — fix: Cal.com booking failed with no caller contact info (D29)
- `app/api/vani/call-ended/route.ts`: `callerName`/`callerEmail` now fall
  back to Gemini's transcript-extracted `fields.name`/`fields.email`
  whenever Vani's own payload doesn't have them (its documented
  `call_postprocessing` shape has no caller contact field at all).
- `rubric.txt` (section 7 fields), `lib/gemini.ts` (`RescoreSchema`): added
  `email` to the fields Gemini extracts from the transcript.
- Found via a manual end-to-end test posting a synthetic call payload
  (caller "Mihirr") to the local webhook: Cal.com rejected the booking with
  "Attendee must have at least one contact method." Root cause: nothing
  ever populated `callerEmail` except Vani's own (nonexistent, for this
  event) `entities.caller_email`, even though the agent's own script
  requires collecting and confirming an email on every qualified call.
- Tested: `npm run build` clean; three full round-trips against a local dev
  server with real Gemini/Cal.com/Telegram/HubSpot calls — confirmed the
  fallback populates caller name/email correctly, and a full booking
  succeeds end-to-end with a deliverable email (Cal.com separately and
  correctly rejects `@example.com` as non-deliverable — not a bug).

## 2026-10-10 — feat: global date-range + status filters (D28)
- New `lib/filter-options.ts` (types/constants, safe for client bundles)
  and `lib/filters.ts` (`getActiveFilters`/`setActiveFilters`, cookie-based,
  server-only). New `components/global-filters.tsx` (Today/7D/30D/90D ×
  All/Qualified/Not a fit/Needs review/Escalated), wired into Principal's
  View, Calls, and Analytics, replacing each page's own separate picker.
- `app/(dashboard)/actions.ts`: added `setFilters` server action.
- `lib/queries.ts` (`getOverviewStats`, `listCalls`), `lib/analytics.ts`
  (`getAnalyticsSummary`): gained `status`/date-range parameters.
  `GET /api/calls/export` now reads the same cookies instead of its own
  `route`/`q` query params. Removed the now-unused `getRouteCounts`.
- Also condensed `docs/CONTEXT.md` back under its line budget (had drifted
  to 201 lines across several recent features).
- Tested: `npm run build` clean; verified live with cookie-simulated filter
  states on all three pages — Calls page's outcome mix changed correctly
  under `af_status=QUALIFIED`, Principal's View and Analytics both render
  without error under the same state.

## 2026-10-10 — fix: nav header wrapped onto two lines
- `components/nav.tsx`: the profile email link had `truncate` with no
  `max-w-*`, so it never actually truncated — combined with the longer
  "Principal's View" tab label, the header's content overflowed its fixed
  `max-w-6xl` container on every screen size, pushing "Sign out" + the
  north arrow onto a second line. Fixed: `max-w-[170px]` on the email link,
  grouped email/sign-out/arrow into one flex cluster (so if it ever does
  wrap, it wraps as a unit instead of splitting), trimmed header/tab
  padding and gaps.
- Tested: `npm run build` clean.

## 2026-10-10 — feat: verdict field + "Principal's View" rename
- New `calls.verdict` column (`drizzle/0003_sudden_energizer.sql`): one or
  two plain-English sentences from Gemini on whether a lead is worth the
  designer's time, distinct from the structured `criteria`/`reasons`.
  `rubric.txt`, `lib/gemini.ts`, `app/api/vani/call-ended/route.ts` updated;
  shown as a banner on Call detail and inline on the Review queue.
  `scripts/seed-demo.ts` derives a verdict for the 20 historical demo calls
  from their known outcome. See D26.
- Renamed "Overview" to "Principal's View" (`components/nav.tsx`,
  `app/(dashboard)/page.tsx`, `components/sheet-footer.tsx`) — label only,
  route/content unchanged. See D27.
- Tested: `npm run build` clean; migration applied to Neon; re-ran
  `npm run seed-demo`; verified live with a throwaway session — verdict
  banner renders correctly on Call detail (demo T03), "Principal's View"
  renders in nav/heading/sheet title, no server errors.

## 2026-10-10 — fix: drafting-sheet grid was hidden; add sign-out + profile page
- `app/(dashboard)/layout.tsx`: removed a solid `bg-[#E7E4DD]` on the root
  wrapper that painted over the body's graph-paper grid on every dashboard
  page — the grid (added earlier) was only ever visible on `/login`.
- `components/nav.tsx`: added a "Sign out" button and turned the email into
  a link to a new profile page.
- `app/(dashboard)/actions.ts` (new): `signOutAction`, `updateProfile`.
- `app/(dashboard)/profile/page.tsx` (new, sheet A-06 in `sheet-footer.tsx`):
  shows the signed-in email, a form to set a display name (stored on the
  existing but previously-unused Auth.js `user.name` column), and a sign-out
  button.
- `lib/auth.ts`: added a `session` callback + `next-auth` module
  augmentation so `session.user.id` is available (needed by `updateProfile`
  to know which row to update).
- Tested: `npm run build` clean; verified live with a throwaway DB session —
  grid renders on dashboard pages (wrapper's solid background class
  confirmed gone from rendered HTML), nav shows the sign-out button and
  profile link, profile page read/write round-trip confirmed directly
  against the `user` table.

## 2026-10-10 — feat: approved starting-rate pricing (reverses D02)
- `vani_agent_prompt.md`: guardrail 1 now lets the agent state one fixed
  starting rate once it knows home vs. office (₹1,800/sq ft or
  ₹1,200/sq ft), never a computed total. `rubric.txt` section 0 updated to
  match.
- `lib/gemini.ts`: redefined what sets `price_mentioned` — now only pricing
  *beyond* the approved line, not any price language at all, so the
  sanctioned starting-rate line no longer trips `PRICE_SPOKEN` or the
  escalation alert.
- `app/(dashboard)/analytics/page.tsx`, `scripts/eval.ts`: relabeled
  "Prices spoken" to "Price overreach" to match the new meaning (column/
  field names unchanged).
- See DECISIONS.md D25 for the full reasoning and what's still forbidden.
- Tested: `npm run build` clean. Not yet tested against a live call — the
  updated prompt still needs to be re-pasted into the Vaani dashboard.

## 2026-10-10 — phase-6: Vaani agent ID + webhook registered
- Looked up the "Aangan Leads Inbound" agent's id via Vaani's
  `GET /api/agents?search=` list-agents API (using the existing
  `VANI_API_KEY`) instead of copying it from the dashboard — confirmed
  Vaani has no API for webhook configuration, so that step stayed manual.
- Set `VANI_AGENT_ID` in `.env.local` and added it to Vercel production
  (`vercel env add`).
- Registered the call-ended webhook in the Vaani dashboard: Agent Webhook
  scoped to "Aangan Leads Inbound", endpoint `APP_URL/api/vani/call-ended`,
  event **Call Post-Processing**, secret matching `VANI_WEBHOOK_SECRET`.
- Phone number (`VANI_PHONE_NUMBER`) intentionally deferred — not part of
  this step.
- No code changed; docs-only commit per the project's memory rule.

## 2026-10-10 — style: drafting-sheet grid background
- `app/globals.css`: added a two-tier graph-paper grid to `body` (20px fine
  lines, 100px bold lines, both translucent black) so the concrete ground
  behind cards/tiles reads as drafting-sheet paper, matching the corner
  marks / ruler strip / title blocks already in place (D24).
- Tested: `npm run build` clean, dev server smoke-tested on `/login`.

## 2026-10-10 — feat: dashboard restyle — "Drafting Room" (architectural)
- Replaced "Midnight Bento" with an architectural-drawing-set theme:
  `app/globals.css` tokens (concrete `#E7E4DD` ground, `#111111` ink,
  `#FF4B1F` the one alarm color, `--radius: 0`), Space Grotesk
  (`app/layout.tsx`). See DECISIONS D24.
- `components/ui/card.tsx`, `button.tsx`, `input.tsx`, `table.tsx`: fixed
  hardcoded `rounded-xl`/ring styling that bypassed the theme variables, so
  the palette swap actually reaches every shadcn primitive.
- New shared chrome: `components/drafting-marks.tsx` (corner registration
  marks, ruler strip, north-arrow glyph), `components/sheet-footer.tsx`
  (per-page drawing title block, sheet numbers A-01–A-05), both wired into
  `app/(dashboard)/layout.tsx`; `components/nav.tsx` redesigned to match.
- `components/status-chip.tsx`: drafting-convention chip styles (solid
  fill = confirmed, dashed = provisional, grayed = excluded, orange =
  alarm) replacing the old color-coded pill chips.
- Rewrote every page's hardcoded colors (Overview, Calls, Call detail,
  Review queue, Analytics + its three chart components, Settings +
  `copy-field.tsx`/`test-connection-button.tsx`) and the login page.
- Confirmed the direction first on a 4-option mockup canvas (warm
  minimalist, blueprint/technical, concrete/brutalist, refined Midnight
  Bento) before implementing, per explicit request.
- Tested: `npm run build` clean; all six pages + login verified live
  against real seeded data (test session created directly in the DB,
  removed after) — correct sheet numbers on every page (A-01 through
  A-02.1), correct chip rendering, no console/server errors.

## 2026-10-10 — feat: persistent contacts, keyed by phone number
- New `contacts` table (`lib/db/schema.ts`): `id`, `phone_number` (unique),
  `created_at`. `calls.contact_id` references it.
- `lib/contacts.ts`: `getOrCreateContact(phoneNumber)` — looks up or
  creates a contact, race-safe via `onConflictDoNothing` + re-select.
  Wired into `app/api/vani/call-ended/route.ts` (both insert and the
  idempotent-upsert path) and `scripts/seed-demo.ts`.
- Call detail page: a "Caller history" card listing the contact's other
  calls (date + outcome chip, linked). See DECISIONS D23.
- Tested: `getOrCreateContact` directly — same number reuses the same id,
  a different number gets a new one, `null` phone returns `null` without
  creating a row. Two calls manually linked to one contact confirmed the
  "Caller history" card renders the right call, date, and chip. `npm run
  seed-demo` re-run backfilled `contact_id` for all 20 demo calls (20
  distinct contacts, one per transcript's synthesized number). `npm run
  build` clean, migration applied to the real database.

## 2026-10-09 — fix: real Vaani AI webhook auth (HMAC, not shared header)
- Checked the actual voice platform's docs (Vaani AI, `docs.vaanivoice.ai`)
  before Phase 6 instead of using Phase 2's placeholder. Two real-world
  corrections: `app/api/vani/call-ended/route.ts` now verifies
  `X-Vaani-Signature`/`X-Vaani-Timestamp` HMAC-SHA256 signing (over the raw
  body, with replay-window checking) instead of a plain shared header;
  `lib/vani.ts`'s `normalizeVaniPayload()` now matches the documented
  `call_postprocessing` event shape (data nested under `data`), not
  `call_ended` (which has no transcript at all).
- `scripts/replay.ts` and `seed/payloads/sample-call-ended.json` updated to
  match — replay now signs its request the same way Vaani does.
- No caller phone/name/email field is documented anywhere for this
  platform; left `null` in `normalizeVaniPayload()` rather than guess a
  field name. Recorded as an open assumption (DECISIONS D21).
- Tested: unsigned requests get 401; `npm run replay` (now self-signing)
  gets 200 and the resulting row has correct `started_at`/`duration_s`/
  `ended_reason`/`final_route` from the new payload shape. `npm run build`
  clean.

## 2026-10-09 — phase-5: eval and seed-demo scripts
- `scripts/eval.ts` (`npm run eval`): re-scores all 20 test transcripts
  with Gemini, prints expected-vs-got, agreement %, false negatives, and
  any `price_mentioned`; exits non-zero on a false negative or a spoken
  price. Never feeds `desk_note` (or anything else from `test-set.json`)
  to Gemini — only each transcript file's own text.
- `scripts/seed-demo.ts` (`npm run seed-demo`): inserts the 20 test-set
  calls into the database (`demo-*` vani_call_ids, upserted — safe to
  re-run) so the dashboard has real data before Vani is live. Parses each
  transcript's header line for `started_at`/`duration_s`, best-effort
  extracts the caller's name. Historical calls predate this app's
  automation, so `calcom_booking_id`/`brief`/`telegram_sent_at`/
  `hubspot_*_id` stay null even for QUALIFIED calls — no real booking/deal
  was ever created for them. NOT_A_FIT calls are seeded with
  `review_outcome = 'confirmed_decline'` (front desk handled these in
  September), so they don't appear in the live review queue.
- Fixed a real bug in `scripts/seed-demo.ts` while building it: a static
  `import` of `lib/db.ts` is hoisted ahead of a `config({path:".env.local"})`
  call regardless of source order (ESM evaluates all static imports
  before any top-level code in the importing file), so `DATABASE_URL` read
  as empty. Fixed with a dynamic `await import("../lib/db")` inside
  `main()`. Documented in `docs/CONTEXT.md` as a gotcha for future scripts.
- Tested: `npm run eval` against the real Gemini re-score — **19/19
  (100%) agreement, 0 false negatives, 0 prices spoken**, exit code 0.
  `npm run seed-demo` verified idempotent (re-run doesn't duplicate rows)
  and spot-checked against the live dashboard (Overview, Calls, Call
  detail, Review queue all render the seeded data correctly). `npm run
  build` clean.

## 2026-10-09 — phase-4: the dashboard
- Six pages under `app/(dashboard)/`: Overview, Calls (filters + search +
  CSV export), Call detail (`calls/[id]`, brief/fields/consultation/five
  checks/agreement/transcript/audio/HubSpot link), Review queue (confirm
  decline / send to designer server actions), Analytics (full scorecard,
  hour/weekday charts, 60-day sparklines), Settings (env-var status, test
  connection per service, copyable webhook URLs).
- `components/nav.tsx`, `components/status-chip.tsx`,
  `components/copy-field.tsx`, `components/charts/*` (Recharts).
- `lib/queries.ts`, `lib/analytics.ts`, `lib/rubric-labels.ts`,
  `lib/format.ts`. `lib/hubspot.ts`: added `getDealUrl()` and
  `getDealStages()` (hourly-cached) for the "Open in HubSpot" link and the
  consultation-to-won scorecard metric.
- "Midnight Bento" design tokens in `app/globals.css` (one fixed dark
  theme), Manrope font in `app/layout.tsx`.
- Fixed `lib/calcom.ts`: stored Cal.com's numeric `id` instead of `uid` in
  `calcom_booking_id` — the dashboard's reschedule link needs the uid.
- Decision: `sendToDesigner` sets `final_route = 'QUALIFIED'` so the call
  displays correctly everywhere else and `runPostCallActions()` takes the
  right branch without new branching logic (DECISIONS D20).
- Tested against real data end-to-end (session created directly in the DB
  for testing, removed afterward): all six pages return 200 with correct
  content; `confirmDecline` and `sendToDesigner` both exercised through
  their actual rendered forms — correct DB state, correct skip of Cal.com
  for `sendToDesigner`. `npm run build` clean.

## 2026-10-09 — feat: designer brief uses Gemini (not Claude); GEMINI_MODEL -> latest alias
- `lib/claude.ts`: swapped `@anthropic-ai/sdk` for `@google/genai` — the
  brief now uses the same Gemini credentials as the re-score. Uninstalled
  `@anthropic-ai/sdk`; removed `ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL` from
  `.env.example`. Decision + reasoning in `docs/DECISIONS.md` D19.
- `lib/gemini.ts`, `lib/claude.ts`: `GEMINI_MODEL` default changed from the
  pinned `gemini-3.8-flash` to the `gemini-flash-latest` alias, so this
  doesn't go stale again the way `gemini-2.0-flash` did. Verified against
  the live Gemini models list.
- Tested: `npm run replay` against every real account at once — Cal.com
  booking, Gemini-written brief (correct, ≤120 words, ends with the
  required "Internal — never share:" line), Telegram send, and HubSpot
  contact+deal all succeeded with **zero `step_errors`**. Phase 3 is now
  functionally complete end-to-end. `npm run build` clean.

## 2026-10-09 — fix: wrong HubSpot deal→contact association type id
- `lib/hubspot.ts`: `DEAL_TO_CONTACT_ASSOCIATION_TYPE_ID` was `5`, taken
  from a docs lookup during Phase 3 that turned out wrong — the real
  HubSpot API rejected it with `INVALID_FROM_OBJECT` on the first live
  deal creation. Corrected to `3`, confirmed directly against
  `GET /crm/v4/associations/deals/contacts/labels`. See DECISIONS D18.
- Also created the `ai_call_cost_inr` deal property and the "Consultation
  booked" pipeline stage via the HubSpot API directly (not the UI), using
  the same service-key credentials.
- Tested: `npm run replay` against the real HubSpot account — contact
  create, deal create, stage, and custom property all succeeded
  (`hubspot_contact_id`/`hubspot_deal_id` populated). Only
  `ANTHROPIC_API_KEY` is still missing among the four Phase 3 integrations.
  `npm run build` clean.

## 2026-10-09 — docs: Telegram verified working end-to-end
- No code changes — `TELEGRAM_BOT_TOKEN`, `TELEGRAM_DESIGNER_CHAT_ID`,
  `TELEGRAM_ESCALATION_CHAT_ID` set (both chat IDs the same for now); the
  webhook registered via `setWebhook` against the production URL.
- Tested against the real bot: the designer brief sent with a "Got it"
  button, tapping it hit `/api/telegram` and correctly set
  `telegram_ack_at`. Confirms `lib/telegram.ts`'s send/queue logic and
  `app/api/telegram/route.ts`'s callback handling are both correct.

## 2026-10-09 — docs: Cal.com verified working end-to-end
- No code changes — `CALCOM_API_KEY` and `CALCOM_EVENT_TYPE_ID` (Cal.com's
  default "30 min meeting", id `7409849`) set locally and on Vercel.
- Tested against the real Cal.com account: fetched real slots, booked a
  real test consultation (`calcom_booking_id` and `booked_at` populated on
  the resulting row). Confirms `lib/calcom.ts`'s slot-matching and booking
  logic, and the `cal-api-version` headers, are correct. Test booking and
  rows cleaned up afterward.

## 2026-10-09 — feat: login test mode (empty ALLOWED_EMAILS allows any email)
- `lib/auth.ts`: `signIn` callback now allows any email when
  `ALLOWED_EMAILS` is empty; added `isTestMode()`.
- `app/login/page.tsx`: visible amber warning banner when test mode is
  active, naming `ALLOWED_EMAILS` as the fix.
- Decision + risk recorded in `docs/DECISIONS.md` D17 and flagged at the
  top of `docs/CONTEXT.md` — the live deployment currently has no real
  access gate on the dashboard.
- Tested: `npm run build` clean.

## 2026-10-09 — fix: .env.local loading, stale Gemini model, first deploy
- Fixed `drizzle.config.ts` and `scripts/replay.ts`: both used
  `import "dotenv/config"`, which only loads `.env`, not `.env.local` —
  every var was silently undefined, falling back to a placeholder
  `localhost:5432` connection. This is what made `npm run db:migrate` hang
  (not a real connectivity problem). Both now call
  `config({ path: ".env.local" })` explicitly.
- Fixed `lib/gemini.ts`: `GEMINI_MODEL` defaulted to the now-retired
  `gemini-2.0-flash` (the API 404s and names `gemini-3.8-flash` as the
  replacement). Updated the fallback and `.env.local`/Vercel's value.
- Added `pg`/`@types/pg` as a dev dependency — drizzle-kit prefers it over
  `@neondatabase/serverless`'s websocket driver for `db:migrate` once it's
  installed, which is more reliable in sandboxed/CI-like environments.
- Deployed: pushed to the private GitHub repo
  `Vishweshwar-Mesa/Aangan-Inbound-Calls-Agent` (was public — switched to
  private, since it holds real call transcripts and internal pricing data),
  linked and deployed to Vercel production
  (https://aangan-build-kit.vercel.app), disabled Vercel's default SSO
  deployment protection (it would block Vani/Telegram/cron-job.org, which
  have no Vercel login), applied migrations to the real Neon database.
- Tested: `npm run replay` against the real database and Gemini — the
  webhook correctly upserted the sample call, Gemini routed it `QUALIFIED`
  with the `LARGE` flag (matches rubric.txt's expected answer for that
  transcript), and Cal.com/Claude/Telegram/HubSpot each failed
  independently into `step_errors` with no credentials set, exactly as
  designed. Test row deleted afterward. `npm run build` is clean.

## 2026-10-07 — phase-3: post-call actions
- `lib/pricing.ts`: internal per-sq-ft bands (residential/commercial),
  never caller-facing.
- `lib/claude.ts`: `writeDesignerBrief()` via Anthropic, ≤120 words,
  internal pricing range labelled "never share".
- `lib/calcom.ts`: `bookConsultation()` — Cal.com v2 slots + booking,
  `chrono-node` for matching natural-language preferred times.
- `lib/telegram.ts`: `sendDesignerBrief()` (after-hours queuing via a null
  `telegram_sent_at`), `sendEscalation()`, `sendReminder()`.
- `lib/hubspot.ts`: `upsertContactAndDeal()` — contact find-or-create,
  "Consultation booked" stage lookup by label, deal + association.
- `app/api/telegram/route.ts`: the "Got it" callback handler.
- `app/api/cron/route.ts`: sends queued briefs, sends the 30-minute
  reminder once per call (new `reminder_sent_at` column — DECISIONS D15).
- Fixed a real bug: `lib/db.ts`, `drizzle.config.ts`, `lib/claude.ts`,
  `lib/gemini.ts` used `??` for env-var fallbacks, which doesn't catch an
  env var that's present-but-empty (as `.env.local` can leave it) — only
  `null`/`undefined`. Switched all four to `||`. Found by testing
  `/api/cron` after creating `.env.local`.
- Tested without live Cal.com/Telegram/HubSpot/Anthropic/database
  credentials: `/api/telegram` and `/api/cron` 401 without their secret;
  `/api/cron`, once authenticated, reaches its database query and fails
  only on the placeholder DB connection. `npm run build` is clean. Not yet
  run against real accounts for any of the four integrations.

## 2026-10-07 — phase-2: the call-ended webhook
- Added `POST /api/vani/call-ended`: verifies `x-webhook-secret`, upserts on
  `vani_call_id` (idempotent — a call with `final_route` already set returns
  200 and does nothing more), re-scores with Gemini, applies the rubric's
  disagreement rules, and runs post-call actions via `after()` so they can't
  block Vani's response. File: `app/api/vani/call-ended/route.ts`.
- Implemented `normalizeVaniPayload()` against the kit's placeholder payload
  shape. File: `lib/vani.ts`.
- Implemented `rescoreCall()`: Gemini at temperature 0, system prompt is the
  full `rubric.txt` plus the JSON-only/`price_mentioned` instruction, Zod
  validation, one retry, falls back to `NEEDS_REVIEW` if still invalid.
  File: `lib/gemini.ts`.
- Added `lib/post-call.ts`: calls the Phase 3 stubs (Cal.com, Claude,
  Telegram, HubSpot) for `QUALIFIED`/`ESCALATE`, each in its own try/catch
  logging to `step_errors` — ready for Phase 3 to fill in the bodies with no
  changes needed here.
- Added `outputFileTracingIncludes` for the webhook route so `rubric.txt`
  ships in the deployed serverless function. File: `next.config.ts`.
- Added `scripts/replay.ts` (`npm run replay`) to post the sample payload to
  the local webhook.
- Tested without live credentials: missing/wrong secret -> 401; malformed
  JSON -> 400; payload without `call_id` -> 400; a valid payload with the
  correct secret reaches the database insert and fails only on
  `ECONNREFUSED` to the placeholder DB URL, confirming the whole pipeline up
  to that point. `npm run build` is clean. Not yet run against a real Neon
  database or Gemini — no credentials in this session.

## 2026-10-07 — chore: commit Next.js's auto-generated AGENTS.md
- `next dev` regenerates `AGENTS.md` (Next 16's built-in agent-rules file,
  flagging breaking changes vs. training data) every run; committing it per
  Next's own guidance keeps the working tree clean between sessions.
- Tested: ran `npm run dev`, confirmed `/` redirects (307) to `/login` and
  `/login` renders (200) via curl, without `.env.local` set.

## 2026-10-07 — phase-1: scaffold, Neon/Drizzle data layer, Auth.js login
- Scaffolded Next.js 16 (App Router, TypeScript, Turbopack) + Tailwind v4 +
  shadcn/ui. Files: `app/`, `components/ui/`, `next.config.ts`,
  `tsconfig.json`, `package.json`.
- Added the Drizzle schema and migration for `calls` plus the Auth.js adapter
  tables, targeting Neon (`DATABASE_URL` pooled, `DATABASE_URL_UNPOOLED`
  direct). Files: `lib/db/schema.ts`, `lib/db.ts`, `drizzle.config.ts`,
  `drizzle/0000_motionless_layla_miller.sql`.
- Added Auth.js (NextAuth v5) email magic-link login via Resend, restricted to
  `ALLOWED_EMAILS`, plus middleware that gates every page behind a session.
  Files: `lib/auth.ts`, `proxy.ts`, `app/login/page.tsx`,
  `app/api/auth/[...nextauth]/route.ts`, `app/page.tsx`.
- Added one stub module per external service per the brief, each throwing
  "not implemented until Phase N": `lib/vani.ts`, `lib/gemini.ts`,
  `lib/claude.ts`, `lib/calcom.ts`, `lib/telegram.ts`, `lib/hubspot.ts`.
- Updated `.env.example` to drop the Supabase vars and add
  `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `RESEND_API_KEY`, `AUTH_SECRET`.
  Updated `.gitignore` to ignore `.env*` except `.env.example`.
- Added `.githooks/pre-commit` and turned it on with
  `git config core.hooksPath .githooks`.
- Recorded the Neon/Drizzle + Auth.js/Resend decision as `docs/DECISIONS.md`
  D14, and updated `CLAUDE.md`/`BUILD_PROMPT.md`'s stack, env var and data
  model sections to match.
- Tested: `npm run build` (production build succeeds without live
  credentials, using placeholder fallbacks in `lib/db.ts` and
  `drizzle.config.ts`). Login and the database were not exercised end-to-end
  yet — no Neon/Resend credentials in this session; see `docs/CONTEXT.md`
  "Run / test / deploy".

## 2026-10-07 — kit
- Added the brief (`CLAUDE.md`), `rubric.txt`, `vani_agent_prompt.md`, the seed test data, and starter memory files.
- Tested: nothing yet. This is the starting point.
