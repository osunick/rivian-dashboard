'use client';

import { Report, SOURCE_KEYS, SOURCE_LABELS, SentimentLabel } from '@/lib/types';

interface Props {
  reports: Report[]; // newest first, up to 5
}

const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#22C55E',
  neutral:  '#6B7280',
  negative: '#EF4444',
};

function SentimentDot({ sentiment }: { sentiment: SentimentLabel | null }) {
  if (!sentiment) {
    return <span className="w-3 h-3 rounded-full bg-[#1F1F1F] inline-block" />;
  }
  return (
    <span
      className="w-3 h-3 rounded-full inline-block"
      style={{ backgroundColor: SENTIMENT_COLORS[sentiment] }}
      title={sentiment}
    />
  );
}

function formatShort(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function SourceSentimentMatrix({ reports }: Props) {
  return (
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
          {SOURCE_KEYS.map((key, i) => (
            <tr
              key={key}
              className={i % 2 === 0 ? 'bg-[#0D0D0D]' : 'bg-transparent'}
            >
              <td className="py-2 pr-4 text-[#6B7280] font-mono whitespace-nowrap">
                {SOURCE_LABELS[key]}
              </td>
              {reports.map(r => (
                <td key={r.id} className="py-2 px-2 text-center">
                  <div className="flex justify-center items-center">
                    <SentimentDot sentiment={r.sources[key].sentiment} />
                  </div>
                  {r.sources[key].found > 0 && (
                    <div className="text-[#374151] text-[9px] text-center font-mono mt-0.5">
                      {r.sources[key].found}
                    </div>
                  )}
                </td>
              ))}
            </tr>
          ))}
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
      </div>
    </div>
  );
}
