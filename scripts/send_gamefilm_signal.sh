#!/bin/bash
# Send the latest GameFilm brief to Signal, or forward stdin as the message body.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT="$ROOT/scripts/send_gamefilm_signal.py"

if [ -t 0 ]; then
  python3 "$SCRIPT" --channel signal "$@"
else
  python3 "$SCRIPT" --channel signal --stdin "$@"
fi
