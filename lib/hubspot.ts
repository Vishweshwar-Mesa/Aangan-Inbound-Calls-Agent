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

const HUBSPOT_BASE = "https://api.hubapi.com";
// Must exist already — created once by hand in HubSpot (Settings > Data
// Management > Properties > Deal properties > Create property > Number),
// internal name "ai_call_cost_inr". See docs/CONTEXT.md for the exact steps.
const COST_PROPERTY = "ai_call_cost_inr";
// Confirmed live against this portal via
// GET /crm/v4/associations/deals/contacts/labels (fromObjectTypeId 0-3
// "deals" -> toObjectTypeId 0-1 "contacts"). Earlier docs had guessed 5;
// that's wrong — HubSpot rejected it with INVALID_FROM_OBJECT.
const DEAL_TO_CONTACT_ASSOCIATION_TYPE_ID = 3;

async function hubspotFetch(path: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`${HUBSPOT_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.HUBSPOT_PRIVATE_APP_TOKEN}`,
      "content-type": "application/json",
      ...init.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`HubSpot ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function findContactByEmail(email: string): Promise<{ id: string } | null> {
  try {
    const body = await hubspotFetch(
      `/crm/v3/objects/contacts/${encodeURIComponent(email)}?idProperty=email`,
    );
    return { id: body.id };
  } catch {
    return null;
  }
}

async function findContactByPhone(phone: string): Promise<{ id: string } | null> {
  const body = await hubspotFetch(`/crm/v3/objects/contacts/search`, {
    method: "POST",
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: "phone", operator: "EQ", value: phone }] }],
      limit: 1,
    }),
  });
  const first = body.results?.[0];
  return first ? { id: first.id } : null;
}

async function createContact(input: HubspotDealInput): Promise<{ id: string }> {
  const [firstName, ...rest] = (input.name ?? "").trim().split(/\s+/);
  const body = await hubspotFetch(`/crm/v3/objects/contacts`, {
    method: "POST",
    body: JSON.stringify({
      properties: {
        ...(input.email ? { email: input.email } : {}),
        ...(input.phone ? { phone: input.phone } : {}),
        ...(firstName ? { firstname: firstName } : {}),
        ...(rest.length ? { lastname: rest.join(" ") } : {}),
      },
    }),
  });
  return { id: body.id };
}

let consultationStage: { pipelineId: string; stageId: string } | null = null;

async function getConsultationBookedStage(): Promise<{ pipelineId: string; stageId: string }> {
  if (consultationStage) return consultationStage;

  const body = await hubspotFetch(`/crm/v3/pipelines/deals`);
  for (const pipeline of body.results ?? []) {
    const stage = (pipeline.stages ?? []).find(
      (s: { label: string }) => s.label.toLowerCase() === "consultation booked",
    );
    if (stage) {
      consultationStage = { pipelineId: pipeline.id, stageId: stage.id };
      return consultationStage;
    }
  }
  throw new Error(
    'HubSpot: no deal stage labelled "Consultation booked" was found. Create it in ' +
      "Settings > Data Management > Deal pipelines first.",
  );
}

let portalInfo: { portalId: number; uiDomain: string } | null = null;

async function getPortalInfo(): Promise<{ portalId: number; uiDomain: string }> {
  if (portalInfo) return portalInfo;
  const body = await hubspotFetch(`/account-info/v3/details`);
  portalInfo = { portalId: body.portalId, uiDomain: body.uiDomain };
  return portalInfo;
}

export async function getDealUrl(dealId: string): Promise<string> {
  const { portalId, uiDomain } = await getPortalInfo();
  return `https://${uiDomain}/contacts/${portalId}/record/0-3/${dealId}`;
}

const ONE_HOUR_MS = 60 * 60 * 1000;
let dealStageCache: { at: number; stages: Map<string, string> } | null = null;

// "consultation-to-won from HubSpot deal stages, read via API and cached
// hourly" (CLAUDE.md Phase 4 Analytics). A module-level cache is
// best-effort on serverless (cold starts reset it) but avoids refetching
// on every analytics page load within the same warm instance.
export async function getDealStages(dealIds: string[]): Promise<Map<string, string>> {
  if (dealIds.length === 0) return new Map();
  if (dealStageCache && Date.now() - dealStageCache.at < ONE_HOUR_MS) {
    return dealStageCache.stages;
  }

  const body = await hubspotFetch(`/crm/v3/objects/deals/batch/read`, {
    method: "POST",
    body: JSON.stringify({
      inputs: dealIds.map((id) => ({ id })),
      properties: ["dealstage"],
    }),
  });

  const stages = new Map<string, string>();
  for (const result of body.results ?? []) {
    stages.set(result.id, result.properties?.dealstage ?? "");
  }
  dealStageCache = { at: Date.now(), stages };
  return stages;
}

export async function upsertContactAndDeal(
  input: HubspotDealInput,
): Promise<HubspotDealResult> {
  let contact = input.email ? await findContactByEmail(input.email) : null;
  if (!contact && input.phone) {
    contact = await findContactByPhone(input.phone);
  }
  if (!contact) {
    contact = await createContact(input);
  }

  const { pipelineId, stageId } = await getConsultationBookedStage();

  const deal = await hubspotFetch(`/crm/v3/objects/deals`, {
    method: "POST",
    body: JSON.stringify({
      properties: {
        dealname: `${input.name ?? "New lead"} — consultation`,
        pipeline: pipelineId,
        dealstage: stageId,
        ...(input.costInr !== null ? { [COST_PROPERTY]: input.costInr } : {}),
      },
      associations: [
        {
          to: { id: contact.id },
          types: [
            {
              associationCategory: "HUBSPOT_DEFINED",
              associationTypeId: DEAL_TO_CONTACT_ASSOCIATION_TYPE_ID,
            },
          ],
        },
      ],
    }),
  });

  return { hubspotContactId: contact.id, hubspotDealId: deal.id };
}
