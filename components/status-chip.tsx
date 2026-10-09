import { cn } from "@/lib/utils";

const ROUTE_STYLES: Record<string, { label: string; className: string }> = {
  QUALIFIED: {
    label: "Qualified",
    className: "text-[#A8C6FF] bg-[rgba(143,184,255,.15)]",
  },
  NEEDS_REVIEW: {
    label: "Needs review",
    className: "text-[#FFC27A] bg-[rgba(255,194,122,.15)]",
  },
  NOT_A_FIT: {
    label: "Not a fit",
    className: "text-[#C2CADB] bg-[#1A2238]",
  },
  ESCALATE: {
    label: "Escalated",
    className: "text-[#FF9B85] bg-[rgba(255,155,133,.15)]",
  },
  NOT_ENQUIRY: {
    label: "Not an enquiry",
    className: "text-[#A9B2C8] bg-[#1A2238]",
  },
};

export function StatusChip({ route }: { route: string | null }) {
  const style = (route && ROUTE_STYLES[route]) || {
    label: route ?? "Missed",
    className: "text-[#A9B2C8] bg-[#1A2238]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        style.className,
      )}
    >
      {style.label}
    </span>
  );
}
