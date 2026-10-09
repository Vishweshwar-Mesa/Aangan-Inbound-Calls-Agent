"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/calls", label: "Calls" },
  { href: "/review", label: "Review" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
];

export function Nav({
  reviewCount,
  email,
}: {
  reviewCount: number;
  email: string | null | undefined;
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-[#1C2438] bg-[#080C18]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <span className="mr-2 text-sm font-semibold tracking-tight text-[#F3F5FA]">
          Aangan Leads
        </span>
        <nav className="flex flex-wrap items-center gap-1" aria-label="Main">
          {LINKS.map((link) => {
            const active =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A8C6FF]",
                  active
                    ? "bg-[#F3F5FA] text-[#080C18]"
                    : "text-[#C2CADB] hover:bg-[#1A2238]",
                )}
              >
                {link.label}
                {link.label === "Review" && reviewCount > 0 && (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#FFC27A] px-1.5 py-0.5 text-xs font-semibold text-[#080C18]">
                    {reviewCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <span className="ml-auto truncate text-sm text-[#A9B2C8]">{email}</span>
      </div>
    </header>
  );
}
