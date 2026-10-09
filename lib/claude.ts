import { GoogleGenAI } from "@google/genai";

import { estimateRanges, inferPropertyKind, type PropertyKind } from "./pricing";

export interface BriefInput {
  callerName: string | null;
  fields: Record<string, unknown>;
  flags: string[];
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

// Uses Gemini, not Anthropic's Claude, despite the filename (kept to match
// CLAUDE.md's Phase 1 module list, where this was the per-service "Claude"
// module). Swapped to avoid needing a second LLM provider/billing account
// for one short brief — see docs/DECISIONS.md D19.
export async function writeDesignerBrief(input: BriefInput): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const carpetArea = asNumber(input.fields.carpet_area_sqft);
  const kind: PropertyKind = inferPropertyKind(asString(input.fields.property_type));
  const ranges = estimateRanges(kind, carpetArea);

  const facts = [
    `Caller: ${input.callerName ?? "unknown name"}`,
    `Locality: ${asString(input.fields.locality) ?? "unknown"}`,
    `Property type: ${asString(input.fields.property_type) ?? "unknown"}`,
    `Carpet area: ${carpetArea ? `${carpetArea} sq ft` : "unknown"}`,
    `Scope: ${asString(input.fields.scope) ?? "unknown"}`,
    `Current state: ${asString(input.fields.current_state) ?? "unknown"}`,
    `Needed by: ${asString(input.fields.completion_needed_by) ?? "flexible"}`,
    `Decision-maker: ${asString(input.fields.decision_maker) ?? "unknown"}`,
    `Budget volunteered: ${
      input.fields.budget_volunteered ?? "not volunteered — do not mention a number"
    }`,
    `Source: ${asString(input.fields.source) ?? "unknown"}`,
    `Consult type: ${asString(input.fields.consult_type) ?? "unknown"}`,
    `Flags: ${input.flags.join(", ") || "none"}`,
    ranges
      ? `Internal pricing bands for this ${kind} property at ${carpetArea} sq ft: ` +
        ranges
          .map(
            (r) =>
              `${r.tier} ${formatInr(r.lowInr)}${r.highInr ? `–${formatInr(r.highInr)}` : "+"}`,
          )
          .join(", ")
      : "Internal pricing bands: carpet area unknown, cannot compute a range.",
  ].join("\n");

  const response = await ai.models.generateContent({
    // `||` not `??`: same empty-string-vs-unset gotcha as lib/db.ts.
    // "-latest" alias, not a pinned version — see lib/gemini.ts.
    model: process.env.GEMINI_MODEL || "gemini-flash-latest",
    contents: facts,
    config: {
      systemInstruction:
        "You write internal briefs for Aangan Studio's interior designers from structured call " +
        "data. At most 120 words. Cover: who called, the property and its size, the scope, the " +
        "timeline, the decision-maker, the budget only if it was volunteered, and your best guess " +
        "at the likely job size. End with one line starting exactly 'Internal — never share:' " +
        "giving the single pricing band that best fits the scope, then list the flags. Plain " +
        "prose, no markdown headers or bullet points. Never invent facts not given to you.",
      temperature: 0.4,
    },
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("writeDesignerBrief: Gemini returned no text content");
  }
  return text;
}
