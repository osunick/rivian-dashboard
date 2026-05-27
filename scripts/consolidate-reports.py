#!/usr/bin/env python3
"""
consolidate-reports.py
Merges duplicate cycle entries in reports.json into one entry per 4-hour window.
Keeps newest entry's id/timestamp, merges all items, recalculates aggregates.
"""
import json, sys
from datetime import datetime, timezone, timedelta

FILE = '/Users/osunick/.openclaw/workspace/rivian-dashboard/public/data/reports.json'
PT = timezone(timedelta(hours=-7))  # PDT

def hour_bucket(ts_str):
    ts = datetime.fromisoformat(ts_str.replace('Z', '+00:00')).replace(tzinfo=timezone.utc).astimezone(PT)
    bucket = ts.replace(hour=(ts.hour // 4) * 4, minute=0, second=0, microsecond=0)
    return bucket.isoformat()

with open(FILE) as f:
    data = json.load(f)

# Group by cycle bucket
cycles = {}
for entry in data:
    key = hour_bucket(entry['timestamp'])
    if key not in cycles:
        cycles[key] = []
    cycles[key].append(entry)

# Deduplicate items within an entry by URL
def dedup_items(items):
    seen = set()
    result = []
    for item in items:
        url = item.get('url', '')
        if url and url not in seen:
            seen.add(url)
            result.append(item)
    return result

merged = []
for bucket, entries in cycles.items():
    if len(entries) == 1:
        merged.append(entries[0])
    else:
        print(f"Merging {len(entries)} entries for {bucket}", file=sys.stderr)
        # Sort by timestamp desc — newest first
        entries.sort(key=lambda e: e['timestamp'], reverse=True)
        base = entries[0].copy()
        base['items'] = []
        for e in entries:
            base['items'].extend(e.get('items') or [])
        base['items'] = dedup_items(base['items'])

        # Recalculate sources
        sources = {k: {'found': 0, 'sentiment': None} for k in [
            'reddit_rivian','reddit_rivian_r2','reddit_ev','reddit_sdc','reddit_stocks',
            'rivianforums','news','twitter','youtube','hackernews'
        ]}
        for item in base['items']:
            src = item.get('source', '')
            if src in sources:
                sources[src]['found'] += 1
                # Keep first non-null sentiment
                if sources[src]['sentiment'] is None and item.get('sentiment'):
                    sources[src]['sentiment'] = item['sentiment']
        base['sources'] = sources

        # Recalculate categories
        cats = {}
        for item in base['items']:
            cat = item.get('category', 'community')
            if cat not in cats:
                cats[cat] = {'found': 0, 'sentiment': None}
            cats[cat]['found'] += 1
            if cats[cat]['sentiment'] is None and item.get('sentiment'):
                cats[cat]['sentiment'] = item['sentiment']
        base['categories'] = cats

        # Recalculate sentiment from item sentiments
        pos = neu = neg = 0
        for item in base['items']:
            s = item.get('sentiment', 'neutral')
            if s == 'positive': pos += 1
            elif s == 'negative': neg += 1
            else: neu += 1
        total = pos + neu + neg
        if total:
            base['sentiment'] = {
                'positive': round(pos / total * 100),
                'neutral': round(neu / total * 100),
                'negative': round(neg / total * 100),
            }

        merged.append(base)
        print(f"  Merged into 1 entry with {len(base['items'])} items", file=sys.stderr)

# Sort merged by timestamp desc (newest first)
merged.sort(key=lambda e: e['timestamp'], reverse=True)
print(f"\nBefore: {len(data)} entries → After: {len(merged)} entries", file=sys.stderr)

with open(FILE, 'w') as f:
    json.dump(merged, f, indent=2, ensure_ascii=False)
print("Done. reports.json rewritten.", file=sys.stderr)