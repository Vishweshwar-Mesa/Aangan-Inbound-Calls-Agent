import { eq } from "drizzle-orm";
import { NextResponse, after } from "next/server";

import { getOrCreateContact } from "@/lib/contacts";
import { db } from "@/lib/db";
import { calls } from "@/lib/db/schema";
import { type RescoreResult, rescoreCall } from "@/lib/gemini";
import { runPostCallActions } from "@/lib/post-call";
import { normalizeVaniPayload, verifyVaniSignature, type VaniCallEndedPayload } from "@/lib/vani";

export const runtime = "nodejs";

function decideRoute(
  agentRoute: string | null,
  rescore: RescoreResult,
): { finalRoute: string; flags: string[] } {
  const flags = new Set(rescore.flags);
  let finalRoute: string;

  if (!rescore.valid) {
    finalRoute = "NEEDS_REVIEW";
  } else if (agentRoute === "QUALIFIED" && rescore.route !== "QUALIFIED") {
    finalRoute = "QUALIFIED";
    flags.add("RESCORE_DISAGREED");
  } else if (agentRoute === "NOT_A_FIT" && rescore.route === "QUALIFIED") {
    finalRoute = "NEEDS_REVIEW";
  } else {
    finalRoute = rescore.route;
  }

  if (rescore.priceMentioned) {
    flags.add("PRICE_SPOKEN");
  }

  return { finalRoute, flags: Array.from(flags) };
}

export async function POST(req: Request) {
  // Must verify against the raw body text — signatures are computed over
  // exact bytes, not the re-serialized JSON.
  const rawBody = await req.text();
  const signatureValid = verifyVaniSignature(
    rawBody,
    req.headers.get("x-vaani-timestamp"),
    req.headers.get("x-vaani-signature"),
    process.env.VANI_WEBHOOK_SECRET,
  );
  if (!signatureValid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let raw: VaniCallEndedPayload;
  try {
    raw = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  let normalized;
  try {
    normalized = normalizeVaniPayload(raw);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }

  const contactId = await getOrCreateContact(normalized.callerNumber);

  const [row] = await db
    .insert(calls)
    .values({
      vaniCallId: normalized.vaniCallId,
      rawPayload: raw,
      contactId,
      callerNumber: normalized.callerNumber,
      callerName: normalized.callerName,
      callerEmail: normalized.callerEmail,
      startedAt: normalized.startedAt,
      durationS: normalized.durationS,
      endedReason: normalized.endedReason,
      recordingUrl: normalized.recordingUrl,
      transcript: normalized.transcript,
      agentRoute: normalized.agentRoute,
      preferredTimes: normalized.preferredTimes,
    })
    .onConflictDoUpdate({
      target: calls.vaniCallId,
      set: {
        rawPayload: raw,
        contactId,
        callerNumber: normalized.callerNumber,
        callerName: normalized.callerName,
        callerEmail: normalized.callerEmail,
        startedAt: normalized.startedAt,
        durationS: normalized.durationS,
        endedReason: normalized.endedReason,
        recordingUrl: normalized.recordingUrl,
        transcript: normalized.transcript,
        agentRoute: normalized.agentRoute,
        preferredTimes: normalized.preferredTimes,
      },
    })
    .returning();

  // Idempotent: a call already fully routed is never re-scored or re-sent.
  if (row.finalRoute) {
    return NextResponse.json({ ok: true, alreadyProcessed: true });
  }

  // No conversation happened (missed/failed calls) — nothing for Gemini to
  // re-score, and no agent route to fall back to either.
  if (!normalized.transcript) {
    await db
      .update(calls)
      .set({
        reasons: "No transcript — call was not answered or had no conversation.",
      })
      .where(eq(calls.id, row.id));
    return NextResponse.json({ ok: true });
  }

  const rescore = await rescoreCall(normalized.transcript);
  const { finalRoute, flags } = decideRoute(normalized.agentRoute, rescore);

  await db
    .update(calls)
    .set({
      geminiRoute: rescore.route,
      finalRoute,
      criteria: rescore.criteria,
      reasons: rescore.reasons,
      fields: rescore.fields,
      flags,
      confidence: String(rescore.confidence),
      priceMentioned: rescore.priceMentioned,
    })
    .where(eq(calls.id, row.id));

  // Cal.com/Claude/Telegram/HubSpot aren't reliably under Vani's response
  // timeout, so they run after the response is sent (CLAUDE.md Phase 2 step 6).
  after(() =>
    runPostCallActions(row.id).catch((error) => {
      console.error(`post-call actions failed for call ${row.id}`, error);
    }),
  );

  return NextResponse.json({ ok: true });
}
