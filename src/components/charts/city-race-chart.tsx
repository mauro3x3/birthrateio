"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = [
  "hsl(211 62% 45%)",
  "hsl(340 70% 48%)",
  "hsl(160 50% 38%)",
  "hsl(32 90% 48%)",
  "hsl(270 40% 48%)",
  "hsl(0 0% 45%)",
];

export function CityRaceChart({
  data,
  groups,
  height = 320,
}: {
  data: Record<string, number>[];
  groups: string[];
  height?: number;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 4" className="stroke-border/60" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            width={40}
          />
          <Tooltip
            formatter={(v: number, name: string) => [`${v.toFixed(1)}%`, name]}
            contentStyle={{
              borderRadius: 4,
              border: "1px solid hsl(var(--border))",
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {groups.map((g, i) => (
            <Bar
              key={g}
              dataKey={g}
              stackId="race"
              fill={COLORS[i % COLORS.length]}
              maxBarSize={48}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
