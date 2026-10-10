import Link from "next/link";

import { confirmDecline, sendToDesigner } from "./actions";
import { StatusChip } from "@/components/status-chip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { listReviewQueue } from "@/lib/queries";
import { CRITERIA_LABELS } from "@/lib/rubric-labels";

export default async function ReviewPage() {
  const queue = await listReviewQueue();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111111]">REVIEW QUEUE</h1>
        <p className="text-sm font-medium text-[#6B6659]">
          {queue.length} CALL{queue.length === 1 ? "" : "S"} WAITING
        </p>
      </div>

      {queue.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-[#6B6659]">
            Nothing to review.
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {queue.map((call) => {
          const criteria = (call.criteria as Record<string, string>) ?? {};
          const failedChecks = Object.entries(criteria).filter(
            ([, value]) => value === "fail",
          );

          return (
            <Card key={call.id}>
              <CardContent className="flex flex-col gap-3 py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/calls/${call.id}`}
                      className="font-bold text-[#111111] hover:underline"
                    >
                      {call.callerName ?? call.callerNumber ?? "Unknown caller"}
                    </Link>
                    <p className="text-xs font-medium text-[#6B6659]">
                      {formatDateTime(call.createdAt)}
                    </p>
                  </div>
                  <StatusChip route={call.finalRoute} />
                </div>

                {failedChecks.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {failedChecks.map(([id]) => (
                      <span
                        key={id}
                        className="border-2 border-[#FF4B1F] px-2.5 py-1 text-xs font-bold tracking-wide uppercase text-[#FF4B1F]"
                      >
                        {CRITERIA_LABELS[id] ?? id} failed
                      </span>
                    ))}
                  </div>
                )}

                {call.reasons && <p className="text-sm text-[#111111]">{call.reasons}</p>}
                {call.verdict && (
                  <p className="border-l-2 border-[#111111] pl-3 text-sm font-medium text-[#6B6659]">
                    {call.verdict}
                  </p>
                )}

                <div className="flex gap-2 border-t-2 border-[#111111] pt-3">
                  <form action={confirmDecline}>
                    <input type="hidden" name="callId" value={call.id} />
                    <Button type="submit" variant="outline" size="sm">
                      Confirm decline
                    </Button>
                  </form>
                  <form action={sendToDesigner}>
                    <input type="hidden" name="callId" value={call.id} />
                    <Button type="submit" size="sm">
                      Send to designer
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
