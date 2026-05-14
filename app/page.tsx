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

  const lastUpdated = new Date(latest.timestamp).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
  });

  // Source activity data for bar chart
  const sourceActivityData = SOURCE_KEYS.map(key => ({
    source: key,
    found: latest.sources[key].found,
    sentiment: latest.sources[key].sentiment,
  }));

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Top border accent */}
      <div className="h-0.5 w-full bg-[#3B82F6]" />

      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-[#1F1F1F] bg-[#111111]">
        <div className="flex items-center gap-3">
          <span className="text-[#3B82F6] text-xl">🔵</span>
          <span className="text-[#F5F5F5] font-semibold text-lg tracking-tight">
            Rivian Autonomy
          </span>
          <span className="text-[#1F1F1F]">|</span>
          <span className="text-[#6B7280] text-sm font-mono">SENTIMENT DASHBOARD</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#6B7280] text-xs">LAST UPDATED</span>
          <span className="text-[#F5F5F5] text-xs font-mono">{lastUpdated}</span>
          <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
        </div>
      </header>

      <main className="px-6 py-5 space-y-5 max-w-screen-2xl mx-auto">
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
        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-3 bg-[#111111] border border-[#1F1F1F] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[#F5F5F5] text-sm font-semibold uppercase tracking-wider">
                Sentiment Trend
              </h2>
              <span className="text-[#6B7280] text-xs font-mono">LAST 10 REPORTS</span>
            </div>
            <SentimentTrendChart data={last10} />
          </div>
          <div className="col-span-2 bg-[#111111] border border-[#1F1F1F] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[#F5F5F5] text-sm font-semibold uppercase tracking-wider">
                Source Activity
              </h2>
              <span className="text-[#6B7280] text-xs font-mono">LATEST CYCLE</span>
            </div>
            <SourceActivityChart data={sourceActivityData} />
          </div>
        </div>

        {/* Row 3 — Panels */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#111111] border border-[#1F1F1F] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[#F5F5F5] text-sm font-semibold uppercase tracking-wider">
                Theme Frequency
              </h2>
              <span className="text-[#6B7280] text-xs font-mono">ALL REPORTS</span>
            </div>
            <ThemeFrequencyChart data={themes} />
          </div>
          <div className="bg-[#111111] border border-[#1F1F1F] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[#F5F5F5] text-sm font-semibold uppercase tracking-wider">
                Source Sentiment Matrix
              </h2>
              <span className="text-[#6B7280] text-xs font-mono">LAST 5 CYCLES</span>
            </div>
            <SourceSentimentMatrix reports={last5} />
          </div>
        </div>

        {/* Row 4 — Report History */}
        <div className="bg-[#111111] border border-[#1F1F1F] rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[#F5F5F5] text-sm font-semibold uppercase tracking-wider">
              Report History
            </h2>
            <span className="text-[#6B7280] text-xs font-mono">{reports.length} REPORTS</span>
          </div>
          <ReportHistory reports={reports} />
        </div>
      </main>
    </div>
  );
}
