// Types/constants shared by server code (lib/filters.ts) and the client
// picker (components/global-filters.tsx) — kept separate from lib/filters.ts
// because that file imports next/headers, which can't end up in a client
// bundle even transitively.
export type StatusFilter = "ALL" | "QUALIFIED" | "NOT_A_FIT" | "NEEDS_REVIEW" | "ESCALATE";
export type RangePreset = "today" | "7d" | "30d" | "90d";

export const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "NOT_A_FIT", label: "Not a fit" },
  { value: "NEEDS_REVIEW", label: "Needs review" },
  { value: "ESCALATE", label: "Escalated" },
];

export const RANGE_OPTIONS: { value: RangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
];
