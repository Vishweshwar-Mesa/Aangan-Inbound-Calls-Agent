import { and, eq, isNull, lt } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { calls } from "@/lib/db/schema";
import { sendDesignerBrief, sendReminder } from "@/lib/telegram";

export const runtime = "nodejs";

const REMINDER_AFTER_MS = 30 * 60 * 1000;

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

// Trigger this every 10 minutes from cron-job.org (Vercel's free plan only
// runs cron once a day) with header: Authorization: Bearer <CRON_SECRET>.
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization");
  if (!expected || provided !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results = { sentQueuedBriefs: 0, remindersSent: 0, errors: [] as string[] };

  if (isWithinSendingHours(now)) {
    const queued = await db
      .select()
      .from(calls)
      .where(and(eq(calls.finalRoute, "QUALIFIED"), isNull(calls.telegramSentAt)));

    for (const call of queued) {
      if (!call.brief) continue; // Claude's brief step hasn't succeeded yet
      try {
        const sendResult = await sendDesignerBrief({
          callId: call.id,
          bookedAt: call.bookedAt,
          brief: call.brief,
          callUrl: `${process.env.APP_URL ?? ""}/calls/${call.id}`,
        });
        if (sendResult.sent) {
          await db.update(calls).set({ telegramSentAt: now }).where(eq(calls.id, call.id));
          results.sentQueuedBriefs++;
        }
      } catch (error) {
        results.errors.push(`brief ${call.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  const cutoff = new Date(now.getTime() - REMINDER_AFTER_MS);
  const overdue = await db
    .select()
    .from(calls)
    .where(
      and(
        eq(calls.finalRoute, "QUALIFIED"),
        isNull(calls.telegramAckAt),
        isNull(calls.reminderSentAt),
        lt(calls.telegramSentAt, cutoff),
      ),
    );

  for (const call of overdue) {
    if (!call.telegramSentAt || !isWithinSendingHours(now)) continue;
    try {
      await sendReminder({
        callerName: call.callerName,
        callUrl: `${process.env.APP_URL ?? ""}/calls/${call.id}`,
      });
      await db.update(calls).set({ reminderSentAt: now }).where(eq(calls.id, call.id));
      results.remindersSent++;
    } catch (error) {
      results.errors.push(`reminder ${call.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return NextResponse.json({ ok: true, ...results });
}
