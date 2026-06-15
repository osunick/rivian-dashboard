'use client';

import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { PublishTrendPoint, PublishTrendItem } from '@/lib/data';
import { SOURCE_LABELS } from '@/lib/types';

interface Props {
  data: PublishTrendPoint[];
}

const COLORS = {
  positive: '#2DD4A7',
  neutral: '#8B8F99',
  negative: '#F0453A',
};

type SentimentFilter = 'all' | 'positive' | 'neutral' | 'negative';

const FILTERS: { key: SentimentFilter; label: string; color: string }[] = [
  { key: 'all', label: 'All', color: '#E6E6EA' },
  { key: 'positive', label: 'Positive', color: COLORS.positive },
  { key: 'neutral', label: 'Neutral', color: COLORS.neutral },
  { key: 'negative', label: 'Negative', color: COLORS.negative },
];

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
      <div className="mt-2 font-mono-num text-[10px] text-[#E62429]">click to drill down ↓</div>
    </div>
  );
};

function DrillDownPanel({ point, filter, onClose }: { point: PublishTrendPoint; filter: SentimentFilter; onClose: () => void }) {
  const items = (point.items ?? []).filter(it => filter === 'all' || it.sentiment === filter);
  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-marvel-line bg-[#0C0C10]">
      <div className="flex items-center justify-between border-b border-marvel-line bg-[#111118] px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="font-mono-num text-[10px] uppercase tracking-[0.22em] text-[#E62429]">Drill-down</span>
          <span className="font-mono-num text-[11px] text-claude-text">{point.label}</span>
          <span className="flex gap-2">
            <span className="font-mono-num text-[11px]" style={{ color: COLORS.positive }}>▲{point.positive}</span>
            <span className="font-mono-num text-[11px]" style={{ color: COLORS.neutral }}>—{point.neutral}</span>
            <span className="font-mono-num text-[11px]" style={{ color: COLORS.negative }}>▼{point.negative}</span>
          </span>
        </div>
        <button
          onClick={onClose}
          className="font-mono-num text-[11px] text-claude-muted transition-colors hover:text-claude-text"
        >
          ✕ close
        </button>
      </div>

      {items.length === 0 ? (
        <div className="px-4 py-6 text-center font-mono-num text-[11px] text-claude-muted">
          No individual signals recorded for this day.
        </div>
      ) : (
        <div className="max-h-80 divide-y divide-marvel-line overflow-y-auto">
          {items.map((item: PublishTrendItem, i) => (
            <div key={item.url + i} className="group px-4 py-3 transition-colors hover:bg-[#111118]">
              <div className="flex items-start gap-3">
                <div
                  className="mt-1 w-1.5 flex-shrink-0 rounded-full"
                  style={{ height: '36px', backgroundColor: COLORS[item.sentiment] }}
                />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded bg-[#1A1A22] px-1.5 py-0.5 font-mono-num text-[10px] text-claude-muted">
                      {(SOURCE_LABELS as Record<string, string>)[item.source] ?? item.source}
                    </span>
                    <span
                      className="rounded px-1.5 py-0.5 font-mono-num text-[10px]"
                      style={{
                        color: COLORS[item.sentiment],
                        backgroundColor: COLORS[item.sentiment] + '18',
                        border: `1px solid ${COLORS[item.sentiment]}33`,
                      }}
                    >
                      {item.sentiment}
                    </span>
                    {item.publishedAt && (
                      <span className="font-mono-num text-[10px] text-claude-muted/70">· {item.publishedAt}</span>
                    )}
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-[13px] font-semibold leading-snug text-claude-text transition-colors hover:text-[#2DD4A7]"
                    title={item.title}
                  >
                    {item.title} ↗
                  </a>
                  {item.snippet && (
                    <p className="mt-0.5 text-[11px] leading-relaxed text-claude-muted">{item.snippet}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-marvel-line bg-[#111118] px-4 py-2 font-mono-num text-[10px] text-claude-muted">
        {items.length} signal{items.length !== 1 ? 's' : ''} · click any title to verify the source
      </div>
    </div>
  );
}

export default function PublishSentimentTrend({ data }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filter, setFilter] = useState<SentimentFilter>('all');

  if (!data.length) {
    return (
      <div className="flex h-[220px] items-center justify-center font-mono-num text-[11px] uppercase tracking-[0.22em] text-claude-muted">
        No dated signals in range
      </div>
    );
  }

  const selectedPoint = selectedDate ? data.find(d => d.date === selectedDate) ?? null : null;
  const show = (k: 'positive' | 'neutral' | 'negative') => filter === 'all' || filter === k;

  const handleClick = (chartState: any) => {
    const point = chartState?.activePayload?.[0]?.payload as PublishTrendPoint | undefined;
    if (!point) return;
    setSelectedDate(prev => (prev === point.date ? null : point.date));
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono-num text-[10px] uppercase tracking-[0.16em] transition-colors"
              style={{
                borderColor: active ? f.color : '#26262F',
                backgroundColor: active ? f.color + '1F' : 'transparent',
                color: active ? f.color : '#7A7A86',
              }}
            >
              {f.key !== 'all' && <span className="h-2 w-2 rounded-sm" style={{ background: f.color }} />}
              {f.label}
            </button>
          );
        })}
        <span className="ml-auto font-mono-num text-[10px] text-claude-muted/70">
          Stacked by article publish day (PT), deduped by URL
        </span>
      </div>
      <ResponsiveContainer width="100%" height={232}>
        <AreaChart
          data={data}
          margin={{ top: 8, right: 6, left: -22, bottom: 0 }}
          onClick={handleClick}
          style={{ cursor: 'pointer' }}
        >
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
          {selectedPoint && (
            <ReferenceLine x={selectedPoint.label} stroke="#E62429" strokeWidth={2} strokeDasharray="4 2" />
          )}
          {show('negative') && <Area type="monotone" dataKey="negative" stackId="1" stroke={COLORS.negative} strokeWidth={1.5} fill="url(#trendNeg)" />}
          {show('neutral') && <Area type="monotone" dataKey="neutral" stackId="1" stroke={COLORS.neutral} strokeWidth={1.5} fill="url(#trendNeu)" />}
          {show('positive') && <Area type="monotone" dataKey="positive" stackId="1" stroke={COLORS.positive} strokeWidth={1.5} fill="url(#trendPos)" />}
        </AreaChart>
      </ResponsiveContainer>

      {selectedPoint && (
        <DrillDownPanel point={selectedPoint} filter={filter} onClose={() => setSelectedDate(null)} />
      )}
    </div>
  );
}
