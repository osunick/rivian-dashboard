#!/usr/bin/env python3
"""
fetch_rivianforums.py — Scrape RivianForums UHF/Hands-Free Driving forum using Playwright.
Extracts recent threads with title, URL, author, date, reply count, view count.
"""

import json, sys, os, re, subprocess
from datetime import datetime, timezone

PT = timezone.utc

def fetch_forum_page(forum_id, forum_slug):
    """Fetch forum thread list via Playwright-controlled browser."""

    node_script = """
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
  });

  try {
    const response = await page.goto('https://www.rivianforums.com/forum/forums/uhf-hands-free-driving-autonomy-driving-aids-adas.48/', {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });

    // Wait for challenge to clear - title changes from "Just a moment..."
    try {
      await page.waitForFunction(() => {
        const title = document.title;
        return title !== 'Just a moment...' && !title.includes('cf-challenge') && !title.includes('cloudflare');
      }, { timeout: 30000 });
    } catch (e) {
      // Challenge didn't clear in time
      console.log(JSON.stringify({ error: 'Challenge timeout - Cloudflare blocked', title: await page.title(), success: false }));
      await browser.close();
      return;
    }

    // Give page a moment to fully render after challenge
    await page.waitForTimeout(2000);

    const title = await page.title();
    const url = page.url();

    // Try multiple selectors for thread list
    const threads = await page.evaluate(() => {
      const selectors = [
        '.structItem',
        '.thread-list-item',
        '.discussionListItem',
        'tr[data-id]',
        '#thread-list tr',
        '.forum_thread_list tr',
      ];

      let items = [];
      for (const sel of selectors) {
        items = document.querySelectorAll(sel);
        if (items.length > 0) break;
      }

      if (items.length === 0) {
        const links = document.querySelectorAll('a[href*="/threads/"]');
        return Array.from(links).slice(0, 30).map(link => {
          const row = link.closest('tr') || link.closest('li') || link.parentElement;
          return {
            title: link.textContent.trim(),
            url: link.href,
            author: row ? (row.querySelector('.author, .username, [class*="author"]')?.textContent.trim() || '') : '',
            date: row ? (row.querySelector('.time, [class*="time"], [class*="date"]')?.textContent.trim() || '') : '',
          };
        });
      }

      return Array.from(items).map(el => {
        const link = el.querySelector('a[href*="/threads/"]') || el.querySelector('a');
        const titleEl = el.querySelector('.structItem-title a, .thread-title, .title');
        const authorEl = el.querySelector('.structItem-meta a, .author, .username');
        const dateEl = el.querySelector('.structItem-cell:last-child, .last-post, .postTime');
        const repliesEl = el.querySelector('.structItem-messageCount, .reply-count');
        const viewsEl = el.querySelector('.structItem-viewCount, .view-count');
        return {
          title: titleEl ? titleEl.textContent.trim() : (link ? link.textContent.trim() : ''),
          url: link ? link.href : '',
          author: authorEl ? authorEl.textContent.trim() : '',
          date: dateEl ? dateEl.textContent.trim() : '',
          replies: repliesEl ? repliesEl.textContent.trim() : '',
          views: viewsEl ? viewsEl.textContent.trim() : '',
        };
      });
    });

    console.log(JSON.stringify({ title, url, threads, success: true, threadCount: threads.length }));
  } catch (err) {
    console.log(JSON.stringify({ error: err.message, success: false }));
  }

  await browser.close();
})();
"""

    result = subprocess.run(
        ['node', '-e', node_script],
        cwd='/Users/osunick/.openclaw/workspace/rivian-dashboard',
        capture_output=True, text=True, timeout=90
    )

    if result.returncode != 0:
        print(f"[fetch_rivianforums] Playwright error: {result.stderr}", file=sys.stderr)
        return None

    try:
        data = json.loads(result.stdout)
        return data
    except:
        print(f"[fetch_rivianforums] Failed to parse: {result.stdout[:300]}", file=sys.stderr)
        return None

def main():
    print(f"[fetch_rivianforums] Starting RivianForums scrape...", file=sys.stderr)

    data = fetch_forum_page('48', 'forums/uhf-hands-free-driving-autonomy-driving-aids-adas')

    if not data:
        print("[fetch_rivianforums] No data returned", file=sys.stderr)
        sys.exit(1)

    if not data.get('success'):
        print(f"[fetch_rivianforums] Browser error: {data.get('error', 'unknown')}", file=sys.stderr)
        print(f"[fetch_rivianforums] Page title was: {data.get('title', 'unknown')}", file=sys.stderr)
        sys.exit(1)

    print(f"[fetch_rivianforums] Page title: {data.get('title', 'unknown')}", file=sys.stderr)
    print(f"[fetch_rivianforums] URL: {data.get('url', 'unknown')}", file=sys.stderr)
    print(f"[fetch_rivianforums] Thread count: {len(data.get('threads', []))}", file=sys.stderr)

    for t in data.get('threads', [])[:5]:
        print(f"[fetch_rivianforums] Thread: {json.dumps(t)}", file=sys.stderr)

    output = {
        'source': 'rivianforums_forum',
        'forum_id': '48',
        'forum_url': 'https://www.rivianforums.com/forum/forums/uhf-hands-free-driving-autonomy-driving-aids-adas.48/',
        'fetched_at': datetime.now().isoformat(),
        'page_title': data.get('title', ''),
        'threads': data.get('threads', []),
    }

    print(json.dumps(output, indent=2, ensure_ascii=False))

if __name__ == '__main__':
    main()