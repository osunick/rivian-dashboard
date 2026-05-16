export type SentimentLabel = 'positive' | 'neutral' | 'negative';

export type CategoryKey = 'autonomy' | 'vehicles' | 'business' | 'software' | 'community' | 'competitive';

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  autonomy:    '🤖 Autonomy',
  vehicles:    '🚗 Vehicles & Products',
  business:    '💰 Business & Finance',
  software:    '📱 Software & Tech',
  community:   '🌐 Community',
  competitive: '⚔️ Competitive Intel',
};

export const CATEGORY_KEYS: CategoryKey[] = [
  'autonomy', 'vehicles', 'business', 'software', 'community', 'competitive',
];

export interface ReportItem {
  title: string;
  url: string;
  source: string; // SourceKey
  sentiment: SentimentLabel;
  snippet: string;
  category?: CategoryKey;
  publishedAt?: string | null;
}

export interface SourceData {
  found: number;
  sentiment: SentimentLabel | null;
}

export interface CategoryData {
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
  categories?: Partial<Record<CategoryKey, CategoryData>>;
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
