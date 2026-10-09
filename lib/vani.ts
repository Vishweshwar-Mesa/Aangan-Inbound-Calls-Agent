import crypto from "node:crypto";

// ASSUME: confirmed against Vaani AI's docs (docs.vaanivoice.ai) at build
// time, but no real payload has been seen yet — verify once a real call
// comes through and update ONLY this file if anything's off.
//
// The call-ended webhook should be pointed at the `call_postprocessing`
// event, not `call_ended` (which carries no transcript at all — just
// room_name/call_duration/end_reason). `call_postprocessing` nests the
// useful data under `data`. No caller phone/name/email field is
// documented anywhere, so those stay null until a real payload shows
// where they live (likely under `data.entities`, Vaani's configurable
// per-agent extraction — see docs/CONTEXT.md).
export interface VaniCallEndedPayload {
  event?: string;
  call_id?: string;
  timestamp?: string;
  data?: {
    room_name?: string;
    call_duration?: number; // seconds
    end_reason?: string;
    summary?: string;
    recording_url?: string;
    transcript?: string;
    entities?: Record<string, unknown> | null;
    dispositions?: unknown;
  };
  [key: string]: unknown;
}

export interface NormalizedCall {
  vaniCallId: string;
  callerNumber: string | null;
  callerName: string | null;
  callerEmail: string | null;
  startedAt: Date | null;
  durationS: number | null;
  endedReason: string | null;
  recordingUrl: string | null;
  transcript: string | null;
  agentRoute: string | null;
  preferredTimes: string[] | null;
}

export function normalizeVaniPayload(
  raw: VaniCallEndedPayload,
): NormalizedCall {
  const callId = raw.call_id;
  if (!callId) {
    throw new Error("normalizeVaniPayload: payload has no call_id");
  }

  const data = raw.data ?? {};
  const durationS = typeof data.call_duration === "number" ? Math.round(data.call_duration) : null;
  const endedAt = raw.timestamp ? new Date(raw.timestamp) : null;
  const startedAt =
    endedAt && durationS !== null ? new Date(endedAt.getTime() - durationS * 1000) : endedAt;

  // ASSUME: if/when a custom "route"/"preferred_times" entity is
  // configured on the Vaani agent, it shows up here. Unconfirmed field
  // names — update once the agent's entity config is set up.
  const entities = data.entities ?? {};
  const agentRoute = typeof entities.route === "string" ? entities.route : null;
  const preferredTimes = Array.isArray(entities.preferred_times)
    ? (entities.preferred_times as string[])
    : null;

  return {
    vaniCallId: callId,
    callerNumber: null,
    callerName: null,
    callerEmail: null,
    startedAt,
    durationS,
    endedReason: data.end_reason ?? null,
    recordingUrl: data.recording_url ?? null,
    transcript: data.transcript ?? null,
    agentRoute,
    preferredTimes,
  };
}

// Vaani signs webhooks as sha256=HMAC-SHA256(secret, `${timestamp}.${rawBody}`)
// in `X-Vaani-Signature`, with `X-Vaani-Timestamp` for replay protection
// (docs.vaanivoice.ai/api-reference/campaigns/webhooks.md). Must run against
// the raw request body text, not the parsed/re-serialized JSON — signatures
// are computed over exact bytes.
const MAX_TIMESTAMP_SKEW_S = 5 * 60;

export function verifyVaniSignature(
  rawBody: string,
  timestamp: string | null,
  signature: string | null,
  secret: string | undefined,
): boolean {
  if (!secret || !timestamp || !signature) return false;

  const timestampNum = Number(timestamp);
  if (!Number.isFinite(timestampNum)) return false;
  if (Math.abs(Date.now() / 1000 - timestampNum) > MAX_TIMESTAMP_SKEW_S) return false;

  const expected =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");

  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(signature);
  if (expectedBuf.length !== providedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}
