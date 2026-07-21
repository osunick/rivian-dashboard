'use client';

import { useMemo, useState } from 'react';
import ThemeModal from './ThemeModal';

type ToneKey = 'positive' | 'neutral' | 'risk';

interface DrilldownItem {
  title: string;
  url: string;
  source: string;
  sentiment: string;
  publishedAt?: string | null;
  snippet?: string;
  reportTimestamp: string;
}

interface Row {
  key: ToneKey;
  label: string;
  value: number;
  width: number;
  color: string;
}

interface Props {
  rows: Row[];
  itemsByTone: Record<ToneKey, DrilldownItem[]>;
}

export default function SummarySentimentBars({ rows, itemsByTone }: Props) {
  const [activeTone, setActiveTone] = useState<ToneKey | null>(null);

  const modalItems = useMemo(() => {
    if (!activeTone) return [];
    return itemsByTone[activeTone] ?? [];
  }, [activeTone, itemsByTone]);

  const activeRow = activeTone ? rows.find(row => row.key === activeTone) : null;

  return (
    <>
      <div className="space-y-4">
        {rows.map(row => {
          const clickable = row.value > 0;
          return (
            <button
              key={row.key}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && setActiveTone(row.key)}
              className={`block w-full text-left ${clickable ? 'cursor-pointer' : 'cursor-default opacity-60'}`}
              title={clickable ? `Open ${row.label.toLowerCase()} signals` : `No ${row.label.toLowerCase()} signals in scope`}
            >
              <div className="mb-1 flex items-center justify-between font-mono-num text-[11px] uppercase tracking-[0.1em] text-claude-muted">
                <span>{row.label}</span>
                <span className="text-claude-text">{row.value}</span>
              </div>
              <div className="h-2 rounded-full bg-claude-border">
                <div className={`h-2 rounded-full ${row.color}`} style={{ width: `${row.width}%` }} />
              </div>
              <div className="mt-1 text-[10px] text-claude-muted">
                {clickable ? 'Click to review matching signals' : 'No matching signals'}
              </div>
            </button>
          );
        })}
      </div>

      {activeTone && activeRow ? (
        <ThemeModal
          theme={activeRow.label}
          items={modalItems}
          onClose={() => setActiveTone(null)}
        />
      ) : null}
    </>
  );
}
