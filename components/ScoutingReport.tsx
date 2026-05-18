'use client';

import { ThreatLevel } from '@/lib/types';

interface ScoutingReportProps {
  competitiveContext: string;
  summary: string;
  themes: string[];
  threatLevel: ThreatLevel;
  competitiveItemCount: number;
  timestamp: string;
}

const THREAT_DISPLAY: Record<ThreatLevel, {
  label: string; color: string; bg: string; border: string; glyph: string;
}> = {
  high:     { label: 'HIGH ALERT',  color: '#EF4444', bg: '#EF444406', border: '#EF444425', glyph: '🔴' },
  elevated: { label: 'ELEVATED',    color: '#F59E0B', bg: '#F59E0B06', border: '#F59E0B25', glyph: '🟠' },
  medium:   { label: 'MEDIUM',      color: '#3B82F6', bg: '#3B82F606', border: '#3B82F625', glyph: '🔵' },
  low:      { label: 'LOW',         color: '#22C55E', bg: '#22C55E06', border: '#22C55E25', glyph: '🟢' },
};

const PM_WATCH_QUESTIONS = [
  'Is our pricing still defensible in this news cycle?',
  'Are competitors gaining autonomy narrative advantage?',
  'Any supplier, production, or recall signals worth monitoring?',
  'What partnerships or capital moves changed the landscape?',
];

export default function ScoutingReport({
  competitiveContext,
  summary,
  themes,
  threatLevel,
  competitiveItemCount,
  timestamp,
}: ScoutingReportProps) {
  const threat = THREAT_DISPLAY[threatLevel];
  const date = new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    timeZone: 'America/Los_Angeles',
  });

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ backgroundColor: threat.bg, borderColor: threat.border }}
    >
      <div className="px-4 sm:px-5 py-3 border-b flex flex-wrap items-center justify-between gap-2"
        style={{ borderColor: threat.border }}>
        <div className="flex items-center gap-2">
          <span className="text-xs">{threat.glyph}</span>
          <span className="text-[#F5F5F5] text-sm font-semibold uppercase tracking-wider">Scouting Report</span>
          <span className="text-[#4B5563] text-xs font-mono">·</span>
          <span className="text-[#6B7280] text-xs font-mono">{date}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[#6B7280] text-xs font-mono">
            {competitiveItemCount} competitive signal{competitiveItemCount !== 1 ? 's' : ''}
          </span>
          <div className="px-2 py-0.5 rounded border text-xs font-mono font-bold"
            style={{ color: threat.color, borderColor: threat.border }}>
            THREAT · {threat.label}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x"
        style={{ '--tw-divide-opacity': '1', borderColor: threat.border } as React.CSSProperties}>

        {/* Competitive Context */}
        <div className="px-4 sm:px-5 py-4 lg:col-span-2">
          <div className="text-[#6B7280] text-xs font-mono uppercase tracking-wider mb-2">
            ⚔️ Competitive Intelligence
          </div>
          {competitiveContext ? (
            <p className="text-[#D1D5DB] text-sm leading-relaxed">{competitiveContext}</p>
          ) : (
            <p className="text-[#4B5563] text-sm italic">No competitive context available this cycle.</p>
          )}

          {/* Overall summary below */}
          {summary && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: threat.border }}>
              <div className="text-[#6B7280] text-xs font-mono uppercase tracking-wider mb-2">
                📌 Cycle Summary
              </div>
              <p className="text-[#9CA3AF] text-xs leading-relaxed">{summary}</p>
            </div>
          )}
        </div>

        {/* PM Watch List */}
        <div className="px-4 sm:px-5 py-4" style={{ borderColor: threat.border }}>
          <div className="text-[#6B7280] text-xs font-mono uppercase tracking-wider mb-2">
            🎯 PM Watch List
          </div>
          <div className="space-y-2">
            {themes.slice(0, 3).map((theme, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[#3B82F6] text-xs mt-0.5 shrink-0">◆</span>
                <span className="text-[#9CA3AF] text-xs leading-relaxed">{theme}</span>
              </div>
            ))}
          </div>

          {PM_WATCH_QUESTIONS.length > 0 && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: threat.border }}>
              <div className="text-[#4B5563] text-xs font-mono uppercase tracking-wider mb-2">
                Questions to Pressure-Test
              </div>
              {PM_WATCH_QUESTIONS.slice(0, 3).map((q, i) => (
                <div key={i} className="flex items-start gap-1.5 mb-1.5">
                  <span className="text-[#4B5563] text-xs shrink-0">?</span>
                  <span className="text-[#4B5563] text-xs leading-relaxed">{q}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
