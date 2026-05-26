#!/usr/bin/env python3
"""
fetch_gamefilm.py — Pre-fetch all GameFilm sources and output new raw items.

This script does everything that doesn't require LLM intelligence:
  1. Reads reports.json and builds a known-URLs set for deduplication
  2. Fetches Reddit (r/Rivian, r/RivianR2, r/electricvehicles, r/SelfDrivingCars, r/stocks)
  3. Fetches HackerNews
  4. Filters to items published TODAY (Pacific Time) and not in known-URLs set
  5. Outputs a compact JSON to stdout with:
     - today's date
     - known_url_count (for context)
     - raw_items[] (title, url, source, publishedAt, snippet/selftext)

The LLM reads this output and only needs to:
  - Categorize each item
  - Score sentiment
  - Write snippets
  - Write the brief
  - Call sessions_send

Usage:
  python3 scripts/fetch_gamefilm.py > /tmp/gamefilm_raw.json
"""

import json, sys, os, time, urllib.request, urllib.error
from datetime import datetime, timezone, timedelta
import zoneinfo

REPORTS_FILE = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'reports.json')
PT = zoneinfo.ZoneInfo('America/Los_Angeles')
TODAY_PT = datetime.now(PT).date()

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
    return d == TODAY_PT if d else None  # None = unknown

def reddit_permalink_to_url(permalink):
    return f"https://www.reddit.com{permalink}"

def fetch_reddit_new(subreddit, limit=50):
    url = f"https://www.reddit.com/r/{subreddit}/new.json?limit={limit}"
    data = fetch_json(url)
    if not data:
        return []
    items = []
    for child in (data.get('data') or {}).get('children') or []:
        d = child.get('data') or {}
        ts = d.get('created_utc')
        today = is_today(ts)
        if today is False:
            continue  # published on a different day, skip
        url_val = d.get('url') or reddit_permalink_to_url(d.get('permalink', ''))
        if 'reddit.com' not in url_val and d.get('is_self'):
            url_val = reddit_permalink_to_url(d.get('permalink', ''))
        items.append({
            'title': d.get('title', ''),
            'url': url_val,
            'source': f"reddit_{subreddit.lower().replace('/', '_')}",
            'publishedAt': datetime.fromtimestamp(int(ts), tz=PT).isoformat() if ts else None,
            'score': d.get('score', 0),
            'snippet': (d.get('selftext') or '')[:500].strip(),
        })
    return items

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
    return items

def main():
    known_urls, report_count = load_known_urls()
    print(f"[fetch_gamefilm] Loaded {len(known_urls)} known URLs from {report_count} reports", file=sys.stderr)
    print(f"[fetch_gamefilm] Today (PT): {TODAY_PT}", file=sys.stderr)

    raw_items = []

    # Reddit sources
    for sub in ['Rivian', 'RivianR2', 'electricvehicles', 'SelfDrivingCars', 'stocks']:
        items = fetch_reddit_new(sub, limit=50)
        # For general subs (not Rivian-specific), filter by relevance in title
        if sub in ('electricvehicles', 'SelfDrivingCars', 'stocks'):
            keywords = ['rivian', 'rivn', 'r1t', 'r1s', 'r2', 'r3'] if sub != 'stocks' else ['rivn', 'rivian']
            items = [i for i in items if any(k in (i['title'] + i['snippet']).lower() for k in keywords)]
        raw_items.extend(items)
        print(f"[fetch_gamefilm] r/{sub}: {len(items)} items today", file=sys.stderr)

    # HackerNews
    hn_items = fetch_hackernews()
    raw_items.extend(hn_items)
    print(f"[fetch_gamefilm] HackerNews: {len(hn_items)} items", file=sys.stderr)

    # Deduplicate against known URLs
    seen = set()
    new_items = []
    for item in raw_items:
        url = item['url']
        if url and url not in known_urls and url not in seen:
            seen.add(url)
            new_items.append(item)

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
