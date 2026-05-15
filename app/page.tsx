import {
  reports,
  getLatestReport,
  getLast10Reports,
  getSevenDayAvgScore,
  getThemeFrequency,
  getSentimentDelta,
  getTotalPostsLatest,
  getActiveSourcesLatest,
  getLast5ReportsNewestFirst,
} from '@/lib/data';
import { SOURCE_KEYS } from '@/lib/types';
import KpiCards from '@/components/KpiCards';
import SentimentTrendChart from '@/components/SentimentTrendChart';
import SourceActivityChart from '@/components/SourceActivityChart';
import ThemeFrequencyChart from '@/components/ThemeFrequencyChart';
import SourceSentimentMatrix from '@/components/SourceSentimentMatrix';
import ReportHistory from '@/components/ReportHistory';

export const dynamic = 'force-static';

export default function DashboardPage() {
  const latest = getLatestReport();
  const last10 = getLast10Reports();
  const avgScore = getSevenDayAvgScore();
  const themes = getThemeFrequency();
  const positiveDelta = getSentimentDelta('positive');
  const negativeDelta = getSentimentDelta('negative');
  const totalPosts = getTotalPostsLatest();
  const activeSources = getActiveSourcesLatest();
  const last5 = getLast5ReportsNewestFirst();

  const lastUpdated = latest
    ? new Date(latest.timestamp).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
      })
    : null;

  const sourceActivityData = latest
    ? SOURCE_KEYS.map(key => ({
        source: key,
        found: latest.sources[key].found,
        sentiment: latest.sources[key].sentiment,
      }))
    : [];

  // Count scan errors for banner
  const failedScans = reports.filter(r => r.scanError);

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <div className="h-0.5 w-full bg-[#3B82F6]" />

      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-3 gap-2 border-b border-[#1F1F1F] bg-[#111111]">
        <div className="flex items-center gap-3">
          <span className="text-[#3B82F6] text-xl">🔵</span>
          <span className="text-[#F5F5F5] font-semibold text-lg tracking-tight">Rivian Autonomy</span>
          <span className="text-[#1F1F1F]">|</span>
          <span className="text-[#6B7280] text-sm font-mono">SENTIMENT DASHBOARD</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:text-right">
          {lastUpdated ? (
            <>
              <span className="text-[#6B7280] text-xs">LAST UPDATED</span>
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
              {failedScans.length} scan{failedScans.length > 1 ? 's' : ''} failed (search engine blocked) — visible in Report History below. Data shown excludes failed cycles.
            </span>
          </div>
        )}

        {/* Empty state */}
        {!latest ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="text-[#3B82F6] text-4xl mb-4">🔵</div>
            <div className="text-[#F5F5F5] text-lg font-semibold mb-2">Waiting for first scan</div>
            <div className="text-[#6B7280] text-sm max-w-md">
              The sentiment tracker runs every 12 hours and fetches real data from Reddit, news outlets, forums, and more.
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
            {/* Row 1 — KPI Cards */}
            <KpiCards
              positive={latest.sentiment.positive}
              negative={latest.sentiment.negative}
              positiveDelta={positiveDelta}
              negativeDelta={negativeDelta}
              activeSources={activeSources}
              totalSources={8}
              totalPosts={totalPosts}
              avgScore={avgScore}
            />

            {/* Row 2 — Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-3 bg-[#111111] border border-[#1F1F1F] rounded-lg p-4">
                <div className="flex flex-wrap items-center justify-between gap-1 mb-3">
                  <h2 className="text-[#F5F5F5] text-sm font-semibold uppercase tracking-wider">Sentiment Trend</h2>
                  <span className="text-[#6B7280] text-xs font-mono">LAST 10 VALID REPORTS · CLICK TO DRILL DOWN</span>
                </div>
                <SentimentTrendChart data={last10} />
              </div>
              <div className="lg:col-span-2 bg-[#111111] border border-[#1F1F1F] rounded-lg p-4">
                <div className="flex flex-wrap items-center justify-between gap-1 mb-3">
                  <h2 className="text-[#F5F5F5] text-sm font-semibold uppercase tracking-wider">Source Activity</h2>
                  <span className="text-[#6B7280] text-xs font-mono">LATEST CYCLE</span>
                </div>
                <SourceActivityChart data={sourceActivityData} />
              </div>
            </div>

            {/* Row 3 — Panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#111111] border border-[#1F1F1F] rounded-lg p-4">
                <div className="flex flex-wrap items-center justify-between gap-1 mb-3">
                  <h2 className="text-[#F5F5F5] text-sm font-semibold uppercase tracking-wider">Theme Frequency</h2>
                  <span className="text-[#6B7280] text-xs font-mono">ALL REPORTS</span>
                </div>
                {themes.length > 0
                  ? <ThemeFrequencyChart data={themes} />
                  : <div className="text-[#6B7280] text-xs font-mono py-8 text-center">No themes yet</div>
                }
              </div>
              <div className="bg-[#111111] border border-[#1F1F1F] rounded-lg p-4">
                <div className="flex flex-wrap items-center justify-between gap-1 mb-3">
                  <h2 className="text-[#F5F5F5] text-sm font-semibold uppercase tracking-wider">Source Sentiment Matrix</h2>
                  <span className="text-[#6B7280] text-xs font-mono">LAST 5 CYCLES</span>
                </div>
                {last5.length > 0
                  ? <SourceSentimentMatrix reports={last5} />
                  : <div className="text-[#6B7280] text-xs font-mono py-8 text-center">No data yet</div>
                }
              </div>
            </div>

            {/* Row 4 — Report History */}
            <div className="bg-[#111111] border border-[#1F1F1F] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[#F5F5F5] text-sm font-semibold uppercase tracking-wider">Report History</h2>
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
