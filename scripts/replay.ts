// Posts seed/payloads/sample-call-ended.json (a placeholder shape — see its
// _ASSUME field) to the local call-ended webhook, signed the way Vaani AI
// signs real webhooks. Run with: npm run replay
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { config } from "dotenv";

// `dotenv/config` only loads `.env` by default, not `.env.local`.
config({ path: ".env.local" });

function sign(rawBody: string, timestamp: string, secret: string): string {
  return "sha256=" + crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
}

async function main() {
  const payloadPath = path.join(process.cwd(), "seed/payloads/sample-call-ended.json");
  const rawBody = readFileSync(payloadPath, "utf-8");
  const url = `${process.env.APP_URL ?? "http://localhost:3000"}/api/vani/call-ended`;

  const secret = process.env.VANI_WEBHOOK_SECRET ?? "";
  const timestamp = String(Math.floor(Date.now() / 1000));

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-vaani-timestamp": timestamp,
      "x-vaani-signature": sign(rawBody, timestamp, secret),
    },
    body: rawBody,
  });

  console.log(res.status, await res.text());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
