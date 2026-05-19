'use client';

import { useState } from 'react';
import { SOURCE_LABELS, SourceKey, SentimentLabel } from '@/lib/types';

interface SourceEntry {
  source: string;
  found: number;
  sentiment: SentimentLabel | null;
}

interface Item {
  title: string;
  url: string;
  source: string;
  sentiment: string;
  publishedAt?: string | null;
  snippet?: string;
  reportTimestamp: string;
}

interface Props {
  data: SourceEntry[];
  itemsMap?: Record<string, Item[]>;
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

export default function SourceActivityChart({ data, itemsMap }: Props) {
  const [open, setOpen] = useState<string | null>(null);

  const sorted = [...data].sort((a, b) => b.found - a.found);
  const max = Math.max(...sorted.map(d => d.found), 1);

  return (
    <div className="space-y-1">
      {sorted.map(entry => {
        const label = SOURCE_LABELS[entry.source as SourceKey] ?? entry.source;
        const color = sentimentColor(entry.sentiment);
        const items = itemsMap?.[entry.source] ?? [];
        const hasItems = items.length > 0;
        const pct = (entry.found / max) * 100;
        const isOpen = open === entry.source;

        return (
          <div key={entry.source} className="rounded-md border border-transparent hover:border-[#2A2A2A] transition-colors">
            {/* Row — always clickable */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setOpen(isOpen ? null : entry.source)}
              onKeyDown={e => e.key === 'Enter' && setOpen(isOpen ? null : entry.source)}
              className="px-2 py-2 cursor-pointer select-none"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[#D1D5DB] text-xs font-mono flex items-center gap-1">
                  {label}
                  {hasItems && (
                    <span className="text-[#3B82F6] text-[10px]">{isOpen ? '▲' : '▼'}</span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  {entry.sentiment && (
                    <span
                      className="text-[10px] font-mono px-1 py-0.5 rounded"
                      style={{ color, background: color + '22' }}
                    >
                      {entry.sentiment}
                    </span>
                  )}
                  <span className="text-[#9CA3AF] text-xs font-mono tabular-nums">{entry.found}</span>
                </div>
              </div>
              <div className="h-1.5 bg-[#1F1F1F] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: color,
                    opacity: entry.found === 0 ? 0.2 : 0.8,
                  }}
                />
              </div>
            </div>

            {/* Inline drill-down */}
            {isOpen && (
              <div className="border-t border-[#1F1F1F] px-2 pb-2 pt-2 space-y-2">
                {items.length === 0 ? (
                  <p className="text-[#6B7280] text-xs font-mono text-center py-2">No items on record for this source.</p>
                ) : (
                  items.slice(0, 10).map((item, i) => (
                    <div key={i} className="rounded border border-[#1F1F1F] bg-[#0D0D0D] p-3 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span
                          className="text-[10px] font-mono px-1 py-0.5 rounded"
                          style={{
                            color: SENTIMENT_COLORS[item.sentiment] ?? '#6B7280',
                            background: (SENTIMENT_COLORS[item.sentiment] ?? '#6B7280') + '22',
                          }}
                        >
                          {item.sentiment}
                        </span>
                        {item.publishedAt && (
                          <span className="text-[#4B5563] text-[10px] font-mono">{item.publishedAt}</span>
                        )}
                      </div>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#F5F5F5] text-xs font-semibold leading-snug hover:text-[#3B82F6] transition-colors block"
                      >
                        {item.title} ↗
                      </a>
                      {item.snippet && (
                        <p className="text-[#6B7280] text-[11px] leading-relaxed line-clamp-2">{item.snippet}</p>
                      )}
                    </div>
                  ))
                )}
                {items.length > 10 && (
                  <p className="text-[#4B5563] text-[10px] font-mono text-center pt-1">
                    + {items.length - 10} more items across all scans
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
