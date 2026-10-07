# Aangan Leads — Claude Code build prompt

How to use: unzip the kit into an empty folder. This file is also saved as
`CLAUDE.md`, which Claude Code reads at the start of every session. Start
Claude Code in the folder and ask it to begin Phase 1. Claude Code works phase by phase and stops after each one so you can
check it.

---

You're building **Aangan Leads**, a phone-enquiry system for Aangan Studio, an
interior design firm in Pune. Read this whole brief before writing any code,
then work through the phases in order. **Stop at the end of each phase**, tell
me what you built and how to test it, and wait for me to say "next".

## What it does

An AI voice agent on Vani Labs answers every call to the studio, day or night.
It asks the intake questions, qualifies the caller against `rubric.txt`, and
collects an email and two preferred times from qualified callers. Vani has no
outside access while a call is live, so everything else happens after the call
ends, when Vani posts the call to our webhook. The webhook then:

1. Saves the call.
2. Re-scores it with Gemini against `rubric.txt`.
3. For qualified callers: books the consultation in Cal.com, has Claude write a
   designer brief, sends it to the designer on Telegram, and creates a contact
   and deal in HubSpot.
4. For existing clients: alerts Nikhil on Telegram, marked URGENT.
5. For declined callers: puts them in a review queue for the front desk.

A six-page dashboard shows all of this to designers and the front desk.
Nikhil watches his funnel in HubSpot.

## Hard rules

- The system never states a price anywhere a caller can see or hear it. Prices
  appear only in the designer's Telegram brief, labelled "internal — never share".
- The AI never deletes or hides a declined caller. Every NOT_A_FIT goes to the
  review queue.
- Each post-call step (Cal.com, Claude, Telegram, HubSpot) runs in its own
  try/catch. A failure is logged on the call and never stops the other steps.
- The webhook must be idempotent: the same Vani call id processed twice must
  not double-book or double-send.
- Secrets live only in env vars. Commit `.env.example`, never `.env`. The
  direct (unpooled) database connection and the Resend API key are used
  server-side only.

## Project memory — keep it current, locally and on Git

This project is built across several sessions, so its memory lives in files,
not in the chat. Three files are the source of truth:

- **`docs/CONTEXT.md`** — the current state. It is rewritten in place and kept
  under 150 lines. It covers:
  - what's built and working
  - what's in progress
  - the next step
  - which env vars are set and which are still placeholders
  - every open `// ASSUME:` with its file path
  - known bugs
  - how to run, test and deploy
- **`docs/DECISIONS.md`** — an append-only log. Each entry records the date,
  the decision, why it was made, and what was rejected. Never edit or delete
  past entries. If a decision is reversed, add a new entry that points to the
  old one.
- **`CHANGELOG.md`** — one dated entry per commit: what changed, which files,
  and how it was tested.

**Rules:**

1. **At the start of every session,** read `CLAUDE.md`, `docs/CONTEXT.md` and
   the last 10 entries of `docs/DECISIONS.md` before doing anything. Then tell
   me in three lines where we are and what's next.
2. **After every change that touches code, config, prompts or the schema,**
   update `docs/CONTEXT.md` and `CHANGELOG.md` before committing. Add a
   `docs/DECISIONS.md` entry whenever we choose between options, change
   `rubric.txt` or `vani_agent_prompt.md`, or I overrule this brief.
3. **Commit the memory files with the change they describe**, in the same
   commit.
   - Message format: `phase-N: <what changed>`, e.g.
     `phase-2: add Gemini re-score with retry`.
   - Push to GitHub at the end of every phase, and whenever I say "save".
4. **Enforce it with a Git hook.** In Phase 1, create `.githooks/pre-commit`
   that blocks a commit when files under `app/`, `lib/`, `components/`,
   `scripts/`, `drizzle/`, `rubric.txt` or `vani_agent_prompt.md` changed but
   `docs/CONTEXT.md` and `CHANGELOG.md` did not. Turn it on with
   `git config core.hooksPath .githooks`. Bypass it only when I explicitly say
   so.
5. **If this brief and `docs/CONTEXT.md` disagree,** the most recent dated
   entry in `docs/DECISIONS.md` wins. Tell me about the conflict.
6. **Never write secrets** (keys, tokens, real caller numbers or emails) into
   any memory file. Use env var names and placeholders.
7. **Before you run out of context, or when I say "wrap up",** update all three
   files and commit, so the next session can start cold.

## Stack

- Next.js (App Router, TypeScript) + Tailwind + shadcn/ui, deployed on Vercel
  from GitHub.
- Neon Postgres with Drizzle ORM — `DATABASE_URL` (pooled) for the app,
  `DATABASE_URL_UNPOOLED` (direct) for migrations. Auth.js (NextAuth) email
  magic links via Resend, restricted to `ALLOWED_EMAILS`. No Supabase. See
  `docs/DECISIONS.md` D14.
- Recharts for charts. Zod for validating every external payload and every AI
  JSON response.
- Gemini (Flash) for re-scoring; Claude for the designer brief. Read the model
  names from env vars.
- Cal.com API v2, Telegram Bot API, HubSpot CRM API (free tier, private app
  token).
- Timezone everywhere: `Asia/Kolkata`.

## Environment variables — create `.env.example` with exactly these

```
VANI_API_KEY=
VANI_AGENT_ID=
VANI_PHONE_NUMBER=
VANI_WEBHOOK_SECRET=
CALCOM_API_KEY=
CALCOM_EVENT_TYPE_ID=
TELEGRAM_BOT_TOKEN=
TELEGRAM_DESIGNER_CHAT_ID=
TELEGRAM_ESCALATION_CHAT_ID=
TELEGRAM_WEBHOOK_SECRET=
HUBSPOT_PRIVATE_APP_TOKEN=
GEMINI_API_KEY=
GEMINI_MODEL=
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=
DATABASE_URL=
DATABASE_URL_UNPOOLED=
RESEND_API_KEY=
AUTH_SECRET=
APP_URL=
ALLOWED_EMAILS=
CRON_SECRET=
DESIGNER_NAME=
```

## Data model — one table, `calls`

Write this as a Drizzle schema (`lib/db/schema.ts`), generated into `drizzle/`.
Neon has no row-level security, so access control is enforced in server code
instead: Next.js middleware gates every page behind a session whose email is
in `ALLOWED_EMAILS` (checked at sign-in, in `lib/auth.ts`), and the webhook
and all writes go through server-only code using a connection that's never
exposed to the client.

| column | type | notes |
| --- | --- | --- |
| id | uuid pk | default gen_random_uuid() |
| vani_call_id | text unique | idempotency key |
| raw_payload | jsonb | the untouched Vani payload, for debugging |
| caller_number, caller_name, caller_email | text | |
| started_at | timestamptz | |
| duration_s | int | |
| ended_reason | text | completed / hung_up / failed / missed |
| recording_url | text | |
| transcript | text | |
| agent_route | text | the agent's live decision, if Vani returns it |
| gemini_route | text | QUALIFIED / NEEDS_REVIEW / NOT_A_FIT / ESCALATE / NOT_ENQUIRY |
| final_route | text | after the disagreement rules below |
| criteria | jsonb | c1–c5: pass / fail / unclear |
| reasons | text | |
| fields | jsonb | locality, property_type, carpet_area_sqft, scope, current_state, completion_needed_by, decision_maker, budget_volunteered, source, consult_type |
| flags | text[] | REFERRAL, LARGE, REPEAT, DECISION, BUDGET, PRICE-ASKED, LANGUAGE, RENTED |
| confidence | numeric | |
| price_mentioned | boolean | Gemini flags whether the agent said any number about cost |
| preferred_times | jsonb | as the caller said them, plus parsed ISO times |
| calcom_booking_id | text | |
| booked_at | timestamptz | the consultation time |
| invite_bounced | boolean | default false |
| brief | text | Claude's brief |
| telegram_sent_at, telegram_ack_at | timestamptz | |
| hubspot_contact_id, hubspot_deal_id | text | |
| review_outcome | text | null / confirmed_decline / sent_to_designer |
| reviewed_by | text | |
| reviewed_at | timestamptz | |
| step_errors | jsonb | { calcom: "...", telegram: "..." } |
| cost_inr | numeric | from Vani's usage figure if present, else duration × rate |
| created_at | timestamptz | default now() |

Add indexes on `started_at`, `final_route` and `review_outcome`.

## Phase 1 — Scaffold (target: 30 min)

- Next.js app, Tailwind, shadcn/ui, the migration, `.env.example`, and a
  `.gitignore` that covers `.env*` except `.env.example`.
- `lib/` modules, one per service: `vani.ts`, `gemini.ts`, `claude.ts`,
  `calcom.ts`, `telegram.ts`, `hubspot.ts`, `db.ts`. Each exports typed
  functions and nothing else.
- Magic-link login. Middleware blocks every page unless the signed-in email is
  in `ALLOWED_EMAILS`.
- Set up project memory:
  - check that `docs/CONTEXT.md`, `docs/DECISIONS.md` and `CHANGELOG.md`
    exist (starter versions are in the kit) and fill in what Phase 1 built
  - create the `.githooks/pre-commit` hook and turn it on
  - make the first commit
- Tell me the exact steps to push to GitHub and deploy on Vercel.
- **Stop.**

## Phase 2 — The call-ended webhook (target: 1 hr)

`POST /api/vani/call-ended`

1. Verify `VANI_WEBHOOK_SECRET`. I'll tell you how Vani sends it (header or
   signature). Until then, accept a header `x-webhook-secret`.
2. I don't yet know Vani's payload shape. Write `normalizeVaniPayload(raw)` in
   `lib/vani.ts` that maps it to our columns, with a clear TODO. Always store
   `raw_payload`. When I paste a real payload, update only this function.
3. Upsert on `vani_call_id`. If the call already has `final_route`, return 200
   and do nothing more.
4. Re-score with Gemini at temperature 0. The system prompt is the full text of
   `rubric.txt`, plus: "Return only the JSON described in section 7 of the
   rubric. Also return price_mentioned: true if the assistant said any number,
   range or per-sq-ft figure about cost." Validate with Zod and retry once on
   invalid JSON. If it is still invalid, set `final_route = NEEDS_REVIEW`.
5. Decide `final_route`:
   - agent QUALIFIED, Gemini disagrees → QUALIFIED (still book), and add flag `RESCORE_DISAGREED`
   - agent NOT_A_FIT, Gemini QUALIFIED → NEEDS_REVIEW
   - no agent route → Gemini's route
   - `price_mentioned = true` → keep the route, add flag `PRICE_SPOKEN`, and alert the escalation chat
6. Return 200 within Vani's timeout. Run step 7 in the same request only if it
   is reliably under 10 s; otherwise use `waitUntil` / after().
7. Then run Phase 3's post-call actions.
- Add `scripts/replay.ts`, which posts `seed/payloads/sample-call-ended.json`
  (a placeholder shape — see its `_ASSUME` field) to the local webhook.
- **Stop.**

## Phase 3 — Post-call actions (target: 1 hr)

Each step logs its own error to `step_errors` and continues.

**QUALIFIED**
1. Cal.com: fetch available slots for `CALCOM_EVENT_TYPE_ID` over the next 5
   working days. Book the first slot that matches either preferred time;
   otherwise book the nearest slot after them. The attendee is the caller's
   name, email and `Asia/Kolkata`. Save `calcom_booking_id` and `booked_at`.
   Cal.com sends the invite.
2. Claude brief, at most 120 words, covering: who called, the property and its
   size, the scope, the timeline, the decision-maker, budget only if
   volunteered, likely job size, an internal indicative range from the pricing
   bands in `lib/pricing.ts` × carpet area (labelled "internal — never share"),
   and the flags.
3. Telegram to `TELEGRAM_DESIGNER_CHAT_ID` (HTML parse mode) with the booked
   time, the brief, a link to `APP_URL/calls/{id}`, and an inline "Got it"
   button.
   - Between 7pm and 9am IST, don't send. Mark it queued for the 9am cron.
4. HubSpot: find the contact by phone or email, or create one. Create a deal in
   stage "Consultation booked", associate it with the contact, and set a deal
   property `ai_call_cost_inr` (tell me how to create that property once in
   HubSpot).

**ESCALATE** — Telegram to `TELEGRAM_ESCALATION_CHAT_ID` immediately, any hour,
prefixed 🔴 URGENT, with the caller's name, number, issue and designer named.

**NOT_A_FIT / NEEDS_REVIEW** — no booking or HubSpot. The call appears in the
review queue.

**Telegram webhook** `POST /api/telegram`: verify the
`X-Telegram-Bot-Api-Secret-Token` header against `TELEGRAM_WEBHOOK_SECRET`. On a
"Got it" tap, set `telegram_ack_at` and edit the message to show
"Acknowledged".

**Cron** `GET /api/cron` (requires `CRON_SECRET`):
- Sends queued after-hours briefs at 9am IST.
- Reminds the designer, and alerts the front desk chat, about any brief not
  acknowledged after 30 working minutes.
- Vercel's free plan only runs cron once a day, so tell me how to trigger this
  every 10 minutes from cron-job.org instead.

`lib/pricing.ts` holds the internal bands from pricing.md: residential
₹1,800–2,400 standard, ₹2,400–3,500 premium, ₹3,500+ luxury per sq ft; commercial
₹1,200–1,800 basic, ₹1,800–2,800 mid, ₹2,800–4,000 premium per sq ft. Add a
comment that these must never reach a caller-facing surface.
- **Stop.**

## Phase 4 — Dashboard (target: 2 hrs)

**Design — Option B, "Midnight Bento"**

- Background `#080C18`, cards `#10172A` with a 1px `#1C2438` border and 18px
  radius, row dividers `#172036`.
- Text `#F3F5FA`, muted text `#A9B2C8`, secondary text `#C2CADB`.
- Primary buttons are pills, `#F3F5FA` background with `#080C18` text.
  Secondary buttons are transparent with a `#2A3450` border.
- Status chips: Qualified `#A8C6FF` on `rgba(143,184,255,.15)`; Needs review
  `#FFC27A`; Not a fit `#C2CADB` on `#1A2238`; Escalated `#FF9B85`.
- Font: Manrope (Google Fonts), tabular numbers for figures.
- Top navigation with pill links: Overview, Calls, Review (with an amber count
  badge), Analytics, Settings. Signed-in name on the right.
- Responsive: the nav wraps, and wide tables scroll inside their card. Visible
  focus rings and 44px touch targets.

**Pages**

1. **Overview** — the date range's call count, a "where calls went" bar
   (qualified / closed / escalated), a white "N calls waiting for review" tile
   with a Review now button, running cost this month, average call length,
   next consultations, and latest calls.
2. **Calls** — table with received, caller and locality, project, outcome chip,
   consultation, and length. Filter pills for All / Qualified / Not a fit /
   Needs review / Escalated, with counts. Search by name, locality or number.
   CSV export.
3. **Call detail** `/calls/[id]`
   - name, outcome chip and flags, number and email
   - brief, plus the fields in a two-column grid, with the internal range
     shown only on this page and labelled
   - consultation card with a link to reschedule in Cal.com
   - Nikhil's five checks as five tiles (pass / fail / unclear + reason)
   - whether the agent and the re-score agreed
   - audio player for `recording_url`, and the transcript
   - an "Open in HubSpot" button
4. **Review queue** — every NOT_A_FIT and NEEDS_REVIEW with no
   `review_outcome`, showing the failed check as a chip, the reason, and what
   the assistant said.
   - "Confirm decline" sets `confirmed_decline`.
   - "Send to designer" sets `sent_to_designer` and runs the QUALIFIED actions,
     except Cal.com. In that case the designer calls the caller to book.
   - Record `reviewed_by` and `reviewed_at`.
5. **Analytics** — date range of 30 days / 60 days / custom, all from `calls`:
   - answer rate (non-missed / all)
   - calls by hour, with 10am–7pm shaded differently from after hours
   - calls by weekday
   - outcome split
   - share handled with no person (QUALIFIED with no review, plus
     confirmed_decline, over all)
   - AI–reviewer agreement (confirmed_decline over all reviewed declines)
   - good leads wrongly declined (`sent_to_designer` count)
   - booking completion (booked over QUALIFIED)
   - invite bounce rate
   - mid-call hang-ups (`ended_reason = hung_up`)
   - prices spoken (`price_mentioned`)
   - average call length
   - cost per call and per qualified lead
   - time to acknowledge (median `telegram_ack_at − telegram_sent_at`)
   - consultation-to-won from HubSpot deal stages, read via API and cached
     hourly

   **Scorecard** — a table at the bottom with target, current value, a 60-day
   sparkline and a status chip (on track / below target / not measured yet).
   Its targets:

   | Metric | Target |
   | --- | --- |
   | Answered | ≥ 99% |
   | No person | ≥ 90% |
   | Agreement | ≥ 95% |
   | Wrongly declined | 0 |
   | Booked | ≥ 95% |
   | Bounces | ≤ 2% |
   | Hang-ups | ≤ 10% |
   | Prices spoken | 0 |
   | Won rate, AI-booked vs desk-booked | at least equal |
   | Review time | ≤ 3 hrs/month (count reviews × 3 min) |

   Never cut the scorecard.
6. **Settings** — each service with its env var names and whether each is set
   (checked server-side; never show values). A "Test connection" button per
   service calls a harmless read endpoint. Webhook URLs to copy. The current
   rubric version, the designer name, and the escalation chat.
- **Stop.**

## Phase 5 — Test set and evaluation (target: 45 min)

- `seed/test-set.json`: the 20 September phone calls with their expected route.

  | Expected route | Calls |
  | --- | --- |
  | QUALIFIED | T01, T02, T05, T06, T11, T12, T13, T14, T15, T16, T17, T20 |
  | NOT_A_FIT | T03, T04, T07, T10, T18, T19 |
  | ESCALATE | T09 |
  | missed | T08 |

  These already exist: `seed/test-set.json` (expected route, criteria, flags
  and key fields for each call) and `seed/transcripts/T01.txt`–`T20.txt`. The
  front-desk notes have been moved out of the transcripts into `desk_note` in
  the answer key, so the model can't read the answer. Never feed `desk_note`
  to Gemini.
- `scripts/eval.ts`
  - runs the Gemini re-score on every transcript
  - prints a table of expected vs got
  - prints the agreement %, false negatives (expected QUALIFIED, got NOT_A_FIT)
    and any `price_mentioned`
  - exits non-zero if a false negative or a spoken price appears
- `scripts/seed-demo.ts` inserts these calls into the database so the dashboard
  has data before Vani is live.
- **Stop.**

## Phase 6 — Voice agent setup (target: 35 min)

`vani_agent_prompt.md` is in the folder. It is the agent's system prompt,
written in the order personality → context → conversational flow →
guardrails.

- Walk me through pasting it into the Vani agent:
  - set the voice and language to Hindi + English
  - point the call-ended webhook at `APP_URL/api/vani/call-ended`, with
    `VANI_WEBHOOK_SECRET`
  - attach the agent to `VANI_PHONE_NUMBER`
- If Vani supports returning structured data at the end of the call (a route,
  email, preferred times), configure it, and update `normalizeVaniPayload` to
  read those fields into `agent_route`, `caller_email` and `preferred_times`.
- The 8 dummy calls are in `seed/dummy-calls.md`, each with its expected
  result. They are:
  1. A clear yes
  2. A clear no on area
  3. Advice only
  4. A 3-week deadline (should be offered a later start)
  5. A volunteered budget that's too low
  6. A rude caller pushing for a price three times
  7. An existing client complaining
  8. A gray-area caller (unclear locality and decision-maker)
- After I place them, check each row in `calls` and tell me which failed and
  why.
- **Stop.**

## Prompt files in this folder

- `rubric.txt` — the qualification logic. Gemini re-scores every call against
  it, and the eval script tests it.
- `vani_agent_prompt.md` — what the voice agent says and must never say.
- Keep the two in step. If one changes, flag what to change in the other.

## When something is unknown

Don't guess API shapes for Vani, Cal.com or HubSpot from memory. Check their
current docs, or ask me to paste a sample. Put any assumption in a `// ASSUME:`
comment and list them all at the end of each phase.
