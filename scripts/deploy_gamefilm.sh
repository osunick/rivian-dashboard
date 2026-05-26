#!/bin/bash
# deploy_gamefilm.sh — Append report entry, commit, push, and deploy.
# Usage: echo '<json>' | bash scripts/deploy_gamefilm.sh
#    or: bash scripts/deploy_gamefilm.sh /tmp/gamefilm-entry.json

set -e
REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"

# Accept entry from stdin or file arg
if [ -n "$1" ] && [ -f "$1" ]; then
  ENTRY_JSON="$(cat "$1")"
else
  ENTRY_JSON="$(cat)"
fi

# Validate it's valid JSON
echo "$ENTRY_JSON" | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'[deploy] Entry timestamp: {d.get(\"timestamp\")}')"

# Write to temp file for append script
TMP=$(mktemp /tmp/gamefilm-entry-XXXXXX.json)
echo "$ENTRY_JSON" > "$TMP"

# Append to reports.json
node scripts/append-report.js "$TMP"
rm -f "$TMP"

# Git commit + push
git add public/data/reports.json
if git diff --cached --quiet; then
  echo "[deploy] No changes to commit."
else
  git commit -m "GameFilm scan: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  git push origin main
  echo "[deploy] Pushed to main."
fi

# Vercel deploy
echo "[deploy] Deploying to Vercel..."
vercel --prod --yes 2>&1 | tail -5
echo "[deploy] Done."
