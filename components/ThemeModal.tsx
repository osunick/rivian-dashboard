'use client';

import { useEffect } from 'react';
import { SOURCE_LABELS, SourceKey } from '@/lib/types';

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

const SENTIMENT_COLOR: Record<string, string> = {
  positive: '#22C55E',
  neutral:  '#6B7280',
  negative: '#EF4444',
};

export default function ThemeModal({ theme, items, onClose }: Props) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="relative bg-[#111111] border border-[#2F2F2F] rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-[#1F1F1F]">
          <div className="flex-1 pr-4">
            <div className="text-[#6B7280] text-xs font-mono uppercase tracking-wider mb-1">Theme</div>
            <div className="text-[#F5F5F5] text-sm font-semibold leading-snug">{theme}</div>
          </div>
          <button
            onClick={onClose}
            className="text-[#6B7280] hover:text-[#F5F5F5] text-lg leading-none transition-colors mt-0.5"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="text-[#6B7280] text-sm font-mono text-center py-8">
              No source items linked to this theme.
            </div>
          ) : (
            items.map((item, i) => (
              <div key={i} className="border border-[#1F1F1F] rounded-lg p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[#6B7280] text-xs font-mono">
                    {SOURCE_LABELS[item.source as SourceKey] ?? item.source}
                  </span>
                  <span
                    className="text-xs font-mono px-1.5 py-0.5 rounded"
                    style={{
                      color: SENTIMENT_COLOR[item.sentiment] ?? '#6B7280',
                      background: (SENTIMENT_COLOR[item.sentiment] ?? '#6B7280') + '18',
                    }}
                  >
                    {item.sentiment}
                  </span>
                  {item.publishedAt && (
                    <span className="text-[#4B5563] text-xs font-mono">{item.publishedAt}</span>
                  )}
                </div>

                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#F5F5F5] text-sm font-semibold hover:text-[#3B82F6] transition-colors block leading-snug"
                >
                  {item.title}
                </a>

                {item.snippet && (
                  <p className="text-[#9CA3AF] text-xs leading-relaxed">{item.snippet}</p>
                )}

                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#3B82F6] text-xs font-mono hover:underline break-all"
                >
                  🔗 {item.url}
                </a>
              </div>
            ))
          )}
        </div>

        <div className="px-5 py-3 border-t border-[#1F1F1F] text-[#4B5563] text-xs font-mono">
          {items.length} source item{items.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}
