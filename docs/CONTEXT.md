# Context — current state

Rewritten in place after every change. Keep it under 150 lines. Last
updated: 2026-10-10, mid-Phase 6. Full reasoning for every decision
mentioned here lives in `docs/DECISIONS.md` — this file only summarizes.

## Where we are

This is an internal capability-testing build, not a live business — no
real customer data. Noted here so "test mode" / open-access items below
are read as config state, not incidents.

- **Phases 1-5 are done.** Scaffold, auth, the call-ended webhook, all four
  post-call integrations, the six-page dashboard, and the eval/seed scripts
  — all built and verified against real accounts (not just type-checked).
- **Eval result: 19/19 (100%) agreement, 0 false negatives, 0 price
  overreach** — `npm run eval` against the real Gemini re-score, exits 0.
  The dashboard has real demo data from `npm run seed-demo` (all 20
  September test calls, prefixed `demo-`).
- **Deployed:** https://aangan-build-kit.vercel.app (Vercel project
  `vishu-mesa/aangan-build-kit`). GitHub repo (private):
  `Vishweshwar-Mesa/Aangan-Inbound-Calls-Agent`. **GitHub→Vercel auto-deploy
  is connected** — every `git push` to `main` deploys automatically. Don't
  run manual `vercel --prod`/`vercel deploy` for this project; the user
  requires all deploys to go through Git for every project.
- **Login is in test mode:** `ALLOWED_EMAILS` is empty, so any email can
  sign in. The login page shows a visible warning. Set `ALLOWED_EMAILS`
  (locally and on Vercel) for real access control — see D17.
- **Phase 6 (Vaani) — webhook signature issue just fixed, unverified.**
  Platform is **Vaani AI** (`app.vaanivoice.ai`). Agent "Aangan Leads
  Inbound" (`VANI_AGENT_ID=3f53df76-f3ff-4514-b5e2-31fa586fa1bc`, found via
  Vaani's `GET /api/agents` API) has: system prompt live, greeting set,
  English-only (D22), webhook registered/active, content-safety guardrails
  on (`level: strict` — set via Vaani's API). Vaani has a **built-in WebRTC
  test-call feature** (Conversations → History) — no phone number needed.
  **A real test call didn't reach our dashboard**: `vercel logs` showed the
  webhook got 401'd — Vercel's `VANI_WEBHOOK_SECRET` was stale (set before
  the webhook was registered today). Reset to match `.env.local` (D30) —
  **needs a fresh deploy + another test call to confirm fixed**. A full
  transcript review of that test call also found a live-agent bug: it
  wrongly rejected a 15,000 sq ft villa using an office-only size cap —
  fixed by clarifying `vani_agent_prompt.md`'s wording, no cap on homes
  (D31), confirmed against the real T12 precedent (5,500 sq ft villa,
  QUALIFIED). No knowledge base/FAQ in use, deliberately. **Still open:**
  agent **not published** (`published_at: null`); no phone number
  (deliberately deferred) — not blocking WebRTC-based testing.
- **Pricing policy (D25, reverses D02):** the agent may state one fixed
  starting rate once it knows home vs. office (₹1,800/sq ft or
  ₹1,200/sq ft), never a computed total. `price_mentioned` now means
  "beyond the approved line," not "any price at all"; dashboard metric is
  "Price overreach."
- **Dashboard restyle "Drafting Room" (D24)** replaced "Midnight Bento":
  concrete ground, hard black rules, zero radius, Space Grotesk, drafting
  chrome (`components/drafting-marks.tsx`, `sheet-footer.tsx`), a
  graph-paper grid behind every page (a layout bug briefly hid it — fixed).
- **Added since:** a persistent `contacts` table by phone number (D23);
  sign-out + a `/profile` page for a display name (`app/(dashboard)/actions.ts`,
  `lib/auth.ts` session callback); a `verdict` field — Gemini's plain
  "worth pursuing or not" line, on Call detail and the Review queue (D26);
  "Overview" renamed "Principal's View" (D27); a nav overflow bug (fixed).
- **Global date-range + status filters (D28):** one shared control
  (`components/global-filters.tsx`, presets Today/7D/30D/90D × status
  All/Qualified/Not a fit/Needs review/Escalated) now drives Principal's
  View, Calls, and Analytics, replacing each page's separate local picker.
  Persisted in cookies (`lib/filters.ts`), not the URL — see D28 for why.
- **Known gaps, requested but not yet built:** (1) a designer-by-designer
  workload view (names + caseload), scoping unfinished; (2) HubSpot only
  gets name/email/phone/cost today — property type, locality, budget, scope
  etc. aren't pushed as HubSpot properties despite being collected.

## What exists in the repo

- **Phase 1-2:** Next.js scaffold, Drizzle schema/migrations against Neon,
  Auth.js login, `proxy.ts` page gate, `POST /api/vani/call-ended`.
- **Phase 3:** `lib/calcom.ts` (booking), `lib/claude.ts` (designer brief —
  uses Gemini, not Anthropic's Claude; see D19), `lib/telegram.ts` (send +
  "Got it" ack + reminders), `lib/hubspot.ts` (contact/deal + portal/stage
  lookups — see "known gaps" above), orchestrated by `lib/post-call.ts`.
  `app/api/telegram/route.ts` and `app/api/cron/route.ts`. All four
  confirmed working end-to-end via `npm run replay`, zero `step_errors`.
- **Phase 4:** six pages under `app/(dashboard)/` (shared `layout.tsx` +
  `components/nav.tsx`): Principal's View (`page.tsx`), Calls (`calls/`),
  Call detail (`calls/[id]/`), Review queue (`review/`, server actions
  `confirmDecline`/`sendToDesigner`), Analytics (`analytics/`, full
  scorecard), Settings (`settings/`). Data layer: `lib/queries.ts`,
  `lib/analytics.ts`, `lib/filters.ts`/`filter-options.ts` (D28).
- **Verified live** (session created directly in the DB for testing, then
  deleted, repeated for every feature above): all pages render correctly
  with real data; `confirmDecline`/`sendToDesigner` tested via their actual
  rendered forms — `sendToDesigner` sets `final_route='QUALIFIED'` (D20),
  runs brief/Telegram/HubSpot, skips Cal.com.

## Env vars

Set, locally and on Vercel: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`,
`GEMINI_API_KEY`, `GEMINI_MODEL` (`gemini-flash-latest`, an alias),
`RESEND_API_KEY`, `AUTH_SECRET`, `VANI_WEBHOOK_SECRET`,
`TELEGRAM_WEBHOOK_SECRET`, `CRON_SECRET`, `APP_URL`, `CALCOM_API_KEY`,
`CALCOM_EVENT_TYPE_ID` (id `7409849`), `TELEGRAM_BOT_TOKEN`,
`TELEGRAM_DESIGNER_CHAT_ID`, `TELEGRAM_ESCALATION_CHAT_ID` (shared for now),
`HUBSPOT_PRIVATE_APP_TOKEN` (service key), `VANI_API_KEY`, `VANI_AGENT_ID`
(`3f53df76-f3ff-4514-b5e2-31fa586fa1bc`).

Still placeholder: `ALLOWED_EMAILS` (empty = test mode),
`VANI_PHONE_NUMBER`, `DESIGNER_NAME`.

## Open assumptions

- Cal.com v2 header `cal-api-version`: `2024-09-04` for `/slots`,
  `2026-02-25` for `/bookings` — re-verify if these ever start 400ing.
- "Front desk chat" reuses `TELEGRAM_ESCALATION_CHAT_ID` (D16); HubSpot's
  deal-to-contact association type is `3`, confirmed live (D18).
- Preferred-time matching (`chrono-node`) uses a 90-minute tolerance.
- No caller phone/name/email field is documented in Vaani's
  `call_postprocessing` payload — update `lib/vani.ts` once a real call
  comes through (D21).
- Three Nikhil confirmations pending (D13): timeline cutoff, sub-500-sqft
  office rule, budget floors.
- Consultation-to-won rate unknown; `getWonRates()` shows "not measured
  yet" until deals close in HubSpot.

## Known bugs

- None currently open. **Fixed (D29):** Cal.com bookings failed with "no
  contact method" whenever Vani's payload had no caller email (which is
  always, per its documented shape) — `caller_email`/`caller_name` now fall
  back to Gemini's transcript-extracted `fields.email`/`fields.name`, since
  the agent's own script requires collecting an email on every qualified
  call. `caller_number` has no equivalent fallback (not spoken on the
  call); not blocking since email alone satisfies Cal.com.
- **Gotcha for any future script:** `config({ path: ".env.local" })`
  (dotenv) then a *static* `import` of `lib/db.ts` reads `DATABASE_URL` as
  empty — ESM hoists static imports ahead of top-level code regardless of
  source order. `scripts/seed-demo.ts` works around it with a dynamic
  `await import("../lib/db")` inside `main()`, after `config()` runs.

## Run / test / deploy

1. `.env.local` has every credential above except `ALLOWED_EMAILS`,
   `VANI_PHONE_NUMBER`, `DESIGNER_NAME`. Vercel's production env matches.
2. `npm run dev`, sign in via test-mode login (any email).
3. `npm run replay` to push a sample call through the pipeline; check
   `step_errors` on the resulting row.
4. `npm run eval` (pass bar: 19/19 agreement, 0 false negatives, 0 price
   overreach). `npm run seed-demo` to (re-)populate demo data.
5. `npm run build` before committing.
6. `git push` — Vercel deploys automatically. Never run a manual
   `vercel --prod`/`vercel deploy` for this project.
7. Still to do, not blocked on credentials: `ALLOWED_EMAILS` (your call),
   schedule `GET $APP_URL/api/cron` every 10 minutes on cron-job.org with
   header `Authorization: Bearer <CRON_SECRET>`; publish the Vaani agent
   and attach a phone number when ready.

## Pass bars

- **Eval:** all 19 answerable calls routed as expected; 0 false negatives;
  0 price overreach.
- **Dummy calls:** all 8 behave as described in `seed/dummy-calls.md`.
