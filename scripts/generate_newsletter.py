#!/usr/bin/env python3
"""
generate_newsletter.py — Author the GameFilm Weekly newsletter.

Takes the past 7 days of GameFilm reports, dedupes signals by URL, and has Opus
synthesize a weekly intelligence newsletter (storylines + sections + watch list)
as structured JSON written to public/data/newsletter.json.

Usage:
  python3 scripts/generate_newsletter.py            # write file only
  python3 scripts/generate_newsletter.py --deploy   # also git commit + vercel deploy
"""
import json, subprocess, sys, os
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

REPO = "/Users/osunick/.openclaw/workspace/rivian-dashboard"
REPORTS_JSON = os.path.join(REPO, "public", "data", "reports.json")
NEWSLETTER_JSON = os.path.join(REPO, "public", "data", "newsletter.json")
PT = ZoneInfo("America/Los_Angeles")

CLAUDE_BIN = os.environ.get("CLAUDE_BIN", "/opt/homebrew/bin/claude")
NEWSLETTER_MODEL = "claude-opus-4-8"
WINDOW_DAYS = 7
MAX_SIGNALS = 90  # cap signals handed to the model (bounds prompt size)


def load_reports():
    with open(REPORTS_JSON) as f:
        return json.load(f)


def past_week_items(reports):
    """Deduped items from reports within the trailing WINDOW_DAYS (by report ts)."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=WINDOW_DAYS)
    seen, items = set(), []
    for r in reports:
        ts = r.get("timestamp", "")
        try:
            rt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        except Exception:
            continue
        if rt < cutoff:
            continue
        for it in r.get("items", []) or []:
            url = it.get("url")
            if not url or url in seen:
                continue
            seen.add(url)
            items.append(it)
    return items


def sentiment_counts(items):
    c = {"positive": 0, "neutral": 0, "negative": 0}
    for it in items:
        s = it.get("sentiment", "neutral")
        c[s if s in c else "neutral"] += 1
    return c


def build_prompt(items, week_start, week_end, sentiment):
    by_cat = {}
    for it in items[:MAX_SIGNALS]:
        by_cat.setdefault(it.get("category", "other"), []).append(it)
    lines = []
    for cat, cat_items in by_cat.items():
        lines.append(f"\n## {cat} ({len(cat_items)})")
        for it in cat_items:
            s = it.get("sentiment", "neutral")
            src = it.get("source", "")
            title = (it.get("title") or "").strip()
            snip = (it.get("snippet") or "").strip()[:200]
            url = it.get("url", "")
            lines.append(f"- [{s}|{src}] {title} — {snip} URL: {url}")
    data_block = "\n".join(lines) if lines else "(no items)"

    return (
        "You are the editor of GameFilm Weekly, a competitive-intelligence newsletter "
        "for Rivian's product team. Synthesize the past week's scraped signals into a "
        "sharp, skimmable weekly edition. Connect dots across days, surface what actually "
        "matters to a Rivian PM, and call out implications — not just headlines.\n\n"
        f"WEEK COVERED: {week_start} to {week_end} (PT). SENTIMENT MIX: {sentiment}.\n\n"
        "Return ONLY a JSON object (no prose, no markdown, no code fences) with this exact shape:\n"
        "{\n"
        '  "subtitle": "one punchy sentence capturing the week\'s dominant theme",\n'
        '  "sections": [\n'
        '    {"emoji": "🎯", "heading": "Top Storylines", "items": [\n'
        '      {"headline": "short bold headline", "body": "2-4 sentence PM-focused analysis with the implication", "links": [{"label": "r/Rivian", "url": "https://..."}]}\n'
        "    ]}\n"
        "  ],\n"
        '  "watchList": ["forward-looking thing to track next week", "..."]\n'
        "}\n\n"
        "SECTION GUIDANCE:\n"
        "- Lead with a 'Top Storylines' section (2-4 of the week's biggest narratives).\n"
        "- Then include only the sections that have real content, chosen from: "
        "'🤖 Autonomy & ADAS', '⚔️ Competitive Watch', '🚗 Vehicles & Product', "
        "'📱 Software & Tech', '💰 Business & Markets', '🌐 Community & Owners'.\n"
        "- Each section: 1-4 items. Each item: a headline, a tight analytical body, and "
        "1-3 links. ONLY use URLs that appear verbatim in the signals below — never invent links.\n"
        "- watchList: 3-6 concise forward-looking bullets.\n\n"
        "SIGNALS:\n" + data_block
    )


def call_opus(prompt):
    r = subprocess.run(
        [CLAUDE_BIN, "-p", "--model", NEWSLETTER_MODEL, prompt],
        capture_output=True, text=True, timeout=300,
    )
    out = (r.stdout or "").strip()
    if r.returncode != 0 or not out:
        print(f"[newsletter] LLM rc={r.returncode}: {(r.stderr or '')[:300]}", file=sys.stderr)
        return None
    if out.startswith("```"):
        out = out.split("\n", 1)[-1]
        if out.rstrip().endswith("```"):
            out = out.rstrip()[:-3].rstrip()
    start, end = out.find("{"), out.rfind("}")
    if start == -1 or end == -1:
        print("[newsletter] no JSON object in output", file=sys.stderr)
        return None
    try:
        return json.loads(out[start:end + 1])
    except Exception as e:
        print(f"[newsletter] JSON parse error: {e}", file=sys.stderr)
        return None


def sanitize(doc, valid_urls):
    """Keep only model links whose URL was in the source signals (no hallucinations)."""
    sections = []
    for sec in doc.get("sections", []) or []:
        items = []
        for it in sec.get("items", []) or []:
            links = [l for l in (it.get("links") or [])
                     if isinstance(l, dict) and l.get("url") in valid_urls]
            items.append({
                "headline": (it.get("headline") or "").strip(),
                "body": (it.get("body") or "").strip(),
                "links": links,
            })
        items = [i for i in items if i["headline"] or i["body"]]
        if items:
            sections.append({
                "emoji": (sec.get("emoji") or "").strip(),
                "heading": (sec.get("heading") or "").strip(),
                "items": items,
            })
    watch = [w.strip() for w in (doc.get("watchList") or []) if isinstance(w, str) and w.strip()]
    return sections, watch


def main():
    deploy = "--deploy" in sys.argv
    reports = load_reports()
    items = past_week_items(reports)
    print(f"[newsletter] {len(items)} deduped signals in trailing {WINDOW_DAYS}d", file=sys.stderr)
    if not items:
        print("[newsletter] no items in window — aborting", file=sys.stderr)
        sys.exit(1)

    now_pt = datetime.now(PT)
    week_start = (now_pt - timedelta(days=WINDOW_DAYS - 1)).strftime("%Y-%m-%d")
    week_end = now_pt.strftime("%Y-%m-%d")
    sentiment = sentiment_counts(items)

    doc = call_opus(build_prompt(items, week_start, week_end, sentiment))
    if not doc:
        print("[newsletter] generation failed", file=sys.stderr)
        sys.exit(1)

    valid_urls = {it.get("url") for it in items if it.get("url")}
    sections, watch = sanitize(doc, valid_urls)
    if not sections:
        print("[newsletter] no valid sections after sanitize — aborting", file=sys.stderr)
        sys.exit(1)

    prev_edition = 0
    if os.path.exists(NEWSLETTER_JSON):
        try:
            with open(NEWSLETTER_JSON) as f:
                prev_edition = int(json.load(f).get("edition", 0))
        except Exception:
            prev_edition = 0

    newsletter = {
        "edition": prev_edition + 1,
        "title": "GameFilm Weekly — Rivian Intelligence",
        "subtitle": (doc.get("subtitle") or "").strip(),
        "weekStart": week_start,
        "weekEnd": week_end,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "signalCount": len(items),
        "sentiment": sentiment,
        "sections": sections,
        "watchList": watch,
    }

    with open(NEWSLETTER_JSON, "w") as f:
        json.dump(newsletter, f, indent=2, ensure_ascii=False)
    print(f"[newsletter] wrote edition #{newsletter['edition']} — {len(sections)} sections, "
          f"{sum(len(s['items']) for s in sections)} items", file=sys.stderr)

    if deploy:
        def run(cmd, timeout=120):
            r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
            return r.returncode == 0, (r.stdout or "") + (r.stderr or "")
        ok, out = run(
            f"cd {REPO} && git add public/data/newsletter.json && "
            f"git diff --cached --quiet && echo NO_CHANGES || "
            f"git commit -m 'GameFilm Weekly newsletter: edition #{newsletter['edition']}' && git push origin main",
            timeout=60,
        )
        print(f"[newsletter] git: {'no changes' if 'NO_CHANGES' in out else ('OK' if ok else out[-300:])}", file=sys.stderr)
        ok_v, out_v = run(f"cd {REPO} && vercel --prod --yes 2>&1", timeout=180)
        print(f"[newsletter] vercel: {'OK' if (ok_v or 'Production' in out_v) else out_v[-300:]}", file=sys.stderr)


if __name__ == "__main__":
    main()
