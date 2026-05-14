export type SentimentLabel = 'positive' | 'neutral' | 'negative';

export interface ReportItem {
  title: string;
  url: string;
  source: string; // SourceKey
  sentiment: SentimentLabel;
  snippet: string;
}

export interface SourceData {
  found: number;
  sentiment: SentimentLabel | null;
}

export interface Report {
  id: string;
  timestamp: string;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  sources: {
    reddit_rivian: SourceData;
    reddit_ev: SourceData;
    reddit_sdc: SourceData;
    rivianforums: SourceData;
    news: SourceData;
    twitter: SourceData;
    youtube: SourceData;
    hackernews: SourceData;
  };
  themes: string[];
  competitiveContext: string;
  summary: string;
  fullReport: string;
  items: ReportItem[];
  scanError?: string;
}

export type SourceKey = keyof Report['sources'];

export const SOURCE_LABELS: Record<SourceKey, string> = {
  reddit_rivian: 'r/Rivian',
  reddit_ev:     'r/electricvehicles',
  reddit_sdc:    'r/SelfDrivingCars',
  rivianforums:  'RivianForums',
  news:          'News',
  twitter:       'Twitter/X',
  youtube:       'YouTube',
  hackernews:    'HackerNews',
};

export const SOURCE_KEYS: SourceKey[] = [
  'reddit_rivian',
  'reddit_ev',
  'reddit_sdc',
  'rivianforums',
  'news',
  'twitter',
  'youtube',
  'hackernews',
];
