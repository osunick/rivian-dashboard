'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    // Prevent body scroll while modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!mounted) return null;

  const modal = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 16px',
        background: 'rgba(0,0,0,0.80)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          background: '#111111',
          border: '1px solid #2F2F2F',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '672px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.9)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #1F1F1F' }}>
          <div style={{ flex: 1, paddingRight: '16px' }}>
            <div style={{ color: '#6B7280', fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Source</div>
            <div style={{ color: '#F5F5F5', fontSize: '14px', fontWeight: 600, lineHeight: 1.4 }}>{theme}</div>
          </div>
          <button
            onClick={onClose}
            style={{ color: '#6B7280', fontSize: '18px', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', marginTop: '2px' }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {items.length === 0 ? (
            <div style={{ color: '#6B7280', fontSize: '13px', fontFamily: 'monospace', textAlign: 'center', padding: '32px 0' }}>
              No items found for this source.
            </div>
          ) : (
            items.map((item, i) => (
              <div key={i} style={{ border: '1px solid #1F1F1F', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#6B7280', fontSize: '11px', fontFamily: 'monospace' }}>
                    {SOURCE_LABELS[item.source as SourceKey] ?? item.source}
                  </span>
                  <span style={{
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    color: SENTIMENT_COLOR[item.sentiment] ?? '#6B7280',
                    background: (SENTIMENT_COLOR[item.sentiment] ?? '#6B7280') + '22',
                  }}>
                    {item.sentiment}
                  </span>
                  {item.publishedAt && (
                    <span style={{ color: '#4B5563', fontSize: '11px', fontFamily: 'monospace' }}>{item.publishedAt}</span>
                  )}
                </div>

                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#F5F5F5', fontSize: '14px', fontWeight: 600, textDecoration: 'none', lineHeight: 1.4, display: 'block' }}
                >
                  {item.title}
                </a>

                {item.snippet && (
                  <p style={{ color: '#9CA3AF', fontSize: '12px', lineHeight: 1.6, margin: 0 }}>{item.snippet}</p>
                )}

                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#3B82F6', fontSize: '11px', fontFamily: 'monospace', textDecoration: 'none', wordBreak: 'break-all' }}
                >
                  🔗 {item.url}
                </a>
              </div>
            ))
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #1F1F1F', color: '#4B5563', fontSize: '11px', fontFamily: 'monospace' }}>
          {items.length} item{items.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
