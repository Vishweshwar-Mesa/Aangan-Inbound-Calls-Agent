import { eq } from "drizzle-orm";

import { bookConsultation } from "./calcom";
import { writeDesignerBrief } from "./claude";
import { db } from "./db";
import { calls } from "./db/schema";
import { upsertContactAndDeal } from "./hubspot";
import { sendDesignerBrief, sendEscalation } from "./telegram";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Runs the QUALIFIED/ESCALATE actions for a call. Each step is independent:
// a failure is recorded in step_errors and never stops the others (CLAUDE.md
// hard rule). Also used by the Phase 4 review queue's "Send to designer"
// action, with skipBooking set since a human already arranged the time.
export async function runPostCallActions(
  callId: string,
  options: { skipBooking?: boolean } = {},
): Promise<void> {
  const [call] = await db.select().from(calls).where(eq(calls.id, callId));
  if (!call) return;

  const stepErrors: Record<string, string> = {
    ...((call.stepErrors as Record<string, string> | null) ?? {}),
  };

  if (call.priceMentioned) {
    try {
      await sendEscalation(
        `PRICE_SPOKEN: ${call.callerName ?? "Unknown caller"} ` +
          `(${call.callerNumber ?? "no number"}) — the assistant mentioned ` +
          `a price on call ${call.vaniCallId}.`,
      );
    } catch (error) {
      stepErrors.priceAlert = errorMessage(error);
    }
  }

  if (call.finalRoute === "QUALIFIED") {
    let bookedAt: Date | null = call.bookedAt;

    if (!options.skipBooking) {
      try {
        const booking = await bookConsultation({
          attendeeName: call.callerName ?? "Unknown",
          attendeeEmail: call.callerEmail ?? "",
          preferredTimes: call.preferredTimes,
        });
        bookedAt = booking.bookedAt;
        await db
          .update(calls)
          .set({ calcomBookingId: booking.calcomBookingId, bookedAt: booking.bookedAt })
          .where(eq(calls.id, callId));
      } catch (error) {
        stepErrors.calcom = errorMessage(error);
      }
    }

    let brief: string | null = call.brief;
    try {
      brief = await writeDesignerBrief({
        callerName: call.callerName,
        fields: (call.fields as Record<string, unknown>) ?? {},
        flags: call.flags ?? [],
      });
      await db.update(calls).set({ brief }).where(eq(calls.id, callId));
    } catch (error) {
      stepErrors.claude = errorMessage(error);
    }

    try {
      await sendDesignerBrief({
        bookedAt,
        brief: brief ?? "(brief unavailable)",
        callUrl: `${process.env.APP_URL ?? ""}/calls/${callId}`,
      });
      await db.update(calls).set({ telegramSentAt: new Date() }).where(eq(calls.id, callId));
    } catch (error) {
      stepErrors.telegram = errorMessage(error);
    }

    try {
      const deal = await upsertContactAndDeal({
        name: call.callerName,
        email: call.callerEmail,
        phone: call.callerNumber,
        costInr: call.costInr ? Number(call.costInr) : null,
      });
      await db
        .update(calls)
        .set({ hubspotContactId: deal.hubspotContactId, hubspotDealId: deal.hubspotDealId })
        .where(eq(calls.id, callId));
    } catch (error) {
      stepErrors.hubspot = errorMessage(error);
    }
  } else if (call.finalRoute === "ESCALATE") {
    try {
      await sendEscalation(
        `🔴 URGENT — existing client: ${call.callerName ?? "Unknown"} ` +
          `(${call.callerNumber ?? "no number"}). ${call.reasons ?? ""}`,
      );
    } catch (error) {
      stepErrors.escalate = errorMessage(error);
    }
  }

  if (Object.keys(stepErrors).length > 0) {
    await db.update(calls).set({ stepErrors }).where(eq(calls.id, callId));
  }
}
