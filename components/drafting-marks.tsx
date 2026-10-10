// Corner registration marks and a top ruler strip — decorative drafting-set
// framing shared by every dashboard page. Static (no client JS needed).
export function CornerMarks() {
  const mark = (style: React.CSSProperties) => (
    <svg
      aria-hidden="true"
      style={{ position: "fixed", zIndex: 20, ...style }}
      width="18"
      height="18"
      viewBox="0 0 18 18"
    >
      <path d="M9 0V18M0 9H18" stroke="#111111" strokeWidth="1.5" />
    </svg>
  );

  return (
    <>
      {mark({ top: 10, left: 10 })}
      {mark({ top: 10, right: 10 })}
      {mark({ bottom: 10, left: 10 })}
      {mark({ bottom: 10, right: 10 })}
    </>
  );
}

export function RulerStrip() {
  const ticks = Array.from({ length: 20 }, (_, i) => i + 1);
  return (
    <div
      aria-hidden="true"
      className="flex border-b border-[#A8A295] px-8 pt-2 pb-1.5 text-[10px] font-bold tracking-wide text-[#6B6659]"
    >
      <div className="flex flex-1 justify-between">
        {ticks.map((n) => (
          <span key={n}>{n}</span>
        ))}
      </div>
    </div>
  );
}

export function NorthArrow({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} width="22" height="22" viewBox="0 0 22 22">
      <circle cx="11" cy="11" r="9.5" stroke="#111111" strokeWidth="1.3" fill="none" />
      <path d="M11 3L14 11L11 9.5L8 11L11 3Z" fill="#111111" />
      <text
        x="11"
        y="21"
        fontSize="6"
        fontWeight="700"
        textAnchor="middle"
        fill="#111111"
      >
        N
      </text>
    </svg>
  );
}
