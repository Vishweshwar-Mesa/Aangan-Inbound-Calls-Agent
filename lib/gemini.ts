// Phase 2 fills this in: re-score a call against rubric.txt with Gemini at
// temperature 0, validate with Zod, retry once on invalid JSON.

export interface RescoreResult {
  route: "QUALIFIED" | "NEEDS_REVIEW" | "NOT_A_FIT" | "ESCALATE" | "NOT_ENQUIRY";
  criteria: Record<string, "pass" | "fail" | "unclear">;
  reasons: string;
  fields: Record<string, unknown>;
  flags: string[];
  confidence: number;
  priceMentioned: boolean;
}

export async function rescoreCall(transcript: string): Promise<RescoreResult> {
  throw new Error("rescoreCall: not implemented until Phase 2");
}
