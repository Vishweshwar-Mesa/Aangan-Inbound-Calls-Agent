import { cn } from "@/lib/utils";

// Borrows drafting-set convention: solid fill = confirmed, dashed outline =
// provisional, grayed outline = excluded, solid orange = alarm.
const ROUTE_STYLES: Record<string, { label: string; className: string }> = {
  QUALIFIED: {
    label: "Qualified",
    className: "bg-[#111111] text-[#E7E4DD] border-2 border-[#111111]",
  },
  NEEDS_REVIEW: {
    label: "Needs review",
    className: "bg-transparent text-[#111111] border-2 border-dashed border-[#111111]",
  },
  NOT_A_FIT: {
    label: "Not a fit",
    className: "bg-transparent text-[#6B6659] border-2 border-[#A8A295]",
  },
  ESCALATE: {
    label: "Escalated",
    className: "bg-[#FF4B1F] text-[#FFFFFF] border-2 border-[#FF4B1F]",
  },
  NOT_ENQUIRY: {
    label: "Not an enquiry",
    className: "bg-[#DEDAD2] text-[#6B6659] border-2 border-[#DEDAD2]",
  },
};

export function StatusChip({ route }: { route: string | null }) {
  const style = (route && ROUTE_STYLES[route]) || {
    label: route ?? "Missed",
    className: "bg-[#DEDAD2] text-[#6B6659] border-2 border-[#DEDAD2]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 text-xs font-bold uppercase tracking-wide whitespace-nowrap",
        style.className,
      )}
    >
      {style.label}
    </span>
  );
}
