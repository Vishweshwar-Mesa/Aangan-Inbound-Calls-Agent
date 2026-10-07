// Phase 3 fills this in: Cal.com API v2, fetch slots for CALCOM_EVENT_TYPE_ID
// over the next 5 working days and book the best match.

export interface BookingInput {
  attendeeName: string;
  attendeeEmail: string;
  preferredTimes: unknown;
}

export interface BookingResult {
  calcomBookingId: string;
  bookedAt: Date;
}

export async function bookConsultation(
  input: BookingInput,
): Promise<BookingResult> {
  throw new Error("bookConsultation: not implemented until Phase 3");
}
