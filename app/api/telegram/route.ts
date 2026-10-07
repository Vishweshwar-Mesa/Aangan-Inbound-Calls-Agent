import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { calls } from "@/lib/db/schema";

export const runtime = "nodejs";

interface TelegramUpdate {
  callback_query?: {
    id: string;
    data?: string;
    message?: { chat?: { id: number }; message_id?: number };
  };
}

async function callTelegram(method: string, payload: Record<string, unknown>) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function POST(req: Request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  const provided = req.headers.get("x-telegram-bot-api-secret-token");
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const update: TelegramUpdate = await req.json();
  const callback = update.callback_query;

  if (callback?.data?.startsWith("ack:")) {
    const callId = callback.data.slice("ack:".length);
    await db.update(calls).set({ telegramAckAt: new Date() }).where(eq(calls.id, callId));

    await callTelegram("answerCallbackQuery", { callback_query_id: callback.id });

    if (callback.message?.chat?.id && callback.message?.message_id) {
      await callTelegram("editMessageText", {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        parse_mode: "HTML",
        text: "✅ <b>Acknowledged</b>",
        reply_markup: { inline_keyboard: [] },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
