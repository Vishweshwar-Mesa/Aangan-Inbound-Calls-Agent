# Changelog

One entry per commit, newest first: date, what changed, files, how tested.

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
