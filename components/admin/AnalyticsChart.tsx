"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { cn } from "@/lib/utils";

interface ChartProps {
  data: { name?: string; date?: string; amount?: number; count?: number; revenue?: number }[];
  type?: "line" | "bar" | "area" | "pie";
  dataKey?: string;
  xKey?: string;
  height?: number;
  className?: string;
  colors?: string[];
}

const defaultColors = ["#475569", "#0ea5e9", "#22c55e", "#ef4444", "#6366f1"];

export function AnalyticsChart({
  data,
  type = "line",
  dataKey = "amount",
  xKey = "date",
  height = 300,
  className,
  colors = defaultColors,
}: ChartProps) {
  const renderChart = () => {
    switch (type) {
      case "bar":
        return (
          <BarChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="stroke-gray-200"
            />
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 12 }}
              className="text-gray-500"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              className="text-gray-500"
            />
            <Tooltip
              contentStyle={{
                borderRadius: "1rem",
                border: "1px solid rgba(0,0,0,0.1)",
                background: "var(--tooltip-bg, white)",
              }}
            />
            <Bar
              dataKey={dataKey}
              fill={colors[0]}
              radius={[8, 8, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        );

      case "area":
        return (
          <AreaChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="stroke-gray-200"
            />
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 12 }}
              className="text-gray-500"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              className="text-gray-500"
            />
            <Tooltip
              contentStyle={{
                borderRadius: "1rem",
                border: "1px solid rgba(0,0,0,0.1)",
              }}
            />
            <defs>
              <linearGradient id="colorGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors[0]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={colors[0]} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={colors[0]}
              fill="url(#colorGrad)"
              strokeWidth={2}
            />
          </AreaChart>
        );

      case "pie":
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={4}
              dataKey={dataKey}
              label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
            >
              {data.map((_, index) => (
                <Cell
                  key={index}
                  fill={colors[index % colors.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: "1rem",
                border: "1px solid rgba(0,0,0,0.1)",
              }}
            />
          </PieChart>
        );

      default:
        return (
          <LineChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="stroke-gray-200"
            />
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 12 }}
              className="text-gray-500"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              className="text-gray-500"
            />
            <Tooltip
              contentStyle={{
                borderRadius: "1rem",
                border: "1px solid rgba(0,0,0,0.1)",
              }}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={colors[0]}
              strokeWidth={2}
              dot={{ r: 4, fill: colors[0] }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        );
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}
