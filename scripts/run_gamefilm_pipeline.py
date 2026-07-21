#!/usr/bin/env python3
"""
GameFilm Pipeline.
Fetches data, classifies sentiment with local heuristics, builds report, formats brief.
Delivery is handled separately by scripts/send_gamefilm_signal.py so it can send
directly to Signal and WhatsApp without relying on agent-session visibility.
"""
import json, subprocess, sys, os
from datetime import datetime

REPORTS_JSON = "/Users/osunick/.openclaw/workspace/rivian-dashboard/public/data/reports.json"
FETCH_LOG = "/tmp/gamefilm_fetch.log"
RAW_JSON = "/tmp/gamefilm_raw.json"
BRIEF_FILE = "/tmp/gamefilm_brief.txt"

def run(cmd, timeout=60):
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
        return r.returncode == 0, r.stdout + r.stderr
    except Exception as e:
        return False, str(e)

def sentiment_label(neg):
    if neg >= 50: return "🔴 HIGH"
    if neg >= 30: return "🟠 ELEVATED"
    if neg >= 15: return "🔵 MEDIUM"
    return "🟢 LOW"


def clean_snippet(text):
    """Strip HTML tags from a snippet for clean plain-text display."""
    import re
    if not text:
        return '—'
    # Match any HTML tag (non-greedy) and URLs that follow href/src attributes
    text = re.sub(r'<a[^>]*href="([^"]+)"[^>]*>([^<]*)</a>', r'\2', text)  # extract link text from <a href="...">text</a>
    text = re.sub(r'<[^>]+>', '', text)  # strip remaining tags
    text = re.sub(r'https?://[^\s]+', '', text)  # strip bare URLs
    text = re.sub(r'\s+', ' ', text).strip()
    return text[:200] or '—'

def format_date(iso_str):
    try:
        dt = datetime.fromisoformat(iso_str.replace('Z','+00:00'))
        return dt.strftime('%A, %B %d, %Y')
    except:
        return iso_str

def format_time(iso_str):
    try:
        dt = datetime.fromisoformat(iso_str.replace('Z','+00:00'))
        return dt.strftime('%I:%M %p PT').lstrip('0')
    except:
        return iso_str

# Known competitor keywords (mirrors dashboard COMPETITORS keywords)
COMPETITOR_KW = {
    'tesla': ['tesla','tsla','model y','model 3','model x','model s','cybertruck','fsd','grok','optimus','cybercab'],
    'robotaxi': ['waymo','aurora','cruise','zoox','mobileye','robotaxi','lidar','full self-driving','unsupervised fsd','waymo one','waymo driver','aurora driver','driverless'],
    'oems': ['ford','f-150 lightning','mach-e','mustang mach-e','gm','general motors','chevrolet','chevy','silverado ev','equinox ev','hummer ev','toyota','honda','stellantis','ram ev','blazer ev','scout motors','volkswagen','vw','id4','bmw','mercedes','audi'],
    'chinese_av': ['byd','xpev','xpeng','nio','li auto','huawei','baidu','xiaomi su7','byd seal','zeekr','polestar','catl'],
}
ALL_COMPETITOR_KW = [kw for kws in COMPETITOR_KW.values() for kw in kws]

CATEGORY_ORDER = ['autonomy', 'demo_drives', 'vehicles', 'business', 'software', 'community', 'competitive']

CATEGORY_LABELS = {
    'autonomy': '🤖 Autonomy',
    'demo_drives': '🧪 Demo & Test Drives',
    'vehicles': '🚗 Vehicles',
    'business': '💰 Business',
    'software': '📱 Software',
    'community': '🌐 Community',
}

DEMO_DRIVE_TERMS = [
    'demo drive', 'demo-drive', 'demo ride', 'demo review',
    'test drive', 'test-drive', 'test ride', 'test drove', 'test driving',
    'first drive', 'first-drive', 'drive review', 'driving impressions',
    'initial thoughts', 'first impressions', 'behind the wheel',
    'hands on', 'hands-on', 'walkaround', 'walk around',
]

# Sources that are too noisy/generic to be competitive intel on their own
NOISY_SOURCES = {'wsj','nytimes','bloomberg','bloomberg_top','reuters','reuters_top','ap','abcnews','detroitnews','hackernews','automotive_news','motor_trend'}

def guess_category(item):
    if 'category' in item:
        return item['category']
    title = (item.get('title','') + ' ' + item.get('snippet','')).lower()
    source = item.get('source','').lower()

    is_rivian = any(k in title for k in ['rivian','r1','r2','r1t','r1s'])
    is_demo_drive = is_rivian and any(k in title for k in DEMO_DRIVE_TERMS)
    is_autonomy = any(k in title for k in ['autonomy','fsd','self-driving','waymo','cruise','autopilot','bluecruise','super cruise'])
    is_vehicle = any(k in title for k in ['vehicle','truck','suv','delivery','launch','polestar','tesla ev','electric suv','electric truck'])
    is_business = any(k in title for k in ['stock','earnings','revenue','profit','layoff','financial','ipo','acquisition','merger'])
    is_software = any(k in title for k in ['ota','update','bug','infotainment','software','recall'])
    is_community = any(k in title for k in ['owner','forum','reddit','bluesky','twitter','youtube','owner','community'])

    # Rivian items → vehicles (or autonomy/business/software if also about those)
    if is_rivian:
        if is_business: return 'business'
        if is_software: return 'software'
        if is_demo_drive: return 'demo_drives'
        if is_autonomy: return 'autonomy'
        return 'vehicles'

    # Competitor intel: ONLY if item contains a competitor keyword
    has_comp_kw = any(kw in title for kw in ALL_COMPETITOR_KW)
    if has_comp_kw:
        # Noisy sources get 'other' unless it's a specific product launch/review
        if source in NOISY_SOURCES:
            strong_comp = any(kw in title for kw in [
                'cybertruck','model y','model 3','model x','model s',
                'f-150 lightning','mach-e','equinox ev','silverado ev','hummer ev','ioniq','ipace',
                'waymo','aurora','zoox','byd seal','xpeng','xpev','nio ',('li auto'),
                'tesla','tsla','ford','gm ','chevrolet','volkswagen','honda','toyota',
            ])
            if strong_comp:
                return 'competitive'
            return 'other'
        return 'competitive'


    # Autonomy/ADAS systems
    if is_autonomy:
        return 'autonomy'
    # Vehicle launches, reviews, comparisons
    if is_vehicle:
        return 'vehicles'
    # Business/financial news
    if is_business:
        return 'business'
    # Software/OTA updates
    if is_software:
        return 'software'
    # Community/social
    if is_community:
        return 'community'

    # Fallback: noisy sources get 'other' (ignored by dashboard competitor view)
    if source in NOISY_SOURCES:
        return 'other'

    return 'other'  # Default: not competitive, not Rivian — discard from intel

# Sentiment lexicons. Scored on title+snippet; net = pos_hits - neg_hits.
POS_WORDS = [
    'record', 'profit', 'profitable', 'beats', 'surge', 'surges', 'soar', 'soars',
    'rally', 'growth', 'grows', 'milestone', 'award', 'awarded', 'wins', ' win ', ' won ',
    'best', 'love', 'loving', 'impressive', 'praise', 'praised', 'strong', 'success', 'successful',
    'breakthrough', 'partnership', 'expansion', 'expands', 'upgrade',
    'upgraded', 'outperform', 'gains', 'delivers', 'delivered', 'pickup day', 'excited',
    'great', 'amazing', 'recommend', 'fantastic', 'leading', 'boost',
    'approval', 'approved', 'secures', 'secured', 'momentum', 'optimistic', 'bullish',
]
NEG_WORDS = [
    'recall', 'recalls', 'recalled', 'lawsuit', 'sued', 'layoff', 'layoffs', 'cuts',
    'cutting', ' loss', 'losses', 'plunge', 'plunges', 'falls', 'fell ', ' drop', 'crash',
    'crashes', 'defect', ' bug', 'glitch', 'problem', 'problems', ' issue', 'issues',
    'complaint', 'complaints', 'fails', 'failed', 'failure', 'delay', 'delayed', 'delays',
    'concern', 'concerns', 'warning', 'warns', 'investigation', 'probe', 'death', 'killed',
    'accident', 'disappointing', 'disappointed', 'worst', 'broken', 'stranded', 'downgrade',
    'downgraded', 'missed', 'bankruptcy', 'struggle', 'struggles', 'struggling',
    'decline', 'declines', 'slump', ' weak', 'halts', 'bearish', 'plummet',
]

THEME_RULES = [
    ('R2 Launch', [' r2', 'rivian r2', '2027 rivian r2']),
    ('Demo Drives', DEMO_DRIVE_TERMS),
    ('Audio System', ['sound system', 'audio', 'speaker']),
    ('Charging', ['charging', 'charger', 'supercharger', 'nacs', 'level 1', 'level 2']),
    ('Service Experience', ['service', 'maintenance', 'repair', 'warranty']),
    ('Vehicle Quality', ['quality', 'defect', 'damage', 'bumper', 'concern', 'problem', 'issue']),
    ('RIVN Stock', ['rivn', 'stock', 'nasdaq', 'shares', 'price target', 'forecast']),
    ('Commercial Vans', ['commercial van', 'edv', 'delivery van']),
    ('Autonomy', ['autonomy', 'adas', 'self-driving', 'driver assist', 'highway assist']),
    ('Software', ['software', 'ota', 'infotainment', 'update']),
    ('Tesla Competition', ['tesla', 'model y', 'model 3', 'cybertruck', 'fsd']),
    ('EV Market', ['ev ', '#ev', 'electric vehicle', 'electric vehicles']),
]

def classify_sentiment(item):
    """Sentiment toward Rivian's position.

    For Rivian items, tone of the news directly maps to sentiment. For competitor
    items, the sign is inverted — a competitor win is a threat (negative for
    Rivian), a competitor setback is relief (positive). Neutral when no signal or
    the signals tie. Mirrors the existing threat model where negative == threat.
    """
    text = (item.get('title', '') + ' ' + item.get('snippet', '')).lower()
    pos = sum(1 for w in POS_WORDS if w in text)
    neg = sum(1 for w in NEG_WORDS if w in text)
    net = pos - neg
    if item.get('category') == 'competitive':
        net = -net  # competitor good news is bad news for Rivian
    if net > 0:
        return 'positive'
    if net < 0:
        return 'negative'
    return 'neutral'

def infer_themes(item):
    """Infer a small set of dashboard themes from local keyword rules."""
    text = f"{item.get('title', '')} {item.get('snippet', '')}".lower()
    themes = []
    for theme, terms in THEME_RULES:
        if any(term in text for term in terms):
            themes.append(theme)
        if len(themes) >= 3:
            return themes

    category = item.get('category') or guess_category(item)
    fallback = {
        'autonomy': 'Autonomy',
        'demo_drives': 'Demo Drives',
        'vehicles': 'Vehicle Demand',
        'business': 'Business',
        'software': 'Software',
        'community': 'Community Signals',
        'competitive': 'Competitive Threats',
    }.get(category, 'Rivian Mentions')
    return [fallback]

def assign_sentiments(items):
    """Set item['sentiment'] and item['themes'] for every item using local rules."""
    for item in items:
        item['sentiment'] = classify_sentiment(item)
        item['themes'] = item.get('themes') or infer_themes(item)

def top_themes(items, limit=3):
    counts = {}
    for item in items:
        for theme in item.get('themes', []):
            counts[theme] = counts.get(theme, 0) + 1
    return [theme for theme, _ in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))[:limit]]

def category_counts(items):
    counts = {}
    for item in items:
        category = item.get('category', 'other')
        counts[category] = counts.get(category, 0) + 1
    return counts

def category_name(category):
    import re
    label = CATEGORY_LABELS.get(category, category.replace('_', ' ').title())
    return re.sub(r'[^a-zA-Z &]', '', label).strip()

def plural(count, singular, plural_word=None):
    return f"{count} {singular if count == 1 else (plural_word or singular + 's')}"

def compose_executive_summary(items, by_cat, sentiment, threat):
    competitive_count = len(by_cat.get('competitive', []))
    negative_count = sum(1 for item in items if item.get('sentiment') == 'negative')
    non_comp_counts = {
        c: len(by_cat.get(c, []))
        for c in CATEGORY_ORDER
        if c != 'competitive' and by_cat.get(c)
    }
    leading_categories = sorted(non_comp_counts.items(), key=lambda kv: (-kv[1], kv[0]))[:2]
    leading_category_text = ', '.join(f"{category_name(c)} ({n})" for c, n in leading_categories)
    theme_text = ', '.join(top_themes(items, 3))

    lines = []
    if competitive_count:
        comp_themes = ', '.join(top_themes(by_cat.get('competitive', []), 2)) or 'competitive positioning'
        lines.append(
            f"• *Competitive landscape:* {plural(competitive_count, 'rival signal')} surfaced, led by {comp_themes}."
        )
    else:
        lines.append("• *Competitive landscape:* No material rival signal surfaced in this run.")

    if leading_category_text:
        lines.append(
            f"• *Rivian posture:* {plural(sum(non_comp_counts.values()), 'Rivian signal')} clustered around {leading_category_text}."
        )
    else:
        lines.append("• *Rivian posture:* No material Rivian product, market, or community signal surfaced in this run.")

    risk_detail = f"{plural(negative_count, 'negative signal')}" if negative_count else "no negative signals"
    if theme_text:
        lines.append(f"• *Risk posture:* {threat} with {risk_detail}; watch {theme_text}.")
    else:
        lines.append(f"• *Risk posture:* {threat} with {risk_detail}.")
    return lines

def compose_brief(items, sentiment, ts):
    neg = sentiment.get('negative', 0)
    threat = sentiment_label(neg)

    by_cat = {}
    for item in items:
        cat = item.get('category', 'other')
        by_cat.setdefault(cat, []).append(item)

    lines = []
    n_cats = sum(1 for c in CATEGORY_ORDER if c != 'competitive' and by_cat.get(c))
    lines.append(f"▪️ *GameFilm — Executive Intelligence Brief*")
    lines.append(f"_{format_date(ts)} — {format_time(ts)} — {len(items)} signals · {n_cats} categories_")
    lines.append("")
    lines.append("*EXECUTIVE SUMMARY*")

    competitive = by_cat.get('competitive', [])
    lines.extend(compose_executive_summary(items, by_cat, sentiment, threat))

    lines.append("")
    lines.append("━━━━━━━━━━")
    lines.append(f"*COMPETITIVE DYNAMICS* ({len(competitive)})")
    if competitive:
        for item in competitive[:5]:
            theme = (item.get('themes',['competitive'])[0] if item.get('themes') else 'competitive').title()
            lines.append(f"• *{theme}:* {clean_snippet(item.get('snippet') or item.get('title'))}")
            if item.get('url'): lines.append(f"  {item['url']}")
    else:
        lines.append("• No competitive signals")

    lines.append("")
    lines.append("*PRODUCT & MARKET POSITIONING*")
    lines.append("")
    for cat_key in [c for c in CATEGORY_ORDER if c != 'competitive']:
        cat_label = category_name(cat_key)
        cat_items = by_cat.get(cat_key, [])
        cnt = len(cat_items)
        if cnt > 0:
            snippet = clean_snippet(cat_items[0].get('snippet') or cat_items[0].get('title'))
            lines.append(f"*{cat_label} ({cnt})* • {snippet}")
            if cat_items[0].get('url'): lines.append(f"  {cat_items[0]['url']}")
        else:
            lines.append(f"*{cat_label} (0)* • No signals")

    lines.append("")
    lines.append("━━━━━━━━━━")
    lines.append("*STRATEGIC IMPERATIVES*")
    all_themes = sorted(set(t for i in items for t in i.get('themes',[])))
    if all_themes:
        for t in all_themes[:6]: lines.append(f"• {t}")
    else:
        lines.append("• R2 launch")
        lines.append("• Competitive positioning")

    lines.append("")
    lines.append(f"_Threat: {threat}_")
    lines.append(f"_Dashboard: https://watchgamefilm.vercel.app_")

    return "\n".join(lines)

def summarize_for_dashboard(items):
    if items:
        counts = category_counts(items)
        leading = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))[:2]
        leading_text = ', '.join(f"{category_name(c)} ({n})" for c, n in leading)
        theme_text = ', '.join(top_themes(items, 2))
        summary = f"{plural(len(items), 'signal')} across {leading_text or 'Rivian intel'}"
        if theme_text:
            summary += f"; watch {theme_text}"
        return summary[:200]
    return 'Rivian intel'

def source_breakdown(items):
    sources = {}
    for item in items:
        source = item.get('source') or 'unknown'
        if source not in sources:
            sources[source] = {'found': 0, 'sentiment': None}
        sources[source]['found'] += 1
        if sources[source]['sentiment'] is None and item.get('sentiment'):
            sources[source]['sentiment'] = item.get('sentiment')
    return sources

def main():
    print("[GameFilm Pipeline] Starting...")

    # Fetch — use subprocess directly without capture_output to avoid pipe/redirect conflicts
    fetch_cmd = f"python3 /Users/osunick/.openclaw/workspace/rivian-dashboard/scripts/fetch_gamefilm.py > {RAW_JSON} 2>{FETCH_LOG}"
    try:
        r = subprocess.run(fetch_cmd, shell=True, stdout=None, stderr=None, timeout=360)
        fetch_ok = (r.returncode == 0)
    except Exception as e:
        fetch_ok = False
        print(f"[1] Fetch exception: {e}")
    print(f"[1] Fetch: {'OK' if fetch_ok else 'FAIL'}")

    try:
        with open(RAW_JSON) as f:
            raw = json.load(f)
        new_count = raw.get('new_item_count', 0)
        items = raw.get('items', [])
        print(f"[1] New items: {new_count}")
    except Exception as e:
        print(f"[1] Raw load error: {e}")
        new_count = 0
        items = []

    now_ts = datetime.utcnow().isoformat() + 'Z'

    # Analyze and save if new items
    if items:
        for item in items:
            # Always re-classify — category from fetch may be stale
            item['category'] = guess_category(item)
        # Sentiment from Rivian's perspective, using local heuristics.
        assign_sentiments(items)

        s = {'positive':0,'neutral':0,'negative':0}
        for i in items: s[i.get('sentiment','neutral')] = s.get(i.get('sentiment','neutral'),0)+1
        total = len(items) or 1
        sentiment = {k:int(v/total*100) for k,v in s.items()}

        # Compose before saving so the dashboard JSON includes the same complete
        # narrative that gets delivered to Signal/WhatsApp.
        brief = compose_brief(items, sentiment, now_ts)
        print("[2] Brief composed")

        entry = {
            'id': now_ts, 'timestamp': now_ts,
            'sentiment': sentiment,
            'sources': source_breakdown(items),
            'categories': {c:{'found':sum(1 for i in items if i.get('category')==c),'sentiment':None}
                           for c in CATEGORY_ORDER},
            'themes': sorted(set(t for i in items for t in i.get('themes',[]))),
            'summary': summarize_for_dashboard(items),
            'fullReport': brief, 'items': items
        }

        try:
            with open(REPORTS_JSON) as f: reports = json.load(f)
        except: reports = []
        reports.append(entry)
        with open(REPORTS_JSON, 'w') as f: json.dump(reports, f, indent=2)
        print(f"[2] Saved report #{len(reports)}")

        # Deploy — split into git and vercel for clear error handling
        repo = "/Users/osunick/.openclaw/workspace/rivian-dashboard"

        # Step A: git commit + push (inline, no subprocess timeout issues)
        ok_git, out_git = run(f"cd {repo} && git add public/data/reports.json && git diff --cached --quiet && echo NO_CHANGES || git commit -m 'GameFilm scan: {now_ts}' && git push origin main", timeout=30)
        if 'NO_CHANGES' in out_git:
            print("[3a] Git: no changes to commit")
        elif ok_git:
            print("[3a] Git: committed and pushed OK")
        else:
            print(f"[3a] Git: WARN — {out_git[-300:]}")

        # Step B: Vercel deploy with actual URL verification
        ok_vercel, out_vercel = run(f"cd {repo} && vercel --prod --yes 2>&1", timeout=90)
        if 'watchgamefilm.vercel.app' in out_vercel or 'Production:' in out_vercel:
            print("[3b] Vercel: deployed OK")
        elif ok_vercel:
            # Vercel can return 0 with warnings; trust if ok=True
            print("[3b] Vercel: OK (exit 0)")
        else:
            print(f"[3b] Vercel: FAIL — {out_vercel[-400:]}")
            sys.exit(1)
    else:
        print("[2] No new items — using last report")
        sentiment = {'positive':80,'neutral':20,'negative':0}
        try:
            with open(REPORTS_JSON) as f: reports = json.load(f)
            if reports: items = reports[-1].get('items',[])
        except: pass

    # Compose brief for no-new-items runs. New-item runs already composed and
    # persisted the brief before saving the report above.
    if 'brief' not in locals():
        brief = compose_brief(items, sentiment, now_ts)
        print("[4] Brief composed")
    with open(BRIEF_FILE, 'w') as f: f.write(brief)
    print(f"[4] Brief written to {BRIEF_FILE}")
    print(f"\n{brief}\n")
    print("[GameFilm Pipeline] Done.")

if __name__ == "__main__":
    main()
