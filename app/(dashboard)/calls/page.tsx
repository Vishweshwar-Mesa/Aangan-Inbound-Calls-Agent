import Link from "next/link";

import { StatusChip } from "@/components/status-chip";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatDateTime, formatDuration } from "@/lib/format";
import { getRouteCounts, listCalls } from "@/lib/queries";

const FILTERS = [
  { label: "All", route: undefined },
  { label: "Qualified", route: "QUALIFIED" },
  { label: "Not a fit", route: "NOT_A_FIT" },
  { label: "Needs review", route: "NEEDS_REVIEW" },
  { label: "Escalated", route: "ESCALATE" },
] as const;

function buildHref(route: string | undefined, q: string | undefined) {
  const params = new URLSearchParams();
  if (route) params.set("route", route);
  if (q) params.set("q", q);
  const qs = params.toString();
  return qs ? `/calls?${qs}` : "/calls";
}

export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<{ route?: string; q?: string }>;
}) {
  const { route, q } = await searchParams;
  const [calls, counts] = await Promise.all([listCalls({ route, q }), getRouteCounts()]);
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-[#F3F5FA]">Calls</h1>
        <a
          href={`/api/calls/export?${new URLSearchParams({
            ...(route ? { route } : {}),
            ...(q ? { q } : {}),
          }).toString()}`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Export CSV
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((filter) => {
          const active = (route ?? undefined) === filter.route;
          const count = filter.route ? (counts[filter.route] ?? 0) : totalCount;
          return (
            <Link
              key={filter.label}
              href={buildHref(filter.route, q)}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
                active
                  ? "border-transparent bg-[#F3F5FA] text-[#080C18]"
                  : "border-[#2A3450] text-[#C2CADB] hover:bg-[#1A2238]",
              )}
            >
              {filter.label}
              <span className={active ? "text-[#080C18]/60" : "text-[#A9B2C8]"}>
                {count}
              </span>
            </Link>
          );
        })}

        <form action="/calls" className="ml-auto flex items-center gap-2">
          {route && <input type="hidden" name="route" value={route} />}
          <Input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search name, locality or number"
            className="w-64"
          />
        </form>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Received</TableHead>
                <TableHead>Caller / locality</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Consultation</TableHead>
                <TableHead className="text-right">Length</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-[#A9B2C8]">
                    No calls match.
                  </TableCell>
                </TableRow>
              )}
              {calls.map((call) => {
                const fields = (call.fields as Record<string, unknown>) ?? {};
                return (
                  <TableRow key={call.id} className="cursor-pointer">
                    <TableCell className="whitespace-nowrap">
                      <Link href={`/calls/${call.id}`} className="block">
                        {formatDateTime(call.createdAt)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/calls/${call.id}`} className="block">
                        <span className="text-[#F3F5FA]">
                          {call.callerName ?? call.callerNumber ?? "Unknown"}
                        </span>
                        {typeof fields.locality === "string" && fields.locality && (
                          <span className="block text-xs text-[#A9B2C8]">
                            {fields.locality}
                          </span>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/calls/${call.id}`} className="block">
                        <StatusChip route={call.finalRoute} />
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Link href={`/calls/${call.id}`} className="block">
                        {formatDateTime(call.bookedAt)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <Link href={`/calls/${call.id}`} className="block">
                        {formatDuration(call.durationS)}
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
