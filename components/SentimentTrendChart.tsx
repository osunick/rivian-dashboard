'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Report } from '@/lib/types';

interface Props {
  data: Report[];
}

function formatXAxis(timestamp: string): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a1a] border border-[#1F1F1F] rounded p-3 text-xs font-mono">
      <div className="text-[#6B7280] mb-2">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.fill }}>{p.name}</span>
          <span className="text-[#F5F5F5]">{p.value}%</span>
        </div>
      ))}
    </div>
  );
};

export default function SentimentTrendChart({ data }: Props) {
  const chartData = data.map(r => ({
    time: formatXAxis(r.timestamp),
    Positive: r.sentiment.positive,
    Neutral: r.sentiment.neutral,
    Negative: r.sentiment.negative,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gradPos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22C55E" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#22C55E" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="gradNeu" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6B7280" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6B7280" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="gradNeg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#EF4444" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" />
        <XAxis
          dataKey="time"
          tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
          tickLine={false}
          axisLine={{ stroke: '#1F1F1F' }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}%`}
          domain={[0, 100]}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '11px', color: '#6B7280', paddingTop: '8px' }}
          iconType="circle"
          iconSize={8}
        />
        <Area
          type="monotone"
          dataKey="Positive"
          stackId="1"
          stroke="#22C55E"
          fill="url(#gradPos)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="Neutral"
          stackId="1"
          stroke="#6B7280"
          fill="url(#gradNeu)"
          strokeWidth={1.5}
        />
        <Area
          type="monotone"
          dataKey="Negative"
          stackId="1"
          stroke="#EF4444"
          fill="url(#gradNeg)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
