#!/usr/bin/env python3
"""One-off: tag the latest report's items with themes via the same LLM batch the
pipeline uses, preserving existing sentiment. Run after a pipeline that predates
theme tagging so the dashboard's Dominant Themes card populates immediately."""
import json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import run_gamefilm_pipeline as p

with open(p.REPORTS_JSON) as f:
    reports = json.load(f)

if not reports:
    print("no reports")
    sys.exit(0)

latest = max(reports, key=lambda r: r.get('timestamp', ''))
items = latest.get('items', [])
print(f"latest {latest.get('timestamp')} — {len(items)} items")

for start in range(0, len(items), p.SENTIMENT_BATCH):
    batch = items[start:start + p.SENTIMENT_BATCH]
    mapped = p._llm_sentiment_batch(batch)
    for idx, it in enumerate(batch):
        got = mapped.get(idx)
        it['themes'] = got['t'] if got else it.get('themes', [])

latest['themes'] = sorted({t for i in items for t in i.get('themes', [])})
tagged = sum(1 for i in items if i.get('themes'))
print(f"tagged {tagged}/{len(items)} items")
print("report themes:", latest['themes'])

with open(p.REPORTS_JSON, 'w') as f:
    json.dump(reports, f, indent=2)
print("written")
