import { notFound } from "next/navigation";

import { StatusChip } from "@/components/status-chip";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatDuration } from "@/lib/format";
import { getDealUrl } from "@/lib/hubspot";
import { getCallById } from "@/lib/queries";
import { CRITERIA_LABELS } from "@/lib/rubric-labels";
import { cn } from "@/lib/utils";

const FIELD_LABELS: Record<string, string> = {
  locality: "Locality",
  property_type: "Property type",
  carpet_area_sqft: "Carpet area (sq ft)",
  scope: "Scope",
  current_state: "Current state",
  completion_needed_by: "Needed by",
  decision_maker: "Decision-maker",
  budget_volunteered: "Budget volunteered",
  source: "Source",
  consult_type: "Consult type",
};

function CriterionTile({ id, value }: { id: string; value: string }) {
  const style =
    value === "pass"
      ? "text-[#A8C6FF] bg-[rgba(143,184,255,.1)]"
      : value === "fail"
        ? "text-[#FF9B85] bg-[rgba(255,155,133,.1)]"
        : "text-[#FFC27A] bg-[rgba(255,194,122,.1)]";

  return (
    <div className={cn("rounded-xl p-3", style)}>
      <p className="text-xs font-medium opacity-80">{CRITERIA_LABELS[id] ?? id}</p>
      <p className="mt-1 text-sm font-semibold capitalize">{value}</p>
    </div>
  );
}

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const call = await getCallById(id);
  if (!call) notFound();

  const fields = (call.fields as Record<string, unknown>) ?? {};
  const criteria = (call.criteria as Record<string, string>) ?? {};
  const agreed =
    !call.agentRoute || !call.geminiRoute ? null : call.agentRoute === call.geminiRoute;
  const dealUrl = call.hubspotDealId ? await getDealUrl(call.hubspotDealId) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-[#F3F5FA]">
              {call.callerName ?? call.callerNumber ?? "Unknown caller"}
            </h1>
            <StatusChip route={call.finalRoute} />
          </div>
          <p className="mt-1 text-sm text-[#A9B2C8]">
            {call.callerNumber} {call.callerEmail ? `· ${call.callerEmail}` : ""}
          </p>
          {call.flags && call.flags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {call.flags.map((flag) => (
                <span
                  key={flag}
                  className="rounded-full bg-[#1A2238] px-2 py-0.5 text-xs text-[#C2CADB]"
                >
                  {flag}
                </span>
              ))}
            </div>
          )}
        </div>
        {dealUrl && (
          <a
            href={dealUrl}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Open in HubSpot
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {call.brief && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Designer brief</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-[#F3F5FA]">{call.brief}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fields</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                {Object.entries(FIELD_LABELS).map(([key, label]) => (
                  <div key={key}>
                    <dt className="text-xs text-[#A9B2C8]">{label}</dt>
                    <dd className="text-sm text-[#F3F5FA]">
                      {fields[key] !== null && fields[key] !== undefined
                        ? String(fields[key])
                        : "—"}
                    </dd>
                  </div>
                ))}
              </dl>
              {call.reasons && (
                <p className="mt-4 border-t border-[#1C2438] pt-3 text-sm text-[#A9B2C8]">
                  {call.reasons}
                </p>
              )}
            </CardContent>
          </Card>

          {call.transcript && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Transcript</CardTitle>
              </CardHeader>
              <CardContent>
                {call.recordingUrl && (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <audio controls src={call.recordingUrl} className="mb-4 w-full" />
                )}
                <p className="whitespace-pre-wrap text-sm text-[#C2CADB]">
                  {call.transcript}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Consultation</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p className="text-sm text-[#F3F5FA]">{formatDateTime(call.bookedAt)}</p>
              {call.calcomBookingId ? (
                <a
                  href={`https://cal.com/reschedule/${call.calcomBookingId}`}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Reschedule in Cal.com
                </a>
              ) : (
                <p className="text-sm text-[#A9B2C8]">Not booked.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nikhil's five checks</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {Object.keys(CRITERIA_LABELS).map((id) => (
                <CriterionTile key={id} id={id} value={criteria[id] ?? "unclear"} />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agent vs. re-score</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              <p className="text-[#A9B2C8]">
                Agent: <span className="text-[#F3F5FA]">{call.agentRoute ?? "—"}</span>
              </p>
              <p className="text-[#A9B2C8]">
                Re-score: <span className="text-[#F3F5FA]">{call.geminiRoute ?? "—"}</span>
              </p>
              <p
                className={cn(
                  "mt-2 font-medium",
                  agreed === null
                    ? "text-[#A9B2C8]"
                    : agreed
                      ? "text-[#A8C6FF]"
                      : "text-[#FFC27A]",
                )}
              >
                {agreed === null ? "Not comparable" : agreed ? "Agreed" : "Disagreed"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="grid grid-cols-2 gap-3 py-5 text-sm">
              <div>
                <p className="text-xs text-[#A9B2C8]">Received</p>
                <p className="text-[#F3F5FA]">{formatDateTime(call.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-[#A9B2C8]">Length</p>
                <p className="tabular-nums text-[#F3F5FA]">
                  {formatDuration(call.durationS)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
