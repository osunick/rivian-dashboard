'use client';

import { useState } from 'react';
import { SOURCE_LABELS, SourceKey, SentimentLabel } from '@/lib/types';
import ThemeModal from './ThemeModal';

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
  const [active, setActive] = useState<{ source: string; label: string } | null>(null);

  const sorted = [...data].sort((a, b) => b.found - a.found);
  const max = Math.max(...sorted.map(d => d.found), 1);

  return (
    <>
      <div className="space-y-2">
        {sorted.map(entry => {
          const label = SOURCE_LABELS[entry.source as SourceKey] ?? entry.source;
          const color = sentimentColor(entry.sentiment);
          const hasItems = itemsMap && (itemsMap[entry.source]?.length ?? 0) > 0;
          const pct = (entry.found / max) * 100;

          return (
            <button
              key={entry.source}
              onClick={() => hasItems && setActive({ source: entry.source, label })}
              className={`w-full text-left group ${hasItems ? 'cursor-pointer' : 'cursor-default'}`}
              disabled={!hasItems}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-mono transition-colors ${hasItems ? 'text-[#9CA3AF] group-hover:text-[#F5F5F5]' : 'text-[#6B7280]'}`}>
                  {label}
                </span>
                <div className="flex items-center gap-2">
                  {entry.sentiment && (
                    <span
                      className="text-[10px] font-mono px-1 py-0.5 rounded"
                      style={{ color, background: color + '18' }}
                    >
                      {entry.sentiment}
                    </span>
                  )}
                  <span className="text-[#6B7280] text-xs font-mono">
                    {entry.found}
                  </span>
                </div>
              </div>
              <div className="h-2 bg-[#1F1F1F] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: color,
                    opacity: entry.found === 0 ? 0.3 : 0.8,
                  }}
                />
              </div>
            </button>
          );
        })}

        {sorted.length === 0 && (
          <div className="text-[#6B7280] text-xs font-mono py-6 text-center">
            No source data yet
          </div>
        )}
      </div>

      {active && (
        <ThemeModal
          theme={active.label}
          items={itemsMap?.[active.source] ?? []}
          onClose={() => setActive(null)}
        />
      )}
    </>
  );
}
