import Link from "next/link";

import { GlobalFilters } from "@/components/global-filters";
import { StatusChip } from "@/components/status-chip";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RANGE_OPTIONS } from "@/lib/filter-options";
import { getActiveFilters } from "@/lib/filters";
import { formatDateTime, formatDuration, formatInr } from "@/lib/format";
import { getLatestCalls, getNextConsultations, getOverviewStats } from "@/lib/queries";

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
    <Card className={accent ? "bg-[#111111] text-[#E7E4DD]" : undefined}>
      <CardContent className="py-5">
        <p className={accent ? "text-xs font-bold tracking-wide uppercase text-[#A8A295]" : "text-xs font-bold tracking-wide uppercase text-[#6B6659]"}>
          {label}
        </p>
        <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

export default async function OverviewPage() {
  const { status, range, from, to } = await getActiveFilters();

  const [stats, nextConsultations, latestCalls] = await Promise.all([
    getOverviewStats(from, to, status),
    getNextConsultations(5),
    getLatestCalls(8),
  ]);

  const total = stats.qualified + stats.escalated + stats.closed || 1;
  const rangeLabel = RANGE_OPTIONS.find((r) => r.value === range)?.label ?? range;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111111]">PRINCIPAL&apos;S VIEW</h1>
          <p className="text-sm font-medium text-[#6B6659]">
            {rangeLabel.toUpperCase()}
            {status !== "ALL" ? ` · ${status.replace("_", " ")}` : ""}
          </p>
        </div>
        <GlobalFilters status={status} range={range} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Calls" value={stats.callCount} />
        <Tile label="Avg. call length" value={formatDuration(stats.avgDurationS)} />
        <Tile label="Cost this month" value={formatInr(stats.costThisMonthInr)} />
        <Card className="border-[#FF4B1F] bg-[#FF4B1F] text-[#FFFFFF]">
          <CardContent className="flex items-center justify-between gap-3 py-5">
            <div>
              <p className="text-xs font-bold tracking-wide uppercase text-white/80">
                Waiting for review
              </p>
              <p className="mt-2 text-3xl font-bold tabular-nums">{stats.reviewCount}</p>
            </div>
            <Link
              href="/review"
              className={buttonVariants({
                size: "sm",
                className: "border-2 border-[#111111] bg-[#111111] text-[#FFFFFF] hover:bg-[#111111]/85",
              })}
            >
              Review now
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Where calls went</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-4 overflow-hidden border-2 border-[#111111]">
            <div
              className="bg-[#111111]"
              style={{ width: `${(stats.qualified / total) * 100}%` }}
              title={`Qualified: ${stats.qualified}`}
            />
            <div
              className="border-x-2 border-[#111111] bg-[#DEDAD2]"
              style={{ width: `${(stats.closed / total) * 100}%` }}
              title={`Closed: ${stats.closed}`}
            />
            <div
              className="bg-[#FF4B1F]"
              style={{ width: `${(stats.escalated / total) * 100}%` }}
              title={`Escalated: ${stats.escalated}`}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-5 text-sm font-medium text-[#6B6659]">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 bg-[#111111]" /> Qualified ({stats.qualified})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 border border-[#111111] bg-[#DEDAD2]" /> Closed (
              {stats.closed})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 bg-[#FF4B1F]" /> Escalated ({stats.escalated})
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Next consultations</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {nextConsultations.length === 0 && (
              <p className="text-sm text-[#6B6659]">Nothing booked yet.</p>
            )}
            {nextConsultations.map((call) => (
              <Link
                key={call.id}
                href={`/calls/${call.id}`}
                className="flex items-center justify-between px-2 py-1.5 hover:bg-[#DEDAD2]"
              >
                <span className="text-sm font-medium text-[#111111]">
                  {call.callerName ?? call.callerNumber ?? "Unknown caller"}
                </span>
                <span className="text-sm tabular-nums text-[#6B6659]">
                  {formatDateTime(call.bookedAt)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest calls</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {latestCalls.length === 0 && <p className="text-sm text-[#6B6659]">No calls yet.</p>}
            {latestCalls.map((call) => (
              <Link
                key={call.id}
                href={`/calls/${call.id}`}
                className="flex items-center justify-between gap-3 px-2 py-1.5 hover:bg-[#DEDAD2]"
              >
                <span className="truncate text-sm font-medium text-[#111111]">
                  {call.callerName ?? call.callerNumber ?? "Unknown caller"}
                </span>
                <span className="flex shrink-0 items-center gap-2 text-sm text-[#6B6659]">
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
