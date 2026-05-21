'use client';

import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { Report, ReportItem } from '@/lib/types';
import { SOURCE_LABELS } from '@/lib/types';

interface Props {
  data: Report[];
}

const SENTIMENT_COLOR: Record<string, string> = {
  positive: '#22C55E',
  neutral: '#6B7280',
  negative: '#EF4444',
};

const SOURCE_COLOR: Record<string, string> = {
  reddit_rivian: '#FF4500',
  reddit_ev:     '#FF6534',
  reddit_sdc:    '#FF8060',
  rivianforums:  '#3B82F6',
  news:          '#A78BFA',
  twitter:       '#1DA1F2',
  youtube:       '#FF0000',
  hackernews:    '#F59E0B',
};

function formatXAxis(timestamp: string): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Los_Angeles' });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a1a] border border-[#3B82F6] rounded p-3 text-xs font-mono shadow-lg">
      <div className="text-[#6B7280] mb-2">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.fill }}>{p.name}</span>
          <span className="text-[#F5F5F5] font-bold">{p.value}%</span>
        </div>
      ))}
      <div className="text-[#3B82F6] mt-2 text-[10px]">← click to drill down</div>
    </div>
  );
};

function DrillDownPanel({ report, onClose }: { report: Report; onClose: () => void }) {
  const rawItems = report.items ?? [];
  // Most recent first by publishedAt, then by array order
  const items = [...rawItems].sort((a, b) => {
    const paA = a.publishedAt ? new Date((a as any).publishedAt).getTime() : NaN;
    const paB = b.publishedAt ? new Date((b as any).publishedAt).getTime() : NaN;
    if (!isNaN(paB) && !isNaN(paA)) return paB - paA;
    if (!isNaN(paB)) return 1;
    if (!isNaN(paA)) return -1;
    return 0;
  });
  const ts = new Date(report.timestamp).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    timeZone: 'America/Los_Angeles'
  });

  return (
    <div className="mt-4 border border-[#3B82F6] rounded-lg bg-[#0D1117] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1F1F1F] bg-[#111827]">
        <div className="flex items-center gap-3">
          <span className="text-[#3B82F6] text-xs font-mono font-bold">DRILL-DOWN</span>
          <span className="text-[#6B7280] text-xs font-mono">{ts}</span>
          <span className="flex gap-1.5 ml-2">
            <span className="text-[#22C55E] text-xs font-mono">▲{report.sentiment.positive}%</span>
            <span className="text-[#6B7280] text-xs font-mono">—{report.sentiment.neutral}%</span>
            <span className="text-[#EF4444] text-xs font-mono">▼{report.sentiment.negative}%</span>
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-[#6B7280] hover:text-[#F5F5F5] text-sm font-mono transition-colors"
        >
          ✕ close
        </button>
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="px-4 py-6 text-[#6B7280] text-xs font-mono text-center">
          No individual items recorded for this cycle.
        </div>
      ) : (
        <div className="divide-y divide-[#1F1F1F] max-h-80 overflow-y-auto">
          {items.map((item, i) => (
            <div key={i} className="px-4 py-3 hover:bg-[#111111] transition-colors group">
              <div className="flex items-start gap-3">
                {/* Sentiment indicator */}
                <div
                  className="w-1.5 rounded-full mt-1 flex-shrink-0"
                  style={{
                    height: '36px',
                    backgroundColor: SENTIMENT_COLOR[item.sentiment] ?? '#6B7280'
                  }}
                />
                <div className="flex-1 min-w-0">
                  {/* Source + sentiment badge */}
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: (SOURCE_COLOR[item.source] ?? '#6B7280') + '22',
                        color: SOURCE_COLOR[item.source] ?? '#6B7280',
                        border: `1px solid ${SOURCE_COLOR[item.source] ?? '#6B7280'}44`,
                      }}
                    >
                      {(SOURCE_LABELS as Record<string, string>)[item.source] ?? item.source}
                    </span>
                    <span
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                      style={{
                        color: SENTIMENT_COLOR[item.sentiment],
                        backgroundColor: SENTIMENT_COLOR[item.sentiment] + '18',
                        border: `1px solid ${SENTIMENT_COLOR[item.sentiment]}33`,
                      }}
                    >
                      {item.sentiment}
                    </span>
                  </div>
                  {/* Title */}
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#F5F5F5] text-xs font-semibold leading-snug hover:text-[#3B82F6] transition-colors block"
                    title={item.title}
                  >
                    {item.title} ↗
                  </a>
                  {/* Snippet */}
                  <p className="text-[#6B7280] text-[11px] mt-0.5 leading-relaxed">
                    {item.snippet}
                  </p>
                  {/* URL + published date */}
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[#374151] text-[10px] font-mono break-all">{item.url}</span>
                    {(item as any).publishedAt && (
                      <span className="text-[#22C55E] text-[10px] font-mono flex-shrink-0">· {(item as any).publishedAt}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer summary */}
      <div className="px-4 py-2 border-t border-[#1F1F1F] bg-[#111827] flex items-center justify-between">
        <span className="text-[#6B7280] text-[10px] font-mono">
          {items.length} source{items.length !== 1 ? 's' : ''} · click any title to verify
        </span>
        <span className="text-[#6B7280] text-[10px] font-mono">
          Themes: {report.themes.join(' · ')}
        </span>
      </div>
    </div>
  );
}

export default function SentimentTrendChart({ data }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const chartData = data.map((r, i) => ({
    time: formatXAxis(r.timestamp),
    Positive: r.sentiment.positive,
    Neutral: r.sentiment.neutral,
    Negative: r.sentiment.negative,
    _index: i,
  }));

  const selectedReport = selectedIndex !== null ? data[selectedIndex] : null;

  const handleClick = (chartState: any) => {
    if (!chartState?.activePayload?.length) return;
    const idx = chartState.activePayload[0]?.payload?._index;
    if (idx === undefined) return;
    setSelectedIndex(prev => prev === idx ? null : idx);
  };

  return (
    <div>
      <div className="relative">
        {selectedIndex !== null && (
          <div
            className="absolute left-0 top-0 bottom-0 pointer-events-none"
            style={{ zIndex: 10 }}
          />
        )}
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart
            data={chartData}
            margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
            onClick={handleClick}
            style={{ cursor: 'pointer' }}
          >
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
            {selectedIndex !== null && (
              <ReferenceLine
                x={chartData[selectedIndex]?.time}
                stroke="#3B82F6"
                strokeWidth={2}
                strokeDasharray="4 2"
              />
            )}
            <Area type="monotone" dataKey="Positive"
              stroke="#22C55E" fill="url(#gradPos)" strokeWidth={2} dot={{ r: 3, fill: '#22C55E' }} activeDot={{ r: 5 }} />
            <Area type="monotone" dataKey="Neutral"
              stroke="#6B7280" fill="url(#gradNeu)" strokeWidth={1.5} dot={{ r: 2, fill: '#6B7280' }} activeDot={{ r: 4 }} />
            <Area type="monotone" dataKey="Negative"
              stroke="#EF4444" fill="url(#gradNeg)" strokeWidth={2} dot={{ r: 3, fill: '#EF4444' }} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {selectedReport && (
        <DrillDownPanel
          report={selectedReport}
          onClose={() => setSelectedIndex(null)}
        />
      )}
    </div>
  );
}
