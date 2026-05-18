import {
  reports,
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
  getLast5ReportsNewestFirst,
  getCompetitorIntelMap,
  getCompetitiveItemCountLatest,
  getOverallThreatLevel,
} from '@/lib/data';
import { SOURCE_KEYS } from '@/lib/types';
import KpiCards from '@/components/KpiCards';
import SentimentTrendChart from '@/components/SentimentTrendChart';
import SourceActivityChart from '@/components/SourceActivityChart';
import ThemeSection from '@/components/ThemeSection';
import CategoryBreakdown from '@/components/CategoryBreakdown';
import SourceSentimentMatrix from '@/components/SourceSentimentMatrix';
import ReportHistory from '@/components/ReportHistory';
import CompetitorWatch from '@/components/CompetitorWatch';
import ScoutingReport from '@/components/ScoutingReport';

export const dynamic = 'force-static';

const THREAT_HEADER: Record<string, { color: string; label: string }> = {
  high:     { color: '#EF4444', label: 'HIGH THREAT' },
  elevated: { color: '#F59E0B', label: 'ELEVATED' },
  medium:   { color: '#3B82F6', label: 'MONITORING' },
  low:      { color: '#22C55E', label: 'CLEAR' },
};

export default function DashboardPage() {
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
  const last5 = getLast5ReportsNewestFirst();
  const competitorIntelMap = getCompetitorIntelMap();
  const competitiveItems = getCompetitiveItemCountLatest();
  const threatLevel = getOverallThreatLevel();

  const lastUpdated = latest
    ? new Date(latest.timestamp).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
        timeZone: 'America/Los_Angeles'
      })
    : null;

  const sourceActivityData = latest
    ? SOURCE_KEYS.map(key => ({
        source: key,
        found: latest.sources[key].found,
        sentiment: latest.sources[key].sentiment,
      }))
    : [];

  const failedScans = reports.filter(r => r.scanError);
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
            {/* ── Row 0: Scouting Report (competitive context, prominent) */}
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
                  <span className="text-[#6B7280] text-xs font-mono">LATEST SCAN</span>
                </div>
                <SourceActivityChart data={sourceActivityData} />
              </div>
            </div>

            {/* ── Row 4: Intel by Domain + Key Themes */}
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
                  <span className="text-[#6B7280] text-xs font-mono">LAST 5 SCANS</span>
                </div>
                {last5.length > 0
                  ? <SourceSentimentMatrix reports={last5} />
                  : <div className="text-[#6B7280] text-xs font-mono py-8 text-center">No data yet</div>
                }
              </div>
            </div>

            {/* ── Row 5: Top Signals (Theme Frequency) */}
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
