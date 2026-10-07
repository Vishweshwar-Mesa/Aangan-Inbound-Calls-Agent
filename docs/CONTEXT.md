# Context — current state

Rewritten in place after every change. Keep it under 150 lines. Last updated:
2026-10-07, end of Phase 1.

## Where we are

- **Phase:** 1 (scaffold) — done.
- **Next step:** Phase 2, the `POST /api/vani/call-ended` webhook.

## What exists in the repo

- Next.js 16 (App Router, TypeScript, Turbopack) + Tailwind v4 + shadcn/ui
  (`components/ui/button,input,label,card`).
- `lib/db/schema.ts` — Drizzle schema: the `calls` table plus the Auth.js
  adapter tables (`user`, `account`, `session`, `verificationToken`).
- `lib/db.ts` — Drizzle client over `@neondatabase/serverless`, using
  `DATABASE_URL` (pooled, HTTP driver).
- `drizzle.config.ts` + `drizzle/0000_*.sql` — migration generated from the
  schema, targets `DATABASE_URL_UNPOOLED` (direct) when applied.
- `lib/auth.ts` — Auth.js (NextAuth v5) with the Drizzle adapter and the
  Resend email provider. `signIn` callback restricts sessions to emails in
  `ALLOWED_EMAILS`.
- `proxy.ts` (Next.js 16's replacement for `middleware.ts`) — redirects to
  `/login` unless a session exists; redirects
  away from `/login` if already signed in. API routes are not gated here —
  each one (webhooks, cron) will check its own secret.
- `app/login/page.tsx` — email form, calls `signIn("resend", ...)`.
- `app/page.tsx` — placeholder home page showing the signed-in email and a
  sign-out button; proves the auth gate works. Phase 4 replaces this with the
  real dashboard.
- `lib/vani.ts`, `lib/gemini.ts`, `lib/claude.ts`, `lib/calcom.ts`,
  `lib/telegram.ts`, `lib/hubspot.ts` — one module per service, each with
  typed function signatures that throw "not implemented until Phase N".
  Phase 2/3 fill in the bodies.
- `.env.example` — all vars from CLAUDE.md, Supabase vars removed.
- `.githooks/pre-commit`, turned on via `git config core.hooksPath
  .githooks` — blocks a commit touching `app/`, `lib/`, `components/`,
  `scripts/`, `drizzle/`, `rubric.txt` or `vani_agent_prompt.md` unless
  `docs/CONTEXT.md` and `CHANGELOG.md` are staged too.
- `seed/`, `rubric.txt`, `vani_agent_prompt.md`, `docs/DECISIONS.md`: unchanged
  from the kit, except the new D14 entry.

## Built and working

- Project scaffold, Drizzle schema + migration (not yet applied — no live
  Neon credentials in this session), Auth.js magic-link login gated by
  `ALLOWED_EMAILS`, middleware page gate, first commit, pre-commit hook.

## In progress

- None. Waiting on Neon/Resend credentials to actually exercise login and
  the database locally (see "Run / test" below).

## Env vars

| Var | Status |
| --- | --- |
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | placeholder — fill in from the Neon project |
| `RESEND_API_KEY` | placeholder |
| `AUTH_SECRET` | placeholder — generate with `openssl rand -base64 33` |
| `ALLOWED_EMAILS` | placeholder — your sign-in email(s), comma-separated |
| `APP_URL` | placeholder — `http://localhost:3000` for local dev |
| Everything else in `.env.example` | placeholder, untouched since Phase 0 |

## Open assumptions

- The Vani call-ended payload shape is unknown; it's in `lib/vani.ts` once
  built (Phase 2).
- Three Nikhil confirmations are pending (see DECISIONS D13).
- Consultation-to-won rate is unknown (20% is used only for illustration).
- `lib/auth.ts` hardcodes the Resend "from" address
  (`Aangan Leads <onboarding@resend.dev>`) since no verified sending domain
  was given. Update it once the studio has one.

## Known bugs

- None.

## Run / test / deploy

1. `cd aangan-build-kit && npm install` (already done in this session).
2. Copy `.env.example` to `.env.local` and fill in: `DATABASE_URL`,
   `DATABASE_URL_UNPOOLED` (from Neon), `RESEND_API_KEY` (from Resend),
   `AUTH_SECRET` (`openssl rand -base64 33`), `ALLOWED_EMAILS` (your email),
   `APP_URL=http://localhost:3000`.
3. Apply the migration: `npm run db:migrate` (uses `DATABASE_URL_UNPOOLED`).
4. `npm run dev`, open `http://localhost:3000` — it redirects to `/login`.
   Enter an email in `ALLOWED_EMAILS`, check the inbox for the Resend link
   (Resend's free tier only delivers to the account owner's verified address
   until a sending domain is added — see Resend's dashboard if the email
   doesn't arrive), click it, and confirm you land on `/` signed in.
   An email not in `ALLOWED_EMAILS` should get a Resend email that still
   leads nowhere useful (the `signIn` callback rejects it).
5. `npm run build` to confirm the production build is clean.
6. Push to GitHub, then import the repo in Vercel and set the same env vars
   there (Vercel project settings → Environment Variables).

## Pass bars

- **Eval:** all 19 answerable calls routed as expected; 0 false negatives;
  0 prices spoken.
- **Dummy calls:** all 8 behave as described in `seed/dummy-calls.md`.
