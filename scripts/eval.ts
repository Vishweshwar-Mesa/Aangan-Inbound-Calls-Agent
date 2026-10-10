// Runs the Gemini re-score on every test-set transcript and checks it
// against rubric.txt's expected answers. Never feeds `desk_note` (or
// anything else from seed/test-set.json) to Gemini — only the transcript
// file's own text, which has the front-desk notes already stripped out.
// Run with: npm run eval
import { readFileSync } from "node:fs";
import path from "node:path";

import { config } from "dotenv";

config({ path: ".env.local" });

import { rescoreCall } from "../lib/gemini";

interface TestCall {
  id: string;
  transcript: string;
  expected_route: string;
  price_mentioned: boolean;
}

interface TestSet {
  calls: TestCall[];
}

interface Result {
  id: string;
  expected: string;
  got: string;
  match: boolean;
  priceMentioned: boolean;
}

async function main() {
  const testSet: TestSet = JSON.parse(
    readFileSync(path.join(process.cwd(), "seed/test-set.json"), "utf-8"),
  );

  const results: Result[] = [];

  for (const call of testSet.calls) {
    if (call.expected_route === "MISSED") {
      results.push({ id: call.id, expected: "MISSED", got: "—", match: true, priceMentioned: false });
      continue;
    }

    const transcript = readFileSync(
      path.join(process.cwd(), "seed", call.transcript),
      "utf-8",
    );
    const rescore = await rescoreCall(transcript);
    const got = rescore.valid ? rescore.route : "INVALID_JSON";

    results.push({
      id: call.id,
      expected: call.expected_route,
      got,
      match: got === call.expected_route,
      priceMentioned: rescore.priceMentioned,
    });
  }

  console.log(
    "ID".padEnd(6) + "Expected".padEnd(14) + "Got".padEnd(16) + "Match".padEnd(7) + "Price?",
  );
  for (const r of results) {
    console.log(
      r.id.padEnd(6) +
        r.expected.padEnd(14) +
        r.got.padEnd(16) +
        (r.match ? "✓" : "✗").padEnd(7) +
        (r.priceMentioned ? "YES" : ""),
    );
  }

  const answerable = results.filter((r) => r.expected !== "MISSED");
  const agreementCount = answerable.filter((r) => r.match).length;
  const agreementPct = (agreementCount / answerable.length) * 100;
  const falseNegatives = answerable.filter(
    (r) => r.expected === "QUALIFIED" && r.got === "NOT_A_FIT",
  );
  const pricesSpoken = results.filter((r) => r.priceMentioned);

  console.log(
    `\nAgreement: ${agreementCount}/${answerable.length} (${agreementPct.toFixed(1)}%)`,
  );
  console.log(
    `False negatives (expected QUALIFIED, got NOT_A_FIT): ${falseNegatives.length}` +
      (falseNegatives.length ? ` — ${falseNegatives.map((r) => r.id).join(", ")}` : ""),
  );
  console.log(
    `Price overreach (beyond the approved starting-rate line, D25): ${pricesSpoken.length}` +
      (pricesSpoken.length ? ` — ${pricesSpoken.map((r) => r.id).join(", ")}` : ""),
  );

  if (falseNegatives.length > 0 || pricesSpoken.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
