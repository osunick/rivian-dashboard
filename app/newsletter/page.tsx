import Link from 'next/link';
import { getNewsletter } from '@/lib/data';

export const dynamic = 'force-dynamic';

function formatRange(start: string, end: string) {
  const fmt = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', timeZone: 'UTC',
    });
  };
  const year = end.split('-')[0];
  return `${fmt(start)} – ${fmt(end)}, ${year}`;
}

function hostLabel(url: string, fallback: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return fallback;
  }
}

export default function NewsletterPage() {
  const nl = getNewsletter();

  return (
    <main className="min-h-screen px-3 py-5 sm:px-6 sm:py-7">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="font-mono-num text-[11px] uppercase tracking-[0.18em] text-claude-muted transition-colors hover:text-marvel-red"
          >
            ← Dashboard
          </Link>
          {nl && (
            <span className="font-mono-num text-[10px] uppercase tracking-[0.18em] text-claude-muted/70">
              Edition #{nl.edition}
            </span>
          )}
        </div>

        {!nl ? (
          <div className="rounded-xl border border-claude-border bg-claude-card/80 px-8 py-16 text-center shadow-cinematic">
            <div className="font-mono-num text-[12px] uppercase tracking-[0.28em] text-marvel-red">GameFilm Weekly</div>
            <h1 className="mt-4 text-2xl font-semibold text-claude-text">No edition published yet</h1>
            <p className="mx-auto mt-3 max-w-md text-claude-muted">
              The first weekly newsletter will appear here once it&apos;s generated.
            </p>
          </div>
        ) : (
          <article className="overflow-hidden rounded-xl border border-claude-border bg-claude-card/80 shadow-cinematic">
            <header className="edge-top-red grain relative overflow-hidden border-b border-white/[0.06] bg-gradient-to-b from-[#16161C] to-[#0C0C10] px-6 py-7 sm:px-8">
              <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-marvel-red/15 blur-3xl" />
              <div className="relative">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="marvel-chip rounded-[3px] px-2 py-1 text-[12px] leading-none">GAMEFILM WEEKLY</span>
                  <span className="font-mono-num text-[10px] uppercase tracking-[0.22em] text-claude-muted">
                    {formatRange(nl.weekStart, nl.weekEnd)}
                  </span>
                </div>
                <h1 className="poster-mark mt-4 text-4xl text-claude-text sm:text-5xl">
                  RIVIAN <span className="text-marvel-red">INTEL</span> WEEKLY
                </h1>
                {nl.subtitle && (
                  <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-claude-text/90">{nl.subtitle}</p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 font-mono-num text-[11px] text-claude-muted">
                  <span>{nl.signalCount} signals</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#2DD4A7]" /> {nl.sentiment.positive} positive</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#8B8F99]" /> {nl.sentiment.neutral} neutral</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#F0453A]" /> {nl.sentiment.negative} negative</span>
                </div>
              </div>
            </header>

            <div className="space-y-8 px-6 py-7 sm:px-8">
              {nl.sections.map((section, si) => (
                <section key={si}>
                  <h2 className="flex items-center gap-2.5 text-[17px] font-semibold tracking-tight text-claude-text">
                    <span className="h-4 w-[3px] rounded-full bg-marvel-red" />
                    {section.emoji ? `${section.emoji} ` : ''}{section.heading}
                  </h2>
                  <div className="mt-3 space-y-5">
                    {section.items.map((item, ii) => (
                      <div key={ii} className="border-l border-white/[0.08] pl-4">
                        <h3 className="text-[15px] font-semibold leading-snug text-claude-text">{item.headline}</h3>
                        {item.body && (
                          <p className="mt-1.5 text-[14px] leading-relaxed text-claude-text/80">{item.body}</p>
                        )}
                        {item.links.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {item.links.map((l, li) => (
                              <a
                                key={li}
                                href={l.url}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 font-mono-num text-[10px] uppercase tracking-[0.1em] text-claude-muted transition-colors hover:border-marvel-red/40 hover:text-marvel-red"
                              >
                                {l.label || hostLabel(l.url, 'source')} ↗
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))}

              {nl.watchList.length > 0 && (
                <section className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-5 py-4">
                  <h2 className="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight text-claude-text">
                    <span className="h-3.5 w-[3px] rounded-full bg-marvel-gold" />
                    📌 Watch List
                  </h2>
                  <ul className="mt-3 space-y-2">
                    {nl.watchList.map((w, wi) => (
                      <li key={wi} className="flex gap-2.5 text-[14px] leading-relaxed text-claude-text/85">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-marvel-red/70" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <footer className="border-t border-white/[0.06] bg-[#0C0C10] px-6 py-3 font-mono-num text-[10px] uppercase tracking-[0.18em] text-claude-muted/70 sm:px-8">
              Authored by GameFilm · Edition #{nl.edition} · {formatRange(nl.weekStart, nl.weekEnd)}
            </footer>
          </article>
        )}
      </div>
    </main>
  );
}
