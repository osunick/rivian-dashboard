'use client';

import { useEffect, useState } from 'react';

type Quote = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
};

const SYMBOLS = ['RIVN', 'TSLA', 'GM', 'F'];

export default function StockTicker({ ambient = false }: { ambient?: boolean }) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`/api/market-quote?symbols=${SYMBOLS.join(',')}`);
        if (!response.ok) return;
        const data = await response.json() as { quotes?: Quote[]; updatedAt?: string };
        if (!cancelled && data.quotes?.length) {
          setQuotes(data.quotes);
          setUpdatedAt(data.updatedAt ?? null);
        }
      } catch {
        // The dashboard stays useful if the public quote feed is temporarily unavailable.
      }
    };
    load();
    const interval = window.setInterval(load, 60_000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, []);

  const baseClass = ambient
    ? 'border border-white/15 bg-black/30 text-white backdrop-blur-md'
    : 'rounded-lg border border-claude-border bg-white/75 text-claude-text shadow-sm';
  const mutedClass = ambient ? 'text-white/45' : 'text-claude-muted';

  return (
    <div className={`${baseClass} min-w-0 overflow-hidden`} aria-label="Live market watch">
      <div className="flex items-center gap-3 overflow-x-auto px-3 py-2.5 sm:px-4">
        <span className={`shrink-0 font-mono-num text-[10px] uppercase tracking-[0.18em] ${mutedClass}`}>
          Market watch
        </span>
        <span className={`h-4 w-px shrink-0 ${ambient ? 'bg-white/15' : 'bg-claude-border'}`} />
        {quotes.length === 0 ? (
          <span className={`font-mono-num text-xs ${mutedClass}`}>Loading quotes…</span>
        ) : quotes.map(quote => {
          const up = quote.change >= 0;
          return (
            <div key={quote.symbol} className="flex shrink-0 items-baseline gap-1.5 font-mono-num text-xs tabular-nums">
              <span className="font-semibold">{quote.symbol}</span>
              <span>${quote.price.toFixed(2)}</span>
              <span className={up ? (ambient ? 'text-[#42f59b]' : 'text-[#087047]') : (ambient ? 'text-[#ff6b57]' : 'text-[#B42318]')}>
                {up ? '▲' : '▼'} {Math.abs(quote.changePercent).toFixed(2)}%
              </span>
            </div>
          );
        })}
        {updatedAt && <span className={`ml-auto shrink-0 font-mono-num text-[9px] uppercase tracking-[0.12em] ${mutedClass}`}>Live</span>}
      </div>
    </div>
  );
}
