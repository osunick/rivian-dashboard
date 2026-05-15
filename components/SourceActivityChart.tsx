'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { SOURCE_LABELS, SourceKey, SentimentLabel } from '@/lib/types';

interface SourceEntry {
  source: string;
  found: number;
  sentiment: SentimentLabel | null;
}

interface Props {
  data: SourceEntry[];
}

const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#22C55E',
  neutral:  '#6B7280',
  negative: '#EF4444',
  unknown:  '#374151',
};

function sentimentColor(s: SentimentLabel | null): string {
  return SENTIMENT_COLORS[s ?? 'unknown'];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#1a1a1a] border border-[#1F1F1F] rounded p-2 text-xs font-mono">
      <div className="text-[#F5F5F5]">{SOURCE_LABELS[d.source as SourceKey] ?? d.source}</div>
      <div className="text-[#6B7280]">{d.found} posts</div>
      {d.sentiment && (
        <div style={{ color: sentimentColor(d.sentiment) }}>{d.sentiment}</div>
      )}
    </div>
  );
};

export default function SourceActivityChart({ data }: Props) {
  const chartData = data
    .map(d => ({
      ...d,
      label: SOURCE_LABELS[d.source as SourceKey] ?? d.source,
    }))
    .sort((a, b) => b.found - a.found);

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
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
          tickLine={false}
          axisLine={false}
          width={72}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1F1F1F' }} />
        <Bar dataKey="found" radius={[0, 2, 2, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={index} fill={sentimentColor(entry.sentiment)} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
