import * as chrono from "chrono-node";

export interface BookingInput {
  attendeeName: string;
  attendeeEmail: string;
  preferredTimes: unknown;
}

export interface BookingResult {
  calcomBookingId: string;
  bookedAt: Date;
}

const CAL_API_BASE = "https://api.cal.com/v2";
// ASSUME: Cal.com v2 versions each endpoint independently via this header.
// Verified against cal.com/docs at build time; re-check before go-live since
// Cal.com bumps these periodically.
const SLOTS_API_VERSION = "2024-09-04";
const BOOKINGS_API_VERSION = "2026-02-25";
const TIMEZONE = "Asia/Kolkata";
// A preferred time "matches" a slot if they land within this tolerance —
// preferred times are natural language ("this week, morning") parsed with
// chrono-node, so an exact-minute match isn't realistic.
const MATCH_TOLERANCE_MS = 90 * 60 * 1000;

function addWorkingDays(start: Date, days: number): Date {
  const result = new Date(start);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return result;
}

function parsePreferredTimes(preferredTimes: unknown, now: Date): Date[] {
  if (!Array.isArray(preferredTimes)) return [];
  return preferredTimes
    .filter((t): t is string => typeof t === "string")
    .map((t) => chrono.parseDate(t, now, { forwardDate: true }))
    .filter((d): d is Date => d !== null);
}

async function calFetch(path: string, apiVersion: string, init: RequestInit = {}) {
  const res = await fetch(`${CAL_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.CALCOM_API_KEY}`,
      "cal-api-version": apiVersion,
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`Cal.com ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function fetchAvailableSlots(
  start: Date,
  end: Date,
): Promise<Record<string, { start: string }[]>> {
  const url = new URL(`${CAL_API_BASE}/slots`);
  url.searchParams.set("eventTypeId", process.env.CALCOM_EVENT_TYPE_ID ?? "");
  url.searchParams.set("start", start.toISOString());
  url.searchParams.set("end", end.toISOString());
  url.searchParams.set("timeZone", TIMEZONE);

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.CALCOM_API_KEY}`,
      "cal-api-version": SLOTS_API_VERSION,
    },
  });
  if (!res.ok) {
    throw new Error(`Cal.com slots request failed: ${res.status} ${await res.text()}`);
  }
  const body = await res.json();
  return body.data ?? {};
}

async function createBooking(
  start: Date,
  attendee: { name: string; email: string },
): Promise<{ id?: number; uid?: string }> {
  const body = await calFetch("/bookings", BOOKINGS_API_VERSION, {
    method: "POST",
    body: JSON.stringify({
      eventTypeId: Number(process.env.CALCOM_EVENT_TYPE_ID),
      start: start.toISOString(),
      attendee: {
        name: attendee.name,
        email: attendee.email,
        timeZone: TIMEZONE,
      },
    }),
  });
  return body.data ?? {};
}

export async function bookConsultation(input: BookingInput): Promise<BookingResult> {
  const now = new Date();
  const windowEnd = addWorkingDays(now, 5);

  const slotsByDate = await fetchAvailableSlots(now, windowEnd);
  const allSlots = Object.values(slotsByDate)
    .flat()
    .map((slot) => new Date(slot.start))
    .sort((a, b) => a.getTime() - b.getTime());

  if (allSlots.length === 0) {
    throw new Error("bookConsultation: no available Cal.com slots in the next 5 working days");
  }

  const preferredDates = parsePreferredTimes(input.preferredTimes, now).sort(
    (a, b) => a.getTime() - b.getTime(),
  );

  let chosen: Date | undefined;
  for (const preferred of preferredDates) {
    chosen = allSlots.find(
      (slot) => Math.abs(slot.getTime() - preferred.getTime()) <= MATCH_TOLERANCE_MS,
    );
    if (chosen) break;
  }
  if (!chosen && preferredDates.length > 0) {
    chosen = allSlots.find((slot) => slot.getTime() >= preferredDates[0].getTime());
  }
  if (!chosen) {
    chosen = allSlots[0];
  }

  const booking = await createBooking(chosen, {
    name: input.attendeeName,
    email: input.attendeeEmail,
  });

  // Prefer uid over the numeric id: the dashboard's reschedule link
  // (cal.com/reschedule/{uid}) needs it, and nothing in this app looks the
  // booking up by numeric id.
  const bookingId = booking.uid ?? booking.id;
  if (bookingId === undefined) {
    throw new Error("bookConsultation: Cal.com response had no booking id");
  }

  return { calcomBookingId: String(bookingId), bookedAt: chosen };
}
