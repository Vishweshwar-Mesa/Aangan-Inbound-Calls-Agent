// Phase 3 fills this in: HubSpot CRM API, free tier, private app token.
// Find the contact by phone or email, or create one; create a deal in stage
// "Consultation booked" and associate it.

export interface HubspotDealInput {
  name: string | null;
  email: string | null;
  phone: string | null;
  costInr: number | null;
}

export interface HubspotDealResult {
  hubspotContactId: string;
  hubspotDealId: string;
}

export async function upsertContactAndDeal(
  input: HubspotDealInput,
): Promise<HubspotDealResult> {
  throw new Error("upsertContactAndDeal: not implemented until Phase 3");
}
