import { readFileSync } from "node:fs";
import path from "node:path";

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const RescoreSchema = z.object({
  route: z.enum([
    "QUALIFIED",
    "NEEDS_REVIEW",
    "NOT_A_FIT",
    "ESCALATE",
    "NOT_ENQUIRY",
  ]),
  criteria: z.object({
    c1: z.enum(["pass", "fail", "unclear"]),
    c2: z.enum(["pass", "fail", "unclear"]),
    c3: z.enum(["pass", "fail", "unclear"]),
    c4: z.enum(["pass", "fail", "unclear"]),
    c5: z.enum(["pass", "fail", "unclear"]),
  }),
  reasons: z.string(),
  fields: z.object({
    name: z.string().nullable().optional(),
    locality: z.string().nullable().optional(),
    property_type: z.string().nullable().optional(),
    carpet_area_sqft: z.number().nullable().optional(),
    scope: z.string().nullable().optional(),
    current_state: z.string().nullable().optional(),
    completion_needed_by: z.string().nullable().optional(),
    decision_maker: z.string().nullable().optional(),
    budget_volunteered: z.union([z.string(), z.number()]).nullable().optional(),
    source: z.string().nullable().optional(),
    consult_type: z.string().nullable().optional(),
  }),
  flags: z.array(z.string()),
  confidence: z.number(),
  price_mentioned: z.boolean(),
});

export interface RescoreResult {
  valid: boolean;
  route: z.infer<typeof RescoreSchema>["route"];
  criteria: z.infer<typeof RescoreSchema>["criteria"];
  reasons: string;
  fields: z.infer<typeof RescoreSchema>["fields"];
  flags: string[];
  confidence: number;
  priceMentioned: boolean;
}

const INVALID_RESULT: RescoreResult = {
  valid: false,
  route: "NEEDS_REVIEW",
  criteria: { c1: "unclear", c2: "unclear", c3: "unclear", c4: "unclear", c5: "unclear" },
  reasons: "Gemini returned invalid JSON after one retry.",
  fields: {},
  flags: [],
  confidence: 0,
  priceMentioned: false,
};

let rubricText: string | null = null;
function getRubric(): string {
  if (!rubricText) {
    rubricText = readFileSync(path.join(process.cwd(), "rubric.txt"), "utf-8");
  }
  return rubricText;
}

function getSystemInstruction(): string {
  return (
    getRubric() +
    '\n\nReturn only the JSON described in section 7 of the rubric. Also ' +
    "return price_mentioned: true ONLY if the assistant said pricing " +
    "information beyond the one approved starting-rate line in section 0 " +
    "(D25) — e.g. a computed total, a second number, a range, or any price " +
    "language that isn't that exact approved line. Saying the single " +
    "approved starting rate (home ₹1,800/sq ft or office ₹1,200/sq ft, " +
    "followed by the consultation line) is expected, sanctioned behavior " +
    "and must NOT set price_mentioned true."
  );
}

async function callGemini(transcript: string): Promise<unknown> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    // `||` not `??`: same empty-string-vs-unset gotcha as lib/db.ts.
    // "-latest" alias, not a pinned version, so this doesn't go stale again
    // the way gemini-2.0-flash did.
    model: process.env.GEMINI_MODEL || "gemini-flash-latest",
    contents: transcript,
    config: {
      systemInstruction: getSystemInstruction(),
      temperature: 0,
      responseMimeType: "application/json",
    },
  });
  return JSON.parse(response.text ?? "");
}

export async function rescoreCall(transcript: string): Promise<RescoreResult> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const json = await callGemini(transcript);
      const parsed = RescoreSchema.parse(json);
      return {
        valid: true,
        route: parsed.route,
        criteria: parsed.criteria,
        reasons: parsed.reasons,
        fields: parsed.fields,
        flags: parsed.flags,
        confidence: parsed.confidence,
        priceMentioned: parsed.price_mentioned,
      };
    } catch {
      // Retry once on a bad call or invalid JSON, then fall back below.
    }
  }
  return INVALID_RESULT;
}
