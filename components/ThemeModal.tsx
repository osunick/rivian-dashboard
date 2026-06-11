'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { SOURCE_LABELS, SourceKey } from '@/lib/types';
import MediaPreview from './MediaPreview';

interface Item {
  title: string;
  url: string;
  source: string;
  sentiment: string;
  publishedAt?: string | null;
  snippet?: string;
  reportTimestamp: string;
}

interface Props {
  theme: string;
  items: Item[];
  onClose: () => void;
}

const SENTIMENT_STYLES: Record<string, string> = {
  positive: 'bg-[#d9efe3] text-[#188f5a]',
  neutral: 'bg-[#e7e0cf] text-[#655f55]',
  negative: 'bg-[#f7ddd4] text-[#b94c33]',
  risk: 'bg-[#f7ddd4] text-[#b94c33]',
};

function sortNewestFirst<T extends { reportTimestamp?: string }>(arr: T[]): T[] {
  return [...arr].sort(
    (a, b) => new Date(b.reportTimestamp ?? 0).getTime() - new Date(a.reportTimestamp ?? 0).getTime()
  );
}

export default function ThemeModal({ theme, items, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const sorted = sortNewestFirst(items);

  useEffect(() => {
    setMounted(true);
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!mounted) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[rgba(19,19,19,0.52)] px-4 py-6 sm:px-6"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[84vh] w-full max-w-3xl flex-col overflow-hidden border border-[#131313]/12 bg-[#fffdf8] shadow-[0_28px_90px_rgba(19,19,19,0.18)]"
        onClick={event => event.stopPropagation()}
      >
        <div className="border-b border-[#131313]/10 px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-mono-num text-[10px] uppercase tracking-[0.3em] text-[#7b7468]">Theme Drilldown</div>
              <h2 className="mt-2 text-2xl tracking-[-0.05em] text-[#131313]">{theme}</h2>
              <p className="mt-2 text-sm leading-6 text-[#5d584d]">
                A focused list of items tagged with this theme, sorted newest first across the report history.
              </p>
            </div>
            <button
              onClick={onClose}
              className="border border-[#131313]/12 px-3 py-2 font-mono-num text-[10px] uppercase tracking-[0.24em] text-[#5d584d] transition-colors hover:border-[#131313] hover:text-[#131313]"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#fcf8ef] px-5 py-5 sm:px-6">
          {sorted.length === 0 ? (
            <div className="py-10 text-center">
              <div className="font-mono-num text-[10px] uppercase tracking-[0.3em] text-[#7b7468]">No items found</div>
              <div className="mt-3 text-sm leading-7 text-[#5d584d]">This theme currently has no linked report items.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {sorted.map((item, index) => (
                <div key={index} className="border border-[#131313]/10 bg-[#fffdf8] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono-num text-[10px] uppercase tracking-[0.22em] text-[#7b7468]">
                      {SOURCE_LABELS[item.source as SourceKey] ?? item.source}
                    </span>
                    <span className={`rounded-full px-2 py-1 font-mono-num text-[10px] uppercase tracking-[0.2em] ${SENTIMENT_STYLES[item.sentiment] ?? SENTIMENT_STYLES.neutral}`}>
                      {item.sentiment}
                    </span>
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
                    {item.title}
                  </a>

                  {item.snippet && (
                    <p className="mt-2 text-sm leading-6 text-[#5d584d]">{item.snippet}</p>
                  )}

                  <MediaPreview url={item.url} title={item.title} />

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block font-mono-num text-[10px] uppercase tracking-[0.24em] text-[#0f5bd7]"
                  >
                    Open Source Link
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-[#131313]/10 bg-[#fffdf8] px-5 py-3 font-mono-num text-[10px] uppercase tracking-[0.24em] text-[#7b7468] sm:px-6">
          {sorted.length} item{sorted.length !== 1 ? 's' : ''} in this theme
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
