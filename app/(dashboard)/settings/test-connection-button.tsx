"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { testConnection } from "./actions";

export function TestConnectionButton({ service }: { service: string }) {
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => {
          setResult(null);
          startTransition(async () => {
            setResult(await testConnection(service));
          });
        }}
      >
        {isPending ? "Testing…" : "Test connection"}
      </Button>
      {result && (
        <span
          className={`text-xs font-bold ${result.ok ? "text-[#111111]" : "text-[#FF4B1F]"}`}
        >
          {result.ok ? "✓" : "✗"} {result.message}
        </span>
      )}
    </div>
  );
}
