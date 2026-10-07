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
