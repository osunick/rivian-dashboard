import { Report, SourceKey, CategoryKey, CATEGORY_KEYS, SOURCE_KEYS, SOURCE_LABELS, CompetitorProfile, COMPETITORS, ThreatLevel } from './types';
import reportsRaw from '../public/data/reports.json';

// Cast and sort newest first
// Force redeploy to fix auth redirect
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
    for (const item of r.items ?? []) {
      for (const t of (item.themes ?? [])) {
        freq[t] = (freq[t] || 0) + 1;
      }
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

/** Returns all items tagged with a given theme, deduplicated by URL. */
export function getItemsByTheme(theme: string): (Report['items'][number] & { reportTimestamp: string })[] {
  const seen = new Set<string>();
  const result: (Report['items'][number] & { reportTimestamp: string })[] = [];
  for (const r of reports) {
    for (const item of r.items ?? []) {
      if ((item.themes ?? []).includes(theme) && !seen.has(item.url)) {
        seen.add(item.url);
        result.push({ ...item, reportTimestamp: r.timestamp });
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
    demo_drives: '🧪 Demo & Test Drives',
    vehicles:    '🚗 Vehicles & Products',
    business:    '💰 Business & Finance',
    software:    '📱 Software & Tech',
    community:   '🌐 Community',
    competitive: '⚔️ Competitive Intel',
  };
  // Count items by category across all reports, deduplicated by URL per category
  const counts: Record<CategoryKey, number> = {
    autonomy: 0,
    demo_drives: 0,
    vehicles: 0,
    business: 0,
    software: 0,
    community: 0,
    competitive: 0,
  };
  const seen: Record<CategoryKey, Set<string>> = {
    autonomy: new Set(),
    demo_drives: new Set(),
    vehicles: new Set(),
    business: new Set(),
    software: new Set(),
    community: new Set(),
    competitive: new Set(),
  };
  for (const r of validReports) {
    for (const item of r.items ?? []) {
      const cat = item.category as CategoryKey;
      if (cat && cat in counts && !seen[cat].has(item.url)) {
        seen[cat].add(item.url);
        counts[cat]++;
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
    for (const item of r.items ?? []) {
      const cat = item.category as CategoryKey;
      if (cat && CATEGORY_KEYS.includes(cat) && !seen[cat].has(item.url)) {
        seen[cat].add(item.url);
        map[cat].push({ ...item, reportTimestamp: r.timestamp });
      }
    }
  }
  return map;
}

// ─── Rivian Autonomy Issues ─────────────────────────────────────────────────────

// Keywords that indicate a Rivian-internal autonomy/software issue
const AUTONOMY_ISSUE_KEYWORDS = [
  'autonomy unavailable', 'driver assist unavailable', 'driver plus unavailable',
  'highway assist not available', 'highway assist unavailable', 'autonomy won\'t reengage',
  'autonomy disabled', 'autonomy reengage', 'autonomy system disabled',
  'adaptive cruise control unavailable', 'acc unavailable', 'acc disabled',
  'lane assist disabled', 'lane keeping disabled', 'blind spot disabled',
  'autopilot disabled', 'hands free disabled', 'uhf fault', 'uhf fault',
  'autonomy+ disabled', 'autonomy+ fault', 'driver+ disabled', 'driver+ fault',
  'autonomy plus disabled', 'autonomy plus fault',
  'OTA update', 'ota update', 'software update', 'software regression',
  'update broke', 'update killed', 'software bug', 'software glitch',
  'infotainment cutout', 'infotainment bug', 'screen cutout', 'screen frozen',
  'voice assistant fail', 'voice recognition fail', 'hey rivian fail',
  'hey rivian wrong', 'hey rivian broken', 'rivian assistant fail',
  'comma stuck', 'comma disabled', 'comma fault', 'comma failed',
  'autonomy stuck in park', 'vehicle stuck in park', 'cant engage autonomy',
  'autonomy engagement failed', 'autonomy intermittent',
];

const ISSUE_SNIPPET_KEYWORDS = [
  'unavailable until serviced', 'unavailable until your next drive',
  'fault state', 'requires service', 'recurring issue', 'software stability',
  'disabled after', 'killed driver assist', 'update killed', 'broke driver assist',
  'regression', 'software regression', 'stuck in park', 'cant engage',
];

function isAutonomyIssue(item: { title: string; snippet?: string }): boolean {
  const text = `${item.title} ${item.snippet}`.toLowerCase();
  // Must contain at least one issue keyword in title
  const titleHit = AUTONOMY_ISSUE_KEYWORDS.some(kw => item.title.toLowerCase().includes(kw));
  // And/or snippet strongly suggests issue (secondary check)
  const snippetHit = ISSUE_SNIPPET_KEYWORDS.some(kw => (item.snippet ?? '').toLowerCase().includes(kw));
  return titleHit || snippetHit;
}

export interface RivianAutonomyIssue {
  title: string;
  url: string;
  source: string;
  sentiment: string;
  snippet: string;
  category?: string;
  publishedAt?: string | null;
  reportTimestamp: string;
  issueType: 'engagement' | 'software' | 'hardware' | 'feature-regression' | 'voice-ai' | 'third-party';
}

function classifyIssue(item: { title: string; snippet?: string }): RivianAutonomyIssue['issueType'] {
  const text = `${item.title} ${item.snippet}`.toLowerCase();
  if (text.includes('stuck in park') || text.includes('comma stuck') || text.includes('cant engage') ||
      text.includes('disabled') || text.includes('unavailable') || text.includes('won\'t reengage') ||
      text.includes('reengage')) return 'engagement';
  if (text.includes('ota') || text.includes('update') || text.includes('software regression') ||
      text.includes('update broke') || text.includes('update killed') || text.includes('software bug')) return 'software';
  if (text.includes('comma') || text.includes('third party') || text.includes('harness')) return 'third-party';
  if (text.includes('hey rivian') || text.includes('voice') || text.includes('assistant fail') ||
      text.includes('music') || text.includes('recognition')) return 'voice-ai';
  if (text.includes('hardware') || text.includes('gen 3') || text.includes('camera') ||
      text.includes('sensor')) return 'hardware';
  return 'feature-regression';
}

/** All items across all categories that describe Rivian autonomy/ADAS/software issues.
 *  Deduplicated by URL, sorted newest-first. */
export function getRivianAutonomyIssues(): RivianAutonomyIssue[] {
  const seen = new Set<string>();
  const result: RivianAutonomyIssue[] = [];
  for (const r of validReports) {
    for (const item of r.items ?? []) {
      if (!isAutonomyIssue(item)) continue;
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      result.push({
        ...item,
        reportTimestamp: r.timestamp,
        issueType: classifyIssue(item),
      });
    }
  }
  return result.sort(
    (a, b) => new Date(b.reportTimestamp).getTime() - new Date(a.reportTimestamp).getTime()
  );
}

// ─── Competitive Intelligence ─────────────────────────────────────────────────

type ReportItemWithTimestamp = Report['items'][number] & { reportTimestamp: string };

/** All items tagged as competitive, across all valid reports, deduplicated by URL. */
export function getCompetitiveItems(): ReportItemWithTimestamp[] {
  const seen = new Set<string>();
  const result: ReportItemWithTimestamp[] = [];
  for (const r of validReports) {
    for (const item of r.items ?? []) {
      if (item.category === 'competitive' && !seen.has(item.url)) {
        seen.add(item.url);
        result.push({ ...item, reportTimestamp: r.timestamp });
      }
    }
  }
  return result;
}

/** Items explicitly tagged 'competitive' by the LLM analyzer, matched by competitor keyword.
 *  Strict: only items where category=competitive AND keyword match. Avoids Rivian-internal
 *  posts (e.g. ACC faults, Comma installs) that carry 'competitive' category incorrectly.
 *  Note: items not tagged competitive will not appear in CompetitorWatch until the
 *  GameFilm analyzer prompt is tightened to avoid over-tagging. */
export function getItemsByCompetitor(keywords: string[]): ReportItemWithTimestamp[] {
  const seen = new Set<string>();
  const result: ReportItemWithTimestamp[] = [];
  const lower = keywords.map(k => k.toLowerCase());
  for (const r of validReports) {
    for (const item of r.items ?? []) {
      // Only items the LLM explicitly tagged as competitive
      if (item.category !== 'competitive') continue;
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

/** All items grouped by source key, across all valid reports, deduplicated by URL. */
export function getSourceItemsMap(): Record<SourceKey, (Report['items'][number] & { reportTimestamp: string })[]> {
  const map = {} as Record<SourceKey, (Report['items'][number] & { reportTimestamp: string })[]>;
  const seen: Record<string, Set<string>> = {};
  for (const key of SOURCE_KEYS) {
    map[key] = [];
    seen[key] = new Set();
  }
  for (const r of validReports) {
    for (const item of r.items ?? []) {
      const src = item.source as SourceKey;
      if (SOURCE_KEYS.includes(src) && !seen[src].has(item.url)) {
        seen[src].add(item.url);
        map[src].push({ ...item, reportTimestamp: r.timestamp });
      }
    }
  }
  return map;
}

export interface MatrixCell {
  found: number;
  sentiment: string | null;
  items: (Report['items'][number] & { reportTimestamp: string })[];
}

export interface MatrixRow {
  key: SourceKey;
  label: string;
  allItems: (Report['items'][number] & { reportTimestamp: string })[];
  cells: MatrixCell[]; // same order as headers
}

export interface SourceMatrixData {
  headers: string[];       // formatted date strings, newest first
  reportIds: string[];     // report ids, same order
  rows: MatrixRow[];
}

/**
 * Pre-computed flat matrix data for the SourceSentimentMatrix component.
 * Avoids relying on the RSC serializer to faithfully hydrate nested Report[].items.
 */
export function getSourceMatrixData(): SourceMatrixData {
  const reports5 = validReports.slice(0, 5);

  const headers = reports5.map(r => {
    const d = new Date(r.timestamp);
    return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', timeZone: 'America/Los_Angeles' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Los_Angeles' });
  });

  const reportIds = reports5.map(r => r.id);

  // Build all-items map (across all valid reports, not just last 5)
  const allItemsMap = getSourceItemsMap();

  const rows: MatrixRow[] = SOURCE_KEYS.map(key => ({
    key,
    label: SOURCE_LABELS[key],
    allItems: allItemsMap[key],
    cells: reports5.map(r => ({
      found: r.sources[key as keyof Report['sources']]?.found ?? 0,
      sentiment: r.sources[key as keyof Report['sources']]?.sentiment ?? null,
      items: (r.items ?? []).filter(i => i.source === key).map(i => ({ ...i, reportTimestamp: r.timestamp })),
    })),
  }));

  return { headers, reportIds, rows };
}

/** Total count of competitive items in latest report. */
export function getCompetitiveItemCountLatest(): number {
  const r = getLatestReport();
  if (!r) return 0;
  return (r.items ?? []).filter(i => i.category === 'competitive').length;
}

/** Returns reports filtered by scope: 'latest' (validReports[0]), '7d' (last 7 days), or 'all' (all validReports). */
export function getScopeReports(scope: string): { reports: Report[] } {
  if (scope === 'all') return { reports: validReports };
  if (scope === '7d') {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return { reports: validReports.filter(r => new Date(r.timestamp).getTime() >= cutoff) };
  }
  // default: latest
  return { reports: validReports.slice(0, 1) };
}

export function getOverallThreatLevel(): ThreatLevel {
  const intel = getCompetitorIntelMap();
  const levels: ThreatLevel[] = Object.values(intel).map(v => v.threatLevel);
  if (levels.includes('high')) return 'high';
  if (levels.includes('elevated')) return 'elevated';
  if (levels.includes('medium')) return 'medium';
  return 'low';
}

// ─── Publish-date categorization & sentiment trend ──────────────────────────────

const PT_TZ = 'America/Los_Angeles';

/** YYYY-MM-DD key for a date, in Pacific time. */
function ptDayKey(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: PT_TZ });
}

/**
 * The original publish date of an item. Prefers the article's own publishedAt
 * (ISO, date-only, or RFC822/RSS strings all parse), falling back to the scan
 * timestamp when publishedAt is missing or unparseable.
 */
export function getEffectiveDate(item: { publishedAt?: string | null }, fallbackTimestamp: string): Date {
  const raw = item.publishedAt;
  if (raw) {
    const d = new Date(raw);
    const t = d.getTime();
    if (!Number.isNaN(t)) {
      const year = d.getUTCFullYear();
      if (year >= 2020 && year <= 2035) return d;
    }
  }
  return new Date(fallbackTimestamp);
}

export interface PublishTrendItem {
  title: string;
  url: string;
  source: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  snippet: string;
  publishedAt?: string | null;
}

export interface PublishTrendPoint {
  date: string;     // YYYY-MM-DD (PT)
  label: string;    // "Jun 5"
  positive: number;
  neutral: number;
  negative: number;
  total: number;
  items: PublishTrendItem[];
}

/**
 * Buckets every deduped item by its ORIGINAL publish date (PT day) and counts
 * positive / neutral / negative sentiment per day. Returns the trailing `days`
 * buckets that contain data, oldest→newest, for the trend chart.
 */
export function getSentimentByPublishDate(days = 21): PublishTrendPoint[] {
  const seen = new Set<string>();
  const buckets = new Map<string, { positive: number; neutral: number; negative: number; items: PublishTrendItem[] }>();

  for (const r of validReports) {
    for (const item of r.items ?? []) {
      const url = item.url;
      if (!url || seen.has(url)) continue;
      seen.add(url);
      const d = getEffectiveDate(item, r.timestamp);
      const key = ptDayKey(d);
      const b = buckets.get(key) ?? { positive: 0, neutral: 0, negative: 0, items: [] };
      const s = item.sentiment;
      const sentiment: PublishTrendItem['sentiment'] =
        s === 'positive' || s === 'negative' ? s : 'neutral';
      b[sentiment] += 1;
      b.items.push({
        title: item.title,
        url: item.url,
        source: item.source,
        sentiment,
        snippet: item.snippet,
        publishedAt: item.publishedAt ?? null,
      });
      buckets.set(key, b);
    }
  }

  const orderedKeys = Array.from(buckets.keys()).sort(); // YYYY-MM-DD sorts chronologically
  const recent = orderedKeys.slice(-days);

  return recent.map(key => {
    const b = buckets.get(key)!;
    const [y, m, dd] = key.split('-').map(Number);
    const label = new Date(Date.UTC(y, m - 1, dd)).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
    const sortedItems = [...b.items].sort((x, y) => {
      const order = { positive: 0, neutral: 1, negative: 2 };
      return order[x.sentiment] - order[y.sentiment];
    });
    return { date: key, label, positive: b.positive, neutral: b.neutral, negative: b.negative, total: b.positive + b.neutral + b.negative, items: sortedItems };
  });
}
