"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { calls } from "@/lib/db/schema";
import { runPostCallActions } from "@/lib/post-call";

export async function confirmDecline(formData: FormData) {
  const callId = String(formData.get("callId"));
  const session = await auth();

  await db
    .update(calls)
    .set({
      reviewOutcome: "confirmed_decline",
      reviewedBy: session?.user?.email ?? "unknown",
      reviewedAt: new Date(),
    })
    .where(eq(calls.id, callId));

  revalidatePath("/review");
  revalidatePath("/");
}

// Treats the call as QUALIFIED from here on — a human overruling the
// original route is exactly what "send to designer" means — then runs the
// same brief/Telegram/HubSpot steps as a normal QUALIFIED call, skipping
// Cal.com since the designer calls the caller to book directly.
export async function sendToDesigner(formData: FormData) {
  const callId = String(formData.get("callId"));
  const session = await auth();

  await db
    .update(calls)
    .set({
      finalRoute: "QUALIFIED",
      reviewOutcome: "sent_to_designer",
      reviewedBy: session?.user?.email ?? "unknown",
      reviewedAt: new Date(),
    })
    .where(eq(calls.id, callId));

  await runPostCallActions(callId, { skipBooking: true });

  revalidatePath("/review");
  revalidatePath("/");
  revalidatePath(`/calls/${callId}`);
}
