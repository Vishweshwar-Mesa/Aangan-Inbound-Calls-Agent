"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";

export function HourChart({ data }: { data: { hour: number; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data}>
        <XAxis
          dataKey="hour"
          tickFormatter={(hour: number) => `${hour}`}
          stroke="#6B6659"
          fontSize={11}
          interval={2}
        />
        <Tooltip
          cursor={{ fill: "rgba(17,17,17,0.06)" }}
          contentStyle={{
            background: "#FFFFFF",
            border: "2px solid #111111",
            borderRadius: 0,
            color: "#111111",
          }}
          labelFormatter={(hour) => `${hour}:00`}
        />
        <Bar dataKey="count" radius={0}>
          {data.map((entry) => (
            <Cell
              key={entry.hour}
              fill={entry.hour >= 10 && entry.hour < 19 ? "#111111" : "#A8A295"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
