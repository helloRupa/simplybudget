'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { BarShapeProps } from 'recharts';
import { TranslationKey } from '@/i18n/locales';

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

function getBarColor(spent: number, budget: number): string {
  if (budget <= 0) return '#14b8a6'; // teal-500
  const pct = (spent / budget) * 100;
  if (pct > 90) return '#ef4444'; // red-500
  if (pct > 70) return '#f59e0b'; // amber-500
  return '#14b8a6'; // teal-500
}

export default function SpendingChart({ data, t, fc, currencySymbol }: SpendingChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500">
        No data to display
      </div>
    );
  }

  const budgetAmount = data[0]?.budget || 0;

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="week"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={{ stroke: '#475569' }}
            tickLine={{ stroke: '#475569' }}
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={{ stroke: '#475569' }}
            tickLine={{ stroke: '#475569' }}
            tickFormatter={(v) => `${currencySymbol}${v}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #475569',
              borderRadius: '12px',
              color: '#fff',
            }}
            formatter={(value, _name, props) => [
              `${fc(Number(value))} / ${fc((props.payload as ChartData).budget)}`,
              '',
            ]}
            labelStyle={{ color: '#94a3b8' }}
            itemStyle={{ color: '#fff' }}
            cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }}
          />
          <ReferenceLine
            y={budgetAmount}
            stroke="#2dd4bf"
            strokeDasharray="5 5"
            label={{
              value: t('budget'),
              fill: '#2dd4bf',
              fontSize: 11,
              position: 'right',
            }}
          />
          <Bar
            dataKey="spent"
            name={t('spent')}
            radius={[6, 6, 0, 0]}
            maxBarSize={50}
            shape={(props: BarShapeProps) => {
              const payload = props.payload as unknown as ChartData;
              const fill = getBarColor(payload.spent, payload.budget);
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
