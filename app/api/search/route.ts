import { NextRequest, NextResponse } from 'next/server';
import { reports } from '@/lib/data';
import { SOURCE_LABELS, CATEGORY_LABELS, SourceKey, CategoryKey } from '@/lib/types';

export const dynamic = 'force-dynamic';

export interface SearchResult {
  title: string;
  url: string;
  source: string;
  sourceLabel: string;
  sentiment: string;
  snippet: string;
  category?: string;
  categoryLabel?: string;
  themes?: string[];
  publishedAt?: string | null;
  reportTimestamp: string;
  reportId: string;
}

function highlight(text: string, query: string): string {
  // Return text as-is; highlighting done client-side
  return text;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  const sentimentFilter = req.nextUrl.searchParams.get('sentiment') ?? '';
  const sourceFilter = req.nextUrl.searchParams.get('source') ?? '';
  const categoryFilter = req.nextUrl.searchParams.get('category') ?? '';

  if (!q && !sentimentFilter && !sourceFilter && !categoryFilter) {
    return NextResponse.json({ results: [], total: 0, query: '' });
  }

  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);

  const seen = new Set<string>();
  const results: SearchResult[] = [];

  for (const report of reports) {
    if (report.scanError) continue;

    for (const item of report.items) {
      if (seen.has(item.url)) continue;

      // Filter: sentiment
      if (sentimentFilter && item.sentiment !== sentimentFilter) continue;
      // Filter: source
      if (sourceFilter && item.source !== sourceFilter) continue;
      // Filter: category
      if (categoryFilter && item.category !== categoryFilter) continue;

      // Text search
      if (terms.length > 0) {
        const haystack = [
          item.title,
          item.snippet,
          ...(item.themes ?? []),
          item.source,
          item.category ?? '',
        ].join(' ').toLowerCase();

        const matched = terms.every(t => haystack.includes(t));
        if (!matched) continue;
      }

      seen.add(item.url);
      results.push({
        title: item.title,
        url: item.url,
        source: item.source,
        sourceLabel: SOURCE_LABELS[item.source as SourceKey] ?? item.source,
        sentiment: item.sentiment,
        snippet: item.snippet,
        category: item.category,
        categoryLabel: item.category ? CATEGORY_LABELS[item.category as CategoryKey] : undefined,
        themes: item.themes,
        publishedAt: item.publishedAt ?? null,
        reportTimestamp: report.timestamp,
        reportId: report.id,
      });
    }
  }

  // Sort: newest report first
  results.sort((a, b) => new Date(b.reportTimestamp).getTime() - new Date(a.reportTimestamp).getTime());

  return NextResponse.json({ results: results.slice(0, 100), total: results.length, query: q });
}
