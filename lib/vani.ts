// ASSUME: this shape matches only seed/payloads/sample-call-ended.json's
// _ASSUME placeholder. The real Vani Labs call-ended payload shape is
// unknown. When a real payload is available, update this function — and
// only this function.
export interface VaniCallEndedPayload {
  event?: string;
  call_id?: string;
  agent_id?: string;
  from?: string;
  to?: string;
  started_at?: string;
  duration_seconds?: number;
  end_reason?: string;
  recording_url?: string;
  transcript?: string;
  extracted?: {
    route?: string;
    caller_name?: string;
    email?: string;
    consult_type?: string;
    preferred_times?: string[];
  };
  cost?: { amount?: number | null; currency?: string };
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

  return {
    vaniCallId: callId,
    callerNumber: raw.from ?? null,
    callerName: raw.extracted?.caller_name ?? null,
    callerEmail: raw.extracted?.email ?? null,
    startedAt: raw.started_at ? new Date(raw.started_at) : null,
    durationS: raw.duration_seconds ?? null,
    endedReason: raw.end_reason ?? null,
    recordingUrl: raw.recording_url ?? null,
    transcript: raw.transcript ?? null,
    agentRoute: raw.extracted?.route ?? null,
    preferredTimes: raw.extracted?.preferred_times ?? null,
  };
}
