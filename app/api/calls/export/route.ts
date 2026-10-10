import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getActiveFilters } from "@/lib/filters";
import { listCalls } from "@/lib/queries";

export const runtime = "nodejs";

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? undefined;
  const { status, from, to } = await getActiveFilters();

  const rows = await listCalls({ status, from, to, q });

  const header = [
    "received",
    "caller_name",
    "caller_number",
    "locality",
    "outcome",
    "consultation",
    "duration_s",
  ];
  const lines = [header.map(csvCell).join(",")];
  for (const row of rows) {
    const fields = (row.fields as Record<string, unknown>) ?? {};
    lines.push(
      [
        row.createdAt?.toISOString() ?? "",
        row.callerName,
        row.callerNumber,
        fields.locality,
        row.finalRoute,
        row.bookedAt?.toISOString() ?? "",
        row.durationS,
      ]
        .map(csvCell)
        .join(","),
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "content-type": "text/csv",
      "content-disposition": `attachment; filename="calls.csv"`,
    },
  });
}
