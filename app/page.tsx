import {
  reports as allReports,
  getCompetitorIntelMap,
  getLatestReport,
  getOverallThreatLevel,
  getRivianAutonomyIssues,
  getScopeReports,
  getEffectiveDate,
  getSentimentByPublishDate,
} from '@/lib/data';
import { CATEGORY_KEYS, CATEGORY_LABELS, COMPETITORS, SOURCE_KEYS, SOURCE_LABELS, SentimentLabel } from '@/lib/types';
import SearchButton from '@/components/SearchButton';
import ChatButton from '@/components/ChatButton';
import SummarySentimentBars from '@/components/SummarySentimentBars';
import CompetitorsSection from '@/components/CompetitorsSection';
import PublishSentimentTrend from '@/components/PublishSentimentTrend';
import DrillDown, { DrillDownItem } from '@/components/DrillDown';

export const dynamic = 'force-dynamic';

const THREAT_STYLES = {
  high: { label: 'Critical', tone: 'bg-[#E62429]/15 text-[#FF5A5F] border-[#E62429]/40' },
  elevated: { label: 'Elevated', tone: 'bg-[#F5C518]/12 text-[#F5C518] border-[#F5C518]/35' },
  medium: { label: 'Monitoring', tone: 'bg-[#3A86FF]/12 text-[#6FA8FF] border-[#3A86FF]/35' },
  low: { label: 'Clear', tone: 'bg-[#2DD4A7]/12 text-[#2DD4A7] border-[#2DD4A7]/30' },
} as const;

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Los_Angeles',
    timeZoneName: 'short',
  });
}

function formatCompactDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Los_Angeles',
  });
}

function dedupeScopeItems(reports: ReturnType<typeof getScopeReports>['reports']) {
  const seen = new Set<string>();
  const items: Array<
    (typeof reports)[number]['items'][number] & {
      reportTimestamp: string;
      publishDate: string;   // ISO of original publish date
      publishMs: number;     // epoch for sorting
    }
  > = [];
  for (const report of reports) {
    for (const item of report.items ?? []) {
      const key = item.url || `${report.id}-${item.title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const d = getEffectiveDate(item, report.timestamp);
      items.push({
        ...item,
        reportTimestamp: report.timestamp,
        publishDate: d.toISOString(),
        publishMs: d.getTime(),
      });
    }
  }
  // Order by ORIGINAL publish date, newest first
  items.sort((a, b) => b.publishMs - a.publishMs);
  return items;
}

function extractBullets(text: string, limit = 5) {
  return text
    .split('\n')
    .map(line => line.replace(/^[•*\-\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, limit);
}

function humanJoin(values: string[]) {
  if (values.length <= 1) return values[0] ?? '';
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`;
}

function countAutonomyRelevantSignals(
  items: Array<{
    category?: string;
    title: string;
    snippet?: string;
  }>
) {
  const autonomyTerms = [
    'highway assist',
    'driver+',
    'driver plus',
    'autonomy',
    'lane change',
    'phantom brake',
    'slams brakes',
    'recall',
    'software defect',
    'hotfix',
    'voice assistant',
    'hey rivian',
    'hands free',
    'adaptive cruise',
  ];

  return items.filter(item => {
    if (item.category === 'autonomy') return true;
    const text = `${item.title} ${item.snippet ?? ''}`.toLowerCase();
    return autonomyTerms.some(term => text.includes(term));
  }).length;
}

const DEMO_DRIVE_TERMS = [
  'demo drive',
  'demo-drive',
  'demo ride',
  'demo review',
  'test drive',
  'test-drive',
  'test ride',
  'test drove',
  'first drive',
  'first-drive',
  'drive review',
  'driving impressions',
  'initial thoughts',
  'first impressions',
  'behind the wheel',
  'hands on',
  'hands-on',
  'walkaround',
  'walk around',
];

function isDemoDriveFeedback(item: { category?: string; title: string; snippet?: string }) {
  if (item.category === 'demo_drives') return true;
  const text = `${item.title} ${item.snippet ?? ''}`.toLowerCase();
  return DEMO_DRIVE_TERMS.some(term => text.includes(term));
}

// Vehicle-dynamics analysis: classify signals into how-it-drives sub-topics.
const DYNAMICS_TOPICS: { key: string; label: string; terms: string[] }[] = [
  { key: 'ride', label: 'Ride & Handling', terms: ['ride quality', 'handling', 'cornering', 'body roll', 'ride comfort', 'smooth ride', 'harsh ride', 'composed', 'planted', 'floaty', 'bumpy', 'road feel', 'rides like', 'drives like'] },
  { key: 'suspension', label: 'Suspension', terms: ['suspension', 'air suspension', 'adaptive damp', 'damper', 'ride height', 'spring rate', 'shock absorber', 'kneel', 'lift mode', 'sag'] },
  { key: 'steering', label: 'Steering', terms: ['steering', 'turning radius', 'tank turn', 'steering feel', 'on-center', 'lock to lock', 'understeer', 'oversteer'] },
  { key: 'braking', label: 'Braking & Regen', terms: ['braking', 'brake pedal', 'brakes', 'regen', 'regenerative', 'one-pedal', 'one pedal', 'stopping distance', 'blended brak'] },
  { key: 'performance', label: 'Acceleration & Power', terms: ['acceleration', '0-60', '0 to 60', '0–60', 'quarter mile', 'launch control', 'quad motor', 'quad-motor', 'tri motor', 'tri-motor', 'dual motor', 'horsepower', 'torque', 'top speed', 'neck snapping', 'neck-snapping'] },
  { key: 'towing', label: 'Towing & Payload', terms: ['towing', 'tow rating', 'trailer', 'payload', 'hauling', 'gooseneck', 'tongue weight', 'towed'] },
  { key: 'offroad', label: 'Off-Road & Traction', terms: ['off-road', 'offroad', 'off road', 'rock crawl', 'overland', 'trail', 'terrain', 'ground clearance', 'water wading', 'wading', 'traction', 'articulation', 'approach angle', 'departure angle'] },
  { key: 'efficiency', label: 'Range & Efficiency', terms: ['range', 'efficiency', 'mpge', 'mi/kwh', 'miles per kwh', 'wh/mi', 'consumption', 'real-world range', 'epa range', 'energy use'] },
];

function dynamicsText(item: { title: string; snippet?: string; themes?: string[] }) {
  return `${item.title} ${item.snippet ?? ''} ${(item.themes ?? []).join(' ')}`.toLowerCase();
}

type InferredSignalTone = 'positive' | 'neutral' | 'risk';
type InferredToneItem = {
  title: string;
  url: string;
  source: string;
  sentiment: InferredSignalTone;
  publishedAt?: string | null;
  snippet?: string;
  reportTimestamp: string;
};

function inferSignalTone(item: { title: string; snippet?: string; source?: string }) {
  const text = `${item.title} ${item.snippet ?? ''}`.toLowerCase();

  const riskTerms = [
    'malfunction',
    'worry',
    'worried',
    'investigation',
    'defect',
    'disabled',
    'unavailable',
    'failure',
    'failing',
    'failed',
    'problem',
    'battery problem',
    'dipped',
    'trading down',
    'sell rating',
    'time to sell',
    'not so much',
    'broke off',
    'sudden shift',
    'power steering',
  ];

  const positiveTerms = [
    'impressed',
    'strong first impressions',
    'demo drive',
    'test drive',
    'experienced',
    'this will be my next rivian',
    'delivers',
    'lucky to be one of the first',
    'upgrade my model y',
    'another opinion',
    'walk around',
  ];

  if (riskTerms.some(term => text.includes(term))) return 'risk';
  if (positiveTerms.some(term => text.includes(term))) return 'positive';
  return 'neutral';
}

function buildSummaryNotes({
  scope,
  latest,
  scopeItems,
  totalSignals,
  sourceCounts,
  categoryCounts,
  sentimentTotals,
  inferredToneTotals,
  competitiveSignalCount,
  demoDriveSignalCount,
}: {
  scope: 'latest' | '7d' | 'all';
  latest: ReturnType<typeof getLatestReport>;
  scopeItems: Array<{
    category?: string;
    title: string;
    snippet?: string;
    source: string;
    sentiment: SentimentLabel;
  }>;
  totalSignals: number;
  sourceCounts: Array<{ label: string; count: number }>;
  categoryCounts: Array<{ label: string; count: number }>;
  sentimentTotals: { positive: number; neutral: number; negative: number };
  inferredToneTotals: Record<InferredSignalTone, number>;
  competitiveSignalCount: number;
  demoDriveSignalCount: number;
}) {
  const narrative = latest
    ? extractBullets([latest.summary, latest.competitiveContext].filter(Boolean).join('\n'), 6)
    : [];
  const notes: string[] = [];
  const dominantSentiment = Object.entries(sentimentTotals).sort((a, b) => b[1] - a[1])[0];
  const topSource = sourceCounts[0];
  const topCategory = categoryCounts[0];
  const topSourceShare = topSource && totalSignals > 0 ? Math.round((topSource.count / totalSignals) * 100) : 0;
  const topCategoryLabel = topCategory?.label.replace(/^[^\w]+/, '');
  const autonomyRelevantSignals = countAutonomyRelevantSignals(scopeItems);
  const inferredRiskShare =
    totalSignals > 0 ? Math.round((inferredToneTotals.risk / Math.max(totalSignals, 1)) * 100) : 0;
  const inferredPositiveShare =
    totalSignals > 0 ? Math.round((inferredToneTotals.positive / Math.max(totalSignals, 1)) * 100) : 0;
  const scopeLabel = scope === 'latest' ? 'latest scan' : scope === '7d' ? 'last 7 days' : 'full archive';

  if (narrative.length > 0) {
    notes.push(...narrative.slice(0, 2));
  }

  if (totalSignals === 0) {
    return ['No signals are in scope for this view yet.'];
  }

  if (topCategoryLabel && topSource) {
    notes.push(
      `The ${scopeLabel} is dominated by ${topCategoryLabel.toLowerCase()} coverage from ${topSource.label} (${topSourceShare}% of signals), so this read is closer to market chatter than a direct autonomy health check.`
    );
  }

  if (dominantSentiment && dominantSentiment[1] > 0) {
    notes.push(
      `The upstream labels skew neutral, but the link text reads more mixed: about ${inferredPositiveShare}% of scoped items look like demand or product-interest signals, while ${inferredRiskShare}% read as reliability, safety, or market-confidence risk.`
    );
  } else {
    notes.push('Sentiment data is not available for the current scope yet.');
  }

  if (autonomyRelevantSignals > 0) {
    notes.push(
      `Only ${autonomyRelevantSignals} autonomy-relevant signals appear in this view. For an autonomy PM, that means reliability, intervention quality, and Driver+ trust are still under-sampled relative to broader product interest.`
    );
  } else {
    notes.push(
      'There are no direct autonomy-specific signals in this view. Treat that as a coverage gap rather than evidence that Driver+ or Highway Assist issues are absent.'
    );
  }

  if (demoDriveSignalCount > 0) {
    notes.push(
      `${demoDriveSignalCount} demo or test-drive feedback signals are in scope, giving PMs a direct read on hands-on R2 perception rather than only launch/news chatter.`
    );
  } else {
    notes.push(
      'No demo or test-drive feedback is in scope yet, so hands-on R2 perception is still a collection priority for the next scan.'
    );
  }

  if (competitiveSignalCount > 0) {
    notes.push(
      `${competitiveSignalCount} competitive signals are in scope, so the product question is less “are we being mentioned?” and more whether Rivian’s assist stack is being framed as dependable and easy to understand next to Tesla and Waymo narratives.`
    );
  }

  notes.push(
    'Best next step: prioritize test-drive impressions, post-update regressions, and Highway Assist edge-case reports so the summary reflects autonomy learning velocity instead of only launch attention.'
  );

  return notes.slice(0, 5);
}

function sentimentTone(sentiment: SentimentLabel) {
  if (sentiment === 'positive') return 'bg-[#2DD4A7]/12 text-[#2DD4A7] border border-[#2DD4A7]/25';
  if (sentiment === 'negative') return 'bg-[#F0453A]/12 text-[#FF6B61] border border-[#F0453A]/25';
  return 'bg-white/[0.04] text-claude-muted border border-white/10';
}

function ScopeTab({ active, href, label }: { active: boolean; href: string; label: string }) {
  return (
    <a
      href={href}
      className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-all ${
        active
          ? 'bg-marvel-red text-white shadow-glow'
          : 'bg-transparent text-claude-muted hover:text-claude-text hover:bg-white/5'
      }`}
    >
      {label}
    </a>
  );
}

function Card({
  title,
  meta,
  children,
  className = '',
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`relative overflow-hidden rounded-xl border border-claude-border bg-claude-card/80 shadow-cinematic backdrop-blur-sm ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3.5">
        <h2 className="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight text-claude-text">
          <span className="h-3.5 w-[3px] rounded-full bg-marvel-red" />
          {title}
        </h2>
        {meta ? <div className="font-mono-num text-[11px] uppercase tracking-[0.14em] text-claude-muted">{meta}</div> : null}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const params = await searchParams;
  const scope = (params.scope ?? 'latest') as 'latest' | '7d' | 'all';
  const latest = getLatestReport();
  const scopedReports = getScopeReports(scope).reports;
  const failedScans = allReports.filter(report => report.scanError);
  const threatLevel = getOverallThreatLevel();
  const threatStyle = THREAT_STYLES[threatLevel];
  const competitorIntelMap = getCompetitorIntelMap();
  const autonomyIssues = getRivianAutonomyIssues().slice(0, 6);

  const scopeItems = dedupeScopeItems(scopedReports);
  const totalSignals = scopeItems.length;
  const lastUpdated = latest ? formatTimestamp(latest.timestamp) : null;
  const publishTrend = getSentimentByPublishDate(21);
  const datedShare = totalSignals > 0
    ? Math.round((scopeItems.filter(i => i.publishedAt).length / totalSignals) * 100)
    : 0;

  const sourceCounts = SOURCE_KEYS.map(source => ({
    key: source,
    label: SOURCE_LABELS[source],
    count: scopeItems.filter(item => item.source === source).length,
  }))
    .filter(source => source.count > 0)
    .sort((a, b) => b.count - a.count);

  const categoryCounts = CATEGORY_KEYS.map(category => ({
    key: category,
    label: CATEGORY_LABELS[category],
    count: scopeItems.filter(item => item.category === category).length,
  }))
    .filter(category => category.count > 0)
    .sort((a, b) => b.count - a.count);

  const themeCounts = Object.entries(
    scopeItems.reduce<Record<string, number>>((acc, item) => {
      for (const theme of item.themes ?? []) acc[theme] = (acc[theme] ?? 0) + 1;
      return acc;
    }, {})
  )
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const sentimentTotals = scopeItems.reduce(
    (acc, item) => {
      acc[item.sentiment] += 1;
      return acc;
    },
    { positive: 0, neutral: 0, negative: 0 }
  );

  const inferredToneTotals = scopeItems.reduce<Record<InferredSignalTone, number>>(
    (acc, item) => {
      acc[inferSignalTone(item)] += 1;
      return acc;
    },
    { positive: 0, neutral: 0, risk: 0 }
  );

  const inferredToneItems = scopeItems.reduce<Record<InferredSignalTone, InferredToneItem[]>>(
    (acc, item) => {
      const tone = inferSignalTone(item);
      acc[tone].push({
        ...item,
        sentiment: tone,
      });
      return acc;
    },
    { positive: [], neutral: [], risk: [] }
  );

  const sentimentTotalCount = inferredToneTotals.positive + inferredToneTotals.neutral + inferredToneTotals.risk;
  const sentimentRows: Array<{
    key: InferredSignalTone;
    label: string;
    value: number;
    width: number;
    color: string;
  }> = [
    { key: 'positive', label: 'Positive read', value: inferredToneTotals.positive, width: sentimentTotalCount ? (inferredToneTotals.positive / sentimentTotalCount) * 100 : 0, color: 'bg-[#2DD4A7]' },
    { key: 'neutral', label: 'Neutral read', value: inferredToneTotals.neutral, width: sentimentTotalCount ? (inferredToneTotals.neutral / sentimentTotalCount) * 100 : 0, color: 'bg-[#8B8F99]' },
    { key: 'risk', label: 'Risk read', value: inferredToneTotals.risk, width: sentimentTotalCount ? (inferredToneTotals.risk / sentimentTotalCount) * 100 : 0, color: 'bg-[#F0453A]' },
  ];
  const fieldNotes = buildSummaryNotes({
    scope,
    latest,
    scopeItems,
    totalSignals,
    sourceCounts,
    categoryCounts,
    sentimentTotals,
    inferredToneTotals,
    competitiveSignalCount: scopeItems.filter(item => item.category === 'competitive').length,
    demoDriveSignalCount: scopeItems.filter(isDemoDriveFeedback).length,
  });

  const topSignals = scopeItems.slice(0, 10);
  const activeCompetitors = COMPETITORS.map(competitor => ({
    competitor,
    count: competitorIntelMap[competitor.id]?.items.length ?? 0,
    threat: competitorIntelMap[competitor.id]?.threatLevel ?? competitor.defaultThreat,
    latestItem: competitorIntelMap[competitor.id]?.items[0] ?? null,
    items: competitorIntelMap[competitor.id]?.items ?? [],
  })).sort((a, b) => b.count - a.count);

  const datedSignals = scopeItems.filter(item => item.publishedAt);
  const competitiveSignals = scopeItems.filter(item => item.category === 'competitive');
  const demoDriveSignals = scopeItems.filter(isDemoDriveFeedback);

  const socialSources = ['twitter', 'youtube', 'hackernews', 'rivianforums', 'bluesky', 'reddit_rivian', 'reddit_rivian_r2', 'reddit_ev', 'reddit_sdc', 'reddit_stocks'];
  const pressNewsSignals = scopeItems.filter(item => {
    if (socialSources.includes(item.source)) return false;
    if (item.source.startsWith('reddit_')) return false;
    return true;
  });

  const dynamicsTopics = DYNAMICS_TOPICS.map(topic => {
    const matched = scopeItems.filter(item => {
      const text = dynamicsText(item);
      return topic.terms.some(term => text.includes(term));
    });
    const sent = { positive: 0, neutral: 0, negative: 0 };
    for (const it of matched) sent[it.sentiment] = (sent[it.sentiment] ?? 0) + 1;
    return { ...topic, count: matched.length, items: matched, ...sent };
  })
    .filter(topic => topic.count > 0)
    .sort((a, b) => b.count - a.count);

  const dynamicsTotal = new Set(dynamicsTopics.flatMap(t => t.items.map(i => i.url))).size;
  const topDynamics = dynamicsTopics[0];
  const mostNegDynamics = [...dynamicsTopics]
    .filter(t => t.count >= 2)
    .sort((a, b) => (b.negative / b.count) - (a.negative / a.count))[0];
  const dynamicsTakeaway = topDynamics
    ? `Owners and press are talking most about ${topDynamics.label.toLowerCase()} (${topDynamics.count} signal${topDynamics.count !== 1 ? 's' : ''}, ${Math.round((topDynamics.positive / topDynamics.count) * 100)}% positive).` +
      (mostNegDynamics && mostNegDynamics.negative > 0 && mostNegDynamics.key !== topDynamics.key
        ? ` ${mostNegDynamics.label} draws the most criticism (${Math.round((mostNegDynamics.negative / mostNegDynamics.count) * 100)}% negative).`
        : '')
    : '';
  const issueItems: DrillDownItem[] = autonomyIssues.map(issue => ({
    title: issue.title,
    url: issue.url,
    source: issue.source,
    sentiment: issue.sentiment ?? 'negative',
    snippet: issue.snippet,
    publishedAt: issue.publishedAt ?? null,
    reportTimestamp: issue.reportTimestamp,
  }));
  const failedScanItems: DrillDownItem[] = failedScans.map(report => ({
    title: `Scan failed · ${formatTimestamp(report.timestamp)}`,
    source: 'system',
    sentiment: 'negative',
    snippet: report.scanError ?? 'Unknown scan error',
    reportTimestamp: report.timestamp,
  }));

  const headerStats: Array<{
    label: string;
    value: React.ReactNode;
    items: DrillDownItem[];
    drillTitle: string;
    drillLabel: string;
    drillDescription: string;
    footerSuffix?: string;
  }> = [
    { label: 'Signals', value: totalSignals, items: scopeItems, drillTitle: 'All signals', drillLabel: 'Signal Drilldown', drillDescription: 'Every deduped signal in the current scope, newest first.', footerSuffix: 'in scope' },
    { label: 'Dated by publish', value: `${datedShare}%`, items: datedSignals, drillTitle: 'Signals with a publish date', drillLabel: 'Signal Drilldown', drillDescription: 'Signals carrying an original publish date, newest first.', footerSuffix: 'dated' },
    { label: 'Sources', value: sourceCounts.length, items: scopeItems, drillTitle: 'Signals across all sources', drillLabel: 'Source Drilldown', drillDescription: `${sourceCounts.length} active sources contributing signals in scope.`, footerSuffix: 'in scope' },
    { label: 'Demo drives', value: demoDriveSignals.length, items: demoDriveSignals, drillTitle: 'Demo & test drive feedback', drillLabel: 'Feedback Drilldown', drillDescription: 'Hands-on R2 demo, test-drive, first-drive, and ride-along impressions in the current scope.', footerSuffix: 'feedback items' },
    { label: 'Competitive', value: competitiveSignals.length, items: competitiveSignals, drillTitle: 'Competitive signals', drillLabel: 'Competitive Drilldown', drillDescription: 'Signals tagged competitive intel in the current scope.', footerSuffix: 'competitive' },
    { label: 'Failed scans', value: failedScans.length, items: failedScanItems, drillTitle: 'Failed scans', drillLabel: 'Scan Errors', drillDescription: 'Scan cycles that returned an error.', footerSuffix: 'failed' },
    { label: 'Issues tracked', value: autonomyIssues.length, items: issueItems, drillTitle: 'Autonomy & software issues', drillLabel: 'Issue Drilldown', drillDescription: 'Recent autonomy and software risk signals.', footerSuffix: 'tracked' },
  ];

  if (!latest) {
    return (
      <main className="min-h-screen bg-claude-bg px-4 py-12 sm:px-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-claude-border bg-claude-card px-8 py-20 text-center shadow-sm">
          <div className="font-mono-num text-[13px] tracking-wide text-claude-accent uppercase font-medium">GameFilm</div>
          <h1 className="mt-4 font-serif text-4xl text-claude-text">No scans available yet.</h1>
          <p className="mx-auto mt-4 max-w-lg text-lg leading-relaxed text-claude-muted">
            Once the first GameFilm report lands, the dashboard will populate with source, competitor, and signal summaries.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-3 py-5 sm:px-6 sm:py-7">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="edge-top-red grain relative overflow-hidden rounded-xl border border-claude-border bg-gradient-to-b from-[#16161C] to-[#0C0C10] shadow-cinematic">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-marvel-red/15 blur-3xl" />
          <div className="relative flex flex-col gap-4 px-5 py-5 sm:px-7 sm:py-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="marvel-chip rounded-[3px] px-2 py-1 text-[12px] leading-none">GAMEFILM</span>
                <span className="font-mono-num text-[10px] uppercase tracking-[0.28em] text-claude-muted">Rivian Intelligence Unit</span>
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${threatStyle.tone}`}>
                  {threatStyle.label}
                </span>
              </div>
              <h1 className="poster-mark mt-3 text-5xl text-claude-text sm:text-6xl">
                RIVIAN <span className="text-marvel-red">INTEL</span>
              </h1>
              <div className="mt-2 font-mono-num text-[11px] uppercase tracking-[0.16em] text-claude-muted">
                Last scan · {lastUpdated}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/40 p-1">
                <ScopeTab active={scope === 'latest'} href="?scope=latest" label="Latest" />
                <ScopeTab active={scope === '7d'} href="?scope=7d" label="7 days" />
                <ScopeTab active={scope === 'all'} href="?scope=all" label="Archive" />
              </div>
              <a
                href="/newsletter"
                className="rounded-md border border-marvel-red/40 bg-marvel-red/10 px-3 py-1.5 text-[13px] font-medium text-[#FF6B61] transition-colors hover:bg-marvel-red/20"
              >
                Weekly
              </a>
              <SearchButton />
              <ChatButton />
            </div>
          </div>

          <div className="relative grid grid-cols-2 gap-px border-t border-white/[0.06] bg-white/[0.05] sm:grid-cols-3 xl:grid-cols-6">
            {headerStats.map(stat => {
              const body = (
                <>
                  <div className="flex items-center justify-between font-mono-num text-[10px] uppercase tracking-[0.16em] text-claude-muted">
                    <span>{stat.label}</span>
                    {stat.items.length > 0 && <span className="text-claude-muted/40 group-hover:text-marvel-red transition-colors">↗</span>}
                  </div>
                  <div className="mt-1 font-mono-num text-3xl font-semibold tabular-nums text-claude-text">{stat.value}</div>
                </>
              );
              if (stat.items.length === 0) {
                return (
                  <div key={stat.label} className="bg-[#0C0C10] px-4 py-3.5">{body}</div>
                );
              }
              return (
                <DrillDown
                  key={stat.label}
                  title={stat.drillTitle}
                  items={stat.items}
                  label={stat.drillLabel}
                  description={stat.drillDescription}
                  footerSuffix={stat.footerSuffix}
                  className="group block w-full bg-[#0C0C10] px-4 py-3.5 text-left transition-colors hover:bg-[#13131A]"
                >
                  {body}
                </DrillDown>
              );
            })}
          </div>
        </header>

        <Card
          title="Sentiment trend by publish date"
          meta={`${publishTrend.length} days · ${publishTrend.reduce((s, d) => s + d.total, 0)} dated signals`}
        >
          <PublishSentimentTrend data={publishTrend} />
        </Card>

        <div className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
          <Card title="Analysis Summary" meta={`${sentimentTotalCount} items in scope`}>
            <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
              <div className="space-y-4">
                {fieldNotes.map((note, i) => (
                  <p key={i} className="text-base leading-relaxed text-claude-text/90">
                    {note}
                  </p>
                ))}
              </div>

              <SummarySentimentBars rows={sentimentRows} itemsByTone={inferredToneItems} />
            </div>
          </Card>

          <Card title="Dominant themes" meta={`${themeCounts.length} active`}>
            {themeCounts.length > 0 ? (
              <div className="flex flex-wrap gap-2.5">
                {themeCounts.map(theme => (
                  <DrillDown
                    key={theme.theme}
                    title={theme.theme}
                    items={scopeItems.filter(item => (item.themes ?? []).includes(theme.theme))}
                    footerSuffix="in this theme"
                    className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-left transition-colors hover:border-marvel-red/40"
                  >
                    <div className="text-[13px] font-medium text-claude-text">{theme.theme}</div>
                    <div className="mt-0.5 font-mono-num text-[11px] text-claude-muted">{theme.count} mentions</div>
                  </DrillDown>
                ))}
              </div>
            ) : (
              <div className="text-base leading-relaxed text-claude-muted">
                Themes have not been tagged for the current scope yet.
              </div>
            )}
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <Card title="Sources" meta={`${sourceCounts.length} active`}>
            <div className="space-y-4">
              {sourceCounts.map(source => (
                <DrillDown
                  key={source.key}
                  title={source.label}
                  items={scopeItems.filter(item => item.source === source.key)}
                  label="Source Drilldown"
                  description={`Signals from ${source.label} in the current scope, newest first.`}
                  footerSuffix={`from ${source.label}`}
                  className="group block w-full text-left"
                >
                  <div className="mb-2 flex items-center justify-between text-[14px] text-claude-text/90">
                    <span className="transition-colors group-hover:text-marvel-red">{source.label}</span>
                    <span className="font-mono-num text-[13px] text-claude-muted">{source.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-claude-border/40">
                    <div
                      className="h-1.5 rounded-full bg-claude-accent transition-all group-hover:bg-marvel-red"
                      style={{ width: `${(source.count / Math.max(sourceCounts[0]?.count ?? 1, 1)) * 100}%` }}
                    />
                  </div>
                </DrillDown>
              ))}
            </div>
          </Card>

                    <Card title="Breaking Press News" meta={`${pressNewsSignals.length} in scope`}>
            {pressNewsSignals.length > 0 ? (
              <div className="space-y-2.5">
                {pressNewsSignals.slice(0, 10).map((item, idx) => (
                  <a
                    key={`${item.url}-${idx}`}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-lg border border-white/[0.07] bg-white/[0.02] p-3.5 transition-all hover:border-marvel-red/30 hover:bg-white/[0.04]"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${sentimentTone(item.sentiment)}`}>{item.sentiment}</span>
                      <span className="font-mono-num text-[11px] text-claude-muted">{item.source}</span>
                      {item.publishedAt && (
                        <span className="font-mono-num text-[11px] text-claude-muted/50">
                          {new Date(item.publishedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="text-[14px] font-medium leading-snug text-claude-text group-hover:text-marvel-red">
                      {item.title}
                    </div>
                    {item.snippet && (
                      <div className="mt-2 text-[13px] leading-relaxed text-claude-muted line-clamp-2">
                        {item.snippet}
                      </div>
                    )}
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-[14px] text-claude-muted">No press news found in the current scope.</div>
            )}
          </Card>

          <Card title="Demo & test drive feedback" meta={`${demoDriveSignals.length} in scope`}>
            {demoDriveSignals.length > 0 ? (
              <div className="space-y-2.5">
                {demoDriveSignals.slice(0, 8).map(item => (
                  <div
                    key={item.url}
                    className="block rounded-lg border border-white/[0.07] bg-white/[0.02] p-3.5 transition-all hover:border-marvel-red/30 hover:bg-white/[0.04]"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${sentimentTone(item.sentiment)}`}>{item.sentiment}</span>
                      <span className="font-mono-num text-[11px] uppercase tracking-[0.1em] text-claude-muted">{SOURCE_LABELS[item.source] ?? item.source}</span>
                      <span className="ml-auto font-mono-num text-[11px] text-claude-muted">{formatCompactDate(item.publishDate)}</span>
                    </div>
                    <a href={item.url} target="_blank" rel="noreferrer" className="group block">
                      <h3 className="text-[15px] font-semibold leading-snug text-claude-text transition-colors group-hover:text-marvel-red">
                        {item.title}
                      </h3>
                    </a>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-claude-text/70 line-clamp-2">{item.snippet}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-base leading-relaxed text-claude-muted">
                No demo or test-drive feedback is in scope yet. The next scan will tag R2 hands-on drive impressions here.
              </div>
            )}
          </Card>
        </div>

        <Card title="Vehicle dynamics" meta={`${dynamicsTotal} signal${dynamicsTotal !== 1 ? 's' : ''} · ${dynamicsTopics.length} topics`}>
          {dynamicsTopics.length > 0 ? (
            <>
              <div className="grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
                {dynamicsTopics.map(topic => (
                  <DrillDown
                    key={topic.key}
                    title={topic.label}
                    items={topic.items}
                    label="Vehicle Dynamics"
                    description={`Signals discussing ${topic.label.toLowerCase()} in the current scope, newest first.`}
                    footerSuffix={`· ${topic.label}`}
                    className="group block w-full text-left"
                  >
                    <div className="mb-1.5 flex items-center justify-between text-[14px] text-claude-text/90">
                      <span className="transition-colors group-hover:text-marvel-red">{topic.label}</span>
                      <span className="font-mono-num text-[13px] text-claude-muted">
                        {topic.count}
                        <span className="ml-1.5 text-[11px] text-claude-muted/60">{Math.round((topic.positive / topic.count) * 100)}%+</span>
                      </span>
                    </div>
                    <div className="flex h-1.5 overflow-hidden rounded-full bg-claude-border/30">
                      <div style={{ width: `${(topic.positive / topic.count) * 100}%`, background: '#2DD4A7' }} />
                      <div style={{ width: `${(topic.neutral / topic.count) * 100}%`, background: '#8B8F99' }} />
                      <div style={{ width: `${(topic.negative / topic.count) * 100}%`, background: '#F0453A' }} />
                    </div>
                  </DrillDown>
                ))}
              </div>
              {dynamicsTakeaway && (
                <p className="mt-5 border-t border-white/[0.06] pt-4 text-[14px] leading-relaxed text-claude-text/80">
                  {dynamicsTakeaway}
                </p>
              )}
            </>
          ) : (
            <div className="text-base leading-relaxed text-claude-muted">
              No vehicle-dynamics signals (ride, handling, suspension, braking, power, towing, off-road, range) are in scope yet.
            </div>
          )}
        </Card>

        <div className="grid gap-4 xl:grid-cols-[1fr]">
          <Card title="Recent signals" meta="by publish date">
            <div className="space-y-2.5">
              {topSignals.map(item => (
                <div
                  key={item.url}
                  className="block rounded-lg border border-white/[0.07] bg-white/[0.02] p-3.5 transition-all hover:border-marvel-red/30 hover:bg-white/[0.04]"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${sentimentTone(item.sentiment)}`}>{item.sentiment}</span>
                    <span className="font-mono-num text-[11px] uppercase tracking-[0.1em] text-claude-muted">{SOURCE_LABELS[item.source] ?? item.source}</span>
                    <span className="ml-auto flex items-center gap-1.5 font-mono-num text-[11px] text-claude-muted">
                      {!item.publishedAt && <span className="text-[9px] uppercase tracking-wide text-claude-muted/60">scan</span>}
                      {formatCompactDate(item.publishDate)}
                    </span>
                  </div>
                  <a href={item.url} target="_blank" rel="noreferrer" className="group block">
                    <h3 className="text-[15px] font-semibold leading-snug text-claude-text group-hover:text-marvel-red transition-colors">
                      {item.title}
                    </h3>
                  </a>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-claude-text/70 line-clamp-2">{item.snippet}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <Card title="Competitors" meta={`${activeCompetitors.length} tracked`}>
            <CompetitorsSection competitors={activeCompetitors} threatStyles={THREAT_STYLES} />
          </Card>

          <Card title="Autonomy & software risks" meta={`${autonomyIssues.length} recent`}>
            <div className="space-y-2.5">
              {autonomyIssues.map(issue => (
                <div
                  key={issue.url}
                  className="block rounded-lg border border-white/[0.07] bg-white/[0.02] p-3.5 transition-all hover:border-marvel-red/30 hover:bg-white/[0.04]"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2 font-mono-num text-[11px] uppercase tracking-[0.08em] text-claude-muted">
                    <span>{SOURCE_LABELS[issue.source] ?? issue.source}</span>
                    <span className="text-marvel-red/60">•</span>
                    <span className="text-[#FF6B61]">{issue.issueType}</span>
                    <span className="ml-auto normal-case tracking-normal">{formatCompactDate(getEffectiveDate(issue, issue.reportTimestamp).toISOString())}</span>
                  </div>
                  <a href={issue.url} target="_blank" rel="noreferrer" className="group block">
                    <h3 className="text-[15px] font-semibold leading-snug text-claude-text group-hover:text-marvel-red transition-colors">
                      {issue.title}
                    </h3>
                  </a>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-claude-text/70 line-clamp-2">{issue.snippet}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
