"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function WeekdayChart({
  data,
}: {
  data: { weekday: number; count: number }[];
}) {
  const chartData = data.map((d) => ({ ...d, label: WEEKDAY_LABELS[d.weekday] }));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={chartData}>
        <XAxis dataKey="label" stroke="#A9B2C8" fontSize={11} />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          contentStyle={{
            background: "#10172A",
            border: "1px solid #1C2438",
            borderRadius: 8,
            color: "#F3F5FA",
          }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#A8C6FF" />
      </BarChart>
    </ResponsiveContainer>
  );
}
