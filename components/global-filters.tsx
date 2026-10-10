"use client";

import { useTransition } from "react";

import { setFilters } from "@/app/(dashboard)/actions";
import { RANGE_OPTIONS, STATUS_OPTIONS, type RangePreset, type StatusFilter } from "@/lib/filter-options";
import { cn } from "@/lib/utils";

export function GlobalFilters({
  status,
  range,
}: {
  status: StatusFilter;
  range: RangePreset;
}) {
  const [isPending, startTransition] = useTransition();

  function apply(next: { status?: string; range?: string }) {
    startTransition(() => {
      setFilters(next.status ?? status, next.range ?? range);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex border-2 border-[#111111]">
        {RANGE_OPTIONS.map((r, i) => (
          <button
            key={r.value}
            type="button"
            onClick={() => apply({ range: r.value })}
            className={cn(
              "h-7 px-2.5 text-xs font-bold tracking-wide uppercase transition-colors",
              i > 0 && "border-l-2 border-[#111111]",
              range === r.value
                ? "bg-[#111111] text-[#E7E4DD]"
                : "text-[#111111] hover:bg-[#DEDAD2]",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap border-2 border-[#111111]">
        {STATUS_OPTIONS.map((s, i) => (
          <button
            key={s.value}
            type="button"
            onClick={() => apply({ status: s.value })}
            className={cn(
              "h-7 px-2.5 text-xs font-bold tracking-wide uppercase transition-colors",
              i > 0 && "border-l-2 border-[#111111]",
              status === s.value
                ? "bg-[#111111] text-[#E7E4DD]"
                : "text-[#111111] hover:bg-[#DEDAD2]",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      {isPending && (
        <span className="text-xs font-medium text-[#6B6659]">Updating…</span>
      )}
    </div>
  );
}
