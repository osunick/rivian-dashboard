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

// ─── Competitor Intelligence ────────────────────────────────────────────────

export type ThreatLevel = 'high' | 'elevated' | 'medium' | 'low';

export interface VehicleComparison {
  competitorModel: string;
  competitorPrice: number;       // USD base MSRP
  rivianRival: string;
  rivianPrice: number;
  note?: string;
}

export interface CompetitorProfile {
  id: string;
  name: string;
  ticker?: string;
  segment: string;
  tagline: string;
  keywords: string[];            // Used to match items from reports
  vehicles: VehicleComparison[];
  defaultThreat: ThreatLevel;
}

export const COMPETITORS: CompetitorProfile[] = [
  {
    id: 'tesla',
    name: 'Tesla',
    ticker: 'TSLA',
    segment: 'EV & Autonomy',
    tagline: 'Model Y, Cybertruck, FSD, Grok',
    keywords: ['tesla', 'tsla', 'model y', 'model 3', 'cybertruck', 'fsd', 'grok', 'optimus'],
    vehicles: [
      { competitorModel: 'Model Y (base)', competitorPrice: 44990, rivianRival: 'R2 (base)', rivianPrice: 45000 },
      { competitorModel: 'Model Y Perf', competitorPrice: 58880, rivianRival: 'R2 Perf', rivianPrice: 57990, note: 'R2 undercuts by $890' },
      { competitorModel: 'Cybertruck', competitorPrice: 79990, rivianRival: 'R1T (base)', rivianPrice: 71500, note: 'R1T undercuts by $8,490' },
    ],
    defaultThreat: 'high',
  },
  {
    id: 'ford',
    name: 'Ford',
    ticker: 'F',
    segment: 'Trucks & SUVs',
    tagline: 'F-150 Lightning, Explorer EV',
    keywords: ['ford', 'f-150 lightning', 'lightning', 'explorer ev', 'mach-e', 'argo'],
    vehicles: [
      { competitorModel: 'Explorer EV', competitorPrice: 42995, rivianRival: 'R2 (base)', rivianPrice: 45000, note: 'Explorer $2K cheaper' },
      { competitorModel: 'F-150 Lightning', competitorPrice: 49995, rivianRival: 'R1T (base)', rivianPrice: 71500, note: 'R1T is premium tier' },
    ],
    defaultThreat: 'medium',
  },
  {
    id: 'gm',
    name: 'GM / Chevy',
    ticker: 'GM',
    segment: 'Scale & Price',
    tagline: 'Silverado EV, Equinox EV, Cruise',
    keywords: ['gm', 'general motors', 'chevrolet', 'chevy', 'silverado ev', 'equinox ev', 'cruise', 'hummer ev'],
    vehicles: [
      { competitorModel: 'Equinox EV', competitorPrice: 34995, rivianRival: 'R2 (base)', rivianPrice: 45000, note: 'Equinox $10K cheaper' },
      { competitorModel: 'Silverado EV', competitorPrice: 41995, rivianRival: 'R1T (base)', rivianPrice: 71500, note: 'R1T is premium tier' },
    ],
    defaultThreat: 'medium',
  },
  {
    id: 'autonomy',
    name: 'Autonomy Race',
    segment: 'ADAS & Robotaxi',
    tagline: 'Waymo, Tesla FSD, Uber AV, Aurora',
    keywords: ['waymo', 'aurora', 'mobileye', 'cruise', 'zoox', 'uber av', 'robotaxi', 'lidar', 'tesla fsd', 'full self-driving'],
    vehicles: [],
    defaultThreat: 'elevated',
  },
];
