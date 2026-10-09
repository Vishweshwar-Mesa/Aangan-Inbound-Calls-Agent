"use client";

import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

export function Sparkline({
  data,
  color = "#A8C6FF",
}: {
  data: { value: number | null }[];
  color?: string;
}) {
  const points = data.map((d) => ({ value: d.value ?? 0 }));
  const hasData = data.some((d) => d.value !== null);

  if (!hasData) {
    return <span className="text-xs text-[#A9B2C8]">not measured yet</span>;
  }

  return (
    <ResponsiveContainer width={96} height={28}>
      <LineChart data={points}>
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
