import { eq } from "drizzle-orm";

import { db } from "./db";
import { contacts } from "./db/schema";

// Looks up the persistent contact for a phone number, creating one if this
// is the first time we've seen it. Returns null if there's no phone number
// to key on (e.g. Vaani hasn't surfaced one yet — see docs/CONTEXT.md).
export async function getOrCreateContact(phoneNumber: string | null): Promise<string | null> {
  if (!phoneNumber) return null;

  const [existing] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(eq(contacts.phoneNumber, phoneNumber));
  if (existing) return existing.id;

  const [created] = await db
    .insert(contacts)
    .values({ phoneNumber })
    .onConflictDoNothing({ target: contacts.phoneNumber })
    .returning({ id: contacts.id });
  if (created) return created.id;

  // Lost a race with a concurrent webhook call for the same number.
  const [raceWinner] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(eq(contacts.phoneNumber, phoneNumber));
  return raceWinner?.id ?? null;
}
