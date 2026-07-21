'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { SOURCE_LABELS, SourceKey } from '@/lib/types';
import MediaPreview from './MediaPreview';

interface Item {
  title: string;
  url?: string;
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
  label?: string;
  description?: string;
  footerSuffix?: string;
}

const SENTIMENT_STYLES: Record<string, string> = {
  positive: 'bg-[#E6F6EF] text-[#087047] border border-[#A8DCC4]',
  neutral: 'bg-[#F0EBE2] text-claude-muted border border-claude-border',
  negative: 'bg-[#FDE8E6] text-[#B42318] border border-[#F0A8A1]',
  risk: 'bg-[#FDE8E6] text-[#B42318] border border-[#F0A8A1]',
};

function sortNewestFirst<T extends { reportTimestamp?: string }>(arr: T[]): T[] {
  return [...arr].sort(
    (a, b) => new Date(b.reportTimestamp ?? 0).getTime() - new Date(a.reportTimestamp ?? 0).getTime()
  );
}

export default function ThemeModal({
  theme,
  items,
  onClose,
  label = 'Theme Drilldown',
  description = 'Items tagged with this theme, sorted newest first across the report history.',
  footerSuffix = 'in this theme',
}: Props) {
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
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#171713]/35 px-4 py-6 backdrop-blur-sm sm:px-6"
      onClick={onClose}
    >
      <div
        className="edge-top-red relative flex max-h-[84vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-claude-border bg-claude-card shadow-cinematic"
        onClick={event => event.stopPropagation()}
      >
        <div className="border-b border-claude-border bg-[#FCFAF5] px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-mono-num text-[10px] uppercase tracking-[0.3em] text-claude-accent">{label}</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-claude-text">{theme}</h2>
              <p className="mt-1.5 text-[13px] leading-6 text-claude-muted">
                {description}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-md border border-claude-border bg-white px-3 py-2 font-mono-num text-[10px] uppercase tracking-[0.24em] text-claude-muted transition-colors hover:border-claude-accent hover:text-claude-accent"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#F6F4EF] px-5 py-4 sm:px-6">
          {sorted.length === 0 ? (
            <div className="py-10 text-center">
              <div className="font-mono-num text-[10px] uppercase tracking-[0.3em] text-claude-muted">No items found</div>
              <div className="mt-3 text-sm leading-7 text-claude-muted">This theme currently has no linked report items.</div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {sorted.map((item, index) => (
                <div key={index} className="rounded-lg border border-claude-border bg-white/70 p-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono-num text-[10px] uppercase tracking-[0.18em] text-claude-muted">
                      {SOURCE_LABELS[item.source as SourceKey] ?? item.source}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 font-mono-num text-[10px] uppercase tracking-[0.16em] ${SENTIMENT_STYLES[item.sentiment] ?? SENTIMENT_STYLES.neutral}`}>
                      {item.sentiment}
                    </span>
                    {item.publishedAt && (
                      <span className="font-mono-num text-[10px] uppercase tracking-[0.18em] text-claude-muted/70">pub {item.publishedAt}</span>
                    )}
                    <span className="ml-auto font-mono-num text-[10px] uppercase tracking-[0.18em] text-claude-muted/70">
                      {new Date(item.reportTimestamp).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        timeZone: 'America/Los_Angeles',
                      })}
                    </span>
                  </div>

                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2.5 block text-[16px] font-semibold leading-6 tracking-tight text-claude-text hover:text-claude-accent transition-colors"
                    >
                      {item.title}
                    </a>
                  ) : (
                    <div className="mt-2.5 text-[16px] font-semibold leading-6 tracking-tight text-claude-text">
                      {item.title}
                    </div>
                  )}

                  {item.snippet && (
                    <p className="mt-1.5 text-[13px] leading-6 text-claude-muted">{item.snippet}</p>
                  )}

                  {item.url && (
                    <>
                      <MediaPreview url={item.url} title={item.title} />
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-block font-mono-num text-[10px] uppercase tracking-[0.24em] text-claude-accent hover:text-claude-text transition-colors"
                      >
                        Open Source Link →
                      </a>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-claude-border bg-[#FCFAF5] px-5 py-2.5 font-mono-num text-[10px] uppercase tracking-[0.24em] text-claude-muted sm:px-6">
          {sorted.length} item{sorted.length !== 1 ? 's' : ''}{footerSuffix ? ` ${footerSuffix}` : ''}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
