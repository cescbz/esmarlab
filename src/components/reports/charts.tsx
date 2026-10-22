"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatGs } from "@/lib/format";

const COLORS = ["#0f766e", "#f59e0b", "#0ea5e9", "#84cc16", "#8b5cf6", "#ef4444", "#14b8a6", "#64748b"];

export function SimpleBarChart({
  data,
  xKey,
  series,
  height = 260,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  series: { key: string; label: string; color?: string }[];
  height?: number;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 10, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            width={58}
            tickFormatter={(value) => (Number(value) >= 1_000_000 ? `${Math.round(Number(value) / 1_000_000)}M` : Number(value) >= 1000 ? `${Math.round(Number(value) / 1000)}k` : String(value))}
          />
          <Tooltip
            formatter={(value: number) => formatGs(value)}
            contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: "#e2e8f0" }}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {series.map((item, index) => (
            <Bar key={item.key} dataKey={item.key} name={item.label} fill={item.color ?? COLORS[index % COLORS.length]} radius={[3, 3, 0, 0]} maxBarSize={34} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SimplePieChart({
  data,
  nameKey,
  valueKey,
  height = 260,
}: {
  data: Record<string, string | number>[];
  nameKey: string;
  valueKey: string;
  height?: number;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey={valueKey} nameKey={nameKey} innerRadius={48} outerRadius={78} paddingAngle={2}>
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => formatGs(value)} contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: "#e2e8f0" }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
