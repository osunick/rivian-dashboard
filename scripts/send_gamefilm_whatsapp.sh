#!/bin/bash
# Send the latest GameFilm brief to WhatsApp, or forward stdin as the message body.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT="$ROOT/scripts/send_gamefilm_signal.py"

if [ -t 0 ]; then
  python3 "$SCRIPT" --channel whatsapp "$@"
else
  python3 "$SCRIPT" --channel whatsapp --stdin "$@"
fi
