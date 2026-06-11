'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CATEGORY_KEYS, CATEGORY_LABELS, SOURCE_KEYS, SOURCE_LABELS } from '@/lib/types';
import MediaPreview from './MediaPreview';

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

const SENTIMENT_STYLES: Record<string, string> = {
  positive: 'bg-[#d9efe3] text-[#188f5a]',
  neutral: 'bg-[#e7e0cf] text-[#655f55]',
  negative: 'bg-[#f7ddd4] text-[#b94c33]',
};

function highlightText(text: string, query: string) {
  if (!query.trim()) return <>{text}</>;
  const terms = query.trim().split(/\s+/).filter(Boolean);
  const pattern = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return (
    <>
      {text.split(pattern).map((part, i) =>
        pattern.test(part) ? (
          <mark key={i} className="rounded-sm bg-[#d9e5fb] px-0.5 text-[#0f5bd7]">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
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

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

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
      className="fixed inset-0 z-[9999] flex items-start justify-center bg-[rgba(19,19,19,0.52)] px-4 pb-6 pt-6 sm:px-6 sm:pt-12"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[calc(100vh-3rem)] w-full max-w-4xl flex-col overflow-hidden border border-[#131313]/12 bg-[#fffdf8] shadow-[0_28px_90px_rgba(19,19,19,0.18)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="border-b border-[#131313]/10 px-5 py-4 sm:px-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="font-mono-num text-[10px] uppercase tracking-[0.3em] text-[#7b7468]">Search / All Reports</div>
              <div className="mt-2 text-2xl tracking-[-0.05em] text-[#131313]">Query the intelligence archive.</div>
            </div>
            <button
              onClick={onClose}
              className="border border-[#131313]/12 px-3 py-2 font-mono-num text-[10px] uppercase tracking-[0.24em] text-[#5d584d] transition-colors hover:border-[#131313] hover:text-[#131313]"
            >
              Close
            </button>
          </div>

          <div className="flex items-center gap-3 border border-[#131313]/12 bg-[#f8f3e8] px-4 py-3">
            <span className="text-base text-[#7b7468]">🔍</span>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search intel, titles, themes, snippets..."
              className="w-full border-0 bg-transparent text-[15px] text-[#131313] outline-none placeholder:text-[#8b8478]"
            />
            {loading && (
              <span className="font-mono-num text-[10px] uppercase tracking-[0.24em] text-[#0f5bd7]">
                Searching
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-[#131313]/10 bg-[#fcf8ef] px-5 py-3 sm:px-6">
          <select
            value={sentimentFilter}
            onChange={e => setSentimentFilter(e.target.value)}
            className="border border-[#131313]/12 bg-[#fffdf8] px-3 py-2 font-mono-num text-[10px] uppercase tracking-[0.22em] text-[#5d584d] outline-none"
          >
            <option value="">All Sentiment</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </select>

          <select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            className="border border-[#131313]/12 bg-[#fffdf8] px-3 py-2 font-mono-num text-[10px] uppercase tracking-[0.22em] text-[#5d584d] outline-none"
          >
            <option value="">All Sources</option>
            {SOURCE_KEYS.map(key => (
              <option key={key} value={key}>
                {SOURCE_LABELS[key]}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="border border-[#131313]/12 bg-[#fffdf8] px-3 py-2 font-mono-num text-[10px] uppercase tracking-[0.22em] text-[#5d584d] outline-none"
          >
            <option value="">All Categories</option>
            {CATEGORY_KEYS.map(key => (
              <option key={key} value={key}>
                {CATEGORY_LABELS[key]}
              </option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="border border-[#131313]/12 px-3 py-2 font-mono-num text-[10px] uppercase tracking-[0.22em] text-[#5d584d] transition-colors hover:border-[#131313] hover:text-[#131313]"
            >
              Clear Filters
            </button>
          )}

          {hasInput && !loading && (
            <div className="ml-auto font-mono-num text-[10px] uppercase tracking-[0.24em] text-[#7b7468]">
              {total} result{total !== 1 ? 's' : ''}{total > 100 ? ' / showing 100' : ''}
            </div>
          )}
        </div>

        <div className={`flex-1 overflow-y-auto ${hasInput ? 'px-5 py-4 sm:px-6' : 'px-5 py-8 sm:px-6 sm:py-10'}`}>
          {error && (
            <div className="border border-[#d84f34]/20 bg-[#fdf0eb] px-4 py-5 text-center font-mono-num text-[11px] uppercase tracking-[0.24em] text-[#b94c33]">
              {error}
            </div>
          )}

          {!hasInput && (
            <div className="text-center">
              <div className="font-mono-num text-[10px] uppercase tracking-[0.3em] text-[#7b7468]">Suggested starting points</div>
              <div className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#5d584d]">
                Search by competitor, program, sentiment topic, or product theme to move through historical GameFilm reporting.
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {['FSD', 'Cybertruck', 'R2', 'RIVN stock', 'Waymo', 'recall'].map(term => (
                  <button
                    key={term}
                    onClick={() => setQuery(term)}
                    className="border border-[#131313]/12 bg-[#fffdf8] px-3 py-2 font-mono-num text-[10px] uppercase tracking-[0.22em] text-[#5d584d] transition-colors hover:border-[#131313] hover:text-[#131313]"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {hasInput && !loading && results.length === 0 && !error && (
            <div className="py-10 text-center">
              <div className="font-mono-num text-[10px] uppercase tracking-[0.3em] text-[#7b7468]">No matches</div>
              <div className="mt-3 text-sm leading-7 text-[#5d584d]">Try broader keywords, fewer filters, or a source-specific scan.</div>
            </div>
          )}

          <div className="space-y-3">
            {results.map((item, i) => (
              <div key={i} className="border border-[#131313]/10 bg-[#fffdf8] p-4 transition-colors hover:bg-[#f8f3e8]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono-num text-[10px] uppercase tracking-[0.22em] text-[#7b7468]">{item.sourceLabel}</span>
                  <span className={`rounded-full px-2 py-1 font-mono-num text-[10px] uppercase tracking-[0.2em] ${SENTIMENT_STYLES[item.sentiment] ?? SENTIMENT_STYLES.neutral}`}>
                    {item.sentiment}
                  </span>
                  {item.categoryLabel && (
                    <span className="font-mono-num text-[10px] uppercase tracking-[0.22em] text-[#8b8478]">{item.categoryLabel}</span>
                  )}
                  {item.publishedAt && (
                    <span className="font-mono-num text-[10px] uppercase tracking-[0.22em] text-[#8b8478]">{item.publishedAt}</span>
                  )}
                  <span className="ml-auto font-mono-num text-[10px] uppercase tracking-[0.22em] text-[#8b8478]">
                    {new Date(item.reportTimestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      timeZone: 'America/Los_Angeles',
                    })}
                  </span>
                </div>

                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 block text-lg leading-7 tracking-[-0.03em] text-[#131313]"
                >
                  {highlightText(item.title, query)}
                </a>

                {item.snippet && (
                  <p className="mt-2 text-sm leading-6 text-[#5d584d]">{highlightText(item.snippet, query)}</p>
                )}

                <MediaPreview url={item.url} title={item.title} />

                {item.themes && item.themes.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.themes.map(theme => (
                      <button
                        key={theme}
                        onClick={() => setQuery(theme)}
                        className="border border-[#131313]/10 bg-[#f8f3e8] px-2.5 py-1.5 font-mono-num text-[10px] uppercase tracking-[0.2em] text-[#5d584d] transition-colors hover:border-[#131313] hover:text-[#131313]"
                      >
                        {theme}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-[#131313]/10 bg-[#fcf8ef] px-5 py-3 font-mono-num text-[10px] uppercase tracking-[0.24em] text-[#7b7468] sm:px-6">
          <span>Enter to open links in a new tab</span>
          <span>Esc to close</span>
          <span className="ml-auto">GameFilm Search</span>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
