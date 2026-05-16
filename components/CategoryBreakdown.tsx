'use client';

import { useState } from 'react';
import { CategoryKey } from '@/lib/types';
import ThemeModal from './ThemeModal';

interface CategoryEntry {
  key: CategoryKey;
  label: string;
  found: number;
  sentiment: string | null;
}

interface Item {
  title: string;
  url: string;
  source: string;
  sentiment: string;
  publishedAt?: string | null;
  snippet?: string;
  reportTimestamp: string;
  category?: string;
}

interface Props {
  categories: CategoryEntry[];
  itemsMap: Record<string, Item[]>;
}

const SENTIMENT_COLOR: Record<string, string> = {
  positive: '#22C55E',
  neutral:  '#6B7280',
  negative: '#EF4444',
};

export default function CategoryBreakdown({ categories, itemsMap }: Props) {
  const [active, setActive] = useState<{ key: CategoryKey; label: string } | null>(null);
  const max = Math.max(...categories.map(c => c.found), 1);

  return (
    <>
      <div className="space-y-2">
        {categories.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActive({ key: cat.key, label: cat.label })}
            className="w-full text-left group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[#9CA3AF] text-xs font-mono group-hover:text-[#F5F5F5] transition-colors">
                {cat.label}
              </span>
              <span className="text-[#6B7280] text-xs font-mono">
                {cat.found} item{cat.found !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="h-2 bg-[#1F1F1F] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all group-hover:opacity-90"
                style={{
                  width: `${(cat.found / max) * 100}%`,
                  background: 'linear-gradient(90deg, #3B82F6 0%, #60A5FA 100%)',
                }}
              />
            </div>
          </button>
        ))}

        {categories.length === 0 && (
          <div className="text-[#6B7280] text-xs font-mono py-6 text-center">
            No category data yet — appears after next scan
          </div>
        )}
      </div>

      {active && (
        <ThemeModal
          theme={active.label}
          items={itemsMap[active.key] ?? []}
          onClose={() => setActive(null)}
        />
      )}
    </>
  );
}
