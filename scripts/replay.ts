// Posts seed/payloads/sample-call-ended.json (a placeholder shape — see its
// _ASSUME field) to the local call-ended webhook. Run with: npm run replay
import { readFileSync } from "node:fs";
import path from "node:path";

import { config } from "dotenv";

// `dotenv/config` only loads `.env` by default, not `.env.local`.
config({ path: ".env.local" });

async function main() {
  const payloadPath = path.join(process.cwd(), "seed/payloads/sample-call-ended.json");
  const payload = JSON.parse(readFileSync(payloadPath, "utf-8"));
  const url = `${process.env.APP_URL ?? "http://localhost:3000"}/api/vani/call-ended`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-webhook-secret": process.env.VANI_WEBHOOK_SECRET ?? "",
    },
    body: JSON.stringify(payload),
  });

  console.log(res.status, await res.text());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
