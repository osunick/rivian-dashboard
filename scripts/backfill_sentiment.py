#!/usr/bin/env python3
"""One-shot: re-classify sentiment for every item in reports.json via the LLM.

Classifies each unique item (keyed by url, else title) exactly once, then applies
the result to every occurrence across reports and recomputes per-report summaries.
"""
import sys, json
sys.path.insert(0, 'scripts')
import run_gamefilm_pipeline as p

PATH = 'public/data/reports.json'
reports = json.load(open(PATH))

# Collect unique items (first occurrence) and set category.
uniq = {}
for r in reports:
    for it in r.get('items', []):
        it['category'] = p.guess_category(it)
        key = it.get('url') or it.get('title') or ''
        if key and key not in uniq:
            uniq[key] = dict(it)

keys = list(uniq.keys())
batch_items = [uniq[k] for k in keys]
print(f"Unique items to classify: {len(batch_items)}")

# Classify in batches with progress.
sent = {}
B = p.SENTIMENT_BATCH
for start in range(0, len(batch_items), B):
    chunk = batch_items[start:start + B]
    p.assign_sentiments(chunk)
    for k, it in zip(keys[start:start + B], chunk):
        sent[k] = it['sentiment']
    print(f"  classified {min(start + B, len(batch_items))}/{len(batch_items)}", flush=True)

# Apply to every occurrence + recompute per-report summary.
for r in reports:
    items = r.get('items', [])
    for it in items:
        key = it.get('url') or it.get('title') or ''
        it['sentiment'] = sent.get(key) or p.classify_sentiment(it)
    if items:
        s = {'positive': 0, 'neutral': 0, 'negative': 0}
        for it in items:
            s[it['sentiment']] = s.get(it['sentiment'], 0) + 1
        total = len(items) or 1
        r['sentiment'] = {k: int(v / total * 100) for k, v in s.items()}

json.dump(reports, open(PATH, 'w'), indent=2)

from collections import Counter
dist = Counter(sent.values())
print(f"Done. Unique distribution: {dict(dist)}")
