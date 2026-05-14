import { Report, SourceKey } from './types';
import reportsRaw from '../public/data/reports.json';

// Cast and sort newest first
export const reports: Report[] = (reportsRaw as Report[]).sort(
  (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
);

// Valid reports = no scan errors and at least some data found
export const validReports: Report[] = reports.filter(
  r => !r.scanError && (r.sentiment.positive + r.sentiment.neutral + r.sentiment.negative) > 0
);

export function getLatestReport(): Report | null {
  return validReports[0] ?? null;
}

export function getLast10Reports(): Report[] {
  return validReports.slice(0, 10).reverse(); // oldest→newest for charts
}

export function getSevenDayAvgScore(): number {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = validReports.filter(r => new Date(r.timestamp).getTime() >= cutoff);
  if (recent.length === 0) return 50;
  const scores = recent.map(r => {
    const total = r.sentiment.positive + r.sentiment.neutral + r.sentiment.negative;
    if (total === 0) return 50;
    return ((r.sentiment.positive * 1 + r.sentiment.neutral * 0 + r.sentiment.negative * -1) / total) * 50 + 50;
  });
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function getThemeFrequency(): { theme: string; count: number }[] {
  const freq: Record<string, number> = {};
  for (const r of reports) {
    for (const t of r.themes) {
      freq[t] = (freq[t] || 0) + 1;
    }
  }
  return Object.entries(freq)
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}

export function getSentimentDelta(field: 'positive' | 'negative'): number {
  if (validReports.length < 2) return 0;
  return validReports[0].sentiment[field] - validReports[1].sentiment[field];
}

export function getTotalPostsLatest(): number {
  const r = getLatestReport();
  if (!r) return 0;
  return Object.values(r.sources).reduce((sum, s) => sum + s.found, 0);
}

export function getActiveSourcesLatest(): number {
  const r = getLatestReport();
  if (!r) return 0;
  return Object.values(r.sources).filter(s => s.found > 0).length;
}

export function getLast5ReportsNewestFirst(): Report[] {
  return validReports.slice(0, 5);
}
