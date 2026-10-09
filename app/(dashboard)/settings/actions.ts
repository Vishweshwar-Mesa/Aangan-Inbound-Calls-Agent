"use server";

import { GoogleGenAI } from "@google/genai";

import { db } from "@/lib/db";
import { calls } from "@/lib/db/schema";

export interface TestResult {
  ok: boolean;
  message: string;
}

async function testDatabase(): Promise<TestResult> {
  await db.select({ id: calls.id }).from(calls).limit(1);
  return { ok: true, message: "Connected" };
}

async function testGemini(): Promise<TestResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-flash-latest",
    contents: "ping",
    config: { maxOutputTokens: 1 },
  });
  return { ok: true, message: "Connected" };
}

async function testCalcom(): Promise<TestResult> {
  const res = await fetch("https://api.cal.com/v2/event-types", {
    headers: { Authorization: `Bearer ${process.env.CALCOM_API_KEY}` },
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return { ok: true, message: "Connected" };
}

async function testTelegram(): Promise<TestResult> {
  const res = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`,
  );
  const body = await res.json();
  if (!body.ok) throw new Error(body.description ?? "failed");
  return { ok: true, message: `Connected as @${body.result.username}` };
}

async function testHubspot(): Promise<TestResult> {
  const res = await fetch("https://api.hubapi.com/account-info/v3/details", {
    headers: { Authorization: `Bearer ${process.env.HUBSPOT_PRIVATE_APP_TOKEN}` },
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return { ok: true, message: "Connected" };
}

async function testResend(): Promise<TestResult> {
  const res = await fetch("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return { ok: true, message: "Connected" };
}

const TESTS: Record<string, () => Promise<TestResult>> = {
  database: testDatabase,
  gemini: testGemini,
  calcom: testCalcom,
  telegram: testTelegram,
  hubspot: testHubspot,
  resend: testResend,
};

export async function testConnection(service: string): Promise<TestResult> {
  const test = TESTS[service];
  if (!test) return { ok: false, message: "No test available for this service" };
  try {
    return await test();
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}
