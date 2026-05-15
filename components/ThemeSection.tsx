'use client';

import { useState } from 'react';
import ThemeFrequencyChart from './ThemeFrequencyChart';
import ThemeModal from './ThemeModal';

interface ThemeEntry {
  theme: string;
  count: number;
}

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
  themes: ThemeEntry[];
  themeItemsMap: Record<string, Item[]>;
}

export default function ThemeSection({ themes, themeItemsMap }: Props) {
  const [activeTheme, setActiveTheme] = useState<string | null>(null);

  return (
    <>
      <ThemeFrequencyChart data={themes} onThemeClick={setActiveTheme} />

      {activeTheme && (
        <ThemeModal
          theme={activeTheme}
          items={themeItemsMap[activeTheme] ?? []}
          onClose={() => setActiveTheme(null)}
        />
      )}
    </>
  );
}
