import { cookies } from "next/headers";

import { RANGE_OPTIONS, STATUS_OPTIONS, type RangePreset, type StatusFilter } from "./filter-options";

// Global, dashboard-wide filters (D28) — applied on Principal's View,
// Calls and Analytics. Persisted in cookies rather than the URL: this is
// an internal tool for 1-2 users, not a product with shareable report
// links, so we traded bookmarkable filtered URLs for simpler plumbing
// (one shared control instead of rewriting every nav link's query string).
const STATUS_COOKIE = "af_status";
const RANGE_COOKIE = "af_range";

export interface ActiveFilters {
  status: StatusFilter;
  range: RangePreset;
  from: Date;
  to: Date;
}

function isStatusFilter(value: string | undefined): value is StatusFilter {
  return !!value && STATUS_OPTIONS.some((o) => o.value === value);
}

function isRangePreset(value: string | undefined): value is RangePreset {
  return !!value && RANGE_OPTIONS.some((o) => o.value === value);
}

function rangeToDates(range: RangePreset): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  const days = range === "today" ? 0 : range === "7d" ? 7 : range === "90d" ? 90 : 30;
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

export async function getActiveFilters(): Promise<ActiveFilters> {
  const store = await cookies();
  const status = isStatusFilter(store.get(STATUS_COOKIE)?.value)
    ? (store.get(STATUS_COOKIE)!.value as StatusFilter)
    : "ALL";
  const range = isRangePreset(store.get(RANGE_COOKIE)?.value)
    ? (store.get(RANGE_COOKIE)!.value as RangePreset)
    : "30d";
  return { status, range, ...rangeToDates(range) };
}

export async function setActiveFilters(status: string, range: string): Promise<void> {
  const store = await cookies();
  const oneYear = 60 * 60 * 24 * 365;
  store.set(STATUS_COOKIE, isStatusFilter(status) ? status : "ALL", {
    path: "/",
    maxAge: oneYear,
  });
  store.set(RANGE_COOKIE, isRangePreset(range) ? range : "30d", { path: "/", maxAge: oneYear });
}
