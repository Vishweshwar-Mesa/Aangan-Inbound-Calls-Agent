import { and, eq, gte, lte, sql } from "drizzle-orm";

import { db } from "./db";
import { calls } from "./db/schema";
import type { StatusFilter } from "./filter-options";
import { getDealStages } from "./hubspot";

export interface AnalyticsSummary {
  total: number;
  answered: number;
  answerRate: number | null;
  noPersonHandled: number;
  noPersonRate: number | null;
  reviewedDeclines: number;
  confirmedDeclines: number;
  agreementRate: number | null;
  wronglyDeclined: number;
  qualified: number;
  booked: number;
  bookingRate: number | null;
  invitesSent: number;
  invitesBounced: number;
  bounceRate: number | null;
  hangUps: number;
  hangUpRate: number | null;
  pricesSpoken: number;
  avgDurationS: number | null;
  costPerCall: number | null;
  costPerQualified: number | null;
  medianAckSeconds: number | null;
  callsByHour: { hour: number; count: number }[];
  callsByWeekday: { weekday: number; count: number }[];
}

export async function getAnalyticsSummary(
  since: Date,
  until?: Date,
  status: StatusFilter = "ALL",
): Promise<AnalyticsSummary> {
  const dateCondition = until
    ? and(gte(calls.createdAt, since), lte(calls.createdAt, until))
    : gte(calls.createdAt, since);
  const range =
    status === "ALL" ? dateCondition : and(dateCondition, eq(calls.finalRoute, status));

  const [totals] = await db
    .select({
      total: sql<number>`count(*)`,
      answered: sql<number>`count(*) filter (where ${calls.endedReason} is distinct from 'missed')`,
      noPersonHandled: sql<number>`count(*) filter (where (${calls.finalRoute} = 'QUALIFIED' and ${calls.reviewOutcome} is null) or ${calls.reviewOutcome} = 'confirmed_decline')`,
      reviewedDeclines: sql<number>`count(*) filter (where ${calls.finalRoute} in ('NOT_A_FIT', 'NEEDS_REVIEW') and ${calls.reviewOutcome} is not null)`,
      confirmedDeclines: sql<number>`count(*) filter (where ${calls.reviewOutcome} = 'confirmed_decline')`,
      wronglyDeclined: sql<number>`count(*) filter (where ${calls.reviewOutcome} = 'sent_to_designer')`,
      qualified: sql<number>`count(*) filter (where ${calls.finalRoute} = 'QUALIFIED')`,
      booked: sql<number>`count(*) filter (where ${calls.finalRoute} = 'QUALIFIED' and ${calls.bookedAt} is not null)`,
      invitesSent: sql<number>`count(*) filter (where ${calls.calcomBookingId} is not null)`,
      invitesBounced: sql<number>`count(*) filter (where ${calls.inviteBounced})`,
      hangUps: sql<number>`count(*) filter (where ${calls.endedReason} = 'hung_up')`,
      pricesSpoken: sql<number>`count(*) filter (where ${calls.priceMentioned})`,
      avgDurationS: sql<number | null>`avg(${calls.durationS})`,
      totalCost: sql<number>`coalesce(sum(${calls.costInr}), 0)`,
      qualifiedCost: sql<number>`coalesce(sum(${calls.costInr}) filter (where ${calls.finalRoute} = 'QUALIFIED'), 0)`,
      medianAckSeconds: sql<number | null>`percentile_cont(0.5) within group (order by extract(epoch from (${calls.telegramAckAt} - ${calls.telegramSentAt}))) filter (where ${calls.telegramAckAt} is not null)`,
    })
    .from(calls)
    .where(range);

  const byHour = await db
    .select({
      hour: sql<number>`extract(hour from ${calls.createdAt} at time zone 'Asia/Kolkata')`,
      count: sql<number>`count(*)`,
    })
    .from(calls)
    .where(range)
    .groupBy(sql`1`);

  const byWeekday = await db
    .select({
      weekday: sql<number>`extract(dow from ${calls.createdAt} at time zone 'Asia/Kolkata')`,
      count: sql<number>`count(*)`,
    })
    .from(calls)
    .where(range)
    .groupBy(sql`1`);

  const hourMap = new Map(byHour.map((r) => [Number(r.hour), Number(r.count)]));
  const weekdayMap = new Map(byWeekday.map((r) => [Number(r.weekday), Number(r.count)]));

  const total = Number(totals?.total ?? 0);
  const answered = Number(totals?.answered ?? 0);
  const qualified = Number(totals?.qualified ?? 0);
  const reviewedDeclines = Number(totals?.reviewedDeclines ?? 0);
  const confirmedDeclines = Number(totals?.confirmedDeclines ?? 0);
  const invitesSent = Number(totals?.invitesSent ?? 0);
  const invitesBounced = Number(totals?.invitesBounced ?? 0);
  const hangUps = Number(totals?.hangUps ?? 0);

  return {
    total,
    answered,
    answerRate: total ? answered / total : null,
    noPersonHandled: Number(totals?.noPersonHandled ?? 0),
    noPersonRate: total ? Number(totals?.noPersonHandled ?? 0) / total : null,
    reviewedDeclines,
    confirmedDeclines,
    agreementRate: reviewedDeclines ? confirmedDeclines / reviewedDeclines : null,
    wronglyDeclined: Number(totals?.wronglyDeclined ?? 0),
    qualified,
    booked: Number(totals?.booked ?? 0),
    bookingRate: qualified ? Number(totals?.booked ?? 0) / qualified : null,
    invitesSent,
    invitesBounced,
    bounceRate: invitesSent ? invitesBounced / invitesSent : null,
    hangUps,
    hangUpRate: answered ? hangUps / answered : null,
    pricesSpoken: Number(totals?.pricesSpoken ?? 0),
    avgDurationS: totals?.avgDurationS !== null ? Number(totals?.avgDurationS) : null,
    costPerCall: total ? Number(totals?.totalCost ?? 0) / total : null,
    costPerQualified: qualified ? Number(totals?.qualifiedCost ?? 0) / qualified : null,
    medianAckSeconds:
      totals?.medianAckSeconds !== null ? Number(totals?.medianAckSeconds) : null,
    callsByHour: Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hourMap.get(hour) ?? 0,
    })),
    callsByWeekday: Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      count: weekdayMap.get(weekday) ?? 0,
    })),
  };
}

export interface DailyPoint {
  day: string;
  answerRate: number | null;
  noPersonRate: number | null;
  agreementRate: number | null;
  wronglyDeclined: number;
  bookingRate: number | null;
  bounceRate: number | null;
  hangUpRate: number | null;
  pricesSpoken: number;
}

// Daily buckets for the scorecard's 60-day sparklines — always 60 days,
// independent of the page's selected date range.
export async function getDailySeries(): Promise<DailyPoint[]> {
  const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      day: sql<string>`to_char(${calls.createdAt} at time zone 'Asia/Kolkata', 'YYYY-MM-DD')`,
      total: sql<number>`count(*)`,
      answered: sql<number>`count(*) filter (where ${calls.endedReason} is distinct from 'missed')`,
      noPersonHandled: sql<number>`count(*) filter (where (${calls.finalRoute} = 'QUALIFIED' and ${calls.reviewOutcome} is null) or ${calls.reviewOutcome} = 'confirmed_decline')`,
      reviewedDeclines: sql<number>`count(*) filter (where ${calls.finalRoute} in ('NOT_A_FIT', 'NEEDS_REVIEW') and ${calls.reviewOutcome} is not null)`,
      confirmedDeclines: sql<number>`count(*) filter (where ${calls.reviewOutcome} = 'confirmed_decline')`,
      wronglyDeclined: sql<number>`count(*) filter (where ${calls.reviewOutcome} = 'sent_to_designer')`,
      qualified: sql<number>`count(*) filter (where ${calls.finalRoute} = 'QUALIFIED')`,
      booked: sql<number>`count(*) filter (where ${calls.finalRoute} = 'QUALIFIED' and ${calls.bookedAt} is not null)`,
      invitesSent: sql<number>`count(*) filter (where ${calls.calcomBookingId} is not null)`,
      invitesBounced: sql<number>`count(*) filter (where ${calls.inviteBounced})`,
      hangUps: sql<number>`count(*) filter (where ${calls.endedReason} = 'hung_up')`,
      pricesSpoken: sql<number>`count(*) filter (where ${calls.priceMentioned})`,
    })
    .from(calls)
    .where(gte(calls.createdAt, since))
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  return rows.map((row) => {
    const total = Number(row.total);
    const answered = Number(row.answered);
    const reviewedDeclines = Number(row.reviewedDeclines);
    const qualified = Number(row.qualified);
    const invitesSent = Number(row.invitesSent);
    return {
      day: row.day,
      answerRate: total ? answered / total : null,
      noPersonRate: total ? Number(row.noPersonHandled) / total : null,
      agreementRate: reviewedDeclines ? Number(row.confirmedDeclines) / reviewedDeclines : null,
      wronglyDeclined: Number(row.wronglyDeclined),
      bookingRate: qualified ? Number(row.booked) / qualified : null,
      bounceRate: invitesSent ? Number(row.invitesBounced) / invitesSent : null,
      hangUpRate: answered ? Number(row.hangUps) / answered : null,
      pricesSpoken: Number(row.pricesSpoken),
    };
  });
}

export interface WonRates {
  aiBooked: { won: number; total: number } | null;
  deskBooked: { won: number; total: number } | null;
}

// "consultation-to-won from HubSpot deal stages" (CLAUDE.md Analytics),
// split AI-booked (Cal.com) vs desk-booked (review queue "send to
// designer") for the scorecard's "won rate" comparison.
export async function getWonRates(): Promise<WonRates> {
  const rows = await db
    .select({
      hubspotDealId: calls.hubspotDealId,
      calcomBookingId: calls.calcomBookingId,
      reviewOutcome: calls.reviewOutcome,
    })
    .from(calls)
    .where(sql`${calls.hubspotDealId} is not null`);

  if (rows.length === 0) return { aiBooked: null, deskBooked: null };

  let stages: Map<string, string>;
  try {
    stages = await getDealStages(rows.map((r) => r.hubspotDealId!));
  } catch {
    return { aiBooked: null, deskBooked: null };
  }

  const aiBooked = { won: 0, total: 0 };
  const deskBooked = { won: 0, total: 0 };
  for (const row of rows) {
    const stage = stages.get(row.hubspotDealId!);
    const won = stage === "closedwon";
    const bucket = row.calcomBookingId ? aiBooked : row.reviewOutcome === "sent_to_designer" ? deskBooked : null;
    if (!bucket) continue;
    bucket.total++;
    if (won) bucket.won++;
  }

  return {
    aiBooked: aiBooked.total ? aiBooked : null,
    deskBooked: deskBooked.total ? deskBooked : null,
  };
}
