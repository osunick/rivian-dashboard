'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { PublishTrendPoint } from '@/lib/data';

interface Props {
  data: PublishTrendPoint[];
}

const COLORS = {
  positive: '#2DD4A7',
  neutral: '#8B8F99',
  negative: '#F0453A',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const map: Record<string, number> = {};
  for (const p of payload) map[p.dataKey] = p.value;
  const total = (map.positive ?? 0) + (map.neutral ?? 0) + (map.negative ?? 0);
  return (
    <div className="rounded-md border border-marvel-line bg-[#0C0C10]/95 px-3 py-2.5 shadow-cinematic backdrop-blur">
      <div className="mb-2 font-mono-num text-[10px] uppercase tracking-[0.22em] text-claude-muted">
        {label} · {total} signals
      </div>
      <div className="space-y-1">
        {(['positive', 'neutral', 'negative'] as const).map(k => (
          <div key={k} className="flex items-center justify-between gap-6 text-[12px]">
            <span className="flex items-center gap-2" style={{ color: COLORS[k] }}>
              <span className="inline-block h-2 w-2 rounded-sm" style={{ background: COLORS[k] }} />
              {k}
            </span>
            <span className="font-mono-num font-semibold text-claude-text">{map[k] ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function PublishSentimentTrend({ data }: Props) {
  if (!data.length) {
    return (
      <div className="flex h-[220px] items-center justify-center font-mono-num text-[11px] uppercase tracking-[0.22em] text-claude-muted">
        No dated signals in range
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={232}>
      <AreaChart data={data} margin={{ top: 8, right: 6, left: -22, bottom: 0 }}>
        <defs>
          <linearGradient id="trendPos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.positive} stopOpacity={0.55} />
            <stop offset="100%" stopColor={COLORS.positive} stopOpacity={0.04} />
          </linearGradient>
          <linearGradient id="trendNeu" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.neutral} stopOpacity={0.4} />
            <stop offset="100%" stopColor={COLORS.neutral} stopOpacity={0.03} />
          </linearGradient>
          <linearGradient id="trendNeg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.negative} stopOpacity={0.6} />
            <stop offset="100%" stopColor={COLORS.negative} stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 4" stroke="#1F1F27" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: '#7A7A86', fontSize: 10, fontFamily: 'var(--font-mono)' }}
          tickLine={false}
          axisLine={{ stroke: '#26262F' }}
          interval="preserveStartEnd"
          minTickGap={16}
        />
        <YAxis
          tick={{ fill: '#7A7A86', fontSize: 10, fontFamily: 'var(--font-mono)' }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          width={42}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#E62429', strokeWidth: 1, strokeDasharray: '3 3' }} />
        <Area type="monotone" dataKey="negative" stackId="1" stroke={COLORS.negative} strokeWidth={1.5} fill="url(#trendNeg)" />
        <Area type="monotone" dataKey="neutral" stackId="1" stroke={COLORS.neutral} strokeWidth={1.5} fill="url(#trendNeu)" />
        <Area type="monotone" dataKey="positive" stackId="1" stroke={COLORS.positive} strokeWidth={1.5} fill="url(#trendPos)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
