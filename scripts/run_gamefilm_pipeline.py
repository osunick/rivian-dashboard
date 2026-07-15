#!/usr/bin/env python3
"""
GameFilm Pipeline.
Fetches data, classifies sentiment (claude CLI, keyword fallback), builds report, formats brief.
Delivery is handled separately by scripts/send_gamefilm_signal.py so it can send
directly to Signal and WhatsApp without relying on agent-session visibility.
"""
import json, subprocess, sys, os
from datetime import datetime

REPORTS_JSON = "/Users/osunick/.openclaw/workspace/rivian-dashboard/public/data/reports.json"
FETCH_LOG = "/tmp/gamefilm_fetch.log"
RAW_JSON = "/tmp/gamefilm_raw.json"
BRIEF_FILE = "/tmp/gamefilm_brief.txt"

# Locally OAuth-authenticated `claude` CLI (Haiku) for sentiment — no API key.
CLAUDE_BIN = os.environ.get('CLAUDE_BIN', '/opt/homebrew/bin/claude')
SENTIMENT_MODEL = 'claude-haiku-4-5'
SENTIMENT_BATCH = 40        # items per LLM call (bounds prompt size + latency)
# Opus authors the brief itself (synthesis, not template). Falls back to the
# deterministic compose_brief() below on any failure.
BRIEF_MODEL = 'claude-opus-4-8'
BRIEF_MAX_ITEMS = 60        # cap items handed to the briefing model (bounds prompt)

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
    """Deterministic fallback themes for when the LLM classifier is unavailable."""
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

def _clean_themes(raw):
    """Normalize a model-returned themes value into a list of <=3 short tags."""
    if not isinstance(raw, list):
        return []
    out = []
    for t in raw:
        if not isinstance(t, str):
            continue
        tag = ' '.join(t.strip().split())[:32]
        if tag:
            out.append(tag)
    return out[:3]

def _llm_sentiment_batch(batch):
    """Classify one batch via the claude CLI. Returns {local_index: {"s": sentiment,
    "t": [themes]}} for indices the model returned validly, or {} on any failure
    (caller falls back)."""
    lines = []
    for idx, it in enumerate(batch):
        cat = it.get('category', 'other')
        text = (it.get('title', '') + ' — ' + (it.get('snippet') or '')).strip()
        lines.append(f"{idx} [{cat}]: {text[:240]}")
    prompt = (
        "You are a competitive-intelligence analyst for Rivian's product team. "
        "For each item, do two things from RIVIAN's strategic perspective:\n"
        "1) Classify sentiment:\n"
        '- "positive": good for Rivian (strong sales/deliveries, profit, wins, praise, '
        "favorable reviews, OR a competitor stumbling).\n"
        '- "negative": bad for Rivian (recalls, lawsuits, losses, defects, complaints, '
        "missed targets, OR a competitor winning/advancing — a competitive threat).\n"
        '- "neutral": purely factual, ambiguous, or not consequential either way.\n'
        "2) Tag 1-3 short themes (2-4 words each, Title Case) capturing the concrete "
        'topic — e.g. "R2 Launch", "RIVN Stock", "Highway Assist", "Charging Network", '
        '"Tesla FSD". Prefer reusing common themes across items so they aggregate.\n'
        "The bracketed tag is the item's category; 'competitive' items are about rivals, "
        "so judge them as threats/relief to Rivian.\n"
        'Return ONLY a JSON array of {"i":<index>,"s":"positive|negative|neutral",'
        '"t":["Theme One","Theme Two"]} — no prose, no markdown.\n\n'
        + "\n".join(lines)
    )
    try:
        r = subprocess.run(
            [CLAUDE_BIN, '-p', '--model', SENTIMENT_MODEL, prompt],
            capture_output=True, text=True, timeout=180,
        )
        out = (r.stdout or '').strip()
        if r.returncode != 0 or not out:
            print(f"[sentiment] LLM rc={r.returncode}: {(r.stderr or '')[:200]}", file=sys.stderr)
            return {}
        start, end = out.find('['), out.rfind(']')
        if start == -1 or end == -1:
            return {}
        parsed = json.loads(out[start:end + 1])
        result = {}
        for obj in parsed:
            i = obj.get('i')
            s = obj.get('s')
            if isinstance(i, int) and 0 <= i < len(batch) and s in ('positive', 'negative', 'neutral'):
                result[i] = {'s': s, 't': _clean_themes(obj.get('t'))}
        return result
    except Exception as e:
        print(f"[sentiment] LLM failed: {e}", file=sys.stderr)
        return {}

def assign_sentiments(items):
    """Set item['sentiment'] and item['themes'] for every item using the LLM, batched.
    Any item the LLM doesn't return falls back to the keyword classifier for sentiment
    (themes default to []) so nothing is missed."""
    for start in range(0, len(items), SENTIMENT_BATCH):
        batch = items[start:start + SENTIMENT_BATCH]
        mapped = _llm_sentiment_batch(batch)
        for idx, it in enumerate(batch):
            got = mapped.get(idx)
            if got:
                it['sentiment'] = got['s']
                it['themes'] = got['t'] or infer_themes(it)
            else:
                it['sentiment'] = classify_sentiment(it)
                it['themes'] = it.get('themes') or infer_themes(it)

def compose_brief_llm(items, sentiment, ts):
    """Have Opus author the brief from the scraped items (real synthesis, not a
    template). Returns the brief string, or None on any failure so the caller can
    fall back to the deterministic compose_brief()."""
    neg = sentiment.get('negative', 0)
    threat = sentiment_label(neg)
    header = f"🎬 *GameFilm — Rivian Intel*\n_{format_date(ts)} — {format_time(ts)} — {len(items)} signals_"
    footer = f"_Threat: {threat}_\n_Dashboard: https://watchgamefilm.vercel.app_"

    by_cat = {}
    for it in items[:BRIEF_MAX_ITEMS]:
        by_cat.setdefault(it.get('category', 'other'), []).append(it)

    data_lines = []
    for cat, cat_items in by_cat.items():
        data_lines.append(f"\n## {cat} ({len(cat_items)})")
        for it in cat_items:
            sent = it.get('sentiment', 'neutral')
            snip = clean_snippet(it.get('snippet'))
            title = (it.get('title') or '').strip()
            url = it.get('url', '')
            data_lines.append(f"- [{sent}] {title} — {snip} {('<' + url + '>') if url else ''}".strip())
    data_block = "\n".join(data_lines) if data_lines else "(no items)"

    prompt = (
        "You are a competitive-intelligence analyst writing a tactical brief for "
        "Rivian's product team. Synthesize the scraped signals below into a sharp, "
        "skimmable brief — connect dots, surface what actually matters to a Rivian PM, "
        "and call out implications, not just headlines. Be specific and concise.\n\n"
        "OUTPUT RULES (this is sent over Signal/WhatsApp):\n"
        "- Plain text only. Use *single asterisks* for bold (not **). No markdown tables, no headers with #.\n"
        "- IGNORE and filter out low-value, purely conversational thread titles (like memes, image captions, or zero-context replies). Only synthesize actual signal/news.\n"
        "- Keep the emoji section structure: 🎯 SITREP (2-4 bullets: top competitor move, Rivian's position, key risk), "
        "then a ━━━━━━━━━━ divider, ⚔️ FIELD INTELLIGENCE (the most consequential competitor items, with implication for Rivian), "
        "🚗 RIVIAN POSITION (group by 🤖 Autonomy / 🧪 Demo & Test Drives / 🚗 Vehicles / 💰 Business / 📱 Software / 🌐 Community as relevant), "
        "another divider, then 📌 PM WATCH LIST (3-6 forward-looking bullets — what to track next).\n"
        "- Include the source URL in <angle brackets> on its own line under any item you cite, so the link stays clickable.\n"
        "- Start your output with EXACTLY this header, then a blank line:\n" + header + "\n"
        "- End your output with EXACTLY these two lines:\n" + footer + "\n"
        "- Output ONLY the brief text. No preamble, no code fences, no commentary.\n\n"
        f"SENTIMENT MIX: {sentiment}\n"
        "SIGNALS:\n" + data_block
    )

    try:
        r = subprocess.run(
            [CLAUDE_BIN, '-p', '--model', BRIEF_MODEL, prompt],
            capture_output=True, text=True, timeout=240,
        )
        out = (r.stdout or '').strip()
        if r.returncode != 0 or not out:
            print(f"[brief] LLM rc={r.returncode}: {(r.stderr or '')[:200]}", file=sys.stderr)
            return None
        # Strip accidental code fences
        if out.startswith('```'):
            out = out.split('\n', 1)[-1]
            if out.rstrip().endswith('```'):
                out = out.rstrip()[:-3].rstrip()
        # Sanity: must look like the brief, not a refusal/explanation
        if 'GameFilm' not in out or 'watchgamefilm.vercel.app' not in out:
            print("[brief] LLM output failed sanity check; falling back", file=sys.stderr)
            return None
        return out.strip()
    except Exception as e:
        print(f"[brief] LLM failed: {e}", file=sys.stderr)
        return None

def compose_brief(items, sentiment, ts):
    pos = sentiment.get('positive', 0)
    neg = sentiment.get('negative', 0)
    threat = sentiment_label(neg)

    by_cat = {}
    for item in items:
        cat = item.get('category', 'other')
        by_cat.setdefault(cat, []).append(item)

    lines = []
    n_cats = sum(1 for c in CATEGORY_ORDER if c != 'competitive' and by_cat.get(c))
    lines.append(f"🎬 *GameFilm — Rivian Intel*")
    lines.append(f"_{format_date(ts)} — {format_time(ts)} — {len(items)} signals · {n_cats} categories_")
    lines.append("")
    lines.append("*🎯 SITREP*")

    competitive = by_cat.get('competitive', [])
    negative = [i for i in items if i.get('sentiment') == 'negative']
    demo_drives = by_cat.get('demo_drives', [])
    vehicles = by_cat.get('vehicles', [])
    positive = [i for i in items if i.get('sentiment') == 'positive']

    if competitive:
        lines.append(f"• *Competitor:* {clean_snippet(competitive[0].get('snippet'))}")
    if demo_drives:
        lines.append(f"• *Test drives:* {clean_snippet(demo_drives[0].get('snippet') or demo_drives[0].get('title'))}")
    elif vehicles:
        lines.append(f"• *Rivian:* {clean_snippet(vehicles[0].get('snippet'))}")
    if negative:
        lines.append(f"• *Key risk:* {clean_snippet(negative[0].get('snippet'))}")
    elif competitive and len(competitive) > 1:
        lines.append(f"• *Key risk:* {clean_snippet(competitive[1].get('snippet'))}")

    lines.append("")
    lines.append("━━━━━━━━━━")
    lines.append(f"*⚔️ FIELD INTELLIGENCE* ({len(competitive)})")
    if competitive:
        for item in competitive[:5]:
            theme = (item.get('themes',['competitive'])[0] if item.get('themes') else 'competitive').title()
            lines.append(f"• *{theme}:* {clean_snippet(item.get('snippet'))}")
            if item.get('url'): lines.append(f"  {item['url']}")
    else:
        lines.append("• No competitive signals")

    lines.append("")
    lines.append("*🚗 RIVIAN POSITION*")
    lines.append("")
    for cat_key in [c for c in CATEGORY_ORDER if c != 'competitive']:
        cat_label = CATEGORY_LABELS[cat_key]
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
    lines.append("*📌 PM WATCH LIST*")
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
    for item in items:
        text = clean_snippet(item.get('snippet') or item.get('title') or '')
        if text != '—':
            return text[:200]
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
        # Sentiment via LLM (Rivian-perspective), batched, keyword fallback per item
        assign_sentiments(items)

        s = {'positive':0,'neutral':0,'negative':0}
        for i in items: s[i.get('sentiment','neutral')] = s.get(i.get('sentiment','neutral'),0)+1
        total = len(items) or 1
        sentiment = {k:int(v/total*100) for k,v in s.items()}

        # Compose before saving so the dashboard JSON includes the same complete
        # narrative that gets delivered to Signal/WhatsApp.
        brief = compose_brief_llm(items, sentiment, now_ts)
        if brief:
            print("[2] Brief authored by Opus")
        else:
            brief = compose_brief(items, sentiment, now_ts)
            print("[2] Brief composed by template fallback")

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
        brief = compose_brief_llm(items, sentiment, now_ts)
        if brief:
            print("[4] Brief authored by Opus")
        else:
            brief = compose_brief(items, sentiment, now_ts)
            print("[4] Brief composed by template fallback")
    with open(BRIEF_FILE, 'w') as f: f.write(brief)
    print(f"[4] Brief written to {BRIEF_FILE}")
    print(f"\n{brief}\n")
    print("[GameFilm Pipeline] Done.")

if __name__ == "__main__":
    main()
