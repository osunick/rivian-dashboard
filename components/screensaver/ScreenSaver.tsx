'use client';

export interface AmbientSignal {
  title: string;
  snippet: string;
  url: string;
  source: string;
  category: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  themes: string[];
  publishedAt: string;
}

interface TrendPoint {
  label: string;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
}

interface Leader {
  label: string;
  count: number;
}

interface ScreenSaverProps {
  generatedAt: string;
  threatLevel: 'high' | 'elevated' | 'medium' | 'low';
  summary: string;
  competitiveContext: string;
  signals: AmbientSignal[];
  trend: TrendPoint[];
  sourceLeaders: Leader[];
  categoryLeaders: Leader[];
}

const threatCopy = {
  high: 'Critical',
  elevated: 'Elevated',
  medium: 'Monitoring',
  low: 'Clear',
} as const;

const sentimentTone = {
  positive: 'text-[#42f59b] border-[#42f59b]/40 bg-[#42f59b]/10',
  neutral: 'text-[#b9c2ce] border-white/15 bg-white/8',
  negative: 'text-[#ff6b57] border-[#ff6b57]/45 bg-[#ff6b57]/12',
} as const;

function firstSentence(value: string) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  const match = normalized.match(/^(.{80,220}?[.!?])\s/);
  return match?.[1] ?? normalized.slice(0, 220);
}

function signalReadout(signal: AmbientSignal) {
  const text = signal.snippet.replace(/\s+/g, ' ').trim();
  if (!text) {
    const category = signal.category.toLowerCase() === 'other'
      ? 'general intelligence'
      : `${signal.category.toLowerCase()} intelligence`;
    const themeText = signal.themes.length > 0
      ? ` It is tied to ${signal.themes.join(', ')}.`
      : '';
    return `${signal.source} is carrying ${category} around ${signal.title}.${themeText}`;
  }

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .join(' ');

  return sentences.length > 340 ? `${sentences.slice(0, 337).trim()}...` : sentences;
}

function signalContext(signal: AmbientSignal) {
  const themeText = signal.themes.length > 0 ? ` Themes: ${signal.themes.join(', ')}.` : '';
  return `${signal.source} signal in ${signal.category.toLowerCase()} from ${formatSignalDate(signal.publishedAt)}.${themeText}`;
}

function formatSignalDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recent';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Los_Angeles',
  });
}

export default function ScreenSaver({
  generatedAt,
  threatLevel,
  summary,
  competitiveContext,
  signals,
  trend,
  sourceLeaders,
  categoryLeaders,
}: ScreenSaverProps) {
  const featured = signals.slice(0, 6);
  const tickerSignals = signals.length > 0 ? signals : [{
    title: 'Awaiting the next GameFilm scan',
    snippet: 'No recent signals are available yet.',
    url: '',
    source: 'GameFilm',
    category: 'Status',
    sentiment: 'neutral' as const,
    themes: [],
    publishedAt: new Date().toISOString(),
  }];
  const totalSignals = signals.length;
  const latestTrendTotal = trend[trend.length - 1]?.total ?? 0;
  const maxTrendTotal = Math.max(...trend.map(point => point.total), 1);

  return (
    <main className="ambient-screen h-screen overflow-hidden bg-[#05070b] text-white">
      <div className="ambient-backdrop" />
      <div className="scanlines" />

      <section className="relative z-10 grid h-screen grid-rows-[auto_minmax(0,1fr)_auto] px-7 py-6 lg:px-10 lg:py-7">
        <header className="flex items-start justify-between gap-8">
          <div>
            <div className="font-mono-num text-sm uppercase tracking-[0.26em] text-[#70e4ff]">GameFilm Ambient</div>
            <h1 className="mt-2 font-poster text-[clamp(4.2rem,7.5vw,8.8rem)] uppercase leading-[0.78] text-white">
              Rivian Watch
            </h1>
          </div>
          <div className="min-w-[18rem] border border-white/15 bg-black/30 px-5 py-3 text-right backdrop-blur-md">
            <div className="font-mono-num text-xs uppercase tracking-[0.2em] text-white/45">Last Scan</div>
            <div className="mt-2 text-2xl font-semibold text-white">{generatedAt}</div>
            <div className={`mt-4 inline-flex border px-3 py-1 font-mono-num text-sm uppercase tracking-[0.16em] ${sentimentTone[threatLevel === 'low' ? 'positive' : threatLevel === 'medium' ? 'neutral' : 'negative']}`}>
              {threatCopy[threatLevel]}
            </div>
          </div>
        </header>

        <div className="grid min-h-0 grid-cols-[1.18fr_0.82fr] gap-7 py-6">
          <section className="relative min-h-0 overflow-hidden border border-white/12 bg-white/[0.035] p-6 shadow-2xl shadow-black/40 backdrop-blur-md">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#70e4ff] to-transparent" />
            <div className="flex items-center justify-between gap-5">
              <div className="font-mono-num text-sm uppercase tracking-[0.24em] text-white/50">Seven Day Intelligence Loop</div>
              <div className="font-mono-num text-sm text-white/55">{totalSignals} signals</div>
            </div>

            <div className="signal-stage mt-6">
              {featured.map((signal, index) => (
                <article
                  key={`${signal.url}-${index}`}
                  className="signal-slide"
                  style={{ animationDelay: `${index * 8}s` }}
                >
                  <div className="flex items-center gap-3">
                    <span className={`border px-3 py-1 font-mono-num text-xs uppercase tracking-[0.18em] ${sentimentTone[signal.sentiment]}`}>
                      {signal.sentiment}
                    </span>
                    <span className="font-mono-num text-sm uppercase tracking-[0.18em] text-[#ffd166]">
                      {signal.category}
                    </span>
                    <span className="font-mono-num text-sm text-white/40">{formatSignalDate(signal.publishedAt)}</span>
                  </div>
                  <h2 className="mt-5 max-w-[22ch] text-[clamp(2.3rem,3.5vw,4.8rem)] font-black uppercase leading-[0.92] tracking-normal text-white">
                    {signal.title}
                  </h2>
                  <p className="mt-6 max-w-5xl text-[clamp(1.7rem,2.3vw,3rem)] font-semibold leading-[1.05] text-white/84">
                    {signalReadout(signal)}
                  </p>
                  <p className="mt-5 max-w-4xl border-l-2 border-[#70e4ff]/55 pl-5 text-[clamp(1rem,1.15vw,1.35rem)] leading-snug text-white/62">
                    {signalContext(signal)}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <span className="border border-white/14 bg-white/8 px-4 py-2 font-mono-num text-sm uppercase tracking-[0.16em] text-white/70">
                      {signal.source}
                    </span>
                    {signal.themes.map(theme => (
                      <span key={theme} className="border border-[#70e4ff]/25 bg-[#70e4ff]/10 px-4 py-2 font-mono-num text-sm uppercase tracking-[0.16em] text-[#b8f4ff]">
                        {theme}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-5">
            <section className="border border-white/12 bg-black/34 p-5 backdrop-blur-md">
              <div className="font-mono-num text-sm uppercase tracking-[0.22em] text-white/45">Executive Read</div>
              <p className="mt-3 text-[clamp(1.25rem,1.55vw,1.85rem)] font-semibold leading-tight text-white">
                {firstSentence(summary)}
              </p>
              {competitiveContext ? (
                <p className="mt-4 text-lg leading-snug text-white/62">{firstSentence(competitiveContext)}</p>
              ) : null}
            </section>

            <section className="grid grid-cols-2 gap-5">
              <div className="border border-white/12 bg-white/[0.035] p-4 backdrop-blur-md">
                <div className="font-mono-num text-xs uppercase tracking-[0.22em] text-white/45">Source Heat</div>
                <div className="mt-4 space-y-3">
                  {sourceLeaders.map(source => (
                    <MetricRow key={source.label} label={source.label} value={source.count} max={sourceLeaders[0]?.count ?? 1} />
                  ))}
                </div>
              </div>
              <div className="border border-white/12 bg-white/[0.035] p-4 backdrop-blur-md">
                <div className="font-mono-num text-xs uppercase tracking-[0.22em] text-white/45">Topic Heat</div>
                <div className="mt-4 space-y-3">
                  {categoryLeaders.map(category => (
                    <MetricRow key={category.label} label={category.label} value={category.count} max={categoryLeaders[0]?.count ?? 1} />
                  ))}
                </div>
              </div>
            </section>

            <section className="min-h-0 border border-white/12 bg-black/34 p-5 backdrop-blur-md">
              <div className="flex items-center justify-between gap-5">
                <div className="font-mono-num text-sm uppercase tracking-[0.22em] text-white/45">Publish Tempo</div>
                <div className="font-mono-num text-sm text-[#70e4ff]">{latestTrendTotal} latest</div>
              </div>
              <div className="mt-5 flex h-full min-h-0 items-end gap-4 pb-7">
                {trend.map(point => (
                  <div key={point.label} className="flex h-full flex-1 flex-col justify-end gap-2">
                    <div className="relative min-h-2 overflow-hidden bg-white/8">
                      <div
                        className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#ff6b57] via-[#ffd166] to-[#42f59b]"
                        style={{ height: `${Math.max(8, (point.total / maxTrendTotal) * 100)}%` }}
                      />
                    </div>
                    <div className="text-center font-mono-num text-xs text-white/50">{point.label}</div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>

        <footer className="overflow-hidden border-y border-white/12 bg-black/46 py-3 backdrop-blur-md">
          <div className="ticker-track flex whitespace-nowrap font-mono-num text-xl uppercase tracking-[0.08em] text-white/78">
            {[...tickerSignals, ...tickerSignals].map((signal, index) => (
              <span key={`${signal.title}-${index}`} className="mx-8">
                <span className="text-[#70e4ff]">{signal.source}</span>
                <span className="mx-4 text-white/28">/</span>
                {signal.title}
              </span>
            ))}
          </div>
        </footer>
      </section>

      <style jsx global>{`
        .ambient-screen {
          font-family: var(--font-display), ui-sans-serif, system-ui, sans-serif;
        }

        .ambient-backdrop {
          position: fixed;
          inset: 0;
          background:
            radial-gradient(circle at 18% 18%, rgba(112, 228, 255, 0.22), transparent 28%),
            radial-gradient(circle at 82% 22%, rgba(255, 107, 87, 0.18), transparent 26%),
            radial-gradient(circle at 50% 86%, rgba(66, 245, 155, 0.16), transparent 32%),
            linear-gradient(135deg, #05070b 0%, #11151d 42%, #090b10 100%);
          animation: ambient-drift 22s ease-in-out infinite alternate;
        }

        .ambient-backdrop::after {
          content: '';
          position: absolute;
          inset: -12%;
          background:
            linear-gradient(115deg, transparent 0 42%, rgba(112, 228, 255, 0.12) 48%, transparent 55%),
            linear-gradient(72deg, transparent 0 58%, rgba(255, 209, 102, 0.10) 62%, transparent 70%);
          animation: light-sweep 18s linear infinite;
        }

        .scanlines {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 20;
          opacity: 0.15;
          background-image: repeating-linear-gradient(
            to bottom,
            rgba(255, 255, 255, 0.22) 0,
            rgba(255, 255, 255, 0.22) 1px,
            transparent 1px,
            transparent 5px
          );
          mix-blend-mode: overlay;
        }

        .signal-stage {
          position: relative;
          height: 100%;
          min-height: 0;
        }

        .signal-slide {
          position: absolute;
          inset: 0;
          opacity: 0;
          transform: translateY(28px) scale(0.985);
          animation: signal-cycle 48s ease-in-out infinite;
        }

        .signal-slide:first-child {
          opacity: 1;
        }

        .ticker-track {
          width: max-content;
          animation: ticker-scroll 80s linear infinite;
        }

        @keyframes signal-cycle {
          0%,
          13% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          18%,
          100% {
            opacity: 0;
            transform: translateY(-26px) scale(1.012);
          }
        }

        @keyframes ticker-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        @keyframes ambient-drift {
          from {
            filter: hue-rotate(0deg) saturate(1);
            transform: scale(1);
          }
          to {
            filter: hue-rotate(14deg) saturate(1.18);
            transform: scale(1.03);
          }
        }

        @keyframes light-sweep {
          from {
            transform: translateX(-16%) rotate(0deg);
          }
          to {
            transform: translateX(16%) rotate(4deg);
          }
        }

        @media (max-width: 1100px) {
          .ambient-screen section.relative.z-10 {
            grid-template-rows: auto auto auto;
          }

          .ambient-screen .grid.min-h-0.grid-cols-\\[1\\.18fr_0\\.82fr\\] {
            grid-template-columns: 1fr;
          }

          .signal-stage {
            min-height: 58vh;
          }
        }
      `}</style>
    </main>
  );
}

function MetricRow({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-4 font-mono-num text-xs uppercase tracking-[0.12em] text-white/60">
        <span className="truncate">{label}</span>
        <span className="text-white/82">{value}</span>
      </div>
      <div className="h-2 overflow-hidden bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-[#70e4ff] via-[#ffd166] to-[#42f59b]"
          style={{ width: `${Math.max(8, (value / Math.max(max, 1)) * 100)}%` }}
        />
      </div>
    </div>
  );
}
