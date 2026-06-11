#!/usr/bin/env python3
"""
fetch_gamefilm_quick.py — Direct module call version of fetch_gamefilm.py.
Bypasses subprocess issues by calling the fetch logic directly.
Writes output to /tmp/gamefilm_raw.json (same as fetch_gamefilm.py).
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

# Import and run the main fetch logic directly
import fetch_gamefilm as fg
import json

# Override print to capture logs
logs = []
def log(msg):
    logs.append(msg)

# Run the fetch
fg.main()

# After main() runs, read what was printed to stdout
# (main() prints JSON to stdout - we need to capture it)
# Since we can't easily capture stdout from main(), let's call the sub-functions directly
