#!/usr/bin/env python3
"""
Format and send the latest GameFilm brief to Signal, WhatsApp, or both.

Default behavior:
- If no send flags are provided, print the formatted brief to stdout.
- If a channel is requested, send through OpenClaw's direct channel delivery.
- Signal can optionally fall back to signal-cli if OpenClaw delivery fails.
"""

import argparse
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Tuple

REPORT_PATH = Path("/Users/osunick/.openclaw/workspace/rivian-dashboard/public/data/reports.json")
DEFAULT_TARGET = "+16507961015"
OPENCLAW_BIN = "openclaw"
SIGNAL_CLI_BIN = "signal-cli"


def to_pt_time(iso_str: str) -> str:
    try:
        dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        return dt.astimezone().strftime("%I:%M %p PT").lstrip("0")
    except Exception:
        return iso_str


def format_date(iso_str: str) -> str:
    try:
        dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        return dt.strftime("%A, %B %d, %Y")
    except Exception:
        return iso_str


def sentiment_label(neg: int) -> str:
    if neg >= 50:
        return "🔴 HIGH"
    if neg >= 30:
        return "🟠 ELEVATED"
    if neg >= 15:
        return "🔵 MEDIUM"
    return "🟢 LOW"


def load_latest_report() -> dict:
    with REPORT_PATH.open() as f:
        data = json.load(f)
    if not data:
        raise RuntimeError(f"No reports found in {REPORT_PATH}")
    return data[-1]


def build_brief(entry: dict) -> str:
    items = entry.get("items", [])
    sentiment = entry.get("sentiment", {})

    neg = sentiment.get("negative", 0)
    threat = sentiment_label(neg)

    by_cat: dict[str, list[dict]] = {}
    for item in items:
        by_cat.setdefault(item.get("category", "other"), []).append(item)

    competitive_items = by_cat.get("competitive", [])
    rivian_items = [i for i in items if i.get("category") != "competitive"]
    negative_items = [i for i in items if i.get("sentiment") == "negative"]

    sitrep_competitive = competitive_items[0] if competitive_items else None
    sitrep_rivian = rivian_items[0] if rivian_items else None
    sitrep_risk = negative_items[0] if negative_items else (competitive_items[1] if len(competitive_items) > 1 else None)

    total_items = len(items)
    n_cats = sum(1 for c in ["autonomy", "vehicles", "business", "software", "community"] if by_cat.get(c))
    ts = entry.get("timestamp", "")

    lines: list[str] = []
    lines.append("🎬 *GameFilm — Rivian Intel*")
    lines.append(f"_{format_date(ts)} — {to_pt_time(ts)} — {total_items} signals · {n_cats} categories_")
    lines.append("")
    lines.append("*🎯 SITREP*")

    if sitrep_competitive:
        lines.append(f"• *Competitor:* {sitrep_competitive.get('snippet', '—')}")
    if sitrep_rivian:
        lines.append(f"• *Rivian:* {sitrep_rivian.get('snippet', '—')}")
    if sitrep_risk:
        lines.append(f"• *Key risk:* {sitrep_risk.get('snippet', '—')}")

    lines.append("")
    lines.append("━━━━━━━━━━")
    lines.append(f"*⚔️ FIELD INTELLIGENCE* ({len(competitive_items)})")
    if competitive_items:
        for item in competitive_items:
            theme = item.get("themes", ["competitive"])[0] if item.get("themes") else "competitive"
            lines.append(f"• *{theme.title()}:* {item.get('snippet', '—')}")
            if item.get("url"):
                lines.append(f"  {item['url']}")
    else:
        lines.append("• No competitive signals")

    lines.append("")
    lines.append("*🚗 RIVIAN POSITION*")
    lines.append("")
    for cat_key, cat_label in [
        ("autonomy", "🤖 Autonomy"),
        ("vehicles", "🚗 Vehicles"),
        ("business", "💰 Business"),
        ("software", "📱 Software"),
        ("community", "🌐 Community"),
    ]:
        cat_items = by_cat.get(cat_key, [])
        count = len(cat_items)
        if count > 0:
            lines.append(f"*{cat_label} ({count})* • {cat_items[0].get('snippet', '—')}")
            if cat_items[0].get("url"):
                lines.append(f"  {cat_items[0]['url']}")
        else:
            lines.append(f"*{cat_label} (0)* • No signals")

    lines.append("")
    lines.append("━━━━━━━━━━")
    lines.append("*📌 PM WATCH LIST*")

    all_themes = sorted({theme for item in items for theme in item.get("themes", [])})
    if all_themes:
        for theme in all_themes[:5]:
            lines.append(f"• {theme}")
    else:
        lines.append("• R2 launch momentum")
        lines.append("• Competitive positioning")

    lines.append("")
    lines.append(f"_Threat: {threat}_")
    lines.append("_Dashboard: https://watchgamefilm.vercel.app_")
    return "\n".join(lines)


def run_command(cmd: List[str], *, input_text: Optional[str] = None):
    return subprocess.run(
        cmd,
        input=input_text,
        text=True,
        capture_output=True,
    )


def send_via_openclaw(channel: str, target: str, message: str, dry_run: bool) -> Tuple[bool, str]:
    cmd = [
        OPENCLAW_BIN,
        "message",
        "send",
        "--channel",
        channel,
        "--target",
        target,
        "--message",
        message,
        "--json",
    ]
    if dry_run:
        cmd.append("--dry-run")
    result = run_command(cmd)
    ok = result.returncode == 0
    output = (result.stdout or "") + (result.stderr or "")
    return ok, output.strip()


def send_via_signal_cli(target: str, message: str, dry_run: bool) -> Tuple[bool, str]:
    if dry_run:
        return True, f"signal-cli dry run -> {target}"
    result = run_command([SIGNAL_CLI_BIN, "send", target, "--message-from-stdin"], input_text=message)
    ok = result.returncode == 0
    output = (result.stdout or "") + (result.stderr or "")
    return ok, output.strip()


def send_message(channel: str, target: str, message: str, dry_run: bool, allow_signal_fallback: bool) -> Tuple[bool, str]:
    ok, output = send_via_openclaw(channel, target, message, dry_run)
    if ok:
        return True, output or f"{channel} delivered"

    if channel == "signal" and allow_signal_fallback:
        fallback_ok, fallback_output = send_via_signal_cli(target, message, dry_run)
        if fallback_ok:
            combined = output + ("\n" if output else "") + "signal fallback via signal-cli succeeded"
            return True, combined
        return False, output + ("\n" if output else "") + fallback_output

    return False, output


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Format and send the latest GameFilm brief.")
    parser.add_argument("--channel", choices=["signal", "whatsapp", "both"], help="Where to send the brief.")
    parser.add_argument("--target", default=DEFAULT_TARGET, help="Destination in E.164 format.")
    parser.add_argument("--message-file", help="Use message text from a file instead of the latest report.")
    parser.add_argument("--stdin", action="store_true", help="Read the message body from stdin.")
    parser.add_argument("--dry-run", action="store_true", help="Render or validate delivery without sending.")
    parser.add_argument("--print-only", action="store_true", help="Only print the rendered brief.")
    parser.add_argument(
        "--no-signal-fallback",
        action="store_true",
        help="Disable signal-cli fallback if OpenClaw Signal delivery fails.",
    )
    return parser.parse_args()


def read_message(args: argparse.Namespace) -> str:
    if args.stdin:
        return sys.stdin.read().strip()
    if args.message_file:
        return Path(args.message_file).read_text().strip()
    return build_brief(load_latest_report())


def main() -> int:
    args = parse_args()
    message = read_message(args)

    if args.print_only or not args.channel:
        print(message)
        return 0

    channels = ["signal", "whatsapp"] if args.channel == "both" else [args.channel]
    failures: List[Tuple[str, str]] = []

    for channel in channels:
        ok, output = send_message(
            channel,
            args.target,
            message,
            args.dry_run,
            allow_signal_fallback=not args.no_signal_fallback,
        )
        status = "OK" if ok else "FAIL"
        print(f"[{channel}] {status}")
        if output:
            print(output)
        if not ok:
            failures.append((channel, output))

    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
