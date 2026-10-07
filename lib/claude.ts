// Phase 3 fills this in: the designer brief, at most 120 words, using the
// internal pricing bands from lib/pricing.ts. Never expose the brief's
// pricing range to a caller-facing surface.

export interface BriefInput {
  callerName: string | null;
  fields: Record<string, unknown>;
  flags: string[];
}

export async function writeDesignerBrief(input: BriefInput): Promise<string> {
  throw new Error("writeDesignerBrief: not implemented until Phase 3");
}
