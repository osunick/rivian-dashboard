'use client';

import { useState } from 'react';
import { SourceMatrixData, MatrixRow } from '@/lib/data';
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
  matrix: SourceMatrixData;
}

const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#22C55E',
  neutral:  '#6B7280',
  negative: '#EF4444',
};

function SentimentDot({ sentiment, found, onClick }: {
  sentiment: string | null;
  found: number;
  onClick?: () => void;
}) {
  const clickable = found > 0 && !!onClick;
  if (!sentiment) {
    return (
      <span
        className={`w-3 h-3 rounded-full bg-[#1F1F1F] inline-block${clickable ? ' cursor-pointer' : ''}`}
        onClick={onClick}
      />
    );
  }
  return (
    <span
      className={`w-3 h-3 rounded-full inline-block transition-transform${clickable ? ' cursor-pointer hover:scale-125' : ''}`}
      style={{ backgroundColor: SENTIMENT_COLORS[sentiment] ?? '#6B7280' }}
      title={clickable ? `${sentiment} · ${found} item${found !== 1 ? 's' : ''} — click to drill down` : sentiment}
      onClick={onClick}
    />
  );
}

export default function SourceSentimentMatrix({ matrix }: Props) {
  const [modal, setModal] = useState<{ title: string; items: Item[] } | null>(null);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left text-[#6B7280] font-mono font-normal pb-2 pr-4 w-32">SOURCE</th>
              {matrix.headers.map((h, i) => (
                <th key={matrix.reportIds[i]} className="text-center text-[#6B7280] font-mono font-normal pb-2 px-2 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row, i) => {
              const hasAny = row.allItems.length > 0;
              return (
                <tr key={row.key} className={i % 2 === 0 ? 'bg-[#0D0D0D]' : 'bg-transparent'}>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    <button
                      onClick={() => {
                        if (row.allItems.length === 0) return;
                        setModal({ title: `${row.label} — All Scans`, items: row.allItems });
                      }}
                      className={`text-xs font-mono transition-colors text-left ${
                        hasAny ? 'text-[#9CA3AF] hover:text-[#3B82F6] cursor-pointer' : 'text-[#374151] cursor-default'
                      }`}
                      title={hasAny ? `${row.allItems.length} items · click to view all` : 'No items'}
                    >
                      {row.label}
                    </button>
                  </td>
                  {row.cells.map((cell, ci) => (
                    <td key={matrix.reportIds[ci]} className="py-2 px-2 text-center">
                      <div
                        className={`flex justify-center items-center${cell.items.length > 0 ? ' cursor-pointer' : ''}`}
                        onClick={() => {
                          if (cell.items.length === 0) return;
                          setModal({ title: `${row.label} · ${matrix.headers[ci]}`, items: cell.items });
                        }}
                      >
                        <SentimentDot
                          sentiment={cell.sentiment}
                          found={cell.items.length}
                          onClick={cell.items.length > 0 ? () => setModal({ title: `${row.label} · ${matrix.headers[ci]}`, items: cell.items }) : undefined}
                        />
                      </div>
                      {cell.items.length > 0 && (
                        <div
                          className="text-[9px] text-center font-mono mt-0.5 text-[#374151] cursor-pointer hover:text-[#3B82F6] transition-colors"
                          onClick={() => setModal({ title: `${row.label} · ${matrix.headers[ci]}`, items: cell.items })}
                        >
                          {cell.items.length}
                        </div>
                      )}
                    </td>
                  ))}
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
