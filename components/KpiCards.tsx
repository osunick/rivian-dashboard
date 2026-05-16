interface KpiCardsProps {
  positive: number;
  negative: number;
  positiveDelta: number;
  negativeDelta: number;
  activeSources: number;
  totalSources: number;
  totalPosts: number;
  avgScore: number;
  competitiveItems: number;
}

function DeltaBadge({ delta, inverse = false }: { delta: number; inverse?: boolean }) {
  if (delta === 0) return <span className="text-[#6B7280] text-xs font-mono">—</span>;
  const isGood = inverse ? delta < 0 : delta > 0;
  const color = isGood ? 'text-[#22C55E]' : 'text-[#EF4444]';
  const arrow = delta > 0 ? '▲' : '▼';
  return (
    <span className={`${color} text-xs font-mono`}>
      {arrow}{Math.abs(delta)}pp
    </span>
  );
}

export default function KpiCards({
  positive, negative, positiveDelta, negativeDelta,
  activeSources, totalSources, totalPosts, avgScore, competitiveItems,
}: KpiCardsProps) {
  const scoreColor = avgScore >= 60 ? '#22C55E' : avgScore >= 45 ? '#6B7280' : '#EF4444';
  const compColor = competitiveItems >= 3 ? '#EF4444' : competitiveItems >= 1 ? '#F59E0B' : '#22C55E';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      {/* Card 1 — Brand Signal */}
      <div className="bg-[#111111] border border-[#1F1F1F] rounded-lg p-4">
        <div className="text-[#6B7280] text-xs uppercase tracking-wider mb-1">Brand Signal</div>
        <div className="flex items-end gap-2">
          <span className="text-[#22C55E] text-3xl font-mono font-bold">{positive}%</span>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <span className="text-[#6B7280] text-xs">vs prev</span>
          <DeltaBadge delta={positiveDelta} />
        </div>
        <div className="mt-2 h-1 bg-[#1F1F1F] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#22C55E] rounded-full transition-all"
            style={{ width: `${positive}%` }}
          />
        </div>
      </div>

      {/* Card 2 — Heat Index */}
      <div className="bg-[#111111] border border-[#1F1F1F] rounded-lg p-4">
        <div className="text-[#6B7280] text-xs uppercase tracking-wider mb-1">Heat Index</div>
        <div className="flex items-end gap-2">
          <span className="text-[#EF4444] text-3xl font-mono font-bold">{negative}%</span>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <span className="text-[#6B7280] text-xs">vs prev</span>
          <DeltaBadge delta={negativeDelta} inverse />
        </div>
        <div className="mt-2 h-1 bg-[#1F1F1F] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#EF4444] rounded-full transition-all"
            style={{ width: `${negative}%` }}
          />
        </div>
      </div>

      {/* Card 3 — Competitive Signals */}
      <div className="bg-[#111111] border border-[#1F1F1F] rounded-lg p-4">
        <div className="text-[#6B7280] text-xs uppercase tracking-wider mb-1">Comp. Signals</div>
        <div className="flex items-end gap-1">
          <span className="text-3xl font-mono font-bold" style={{ color: compColor }}>{competitiveItems}</span>
          <span className="text-[#6B7280] text-sm font-mono mb-0.5">items</span>
        </div>
        <div className="mt-1 text-[#6B7280] text-xs">this cycle</div>
        <div className="mt-2 text-xs font-mono" style={{ color: compColor }}>
          {competitiveItems >= 3 ? '⚠ HIGH SIGNAL' : competitiveItems >= 1 ? '● ACTIVE' : '○ QUIET'}
        </div>
      </div>

      {/* Card 4 — Intel Sources */}
      <div className="bg-[#111111] border border-[#1F1F1F] rounded-lg p-4">
        <div className="text-[#6B7280] text-xs uppercase tracking-wider mb-1">Intel Sources</div>
        <div className="flex items-end gap-1">
          <span className="text-[#F5F5F5] text-3xl font-mono font-bold">{activeSources}</span>
          <span className="text-[#6B7280] text-lg font-mono">/{totalSources}</span>
        </div>
        <div className="mt-1 text-[#6B7280] text-xs">{totalPosts} signals found</div>
        <div className="mt-2 grid grid-cols-8 gap-0.5">
          {Array.from({ length: totalSources }).map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-sm ${i < activeSources ? 'bg-[#3B82F6]' : 'bg-[#1F1F1F]'}`}
            />
          ))}
        </div>
      </div>

      {/* Card 5 — 7-Day Trend */}
      <div className="bg-[#111111] border border-[#1F1F1F] rounded-lg p-4">
        <div className="text-[#6B7280] text-xs uppercase tracking-wider mb-1">7-Day Trend</div>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-mono font-bold" style={{ color: scoreColor }}>
            {avgScore}
          </span>
          <span className="text-[#6B7280] text-sm">/100</span>
        </div>
        <div className="mt-1 text-[#6B7280] text-xs">weighted brand score</div>
        <div className="mt-2 h-1 bg-[#1F1F1F] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${avgScore}%`, backgroundColor: scoreColor }}
          />
        </div>
      </div>
    </div>
  );
}
