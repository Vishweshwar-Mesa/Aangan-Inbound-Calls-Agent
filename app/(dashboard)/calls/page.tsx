import Link from "next/link";

import { GlobalFilters } from "@/components/global-filters";
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
import { formatDateTime, formatDuration } from "@/lib/format";
import { getActiveFilters } from "@/lib/filters";
import { listCalls } from "@/lib/queries";

export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const { status, range, from, to } = await getActiveFilters();
  const calls = await listCalls({ status, from, to, q });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-[#111111]">CALLS</h1>
        <a
          href={`/api/calls/export${q ? `?${new URLSearchParams({ q }).toString()}` : ""}`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Export CSV
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <GlobalFilters status={status} range={range} />

        <form action="/calls" className="ml-auto flex items-center gap-2">
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
                  <TableCell colSpan={5} className="py-8 text-center text-[#6B6659]">
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
                        <span className="font-medium text-[#111111]">
                          {call.callerName ?? call.callerNumber ?? "Unknown"}
                        </span>
                        {typeof fields.locality === "string" && fields.locality && (
                          <span className="block text-xs text-[#6B6659]">
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
