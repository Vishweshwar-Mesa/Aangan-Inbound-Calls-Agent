// Inserts the 20 September test-set calls into the database so the
// dashboard has real-looking data before Vani is live. Safe to re-run —
// upserts on vani_call_id (prefixed "demo-").
//
// These predate the automation this app builds, so calcom_booking_id,
// brief, telegram_sent_at and hubspot_*_id are left null even for
// QUALIFIED calls: no real booking/brief/deal was ever created for them.
// Run with: npm run seed-demo
import { readFileSync } from "node:fs";
import path from "node:path";

import { config } from "dotenv";

// Load env vars before dynamically importing lib/db — a static `import`
// here would be hoisted ahead of this config() call (ESM evaluates all
// static imports before any top-level code in this file, regardless of
// source order), so lib/db.ts would read DATABASE_URL before it's set.
config({ path: ".env.local" });

interface TestCall {
  id: string;
  transcript: string;
  expected_route: string;
  expected_criteria: Record<string, string> | null;
  expected_flags: string[];
  expected_fields: Record<string, unknown>;
  price_mentioned: boolean;
  desk_note?: string;
}

interface TestSet {
  calls: TestCall[];
}

const MONTHS: Record<string, number> = {
  January: 0,
  February: 1,
  March: 2,
  April: 3,
  May: 4,
  June: 5,
  July: 6,
  August: 7,
  September: 8,
  October: 9,
  November: 10,
  December: 11,
};

function parseHeader(headerLine: string): { startedAt: Date; durationS: number; missed: boolean } {
  const parts = headerLine.split("·").map((p) => p.trim());
  const [, , dateStr, timeStr, durationStr] = parts;

  const [day, monthName] = dateStr.split(" ");
  const month = MONTHS[monthName];
  const timeMatch = timeStr.match(/(\d+):(\d+)(am|pm)/i);
  let hour = timeMatch ? Number(timeMatch[1]) : 0;
  const minute = timeMatch ? Number(timeMatch[2]) : 0;
  const meridiem = timeMatch?.[3]?.toLowerCase();
  if (meridiem === "pm" && hour !== 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;

  const iso = `2026-${String(month + 1).padStart(2, "0")}-${day.padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:30`;
  const startedAt = new Date(iso);

  // T17 has no duration field at all ("2:14pm then 2:16pm" — the
  // dropped-call-redial scenario, rubric.txt section 1C): fall back to 0.
  const missed = Boolean(durationStr && /missed/i.test(durationStr));
  const durMatch = durationStr?.match(/(\d+)\s*min\s*(\d+)\s*sec/);
  const durationS = missed ? 0 : durMatch ? Number(durMatch[1]) * 60 + Number(durMatch[2]) : 0;

  return { startedAt, durationS, missed };
}

// A plain-English "worth pursuing" line, same spirit as what Gemini writes
// live (rubric.txt section 7, D26) — derived here from the test set's
// already-known outcome rather than re-running Gemini for 20 historical
// calls.
function buildVerdict(call: TestCall, missed: boolean): string | null {
  if (missed) return null;
  switch (call.expected_route) {
    case "QUALIFIED":
      return call.expected_flags.length > 0
        ? `Worth pursuing — meets all criteria (${call.expected_flags.join(", ")}).`
        : "Worth pursuing — meets all criteria, no red flags.";
    case "ESCALATE":
      return "Not a new lead — an existing client issue needing a service recovery call, not a sales follow-up.";
    case "NOT_A_FIT":
    case "NOT_ENQUIRY":
      return call.desk_note
        ? `Not worth pursuing — ${call.desk_note.replace(/\.$/, "")}.`
        : "Not worth pursuing — doesn't meet the service criteria.";
    default:
      return "Borderline — worth a quick human look before deciding either way.";
  }
}

function extractCallerName(transcript: string): string | null {
  // Transcripts use a curly apostrophe (’, U+2019), not a straight one.
  const match = transcript.match(
    /Caller:.*?(?:I['’]?m|I am|This is|My name is)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/,
  );
  return match ? match[1] : null;
}

async function main() {
  const { db } = await import("../lib/db");
  const { calls } = await import("../lib/db/schema");
  const { getOrCreateContact } = await import("../lib/contacts");

  const testSet: TestSet = JSON.parse(
    readFileSync(path.join(process.cwd(), "seed/test-set.json"), "utf-8"),
  );

  for (const [index, call] of testSet.calls.entries()) {
    const transcript = readFileSync(
      path.join(process.cwd(), "seed", call.transcript),
      "utf-8",
    );
    const header = transcript.split("\n")[0];
    const { startedAt, durationS, missed } = parseHeader(header);
    const callerName = extractCallerName(transcript);
    const num = index + 1;
    const callerNumber = `+9198000000${String(num).padStart(2, "0")}`;
    const contactId = await getOrCreateContact(callerNumber);
    const isQualified = call.expected_route === "QUALIFIED";
    const isDeclined =
      call.expected_route === "NOT_A_FIT" || call.expected_route === "NOT_ENQUIRY";

    await db
      .insert(calls)
      .values({
        vaniCallId: `demo-${call.id.toLowerCase()}`,
        rawPayload: null,
        contactId,
        callerNumber,
        callerName,
        callerEmail: callerName ? `${call.id.toLowerCase()}@example.com` : null,
        startedAt,
        durationS,
        endedReason: missed ? "missed" : "completed",
        transcript,
        agentRoute: null, // no AI agent existed for these September calls
        geminiRoute: missed ? null : call.expected_route,
        finalRoute: missed ? null : call.expected_route,
        criteria: call.expected_criteria,
        reasons: call.desk_note ?? (missed ? "No transcript — call was not answered or had no conversation." : null),
        verdict: buildVerdict(call, missed),
        fields: call.expected_fields,
        flags: call.expected_flags,
        confidence: missed ? null : "1",
        priceMentioned: call.price_mentioned,
        bookedAt: isQualified ? new Date(startedAt.getTime() + 3 * 24 * 60 * 60 * 1000) : null,
        reviewOutcome: isDeclined ? "confirmed_decline" : null,
        reviewedBy: isDeclined ? "front desk (September 2026)" : null,
        reviewedAt: isDeclined ? new Date(startedAt.getTime() + 60 * 60 * 1000) : null,
      })
      .onConflictDoUpdate({
        target: calls.vaniCallId,
        set: {
          contactId,
          callerNumber,
          callerName,
          startedAt,
          durationS,
          endedReason: missed ? "missed" : "completed",
          transcript,
          geminiRoute: missed ? null : call.expected_route,
          finalRoute: missed ? null : call.expected_route,
          criteria: call.expected_criteria,
          reasons: call.desk_note ?? null,
          verdict: buildVerdict(call, missed),
          fields: call.expected_fields,
          flags: call.expected_flags,
          priceMentioned: call.price_mentioned,
          bookedAt: isQualified ? new Date(startedAt.getTime() + 3 * 24 * 60 * 60 * 1000) : null,
          reviewOutcome: isDeclined ? "confirmed_decline" : null,
          reviewedBy: isDeclined ? "front desk (September 2026)" : null,
          reviewedAt: isDeclined ? new Date(startedAt.getTime() + 60 * 60 * 1000) : null,
        },
      });

    console.log(`seeded ${call.id} -> ${call.expected_route}`);
  }

  console.log(`\nSeeded ${testSet.calls.length} demo calls.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
