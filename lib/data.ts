import { Report, SourceKey, CategoryKey, CATEGORY_KEYS, CompetitorProfile, COMPETITORS, ThreatLevel } from './types';
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

/** Returns all items from reports that include a given theme, deduplicated by URL. */
export function getItemsByTheme(theme: string): (Report['items'][number] & { reportTimestamp: string })[] {
  const seen = new Set<string>();
  const result: (Report['items'][number] & { reportTimestamp: string })[] = [];
  for (const r of reports) {
    if (r.themes.includes(theme)) {
      for (const item of r.items) {
        if (!seen.has(item.url)) {
          seen.add(item.url);
          result.push({ ...item, reportTimestamp: r.timestamp });
        }
      }
    }
  }
  return result;
}

/** Pre-computed map of theme → source items, for passing to client components. */
export function getThemeItemsMap(): Record<string, (Report['items'][number] & { reportTimestamp: string })[]> {
  const map: Record<string, (Report['items'][number] & { reportTimestamp: string })[]> = {};
  for (const { theme } of getThemeFrequency()) {
    map[theme] = getItemsByTheme(theme);
  }
  return map;
}

/** Aggregated category breakdown across recent valid reports. */
export function getCategoryBreakdown(): { key: CategoryKey; label: string; found: number; sentiment: string | null }[] {
  const LABELS: Record<CategoryKey, string> = {
    autonomy:    '🤖 Autonomy',
    vehicles:    '🚗 Vehicles & Products',
    business:    '💰 Business & Finance',
    software:    '📱 Software & Tech',
    community:   '🌐 Community',
    competitive: '⚔️ Competitive Intel',
  };
  // Count items by category across all reports
  const counts: Record<CategoryKey, number> = { autonomy: 0, vehicles: 0, business: 0, software: 0, community: 0, competitive: 0 };
  for (const r of validReports) {
    for (const item of r.items) {
      if (item.category && item.category in counts) {
        counts[item.category as CategoryKey]++;
      }
    }
  }
  return CATEGORY_KEYS
    .map(key => ({ key, label: LABELS[key], found: counts[key], sentiment: null }))
    .filter(c => c.found > 0)
    .sort((a, b) => b.found - a.found);
}

/** Items grouped by category, deduplicated by URL. */
export function getCategoryItemsMap(): Record<CategoryKey, (Report['items'][number] & { reportTimestamp: string })[]> {
  const map = {} as Record<CategoryKey, (Report['items'][number] & { reportTimestamp: string })[]>;
  const seen: Record<string, Set<string>> = {};
  for (const key of CATEGORY_KEYS) {
    map[key] = [];
    seen[key] = new Set();
  }
  for (const r of validReports) {
    for (const item of r.items) {
      const cat = item.category as CategoryKey;
      if (cat && CATEGORY_KEYS.includes(cat) && !seen[cat].has(item.url)) {
        seen[cat].add(item.url);
        map[cat].push({ ...item, reportTimestamp: r.timestamp });
      }
    }
  }
  return map;
}

// ─── Competitive Intelligence ─────────────────────────────────────────────────

type ReportItemWithTimestamp = Report['items'][number] & { reportTimestamp: string };

/** All items tagged as competitive, across all valid reports, deduplicated by URL. */
export function getCompetitiveItems(): ReportItemWithTimestamp[] {
  const seen = new Set<string>();
  const result: ReportItemWithTimestamp[] = [];
  for (const r of validReports) {
    for (const item of r.items) {
      if (item.category === 'competitive' && !seen.has(item.url)) {
        seen.add(item.url);
        result.push({ ...item, reportTimestamp: r.timestamp });
      }
    }
  }
  return result;
}

/** Items mentioning a specific competitor, matched by keyword list. */
export function getItemsByCompetitor(keywords: string[]): ReportItemWithTimestamp[] {
  const seen = new Set<string>();
  const result: ReportItemWithTimestamp[] = [];
  const lower = keywords.map(k => k.toLowerCase());
  for (const r of validReports) {
    for (const item of r.items) {
      const text = `${item.title} ${item.snippet}`.toLowerCase();
      if (lower.some(kw => text.includes(kw)) && !seen.has(item.url)) {
        seen.add(item.url);
        result.push({ ...item, reportTimestamp: r.timestamp });
      }
    }
  }
  return result;
}

/** Derive competitive threat level for a competitor based on mention recency + volume. */
export function getCompetitorThreatLevel(
  competitor: CompetitorProfile,
  items: ReportItemWithTimestamp[]
): ThreatLevel {
  if (items.length === 0) return competitor.defaultThreat;
  const now = Date.now();
  const recent48h = items.filter(i => now - new Date(i.reportTimestamp).getTime() < 48 * 3600 * 1000);
  if (recent48h.length >= 3) return 'high';
  if (recent48h.length >= 1 || items.length >= 3) return 'elevated';
  if (items.length >= 1) return competitor.defaultThreat;
  return 'low';
}

/** Pre-computed competitor intel for all COMPETITORS, for server component passing to client. */
export function getCompetitorIntelMap(): Record<string, {
  items: ReportItemWithTimestamp[];
  threatLevel: ThreatLevel;
}> {
  const map: Record<string, { items: ReportItemWithTimestamp[]; threatLevel: ThreatLevel }> = {};
  for (const competitor of COMPETITORS) {
    const items = getItemsByCompetitor(competitor.keywords);
    map[competitor.id] = {
      items,
      threatLevel: getCompetitorThreatLevel(competitor, items),
    };
  }
  return map;
}

/** Total count of competitive items in latest report. */
export function getCompetitiveItemCountLatest(): number {
  const r = getLatestReport();
  if (!r) return 0;
  return r.items.filter(i => i.category === 'competitive').length;
}

/** Overall competitive heat level derived from threat levels across all competitors. */
export function getOverallThreatLevel(): ThreatLevel {
  const intel = getCompetitorIntelMap();
  const levels: ThreatLevel[] = Object.values(intel).map(v => v.threatLevel);
  if (levels.includes('high')) return 'high';
  if (levels.includes('elevated')) return 'elevated';
  if (levels.includes('medium')) return 'medium';
  return 'low';
}
