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
import MediaPreview from '@/components/MediaPreview';
import CompetitorsSection from '@/components/CompetitorsSection';
import PublishSentimentTrend from '@/components/PublishSentimentTrend';

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

export default function DashboardPage({ searchParams }: { searchParams: { scope?: string } }) {
  const scope = (searchParams.scope ?? 'latest') as 'latest' | '7d' | 'all';
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
  });

  const topSignals = scopeItems.slice(0, 10);
  const activeCompetitors = COMPETITORS.map(competitor => ({
    competitor,
    count: competitorIntelMap[competitor.id]?.items.length ?? 0,
    threat: competitorIntelMap[competitor.id]?.threatLevel ?? competitor.defaultThreat,
    latestItem: competitorIntelMap[competitor.id]?.items[0] ?? null,
    items: competitorIntelMap[competitor.id]?.items ?? [],
  })).sort((a, b) => b.count - a.count);

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
              <SearchButton />
              <ChatButton />
            </div>
          </div>

          <div className="relative grid grid-cols-2 gap-px border-t border-white/[0.06] bg-white/[0.05] sm:grid-cols-3 xl:grid-cols-6">
            {[
              { label: 'Signals', value: totalSignals },
              { label: 'Dated by publish', value: `${datedShare}%` },
              { label: 'Sources', value: sourceCounts.length },
              { label: 'Competitive', value: scopeItems.filter(item => item.category === 'competitive').length },
              { label: 'Failed scans', value: failedScans.length },
              { label: 'Issues tracked', value: autonomyIssues.length },
            ].map(stat => (
              <div key={stat.label} className="bg-[#0C0C10] px-4 py-3.5">
                <div className="font-mono-num text-[10px] uppercase tracking-[0.16em] text-claude-muted">{stat.label}</div>
                <div className="mt-1 font-mono-num text-3xl font-semibold tabular-nums text-claude-text">{stat.value}</div>
              </div>
            ))}
          </div>
        </header>

        <Card
          title="Sentiment trend by publish date"
          meta={`${publishTrend.length} days · ${publishTrend.reduce((s, d) => s + d.total, 0)} dated signals`}
        >
          <PublishSentimentTrend data={publishTrend} />
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 font-mono-num text-[10px] uppercase tracking-[0.16em] text-claude-muted">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#2DD4A7]" /> Positive</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#8B8F99]" /> Neutral</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#F0453A]" /> Negative</span>
            <span className="ml-auto normal-case tracking-normal text-claude-muted/70">Stacked by article publish day (PT), deduped by URL</span>
          </div>
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
                  <div key={theme.theme} className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 hover:border-marvel-red/40 transition-colors">
                    <div className="text-[13px] font-medium text-claude-text">{theme.theme}</div>
                    <div className="mt-0.5 font-mono-num text-[11px] text-claude-muted">{theme.count} mentions</div>
                  </div>
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
                <div key={source.key}>
                  <div className="mb-2 flex items-center justify-between text-[14px] text-claude-text/90">
                    <span>{source.label}</span>
                    <span className="font-mono-num text-[13px] text-claude-muted">{source.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-claude-border/40">
                    <div
                      className="h-1.5 rounded-full bg-claude-accent"
                      style={{ width: `${(source.count / Math.max(sourceCounts[0]?.count ?? 1, 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

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
                  <MediaPreview url={item.url} title={item.title} className="mt-3 border-white/10 bg-black/30 rounded-lg" />
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
                  <MediaPreview url={issue.url} title={issue.title} className="mt-3 border-white/10 bg-black/30 rounded-lg" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
