import ScreenSaver, { AmbientSignal } from '@/components/screensaver/ScreenSaver';
import {
  getOverallThreatLevel,
  getScopeReports,
  getSentimentByPublishDate,
} from '@/lib/data';
import { CATEGORY_LABELS, SOURCE_LABELS } from '@/lib/types';

export const dynamic = 'force-dynamic';

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Los_Angeles',
    timeZoneName: 'short',
  });
}

function cleanLabel(value: string) {
  return value.replace(/^[^\w]+/, '').trim();
}

function visualSourceScore(source: string) {
  const normalized = source.toLowerCase();
  if (normalized.includes('youtube')) return 5;
  if (normalized.includes('bluesky') || normalized.includes('twitter')) return 4;
  if (normalized.includes('news') || normalized.includes('cnbc') || normalized.includes('insideevs')) return 3;
  if (normalized.includes('rivianforums')) return 2;
  if (normalized.includes('reddit')) return 1;
  return 0;
}

function buildSignals(): AmbientSignal[] {
  const seen = new Set<string>();
  const signals = getScopeReports('7d').reports
    .flatMap(report =>
      (report.items ?? []).map(item => ({
        ...item,
        reportTimestamp: report.timestamp,
      }))
    )
    .filter(item => {
      const key = item.url || item.title;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const visualDelta = visualSourceScore(b.source) - visualSourceScore(a.source);
      if (visualDelta !== 0) return visualDelta;
      const aTime = new Date(a.publishedAt ?? a.reportTimestamp).getTime();
      const bTime = new Date(b.publishedAt ?? b.reportTimestamp).getTime();
      return bTime - aTime;
    })
    .slice(0, 18);

  return signals.map(item => ({
    title: item.title,
    snippet: item.snippet,
    url: item.url,
    source: SOURCE_LABELS[item.source] ?? item.source,
    category: item.category ? cleanLabel(CATEGORY_LABELS[item.category] ?? item.category) : 'Signal',
    sentiment: item.sentiment === 'positive' || item.sentiment === 'negative' ? item.sentiment : 'neutral',
    themes: (item.themes ?? []).slice(0, 3),
    publishedAt: item.publishedAt ?? item.reportTimestamp,
  }));
}

export default function ScreenCatcherPage() {
  const { reports } = getScopeReports('7d');
  const latest = reports[0] ?? null;
  const signals = buildSignals();
  const trend = getSentimentByPublishDate(7).map(point => ({
    label: point.label,
    positive: point.positive,
    neutral: point.neutral,
    negative: point.negative,
    total: point.total,
  }));

  const sourceCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  for (const report of reports) {
    for (const item of report.items ?? []) {
      sourceCounts.set(item.source, (sourceCounts.get(item.source) ?? 0) + 1);
      if (item.category) categoryCounts.set(item.category, (categoryCounts.get(item.category) ?? 0) + 1);
    }
  }

  return (
    <ScreenSaver
      generatedAt={latest ? formatTimestamp(latest.timestamp) : 'No recent scan'}
      threatLevel={getOverallThreatLevel()}
      summary={latest?.summary ?? 'GameFilm is waiting for a fresh signal scan.'}
      competitiveContext={latest?.competitiveContext ?? ''}
      signals={signals}
      trend={trend}
      sourceLeaders={Array.from(sourceCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([source, count]) => ({ label: SOURCE_LABELS[source] ?? source, count }))}
      categoryLeaders={Array.from(categoryCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([category, count]) => ({
          label: cleanLabel(CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] ?? category),
          count,
        }))}
    />
  );
}
