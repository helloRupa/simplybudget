'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { TranslationKey } from '@/i18n/locales';

interface ChartData {
  week: string;
  spent: number;
  budget: number;
}

interface SpendingChartProps {
  data: ChartData[];
  t: (key: TranslationKey) => string;
}

export default function SpendingChart({ data, t }: SpendingChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-purple-400">
        No data to display
      </div>
    );
  }

  const budgetAmount = data[0]?.budget || 0;

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#7e22ce33" />
          <XAxis
            dataKey="week"
            tick={{ fill: '#c4b5fd', fontSize: 12 }}
            axisLine={{ stroke: '#7e22ce55' }}
            tickLine={{ stroke: '#7e22ce55' }}
          />
          <YAxis
            tick={{ fill: '#c4b5fd', fontSize: 12 }}
            axisLine={{ stroke: '#7e22ce55' }}
            tickLine={{ stroke: '#7e22ce55' }}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#3b0764',
              border: '1px solid #7e22ce',
              borderRadius: '12px',
              color: '#fff',
            }}
            formatter={(value) => [`$${Number(value).toFixed(2)}`, '']}
            labelStyle={{ color: '#c4b5fd' }}
          />
          <Legend
            wrapperStyle={{ color: '#c4b5fd', fontSize: 12 }}
          />
          <ReferenceLine
            y={budgetAmount}
            stroke="#22c55e"
            strokeDasharray="5 5"
            label={{
              value: t('budget'),
              fill: '#22c55e',
              fontSize: 11,
              position: 'right',
            }}
          />
          <Bar
            dataKey="spent"
            name={t('spent')}
            fill="#a855f7"
            radius={[6, 6, 0, 0]}
            maxBarSize={50}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
