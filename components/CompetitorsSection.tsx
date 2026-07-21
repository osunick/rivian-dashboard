'use client';

import { useState } from 'react';
import ThemeModal from './ThemeModal';
import { CompetitorProfile, ThreatLevel } from '@/lib/types';

type CompetitorItem = {
  title: string;
  url: string;
  source: string;
  sentiment: string;
  snippet?: string;
  publishedAt?: string | null;
  reportTimestamp: string;
};

type CompetitorEntry = {
  competitor: CompetitorProfile;
  count: number;
  threat: ThreatLevel;
  latestItem: CompetitorItem | null;
  items: CompetitorItem[];
};

interface Props {
  competitors: CompetitorEntry[];
  threatStyles: Record<ThreatLevel, { label: string; tone: string }>;
}

export default function CompetitorsSection({ competitors, threatStyles }: Props) {
  const [activeCompetitorId, setActiveCompetitorId] = useState<string | null>(null);

  const activeCompetitor = competitors.find(entry => entry.competitor.id === activeCompetitorId) ?? null;

  return (
    <>
      <div className="space-y-3">
        {competitors.map(({ competitor, count, threat, latestItem, items }) => (
          <div key={competitor.id} className="rounded-lg border border-claude-border bg-white/70 p-3 transition-colors hover:border-claude-accent/45 hover:bg-[#F7FAFF]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[13px] font-semibold text-claude-text">{competitor.name}</div>
                <div className="font-mono-num text-[11px] text-claude-muted">{competitor.tagline}</div>
              </div>
              <button
                type="button"
                onClick={() => items.length > 0 && setActiveCompetitorId(competitor.id)}
                disabled={items.length === 0}
                className={`rounded-full border px-2 py-1 font-mono-num text-[11px] font-semibold ${threatStyles[threat].tone} ${items.length > 0 ? 'cursor-pointer' : 'cursor-default opacity-70'}`}
                title={items.length > 0 ? `Open ${competitor.name} competitor signals` : `No ${competitor.name} signals in scope`}
              >
                {count}
              </button>
            </div>

            <div className="mt-2">
              {latestItem ? (
                <a
                  href={latestItem.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[13px] leading-5 text-claude-muted hover:text-claude-accent transition-colors"
                >
                  {latestItem.title}
                </a>
              ) : (
                <div className="text-[13px] leading-5 text-claude-muted/70">No recent matched items.</div>
              )}
            </div>

            {items.length > 1 ? (
              <button
                type="button"
                onClick={() => setActiveCompetitorId(competitor.id)}
                className="mt-2 font-mono-num text-[10px] uppercase tracking-[0.12em] text-claude-muted hover:text-claude-accent transition-colors"
              >
                View all {items.length} signals
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {activeCompetitor ? (
        <ThemeModal
          theme={`${activeCompetitor.competitor.name} competitor signals`}
          items={activeCompetitor.items}
          onClose={() => setActiveCompetitorId(null)}
        />
      ) : null}
    </>
  );
}
