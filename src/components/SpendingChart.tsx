"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TranslationKey } from "@/i18n/locales";

interface ChartData {
  week: string;
  spent: number;
  budget: number;
}

interface SpendingChartProps {
  data: ChartData[];
  t: (key: TranslationKey) => string;
  fc: (amount: number) => string;
  currencySymbol: string;
}

function getBarFill(spent: number, budget: number): string {
  if (budget <= 0) {
    return "url(#barTeal)";
  }
  const pct = (spent / budget) * 100;
  if (pct > 90) {
    return "url(#barRed)";
  }
  if (pct > 70) {
    return "url(#barAmber)";
  }
  return "url(#barTeal)";
}

export default function SpendingChart({
  data,
  t,
  fc,
  currencySymbol,
}: SpendingChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500">
        {t("noChartData")}
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        >
          <defs>
            <linearGradient id="barTeal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5eead4" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <linearGradient id="barAmber" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
            <linearGradient id="barRed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fe7a5b" />
              <stop offset="100%" stopColor="#be123c" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="week"
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            axisLine={{ stroke: "#475569" }}
            tickLine={{ stroke: "#475569" }}
          />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            axisLine={{ stroke: "#475569" }}
            tickLine={{ stroke: "#475569" }}
            tickFormatter={(v) => `${currencySymbol}${v}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #475569",
              borderRadius: "12px",
              color: "#fff",
            }}
            formatter={(value, _name, props) => [
              `${fc(Number(value))} / ${fc((props.payload as ChartData).budget)}`,
              "",
            ]}
            labelStyle={{ color: "#94a3b8" }}
            itemStyle={{ color: "#fff" }}
            cursor={{ fill: "rgba(139, 92, 246, 0.1)" }}
          />
          <Bar
            dataKey="spent"
            name={t("spent")}
            maxBarSize={50}
            shape={(props: {
              x?: number;
              y?: number;
              width?: number;
              height?: number;
              payload?: ChartData;
            }) => {
              const payload = props.payload as ChartData;
              const fill = getBarFill(payload.spent, payload.budget);
              const { x = 0, y = 0, width = 0, height = 0 } = props;
              const r = 6;
              return (
                <path
                  d={`M${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} L${x},${y + height} Z`}
                  fill={fill}
                />
              );
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
