# Context — current state

Rewritten in place after every change. Keep it under 150 lines. Last updated:
2026-10-07, end of Phase 2.

## Where we are

- **Phase:** 2 (call-ended webhook) — done.
- **Next step:** Phase 3, the post-call actions (Cal.com, Claude brief,
  Telegram, HubSpot) — `lib/calcom.ts`, `lib/claude.ts`, `lib/telegram.ts`,
  `lib/hubspot.ts` are still stubs that throw "not implemented until Phase 3";
  `lib/post-call.ts` already calls them and logs each failure to
  `step_errors`, so Phase 3 only needs to fill in their bodies.

## What exists in the repo

Phase 1 scaffold (Next.js, Tailwind, shadcn/ui, Drizzle schema/migration,
Auth.js login, `proxy.ts` gate) — unchanged, see git history.

Phase 2 additions:
- `app/api/vani/call-ended/route.ts` — `POST` handler:
  1. Verifies `x-webhook-secret` against `VANI_WEBHOOK_SECRET`.
  2. Normalizes via `lib/vani.ts`, upserts on `vani_call_id`
     (`onConflictDoUpdate`), always storing `raw_payload`.
  3. If the row already has `final_route`, returns 200 immediately
     (idempotent — a replayed call id does nothing twice).
  4. If there's no transcript (missed/failed call), stores a reason and
     returns — nothing for Gemini to score.
  5. Calls `rescoreCall()` (Gemini), applies the disagreement rules from
     `rubric.txt` section 7, sets `final_route`/`flags`.
  6. Returns 200, then runs `lib/post-call.ts`'s `runPostCallActions()` via
     `after()` so Cal.com/Claude/Telegram/HubSpot latency can't hold up
     Vani's response.
- `lib/vani.ts` — `normalizeVaniPayload()` implemented against
  `seed/payloads/sample-call-ended.json`'s `_ASSUME` shape. Throws if
  `call_id` is missing (can't upsert without it); the route returns 400 in
  that case. **Update only this function** once a real Vani payload arrives.
- `lib/gemini.ts` — `rescoreCall()`: reads `rubric.txt` from disk (cached
  after first read), calls Gemini (`@google/genai`) at temperature 0 with
  `responseMimeType: "application/json"`, validates the response with Zod
  against rubric section 7 plus `price_mentioned`. Retries once on any
  failure (bad JSON or a failed call); still invalid after the retry ->
  returns `{ valid: false, route: "NEEDS_REVIEW", ... }`, which the route
  handler trusts unconditionally (bypasses the disagreement rules).
- `lib/post-call.ts` — new module, `runPostCallActions(callId, opts)`. Not
  one of the Phase 1 per-service modules; it orchestrates across them.
  Kept reusable: Phase 4's review queue "Send to designer" action will call
  it with `{ skipBooking: true }`.
- `next.config.ts` — added `outputFileTracingIncludes` for the webhook route
  so `rubric.txt` ships inside the deployed serverless function (plain
  `fs.readFileSync` of an untracked file would otherwise go missing on
  Vercel).
- `scripts/replay.ts` (`npm run replay`) — posts
  `seed/payloads/sample-call-ended.json` to the local webhook.

## Built and working

- Everything above compiles (`npm run build` clean) and was smoke-tested
  against the local dev server without real credentials:
  - missing/wrong `x-webhook-secret` -> 401
  - malformed JSON body -> 400
  - payload without `call_id` -> 400
  - a valid payload with the secret reaches the database call and fails
    only on `ECONNREFUSED` to the placeholder `localhost:5432` — i.e. the
    whole pipeline before the DB write is confirmed correct.
- Not yet exercised against a real database or Gemini: no `DATABASE_URL` or
  `GEMINI_API_KEY` in this session.

## In progress

- None.

## Env vars

| Var | Status |
| --- | --- |
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | placeholder — fill in from Neon |
| `RESEND_API_KEY` | placeholder |
| `AUTH_SECRET` | placeholder — `openssl rand -base64 33` |
| `ALLOWED_EMAILS` | placeholder — your sign-in email(s) |
| `APP_URL` | placeholder — `http://localhost:3000` for local dev |
| `VANI_WEBHOOK_SECRET` | placeholder — any random string for now; Vani's real header/signature scheme is still unknown |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | placeholder — `rescoreCall()` falls back to `"gemini-2.0-flash"` if `GEMINI_MODEL` is unset |
| Everything else (`VANI_API_KEY`, `CALCOM_*`, `TELEGRAM_*`, `HUBSPOT_*`, `ANTHROPIC_*`, `CRON_SECRET`, `DESIGNER_NAME`) | placeholder, untouched — Phase 3 |

## Open assumptions

- The Vani call-ended payload shape is unknown; `lib/vani.ts` matches only
  the kit's placeholder (`seed/payloads/sample-call-ended.json`'s
  `_ASSUME`). Needs a real payload to verify.
- How Vani actually sends the webhook secret (header vs. signature) is
  unknown — currently a plain `x-webhook-secret` header per CLAUDE.md step 1.
- A call with no transcript (missed/failed) is left with `final_route`
  unset and a note in `reasons`, rather than routed anywhere — not specified
  in CLAUDE.md's Phase 2 steps, this is a gap-filling choice. Revisit once
  real missed-call payloads are seen.
- Three Nikhil confirmations are pending (see DECISIONS D13).
- Consultation-to-won rate is unknown (20% is used only for illustration).
- `lib/auth.ts` hardcodes the Resend "from" address
  (`Aangan Leads <onboarding@resend.dev>`); update once there's a verified
  sending domain.

## Known bugs

- None.

## Run / test / deploy

1. `npm install` (already done).
2. Copy `.env.example` to `.env.local`, fill in `DATABASE_URL`,
   `DATABASE_URL_UNPOOLED` (Neon), `RESEND_API_KEY`, `AUTH_SECRET`
   (`openssl rand -base64 33`), `ALLOWED_EMAILS`, `APP_URL`,
   `VANI_WEBHOOK_SECRET` (any random string), `GEMINI_API_KEY`,
   `GEMINI_MODEL` (e.g. `gemini-2.0-flash`).
3. `npm run db:migrate` to apply the schema to Neon.
4. `npm run dev`, confirm login (see Phase 1 steps).
5. `npm run replay` — posts the sample payload to the local webhook. Check
   the `calls` table (`npm run db:studio`) for a new row with `final_route`
   set and `raw_payload` populated. `step_errors` will show Cal.com/
   Claude/Telegram/HubSpot failures ("not implemented until Phase 3") —
   expected until Phase 3.
6. `npm run build` to confirm the production build is clean.
7. Push to GitHub, import in Vercel, set the same env vars there.

## Pass bars

- **Eval:** all 19 answerable calls routed as expected; 0 false negatives;
  0 prices spoken.
- **Dummy calls:** all 8 behave as described in `seed/dummy-calls.md`.
