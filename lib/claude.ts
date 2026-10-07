import Anthropic from "@anthropic-ai/sdk";

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

export async function writeDesignerBrief(input: BriefInput): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

  const message = await anthropic.messages.create({
    // `||` not `??`: ANTHROPIC_MODEL can be an empty string in .env.local
    // rather than unset, and `??` doesn't fall back on that.
    model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
    max_tokens: 300,
    system:
      "You write internal briefs for Aangan Studio's interior designers from structured call " +
      "data. At most 120 words. Cover: who called, the property and its size, the scope, the " +
      "timeline, the decision-maker, the budget only if it was volunteered, and your best guess " +
      "at the likely job size. End with one line starting exactly 'Internal — never share:' " +
      "giving the single pricing band that best fits the scope, then list the flags. Plain " +
      "prose, no markdown headers or bullet points. Never invent facts not given to you.",
    messages: [{ role: "user", content: facts }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("writeDesignerBrief: Claude returned no text content");
  }
  return textBlock.text.trim();
}
