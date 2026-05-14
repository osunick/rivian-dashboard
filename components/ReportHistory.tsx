'use client';

import { useState } from 'react';
import { Report } from '@/lib/types';

interface Props {
  reports: Report[];
}

function MiniSentimentBar({ positive, neutral, negative }: { positive: number; neutral: number; negative: number }) {
  return (
    <div className="flex h-3 w-28 rounded overflow-hidden gap-px flex-shrink-0">
      <div
        className="bg-[#22C55E]"
        style={{ width: `${positive}%` }}
        title={`Positive: ${positive}%`}
      />
      <div
        className="bg-[#6B7280]"
        style={{ width: `${neutral}%` }}
        title={`Neutral: ${neutral}%`}
      />
      <div
        className="bg-[#EF4444]"
        style={{ width: `${negative}%` }}
        title={`Negative: ${negative}%`}
      />
    </div>
  );
}

function formatFull(ts: string): string {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
  });
}

function ReportRow({ report, index }: { report: Report; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`border-b border-[#1F1F1F] last:border-0 ${index % 2 === 0 ? 'bg-[#0D0D0D]' : ''}`}>
      <div className="flex items-center gap-4 px-3 py-2.5 hover:bg-[#141414] transition-colors">
        {/* Timestamp */}
        <div className="font-mono text-[#6B7280] text-xs whitespace-nowrap w-44 flex-shrink-0">
          {formatFull(report.timestamp)}
        </div>

        {/* Sentiment bar */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <MiniSentimentBar {...report.sentiment} />
          <div className="flex gap-2 text-[10px] font-mono">
            <span className="text-[#22C55E]">{report.sentiment.positive}%</span>
            <span className="text-[#6B7280]">{report.sentiment.neutral}%</span>
            <span className="text-[#EF4444]">{report.sentiment.negative}%</span>
          </div>
        </div>

        {/* Summary */}
        <div className="text-[#F5F5F5] text-xs flex-1 min-w-0 leading-relaxed">
          <span className="text-[#6B7280] mr-2">
            {report.themes.slice(0, 2).map(t => (
              <span key={t} className="inline-block bg-[#1F1F1F] text-[#6B7280] rounded px-1.5 py-0.5 text-[9px] mr-1 font-mono">
                {t}
              </span>
            ))}
          </span>
          <span className="text-[#A1A1AA]">{report.summary}</span>
        </div>

        {/* Expand button */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-[#6B7280] hover:text-[#F5F5F5] hover:bg-[#1F1F1F] rounded transition-colors text-xs"
          title={expanded ? 'Collapse' : 'Expand full report'}
        >
          {expanded ? '▼' : '▶'}
        </button>
      </div>

      {/* Expanded full report */}
      {expanded && (
        <div className="px-3 pb-4 pt-1">
          <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded p-4">
            <div className="text-[#6B7280] text-[10px] font-mono mb-2 uppercase tracking-wider">
              Full Report
            </div>
            <pre className="text-[#A1A1AA] text-xs font-mono whitespace-pre-wrap leading-relaxed">
              {report.fullReport}
            </pre>
            {report.competitiveContext && (
              <div className="mt-3 pt-3 border-t border-[#1F1F1F]">
                <div className="text-[#6B7280] text-[10px] font-mono uppercase tracking-wider mb-1">
                  Competitive Context
                </div>
                <p className="text-[#A1A1AA] text-xs leading-relaxed">{report.competitiveContext}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportHistory({ reports }: Props) {
  return (
    <div className="max-h-[400px] overflow-y-auto rounded border border-[#1F1F1F]">
      {/* Header row */}
      <div className="flex items-center gap-4 px-3 py-2 border-b border-[#1F1F1F] bg-[#0D0D0D] sticky top-0 z-10">
        <div className="font-mono text-[#374151] text-[10px] uppercase tracking-wider w-44 flex-shrink-0">
          Timestamp
        </div>
        <div className="font-mono text-[#374151] text-[10px] uppercase tracking-wider w-52 flex-shrink-0">
          Sentiment
        </div>
        <div className="font-mono text-[#374151] text-[10px] uppercase tracking-wider flex-1">
          Summary
        </div>
        <div className="w-6 flex-shrink-0" />
      </div>

      {reports.map((report, i) => (
        <ReportRow key={report.id} report={report} index={i} />
      ))}
    </div>
  );
}
