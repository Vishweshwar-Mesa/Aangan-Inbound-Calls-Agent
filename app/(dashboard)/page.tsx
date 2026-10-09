import Link from "next/link";

import { StatusChip } from "@/components/status-chip";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatDuration, formatInr } from "@/lib/format";
import { getLatestCalls, getNextConsultations, getOverviewStats } from "@/lib/queries";

const WINDOW_DAYS = 30;

function Tile({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? "bg-[#F3F5FA] text-[#080C18]" : undefined}>
      <CardContent className="py-5">
        <p
          className={
            accent ? "text-sm text-[#080C18]/70" : "text-sm text-[#A9B2C8]"
          }
        >
          {label}
        </p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

export default async function OverviewPage() {
  const [stats, nextConsultations, latestCalls] = await Promise.all([
    getOverviewStats(WINDOW_DAYS),
    getNextConsultations(5),
    getLatestCalls(8),
  ]);

  const total = stats.qualified + stats.escalated + stats.closed || 1;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[#F3F5FA]">Overview</h1>
        <p className="text-sm text-[#A9B2C8]">Last {WINDOW_DAYS} days</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Calls" value={stats.callCount} />
        <Tile label="Avg. call length" value={formatDuration(stats.avgDurationS)} />
        <Tile label="Cost this month" value={formatInr(stats.costThisMonthInr)} />
        <Card className="bg-[#F3F5FA] text-[#080C18]">
          <CardContent className="flex items-center justify-between gap-3 py-5">
            <div>
              <p className="text-sm text-[#080C18]/70">Waiting for review</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {stats.reviewCount}
              </p>
            </div>
            <Link
              href="/review"
              className={buttonVariants({
                size: "sm",
                className: "bg-[#080C18] text-[#F3F5FA] hover:bg-[#080C18]/80",
              })}
            >
              Review now
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Where calls went</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-3 overflow-hidden rounded-full bg-[#1A2238]">
            <div
              className="bg-[#A8C6FF]"
              style={{ width: `${(stats.qualified / total) * 100}%` }}
              title={`Qualified: ${stats.qualified}`}
            />
            <div
              className="bg-[#C2CADB]"
              style={{ width: `${(stats.closed / total) * 100}%` }}
              title={`Closed: ${stats.closed}`}
            />
            <div
              className="bg-[#FF9B85]"
              style={{ width: `${(stats.escalated / total) * 100}%` }}
              title={`Escalated: ${stats.escalated}`}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-[#A9B2C8]">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#A8C6FF]" /> Qualified (
              {stats.qualified})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#C2CADB]" /> Closed (
              {stats.closed})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#FF9B85]" /> Escalated (
              {stats.escalated})
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Next consultations</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {nextConsultations.length === 0 && (
              <p className="text-sm text-[#A9B2C8]">Nothing booked yet.</p>
            )}
            {nextConsultations.map((call) => (
              <Link
                key={call.id}
                href={`/calls/${call.id}`}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-[#1A2238]"
              >
                <span className="text-sm text-[#F3F5FA]">
                  {call.callerName ?? call.callerNumber ?? "Unknown caller"}
                </span>
                <span className="text-sm tabular-nums text-[#A9B2C8]">
                  {formatDateTime(call.bookedAt)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Latest calls</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {latestCalls.length === 0 && (
              <p className="text-sm text-[#A9B2C8]">No calls yet.</p>
            )}
            {latestCalls.map((call) => (
              <Link
                key={call.id}
                href={`/calls/${call.id}`}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-[#1A2238]"
              >
                <span className="truncate text-sm text-[#F3F5FA]">
                  {call.callerName ?? call.callerNumber ?? "Unknown caller"}
                </span>
                <span className="flex shrink-0 items-center gap-2 text-sm text-[#A9B2C8]">
                  {formatDateTime(call.createdAt)}
                  <StatusChip route={call.finalRoute} />
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
