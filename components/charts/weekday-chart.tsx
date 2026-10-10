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
        <XAxis dataKey="label" stroke="#6B6659" fontSize={11} />
        <Tooltip
          cursor={{ fill: "rgba(17,17,17,0.06)" }}
          contentStyle={{
            background: "#FFFFFF",
            border: "2px solid #111111",
            borderRadius: 0,
            color: "#111111",
          }}
        />
        <Bar dataKey="count" radius={0} fill="#111111" />
      </BarChart>
    </ResponsiveContainer>
  );
}
