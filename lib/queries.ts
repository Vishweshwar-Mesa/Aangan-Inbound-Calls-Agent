import { and, asc, desc, eq, gte, isNotNull, isNull, or, sql } from "drizzle-orm";

import { db } from "./db";
import { calls } from "./db/schema";

// NOT_A_FIT / NEEDS_REVIEW calls with no review_outcome yet — the review
// queue's workload, shown as a badge count in the nav.
export async function getReviewCount(): Promise<number> {
  const rows = await db
    .select({ id: calls.id })
    .from(calls)
    .where(
      and(
        or(eq(calls.finalRoute, "NOT_A_FIT"), eq(calls.finalRoute, "NEEDS_REVIEW")),
        isNull(calls.reviewOutcome),
      ),
    );
  return rows.length;
}

export interface OverviewStats {
  callCount: number;
  qualified: number;
  escalated: number;
  closed: number; // NOT_A_FIT / NOT_ENQUIRY / NEEDS_REVIEW
  costThisMonthInr: number;
  avgDurationS: number | null;
  reviewCount: number;
}

export async function getOverviewStats(days: number): Promise<OverviewStats> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [windowStats, monthCost, reviewCount] = await Promise.all([
    db
      .select({
        callCount: sql<number>`count(*)`,
        qualified: sql<number>`count(*) filter (where ${calls.finalRoute} = 'QUALIFIED')`,
        escalated: sql<number>`count(*) filter (where ${calls.finalRoute} = 'ESCALATE')`,
        closed: sql<number>`count(*) filter (where ${calls.finalRoute} in ('NOT_A_FIT', 'NOT_ENQUIRY', 'NEEDS_REVIEW'))`,
        avgDurationS: sql<number | null>`avg(${calls.durationS})`,
      })
      .from(calls)
      .where(gte(calls.createdAt, since)),
    db
      .select({ total: sql<number>`coalesce(sum(${calls.costInr}), 0)` })
      .from(calls)
      .where(gte(calls.createdAt, monthStart)),
    getReviewCount(),
  ]);

  const stats = windowStats[0];
  return {
    callCount: Number(stats?.callCount ?? 0),
    qualified: Number(stats?.qualified ?? 0),
    escalated: Number(stats?.escalated ?? 0),
    closed: Number(stats?.closed ?? 0),
    costThisMonthInr: Number(monthCost[0]?.total ?? 0),
    avgDurationS: stats?.avgDurationS !== null ? Number(stats?.avgDurationS) : null,
    reviewCount,
  };
}

export interface CallSummary {
  id: string;
  callerName: string | null;
  callerNumber: string | null;
  finalRoute: string | null;
  createdAt: Date | null;
  bookedAt: Date | null;
}

export async function getNextConsultations(limit: number): Promise<CallSummary[]> {
  return db
    .select({
      id: calls.id,
      callerName: calls.callerName,
      callerNumber: calls.callerNumber,
      finalRoute: calls.finalRoute,
      createdAt: calls.createdAt,
      bookedAt: calls.bookedAt,
    })
    .from(calls)
    .where(and(eq(calls.finalRoute, "QUALIFIED"), isNotNull(calls.bookedAt), gte(calls.bookedAt, new Date())))
    .orderBy(asc(calls.bookedAt))
    .limit(limit);
}

export interface CallListRow {
  id: string;
  createdAt: Date | null;
  callerName: string | null;
  callerNumber: string | null;
  fields: unknown;
  finalRoute: string | null;
  bookedAt: Date | null;
  durationS: number | null;
}

const CALL_LIST_COLUMNS = {
  id: calls.id,
  createdAt: calls.createdAt,
  callerName: calls.callerName,
  callerNumber: calls.callerNumber,
  fields: calls.fields,
  finalRoute: calls.finalRoute,
  bookedAt: calls.bookedAt,
  durationS: calls.durationS,
} as const;

export async function listCalls(filters: {
  route?: string;
  q?: string;
}): Promise<CallListRow[]> {
  const conditions = [];
  if (filters.route) {
    conditions.push(eq(calls.finalRoute, filters.route));
  }
  if (filters.q) {
    const term = `%${filters.q.toLowerCase()}%`;
    conditions.push(
      sql`(lower(${calls.callerName}) like ${term} or lower(${calls.callerNumber}) like ${term} or lower(${calls.fields}->>'locality') like ${term})`,
    );
  }

  return db
    .select(CALL_LIST_COLUMNS)
    .from(calls)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(calls.createdAt));
}

export async function listReviewQueue() {
  return db
    .select()
    .from(calls)
    .where(
      and(
        or(eq(calls.finalRoute, "NOT_A_FIT"), eq(calls.finalRoute, "NEEDS_REVIEW")),
        isNull(calls.reviewOutcome),
      ),
    )
    .orderBy(asc(calls.createdAt));
}

export async function getCallById(id: string) {
  const [call] = await db.select().from(calls).where(eq(calls.id, id));
  return call ?? null;
}

export async function getRouteCounts(): Promise<Record<string, number>> {
  const rows = await db
    .select({ route: calls.finalRoute, count: sql<number>`count(*)` })
    .from(calls)
    .groupBy(calls.finalRoute);

  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.route ?? "UNSET"] = Number(row.count);
  }
  return counts;
}

export async function getLatestCalls(limit: number): Promise<CallSummary[]> {
  return db
    .select({
      id: calls.id,
      callerName: calls.callerName,
      callerNumber: calls.callerNumber,
      finalRoute: calls.finalRoute,
      createdAt: calls.createdAt,
      bookedAt: calls.bookedAt,
    })
    .from(calls)
    .orderBy(desc(calls.createdAt))
    .limit(limit);
}
