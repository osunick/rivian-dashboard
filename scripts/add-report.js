const fs = require('fs');
const path = '/Users/osunick/.openclaw/workspace/rivian-dashboard/public/data/reports.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const ts = '2026-05-18T02:00:00.000Z';

const fullReport = `🎬 *GameFilm — Rivian Intel*
_Sunday, May 18, 2026 — 8:00 PM MT — 12 signals · 6 categories_

*🎯 SITREP*
• Tesla FSD v14.3.3 drops Spring 2026 features + 33% faster Smart Summon — active software iteration pressure on Rivian's AI stack
• R2 LE delivery uncertainty growing (2027+ window for new reservations); R1S inventory discounting signals near-term sell pressure
• RIVN stuck in $13–14 downtrend zone with Hold consensus — needs Q2 R2 ramp catalyst

━━━━━━━━━━
*⚔️ FIELD INTELLIGENCE* — What the competition is doing
• *Tesla (FSD v14.3.3)*: Rolled out May 17 with Spring 2026 UI features, new intervention-free streak tracker gamification, and Smart Summon 33% faster. EU regulators formally skeptical of FSD approval. Robotaxi narrative damaged (17 NHTSA crashes). Rivian angle: Tesla's cadence is high — close Hey Rivian quality gaps fast
  https://electrek.co/2026/05/17/tesla-actually-smart-summon-speed-increase-8-mph-fsd-v14-3-3/
• *Tesla (Model Y promo bundle)*: 0% APR up to 72 months + 3 months free FSD + 1 year free Supercharging stacking on new orders — aggressive bundling competing directly at R2's $57–59K tier
  https://www.reddit.com/r/teslareferralcode/comments/1tg8f0h/active_tesla_referral_link_3_months_free_fsd/
• *Uber AV debate*: Community consensus forming that Uber's asset-light model is structurally resilient vs. pure AV fleet operators — complicates Rivian's EDV partnership as Uber builds its own robotaxi stack with $10B+
  https://www.reddit.com/r/stockstobuytoday/comments/1tg8hlc/is_it_just_me_or_are_avs_not_actually_a_threat_to/

━━━━━━━━━━
*🚗 RIVIAN POSITION*

*🤖 Autonomy (2)*
• CEO RJ Scaringe in self-driving interview: "Tesla's got a huge fleet. We have to catch up and then pass them" — candid data-gap acknowledgment
  https://x.com/SawyerMerritt/status/2032315028557193642
• Rivian Assistant (OTA 2026.15) community testing underway on RivianForums — vehicle control praised, music accuracy friction emerging
  https://www.rivianforums.com/whats-coming-in-2026-15-update-including-rivian-assistant/

*🚗 Vehicles (4)*
• R2 LE delivery timeline: new reservations asking if 2027 or 2029 — back-of-queue visibility gap is a retention risk
  https://www.reddit.com/r/RivianR2/comments/1tg8ew7/likely_delivery_time_if_i_reserved_an_le_now/
• R1S inventory $3K discount for self-financing/cash buyers — urgency pricing or excess inventory signal?
  https://www.reddit.com/r/Rivian/comments/1tg7sxd/inventory_discount/
• Edmunds R2 hands-on: "Rivian's most important car ever" — $59K, targets Model Y territory with adventure DNA
  https://x.com/edmunds/status/2032109367353352220
• R2 configurator: more color, wheel, interior photos added — reservation holders getting full visual clarity
  https://x.com/RivianUpdates

*💰 Business (1)*
• RIVN downtrend flagged at $13–14: sector rotation + technical breakdown, Hold consensus, price target $16.3–$20
  https://www.reddit.com/r/ChartNavigators/comments/1tg6f5f/what_plays_are_you_looking_into_for_tomorrow/

*📱 Software (1)*
• Hey Rivian music fail: "Good day sunshine by the Beatles" returns wrong cover — worse than old Alexa/Tidal, owners reverting to UI
  https://www.reddit.com/r/Rivian/comments/1tg7wlk/hey_rivian_music_requests/

*🌐 Community (1)*
• R1T roof tent roundup: iKamper popular but pricey; base model owners concerned about range impact of heavy roof load
  https://www.reddit.com/r/Rivian/comments/1tg7sxd/inventory_discount/

━━━━━━━━━━
*📌 PM WATCH LIST*
• Hey Rivian music UX gap: Tidal voice integration is a regression from Alexa — daily touchpoint regression needs urgent fix
• Tesla FSD streak tracker = gamification play — study for Autonomy+ engagement design and subscription loop
• RIVN $13–14 floor: does Q2 R2 delivery ramp + Rivian Assistant press shift institutional sentiment?

_Competitive threat: 🟠 ELEVATED — Tesla FSD cadence + promo bundles; Robotaxi stumbles create AV narrative window_
_Dashboard: https://watchgamefilm.vercel.app`;

const newEntry = {
  id: ts,
  timestamp: ts,
  sentiment: { positive: 40, neutral: 30, negative: 30 },
  sources: {
    reddit_rivian: { found: 4, sentiment: 'neutral' },
    reddit_ev: { found: 1, sentiment: 'neutral' },
    reddit_sdc: { found: 0, sentiment: null },
    rivianforums: { found: 1, sentiment: 'positive' },
    news: { found: 2, sentiment: 'neutral' },
    twitter: { found: 3, sentiment: 'positive' },
    youtube: { found: 0, sentiment: null },
    hackernews: { found: 0, sentiment: null }
  },
  categories: {
    autonomy: { found: 2, sentiment: 'positive' },
    vehicles: { found: 4, sentiment: 'neutral' },
    business: { found: 1, sentiment: 'negative' },
    software: { found: 1, sentiment: 'negative' },
    community: { found: 1, sentiment: 'neutral' },
    competitive: { found: 3, sentiment: 'negative' }
  },
  themes: [
    "Tesla FSD v14.3.3 Spring 2026 features rolling out — 33% faster Smart Summon + streak gamification keeps software pressure on Rivian",
    "Hey Rivian music recognition failure: Tidal voice commands returning wrong tracks, worse than old Alexa integration",
    "RIVN at $13–14 downtrend zone with analyst Hold consensus — R2 ramp must shift institutional narrative"
  ],
  competitiveContext: "Tesla shipped FSD v14.3.3 on May 17 with Spring 2026 UI features, a new intervention-free streak counter, and 33% faster Smart Summon — demonstrating continued high software iteration cadence while Rivian owners flag Hey Rivian music accuracy failures against the prior Alexa bar. Tesla is simultaneously running aggressive promo bundles (0% APR + 3 months free FSD + 1 year free Supercharging) on Model Y, directly targeting R2's $57–59K price tier. Rivian PMs should study the FSD streak tracker as a gamification signal for Autonomy+ engagement design, and should urgently address Hey Rivian Tidal accuracy before the regression becomes a sustained community narrative.",
  summary: "Relatively quiet Rivian-original news cycle — fresh community signals center on Hey Rivian music recognition failures, R2 LE delivery timeline uncertainty for new reservations, and R1S inventory discounting. The competitive story is busier: Tesla FSD v14.3.3 dropped May 17 with Spring 2026 features and faster Smart Summon, while Tesla's promotional bundles stack 0% APR + free FSD + free Supercharging to compete at R2's price tier. RIVN stock remains in a $13–14 downtrend with Hold consensus; Rivian needs Q2 R2 delivery momentum to shift the institutional narrative.",
  fullReport: fullReport,
  items: [
    {
      title: "Tesla increases Actually Smart Summon speed by 33% in new FSD update (v14.3.3)",
      url: "https://electrek.co/2026/05/17/tesla-actually-smart-summon-speed-increase-8-mph-fsd-v14-3-3/",
      source: "news",
      category: "competitive",
      sentiment: "negative",
      publishedAt: "2026-05-17",
      snippet: "Tesla rolled out FSD v14.3.3 on May 17 with the Spring 2026 UI update, 33% faster Smart Summon (now 8 mph), and a new intervention-free streak counter that gamifies FSD usage. This is Tesla's fastest major FSD update in months and signals continued software cadence pressure on Rivian's AI assistant and autonomy roadmap."
    },
    {
      title: "Tesla referral bundle: 0% APR + 3 months free FSD + 1 year free Supercharging stacking on Model Y",
      url: "https://www.reddit.com/r/teslareferralcode/comments/1tg8f0h/active_tesla_referral_link_3_months_free_fsd/",
      source: "reddit_ev",
      category: "competitive",
      sentiment: "negative",
      publishedAt: "2026-05-18",
      snippet: "Tesla referral posts confirm an aggressive stacking promo: 0% APR up to 72 months on Model Y, 3 months free FSD via referral, 1 year free Supercharging on Model 3 Premium, and free premium paint on Performance models. The combined package creates significant value-per-dollar pressure on the R2 at $57–59K."
    },
    {
      title: "Are AVs actually a threat to Uber? Asset-light vs. AV fleet ownership debate",
      url: "https://www.reddit.com/r/stockstobuytoday/comments/1tg8hlc/is_it_just_me_or_are_avs_not_actually_a_threat_to/",
      source: "reddit_ev",
      category: "competitive",
      sentiment: "neutral",
      publishedAt: "2026-05-18",
      snippet: "Community debate on Uber's structural advantage vs. pure AV companies: asset-light marketplace model protects Uber from fleet capital burn, while Tesla/Waymo-style operators bear 100% of vehicle cost. Relevant for Rivian's EDV partnership positioning as Uber simultaneously builds its own robotaxi stack with $10B+ investment."
    },
    {
      title: "Likely delivery time if I reserved an R2 LE now?",
      url: "https://www.reddit.com/r/RivianR2/comments/1tg8ew7/likely_delivery_time_if_i_reserved_an_le_now/",
      source: "reddit_rivian",
      category: "vehicles",
      sentiment: "neutral",
      publishedAt: "2026-05-18",
      snippet: "Prospective buyer asks about realistic R2 LE delivery timeline for new reservations — noting they are back of the line and wondering if they are looking at mid-late 2027 or 2029. Highlights growing community awareness that R2 wait times extend well beyond launch window, a potential reservation attrition signal."
    },
    {
      title: "Hey Rivian music requests: Tidal voice commands returning wrong tracks",
      url: "https://www.reddit.com/r/Rivian/comments/1tg7wlk/hey_rivian_music_requests/",
      source: "reddit_rivian",
      category: "software",
      sentiment: "negative",
      publishedAt: "2026-05-18",
      snippet: "Owner reports Hey Rivian failing to correctly identify songs with explicit artist attribution — 'Good day sunshine by the Beatles' returns an obscure unplugged version. Multiple song requests similarly misfiring. Owner notes this is worse than the deprecated Alexa/Tidal integration and has reverted to manual UI control."
    },
    {
      title: "R1S inventory discount: $3K off for self-financing or cash buyers",
      url: "https://www.reddit.com/r/Rivian/comments/1tg7sxd/inventory_discount/",
      source: "reddit_rivian",
      category: "vehicles",
      sentiment: "neutral",
      publishedAt: "2026-05-18",
      snippet: "Rivian sales rep offered $3,000 off any R1S inventory vehicle for buyers who provide their own financing or pay cash — with urgency pressure that the offer expires today. This may signal Rivian is actively clearing R1 inventory as R2 ramp begins, with implications for R1 residual values."
    },
    {
      title: "RIVN flagged as downtrending at $13–14 — sector rotation, Hold consensus",
      url: "https://www.reddit.com/r/ChartNavigators/comments/1tg6f5f/what_plays_are_you_looking_into_for_tomorrow/",
      source: "reddit_rivian",
      category: "business",
      sentiment: "negative",
      publishedAt: "2026-05-18",
      snippet: "Financial community flags RIVN as a downtrending ticker: recommended short range $13–14, 5/22/26 14.0P at $0.45, analyst consensus Hold, price target $16.3–$20. Weakness attributed to sector rotation and technical breakdown. Rivian needs a Q2 R2 delivery catalyst to shift institutional sentiment off the current floor."
    },
    {
      title: "Rivian CEO RJ Scaringe on self-driving: we have to catch up with Tesla and then pass them",
      url: "https://x.com/SawyerMerritt/status/2032315028557193642",
      source: "twitter",
      category: "autonomy",
      sentiment: "neutral",
      publishedAt: null,
      snippet: "RJ Scaringe acknowledged Tesla's fleet data advantage in a new self-driving interview, framing Rivian's strategy as explicitly catching up and then surpassing Tesla. The candid admission signals Rivian is playing from behind on autonomy data volume, and the Hey Rivian + in-house lidar roadmap is the catch-up vehicle."
    },
    {
      title: "Edmunds R2 hands-on: Rivian's most important car ever — $59K starting, targets adventure buyers at Model Y territory",
      url: "https://x.com/edmunds/status/2032109367353352220",
      source: "twitter",
      category: "vehicles",
      sentiment: "positive",
      publishedAt: null,
      snippet: "Edmunds published a hands-on R2 review via Twitter calling it the most critical vehicle in Rivian's lineup — a small electric SUV that starts at $59K and unapologetically targets the Model Y Performance territory with Rivian's adventure brand DNA. Positive media sentiment on the vehicle itself ahead of deliveries."
    },
    {
      title: "R2 configurator: new color, wheel, interior photos added — reservation holders getting full visual clarity",
      url: "https://x.com/RivianUpdates",
      source: "twitter",
      category: "vehicles",
      sentiment: "positive",
      publishedAt: null,
      snippet: "Isaiah's RivianUpdates account confirms Rivian added R2 configurator photos including all paint color renders, wheel options in context, and interior material details. Reservation holders can now fully visualize their build — reducing the color decision friction that was evident at block party events."
    },
    {
      title: "What's Coming in OTA 2026.15 Including Rivian Assistant — RivianForums community testing",
      url: "https://www.rivianforums.com/whats-coming-in-2026-15-update-including-rivian-assistant/",
      source: "rivianforums",
      category: "autonomy",
      sentiment: "positive",
      publishedAt: null,
      snippet: "RivianForums thread covering the 2026.15 OTA update including the Rivian Assistant rollout. Community testing is underway with generally positive reception — vehicle control commands praised, though Hey Rivian music accuracy issues are beginning to surface in parallel discussions."
    },
    {
      title: "Experiences with roof tents for R1T?",
      url: "https://www.reddit.com/r/Rivian/comments/1tg8fhz/likely_delivery_time_if_i_reserved_an_le_now/",
      source: "reddit_rivian",
      category: "community",
      sentiment: "neutral",
      publishedAt: "2026-05-18",
      snippet: "Base model R1T owner seeking roof tent recommendations — iKamper Rivian Tent is popular but expensive, and range concerns with a heavy roof load are real on the standard battery. Active community signal of demand for adventure accessories guidance and the capability-vs-efficiency trade-off on base trims."
    }
  ]
};

data.push(newEntry);
fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log('Report written. Total entries:', data.length);
