#!/usr/bin/env python3
"""Backfill missing category/theme metadata without relying on Claude."""
import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(SCRIPT_DIR)
REPORTS_JSON = os.path.join(REPO, 'public', 'data', 'reports.json')

sys.path.insert(0, SCRIPT_DIR)
import run_gamefilm_pipeline as pipeline  # noqa: E402


def should_reclassify(item):
    category = item.get('category')
    if not category or category == 'other':
        return True
    text = f"{item.get('title', '')} {item.get('snippet', '')}".lower()
    is_rivian = any(k in text for k in ['rivian', 'r1t', 'r1s', ' r2'])
    is_demo = any(k in text for k in pipeline.DEMO_DRIVE_TERMS)
    return is_rivian and is_demo and category != 'demo_drives'


with open(REPORTS_JSON) as f:
    reports = json.load(f)

categories_changed = 0
themes_filled = 0
sentiment_filled = 0
sources_fixed = 0
summaries_fixed = 0

for report in reports:
    for item in report.get('items', []):
        if should_reclassify(item):
            previous = item.get('category')
            item.pop('category', None)
            item['category'] = pipeline.guess_category(item)
            if item['category'] != previous:
                categories_changed += 1

        if not item.get('sentiment'):
            item['sentiment'] = pipeline.classify_sentiment(item)
            sentiment_filled += 1

        if not item.get('themes'):
            item['themes'] = pipeline.infer_themes(item)
            themes_filled += 1

    items = report.get('items', [])
    previous_sources = report.get('sources')
    report['sources'] = pipeline.source_breakdown(items)
    if report['sources'] != previous_sources:
        sources_fixed += 1

    if not (report.get('summary') or '').strip():
        report['summary'] = pipeline.summarize_for_dashboard(items)
        summaries_fixed += 1

    report['themes'] = sorted({theme for item in items for theme in item.get('themes', [])})
    report['categories'] = {
        key: {
            'found': sum(1 for item in items if item.get('category') == key),
            'sentiment': None,
        }
        for key in pipeline.CATEGORY_ORDER
    }
    if items:
        counts = {'positive': 0, 'neutral': 0, 'negative': 0}
        for item in items:
            sentiment = item.get('sentiment', 'neutral')
            counts[sentiment] = counts.get(sentiment, 0) + 1
        total = len(items)
        report['sentiment'] = {key: int(value / total * 100) for key, value in counts.items()}

with open(REPORTS_JSON, 'w') as f:
    json.dump(reports, f, indent=2)

print(f"categories_changed={categories_changed}")
print(f"themes_filled={themes_filled}")
print(f"sentiment_filled={sentiment_filled}")
print(f"sources_fixed={sources_fixed}")
print(f"summaries_fixed={summaries_fixed}")
