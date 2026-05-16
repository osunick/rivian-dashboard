'use client';

import { useState } from 'react';
import { COMPETITORS, CompetitorProfile, ThreatLevel, VehicleComparison } from '@/lib/types';

type ReportItemWithTimestamp = {
  title: string;
  url: string;
  source: string;
  sentiment: string;
  snippet: string;
  category?: string;
  publishedAt?: string | null;
  reportTimestamp: string;
};

interface CompetitorIntel {
  items: ReportItemWithTimestamp[];
  threatLevel: ThreatLevel;
}

interface CompetitorWatchProps {
  intelMap: Record<string, CompetitorIntel>;
}

const THREAT_CONFIG: Record<ThreatLevel, { label: string; color: string; bg: string; border: string; dot: string }> = {
  high:     { label: 'HIGH',     color: '#EF4444', bg: '#EF444408', border: '#EF444430', dot: 'bg-[#EF4444]' },
  elevated: { label: 'ELEVATED', color: '#F59E0B', bg: '#F59E0B08', border: '#F59E0B30', dot: 'bg-[#F59E0B]' },
  medium:   { label: 'MEDIUM',   color: '#3B82F6', bg: '#3B82F608', border: '#3B82F630', dot: 'bg-[#3B82F6]' },
  low:      { label: 'LOW',      color: '#6B7280', bg: '#6B728008', border: '#6B728030', dot: 'bg-[#6B7280]' },
};

function PriceDelta({ comparison }: { comparison: VehicleComparison }) {
  const delta = comparison.rivianPrice - comparison.competitorPrice;
  const isRivianCheaper = delta < 0;
  const absDelta = Math.abs(delta);
  const formatted = absDelta < 1000 ? `$${absDelta}` : `$${(absDelta / 1000).toFixed(1)}K`;
  return (
    <div className="flex items-center justify-between gap-2 text-xs py-1 border-b border-[#1F1F1F] last:border-0">
      <div className="min-w-0">
        <span className="text-[#9CA3AF]">{comparison.competitorModel}</span>
        <span className="text-[#4B5563] mx-1">vs</span>
        <span className="text-[#9CA3AF]">{comparison.rivianRival}</span>
      </div>
      <div className="shrink-0 flex items-center gap-1">
        {delta === 0 ? (
          <span className="text-[#6B7280] font-mono">PARITY</span>
        ) : (
          <>
            <span className={`font-mono font-semibold ${isRivianCheaper ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
              {isRivianCheaper ? '▼' : '▲'}{formatted}
            </span>
            <span className="text-[#4B5563]">{isRivianCheaper ? 'R' : 'C'}</span>
          </>
        )}
      </div>
    </div>
  );
}

function CompetitorCard({ competitor, intel }: { competitor: CompetitorProfile; intel: CompetitorIntel }) {
  const [expanded, setExpanded] = useState(false);
  const threat = THREAT_CONFIG[intel.threatLevel];
  const latestItem = intel.items[0];
  const hasVehicles = competitor.vehicles.length > 0;

  return (
    <div
      className="bg-[#111111] rounded-lg border overflow-hidden transition-all cursor-pointer hover:border-[#2D2D2D]"
      style={{ borderColor: threat.border }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Card header */}
      <div className="p-4" style={{ backgroundColor: threat.bg }}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[#F5F5F5] font-semibold text-sm">{competitor.name}</span>
              {competitor.ticker && (
                <span className="text-[#6B7280] text-xs font-mono">{competitor.ticker}</span>
              )}
            </div>
            <div className="text-[#6B7280] text-xs mt-0.5">{competitor.segment}</div>
          </div>
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border shrink-0"
            style={{ borderColor: threat.border }}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${threat.dot} animate-pulse`} />
            <span className="text-xs font-mono font-semibold" style={{ color: threat.color }}>
              {threat.label}
            </span>
          </div>
        </div>
        <div className="text-[#4B5563] text-xs font-mono">{competitor.tagline}</div>
      </div>

      {/* Latest intel */}
      <div className="px-4 pt-3 pb-1">
        {latestItem ? (
          <div>
            <div className="text-[#6B7280] text-xs font-mono uppercase tracking-wider mb-1.5">Latest Intel</div>
            <a
              href={latestItem.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#F5F5F5] text-xs hover:text-[#3B82F6] transition-colors line-clamp-2"
              onClick={e => e.stopPropagation()}
            >
              {latestItem.title}
            </a>
            {expanded && (
              <p className="text-[#6B7280] text-xs mt-1.5 leading-relaxed">{latestItem.snippet}</p>
            )}
          </div>
        ) : (
          <div className="text-[#4B5563] text-xs font-mono italic py-1">No recent intel detected</div>
        )}

        {intel.items.length > 1 && (
          <div className="text-[#4B5563] text-xs font-mono mt-1">
            +{intel.items.length - 1} more signal{intel.items.length > 2 ? 's' : ''} · click to expand
          </div>
        )}
      </div>

      {/* Expanded: all items */}
      {expanded && intel.items.length > 1 && (
        <div className="px-4 pb-2 space-y-2">
          {intel.items.slice(1).map((item, i) => (
            <a
              key={i}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[#9CA3AF] text-xs hover:text-[#3B82F6] transition-colors"
              onClick={e => e.stopPropagation()}
            >
              • {item.title}
            </a>
          ))}
        </div>
      )}

      {/* Price comparison */}
      {hasVehicles && (
        <div className="mx-4 mb-3 mt-2">
          <div className="text-[#6B7280] text-xs font-mono uppercase tracking-wider mb-1.5">Price Position</div>
          <div>
            {competitor.vehicles.map((v, i) => (
              <PriceDelta key={i} comparison={v} />
            ))}
          </div>
          {competitor.vehicles[0]?.note && (
            <div className="text-[#4B5563] text-xs font-mono mt-1 italic">{competitor.vehicles[0].note}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CompetitorWatch({ intelMap }: CompetitorWatchProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {COMPETITORS.map(competitor => (
        <CompetitorCard
          key={competitor.id}
          competitor={competitor}
          intel={intelMap[competitor.id] ?? { items: [], threatLevel: competitor.defaultThreat }}
        />
      ))}
    </div>
  );
}
