export interface DesignerBriefMessage {
  callId: string;
  bookedAt: Date | null;
  brief: string;
  callUrl: string;
}

async function callTelegram(method: string, payload: Record<string, unknown>): Promise<unknown> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok || body.ok === false) {
    throw new Error(`Telegram ${method} failed: ${res.status} ${JSON.stringify(body)}`);
  }
  return body.result;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function isWithinSendingHours(date: Date): boolean {
  const istHour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      hour12: false,
    }).format(date),
  );
  return istHour >= 9 && istHour < 19;
}

function buildBriefHtml(message: DesignerBriefMessage): string {
  const when = message.bookedAt
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      }).format(message.bookedAt)
    : "not booked yet";

  return (
    `<b>New consultation booked</b>\n` +
    `🕐 ${escapeHtml(when)}\n\n` +
    `${escapeHtml(message.brief)}\n\n` +
    `<a href="${message.callUrl}">View call</a>`
  );
}

// Between 7pm and 9am IST, returns { sent: false } without sending — the
// call's telegram_sent_at stays null, which IS the "queued" state; the 9am
// cron (lib calls this again) picks it up once it's within hours.
export async function sendDesignerBrief(
  message: DesignerBriefMessage,
): Promise<{ sent: boolean }> {
  if (!isWithinSendingHours(new Date())) {
    return { sent: false };
  }

  await callTelegram("sendMessage", {
    chat_id: process.env.TELEGRAM_DESIGNER_CHAT_ID,
    parse_mode: "HTML",
    text: buildBriefHtml(message),
    reply_markup: {
      inline_keyboard: [[{ text: "Got it", callback_data: `ack:${message.callId}` }]],
    },
  });
  return { sent: true };
}

export async function sendEscalation(text: string): Promise<void> {
  await callTelegram("sendMessage", {
    chat_id: process.env.TELEGRAM_ESCALATION_CHAT_ID,
    parse_mode: "HTML",
    text,
  });
}

// ASSUME: CLAUDE.md's cron spec says "alerts the front desk chat" but no
// separate env var for that chat exists — reusing TELEGRAM_ESCALATION_CHAT_ID
// since that's the only other configured chat and already carries
// front-desk-relevant alerts (existing-client escalations, prices spoken).
export async function sendReminder(message: { callerName: string | null; callUrl: string }): Promise<void> {
  const who = escapeHtml(message.callerName ?? "a caller");
  await callTelegram("sendMessage", {
    chat_id: process.env.TELEGRAM_DESIGNER_CHAT_ID,
    parse_mode: "HTML",
    text: `⏰ Reminder: the brief for ${who} hasn't been acknowledged yet.\n<a href="${message.callUrl}">View call</a>`,
  });
  await callTelegram("sendMessage", {
    chat_id: process.env.TELEGRAM_ESCALATION_CHAT_ID,
    parse_mode: "HTML",
    text: `⏰ Unacknowledged brief for ${who} — 30+ minutes.\n<a href="${message.callUrl}">View call</a>`,
  });
}
