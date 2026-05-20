'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SOURCE_KEYS, SOURCE_LABELS, CATEGORY_KEYS, CATEGORY_LABELS, SourceKey, CategoryKey } from '@/lib/types';

interface SearchResult {
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

const SENTIMENT_COLOR: Record<string, string> = {
  positive: '#22C55E',
  neutral:  '#6B7280',
  negative: '#EF4444',
};

function highlightText(text: string, query: string) {
  if (!query.trim()) return <>{text}</>;
  const terms = query.trim().split(/\s+/).filter(Boolean);
  const pattern = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) =>
        pattern.test(part)
          ? <mark key={i} style={{ background: '#3B82F622', color: '#60A5FA', borderRadius: '2px', padding: '0 1px' }}>{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

interface Props {
  onClose: () => void;
}

export default function SearchModal({ onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    setTimeout(() => inputRef.current?.focus(), 50);

    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // Debounce query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Fetch results whenever query or filters change
  useEffect(() => {
    const hasInput = debouncedQuery.trim() || sentimentFilter || sourceFilter || categoryFilter;
    if (!hasInput) {
      setResults([]);
      setTotal(0);
      setError('');
      return;
    }

    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim());
    if (sentimentFilter) params.set('sentiment', sentimentFilter);
    if (sourceFilter) params.set('source', sourceFilter);
    if (categoryFilter) params.set('category', categoryFilter);

    fetch(`/api/search?${params}`)
      .then(r => r.json())
      .then(data => {
        setResults(data.results ?? []);
        setTotal(data.total ?? 0);
        setLoading(false);
      })
      .catch(() => {
        setError('Search failed. Please try again.');
        setLoading(false);
      });
  }, [debouncedQuery, sentimentFilter, sourceFilter, categoryFilter]);

  const hasInput = query.trim() || sentimentFilter || sourceFilter || categoryFilter;
  const hasFilters = sentimentFilter || sourceFilter || categoryFilter;

  const clearFilters = () => {
    setSentimentFilter('');
    setSourceFilter('');
    setCategoryFilter('');
  };

  if (!mounted) return null;

  const modal = (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '80px 16px 32px',
        background: 'rgba(0,0,0,0.85)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative', background: '#111111',
          border: '1px solid #2F2F2F', borderRadius: '12px',
          width: '100%', maxWidth: '720px',
          maxHeight: 'calc(100vh - 120px)',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.9)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: '1px solid #1F1F1F' }}>
          <span style={{ color: '#6B7280', fontSize: '16px', flexShrink: 0 }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search intel, titles, themes, snippets…"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: '#F5F5F5', fontSize: '15px', fontFamily: 'inherit',
              caretColor: '#3B82F6',
            }}
          />
          {loading && (
            <span style={{ color: '#3B82F6', fontSize: '12px', fontFamily: 'monospace' }}>…</span>
          )}
          <button
            onClick={onClose}
            style={{ color: '#6B7280', fontSize: '18px', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
          >
            ✕
          </button>
        </div>

        {/* Filter row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px 16px', borderBottom: '1px solid #1F1F1F', background: '#0D0D0D' }}>
          {/* Sentiment */}
          <select
            value={sentimentFilter}
            onChange={e => setSentimentFilter(e.target.value)}
            style={{
              background: sentimentFilter ? '#1A2A3A' : '#1A1A1A', border: `1px solid ${sentimentFilter ? '#3B82F6' : '#2A2A2A'}`,
              borderRadius: '6px', color: sentimentFilter ? '#60A5FA' : '#9CA3AF',
              fontSize: '11px', fontFamily: 'monospace', padding: '4px 8px', cursor: 'pointer',
            }}
          >
            <option value="">All Sentiment</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </select>

          {/* Source */}
          <select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            style={{
              background: sourceFilter ? '#1A2A3A' : '#1A1A1A', border: `1px solid ${sourceFilter ? '#3B82F6' : '#2A2A2A'}`,
              borderRadius: '6px', color: sourceFilter ? '#60A5FA' : '#9CA3AF',
              fontSize: '11px', fontFamily: 'monospace', padding: '4px 8px', cursor: 'pointer',
            }}
          >
            <option value="">All Sources</option>
            {SOURCE_KEYS.map(k => <option key={k} value={k}>{SOURCE_LABELS[k]}</option>)}
          </select>

          {/* Category */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            style={{
              background: categoryFilter ? '#1A2A3A' : '#1A1A1A', border: `1px solid ${categoryFilter ? '#3B82F6' : '#2A2A2A'}`,
              borderRadius: '6px', color: categoryFilter ? '#60A5FA' : '#9CA3AF',
              fontSize: '11px', fontFamily: 'monospace', padding: '4px 8px', cursor: 'pointer',
            }}
          >
            <option value="">All Categories</option>
            {CATEGORY_KEYS.map(k => <option key={k} value={k}>{CATEGORY_LABELS[k]}</option>)}
          </select>

          {hasFilters && (
            <button
              onClick={clearFilters}
              style={{
                background: 'none', border: '1px solid #2A2A2A', borderRadius: '6px',
                color: '#6B7280', fontSize: '11px', fontFamily: 'monospace',
                padding: '4px 8px', cursor: 'pointer',
              }}
            >
              ✕ Clear filters
            </button>
          )}

          {hasInput && !loading && (
            <span style={{ marginLeft: 'auto', color: '#4B5563', fontSize: '11px', fontFamily: 'monospace', alignSelf: 'center' }}>
              {total} result{total !== 1 ? 's' : ''}{total > 100 ? ' (showing 100)' : ''}
            </span>
          )}
        </div>

        {/* Results */}
        <div style={{ overflowY: 'auto', flex: 1, padding: hasInput ? '12px 16px' : '0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {error && (
            <div style={{ color: '#EF4444', fontSize: '13px', fontFamily: 'monospace', padding: '16px', textAlign: 'center' }}>{error}</div>
          )}

          {!hasInput && (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <div style={{ color: '#4B5563', fontSize: '12px', fontFamily: 'monospace', marginBottom: '16px' }}>SEARCH ACROSS ALL INTEL REPORTS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                {['FSD', 'Cybertruck', 'R2', 'RIVN stock', 'Waymo', 'recall'].map(s => (
                  <button
                    key={s}
                    onClick={() => setQuery(s)}
                    style={{
                      background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '6px',
                      color: '#9CA3AF', fontSize: '12px', fontFamily: 'monospace',
                      padding: '6px 12px', cursor: 'pointer',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {hasInput && !loading && results.length === 0 && !error && (
            <div style={{ color: '#6B7280', fontSize: '13px', fontFamily: 'monospace', padding: '32px', textAlign: 'center' }}>
              No results found. Try different keywords or filters.
            </div>
          )}

          {results.map((item, i) => (
            <div
              key={i}
              style={{
                border: '1px solid #1F1F1F', borderRadius: '8px', padding: '12px 14px',
                display: 'flex', flexDirection: 'column', gap: '6px',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#2F2F2F')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#1F1F1F')}
            >
              {/* Meta row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#6B7280', fontSize: '11px', fontFamily: 'monospace' }}>{item.sourceLabel}</span>
                <span style={{ color: '#2F2F2F' }}>·</span>
                <span style={{
                  fontSize: '10px', fontFamily: 'monospace', padding: '2px 5px', borderRadius: '3px',
                  color: SENTIMENT_COLOR[item.sentiment] ?? '#6B7280',
                  background: (SENTIMENT_COLOR[item.sentiment] ?? '#6B7280') + '22',
                }}>
                  {item.sentiment}
                </span>
                {item.categoryLabel && (
                  <>
                    <span style={{ color: '#2F2F2F' }}>·</span>
                    <span style={{ color: '#4B5563', fontSize: '10px', fontFamily: 'monospace' }}>{item.categoryLabel}</span>
                  </>
                )}
                {item.publishedAt && (
                  <>
                    <span style={{ color: '#2F2F2F' }}>·</span>
                    <span style={{ color: '#4B5563', fontSize: '10px', fontFamily: 'monospace' }}>{item.publishedAt}</span>
                  </>
                )}
                <span style={{ marginLeft: 'auto', color: '#374151', fontSize: '10px', fontFamily: 'monospace' }}>
                  {new Date(item.reportTimestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' })}
                </span>
              </div>

              {/* Title */}
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#F5F5F5', fontSize: '13px', fontWeight: 600, textDecoration: 'none', lineHeight: 1.4 }}
              >
                {highlightText(item.title, query)}
              </a>

              {/* Snippet */}
              {item.snippet && (
                <p style={{ color: '#9CA3AF', fontSize: '12px', lineHeight: 1.5, margin: 0 }}>
                  {highlightText(item.snippet, query)}
                </p>
              )}

              {/* Themes */}
              {item.themes && item.themes.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {item.themes.map(t => (
                    <button
                      key={t}
                      onClick={() => setQuery(t)}
                      style={{
                        background: '#1A1A1A', border: '1px solid #222', borderRadius: '4px',
                        color: '#6B7280', fontSize: '10px', fontFamily: 'monospace',
                        padding: '2px 6px', cursor: 'pointer',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 16px', borderTop: '1px solid #1F1F1F', display: 'flex', gap: '16px', color: '#374151', fontSize: '11px', fontFamily: 'monospace' }}>
          <span>↵ open link</span>
          <span>ESC close</span>
          <span style={{ marginLeft: 'auto' }}>GAMEFILM SEARCH</span>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
