#!/usr/bin/env python3
"""
fetch_gamefilm.py — Pre-fetch all GameFilm sources and output new raw items.
Tavily-free version — uses Playwright browser scraping + direct APIs.

Sources:
  Reddit       — Playwright → reddit.com/r/{sub}/search
  HackerNews   — Algolia HN API
  RSS feeds    — Direct RSS (AP, Reuters, Bloomberg, CNBC, etc.)
  Playwright   — News site searches (NYT, WSJ, Reuters, Bloomberg, etc.)
  Bluesky      — Public Bluesky AT Protocol API
  YouTube      — YouTube Data API v3
  RivianForums — Playwright → UHF/autonomy forum (Cloudflare-gated)
  Twitter/X    — Official X API v2 recent search (requires X_BEARER_TOKEN)

Usage:
  python3 scripts/fetch_gamefilm.py > /tmp/gamefilm_raw.json
"""

import json, sys, os, time, urllib.request, urllib.error, subprocess
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
import xml.etree.ElementTree as ET

SCRIPT_DIR = os.path.abspath(os.path.dirname(__file__))
REPORTS_FILE = os.path.join(SCRIPT_DIR, '..', 'public', 'data', 'reports.json')
PT = ZoneInfo('America/Los_Angeles')
TODAY_PT = datetime.now(PT).date()
DEFAULT_YOUTUBE_API_KEY_FILE = os.path.join(
    os.path.dirname(os.path.dirname(SCRIPT_DIR)),
    'youtube_api_key',
)

# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def fetch_json(url, timeout=10):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 GameFilm/1.0'})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        print(f"[fetch_gamefilm] WARN: failed to fetch {url}: {e}", file=sys.stderr)
        return None

def load_known_urls():
    try:
        with open(REPORTS_FILE) as f:
            reports = json.load(f)
        urls = set()
        for r in reports:
            for item in r.get('items') or []:
                if item.get('url'):
                    urls.add(item['url'])
        return urls, len(reports)
    except Exception as e:
        print(f"[fetch_gamefilm] WARN: could not load reports.json: {e}", file=sys.stderr)
        return set(), 0

def unix_to_date(ts):
    if not ts:
        return None
    try:
        return datetime.fromtimestamp(int(ts), tz=PT).date()
    except:
        return None

def is_today(ts):
    d = unix_to_date(ts)
    return d == TODAY_PT if d else None

def parse_date_to_pt(date_str):
    """"Parse a date string to PT datetime. Returns None if unparseable." """
    if not date_str:
        return None
    try:
        from email.utils import parsedate_to_datetime
        return parsedate_to_datetime(date_str).astimezone(PT)
    except:
        pass
    try:
        # ISO format with Z
        if date_str.endswith('Z'):
            date_str = date_str[:-1] + '+00:00'
        dt = datetime.fromisoformat(date_str)
        return dt.astimezone(PT)
    except:
        pass
    return None

# ---------------------------------------------------------------------------
# Playwright browser scraper — all browser sources in one call for efficiency
# Writes results to /tmp/gamefilm_browser.json to avoid stdout pollution.
# ---------------------------------------------------------------------------

def run_playwright_browser():
    tmpfile = '/tmp/gamefilm_browser.json'

    node_script = r"""
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/tmp/gamefilm_browser.json';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.setDefaultNavigationTimeout(30000);

  const results = {};
  const log = [];

  function logMsg(msg) { log.push(msg); }

  // ── Helper ──────────────────────────────────────────────────────────────
  async function scrapeSearch(url, sourceKey, options = {}) {
    const { waitFor = 3000, linkPattern, maxItems = 10 } = options;
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(waitFor);
      const title = await page.title();
      if (title.includes('cloudflare') || title.includes('CF-challenge') ||
          title.includes('Access denied') || title.includes('Just a moment') ||
          title.includes('DDOS') || title.includes('Ray ID')) {
        logMsg('[browser] ' + sourceKey + ': Cloudflare/Challenge block, skipping');
        return [];
      }
      const items = await page.evaluate(({ linkPattern, maxItems }) => {
        // Skip nav/link-farm titles
        const skipTitles = /^(subscribe|sign in|log.?in|markets|pre.?markets|u\.s\.?markets|currencies|terms of service|need help|contact us|newsletters|business|strategy|politics|opinion|search|home|video|podcasts?|about|careers|advertise)/i;
        const found = [];
        const seen = new Set();
        const els = document.querySelectorAll('a[href]');
        for (const el of els) {
          const href = el.href;
          if (seen.has(href)) continue;
          if (linkPattern && !linkPattern.test(href)) continue;
          seen.add(href);
          const parent = el.closest('li, article, div[data-testid], .search-result, .post, .story, .news-item, .card');
          const titleEl = (parent || el).querySelector('h2, h3, [role="heading"], [data-testid="title"], .headline, .title') || el;
          const titleText = (titleEl || el).textContent.trim();
          if (skipTitles.test(titleText)) continue;
          if (titleText.length < 5) continue;  // Skip empty or near-empty titles
          const dateEl = (parent || el).querySelector('time');
          found.push({
            title: titleText.slice(0, 200),
            url: href,
            date: dateEl ? (dateEl.getAttribute('datetime') || dateEl.textContent.trim()) : '',
          });
          if (found.length >= maxItems) break;
        }
        return found;
      }, { linkPattern, maxItems });
      results[sourceKey] = (results[sourceKey] || []).concat(items.map(i => ({ ...i, source: sourceKey })));
      logMsg('[browser] ' + sourceKey + ': ' + items.length + ' items');
    } catch (err) {
      logMsg('[browser] ' + sourceKey + ': ERROR ' + err.message);
    }
  }

  // ── Reddit searches ──────────────────────────────────────────────────────
  // r/stocks is too noisy — skip it. RivianR2 can be flaky behind Reddit
  // network controls, but it is important enough for R2 demo/test-drive reads
  // that we still attempt a targeted search each run.
  const subreddits = [
    { name: 'Rivian', query: 'Rivian OR RIVN OR R1T OR R1S OR R2 OR "RJ Scaringe"' },
    { name: 'RivianR2', sourceKey: 'reddit_rivian_r2', query: '"test drive" OR "demo drive" OR "demo" OR "first drive" OR "test ride" OR "R2 review"' },
    { name: 'electricvehicles', query: 'Rivian OR RIVN OR R1T OR R1S' },
    { name: 'SelfDrivingCars', query: 'Rivian OR RIVN OR R1T OR autonomy OR driver assist' },
  ];

  for (const sub of subreddits) {
    const url = 'https://www.reddit.com/r/' + sub.name + '/search/?q=' + encodeURIComponent(sub.query) + '&sort=new&restrict_sr=1';
    await scrapeSearch(url, sub.sourceKey || ('reddit_' + sub.name.toLowerCase()), {
      waitFor: 3500,
      linkPattern: /\/r\/[a-z0-9_]+\/comments\//i,
      maxItems: 8,
    });
    await page.waitForTimeout(1200);
  }

  // ── News site searches ───────────────────────────────────────────────────
  // Use broader pattern: any link to the site's domain that looks like an article
  const newsSites = [
    { name: 'nytimes', url: 'https://www.nytimes.com/search?query=Rivian&sort=date' },
    { name: 'wsj', url: 'https://www.wsj.com/search?query=Rivian&mod=search_ts' },
    { name: 'reuters', url: 'https://www.reuters.com/search/news?blob=Rivian&sortBy=date&dateRange=7d' },
    { name: 'bloomberg', url: 'https://www.bloomberg.com/search?query=Rivian&sort=time' },
    { name: 'cnbc', url: 'https://www.cnbc.com/search/?query=Rivian&type=news' },
    { name: 'business_insider', url: 'https://www.businessinsider.com/s/?q=Rivian&sort=date' },
    { name: 'detroitnews', url: 'https://www.detroitnews.com/search/?q=Rivian&sort=date' },
    { name: 'autonews', url: 'https://www.autonews.com/search#q=Rivian' },
    { name: 'motortrend', url: 'https://www.motortrend.com/search/?q=Rivian' },
    { name: 'caranddriver', url: 'https://www.caranddriver.com/search/?q=Rivian' },
  ];


  for (const site of newsSites) {
    // Use date-based pattern for sites that use /YYYY/MM/ URL structure
    // Also filter out nav/subscribe links by requiring title text
    const domain = site.url.split('/')[2];
    const pattern = new RegExp('^https?://' + domain.replace('.', '\\.') + '/\\d{4}/\\d{2}/.*', 'i');
    await scrapeSearch(site.url, site.name, {
      waitFor: 3000,
      linkPattern: pattern,
      maxItems: 5,
    });
    await page.waitForTimeout(800);
  }

  // Twitter/X and Threads are not accessible without authentication — skipped.
  // Stock/financial signal is covered by Google News RSS instead.

  // Write JSON to file (not stdout) to avoid log pollution
  fs.writeFileSync(OUT, JSON.stringify({ results, log }));
  await browser.close();
})();
"""

    result = subprocess.run(
        ['node', '-e', node_script],
        cwd=SCRIPT_DIR,
        capture_output=True, text=True, timeout=180
    )
    if result.returncode != 0:
        print(f"[fetch_gamefilm] Playwright browser error: {result.stderr[:500]}", file=sys.stderr)
        return {}
    try:
        with open(tmpfile) as f:
            data = json.load(f)
        for msg in data.get('log', []):
            print(msg, file=sys.stderr)
        return data.get('results', {})
    except Exception as e:
        print(f"[fetch_gamefilm] Playwright parse error: {e}", file=sys.stderr)
        if os.path.exists(tmpfile):
            try:
                with open(tmpfile) as f:
                    print(f"Raw file: {f.read()[:500]}", file=sys.stderr)
            except:
                pass
        return {}

# ---------------------------------------------------------------------------
# Google News RSS — reliable, free, no auth needed
# ---------------------------------------------------------------------------

def fetch_google_news():
    """Fetch Rivian news from Google News RSS feeds."""
    items = []
    import re
    rss_urls = [
        ('https://news.google.com/rss/search?q=Rivian+RIVN&hl=en-US&gl=US&ceid=US:en', 'google_news'),
        ('https://news.google.com/rss/search?q=Rivian+R2+electric+SUV&hl=en-US&gl=US&ceid=US:en', 'google_news_r2'),
        ('https://news.google.com/rss/search?q=Rivian+autonomy+driver+assist&hl=en-US&gl=US&ceid=US:en', 'google_news_autonomy'),
        # Competitor intel feeds
        ('https://news.google.com/rss/search?q=Tesla+FSD+autonomy+self-driving&hl=en-US&gl=US&ceid=US:en', 'google_news_tesla'),
        ('https://news.google.com/rss/search?q=Waymo+robotaxi+driverless&hl=en-US&gl=US&ceid=US:en', 'google_news_waymo'),
        ('https://news.google.com/rss/search?q=Ford+GM+electric+vehicle+EV+pickup&hl=en-US&gl=US&ceid=US:en', 'google_news_oems'),
        ('https://news.google.com/rss/search?q=BYD+XPeng+NIO+electric+autonomy&hl=en-US&gl=US&ceid=US:en', 'google_news_chinese'),
        ('https://news.google.com/rss/search?q=Cybertruck+Model+Y+electric+pickup&hl=en-US&gl=US&ceid=US:en', 'google_news_cybertruck'),
    ]
    for url, label in rss_urls:
        fetched = _fetch_rss(url, label)
        items.extend(fetched)
    # Google News descriptions are bare URLs in <a> tags — use title as snippet instead
    for item in items:
        item['snippet'] = item.get('title', '')[:200]
    # Filter to today PT + keywords (feed-specific)
    rivian_kw = ['rivian','rivn','r1t','r1s','r2','rj','scaringe','electric truck','electric suv']
    competitor_kw = ['tesla','fsd','waymo','aurora','byd','xpeng','gm','ford','hummer','equinox','mach-e','cybertruck','model y','zoox','mobileye','lucid','polestar','ioniq']
    today_items = []
    for item in items:
        text = (item['title'] + ' ' + item['snippet']).lower()
        source = item.get('source','').lower()
        # Rivian feeds require Rivian keywords; competitor feeds require competitor keywords
        if 'competitive' in source or 'tesla' in source or 'waymo' in source or 'oems' in source or 'chinese' in source or 'cybertruck' in source:
            if not any(k in text for k in competitor_kw):
                continue
        else:
            if not any(k in text for k in rivian_kw):
                continue
        date_str = item.get('publishedAt', '')
        dt = parse_date_to_pt(date_str)
        if dt and dt.date() != TODAY_PT:
            continue
        today_items.append(item)
    # Dedupe by URL
    seen = set()
    deduped = []
    for item in today_items:
        if item['url'] and item['url'] not in seen:
            seen.add(item['url'])
            deduped.append(item)
    print(f"[fetch_gamefilm] Google News: {len(items)} total, {len(today_items)} today, {len(deduped)} unique", file=sys.stderr)
    return deduped

# ---------------------------------------------------------------------------
# RSS Feed Fetcher
# ---------------------------------------------------------------------------

def _parse_rss(xml_text, source_label):
    items = []
    try:
        root = ET.fromstring(xml_text)
        if root.tag.endswith('feed'):
            ns = {'atom': 'http://www.w3.org/2005/Atom'}
            for entry in root.findall('atom:entry', ns) or root.findall('entry'):
                title_el = entry.find('atom:title', ns) or entry.find('title')
                link_el = entry.find('atom:link[@rel="alternate"]', ns) or entry.find('link[@href]') or entry.find('link')
                date_el = entry.find('atom:published', ns) or entry.find('updated') or entry.find('published')
                summary_el = entry.find('atom:summary', ns) or entry.find('summary') or entry.find('content')
                items.append({
                    'title': title_el.text.strip() if title_el is not None and title_el.text else '',
                    'url': link_el.get('href', '') if link_el is not None else '',
                    'source': source_label,
                    'publishedAt': date_el.text if date_el is not None and date_el.text else None,
                    'score': 0,
                    'snippet': summary_el.text[:300] if summary_el is not None and summary_el.text else '',
                })
        else:
            for item in root.findall('.//item'):
                title = (item.findtext('title') or '').strip()
                url = item.findtext('link') or item.findtext('guid') or ''
                date = item.findtext('pubDate') or item.findtext('dc:date', '') or ''
                desc = item.findtext('description') or item.findtext('content:encoded') or ''
                items.append({
                    'title': title,
                    'url': url,
                    'source': source_label,
                    'publishedAt': date,
                    'score': 0,
                    'snippet': desc[:300],
                })
    except Exception as e:
        print(f"[fetch_gamefilm] RSS parse error ({source_label}): {e}", file=sys.stderr)
    return items

def _fetch_rss(url, source_label, timeout=15):
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (compatible; GameFilm/1.0)',
            'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
        })
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            xml_text = resp.read().decode('utf-8', errors='replace')
        return _parse_rss(xml_text, source_label)
    except Exception as e:
        print(f"[fetch_gamefilm] RSS fetch error ({source_label} {url}): {e}", file=sys.stderr)
        return []

def fetch_rss_feeds():
    feeds = [
        ('https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', 'nytimes_tech'),
        ('https://rss.nytimes.com/services/xml/rss/nyt/Business.xml', 'nytimes_business'),
        ('https://feeds.bloomberg.com/technology/news.rss', 'bloomberg_tech'),
        ('https://feeds.bloomberg.com/markets/news.rss', 'bloomberg_markets'),
        ('https://www.cnbc.com/id/100003114/device/rss/rss.html', 'cnbc_top'),
        ('https://feeds.marketwatch.com/marketwatch/topstories', 'marketwatch'),
        ('https://www.automotiveworld.com/feed/', 'automotive_world'),
    ]

    all_items = []
    for url, label in feeds:
        items = _fetch_rss(url, label)
        all_items.extend(items)

    keywords = ['rivian', 'rivn', 'r1t', 'r1s', 'r2', 'rj scaringe', 'electric truck', 'electric suv']
    today_items = []
    for item in all_items:
        text = (item['title'] + ' ' + item['snippet']).lower()
        if not any(k in text for k in keywords):
            continue
        date_str = item.get('publishedAt', '')
        if date_str:
            try:
                from email.utils import parsedate_to_datetime
                dt = parsedate_to_datetime(date_str).astimezone(PT)
                if dt.date() != TODAY_PT:
                    continue
            except:
                pass
        today_items.append(item)

    print(f"[fetch_gamefilm] RSS: {len(all_items)} total, {len(today_items)} today/Rivian-relevant", file=sys.stderr)
    return today_items

# ---------------------------------------------------------------------------
# Bluesky (public API — no Tavily needed)
# ---------------------------------------------------------------------------

def fetch_bluesky():
    items = []
    try:
        url = 'https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=Rivian&sort=latest&limit=10'
        req = urllib.request.Request(url, headers={
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            for post in data.get('posts', []):
                author = post.get('author', {})
                record = post.get('record', {})
                text = record.get('text', '')[:300]
                handle = author.get('handle', '')
                did = author.get('did', '')
                uri = post.get('uri', '')
                post_id = uri.split('/')[-1] if uri else ''
                url = f"https://bsky.app/profile/{did}/post/{post_id}"
                items.append({
                    'title': f"@{handle} (Bluesky): {text[:80]}",
                    'url': url,
                    'source': 'bluesky',
                    'publishedAt': post.get('indexedAt') or None,
                    'score': post.get('likeCount', 0) or 0,
                    'snippet': text,
                })
    except Exception as e:
        print(f"[fetch_gamefilm] Bluesky fetch error: {e}", file=sys.stderr)

    # Filter to today PT
    today_items = []
    for item in items:
        date_str = item.get('publishedAt', '')
        dt = parse_date_to_pt(date_str)
        if dt and dt.date() != TODAY_PT:
            continue
        today_items.append(item)
    print(f"[fetch_gamefilm] Bluesky: {len(items)} total, {len(today_items)} today", file=sys.stderr)
    return today_items

# ---------------------------------------------------------------------------
# YouTube Data API v3 (no OAuth required)
# ---------------------------------------------------------------------------

# Transcript-based AI summarization. Uses the locally OAuth-authenticated
# `claude` CLI (Haiku) — no API key to manage. Each call costs a fraction of a
# cent. Both are best-effort: any failure falls back to the video description.
CLAUDE_BIN = os.environ.get('CLAUDE_BIN', '/opt/homebrew/bin/claude')
YT_SUMMARY_MODEL = 'claude-haiku-4-5'
YT_SUMMARY_CAP = 6          # max videos to summarize per run (bounds runtime/cost)
YT_TRANSCRIPT_MAXCHARS = 8000
YT_TRANSCRIPT_DELAY = 2.0   # seconds between transcript fetches (avoid YouTube IP throttling)

def get_youtube_api_key():
    api_key = os.environ.get('YOUTUBE_API_KEY')
    if api_key:
        return api_key.strip()

    key_file = os.environ.get('YOUTUBE_API_KEY_FILE', DEFAULT_YOUTUBE_API_KEY_FILE)
    try:
        with open(os.path.expanduser(key_file)) as f:
            return f.read().strip() or None
    except FileNotFoundError:
        return None
    except Exception as e:
        print(f"[fetch_gamefilm] YouTube: could not read YOUTUBE_API_KEY_FILE: {e}", file=sys.stderr)
        return None

def fetch_transcript(video_id):
    """Return plain-text transcript, or None. Raises RuntimeError on IpBlocked so
    the caller can short-circuit the rest of the run."""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        try:
            fetched = YouTubeTranscriptApi().fetch(video_id)
            segs = fetched.to_raw_data() if hasattr(fetched, 'to_raw_data') else list(fetched)
        except AttributeError:
            segs = YouTubeTranscriptApi.get_transcript(video_id)
        text = ' '.join(s['text'] for s in segs).strip()
        return text or None
    except Exception as e:
        msg = str(e)
        if 'IpBlocked' in type(e).__name__ or 'blocking requests from your IP' in msg:
            raise RuntimeError(f'YouTube IP block: {msg[:200]}')
        print(f"[fetch_gamefilm] YouTube transcript unavailable for {video_id}: {type(e).__name__}", file=sys.stderr)
        return None

def summarize_youtube_video(video_id, title):
    """Fetch transcript and return a ~200-char intel summary, or None to keep the description.
    Propagates IpBlocked as RuntimeError so the caller can stop the loop."""
    transcript = fetch_transcript(video_id)
    if not transcript or len(transcript) < 200:
        return None
    prompt = (
        "You are a competitive-intelligence analyst for Rivian's product team. "
        "Summarize this YouTube video transcript in ONE dense sentence of at most 200 characters, "
        "capturing the most decision-relevant intel: product specs, launch timing, autonomy/software "
        "status, pricing, or competitive comparisons. Output only the sentence — no preamble, no markdown.\n\n"
        f"TITLE: {title}\n\nTRANSCRIPT:\n{transcript[:YT_TRANSCRIPT_MAXCHARS]}"
    )
    try:
        r = subprocess.run(
            [CLAUDE_BIN, '-p', '--model', YT_SUMMARY_MODEL, prompt],
            capture_output=True, text=True, timeout=90,
        )
        out = (r.stdout or '').strip()
        if r.returncode == 0 and out:
            return out[:240]
        print(f"[fetch_gamefilm] YouTube summarize rc={r.returncode} for {video_id}: {(r.stderr or '')[:200]}", file=sys.stderr)
    except Exception as e:
        print(f"[fetch_gamefilm] YouTube summarize failed for {video_id}: {e}", file=sys.stderr)
    return None

def fetch_youtube():
    items = []
    api_key = get_youtube_api_key()
    if not api_key:
        print("[fetch_gamefilm] YouTube: API key not configured — skipping", file=sys.stderr)
        return items

    try:
        import urllib.parse
        params = urllib.parse.urlencode({
            'part': 'snippet',
            'q': 'Rivian',
            'type': 'video',
            'order': 'date',
            'maxResults': 10,
            'key': api_key,
        })
        url = f'https://www.googleapis.com/youtube/v3/search?{params}'
        req = urllib.request.Request(url, headers={'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
            for item in (data.get('items') or []):
                snippet = item.get('snippet', {})
                vid = item.get('id', {}).get('videoId', '')
                if not vid:
                    continue
                title = snippet.get('title', '')
                if not title:
                    continue
                pub = snippet.get('publishedAt', '')
                items.append({
                    'title': title,
                    'url': f'https://youtube.com/watch?v={vid}',
                    'source': 'youtube',
                    'publishedAt': pub if pub else None,
                    'score': 0,
                    'snippet': snippet.get('description', '')[:300] or '',
                })
    except Exception as e:
        print(f"[fetch_gamefilm] YouTube fetch error: {e}", file=sys.stderr)

    # Filter to today PT
    today_items = []
    for item in items:
        date_str = item.get('publishedAt', '')
        dt = parse_date_to_pt(date_str)
        if dt and dt.date() != TODAY_PT:
            continue
        today_items.append(item)
    print(f"[fetch_gamefilm] YouTube: {len(items)} total, {len(today_items)} today", file=sys.stderr)

    # Enrich today's videos with AI transcript summaries (best-effort, capped).
    # Sleep between calls to avoid YouTube IP throttling; bail on a hard IP block.
    summarized = 0
    for idx, item in enumerate(today_items):
        if summarized >= YT_SUMMARY_CAP:
            break
        if idx > 0:
            time.sleep(YT_TRANSCRIPT_DELAY)
        vid = item['url'].rsplit('v=', 1)[-1]
        try:
            summary = summarize_youtube_video(vid, item.get('title', ''))
        except RuntimeError as e:
            print(f"[fetch_gamefilm] YouTube: stopping summarization — {e}", file=sys.stderr)
            break
        if summary:
            item['snippet'] = summary
            item['summarized'] = True
            summarized += 1
    print(f"[fetch_gamefilm] YouTube: summarized {summarized}/{len(today_items)} videos", file=sys.stderr)
    return today_items

# ---------------------------------------------------------------------------
# HackerNews (Algolia API — no Tavily needed)
# ---------------------------------------------------------------------------

def fetch_hackernews():
    cutoff = int(time.time()) - 48 * 3600
    url = f"https://hn.algolia.com/api/v1/search_by_date?query=rivian&tags=story&numericFilters=created_at_i>{cutoff}"
    data = fetch_json(url)
    if not data:
        return []
    items = []
    for hit in data.get('hits') or []:
        ts_str = hit.get('created_at')
        try:
            ts = datetime.fromisoformat(ts_str.replace('Z', '+00:00')) if ts_str else None
            if ts and ts.astimezone(PT).date() != TODAY_PT:
                continue
        except:
            pass
        url_val = hit.get('url') or f"https://news.ycombinator.com/item?id={hit.get('objectID', '')}"
        items.append({
            'title': hit.get('title', ''),
            'url': url_val,
            'source': 'hackernews',
            'publishedAt': ts_str,
            'score': hit.get('points', 0),
            'snippet': '',
        })
    print(f"[fetch_gamefilm] HackerNews: {len(items)} items", file=sys.stderr)
    return items

# ---------------------------------------------------------------------------
# RivianForums (Playwright scrape of the UHF/autonomy forum, behind Cloudflare)
# ---------------------------------------------------------------------------

RIVIANFORUMS_MAX = 8  # cap new threads per run so a first run doesn't flood a report

def fetch_rivianforums():
    """Scrape the RivianForums UHF/autonomy forum via the standalone Playwright
    script. Threads carry no reliable date, so dedup-by-URL upstream keeps only
    genuinely new threads. Best-effort: returns [] on any failure."""
    items = []
    try:
        script = os.path.join(SCRIPT_DIR, 'fetch_rivianforums.py')
        r = subprocess.run(['python3', script], capture_output=True, text=True, timeout=150)
        if r.returncode != 0 or not (r.stdout or '').strip():
            print(f"[fetch_gamefilm] RivianForums: rc={r.returncode} {(r.stderr or '')[-200:]}", file=sys.stderr)
            return []
        data = json.loads(r.stdout)
        for t in data.get('threads', []):
            url = (t.get('url') or '').strip()
            title = (t.get('title') or '').strip()
            if not url or not title or '/threads/' not in url:
                continue
            items.append({
                'title': title,
                'url': url,
                'source': 'rivianforums',
                'publishedAt': None,
                'score': 0,
                'snippet': title[:200],
            })
            if len(items) >= RIVIANFORUMS_MAX:
                break
    except Exception as e:
        print(f"[fetch_gamefilm] RivianForums error: {e}", file=sys.stderr)
    print(f"[fetch_gamefilm] RivianForums: {len(items)} threads", file=sys.stderr)
    return items

# ---------------------------------------------------------------------------
# X / Twitter (official API v2 recent search — requires X_BEARER_TOKEN)
# Free unauthenticated scraping (Nitter etc.) is dead, so this is gated behind a
# bearer token. With no token set it logs and returns [] — non-breaking.
# ---------------------------------------------------------------------------

def fetch_x():
    token = os.environ.get('X_BEARER_TOKEN')
    if not token:
        print("[fetch_gamefilm] X/Twitter: X_BEARER_TOKEN not set — skipping (set it to enable X search)", file=sys.stderr)
        return []
    items = []
    try:
        import urllib.parse
        query = '(Rivian OR RIVN OR R1T OR R1S OR R2 OR Scaringe) -is:retweet lang:en'
        params = urllib.parse.urlencode({
            'query': query,
            'max_results': 25,
            'tweet.fields': 'created_at,public_metrics,author_id',
            'expansions': 'author_id',
            'user.fields': 'username',
        })
        url = f'https://api.twitter.com/2/tweets/search/recent?{params}'
        req = urllib.request.Request(url, headers={
            'Authorization': f'Bearer {token}',
            'User-Agent': 'GameFilm/1.0',
        })
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
        users = {u['id']: u.get('username', '') for u in data.get('includes', {}).get('users', [])}
        for tw in data.get('data', []):
            tid = tw.get('id', '')
            handle = users.get(tw.get('author_id', ''), 'i')
            text = (tw.get('text') or '').replace('\n', ' ').strip()
            pm = tw.get('public_metrics', {}) or {}
            if not tid or not text:
                continue
            items.append({
                'title': f"@{handle}: {text[:80]}",
                'url': f"https://x.com/{handle}/status/{tid}",
                'source': 'twitter',
                'publishedAt': tw.get('created_at'),
                'score': pm.get('like_count', 0) or 0,
                'snippet': text[:200],
            })
    except Exception as e:
        print(f"[fetch_gamefilm] X/Twitter error: {e}", file=sys.stderr)

    today_items = []
    for item in items:
        dt = parse_date_to_pt(item.get('publishedAt', ''))
        if dt and dt.date() != TODAY_PT:
            continue
        today_items.append(item)
    print(f"[fetch_gamefilm] X/Twitter: {len(items)} total, {len(today_items)} today", file=sys.stderr)
    return today_items

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    known_urls, report_count = load_known_urls()
    print(f"[fetch_gamefilm] Loaded {len(known_urls)} known URLs from {report_count} reports", file=sys.stderr)
    print(f"[fetch_gamefilm] Today (PT): {TODAY_PT}", file=sys.stderr)

    raw_items = []

    # --- Playwright browser: Reddit + News sites + Twitter + Threads ---
    print("[fetch_gamefilm] Starting Playwright browser fetch (Reddit, news, Twitter, Threads)...", file=sys.stderr)
    browser_results = run_playwright_browser()
    total_browser = sum(len(v) for v in browser_results.values())
    print(f"[fetch_gamefilm] Playwright browser: {total_browser} total items from {len(browser_results)} sources", file=sys.stderr)

    for source_key, items in browser_results.items():
        for item in items:
            url = item.get('url', '')
            if not url:
                continue
            raw_items.append({
                'title': item.get('title', ''),
                'url': url,
                'source': source_key,
                'publishedAt': item.get('date') or None,
                'score': 0,
                'snippet': item.get('snippet', '')[:200],
            })

    # --- RSS feeds (supplemental) ---
    rss_items = fetch_rss_feeds()
    raw_items.extend(rss_items)

    # --- Google News RSS (reliable free news source) ---
    gn_items = fetch_google_news()
    raw_items.extend(gn_items)

    # --- Bluesky ---
    bsky_items = fetch_bluesky()
    raw_items.extend(bsky_items)

    # --- YouTube ---
    yt_items = fetch_youtube()
    raw_items.extend(yt_items)

    # --- HackerNews ---
    hn_items = fetch_hackernews()
    raw_items.extend(hn_items)

    # --- RivianForums (UHF/autonomy forum) ---
    rf_items = fetch_rivianforums()
    raw_items.extend(rf_items)

    # --- X / Twitter (requires X_BEARER_TOKEN, else no-op) ---
    x_items = fetch_x()
    raw_items.extend(x_items)

    # Truncate snippets
    for item in raw_items:
        if item.get('snippet') and len(item['snippet']) > 200:
            item['snippet'] = item['snippet'][:200]

    # Deduplicate against known URLs
    seen = set()
    new_items = []
    for item in raw_items:
        url = item['url']
        if url and url not in known_urls and url not in seen:
            seen.add(url)
            new_items.append(item)

    # Cap total items (raised to accommodate RivianForums + X sources)
    if len(new_items) > 50:
        new_items = new_items[:50]

    print(f"[fetch_gamefilm] New items after dedup: {len(new_items)}", file=sys.stderr)

    output = {
        'today': TODAY_PT.isoformat(),
        'fetchedAt': datetime.now(timezone.utc).isoformat(),
        'known_url_count': len(known_urls),
        'existing_report_count': report_count,
        'new_item_count': len(new_items),
        'items': new_items,
    }

    print(json.dumps(output, indent=2, ensure_ascii=False))

if __name__ == '__main__':
    main()
