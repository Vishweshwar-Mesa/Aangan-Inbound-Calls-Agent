// Phase 2 fills this in once we've seen a real Vani call-ended payload.
// ASSUME: shape unknown — see seed/payloads/sample-call-ended.json (_ASSUME).

export type VaniCallEndedPayload = Record<string, unknown>;

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
  preferredTimes: unknown;
}

export function normalizeVaniPayload(
  raw: VaniCallEndedPayload,
): NormalizedCall {
  throw new Error("normalizeVaniPayload: not implemented until Phase 2");
}
