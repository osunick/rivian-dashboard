// Intentionally NOT 'use client' — pure HTML, no JS needed
import { SOURCE_LABELS, SourceKey, SentimentLabel, SOURCE_KEYS } from '@/lib/types';
import reportsRaw from '@/public/data/reports.json';

interface SourceEntry {
  source: string;
  found: number;
  sentiment: SentimentLabel | null;
}

interface Props {
  data: SourceEntry[];
}

const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#22C55E',
  neutral:  '#6B7280',
  negative: '#EF4444',
};

function buildItemsMap() {
  const map: Record<string, any[]> = {};
  for (const key of SOURCE_KEYS) map[key] = [];
  const seen: Record<string, Set<string>> = {};
  for (const key of SOURCE_KEYS) seen[key] = new Set();

  const reports = (reportsRaw as any[]).filter(
    r => !r.scanError && (r.sentiment?.positive + r.sentiment?.neutral + r.sentiment?.negative) > 0
  );
  for (const r of reports) {
    for (const item of (r.items ?? [])) {
      const src = item.source as string;
      if (SOURCE_KEYS.includes(src as SourceKey) && !seen[src].has(item.url)) {
        seen[src].add(item.url);
        map[src].push({ ...item, reportTimestamp: r.timestamp });
      }
    }
  }
  return map;
}

const ITEMS_MAP = buildItemsMap();

export default function SourceActivityChart({ data }: Props) {
  const sorted = [...data].sort((a, b) => b.found - a.found);
  const max = Math.max(...sorted.map(d => d.found), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {sorted.map(entry => {
        const label = SOURCE_LABELS[entry.source as SourceKey] ?? entry.source;
        const color = SENTIMENT_COLORS[entry.sentiment ?? ''] ?? '#374151';
        const items = ITEMS_MAP[entry.source] ?? [];
        const pct = (entry.found / max) * 100;

        return (
          <details key={entry.source} style={{ borderRadius: '6px', border: '1px solid transparent' }}>
            <summary style={{
              listStyle: 'none',
              padding: '6px 8px',
              cursor: 'pointer',
              userSelect: 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#D1D5DB', fontSize: '12px', fontFamily: 'monospace' }}>
                  {label}
                  {items.length > 0 && (
                    <span style={{ color: '#3B82F6', fontSize: '10px', marginLeft: '4px' }}>▼</span>
                  )}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {entry.sentiment && (
                    <span style={{
                      fontSize: '10px', fontFamily: 'monospace',
                      padding: '1px 4px', borderRadius: '4px',
                      color, background: color + '22',
                    }}>
                      {entry.sentiment}
                    </span>
                  )}
                  <span style={{ color: '#9CA3AF', fontSize: '12px', fontFamily: 'monospace' }}>{entry.found}</span>
                </div>
              </div>
              <div style={{ height: '6px', background: '#1F1F1F', borderRadius: '9999px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: '9999px',
                  width: `${pct}%`,
                  backgroundColor: color,
                  opacity: entry.found === 0 ? 0.2 : 0.8,
                }} />
              </div>
            </summary>

            {items.length > 0 && (
              <div style={{ padding: '8px', borderTop: '1px solid #1F1F1F', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {items.slice(0, 10).map((item: any, i: number) => (
                  <div key={i} style={{ border: '1px solid #1F1F1F', borderRadius: '6px', padding: '10px', background: '#0D0D0D' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '4px' }}>
                      <span style={{
                        fontSize: '10px', fontFamily: 'monospace',
                        padding: '1px 4px', borderRadius: '4px',
                        color: SENTIMENT_COLORS[item.sentiment] ?? '#6B7280',
                        background: (SENTIMENT_COLORS[item.sentiment] ?? '#6B7280') + '22',
                      }}>
                        {item.sentiment}
                      </span>
                      {item.publishedAt && (
                        <span style={{ color: '#4B5563', fontSize: '10px', fontFamily: 'monospace' }}>{item.publishedAt}</span>
                      )}
                    </div>
                    <a href={item.url} target="_blank" rel="noopener noreferrer"
                      style={{ color: '#F5F5F5', fontSize: '12px', fontWeight: 600, textDecoration: 'none', display: 'block', lineHeight: 1.4 }}>
                      {item.title} ↗
                    </a>
                    {item.snippet && (
                      <p style={{ color: '#6B7280', fontSize: '11px', lineHeight: 1.6, margin: '4px 0 0' }}>
                        {item.snippet}
                      </p>
                    )}
                  </div>
                ))}
                {items.length > 10 && (
                  <p style={{ color: '#4B5563', fontSize: '10px', fontFamily: 'monospace', textAlign: 'center' }}>
                    +{items.length - 10} more across all scans
                  </p>
                )}
              </div>
            )}
          </details>
        );
      })}
    </div>
  );
}
