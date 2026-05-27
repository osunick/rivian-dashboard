import {
  reports as allReports,
  getLatestReport,
  getLast10Reports,
  getSevenDayAvgScore,
  getThemeFrequency,
  getThemeItemsMap,
  getCategoryBreakdown,
  getCategoryItemsMap,
  getSentimentDelta,
  getTotalPostsLatest,
  getActiveSourcesLatest,
  getCompetitorIntelMap,
  getCompetitiveItemCountLatest,
  getOverallThreatLevel,
  getSourceMatrixData,
  getScopeReports,
  getRivianAutonomyIssues,
} from '@/lib/data';
import { SOURCE_KEYS, SentimentLabel } from '@/lib/types';
import KpiCards from '@/components/KpiCards';
import SentimentTrendChart from '@/components/SentimentTrendChart';
import SourceActivityChart from '@/components/SourceActivityChart';
import ThemeSection from '@/components/ThemeSection';
import CategoryBreakdown from '@/components/CategoryBreakdown';
import SourceSentimentMatrix from '@/components/SourceSentimentMatrix';
import ReportHistory from '@/components/ReportHistory';
import CompetitorWatch from '@/components/CompetitorWatch';
import ScoutingReport from '@/components/ScoutingReport';
import AutonomyIssues from '@/components/AutonomyIssues';
import SearchButton from '@/components/SearchButton';
import ChatButton from '@/components/ChatButton';

export const dynamic = 'force-dynamic';

const THREAT_HEADER: Record<string, { color: string; label: string }> = {
  high:     { color: '#EF4444', label: 'HIGH THREAT' },
  elevated: { color: '#F59E0B', label: 'ELEVATED' },
  medium:   { color: '#3B82F6', label: 'MONITORING' },
  low:      { color: '#22C55E', label: 'CLEAR' },
};

export default function DashboardPage({ searchParams }: { searchParams: { scope?: string } }) {
  const scope = (searchParams.scope ?? 'latest') as 'latest' | '7d' | 'all';

  const latest = getLatestReport();
  const last10 = getLast10Reports();
  const avgScore = getSevenDayAvgScore();
  const themes = getThemeFrequency();
  const themeItemsMap = getThemeItemsMap();
  const categories = getCategoryBreakdown();
  const categoryItemsMap = getCategoryItemsMap();
  const positiveDelta = getSentimentDelta('positive');
  const negativeDelta = getSentimentDelta('negative');
  const totalPosts = getTotalPostsLatest();
  const activeSources = getActiveSourcesLatest();
  const matrixData = getSourceMatrixData();
  const competitorIntelMap = getCompetitorIntelMap();
  const competitiveItems = getCompetitiveItemCountLatest();
  const threatLevel = getOverallThreatLevel();
  const autonomyIssues = getRivianAutonomyIssues();

  const { reports } = getScopeReports(scope);
  const failedScans = allReports.filter(r => r.scanError);

  const lastUpdated = latest
    ? new Date(latest.timestamp).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
        timeZone: 'America/Los_Angeles'
      })
    : null;

  // Source activity — always count from items[] so bars reflect actual data
  const sourceActivityData = (() => {
    const seen: Record<string, Set<string>> = {};
    const counts: Record<string, { found: number; sentiment: SentimentLabel | null }> = {};
    for (const r of reports) {
      for (const item of r.items ?? []) {
        const src = item.source;
        if (!src) continue;
        if (!seen[src]) seen[src] = new Set();
        if (seen[src].has(item.url)) continue;
        seen[src].add(item.url);
        if (!counts[src]) counts[src] = { found: 0, sentiment: null };
        counts[src].found++;
        if (!counts[src].sentiment && item.sentiment) counts[src].sentiment = item.sentiment as SentimentLabel;
      }
    }
    return SOURCE_KEYS.map(key => ({
      source: key,
      found: counts[key]?.found ?? 0,
      sentiment: counts[key]?.sentiment ?? null,
    }));
  })();

  // Items grouped by source, deduplicated by URL, across scope (always from items[])
  const sourceItemsFromScope: Record<string, any[]> = {};
  {
    const seenSrc: Record<string, Set<string>> = {};
    for (const r of reports) {
      for (const item of r.items ?? []) {
        const src = item.source;
        if (!src) continue;
        if (!seenSrc[src]) seenSrc[src] = new Set();
        if (seenSrc[src].has(item.url)) continue;
        seenSrc[src].add(item.url);
        if (!sourceItemsFromScope[src]) sourceItemsFromScope[src] = [];
        sourceItemsFromScope[src].push({ ...item, reportTimestamp: r.timestamp });
      }
    }
  }

  const threatDisplay = THREAT_HEADER[threatLevel] ?? THREAT_HEADER.medium;

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Top accent bar — threat-level colored */}
      <div className="h-0.5 w-full" style={{ backgroundColor: threatDisplay.color }} />

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-3 gap-2 border-b border-[#1F1F1F] bg-[#0D0D0D]">
        <div className="flex items-center gap-3">
          <span className="text-[#3B82F6] text-xl">🎬</span>
          <span className="text-[#F5F5F5] font-bold text-lg tracking-tight">GameFilm</span>
          <span className="text-[#1F1F1F]">|</span>
          <span className="text-[#6B7280] text-sm font-mono">RIVIAN COMPETITIVE INTELLIGENCE</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:text-right">
          <SearchButton />
          <ChatButton />
          {/* Threat badge */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-mono font-semibold"
            style={{ color: threatDisplay.color, borderColor: `${threatDisplay.color}40` }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: threatDisplay.color }} />
            {threatDisplay.label}
          </div>
          {lastUpdated ? (
            <>
              <span className="text-[#6B7280] text-xs">LAST SCAN</span>
              <span className="text-[#F5F5F5] text-xs font-mono">{lastUpdated}</span>
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
            </>
          ) : (
            <span className="text-[#6B7280] text-xs font-mono">AWAITING FIRST SCAN</span>
          )}
        </div>
      </header>

      <main className="px-3 sm:px-6 py-4 sm:py-5 space-y-5 max-w-screen-2xl mx-auto">

        {/* Scope toggle */}
        <div className="flex items-center gap-2">
          <span className="text-[#6B7280] text-xs font-mono uppercase tracking-wider">Scope:</span>
          {([['latest','Latest Scan'],['7d','Last 7 Days'],['all','All Time']] as const).map(([val, label]) => (
            <a key={val} href={`?scope=${val}`}>
              <button className={`px-3 py-1 rounded text-xs font-mono border transition-colors ${scope === val ? 'bg-[#3B82F6] border-[#3B82F6] text-white' : 'bg-[#111111] border-[#1F1F1F] text-[#6B7280] hover:border-[#3B82F6]'}`}>
                {label}
              </button>
            </a>
          ))}
        </div>

        {/* Failed scan banner */}
        {failedScans.length > 0 && (
          <div className="border border-[#F59E0B33] bg-[#F59E0B08] rounded-lg px-4 py-3 flex items-center gap-3">
            <span className="text-[#F59E0B] text-sm">⚠️</span>
            <span className="text-[#F59E0B] text-xs font-mono">
              {failedScans.length} scan{failedScans.length > 1 ? 's' : ''} failed (search engine blocked) — data gaps possible. Shown in Report Archive below.
            </span>
          </div>
        )}

        {/* Empty state */}
        {!latest ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="text-[#3B82F6] text-4xl mb-4">🎬</div>
            <div className="text-[#F5F5F5] text-lg font-semibold mb-2">Waiting for first GameFilm scan</div>
            <div className="text-[#6B7280] text-sm max-w-md">
              GameFilm runs twice daily and pulls competitive intelligence from Reddit, news outlets, forums, Twitter, and more.
              Check back soon — or trigger a manual run.
            </div>
            {reports.length > 0 && (
              <div className="mt-6 bg-[#111111] border border-[#1F1F1F] rounded-lg p-4 w-full max-w-lg">
                <div className="text-[#6B7280] text-xs font-mono uppercase tracking-wider mb-3">Scan History</div>
                <ReportHistory reports={reports} />
              </div>
            )}
          </div>
        ) : (
          <>
            {/* ── Row 0: Scouting Report */}
            <ScoutingReport
              competitiveContext={latest.competitiveContext ?? ''}
              summary={latest.summary}
              themes={latest.themes}
              threatLevel={threatLevel}
              competitiveItemCount={competitiveItems}
              timestamp={latest.timestamp}
            />

            {/* ── Row 1: KPI Cards */}
            <KpiCards
              positive={latest.sentiment.positive}
              negative={latest.sentiment.negative}
              positiveDelta={positiveDelta}
              negativeDelta={negativeDelta}
              activeSources={activeSources}
              totalSources={8}
              totalPosts={totalPosts}
              avgScore={avgScore}
              competitiveItems={competitiveItems}
            />

            {/* ── Row 2: Competitor Watch */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[#F5F5F5] text-sm font-semibold uppercase tracking-wider">
                  ⚔️ Competitor Watch
                </h2>
                <span className="text-[#6B7280] text-xs font-mono">CLICK CARD TO EXPAND INTEL</span>
              </div>
              <CompetitorWatch intelMap={competitorIntelMap} />
            </div>

            {/* ── Row 2b: Rivian Autonomy Issues */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[#F5F5F5] text-sm font-semibold uppercase tracking-wider">
                  🐛 Rivian Autonomy &amp; Software Issues
                </h2>
                <span className="text-[#6B7280] text-xs font-mono">INTERNAL · ALL CATEGORIES</span>
              </div>
              <AutonomyIssues issues={autonomyIssues} />
            </div>

            {/* ── Row 3: Signal Trend + Source Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-3 bg-[#111111] border border-[#1F1F1F] rounded-lg p-4">
                <div className="flex flex-wrap items-center justify-between gap-1 mb-3">
                  <h2 className="text-[#F5F5F5] text-sm font-semibold uppercase tracking-wider">Brand Signal Trend</h2>
                  <span className="text-[#6B7280] text-xs font-mono">LAST 10 VALID SCANS · CLICK TO DRILL DOWN</span>
                </div>
                <SentimentTrendChart data={last10} />
              </div>
              <div className="lg:col-span-2 bg-[#111111] border border-[#1F1F1F] rounded-lg p-4">
                <div className="flex flex-wrap items-center justify-between gap-1 mb-3">
                  <h2 className="text-[#F5F5F5] text-sm font-semibold uppercase tracking-wider">Source Activity</h2>
                  <span className="text-[#6B7280] text-xs font-mono uppercase">{scope === 'latest' ? 'LATEST SCAN' : scope === '7d' ? 'LAST 7 DAYS' : 'ALL TIME'} · CLICK TO DRILL DOWN</span>
                </div>
                <SourceActivityChart
                  data={sourceActivityData}
                  itemsMap={sourceItemsFromScope}
                />
              </div>
            </div>

            {/* ── Row 4: Intel by Domain + Source Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#111111] border border-[#1F1F1F] rounded-lg p-4">
                <div className="flex flex-wrap items-center justify-between gap-1 mb-3">
                  <h2 className="text-[#F5F5F5] text-sm font-semibold uppercase tracking-wider">Intel by Domain</h2>
                  <span className="text-[#6B7280] text-xs font-mono">CLICK TO DRILL DOWN</span>
                </div>
                <CategoryBreakdown categories={categories} itemsMap={categoryItemsMap} />
              </div>
              <div className="bg-[#111111] border border-[#1F1F1F] rounded-lg p-4">
                <div className="flex flex-wrap items-center justify-between gap-1 mb-3">
                  <h2 className="text-[#F5F5F5] text-sm font-semibold uppercase tracking-wider">Source Matrix</h2>
                  <span className="text-[#6B7280] text-xs font-mono">LAST 5 SCANS · CLICK TO DRILL DOWN</span>
                </div>
                {matrixData.rows.length > 0
                  ? <SourceSentimentMatrix matrix={matrixData} />
                  : <div className="text-[#6B7280] text-xs font-mono py-8 text-center">No data yet</div>
                }
              </div>
            </div>

            {/* ── Row 5: Top Signals */}
            {themes.length > 0 && (
              <div className="bg-[#111111] border border-[#1F1F1F] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[#F5F5F5] text-sm font-semibold uppercase tracking-wider">Top Signal Themes</h2>
                  <span className="text-[#6B7280] text-xs font-mono">CLICK THEME TO DRILL DOWN</span>
                </div>
                <ThemeSection themes={themes} themeItemsMap={themeItemsMap} />
              </div>
            )}

            {/* ── Row 6: Report Archive */}
            <div className="bg-[#111111] border border-[#1F1F1F] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[#F5F5F5] text-sm font-semibold uppercase tracking-wider">Field Notes Archive</h2>
                <span className="text-[#6B7280] text-xs font-mono">{reports.length} TOTAL · {failedScans.length} FAILED</span>
              </div>
              <ReportHistory reports={reports} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
