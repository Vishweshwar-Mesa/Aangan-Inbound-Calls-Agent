"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOutAction } from "@/app/(dashboard)/actions";
import { NorthArrow } from "@/components/drafting-marks";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Principal's View" },
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
    <header className="sticky top-0 z-10 border-b-2 border-[#111111] bg-[#E7E4DD]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-6 px-8 py-4">
        <span className="text-lg font-bold tracking-tight text-[#111111]">AANGAN LEADS</span>
        <nav className="flex flex-wrap border-2 border-[#111111]" aria-label="Main">
          {LINKS.map((link, i) => {
            const active =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex h-11 items-center gap-2 px-4 text-sm font-bold uppercase tracking-wide transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#FF4B1F]",
                  i > 0 && "border-l-2 border-[#111111]",
                  active ? "bg-[#111111] text-[#E7E4DD]" : "text-[#111111] hover:bg-[#DEDAD2]",
                )}
              >
                {link.label}
                {link.label === "Review" && reviewCount > 0 && (
                  <span className="inline-flex min-w-5 items-center justify-center bg-[#FF4B1F] px-1.5 py-0.5 text-xs font-bold text-[#FFFFFF]">
                    {reviewCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/profile"
          className={cn(
            "ml-auto hidden truncate text-sm font-medium text-[#6B6659] underline-offset-4 hover:text-[#111111] hover:underline sm:block",
          )}
        >
          {email}
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            className="h-9 border-2 border-[#111111] px-3 text-xs font-bold tracking-wide uppercase text-[#111111] hover:bg-[#111111] hover:text-[#E7E4DD]"
          >
            Sign out
          </button>
        </form>
        <NorthArrow />
      </div>
    </header>
  );
}
