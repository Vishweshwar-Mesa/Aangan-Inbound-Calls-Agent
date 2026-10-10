# Decisions log

Append-only. Newest at the bottom. Each entry gives the date, the decision,
why, and what was rejected. To reverse a decision, add a new entry that
points to the old one.

---

### 2026-10-07 · D01 · Phone only for this build
**Decision:** Build for inbound phone calls only.
**Why:** The case scopes it, and the phone carries the most volume and urgency.
**Rejected:** WhatsApp and the web form, for now. They reuse everything from
Context to Output later; only the trigger changes.

### 2026-10-07 · D02 · The Cut: no prices on the call (check 07, Judgment Protected)
**Decision:** The agent never states a price. It uses pricing.md's scripted
deflection line. The designer gets an internal range in the Telegram brief.
**Why:** pricing.md forbids quoting; a spoken number anchors the client; only
a designer can read the client's budget.
**Rejected:** Nikhil's ask to quote per-sq-ft rates, and a "rough estimate"
with a disclaimer.

### 2026-10-07 · D03 · The AI qualifies, and a human reviews every decline
**Decision:** The agent may close clear fails (per qualified.md). Every
NOT_A_FIT goes to the front-desk review queue. There is no silent auto-reject.
**Why:** A wrongly declined good lead (false negative) costs more than any
other error.
**Rejected:** A fully automated decline, and a human check on every call (too
slow).

### 2026-10-07 · D04 · Book the consultation right after the call
**Decision:** On the call, collect an email and two preferred times. The
webhook books in Cal.com after the call ends.
**Why:** Vani has no outside access during a live call. Ending with "a
designer will get back to you" makes the designer the failure point.
**Rejected:** A live calendar check (not possible), and sending the caller a
booking link (makes the caller the failure point).

### 2026-10-07 · D05 · Handoff on Telegram, not email
**Decision:** The designer brief goes on Telegram with a "Got it" button.
After-hours briefs are queued to 9am. Unacknowledged briefs trigger a
reminder after 30 working minutes.
**Why:** Seconds rather than hours; designers are on site; the tap gives a
timestamp.
**Rejected:** Email as the primary channel (kept only as an optional digest),
and WhatsApp.

### 2026-10-07 · D06 · Four outputs
**Decision:**
1. A calendar booking.
2. A Telegram brief to the designer.
3. A dashboard for designers and the front desk.
4. HubSpot for Nikhil.

**Why:** Each output goes to the person who acts on it. Nikhil cares about his
funnel, not transcripts.
**Rejected:** A dashboard built for Nikhil.

### 2026-10-07 · D07 · Owner is the designer
**Decision:** The designer who gets the booked call owns the output. Nikhil
owns the rubric; the builder owns the system.
**Why:** Ownership is of the output, not the input. It must be a single owner.

### 2026-10-07 · D08 · Re-score disagreement rules
**Decision:**
- If the agent said QUALIFIED and Gemini disagrees: still book, and flag
  RESCORE_DISAGREED.
- If the agent said NOT_A_FIT and Gemini says QUALIFIED: route to
  NEEDS_REVIEW.

**Why:** The caller was promised an invite, and losing a good lead is the
bigger risk.

### 2026-10-07 · D09 · Stack
**Decision:** Next.js, Tailwind and shadcn on Vercel; Supabase (Neon as
fallback); Vani Labs; Gemini Flash for the re-score; Claude for the brief;
Cal.com; Telegram; HubSpot free tier; Recharts; Zod.
**Why:** Free tiers, a 6-hour build, and the class's tools.

### 2026-10-07 · D10 · Design Option B, "Midnight Bento"
**Decision:** Dark theme, Manrope, light pill buttons, top navigation. Six
pages: Overview, Calls, Call detail, Review queue, Analytics, Settings.
**Why:** Chosen over A (Graphite sidebar) and C (split-pane triage).

### 2026-10-07 · D11 · Analytics and the front-desk scorecard are core
**Decision:** The Analytics page and the 10-metric replacement scorecard are
in scope and never cut.
**Why:** Removing a front-desk role needs evidence. Phone automation frees
about 17 hrs/month, and one false negative costs 5–19 months of salary.

### 2026-10-07 · D12 · Out of scope
**Decision:** Outbound callbacks, round-robin across 14 designers, and
WhatsApp/web automation are out of this build.
**Why:** Outbound is a new process that needs its own nine checks. There is
only one designer for now.

### 2026-10-07 · D13 · Open — to confirm with Nikhil
These are not decided yet:
- the timeline cut-off (the rubric uses 8 weeks)
- whether declining offices under 500 sq ft is a real rule
- the internal budget floors in rubric.txt

Record the answers as new entries.

### 2026-10-07 · D14 · Neon + Drizzle for data, Auth.js + Resend for login (reverses part of D09)
**Decision:** Use Neon Postgres with Drizzle ORM: `DATABASE_URL` (pooled) for
the app, `DATABASE_URL_UNPOOLED` (direct) for migrations. Drop Supabase
entirely, including for auth. Login is Auth.js (NextAuth) email magic links
sent through Resend, restricted to `ALLOWED_EMAILS` in a `signIn` callback.
Neon has no row-level security, so every access rule RLS would have enforced
is enforced in server code instead: `proxy.ts` (Next.js 16's middleware)
gates every page behind a valid session, and all writes go through
server-only code (API routes, webhooks, server actions) using a connection
that's never exposed to the client.
**Why:** One Postgres provider, one auth flow, as directed.
**Rejected:** D09's "Supabase for auth only" fallback, and Postgres RLS as the
enforcement layer — not available outside Supabase.

### 2026-10-07 · D15 · Added `reminder_sent_at` column (extends the Phase 1 schema)
**Decision:** Added a `reminder_sent_at timestamptz` column to `calls`, not
in CLAUDE.md's original column list, so the cron job's "remind the designer
after 30 unacknowledged minutes" step doesn't re-fire every 10 minutes
forever. Set once a reminder is sent; the cron job skips any call that
already has it.
**Why:** `telegram_sent_at`/`telegram_ack_at` alone can't distinguish
"never reminded" from "already reminded, still unacknowledged" — without a
marker, every cron run (every ~10 min, since Vercel's free plan only runs
cron once a day — see CLAUDE.md Phase 3) would re-send the reminder.
**Rejected:** Re-using `step_errors` as a marker (overloads a field meant
for failures with normal-path state); always re-sending (spams the
designer and the escalation chat).

### 2026-10-07 · D16 · "Front desk chat" in the cron reminder reuses `TELEGRAM_ESCALATION_CHAT_ID`
**Decision:** CLAUDE.md's cron spec says the 30-minute-unacknowledged
reminder "alerts the front desk chat", but no separate env var for a
front-desk chat exists — only `TELEGRAM_DESIGNER_CHAT_ID` and
`TELEGRAM_ESCALATION_CHAT_ID`. `lib/telegram.ts`'s `sendReminder()` sends
the escalation half of the reminder to `TELEGRAM_ESCALATION_CHAT_ID`.
**Why:** That chat already carries other front-desk-relevant alerts
(existing-client escalations, prices spoken), so it's the closest existing
fit rather than inventing a new env var unprompted.
**Rejected:** Adding a new `TELEGRAM_FRONTDESK_CHAT_ID` env var without
being asked. Revisit if a dedicated front-desk chat turns out to be wanted —
trivial to add later.

### 2026-10-09 · D20 · "Send to designer" sets final_route to QUALIFIED
**Decision:** The review queue's "Send to designer" action
(`app/(dashboard)/review/actions.ts`) sets `final_route = 'QUALIFIED'` in
addition to `review_outcome = 'sent_to_designer'`, then runs the normal
QUALIFIED post-call actions with `skipBooking: true`.
**Why:** CLAUDE.md's Phase 4 spec says this action "runs the QUALIFIED
actions, except Cal.com" but doesn't say whether `final_route` itself
should change. Leaving it as `NOT_A_FIT`/`NEEDS_REVIEW` while running
QUALIFIED-style actions would make the call display as declined everywhere
else in the dashboard (Calls list, Overview's outcome bar) even though a
human just qualified it — `runPostCallActions()` also only takes the
QUALIFIED branch when `final_route` actually is `QUALIFIED`, so this was
needed for the brief/Telegram/HubSpot steps to run at all without changing
`runPostCallActions()`'s branching.
**Rejected:** Making `runPostCallActions()` branch on `review_outcome` as
well as `final_route` — more surface area for the same outcome.

### 2026-10-09 · D21 · Real Vaani AI docs: HMAC webhook signing, not a shared secret header
**Decision:** The voice platform is **Vaani AI** (`app.vaanivoice.ai`), not
a generic "Vani Labs" — confirmed from the account's own dashboard.
Checked their real docs (`docs.vaanivoice.ai`) before building Phase 6, per
CLAUDE.md's "don't guess API shapes" rule. Two things changed from Phase
2's placeholder:
1. **Auth:** Vaani signs webhooks with HMAC-SHA256, not a plain shared
   header. `app/api/vani/call-ended/route.ts` now verifies
   `X-Vaani-Signature: sha256={hex}` against
   `HMAC-SHA256(VANI_WEBHOOK_SECRET, "{X-Vaani-Timestamp}.{raw body}")`,
   with a 5-minute replay-window check, computed over the raw request body
   text (not re-serialized JSON) — see `lib/vani.ts`'s
   `verifyVaniSignature()`.
2. **Event + shape:** point the webhook at `call_postprocessing`, not
   `call_ended` (which carries no transcript — just room/duration/end
   reason). `call_postprocessing` nests transcript/recording/summary under
   `data`. `lib/vani.ts`'s `normalizeVaniPayload()` updated to match.
**Still unconfirmed (no real payload seen yet):** no caller phone/name/
email field appears in any documented example. Left `null` for all three
rather than guess a field name — `agent_route`/`preferred_times` are
read from `data.entities` only if present, since Vaani supports configurable
per-agent entity extraction but its configuration UI wasn't found in docs.
**Why:** HMAC verification and the correct event/payload shape are
security- and correctness-critical; worth getting right from real docs
before the agent goes live, rather than shipping the Phase 2 placeholder
to production.
**Rejected:** Leaving the plain-header check in place "until a real call
arrives" — the real mechanism was discoverable now, so there was no reason
to ship the known-wrong placeholder.

### 2026-10-09 · D22 · Vaani agent language: English only, no Hindi fallback
**Decision:** The Vaani agent's Language setting is **English**, with no
fallback language enabled.
**Why:** Vaani's language config only supports "primary language X, with
English as a fallback" — not the reverse (no "English primary, Hindi
fallback" option exists). Given all 20 real September transcripts are in
English, and rubric.txt describes Hindi callers as occasional ("Hindi
enquiries occur"), making English the primary and *only* language keeps
full accuracy for the common case rather than degrading it to
(imperfectly) support the rare one.
**Trade-off, stated plainly:** a caller who speaks Hindi will not get
native-language support — the agent's own prompt still says "follow the
caller's language" (`vani_agent_prompt.md` section 1), but that's now
aspirational, not backed by the platform's speech engine. Left the prompt
text as-is rather than rewriting it to only promise English, since the
instruction is harmless if a bilingual LLM still partially copes, and
rewriting the voice/qualification prompt is a bigger, riskier change than
this phase calls for.
**Rejected:** Hindi primary + English fallback (the only alternative the
platform offers) — would degrade the ~100% English call volume to help an
occasional case.
**Revisit if:** Vaani adds an English-primary-with-fallback option, or
Hindi call volume turns out higher than the September sample suggests.

### 2026-10-10 · D23 · Added a `contacts` table, keyed by phone number
**Decision:** New `contacts` table (`lib/db/schema.ts`): `id`, `phone_number`
(unique), `created_at`. `calls.contact_id` references it. Looked up or
created via `lib/contacts.ts`'s `getOrCreateContact()`, called from the
call-ended webhook (`app/api/vani/call-ended/route.ts`) and from
`scripts/seed-demo.ts`. The Call detail page shows a "Caller history" card
of the contact's other calls.
**Why:** Requested explicitly — every call should carry a persistent
identity for its caller, not just its own row id. This also gives
rubric.txt's REPEAT CALLER and DROPPED CALL scenarios (section 1B/1C) a
real backing: multiple calls from one number are now linkable, where
before each call was an island.
**Caveat, stated plainly:** `normalizeVaniPayload()` currently returns
`callerNumber: null` for every real Vaani call (no phone field is
documented anywhere — see D21), so `contact_id` will stay null for real
calls until that's resolved. The seeded demo data (20 distinct numbers,
one per transcript) and the webhook code path were both tested directly
to confirm the linking logic itself is correct and ready for when a real
phone number is available.
**Rejected:** Deriving a contact key from something else (email, name) —
phone number is the one identifier a phone call always has, once Vaani
surfaces it.

### 2026-10-10 · D24 · Dashboard restyled: "Drafting Room" (architectural), replacing Midnight Bento
**Decision:** Replaced CLAUDE.md Phase 4's "Midnight Bento" dark theme with
an architectural-drawing-set look: concrete ground (`#E7E4DD`), hard black
2px rules, zero border radius, Space Grotesk, and exactly one alarm color
(`#FF4B1F`). Added drafting-convention chrome shared across all six pages:
corner registration marks, a numbered ruler strip, a north-arrow glyph in
the nav, and a title-block footer naming each page's "sheet" (Overview
A-01, Calls A-02, Call detail A-02.1, Review A-03, Analytics A-04, Settings
A-05). Status chips borrow drafting convention: solid fill = confirmed
(Qualified), dashed outline = provisional (Needs review), grayed outline =
excluded (Not a fit), solid orange = alarm (Escalated).
**Why:** Requested directly — Aangan Studio is an architecture/interior
design firm, so the dashboard should read as one of their own drawings,
not a generic SaaS dark theme. Confirmed via a 4-option mockup canvas
before implementing (warm minimalist, blueprint/technical, concrete/
brutalist, refined Midnight Bento) — concrete/brutalist was picked, then
the drafting details (registration marks, ruler, title block, north arrow)
were added on top per follow-up request.
**Implementation note:** `components/ui/card.tsx`, `button.tsx`,
`input.tsx`, `table.tsx` (shadcn primitives) were edited directly rather
than overridden per-usage — they had hardcoded `rounded-xl`/ring styling
that wasn't driven by the theme's CSS variables, so a global palette swap
alone wouldn't have reached them.
**Rejected:** The other three mockup directions (warm minimalist,
blueprint/technical, refined Midnight Bento) — still on the design canvas
if reconsidered later.

### 2026-10-09 · D17 · Login test mode: empty `ALLOWED_EMAILS` lets any email sign in
**Decision:** `lib/auth.ts`'s `signIn` callback allows any email when
`ALLOWED_EMAILS` is empty, instead of CLAUDE.md's original "blocks every
page unless the email is in `ALLOWED_EMAILS`" with no exception. The login
page shows a visible amber warning whenever this is active, naming
`ALLOWED_EMAILS` as the fix.
**Why:** Requested explicitly, to try the deployed app (already public at
https://aangan-build-kit.vercel.app) before deciding who gets real access.
**Risk, stated plainly:** while this is on, anyone who has the URL can sign
in with any email and see real call transcripts, phone numbers, and
internal pricing — there is no other access gate in front of the dashboard.
**Rejected:** A separate `TEST_MODE` env var (an empty `ALLOWED_EMAILS`
already means "not configured yet", so reusing it needs no new var and
can't drift out of sync with it).
**To close:** set `ALLOWED_EMAILS` to the real list of who should have
access — the warning disappears and normal enforcement resumes
immediately, no code change needed.

### 2026-10-09 · D18 · HubSpot deal→contact association type is 3, not 5
**Decision:** `lib/hubspot.ts`'s `DEAL_TO_CONTACT_ASSOCIATION_TYPE_ID` is
`3`. The Phase 3 build used `5`, taken from a docs lookup that turned out
wrong — HubSpot rejected it with `INVALID_FROM_OBJECT` on the first real
deal creation. Confirmed live against this portal via
`GET /crm/v4/associations/deals/contacts/labels`
(`fromObjectTypeId: "0-3"` deals -> `toObjectTypeId: "0-1"` contacts,
`typeId: 3`).
**Why:** The HubSpot account's own API is the ground truth here, not a
secondhand docs summary — worth calling that out since it's exactly the
kind of thing CLAUDE.md's "don't guess API shapes" rule is for, and the
first attempt still got it wrong despite trying to check docs first.
**Also done via API, no manual UI steps needed:** created the
`ai_call_cost_inr` Number deal property (`POST /crm/v3/properties/deals`)
and the "Consultation booked" stage on the default pipeline
(`POST /crm/v3/pipelines/deals/default/stages`, id `4416526020`) directly
with the service key's write scopes, once it was clear the key could do it.

### 2026-10-09 · D19 · Designer brief uses Gemini, not Claude (reverses part of D09/CLAUDE.md Phase 3)
**Decision:** `lib/claude.ts`'s `writeDesignerBrief()` calls Gemini
(`@google/genai`, same `GEMINI_API_KEY`/`GEMINI_MODEL` as the re-score),
not Anthropic's Claude. The module keeps its filename from the Phase 1
module list, but no longer imports `@anthropic-ai/sdk` (uninstalled) and
`ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL` are removed from `.env.example`.
**Why:** Requested directly — the brief-writing task (summarizing
structured call data into ≤120 words) doesn't need a second model, and
avoids requiring a separate Anthropic billing account for this build.
**Rejected:** Keeping Claude for this one step alone. Nothing about the
task specifically needs Claude over Gemini; the original split (Gemini for
scoring, Claude for the brief) was a stack choice, not a capability
requirement.

### 2026-10-10 · D25 · The agent may state one approved starting rate (reverses D02)
**Decision:** The agent may now say exactly one pricing line once it knows
whether the property is a home or an office: home "starts from ₹1,800 per
square foot"; office "starts from ₹1,200 per square foot" (the floor of
each type's lowest band in `lib/pricing.ts`), always followed by the
existing "exact cost depends on the site, materials, and scope — your
designer will cover it at the consultation" line. It must never go further:
no computed total for their square footage, no second number, no range. If
it doesn't yet know home vs. office, it asks that first. Updated in
`vani_agent_prompt.md` (guardrail 1) and `rubric.txt` (section 0).
`price_mentioned` (Gemini re-score, `lib/gemini.ts`) is redefined to mean
"said pricing beyond the one approved line" rather than "said any price at
all" — saying the approved line is sanctioned and must not set it true, so
it no longer triggers the `PRICE_SPOKEN` flag or the escalation alert in
`lib/post-call.ts` (unchanged code — the flag's new meaning makes this
correct automatically). The dashboard's "Prices spoken" scorecard
metric/stat is relabeled "Price overreach" (`app/(dashboard)/analytics/page.tsx`)
to match; the underlying `price_mentioned` column/field name is unchanged.
**Why:** Requested directly, citing the original brief from Nikhil: "the
system should be able to quote our standard per-square-foot pricing so
people don't have to wait for that." A fixed, publishable starting rate
(the same floor figure the firm could put on its own website) is a much
narrower disclosure than a caller-specific computed quote — it doesn't
anchor what *their* project will cost, which was D02's core objection.
**Rejected:** A single blended rate for every caller regardless of
property type (considered, but under/overstates the two segments'
actual floors); computing a caller-specific total from their stated square
footage (this is exactly what D02 identified as the anchoring risk, and
stays forbidden).
**Still true from D02:** no per-project estimate, no caller-specific range,
no budget-matching language — only the one fixed, type-based floor rate.
**Not yet done:** the live Vaani agent's system prompt must be re-pasted
from the updated `vani_agent_prompt.md` for this to take effect on real
calls — editing the file alone doesn't change what's deployed in Vaani's
dashboard.
**Test-data note:** T02 and T13 (`seed/transcripts/`) were recorded before
this decision; on those actual calls the agent fully deflected rather than
stating the new starting rate, so `price_mentioned` is correctly still
`false` for both — this doesn't change the eval pass bar's "0 price
overreach" expectation across the existing 20-call test set.

### 2026-10-10 · D26 · Added a `verdict` field: a plain "worth pursuing or not" call
**Decision:** Gemini's post-call re-score now returns a `verdict` field — one
or two sentences recommending whether a lead is worth the designer's time
and why — in addition to the existing structured `criteria`/`reasons`.
Stored in a new `calls.verdict` column (`drizzle/0003_sudden_energizer.sql`).
Added to `rubric.txt` section 7's JSON schema, `lib/gemini.ts`
(`RescoreSchema`, `RescoreResult`), and the webhook
(`app/api/vani/call-ended/route.ts`). Shown as a banner on the Call detail
page and inline on the Review queue. `scripts/seed-demo.ts` derives a
plausible verdict for the 20 historical demo calls from their already-known
expected route/flags/desk note, rather than re-running Gemini on them.
**Why:** Requested directly — the existing `criteria`/`reasons` fields are
structured per-check output (pass/fail/unclear, one sentence each); nothing
gave a holistic plain-English recommendation a founder or designer could
read at a glance, especially useful on NEEDS_REVIEW calls in the queue.
**Rejected:** Overloading the existing `reasons` field for this — it has a
different, narrower contract ("one sentence per failed/unclear criterion")
and mixing the two would make `reasons` harder to parse/display
consistently.

### 2026-10-10 · D27 · Overview renamed "Principal's View" (reverses CLAUDE.md Phase 4's nav labels)
**Decision:** The page at `/` (nav label, `<h1>`, and the drafting title
block's sheet title) is now "Principal's View" instead of "Overview."
Route, URL, sheet number (A-01), and the page's content/layout are
unchanged — this is a label-only change (`components/nav.tsx`,
`app/(dashboard)/page.tsx`, `components/sheet-footer.tsx`).
**Why:** Requested directly, fitting the firm's own language — Nikhil is
the principal architect, and this page is specifically his morning
overview, not a generic team dashboard.
**Rejected:** Nothing else considered; this is a direct, unambiguous
naming request.

### 2026-10-10 · D28 · Global date-range + status filters (reverses CLAUDE.md Phase 4's per-page Analytics-only range)
**Decision:** Added one shared filter control (`components/global-filters.tsx`)
— date range (Today/7D/30D/90D) and outcome status (All/Qualified/Not a
fit/Needs review/Escalated) — used on Principal's View, Calls, and
Analytics. Replaces Analytics' own local 30/60-day + custom-date picker and
Calls' own separate status pills with one shared control reflecting the
same state everywhere. Persisted in cookies (`lib/filters.ts`:
`getActiveFilters`/`setActiveFilters`, set via the `setFilters` server
action in `app/(dashboard)/actions.ts`), not the URL — a deliberate
tradeoff: this is an internal tool for 1-2 users, not a product with
shareable report links, so simpler plumbing (one shared cookie instead of
rewriting every nav link's query string) won out over bookmarkable
filtered URLs. Dropped the custom-date-range option that Analytics used to
have, for v1 scope — presets only.
Split `lib/filter-options.ts` (types/constants, no server imports) out from
`lib/filters.ts` (the cookie-reading functions, imports `next/headers`) —
needed because `components/global-filters.tsx` is a client component and
bundling `next/headers` into client code fails the build.
`getOverviewStats`, `listCalls`, `getAnalyticsSummary` all gained a
`status`/date-range parameter; `GET /api/calls/export` now reads the same
cookies instead of its own `route`/`q` query params. `getDailySeries`
(the scorecard sparklines) is intentionally left on its own fixed 60-day,
unfiltered window — it's a trend reference, not a point-in-time stat, and
most scorecard metrics would become meaningless pre-filtered to one status.
**Why:** Requested directly ("full-fledged dashboard options as per market
standard"), then scoped via follow-up questions to exactly these two
filters — date range and outcome status — rather than guessing at a wider
set (locality, source/flags were explicitly declined for now).
**Rejected:** URL-query-based filters (the more "shareable" market-standard
pattern) — correct for a multi-user product, unnecessary complexity for
this internal, single/few-user tool; locality and source/flag filters —
declined by direct choice, revisit once call volume justifies them.
**Tested:** `npm run build` clean; verified live with cookie-simulated
filter states — Calls page row counts by outcome changed correctly when
`af_status=QUALIFIED` was set (12 non-qualified labels dropped to 3, the
remaining 3 being the filter picker's own button labels, not table rows);
Principal's View and Analytics both render without error under the same
filter state.
