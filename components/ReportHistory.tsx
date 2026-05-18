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
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    timeZone: 'America/Los_Angeles'
  });
}

function ReportRow({ report, index }: { report: Report; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const isFailed = !!report.scanError;

  return (
    <div className={`border-b border-[#1F1F1F] last:border-0 ${isFailed ? 'opacity-50' : index % 2 === 0 ? 'bg-[#0D0D0D]' : ''}`}>
      {/* Mobile layout */}
      <div className="flex sm:hidden flex-col gap-1.5 px-3 py-2.5 hover:bg-[#141414] transition-colors">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[#6B7280] text-[10px]">{formatFull(report.timestamp)}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-[#6B7280] hover:text-[#F5F5F5] hover:bg-[#1F1F1F] rounded transition-colors text-xs"
              title={expanded ? 'Collapse' : 'Expand full report'}
            >
              {expanded ? '▼' : '▶'}
            </button>
          </div>
        </div>
        {isFailed ? (
          <span className="text-[#F59E0B] font-mono text-[11px]">⚠️ SCAN FAILED — {report.scanError}</span>
        ) : (
          <>
            <MiniSentimentBar {...report.sentiment} />
            <div className="flex gap-2 text-[10px] font-mono">
              <span className="text-[#22C55E]">{report.sentiment.positive}%</span>
              <span className="text-[#6B7280]">{report.sentiment.neutral}%</span>
              <span className="text-[#EF4444]">{report.sentiment.negative}%</span>
            </div>
            <div className="text-[#A1A1AA] text-xs leading-snug line-clamp-2">{report.summary}</div>
          </>
        )}
      </div>

      {/* Desktop layout */}
      <div className="hidden sm:flex items-center gap-4 px-3 py-2.5 hover:bg-[#141414] transition-colors">
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
          {isFailed ? (
            <span className="text-[#F59E0B] font-mono text-[11px]">⚠️ SCAN FAILED — {report.scanError}</span>
          ) : (
            <>
              <span className="text-[#6B7280] mr-2">
                {report.themes.slice(0, 2).map(t => (
                  <span key={t} className="inline-block bg-[#1F1F1F] text-[#6B7280] rounded px-1.5 py-0.5 text-[9px] mr-1 font-mono">
                    {t}
                  </span>
                ))}
              </span>
              <span className="text-[#A1A1AA]">{report.summary}</span>
            </>
          )}
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
        <div className="px-3 pb-4 pt-1 space-y-3">

          {/* Source items with hyperlinks */}
          {report.items?.length > 0 && (
            <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded overflow-hidden">
              <div className="px-4 py-2 border-b border-[#1F1F1F] bg-[#0D1117] flex items-center justify-between">
                <span className="text-[#6B7280] text-[10px] font-mono uppercase tracking-wider">Source Material</span>
                <span className="text-[#374151] text-[10px] font-mono">{report.items.length} items · click to verify</span>
              </div>
              <div className="divide-y divide-[#1F1F1F]">
                {report.items.map((item, i) => (
                  <div key={i} className="px-4 py-3 hover:bg-[#111111] transition-colors">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-1 rounded-full mt-1 flex-shrink-0 self-stretch min-h-[32px]"
                        style={{ backgroundColor:
                          item.sentiment === 'positive' ? '#22C55E' :
                          item.sentiment === 'negative' ? '#EF4444' : '#6B7280'
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1F1F1F] text-[#9CA3AF]">
                            {item.source}
                          </span>
                          <span className="text-[10px] font-mono" style={{
                            color: item.sentiment === 'positive' ? '#22C55E' :
                                   item.sentiment === 'negative' ? '#EF4444' : '#6B7280'
                          }}>
                            {item.sentiment}
                          </span>
                        </div>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#3B82F6] text-xs font-semibold hover:text-[#60A5FA] hover:underline transition-colors block leading-snug mb-1"
                        >
                          {item.title} ↗
                        </a>
                        <p className="text-[#6B7280] text-[11px] leading-relaxed">{item.snippet}</p>
                        <span className="text-[#374151] text-[10px] font-mono break-all">{item.url}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Competitive context */}
          {report.competitiveContext && (
            <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded p-4">
              <div className="text-[#6B7280] text-[10px] font-mono uppercase tracking-wider mb-1">Competitive Context</div>
              <p className="text-[#A1A1AA] text-xs leading-relaxed">{report.competitiveContext}</p>
            </div>
          )}

          {/* Full text */}
          <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded p-4">
            <div className="text-[#6B7280] text-[10px] font-mono mb-2 uppercase tracking-wider">Full Summary</div>
            <pre className="text-[#A1A1AA] text-xs font-mono whitespace-pre-wrap leading-relaxed">{report.fullReport}</pre>
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
      <div className="hidden sm:flex items-center gap-4 px-3 py-2 border-b border-[#1F1F1F] bg-[#0D0D0D] sticky top-0 z-10">
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
