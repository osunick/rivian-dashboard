'use client';

import { useState } from 'react';
import { Report, SOURCE_KEYS, SOURCE_LABELS, SourceKey, SentimentLabel } from '@/lib/types';
import ThemeModal from './ThemeModal';

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
  reports: Report[]; // newest first, up to 5
}

const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#22C55E',
  neutral:  '#6B7280',
  negative: '#EF4444',
};

function SentimentDot({ sentiment, found, onClick }: {
  sentiment: SentimentLabel | null;
  found: number;
  onClick?: () => void;
}) {
  const isClickable = found > 0 && onClick;
  if (!sentiment) {
    return (
      <span
        className={`w-3 h-3 rounded-full bg-[#1F1F1F] inline-block ${isClickable ? 'cursor-pointer' : ''}`}
        onClick={onClick}
      />
    );
  }
  return (
    <span
      className={`w-3 h-3 rounded-full inline-block transition-transform ${isClickable ? 'cursor-pointer hover:scale-125' : ''}`}
      style={{ backgroundColor: SENTIMENT_COLORS[sentiment] }}
      title={`${sentiment} · ${found} item${found !== 1 ? 's' : ''} — click to drill down`}
      onClick={onClick}
    />
  );
}

function formatShort(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', timeZone: 'America/Los_Angeles' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Los_Angeles' });
}

export default function SourceSentimentMatrix({ reports }: Props) {
  const [modal, setModal] = useState<{ title: string; items: Item[] } | null>(null);

  // Build per-source item map from the reports we already have
  const sourceItemsMap: Record<string, Item[]> = {};
  for (const r of reports) {
    for (const item of (r.items ?? [])) {
      if (!sourceItemsMap[item.source]) sourceItemsMap[item.source] = [];
      sourceItemsMap[item.source].push({ ...item, reportTimestamp: r.timestamp });
    }
  }

  function openRow(key: SourceKey) {
    const items = sourceItemsMap[key] ?? [];
    if (items.length === 0) return;
    setModal({ title: `${SOURCE_LABELS[key]} — All Scans`, items });
  }

  function openCell(key: SourceKey, report: Report) {
    const items = report.items
      .filter(i => i.source === key)
      .map(i => ({ ...i, reportTimestamp: report.timestamp }));
    if (items.length === 0) return;
    setModal({
      title: `${SOURCE_LABELS[key]} · ${formatShort(report.timestamp)}`,
      items,
    });
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left text-[#6B7280] font-mono font-normal pb-2 pr-4 w-32">
                SOURCE
              </th>
              {reports.map(r => (
                <th key={r.id} className="text-center text-[#6B7280] font-mono font-normal pb-2 px-2 whitespace-nowrap">
                  {formatShort(r.timestamp)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SOURCE_KEYS.map((key, i) => {
              const allItems = sourceItemsMap[key] ?? [];
              const hasAny = allItems.length > 0;
              return (
                <tr
                  key={key}
                  className={i % 2 === 0 ? 'bg-[#0D0D0D]' : 'bg-transparent'}
                >
                  <td className="py-2 pr-4 whitespace-nowrap">
                    <button
                      onClick={() => openRow(key)}
                      disabled={!hasAny}
                      className={`text-xs font-mono transition-colors text-left ${
                        hasAny
                          ? 'text-[#9CA3AF] hover:text-[#3B82F6] cursor-pointer'
                          : 'text-[#374151] cursor-default'
                      }`}
                      title={hasAny ? `${allItems.length} items from ${SOURCE_LABELS[key]} — click to view all` : 'No items'}
                    >
                      {SOURCE_LABELS[key]}
                    </button>
                  </td>
                  {reports.map(r => {
                    const src = r.sources[key];
                    const cellItems = r.items.filter(i => i.source === key);
                    return (
                      <td key={r.id} className="py-2 px-2 text-center">
                        <div
                          className={`flex justify-center items-center ${cellItems.length > 0 ? 'cursor-pointer group' : ''}`}
                          onClick={() => openCell(key, r)}
                        >
                          <SentimentDot
                            sentiment={src.sentiment}
                            found={src.found}
                            onClick={cellItems.length > 0 ? () => openCell(key, r) : undefined}
                          />
                        </div>
                        {src.found > 0 && (
                          <div
                            className={`text-[9px] text-center font-mono mt-0.5 transition-colors ${
                              cellItems.length > 0 ? 'text-[#374151] cursor-pointer hover:text-[#3B82F6]' : 'text-[#374151]'
                            }`}
                            onClick={() => openCell(key, r)}
                          >
                            {src.found}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#1F1F1F]">
          <span className="text-[#6B7280] text-[10px] font-mono">LEGEND</span>
          {Object.entries(SENTIMENT_COLORS).map(([label, color]) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
              <span className="text-[#6B7280] text-[10px] font-mono capitalize">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1F1F1F] inline-block" />
            <span className="text-[#6B7280] text-[10px] font-mono">No data</span>
          </div>
          <span className="text-[#374151] text-[10px] font-mono ml-auto">CLICK ROW LABEL OR DOT TO DRILL DOWN</span>
        </div>
      </div>

      {modal && (
        <ThemeModal
          theme={modal.title}
          items={modal.items}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
