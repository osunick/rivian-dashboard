#!/usr/bin/env python3
"""Backfill GameFilm reports for a historical PT date range.

This uses date-aware public APIs where available. It intentionally leaves the
live cron fetcher untouched because several of its sources are "latest only."
"""
import argparse
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from datetime import date, datetime, time as dt_time, timedelta, timezone
from zoneinfo import ZoneInfo

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(SCRIPT_DIR)
REPORTS_JSON = os.path.join(REPO, "public", "data", "reports.json")
PT = ZoneInfo("America/Los_Angeles")
UTC = timezone.utc

sys.path.insert(0, SCRIPT_DIR)
import fetch_gamefilm as fetcher  # noqa: E402
import run_gamefilm_pipeline as pipeline  # noqa: E402


GOOGLE_NEWS_QUERIES = [
    ("Rivian", "google_news"),
    ("Rivian R2 electric SUV", "google_news_r2"),
    ("Rivian autonomy driver assist", "google_news_autonomy"),
    ("Tesla FSD autonomy self-driving", "google_news_tesla"),
    ("Waymo robotaxi driverless", "google_news_waymo"),
    ("Ford GM electric vehicle EV pickup", "google_news_oems"),
    ("BYD XPeng NIO electric autonomy", "google_news_chinese"),
    ("Cybertruck Model Y electric pickup", "google_news_cybertruck"),
]

RIVIAN_KEYWORDS = [
    "rivian",
    "rivn",
    "r1t",
    "r1s",
    "r2",
    "rj",
    "scaringe",
    "electric truck",
    "electric suv",
]

COMPETITOR_KEYWORDS = [
    "tesla",
    "fsd",
    "waymo",
    "aurora",
    "byd",
    "xpeng",
    "gm",
    "ford",
    "hummer",
    "equinox",
    "mach-e",
    "cybertruck",
    "model y",
    "zoox",
    "mobileye",
    "lucid",
    "polestar",
    "ioniq",
]


def daterange(start: date, end: date):
    current = start
    while current <= end:
        yield current
        current += timedelta(days=1)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Backfill GameFilm data for a PT date range.")
    parser.add_argument("--start", required=True, help="Start date, YYYY-MM-DD, PT.")
    parser.add_argument("--end", required=True, help="End date, YYYY-MM-DD, PT.")
    parser.add_argument("--dry-run", action="store_true", help="Fetch and summarize without writing reports.json.")
    parser.add_argument("--max-items", type=int, default=50, help="Maximum items per daily report.")
    return parser.parse_args()


def fetch_json(url: str, timeout: int = 15):
    req = urllib.request.Request(
        url,
        headers={"Accept": "application/json", "User-Agent": "Mozilla/5.0 GameFilm/1.0"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read())


def day_bounds(target: date):
    start_pt = datetime.combine(target, dt_time.min, tzinfo=PT)
    end_pt = start_pt + timedelta(days=1)
    return start_pt, end_pt


def item_date(item):
    dt = fetcher.parse_date_to_pt(item.get("publishedAt") or "")
    return dt.date() if dt else None


def relevant(item, source_label: str) -> bool:
    text = f"{item.get('title', '')} {item.get('snippet', '')}".lower()
    if any(key in source_label for key in ("tesla", "waymo", "oems", "chinese", "cybertruck")):
        return any(k in text for k in COMPETITOR_KEYWORDS)
    return any(k in text for k in RIVIAN_KEYWORDS)


def google_news_url(query: str, target: date) -> str:
    # Google News RSS understands after:/before: in the query string.
    q = f"{query} after:{target.isoformat()} before:{(target + timedelta(days=1)).isoformat()}"
    params = urllib.parse.urlencode({"q": q, "hl": "en-US", "gl": "US", "ceid": "US:en"})
    return f"https://news.google.com/rss/search?{params}"


def fetch_google_news_for_day(target: date):
    items = []
    for query, label in GOOGLE_NEWS_QUERIES:
        url = google_news_url(query, target)
        fetched = fetcher._fetch_rss(url, label)
        for item in fetched:
            item["snippet"] = (item.get("title") or "")[:200]
            if item_date(item) == target and relevant(item, label):
                items.append(item)
        time.sleep(0.2)
    return items


def fetch_hackernews_for_day(target: date):
    start_pt, end_pt = day_bounds(target)
    start = int(start_pt.astimezone(UTC).timestamp())
    end = int(end_pt.astimezone(UTC).timestamp())
    params = urllib.parse.urlencode(
        {
            "query": "rivian",
            "tags": "story",
            "numericFilters": f"created_at_i>={start},created_at_i<{end}",
            "hitsPerPage": 100,
        }
    )
    url = f"https://hn.algolia.com/api/v1/search_by_date?{params}"
    try:
        data = fetch_json(url)
    except Exception as e:
        print(f"[backfill] HackerNews {target}: {e}", file=sys.stderr)
        return []

    items = []
    for hit in data.get("hits") or []:
        ts = hit.get("created_at")
        url_val = hit.get("url") or f"https://news.ycombinator.com/item?id={hit.get('objectID', '')}"
        items.append(
            {
                "title": hit.get("title") or "",
                "url": url_val,
                "source": "hackernews",
                "publishedAt": ts,
                "score": hit.get("points", 0) or 0,
                "snippet": "",
            }
        )
    return items


def fetch_bluesky_for_day(target: date):
    start_pt, end_pt = day_bounds(target)
    params = urllib.parse.urlencode(
        {
            "q": "Rivian",
            "sort": "latest",
            "limit": 100,
            "since": start_pt.astimezone(UTC).isoformat().replace("+00:00", "Z"),
            "until": end_pt.astimezone(UTC).isoformat().replace("+00:00", "Z"),
        }
    )
    url = f"https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?{params}"
    try:
        data = fetch_json(url)
    except Exception as e:
        print(f"[backfill] Bluesky {target}: {e}", file=sys.stderr)
        return []

    items = []
    for post in data.get("posts", []):
        author = post.get("author", {})
        record = post.get("record", {})
        text = (record.get("text") or "").strip()[:300]
        did = author.get("did", "")
        uri = post.get("uri", "")
        post_id = uri.split("/")[-1] if uri else ""
        handle = author.get("handle", "")
        item = {
            "title": f"@{handle} (Bluesky): {text[:80]}",
            "url": f"https://bsky.app/profile/{did}/post/{post_id}",
            "source": "bluesky",
            "publishedAt": post.get("indexedAt") or None,
            "score": post.get("likeCount", 0) or 0,
            "snippet": text,
        }
        if item_date(item) == target:
            items.append(item)
    return items


def fetch_youtube_for_day(target: date):
    api_key = fetcher.get_youtube_api_key()
    if not api_key:
        return []

    start_pt, end_pt = day_bounds(target)
    params = urllib.parse.urlencode(
        {
            "part": "snippet",
            "q": "Rivian",
            "type": "video",
            "order": "date",
            "maxResults": 50,
            "publishedAfter": start_pt.astimezone(UTC).isoformat().replace("+00:00", "Z"),
            "publishedBefore": end_pt.astimezone(UTC).isoformat().replace("+00:00", "Z"),
            "key": api_key,
        }
    )
    url = f"https://www.googleapis.com/youtube/v3/search?{params}"
    try:
        data = fetch_json(url)
    except Exception as e:
        print(f"[backfill] YouTube {target}: {e}", file=sys.stderr)
        return []

    items = []
    for item in data.get("items") or []:
        snippet = item.get("snippet", {})
        vid = item.get("id", {}).get("videoId", "")
        title = snippet.get("title") or ""
        if not vid or not title:
            continue
        items.append(
            {
                "title": title,
                "url": f"https://youtube.com/watch?v={vid}",
                "source": "youtube",
                "publishedAt": snippet.get("publishedAt") or None,
                "score": 0,
                "snippet": (snippet.get("description") or "")[:300],
            }
        )
    return items


def fetch_day(target: date, known_urls: set[str], max_items: int):
    raw_items = []
    raw_items.extend(fetch_google_news_for_day(target))
    raw_items.extend(fetch_bluesky_for_day(target))
    raw_items.extend(fetch_youtube_for_day(target))
    raw_items.extend(fetch_hackernews_for_day(target))

    seen = set()
    items = []
    for item in raw_items:
        url = item.get("url") or ""
        if not url or url in known_urls or url in seen:
            continue
        if item_date(item) not in (target, None):
            continue
        item["snippet"] = (item.get("snippet") or "")[:200]
        item["category"] = pipeline.guess_category(item)
        seen.add(url)
        items.append(item)
        if len(items) >= max_items:
            break
    return items


def build_report(target: date, items):
    report_ts = datetime.combine(target, dt_time(hour=19, minute=5), tzinfo=PT).astimezone(UTC)
    ts = report_ts.isoformat().replace("+00:00", "Z")
    pipeline.assign_sentiments(items)

    counts = {"positive": 0, "neutral": 0, "negative": 0}
    for item in items:
        sentiment = item.get("sentiment", "neutral")
        counts[sentiment] = counts.get(sentiment, 0) + 1
    total = len(items) or 1
    sentiment = {key: int(value / total * 100) for key, value in counts.items()}
    themes = sorted({theme for item in items for theme in item.get("themes", [])})
    categories = {
        key: {
            "found": sum(1 for item in items if item.get("category") == key),
            "sentiment": None,
        }
        for key in pipeline.CATEGORY_ORDER
    }
    full_report = pipeline.compose_brief_llm(items, sentiment, ts) or pipeline.compose_brief(items, sentiment, ts)
    return {
        "id": ts,
        "timestamp": ts,
        "sentiment": sentiment,
        "sources": {"backfill": {"found": len(items), "sentiment": None}},
        "categories": categories,
        "themes": themes,
        "summary": (items[0].get("snippet") or items[0].get("title") or "Rivian intel")[:200] if items else "",
        "fullReport": full_report,
        "items": items,
    }


def main() -> int:
    args = parse_args()
    start = date.fromisoformat(args.start)
    end = date.fromisoformat(args.end)
    if end < start:
        raise SystemExit("--end must be on or after --start")

    with open(REPORTS_JSON) as f:
        reports = json.load(f)

    existing_dates = {
        datetime.fromisoformat(r["timestamp"].replace("Z", "+00:00")).astimezone(PT).date()
        for r in reports
        if r.get("timestamp")
    }
    known_urls = {
        item["url"]
        for report in reports
        for item in report.get("items", [])
        if item.get("url")
    }

    added = []
    for target in daterange(start, end):
        if target in existing_dates:
            print(f"[backfill] {target}: already has a report, skipping", file=sys.stderr)
            continue
        print(f"[backfill] {target}: fetching", file=sys.stderr)
        items = fetch_day(target, known_urls, args.max_items)
        print(f"[backfill] {target}: {len(items)} new items", file=sys.stderr)
        if not items:
            continue
        report = build_report(target, items)
        added.append(report)
        known_urls.update(item["url"] for item in items if item.get("url"))

    if args.dry_run:
        print(json.dumps({"added": len(added), "dates": [r["timestamp"] for r in added]}, indent=2))
        return 0

    if not added:
        print("[backfill] No reports added")
        return 0

    insert_at = len(reports)
    first_added_ts = min(r["timestamp"] for r in added)
    for idx, report in enumerate(reports):
        if report.get("timestamp", "") > first_added_ts:
            insert_at = idx
            break
    reports[insert_at:insert_at] = sorted(added, key=lambda r: r.get("timestamp", ""))
    with open(REPORTS_JSON, "w") as f:
        json.dump(reports, f, indent=2)
        f.write("\n")

    print(f"[backfill] Added {len(added)} reports")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
