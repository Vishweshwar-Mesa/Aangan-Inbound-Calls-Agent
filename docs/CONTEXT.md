# Context — current state

Rewritten in place after every change. Keep it under 150 lines. Last
updated: 2026-10-10, mid-Phase 6.

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
- **Phase 6 in progress.** The voice platform is **Vaani AI**
  (`app.vaanivoice.ai`), not a generic "Vani Labs" — confirmed from the
  account. Agent "Aangan Leads Inbound" created: prompt pasted, greeting
  message set, language **English only, no Hindi fallback** (D22 — platform
  only supports X-primary-with-English-fallback, not the reverse; all 20
  real transcripts are English), "Use Previous Call Contexts" enabled,
  "Feed Context via API" left off. **Not yet published** in Vaani (worth
  checking before expecting live calls to route to it).
  `VANI_AGENT_ID` (`3f53df76-f3ff-4514-b5e2-31fa586fa1bc`) was looked up via
  Vaani's `GET /api/agents` list-agents API (no dashboard click needed) and
  set in `.env.local` and Vercel production. Webhook registered in the
  dashboard (Settings → Webhooks → Agent Webhook, scoped to this agent),
  pointed at `APP_URL/api/vani/call-ended`, event **Call Post-Processing**
  (= the `call_postprocessing` payload `lib/vani.ts` already expects),
  secret set to the existing `VANI_WEBHOOK_SECRET`. Vaani's API has no
  endpoint to configure webhooks programmatically — confirmed by checking
  every documented agent endpoint (deployment, analysis, training,
  experience, persona); it's dashboard-only. Telephony (phone number)
  deliberately deferred — still need `VANI_PHONE_NUMBER` once a number is
  provisioned and linked to the agent.
- **Pricing policy changed (D25, reverses D02):** the agent may now state
  one fixed starting rate once it knows home vs. office — ₹1,800/sq ft or
  ₹1,200/sq ft — but never a computed caller-specific total. Updated in
  `vani_agent_prompt.md`, `rubric.txt`, and the `price_mentioned` definition
  in `lib/gemini.ts` (now means "beyond the approved line", not "any price
  at all"); dashboard metric relabeled "Price overreach". **Not yet live**:
  the updated `vani_agent_prompt.md` still needs to be re-pasted into the
  Vaani agent's system prompt for real calls to use it.
- **Added a `contacts` table** (D23): every call now links to a persistent
  per-phone-number identity via `contact_id`, surfaced as a "Caller
  history" card on the Call detail page. Real Vaani calls will have
  `contact_id = null` until a real caller-phone-number field is found (see
  D21) — tested directly against the linking logic instead.
- **Dashboard restyled: "Drafting Room"** (D24) — replaced "Midnight Bento"
  with an architectural-drawing-set look across all six pages: concrete
  ground, hard black rules, zero radius, Space Grotesk, one orange alarm
  color, corner registration marks, a ruler strip, a north-arrow glyph, and
  a per-page title-block footer (sheet numbers A-01 through A-05). Status
  chips now use drafting convention (solid=confirmed, dashed=provisional,
  grayed=excluded, orange=alarm). A two-tier graph-paper grid (20px fine /
  100px bold lines) sits behind every page as the drafting-sheet ground.
  Verified live against real seeded data, not just type-checked.

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
  layer: `lib/queries.ts`, `lib/analytics.ts`. "Drafting Room" design
  tokens live in `app/globals.css` (`:root`/`.dark` are intentionally
  identical — one fixed light theme, no toggle — see D24); Space Grotesk
  font; Recharts for the hour/weekday/sparkline charts;
  `components/drafting-marks.tsx` and `sheet-footer.tsx` for the shared
  drafting chrome.
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
private-app token — same Bearer auth either way), `VANI_API_KEY`,
`VANI_AGENT_ID` (`3f53df76-f3ff-4514-b5e2-31fa586fa1bc`, looked up via
Vaani's list-agents API, not the dashboard).

Still placeholder: `ALLOWED_EMAILS` (empty = test mode),
`VANI_PHONE_NUMBER`, `DESIGNER_NAME`.

## Open assumptions

- Cal.com v2 header `cal-api-version`: `2024-09-04` for `/slots`,
  `2026-02-25` for `/bookings` — re-verify if these ever start 400ing.
- "Front desk chat" in the cron reminder reuses `TELEGRAM_ESCALATION_CHAT_ID`
  (DECISIONS D16); HubSpot's deal-to-contact association type is `3`,
  confirmed live (D18).
- Preferred-time matching (`chrono-node`) uses a 90-minute tolerance, not
  exact.
- The voice platform is **Vaani AI** (`app.vaanivoice.ai`). Webhook auth
  (HMAC-SHA256, `X-Vaani-Signature`/`X-Vaani-Timestamp`) and the
  `call_postprocessing` event/payload shape are confirmed from real docs
  (DECISIONS D21) — but no caller phone/name/email field is documented
  anywhere, and no real payload has been seen yet. Update `lib/vani.ts`
  once a real call comes through.
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
