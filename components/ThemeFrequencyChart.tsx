'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

interface ThemeEntry {
  theme: string;
  count: number;
}

interface Props {
  data: ThemeEntry[];
  onThemeClick?: (theme: string) => void;
}

function truncate(s: string, n = 18): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#1a1a1a] border border-[#1F1F1F] rounded p-2 text-xs font-mono">
      <div className="text-[#F5F5F5]">{d.theme}</div>
      <div className="text-[#3B82F6]">{d.count} mentions</div>
    </div>
  );
};

export default function ThemeFrequencyChart({ data, onThemeClick }: Props) {
  const max = Math.max(...data.map(d => d.count), 1);

  const chartData = data.map(d => ({
    ...d,
    label: truncate(d.theme),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
          tickLine={false}
          axisLine={{ stroke: '#1F1F1F' }}
          domain={[0, max + 1]}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
          tickLine={false}
          axisLine={false}
          width={120}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1F1F1F' }} />
        <Bar dataKey="count" radius={[0, 2, 2, 0]} cursor={onThemeClick ? 'pointer' : 'default'}
          onClick={(d: any) => onThemeClick?.(d.theme)}>
          {chartData.map((_, i) => (
            <Cell
              key={i}
              fill="#3B82F6"
              fillOpacity={0.6 + (0.4 * (chartData.length - i) / chartData.length)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
