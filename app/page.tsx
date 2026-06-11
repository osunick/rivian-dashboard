import {
  reports as allReports,
  getCompetitorIntelMap,
  getLatestReport,
  getOverallThreatLevel,
  getRivianAutonomyIssues,
  getScopeReports,
} from '@/lib/data';
import { CATEGORY_KEYS, CATEGORY_LABELS, COMPETITORS, SOURCE_KEYS, SOURCE_LABELS, SentimentLabel } from '@/lib/types';
import SearchButton from '@/components/SearchButton';
import ChatButton from '@/components/ChatButton';
import SummarySentimentBars from '@/components/SummarySentimentBars';
import MediaPreview from '@/components/MediaPreview';
import CompetitorsSection from '@/components/CompetitorsSection';

export const dynamic = 'force-dynamic';

const THREAT_STYLES = {
  high: { label: 'Critical', tone: 'bg-red-50 text-red-800 border-red-200/50' },
  elevated: { label: 'Elevated', tone: 'bg-orange-50 text-orange-800 border-orange-200/50' },
  medium: { label: 'Monitoring', tone: 'bg-blue-50 text-blue-800 border-blue-200/50' },
  low: { label: 'Clear', tone: 'bg-[#F2F5F3] text-[#40806A] border-[#DCE4E0]' },
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
  const items: Array<(typeof reports)[number]['items'][number] & { reportTimestamp: string }> = [];
  for (const report of reports) {
    for (const item of report.items ?? []) {
      const key = item.url || `${report.id}-${item.title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ ...item, reportTimestamp: report.timestamp });
    }
  }
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
  if (sentiment === 'positive') return 'bg-[#F2F5F3] text-[#40806A]';
  if (sentiment === 'negative') return 'bg-[#FAF0E6] text-[#C4554D]';
  return 'bg-[#F5F4F0] text-claude-text';
}

function ScopeTab({ active, href, label }: { active: boolean; href: string; label: string }) {
  return (
    <a
      href={href}
      className={`rounded-lg px-3 py-1.5 text-sm transition-all font-medium ${
        active 
          ? 'bg-claude-accent text-white shadow-sm' 
          : 'bg-transparent text-claude-muted hover:text-claude-text hover:bg-[#F5F4F0]'
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
    <section className={`rounded-2xl border border-claude-border bg-claude-card shadow-[0_2px_8px_rgba(0,0,0,0.02)] ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-claude-border/50 px-6 py-5">
        <h2 className="font-serif text-lg text-claude-text">{title}</h2>
        {meta ? <div className="font-mono-num text-[12px] text-claude-muted">{meta}</div> : null}
      </div>
      <div className="px-6 py-5">{children}</div>
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
    { key: 'positive', label: 'Positive read', value: inferredToneTotals.positive, width: sentimentTotalCount ? (inferredToneTotals.positive / sentimentTotalCount) * 100 : 0, color: 'bg-[#40806A]' },
    { key: 'neutral', label: 'Neutral read', value: inferredToneTotals.neutral, width: sentimentTotalCount ? (inferredToneTotals.neutral / sentimentTotalCount) * 100 : 0, color: 'bg-claude-border' },
    { key: 'risk', label: 'Risk read', value: inferredToneTotals.risk, width: sentimentTotalCount ? (inferredToneTotals.risk / sentimentTotalCount) * 100 : 0, color: 'bg-[#C4554D]' },
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
    <main className="min-h-screen bg-claude-bg px-4 py-8 sm:px-8 sm:py-10 selection:bg-claude-accent/20">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl border border-claude-border bg-claude-card shadow-sm">
          <div className="flex flex-col gap-6 border-b border-claude-border/50 px-8 py-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-[13px] font-medium tracking-wide text-claude-accent uppercase">GameFilm</div>
                <div className={`rounded-full border px-2.5 py-0.5 text-[12px] font-medium ${threatStyle.tone}`}>
                  {threatStyle.label}
                </div>
              </div>
              <h1 className="mt-3 font-serif text-4xl text-claude-text sm:text-5xl">
                Rivian intelligence
              </h1>
              <div className="mt-3 text-base text-claude-muted">
                Last updated {lastUpdated}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 rounded-xl bg-[#F5F4F0] p-1 border border-claude-border/50">
                <ScopeTab active={scope === 'latest'} href="?scope=latest" label="Latest" />
                <ScopeTab active={scope === '7d'} href="?scope=7d" label="7 days" />
                <ScopeTab active={scope === 'all'} href="?scope=all" label="Archive" />
              </div>
              <SearchButton />
              <ChatButton />
            </div>
          </div>

          <div className="grid gap-0 sm:grid-cols-2 xl:grid-cols-5 bg-[#FDFCFB] rounded-b-2xl">
            {[
              { label: 'Signals analyzed', value: totalSignals },
              { label: 'Sources', value: sourceCounts.length },
              { label: 'Competitive items', value: scopeItems.filter(item => item.category === 'competitive').length },
              { label: 'Failed scans', value: failedScans.length },
              { label: 'Issues tracked', value: autonomyIssues.length },
            ].map(stat => (
              <div key={stat.label} className="border-t border-claude-border/50 px-8 py-6 xl:border-l xl:first:border-l-0">
                <div className="text-[13px] font-medium text-claude-muted">{stat.label}</div>
                <div className="mt-2 font-serif text-4xl text-claude-text">{stat.value}</div>
              </div>
            ))}
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
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
                  <div key={theme.theme} className="rounded-xl border border-claude-border/60 bg-[#FDFCFB] px-3.5 py-2 hover:border-claude-border transition-colors">
                    <div className="text-sm font-medium text-claude-text">{theme.theme}</div>
                    <div className="mt-0.5 text-[13px] text-claude-muted">{theme.count} mentions</div>
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

        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
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

          <Card title="Recent signals" meta={`${topSignals.length} newest`}>
            <div className="space-y-4">
              {topSignals.map(item => (
                <div
                  key={item.url}
                  className="block rounded-xl border border-claude-border/60 bg-[#FDFCFB] p-5 transition-all hover:border-claude-border hover:shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2.5 mb-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${sentimentTone(item.sentiment)}`}>{item.sentiment}</span>
                    <span className="text-[13px] font-medium text-claude-muted">{SOURCE_LABELS[item.source] ?? item.source}</span>
                    <span className="ml-auto text-[13px] text-claude-muted">{formatCompactDate(item.reportTimestamp)}</span>
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group block"
                  >
                    <h3 className="font-serif text-[18px] leading-snug text-claude-text group-hover:text-claude-accent transition-colors">
                      {item.title}
                    </h3>
                  </a>
                  <p className="mt-2 text-[15px] leading-relaxed text-claude-text/80 line-clamp-2">{item.snippet}</p>
                  <MediaPreview url={item.url} title={item.title} className="mt-4 border-claude-border/50 bg-white rounded-lg" />
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <Card title="Competitors" meta={`${activeCompetitors.length} tracked`}>
            <CompetitorsSection competitors={activeCompetitors} threatStyles={THREAT_STYLES} />
          </Card>

          <Card title="Autonomy & software risks" meta={`${autonomyIssues.length} recent`}>
            <div className="space-y-4">
              {autonomyIssues.map(issue => (
                <div
                  key={issue.url}
                  className="block rounded-xl border border-claude-border/60 bg-[#FDFCFB] p-5 transition-all hover:border-claude-border hover:shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2.5 mb-3 text-[13px] text-claude-muted">
                    <span className="font-medium">{SOURCE_LABELS[issue.source] ?? issue.source}</span>
                    <span className="text-claude-border">•</span>
                    <span className="font-medium text-claude-text/70">{issue.issueType}</span>
                    <span className="text-claude-border">•</span>
                    <span>{formatCompactDate(issue.reportTimestamp)}</span>
                  </div>
                  <a
                    href={issue.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group block"
                  >
                    <h3 className="font-serif text-[18px] leading-snug text-claude-text group-hover:text-claude-accent transition-colors">
                      {issue.title}
                    </h3>
                  </a>
                  <p className="mt-2 text-[15px] leading-relaxed text-claude-text/80 line-clamp-2">{issue.snippet}</p>
                  <MediaPreview url={issue.url} title={issue.title} className="mt-4 border-claude-border/50 bg-white rounded-lg" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
