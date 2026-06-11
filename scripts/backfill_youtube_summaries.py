#!/usr/bin/env python3
"""
backfill_youtube_summaries.py — Retroactively AI-summarize today's already-captured
YouTube items in reports.json that predate the summarization feature.

Designed to be run repeatedly (e.g. on a cron retry) while a transient YouTube IP
block clears. Behavior:
  - Finds today's (PT) YouTube items with no `summarized` flag.
  - Summarizes each (rate-limited); bails cleanly on a hard IP block to retry later.
  - On any successful summaries: commits reports.json, pushes, and redeploys Vercel.
  - Prints REMAINING=<n> so a scheduler can self-disable when 0.

Exit codes:
  0 = nothing left to do (all today's YT items summarized, or none exist)
  10 = work remains (IP blocked or partial) — scheduler should retry later
"""
import sys, os, json, subprocess
from datetime import datetime
from zoneinfo import ZoneInfo

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(SCRIPT_DIR)
REPORTS_FILE = os.path.join(REPO, 'public', 'data', 'reports.json')
PT = ZoneInfo('America/Los_Angeles')
TODAY_PT = datetime.now(PT).date().isoformat()

sys.path.insert(0, SCRIPT_DIR)
from fetch_gamefilm import summarize_youtube_video  # noqa: E402


def today_yt_targets(reports):
    targets = []
    for r in reports:
        ts = str(r.get('date') or r.get('timestamp') or '')
        if not ts.startswith(TODAY_PT):
            continue
        for item in r.get('items', []):
            url = item.get('url', '') or ''
            if 'youtube' in url and not item.get('summarized'):
                targets.append(item)
    return targets


def main():
    with open(REPORTS_FILE) as f:
        reports = json.load(f)

    targets = today_yt_targets(reports)
    print(f"[backfill] {len(targets)} unsummarized YouTube items for {TODAY_PT}", file=sys.stderr)
    if not targets:
        print("REMAINING=0")
        return 0

    filled = 0
    blocked = False
    for item in targets:
        url = item.get('url', '')
        vid = url.rsplit('v=', 1)[-1].split('&')[0]
        title = item.get('title', '')
        try:
            summary = summarize_youtube_video(vid, title)
        except RuntimeError as e:
            print(f"[backfill] IP block — stopping, will retry: {e}", file=sys.stderr)
            blocked = True
            break
        if summary:
            item['snippet'] = summary
            item['summarized'] = True
            filled += 1
            print(f"[backfill] OK: {title[:55]} -> {summary[:90]}", file=sys.stderr)

    if filled:
        with open(REPORTS_FILE, 'w') as f:
            json.dump(reports, f, indent=2)
        print(f"[backfill] Wrote {filled} summaries. Committing + deploying...", file=sys.stderr)
        deploy(filled)

    remaining = len(today_yt_targets(reports))
    print(f"REMAINING={remaining}")
    if blocked or remaining > 0:
        return 10
    return 0


def deploy(filled):
    os.chdir(REPO)
    subprocess.run(['git', 'add', 'public/data/reports.json'], check=False)
    msg = f"chore: backfill {filled} YouTube AI summaries for {TODAY_PT}"
    c = subprocess.run(['git', 'commit', '-m', msg], capture_output=True, text=True)
    if c.returncode != 0:
        print(f"[backfill] git commit: {c.stdout}{c.stderr}", file=sys.stderr)
        return
    subprocess.run(['git', 'push', 'origin', 'main'], check=False)
    print("[backfill] Pushed. Deploying to Vercel...", file=sys.stderr)
    subprocess.run('vercel --prod --yes 2>&1 | tail -5', shell=True, check=False)


if __name__ == '__main__':
    sys.exit(main())
