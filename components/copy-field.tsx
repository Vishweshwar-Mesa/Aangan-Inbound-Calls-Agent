"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-center justify-between gap-3 border-2 border-[#111111] bg-[#DEDAD2] px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs font-bold tracking-wide uppercase text-[#6B6659]">{label}</p>
        <p className="truncate font-mono text-xs text-[#111111]">{value}</p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            // clipboard API unavailable — nothing to fall back to here
          }
        }}
      >
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
