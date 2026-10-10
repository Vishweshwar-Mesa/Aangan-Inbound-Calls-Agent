import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusChip } from "@/components/status-chip";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatDuration } from "@/lib/format";
import { getDealUrl } from "@/lib/hubspot";
import { getCallById, getContactCallHistory } from "@/lib/queries";
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
      ? "bg-[#111111] text-[#E7E4DD] border-2 border-[#111111]"
      : value === "fail"
        ? "bg-transparent text-[#FF4B1F] border-2 border-[#FF4B1F]"
        : "bg-transparent text-[#111111] border-2 border-dashed border-[#111111]";

  return (
    <div className={cn("p-3", style)}>
      <p className="text-xs font-bold tracking-wide uppercase opacity-80">
        {CRITERIA_LABELS[id] ?? id}
      </p>
      <p className="mt-1 text-sm font-bold uppercase">{value}</p>
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
  const history = call.contactId ? await getContactCallHistory(call.contactId, call.id) : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#111111]">
              {call.callerName ?? call.callerNumber ?? "Unknown caller"}
            </h1>
            <StatusChip route={call.finalRoute} />
          </div>
          <p className="mt-1 text-sm font-medium text-[#6B6659]">
            {call.callerNumber} {call.callerEmail ? `· ${call.callerEmail}` : ""}
          </p>
          {call.flags && call.flags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {call.flags.map((flag) => (
                <span
                  key={flag}
                  className="border border-[#111111] px-2 py-0.5 text-xs font-bold tracking-wide uppercase text-[#111111]"
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
                <CardTitle>Designer brief</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-[#111111]">{call.brief}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Fields</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                {Object.entries(FIELD_LABELS).map(([key, label]) => (
                  <div key={key}>
                    <dt className="text-xs font-bold tracking-wide uppercase text-[#6B6659]">
                      {label}
                    </dt>
                    <dd className="text-sm text-[#111111]">
                      {fields[key] !== null && fields[key] !== undefined
                        ? String(fields[key])
                        : "—"}
                    </dd>
                  </div>
                ))}
              </dl>
              {call.reasons && (
                <p className="mt-4 border-t-2 border-[#111111] pt-3 text-sm text-[#6B6659]">
                  {call.reasons}
                </p>
              )}
            </CardContent>
          </Card>

          {call.transcript && (
            <Card>
              <CardHeader>
                <CardTitle>Transcript</CardTitle>
              </CardHeader>
              <CardContent>
                {call.recordingUrl && (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <audio controls src={call.recordingUrl} className="mb-4 w-full" />
                )}
                <p className="whitespace-pre-wrap text-sm text-[#111111]">{call.transcript}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Consultation</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p className="text-sm font-medium text-[#111111]">
                {formatDateTime(call.bookedAt)}
              </p>
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
                <p className="text-sm text-[#6B6659]">Not booked.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Nikhil&apos;s five checks</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {Object.keys(CRITERIA_LABELS).map((id) => (
                <CriterionTile key={id} id={id} value={criteria[id] ?? "unclear"} />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Agent vs. re-score</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              <p className="text-[#6B6659]">
                Agent: <span className="font-medium text-[#111111]">{call.agentRoute ?? "—"}</span>
              </p>
              <p className="text-[#6B6659]">
                Re-score:{" "}
                <span className="font-medium text-[#111111]">{call.geminiRoute ?? "—"}</span>
              </p>
              <p
                className={cn(
                  "mt-2 text-xs font-bold tracking-wide uppercase",
                  agreed === null
                    ? "text-[#6B6659]"
                    : agreed
                      ? "text-[#111111]"
                      : "text-[#FF4B1F]",
                )}
              >
                {agreed === null ? "Not comparable" : agreed ? "Agreed" : "Disagreed"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="grid grid-cols-2 gap-3 py-5 text-sm">
              <div>
                <p className="text-xs font-bold tracking-wide uppercase text-[#6B6659]">
                  Received
                </p>
                <p className="text-[#111111]">{formatDateTime(call.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs font-bold tracking-wide uppercase text-[#6B6659]">
                  Length
                </p>
                <p className="tabular-nums text-[#111111]">{formatDuration(call.durationS)}</p>
              </div>
            </CardContent>
          </Card>

          {history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Caller history ({history.length} other call
                  {history.length === 1 ? "" : "s"})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1">
                {history.map((past) => (
                  <Link
                    key={past.id}
                    href={`/calls/${past.id}`}
                    className="flex items-center justify-between px-2 py-1.5 text-sm hover:bg-[#DEDAD2]"
                  >
                    <span className="text-[#111111]">{formatDateTime(past.createdAt)}</span>
                    <StatusChip route={past.finalRoute} />
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
