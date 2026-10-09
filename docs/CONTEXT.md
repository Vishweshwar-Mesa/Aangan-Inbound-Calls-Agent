# Context — current state

Rewritten in place after every change. Keep it under 150 lines. Last
updated: 2026-10-09, end of Phase 5.

## Where we are

This is an internal capability-testing build, not a live business — no
real customer data. Noted here so "test mode" / open-access items below
are read as config state, not incidents.

- **Phases 1-5 are done.** Scaffold, auth, the call-ended webhook, all four
  post-call integrations, the six-page dashboard, and the eval/seed scripts
  — all built and verified against real accounts (not just type-checked).
- **Eval result: 19/19 (100%) agreement, 0 false negatives, 0 prices
  spoken** — `npm run eval` against the real Gemini re-score, exits 0. The
  dashboard has real demo data from `npm run seed-demo` (all 20 September
  test calls, prefixed `demo-`).
- **Deployed:** https://aangan-build-kit.vercel.app (Vercel project
  `vishu-mesa/aangan-build-kit`). GitHub repo (private):
  `Vishweshwar-Mesa/Aangan-Inbound-Calls-Agent`. **GitHub→Vercel auto-deploy
  is connected** — every `git push` to `main` deploys automatically. Don't
  run manual `vercel --prod`/`vercel deploy` for this project; the user
  requires all deploys to go through Git for every project.
- **Login is in test mode:** `ALLOWED_EMAILS` is empty, so any email can
  sign in. The login page shows a visible warning. Set `ALLOWED_EMAILS`
  (locally and on Vercel) for real access control — see DECISIONS D17.
- **Next step:** Phase 6 (Vani voice agent setup). `VANI_API_KEY` is set;
  still need `VANI_AGENT_ID` and `VANI_PHONE_NUMBER` from the Vani
  dashboard once an agent is created there.

## What exists in the repo

- **Phase 1-2:** Next.js scaffold, Drizzle schema/migrations against Neon,
  Auth.js login, `proxy.ts` page gate, `POST /api/vani/call-ended`.
- **Phase 3:** `lib/calcom.ts` (booking), `lib/claude.ts` (designer brief —
  uses Gemini, not Anthropic's Claude; see D19), `lib/telegram.ts` (send +
  "Got it" ack + reminders), `lib/hubspot.ts` (contact/deal + portal/stage
  lookups), orchestrated by `lib/post-call.ts`. `app/api/telegram/route.ts`
  and `app/api/cron/route.ts`. All four confirmed working end-to-end
  against real accounts via `npm run replay`, zero `step_errors`.
- **Phase 4:** six pages under `app/(dashboard)/` (shared `layout.tsx` with
  `components/nav.tsx`): Overview (`page.tsx`), Calls (`calls/`), Call
  detail (`calls/[id]/`), Review queue (`review/`, with server actions
  `confirmDecline`/`sendToDesigner` in `review/actions.ts`), Analytics
  (`analytics/`, with the full scorecard), Settings (`settings/`, env-var
  status + per-service "Test connection" + copyable webhook URLs). Data
  layer: `lib/queries.ts`, `lib/analytics.ts`. "Midnight Bento" design
  tokens live in `app/globals.css` (`:root`/`.dark` are intentionally
  identical — one fixed dark theme, no toggle); Manrope font; Recharts for
  the hour/weekday/sparkline charts.
- **Verified live** (session created directly in the DB for testing, then
  deleted): all six pages render correctly with real data; `confirmDecline`
  and `sendToDesigner` both tested via their actual rendered forms (not just
  code review) — `sendToDesigner` correctly sets `final_route='QUALIFIED'`
  (D20), runs the brief/Telegram/HubSpot steps, and skips Cal.com.

## Env vars

Set, locally and on Vercel: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`,
`GEMINI_API_KEY`, `GEMINI_MODEL` (`gemini-flash-latest` — an alias, not a
pinned version), `RESEND_API_KEY`, `AUTH_SECRET`, `VANI_WEBHOOK_SECRET`,
`TELEGRAM_WEBHOOK_SECRET`, `CRON_SECRET`, `APP_URL`, `CALCOM_API_KEY`,
`CALCOM_EVENT_TYPE_ID` (Cal.com's default "30 min meeting", id `7409849`),
`TELEGRAM_BOT_TOKEN` (@Aangan_Inbound_BOT), `TELEGRAM_DESIGNER_CHAT_ID`,
`TELEGRAM_ESCALATION_CHAT_ID` (same chat ID for both, for now),
`HUBSPOT_PRIVATE_APP_TOKEN` (this account's "service key", not a classic
private-app token — same Bearer auth either way), `VANI_API_KEY`.

Still placeholder: `ALLOWED_EMAILS` (empty = test mode), `VANI_AGENT_ID`,
`VANI_PHONE_NUMBER`, `DESIGNER_NAME`.

## Open assumptions

- Cal.com v2 header `cal-api-version`: `2024-09-04` for `/slots`,
  `2026-02-25` for `/bookings` — re-verify if these ever start 400ing.
- "Front desk chat" in the cron reminder reuses `TELEGRAM_ESCALATION_CHAT_ID`
  (DECISIONS D16); HubSpot's deal-to-contact association type is `3`,
  confirmed live (D18).
- Preferred-time matching (`chrono-node`) uses a 90-minute tolerance, not
  exact.
- Vani's real payload shape, and how it sends the webhook secret, are
  unknown — `lib/vani.ts` matches only the kit's placeholder.
- Three Nikhil confirmations are pending (DECISIONS D13): the timeline
  cutoff, the sub-500-sqft office rule, the budget floors.
- Consultation-to-won rate is unknown; `getWonRates()` in `lib/analytics.ts`
  will show "not measured yet" until enough deals close in HubSpot.

## Known bugs

- None currently open. `lib/calcom.ts` now stores Cal.com's `uid` (not the
  numeric `id`) in `calcom_booking_id`, since the dashboard's reschedule
  link needs the uid — fixed during Phase 4 before any real data relied on
  the old value.
- **Gotcha to remember for any future script:** a script that does
  `config({ path: ".env.local" })` (dotenv) then a *static* `import` of
  `lib/db.ts` will read `DATABASE_URL` as empty — ESM evaluates all static
  imports before any top-level code in the importing file, regardless of
  source order. `scripts/seed-demo.ts` works around it with a dynamic
  `await import("../lib/db")` inside `main()`, after `config()` has run.
  `scripts/eval.ts`/`replay.ts` don't need this since the lib files they
  import read env vars lazily inside function bodies, not at module load.

## Run / test / deploy

1. `.env.local` has every credential above except `ALLOWED_EMAILS`,
   `VANI_AGENT_ID`, `VANI_PHONE_NUMBER`, `DESIGNER_NAME`. Vercel's
   production env vars match.
2. `npm run dev`, sign in via the test-mode login (any email), browse the
   dashboard at `localhost:3000`.
3. `npm run replay` to push a sample call through the whole pipeline; check
   `step_errors` on the resulting row for anything failing.
4. `npm run eval` to re-score all 20 test transcripts against the rubric
   (pass bar: 19/19 agreement, 0 false negatives, 0 prices spoken — exits
   non-zero otherwise). `npm run seed-demo` to (re-)populate the dashboard
   with those 20 calls (`demo-*` vani_call_ids, safe to re-run).
5. `npm run build` before committing.
6. `git push` — Vercel deploys automatically. Never run a manual
   `vercel --prod`/`vercel deploy` for this project.
7. Still to do, not blocked on more credentials: `ALLOWED_EMAILS` (your
   call), schedule `GET $APP_URL/api/cron` every 10 minutes on
   cron-job.org with header `Authorization: Bearer <CRON_SECRET>`.

## Pass bars

- **Eval:** all 19 answerable calls routed as expected; 0 false negatives;
  0 prices spoken.
- **Dummy calls:** all 8 behave as described in `seed/dummy-calls.md`.
