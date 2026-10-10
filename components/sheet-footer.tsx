"use client";

import { usePathname } from "next/navigation";

// Drawing-set sheet numbers, in the same spirit as the nav's page order.
const SHEETS: { match: (path: string) => boolean; title: string; dwg: string }[] = [
  { match: (p) => p === "/", title: "OVERVIEW", dwg: "A-01" },
  { match: (p) => p === "/calls", title: "CALLS", dwg: "A-02" },
  { match: (p) => p.startsWith("/calls/"), title: "CALL DETAIL", dwg: "A-02.1" },
  { match: (p) => p === "/review", title: "REVIEW QUEUE", dwg: "A-03" },
  { match: (p) => p === "/analytics", title: "ANALYTICS", dwg: "A-04" },
  { match: (p) => p === "/settings", title: "SETTINGS", dwg: "A-05" },
  { match: (p) => p === "/profile", title: "PROFILE", dwg: "A-06" },
];

export function SheetFooter() {
  const pathname = usePathname();
  const sheet = SHEETS.find((s) => s.match(pathname)) ?? { title: "AANGAN LEADS", dwg: "A-00" };

  return (
    <footer className="flex flex-wrap items-stretch border-t-2 border-[#111111] text-[11px] font-bold tracking-wide text-[#111111]">
      <div className="flex items-center border-r-2 border-[#111111] px-5 py-2.5">
        AANGAN STUDIO
      </div>
      <div className="flex flex-1 items-center border-r-2 border-[#111111] px-5 py-2.5">
        LEADS DASHBOARD — {sheet.title}
      </div>
      <div className="flex items-center border-r-2 border-[#111111] px-5 py-2.5">
        DWG {sheet.dwg}
      </div>
      <div className="flex items-center gap-2.5 border-r-2 border-[#111111] px-5 py-2.5">
        <span>SCALE N.T.S.</span>
        <svg aria-hidden="true" width="64" height="10" viewBox="0 0 64 10">
          <path
            d="M0 1H64M0 1V9M16 1V6M32 1V9M48 1V6M64 1V9"
            stroke="#111111"
            strokeWidth="1.2"
            fill="none"
          />
        </svg>
      </div>
      <div className="flex items-center px-5 py-2.5">REV 01</div>
    </footer>
  );
}
