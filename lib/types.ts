export type SentimentLabel = 'positive' | 'neutral' | 'negative';

export type CategoryKey =
  | 'autonomy'
  | 'demo_drives'
  | 'vehicles'
  | 'business'
  | 'software'
  | 'community'
  | 'competitive';

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  autonomy:    '🤖 Autonomy',
  demo_drives: '🧪 Demo & Test Drives',
  vehicles:    '🚗 Vehicles & Products',
  business:    '💰 Business & Finance',
  software:    '📱 Software & Tech',
  community:   '🌐 Community',
  competitive: '⚔️ Competitive Intel',
};

export const CATEGORY_KEYS: CategoryKey[] = [
  'autonomy', 'demo_drives', 'vehicles', 'business', 'software', 'community', 'competitive',
];

export interface ReportItem {
  title: string;
  url: string;
  source: string; // SourceKey
  sentiment: SentimentLabel;
  snippet: string;
  category?: CategoryKey;
  publishedAt?: string | null;
  themes?: string[]; // Short 2-4 word tags, e.g. "FSD update", "RIVN stock"
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
    reddit_rivian_r2?: SourceData;
    reddit_ev: SourceData;
    reddit_sdc: SourceData;
    reddit_stocks?: SourceData;
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

export type SourceKey = keyof Report['sources'] | string;

export const SOURCE_LABELS: Record<SourceKey, string> = {
  reddit_rivian:    'r/Rivian',
  reddit_rivian_r2: 'r/RivianR2',
  reddit_ev:        'r/electricvehicles',
  reddit_sdc:       'r/SelfDrivingCars',
  reddit_stocks:    'r/stocks',
  rivianforums:  'RivianForums',
  news:          'News',
  twitter:       'Twitter/X',
  youtube:       'YouTube',
  hackernews:    'HackerNews',
};

export const SOURCE_KEYS: SourceKey[] = [
  'reddit_rivian',
  'reddit_rivian_r2',
  'reddit_ev',
  'reddit_sdc',
  'reddit_stocks',
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
    keywords: ['tesla', 'tsla', 'model y', 'model 3', 'model x', 'model s', 'cybertruck', 'fsd', 'grok', 'optimus', 'tesla robotaxi', 'cybercab', 'tesla supervised'],
    vehicles: [
      { competitorModel: 'Model Y (base)', competitorPrice: 44990, rivianRival: 'R2 (base)', rivianPrice: 45000 },
      { competitorModel: 'Model Y Perf', competitorPrice: 58880, rivianRival: 'R2 Perf', rivianPrice: 57990, note: 'R2 undercuts by $890' },
      { competitorModel: 'Cybertruck', competitorPrice: 79990, rivianRival: 'R1T (base)', rivianPrice: 71500, note: 'R1T undercuts by $8,490' },
    ],
    defaultThreat: 'high',
  },
  {
    id: 'robotaxi',
    name: 'Robotaxis / L4',
    segment: 'Autonomous Mobility',
    tagline: 'Waymo, Aurora, Cruise, Zoox, Mobileye',
    keywords: ['waymo', 'aurora', 'cruise', 'zoox', 'mobileye', 'uber av', 'robotaxi', 'lidar', 'full self-driving', 'unsupervised fsd', 'waymo one', 'waymo driver', 'aurora driver', 'robotaxi launch', 'driverless', ' autonomous vehicle', 'av startup'],
    vehicles: [],
    defaultThreat: 'elevated',
  },
  {
    id: 'oems',
    name: 'Legacy OEMs',
    segment: 'Traditional Auto',
    tagline: 'Ford, GM/Chevy, Toyota, Honda, Stellantis',
    keywords: ['ford', 'f-150 lightning', 'lightning', 'mach-e', 'mustang mach-e', 'gm', 'general motors', 'chevrolet', 'chevy', 'silverado ev', 'equinox ev', 'hummer ev', 'toyota', 'honda', 'stellantis', 'ram ev', 'blazer ev', 'volt', 'olt', 'scout motors', 'Volkswagen', 'vw', 'id4', 'id.4', 'bmw', 'mercedes', 'audi', 'jaguar', 'land rover', 'lithium'],
    vehicles: [
      { competitorModel: 'Equinox EV', competitorPrice: 34995, rivianRival: 'R2 (base)', rivianPrice: 45000, note: 'Equinox $10K cheaper' },
      { competitorModel: 'F-150 Lightning', competitorPrice: 49995, rivianRival: 'R1T (base)', rivianPrice: 71500, note: 'R1T is premium tier' },
      { competitorModel: 'Mach-E (base)', competitorPrice: 42995, rivianRival: 'R2 (base)', rivianPrice: 45000, note: 'Mach-E ~$2K cheaper' },
    ],
    defaultThreat: 'medium',
  },
  {
    id: 'chinese_av',
    name: 'Chinese AVs',
    segment: 'China EV & Autonomy',
    tagline: 'BYD, XPeng, NIO, Li Auto, Huawei, Baidu',
    keywords: ['byd', 'xpev', 'xpeng', 'nio', 'li auto', 'liauto', 'huawei', 'baidu', 'apollo', 'xiaomi su7', 'byd seal', 'byd yangwang', 'byd dolphin', 'zeekr', 'polestar', ' IM motor', 'smart ev', 'tencent', 'tencent maps', 'meizu', 'xpeng x2', 'nio phone', 'byd blade', 'chinese ev', 'china ev', 'CATL'],
    vehicles: [
      { competitorModel: 'XPeng G6', competitorPrice: 35000, rivianRival: 'R2 (base)', rivianPrice: 45000, note: 'XPeng G6 ~$10K cheaper' },
      { competitorModel: 'BYD Seal', competitorPrice: 30000, rivianRival: 'R2 (base)', rivianPrice: 45000, note: 'BYD Seal ~$15K cheaper' },
    ],
    defaultThreat: 'low',
  },
];
