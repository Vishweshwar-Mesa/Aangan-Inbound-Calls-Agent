import Link from "next/link";

import { HourChart } from "@/components/charts/hour-chart";
import { Sparkline } from "@/components/charts/sparkline";
import { WeekdayChart } from "@/components/charts/weekday-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAnalyticsSummary, getDailySeries, getWonRates } from "@/lib/analytics";
import { formatDuration, formatInr } from "@/lib/format";
import { cn } from "@/lib/utils";

function pct(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(0)}%`;
}

function seconds(value: number | null): string {
  if (value === null) return "—";
  if (value < 60) return `${Math.round(value)}s`;
  return `${Math.round(value / 60)}m`;
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs font-bold tracking-wide uppercase text-[#6B6659]">{label}</p>
        <p className="mt-1 text-xl font-bold tabular-nums text-[#111111]">{value}</p>
      </CardContent>
    </Card>
  );
}

type ScoreStatus = "on-track" | "below" | "unmeasured";

function statusFor(
  value: number | null,
  compare: (v: number) => boolean,
): ScoreStatus {
  if (value === null) return "unmeasured";
  return compare(value) ? "on-track" : "below";
}

function StatusBadge({ status }: { status: ScoreStatus }) {
  const label =
    status === "on-track" ? "On track" : status === "below" ? "Below target" : "Not measured yet";
  const className =
    status === "on-track"
      ? "bg-[#111111] text-[#E7E4DD] border-2 border-[#111111]"
      : status === "below"
        ? "bg-transparent text-[#FF4B1F] border-2 border-[#FF4B1F]"
        : "bg-transparent text-[#6B6659] border-2 border-dashed border-[#A8A295]";
  return (
    <span
      className={cn(
        "px-2.5 py-1 text-xs font-bold tracking-wide uppercase whitespace-nowrap",
        className,
      )}
    >
      {label}
    </span>
  );
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string }>;
}) {
  const { days, from, to } = await searchParams;

  let since: Date;
  let until: Date | undefined;
  let activeDays = days === "60" ? "60" : "30";

  if (from && to) {
    since = new Date(from);
    until = new Date(to);
    activeDays = "custom";
  } else {
    const n = activeDays === "60" ? 60 : 30;
    since = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  }

  const [summary, dailySeries, wonRates] = await Promise.all([
    getAnalyticsSummary(since, until),
    getDailySeries(),
    getWonRates(),
  ]);

  const series = (
    key:
      | "answerRate"
      | "noPersonRate"
      | "agreementRate"
      | "bookingRate"
      | "bounceRate"
      | "hangUpRate",
  ) => dailySeries.map((d) => ({ value: d[key] }));
  const wrongDeclinedSeries = dailySeries.map((d) => ({ value: d.wronglyDeclined }));
  const pricesSpokenSeries = dailySeries.map((d) => ({ value: d.pricesSpoken }));

  const aiWonRate = wonRates.aiBooked ? wonRates.aiBooked.won / wonRates.aiBooked.total : null;
  const deskWonRate = wonRates.deskBooked
    ? wonRates.deskBooked.won / wonRates.deskBooked.total
    : null;
  const wonAtLeastEqual =
    aiWonRate !== null && deskWonRate !== null ? aiWonRate >= deskWonRate : null;

  const reviewHours = (summary.reviewedDeclines + summary.wronglyDeclined) * 3; // minutes
  const reviewHoursPerMonth = reviewHours / 60;

  const scorecard: {
    metric: string;
    target: string;
    value: string;
    status: ScoreStatus;
    sparkline: { value: number | null }[] | null;
  }[] = [
    {
      metric: "Answered",
      target: "≥ 99%",
      value: pct(summary.answerRate),
      status: statusFor(summary.answerRate, (v) => v >= 0.99),
      sparkline: series("answerRate"),
    },
    {
      metric: "No person",
      target: "≥ 90%",
      value: pct(summary.noPersonRate),
      status: statusFor(summary.noPersonRate, (v) => v >= 0.9),
      sparkline: series("noPersonRate"),
    },
    {
      metric: "Agreement",
      target: "≥ 95%",
      value: pct(summary.agreementRate),
      status: statusFor(summary.agreementRate, (v) => v >= 0.95),
      sparkline: series("agreementRate"),
    },
    {
      metric: "Wrongly declined",
      target: "0",
      value: String(summary.wronglyDeclined),
      status: summary.wronglyDeclined === 0 ? "on-track" : "below",
      sparkline: wrongDeclinedSeries,
    },
    {
      metric: "Booked",
      target: "≥ 95%",
      value: pct(summary.bookingRate),
      status: statusFor(summary.bookingRate, (v) => v >= 0.95),
      sparkline: series("bookingRate"),
    },
    {
      metric: "Bounces",
      target: "≤ 2%",
      value: pct(summary.bounceRate),
      status: statusFor(summary.bounceRate, (v) => v <= 0.02),
      sparkline: series("bounceRate"),
    },
    {
      metric: "Hang-ups",
      target: "≤ 10%",
      value: pct(summary.hangUpRate),
      status: statusFor(summary.hangUpRate, (v) => v <= 0.1),
      sparkline: series("hangUpRate"),
    },
    {
      metric: "Prices spoken",
      target: "0",
      value: String(summary.pricesSpoken),
      status: summary.pricesSpoken === 0 ? "on-track" : "below",
      sparkline: pricesSpokenSeries,
    },
    {
      metric: "Won rate, AI-booked vs desk-booked",
      target: "at least equal",
      value:
        aiWonRate !== null && deskWonRate !== null
          ? `${pct(aiWonRate)} vs ${pct(deskWonRate)}`
          : "—",
      status: wonAtLeastEqual === null ? "unmeasured" : wonAtLeastEqual ? "on-track" : "below",
      sparkline: null,
    },
    {
      metric: "Review time",
      target: "≤ 3 hrs/month",
      value: `${reviewHoursPerMonth.toFixed(1)} hrs`,
      status: statusFor(reviewHoursPerMonth, (v) => v <= 3),
      sparkline: null,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-[#111111]">ANALYTICS</h1>
        <div className="flex flex-wrap items-center gap-2">
          {(["30", "60"] as const).map((d) => (
            <Link
              key={d}
              href={`/analytics?days=${d}`}
              className={cn(
                "flex h-9 items-center border-2 border-[#111111] px-3.5 text-sm font-bold tracking-wide uppercase",
                activeDays === d
                  ? "bg-[#111111] text-[#E7E4DD]"
                  : "text-[#111111] hover:bg-[#DEDAD2]",
              )}
            >
              {d} days
            </Link>
          ))}
          <form action="/analytics" className="flex items-center gap-1.5">
            <Input type="date" name="from" defaultValue={from} className="w-36" />
            <span className="text-sm font-medium text-[#6B6659]">to</span>
            <Input type="date" name="to" defaultValue={to} className="w-36" />
          </form>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Answer rate" value={pct(summary.answerRate)} />
        <Stat label="No person" value={pct(summary.noPersonRate)} />
        <Stat label="Agreement" value={pct(summary.agreementRate)} />
        <Stat label="Booking rate" value={pct(summary.bookingRate)} />
        <Stat label="Bounce rate" value={pct(summary.bounceRate)} />
        <Stat label="Hang-ups" value={pct(summary.hangUpRate)} />
        <Stat label="Prices spoken" value={summary.pricesSpoken} />
        <Stat label="Avg. call length" value={formatDuration(summary.avgDurationS)} />
        <Stat label="Cost per call" value={formatInr(summary.costPerCall ?? 0)} />
        <Stat
          label="Cost per qualified"
          value={formatInr(summary.costPerQualified ?? 0)}
        />
        <Stat label="Time to acknowledge" value={seconds(summary.medianAckSeconds)} />
        <Stat label="Wrongly declined" value={summary.wronglyDeclined} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Calls by hour (IST)</CardTitle>
          </CardHeader>
          <CardContent>
            <HourChart data={summary.callsByHour} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Calls by weekday</CardTitle>
          </CardHeader>
          <CardContent>
            <WeekdayChart data={summary.callsByWeekday} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scorecard</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-[#111111] text-left text-xs font-bold tracking-wide uppercase text-[#6B6659]">
                <th className="px-4 py-2">Metric</th>
                <th className="px-4 py-2">Target</th>
                <th className="px-4 py-2">Current</th>
                <th className="px-4 py-2">60-day trend</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {scorecard.map((row) => (
                <tr key={row.metric} className="border-b border-[#A8A295] last:border-0">
                  <td className="px-4 py-3 font-medium text-[#111111]">{row.metric}</td>
                  <td className="px-4 py-3 text-[#6B6659]">{row.target}</td>
                  <td className="px-4 py-3 tabular-nums font-bold text-[#111111]">{row.value}</td>
                  <td className="px-4 py-3">
                    {row.sparkline ? <Sparkline data={row.sparkline} /> : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
