"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";

export function HourChart({ data }: { data: { hour: number; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data}>
        <XAxis
          dataKey="hour"
          tickFormatter={(hour: number) => `${hour}`}
          stroke="#A9B2C8"
          fontSize={11}
          interval={2}
        />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          contentStyle={{
            background: "#10172A",
            border: "1px solid #1C2438",
            borderRadius: 8,
            color: "#F3F5FA",
          }}
          labelFormatter={(hour) => `${hour}:00`}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.hour}
              fill={entry.hour >= 10 && entry.hour < 19 ? "#A8C6FF" : "#2A3450"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
