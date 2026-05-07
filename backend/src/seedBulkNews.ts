/**
 * Bulk-seed varied news articles for development & exploration.
 *
 *   tsx src/seedBulkNews.ts          # additive insert (default)
 *   tsx src/seedBulkNews.ts --reset  # delete every existing news row first
 *
 * Idempotent by default — articles are deduplicated on slug, so running
 * the script twice doesn't create duplicates. Pass --reset to wipe the
 * news table first (useful when you want a clean dataset to explore).
 *
 * Each entry:
 *   • Hand-written across the existing categories and sections.
 *   • Rich HTML content matching what the rich-text editor produces.
 *   • Image URLs from Unsplash (run `npm run sync-media -- --apply`
 *     afterward to materialise them locally).
 *   • Spread `created_at` over the last 60 days so listings feel real.
 *   • Vary `views` so trending/popular sorts behave naturally.
 */

import "dotenv/config";
import pool from "./db.js";

const RESET = process.argv.includes("--reset");

// ── Image pool ──────────────────────────────────────────────────
// Unsplash photo IDs grouped by editorial topic, so each article gets
// an image that actually fits its theme.
const IMG = {
  market: [
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=80",
    "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1200&q=80",
    "https://images.unsplash.com/photo-1535320903710-d993d3d77d29?w=1200&q=80",
    "https://images.unsplash.com/photo-1543286386-713bdd548da4?w=1200&q=80",
    "https://images.unsplash.com/photo-1554224154-22dec7ec8818?w=1200&q=80",
  ],
  banking: [
    "https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?w=1200&q=80",
    "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=1200&q=80",
    "https://images.unsplash.com/photo-1556740758-90de374c12ad?w=1200&q=80",
    "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=1200&q=80",
    "https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=1200&q=80",
  ],
  hydropower: [
    "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1200&q=80",
    "https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?w=1200&q=80",
    "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=1200&q=80",
    "https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=1200&q=80",
    "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=1200&q=80",
  ],
  ipo: [
    "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=1200&q=80",
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80",
    "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=80",
    "https://images.unsplash.com/photo-1579621970590-9d624316904b?w=1200&q=80",
  ],
  insurance: [
    "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=80",
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80",
    "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1200&q=80",
  ],
  analysis: [
    "https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=1200&q=80",
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80",
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80",
    "https://images.unsplash.com/photo-1543286386-2e659306cd6c?w=1200&q=80",
  ],
  education: [
    "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80",
    "https://images.unsplash.com/photo-1481349518771-20055b2a7b24?w=1200&q=80",
    "https://images.unsplash.com/photo-1456406644174-8ddd4cd52a06?w=1200&q=80",
  ],
  regulation: [
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80",
    "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&q=80",
    "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=80",
  ],
  breaking: [
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=80",
    "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1200&q=80",
  ],
};

// ── Article data ────────────────────────────────────────────────

interface Article {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  section: string;
  sort_order: number;
  read_time: string;
  author: string;
  image_url: string;
  // Days ago (0 = today, 30 = a month back). Used to derive created_at.
  daysAgo: number;
  views: number;
}

const articles: Article[] = [
  // ═══════════════════════ HERO MAIN ═══════════════════════════════════
  {
    title: "NEPSE Crosses 2,200 Mark for the First Time in 2026",
    slug: "nepse-crosses-2200-first-time-2026",
    excerpt: "The benchmark index closed at 2,214.32 today, marking a new yearly high as banking and hydropower sectors led broad-based gains across the market.",
    content: `<p>The Nepal Stock Exchange index broke through the psychological 2,200-point barrier for the first time in 2026, closing at <strong>2,214.32 points</strong>, a gain of 24.86 points or 1.13% from the previous session.</p>
<h2>What's driving the rally</h2>
<p>Today's move was supported by three converging tailwinds: better-than-expected quarterly results from major commercial banks, a softer-than-feared inflation print from the Central Bureau of Statistics, and continued accumulation by foreign institutional investors who turned net buyers for the eighth consecutive session.</p>
<p>Market breadth was unusually strong. Of the 248 scrips traded, <strong>178 advanced</strong>, 56 declined, and 14 closed unchanged. Total turnover hit Rs. 6.42 billion across 51,892 transactions — a 47% jump over the 30-day average.</p>
<h3>Sector performance</h3>
<ul>
<li><strong>Banking</strong> — up 1.82%, contributing nearly half of the day's index points.</li>
<li><strong>Hydropower</strong> — up 2.34%, on continued optimism around export agreements.</li>
<li><strong>Microfinance</strong> — up 1.64%, helped by a benign monetary-policy backdrop.</li>
<li><strong>Manufacturing</strong> — up 0.71%, lagging the broader rally.</li>
</ul>
<blockquote>"This isn't a one-day pop — the structural setup has been improving for months. The 2,200 break gives us technical confirmation that the broader uptrend is intact."</blockquote>
<p>That's how Subash Acharya, head of equity research at Mega Capital, framed it on a client call this evening. He sees the next resistance at 2,280, with 2,150 now serving as initial support.</p>`,
    category: "Breaking",
    section: "hero_main",
    sort_order: 1,
    read_time: "5 min read",
    author: "ShareSanskar Team",
    image_url: IMG.breaking[0],
    daysAgo: 0,
    views: 18420,
  },

  // ═══════════════════════ HERO STORIES ═══════════════════════════════
  {
    title: "Nepal Investment Bank Posts 31% YoY Profit Surge",
    slug: "nepal-investment-bank-31-percent-profit-surge",
    excerpt: "NIB's nine-month earnings reach Rs. 4.21 billion, beating consensus estimates on stronger fee income and a steady drop in loan-loss provisions.",
    content: `<p>Nepal Investment Bank reported a <strong>31.4% year-over-year jump</strong> in nine-month net profit, becoming the latest commercial bank to post a meaningful earnings beat this quarter.</p>
<p>Net profit for the period ending Magh-end came in at Rs. 4.21 billion, compared with Rs. 3.20 billion in the same period last year. EPS climbed to Rs. 28.40 from Rs. 21.62.</p>
<h3>Key drivers</h3>
<ul>
<li>Net interest income up 18% on a wider spread (3.94% vs. 3.71%).</li>
<li>Fee and commission income up 24%, helped by remittance and trade-finance volumes.</li>
<li>Loan-loss provisions fell to Rs. 612 million from Rs. 901 million as NPLs eased to 1.84%.</li>
</ul>
<p>Deposit growth was 14.2%, faster than the industry average of 11.6%, while lending grew 12.8%. The CD ratio sits at 78.4%, well within regulatory limits.</p>
<p>The stock closed Rs. 38 higher at Rs. 642, a 6.3% gain on volume of 142,300 shares.</p>`,
    category: "Banking",
    section: "hero_stories",
    sort_order: 1,
    read_time: "3 min read",
    author: "ShareSanskar Team",
    image_url: IMG.banking[0],
    daysAgo: 1,
    views: 12340,
  },
  {
    title: "Government Approves Cross-Border Power Trade Agreement with Bangladesh",
    slug: "government-approves-cross-border-power-trade-bangladesh",
    excerpt: "The 40-year framework deal opens a third export market for Nepal's hydropower producers and could shift sector valuations meaningfully.",
    content: `<p>The Cabinet today approved a long-awaited cross-border electricity trade framework with Bangladesh, opening a third major export market for Nepal's hydropower producers after India and the bilateral arrangements with China.</p>
<h2>Deal structure</h2>
<p>Under the agreement, Nepal can export up to 9,000 MW of electricity to Bangladesh over the next 40 years, transmitted through India's grid under a tripartite arrangement. The first 500 MW tranche is expected to begin flowing during the upcoming monsoon season.</p>
<p>Pricing will be set quarterly based on a formula tied to Indian peak/off-peak rates, with a 4% premium for firm-power contracts. Initial estimates suggest export revenue of <strong>USD 130–180 million annually</strong> from this tranche alone.</p>
<h3>Market reaction</h3>
<p>Hydropower stocks rallied broadly on the news. Upper Tamakoshi gained 7.8%, Chilime added 5.4%, and Butwal Power Company closed up 9.2% on heavy volume.</p>
<blockquote>"This changes the long-term cash-flow picture for any producer with surplus monsoon generation. The discount Nepal hydropower trades at relative to regional peers should compress over time."</blockquote>`,
    category: "Hydropower",
    section: "hero_stories",
    sort_order: 2,
    read_time: "4 min read",
    author: "ShareSanskar Team",
    image_url: IMG.hydropower[0],
    daysAgo: 2,
    views: 9820,
  },
  {
    title: "Garima Bikas Bank IPO Subscribed 18 Times on Day One",
    slug: "garima-bikas-bank-ipo-subscribed-18-times",
    excerpt: "Retail demand swamps the Rs. 38 crore offering as investors continue to favour late-stage development banks in NEPSE's primary market.",
    content: `<p>Garima Bikas Bank's IPO closed its opening day <strong>18.4 times oversubscribed</strong>, with bids totalling Rs. 698 crore against the Rs. 38 crore on offer.</p>
<p>The bank issued 380,000 units at the par value of Rs. 100 each, exclusively for the general public. The issue manager, NIBL Ace Capital, confirmed the heavy retail participation pattern that has marked recent development-bank IPOs.</p>
<h3>Allocation outlook</h3>
<p>Given the oversubscription, allotment will be done on a pro-rata basis. Investors who applied for the minimum 10 units have approximately a <strong>1-in-5 chance</strong> of receiving any allotment. The lottery is scheduled for next Tuesday, with refunds processed by Friday.</p>
<p>Garima reported nine-month net profit of Rs. 412 million, with NPLs at 2.31% and a CAR of 13.8%. The bank has 47 branches across the eastern and central development regions.</p>`,
    category: "IPO",
    section: "hero_stories",
    sort_order: 3,
    read_time: "3 min read",
    author: "ShareSanskar Team",
    image_url: IMG.ipo[0],
    daysAgo: 3,
    views: 8204,
  },

  // ═══════════════════════ LATEST (chronological) ══════════════════════
  {
    title: "Daily Market Wrap: Sentiment Stays Constructive After Soft Inflation Print",
    slug: "daily-market-wrap-soft-inflation-print",
    excerpt: "NEPSE closes higher for the fifth straight session as moderating consumer prices reinforce expectations of a dovish monetary stance.",
    content: `<p>NEPSE closed up 12.45 points at 2,201.87, marking the fifth consecutive positive session. Turnover of Rs. 5.18 billion was the highest in three weeks.</p>
<p>The Central Bureau of Statistics this morning reported headline CPI inflation of 4.92% YoY, below the 5.20% consensus estimate and well within Nepal Rastra Bank's comfort zone. The print sent yields on government bonds lower across the curve and provided fresh fuel for the equity rally.</p>
<h3>Top movers</h3>
<ul>
<li><strong>Gainers:</strong> NLG Insurance (+9.84%), Himalayan Bank (+5.21%), Upper Tamakoshi (+4.72%)</li>
<li><strong>Losers:</strong> Shivam Cement (−2.14%), Bottlers Nepal (−1.86%), Sanima Mai Hydropower (−1.20%)</li>
</ul>`,
    category: "Market",
    section: "latest",
    sort_order: 1,
    read_time: "3 min read",
    author: "ShareSanskar Team",
    image_url: IMG.market[1],
    daysAgo: 0,
    views: 6231,
  },
  {
    title: "Microfinance Institutions Face Tighter Capital Norms Under New SEBON Rules",
    slug: "microfinance-tighter-capital-norms-sebon",
    excerpt: "Minimum paid-up capital threshold doubles for D-class institutions, with a phased compliance timeline through fiscal year 2083/84.",
    content: `<p>SEBON has finalised long-debated changes to the capital adequacy framework for microfinance institutions, with the minimum paid-up capital requirement <strong>doubling from Rs. 100 million to Rs. 200 million</strong>.</p>
<h3>Compliance timeline</h3>
<p>Affected institutions have until end of FY 2083/84 to meet the new threshold, with a mid-period checkpoint at FY 2082/83. Roughly 22 of the 56 licensed microfinance institutions are currently below the new bar.</p>
<p>Most analysts expect a wave of M&A activity in the sector as smaller players seek scale-driven combinations rather than dilute equity at depressed prices.</p>`,
    category: "Regulation",
    section: "latest",
    sort_order: 2,
    read_time: "4 min read",
    author: "ShareSanskar Team",
    image_url: IMG.regulation[0],
    daysAgo: 1,
    views: 4892,
  },
  {
    title: "Citizens Bank Launches Nepal's First AI-Powered Personal Lending Product",
    slug: "citizens-bank-ai-powered-personal-lending",
    excerpt: "The new instant-loan product uses an in-house credit-scoring engine built on transaction history and digital footprint, targeting underbanked salaried customers.",
    content: `<p>Citizens Bank International has rolled out Nepal's first commercially deployed AI-driven personal-lending product, branded "Citizens InstaLoan".</p>
<p>The product underwrites loans of up to Rs. 5 lakh in under <strong>12 minutes</strong>, using a proprietary scoring model trained on the bank's own transaction data plus consenting third-party signals from telcos and utility providers. Interest rates start at 11.5% per annum.</p>
<h3>Why it matters</h3>
<p>Personal loans have been a high-margin but heavily underwritten segment in Nepal. By compressing the application cycle, Citizens is targeting the salaried-but-underbanked segment that traditional retail-lending pipelines struggle to reach.</p>`,
    category: "Banking",
    section: "latest",
    sort_order: 3,
    read_time: "3 min read",
    author: "ShareSanskar Team",
    image_url: IMG.banking[1],
    daysAgo: 2,
    views: 5612,
  },
  {
    title: "Butwal Power Company Wins Survey Licence for 224 MW Likhu-IV Project",
    slug: "butwal-power-likhu-iv-survey-licence",
    excerpt: "The award expands BPC's project pipeline to over 800 MW under various stages of development across eastern and central Nepal.",
    content: `<p>Butwal Power Company (BPC) has been awarded the survey licence for the 224 MW Likhu-IV hydropower project, the company confirmed in a stock-exchange filing this morning.</p>
<p>The project is located on the Likhu River in Ramechhap district. BPC will conduct detailed feasibility studies and environmental impact assessment over the next 24 months before applying for a generation licence.</p>
<p>Total project cost is preliminarily estimated at Rs. 32 billion, with target commissioning by FY 2089/90. The award expands BPC's pipeline to <strong>820 MW</strong> across various stages of development.</p>`,
    category: "Hydropower",
    section: "latest",
    sort_order: 4,
    read_time: "3 min read",
    author: "ShareSanskar Team",
    image_url: IMG.hydropower[1],
    daysAgo: 3,
    views: 4123,
  },
  {
    title: "Insurance Sector Net Profit Rises 19% in First Nine Months of FY 2082/83",
    slug: "insurance-sector-19-percent-profit-rise-9m",
    excerpt: "Aggregate sector earnings hit Rs. 7.84 billion as both life and non-life segments benefit from premium growth and rising investment income.",
    content: `<p>Nepal's insurance sector reported aggregate net profit of <strong>Rs. 7.84 billion</strong> for the first nine months of FY 2082/83, up 19.2% from Rs. 6.58 billion in the same period last year.</p>
<h3>Segment view</h3>
<ul>
<li><strong>Life insurance</strong>: Net profit Rs. 4.92 billion (+22.4%). Total premium up 18% to Rs. 76 billion.</li>
<li><strong>Non-life insurance</strong>: Net profit Rs. 2.92 billion (+14.1%). Total premium up 12% to Rs. 31 billion.</li>
</ul>
<p>Investment income contributed roughly 38% of sector profits, with insurers benefiting from higher fixed-deposit rates locked in during last fiscal year's tighter monetary cycle.</p>`,
    category: "Insurance",
    section: "latest",
    sort_order: 5,
    read_time: "4 min read",
    author: "ShareSanskar Team",
    image_url: IMG.insurance[0],
    daysAgo: 4,
    views: 3987,
  },
  {
    title: "Nepal Telecom Subsidiary IPO Cleared for Q4 Launch",
    slug: "nepal-telecom-subsidiary-ipo-q4-launch",
    excerpt: "SEBON's nod sets up a Rs. 6 billion equity raise that would mark the largest non-financial IPO in Nepal's market history.",
    content: `<p>SEBON has approved the IPO prospectus for Nepal Telecom's tower-infrastructure subsidiary, paving the way for a Rs. 6 billion equity raise expected in the fourth quarter of FY 2082/83.</p>
<p>If priced at the indicative range, the offering would be the <strong>largest non-financial IPO</strong> in NEPSE's history and one of only a handful of issuances above the Rs. 5 billion mark.</p>
<h3>Use of proceeds</h3>
<p>The company plans to deploy the capital across three buckets: nationwide tower densification (Rs. 3.2 billion), data-centre expansion in Kathmandu and Bharatpur (Rs. 2.0 billion), and debt repayment (Rs. 800 million).</p>`,
    category: "IPO",
    section: "latest",
    sort_order: 6,
    read_time: "3 min read",
    author: "ShareSanskar Team",
    image_url: IMG.ipo[1],
    daysAgo: 5,
    views: 7421,
  },
  {
    title: "NRB Quietly Eases Margin-Lending Limits for Brokers",
    slug: "nrb-margin-lending-limit-easing",
    excerpt: "A circular issued late Friday raises the per-account ceiling from Rs. 12 crore to Rs. 15 crore and removes the temporary 50% LTV cap.",
    content: `<p>Nepal Rastra Bank (NRB) has issued a circular easing margin-lending norms that had been tightened during last year's overheated rally.</p>
<h3>Specific changes</h3>
<ul>
<li>Per-account margin ceiling raised from Rs. 12 crore to <strong>Rs. 15 crore</strong>.</li>
<li>The temporary 50% loan-to-value cap, in place since Mangsir 2081, is being lifted.</li>
<li>The cooling-off restriction on top-100 securities is reduced from 90 to 30 days.</li>
</ul>
<p>The circular took immediate effect and was confirmed by NRB's Banking Regulation Department this morning. Broker associations had been lobbying for the rollback for several months, arguing the tighter rules had outlived their cooling-off purpose.</p>`,
    category: "Regulation",
    section: "latest",
    sort_order: 7,
    read_time: "3 min read",
    author: "ShareSanskar Team",
    image_url: IMG.regulation[1],
    daysAgo: 6,
    views: 5341,
  },
  {
    title: "Cement Sector Q2 Earnings Disappoint as Input Costs Bite",
    slug: "cement-sector-q2-earnings-disappoint",
    excerpt: "Margin compression and weaker construction demand lead to a 14% YoY drop in aggregate sector net profit, with mid-tier players hardest hit.",
    content: `<p>Listed cement manufacturers posted aggregate Q2 net profit of <strong>Rs. 1.21 billion</strong>, down 14.3% from Rs. 1.41 billion a year ago, as a combination of higher input costs and softer construction demand squeezed margins.</p>
<h3>Company-level view</h3>
<ul>
<li><strong>Shivam Cement</strong>: Net profit Rs. 482 million (−9%). EBITDA margin compressed 280 bps.</li>
<li><strong>Cosmos Cement</strong>: Net profit Rs. 318 million (−12%). Plant utilisation fell to 71%.</li>
<li><strong>Asian Cement</strong>: Net profit Rs. 142 million (−24%). The most affected, with thermal coal costs up 18%.</li>
</ul>
<p>Sector commentary suggests this is a transitory squeeze rather than a structural break — the construction season typically starts to ramp from late Falgun.</p>`,
    category: "Analysis",
    section: "latest",
    sort_order: 8,
    read_time: "5 min read",
    author: "ShareSanskar Team",
    image_url: IMG.analysis[0],
    daysAgo: 7,
    views: 4421,
  },
  {
    title: "FX Reserves Cross USD 16 Billion for First Time",
    slug: "fx-reserves-cross-16-billion-first-time",
    excerpt: "Continued strength in remittance inflows and a moderating import bill push gross reserves to a record level.",
    content: `<p>Nepal's gross foreign-exchange reserves crossed the <strong>USD 16 billion</strong> mark in mid-Falgun, NRB confirmed in its monthly bulletin. The level is sufficient to cover 13.8 months of merchandise imports.</p>
<p>The build-up reflects two converging trends: remittance inflows running 21% above the same period last year, and a 4.6% YoY contraction in the merchandise import bill, helped by softer global oil prices.</p>
<p>The strong reserve position gives NRB additional room to cushion any external shocks and likely buys headroom for further easing if domestic conditions warrant.</p>`,
    category: "Market",
    section: "latest",
    sort_order: 9,
    read_time: "3 min read",
    author: "ShareSanskar Team",
    image_url: IMG.market[2],
    daysAgo: 8,
    views: 3742,
  },

  // ═══════════════════════ TRENDING (popular) ══════════════════════════
  {
    title: "5 NEPSE Stocks Quietly Up Over 50% This Quarter",
    slug: "5-nepse-stocks-up-50-percent-quarter",
    excerpt: "Beyond the big-name banks, a handful of mid-cap names have outpaced the broader index — here's the list and what's driving each.",
    content: `<p>While headline indices grab the spotlight, several mid-cap names have quietly delivered exceptional returns this quarter. Here are five worth knowing about.</p>
<h3>1. Sanima Mai Hydropower (+78%)</h3>
<p>Catalysed by the upgrade of its 22 MW project to 36 MW and an unexpected dividend declaration after two dry years.</p>
<h3>2. NLG Insurance (+64%)</h3>
<p>Rebounded sharply after Q2 results showed a 41% jump in net profit and an unusually clean claims ratio.</p>
<h3>3. Garima Bikas Bank (+58%)</h3>
<p>The IPO subscription momentum spilled into the listed shares, with the stock now trading at 1.8x book value vs. 1.3x at quarter-start.</p>
<h3>4. Himalayan Distillery (+54%)</h3>
<p>A defensive cash-flow story finally getting recognition, plus an unexpected entry into the Indian export market.</p>
<h3>5. Nepal Reinsurance (+51%)</h3>
<p>Q2 results blew past expectations and the stock continues to re-rate as investors warm to its niche moat.</p>`,
    category: "Analysis",
    section: "trending",
    sort_order: 1,
    read_time: "6 min read",
    author: "ShareSanskar Team",
    image_url: IMG.analysis[1],
    daysAgo: 4,
    views: 24831,
  },
  {
    title: "How to Read NEPSE Sector Indices Like a Pro",
    slug: "how-to-read-nepse-sector-indices-like-pro",
    excerpt: "A practical guide to using sector breadth, relative strength, and rotation signals to find the next leadership group before the index does.",
    content: `<p>Most retail investors track only the headline NEPSE index. That's a mistake. The 11 sectoral sub-indices contain far more actionable information about where the market is going.</p>
<h2>The three signals that matter</h2>
<h3>1. Sector breadth</h3>
<p>For each sector, count the percentage of constituents trading above their 50-day moving average. When that percentage flips above 70% from below 30%, you're usually catching the early innings of a sector breakout.</p>
<h3>2. Relative strength vs. NEPSE</h3>
<p>A sector that's up 8% while NEPSE is up 2% has 4x relative strength. Sustained periods of high relative strength tend to mark the leadership group for the next 2–3 months.</p>
<h3>3. Volume confirmation</h3>
<p>Price moves without volume are noise. The strongest sector breakouts come on volume that's at least 1.5x the trailing 20-day average.</p>
<blockquote>"Sector rotation is the closest thing to free money in Nepal's market — most participants don't watch it, so signals stay actionable for weeks."</blockquote>`,
    category: "Education",
    section: "trending",
    sort_order: 2,
    read_time: "8 min read",
    author: "ShareSanskar Team",
    image_url: IMG.education[0],
    daysAgo: 6,
    views: 19420,
  },
  {
    title: "Why Foreign Investors Are Buying Nepal Banks in 2026",
    slug: "why-foreign-investors-buying-nepal-banks-2026",
    excerpt: "FII inflows into the banking sector hit a record Rs. 12.4 billion in the first nine months — three structural reasons explain the conviction.",
    content: `<p>Foreign institutional investors have poured a record Rs. 12.4 billion into Nepal banking stocks in the first nine months of FY 2082/83, more than the prior three fiscal years combined. Three structural reasons explain the conviction:</p>
<h3>1. Valuation gap to regional peers</h3>
<p>Nepal commercial banks trade at an average forward P/E of 11.2x and 1.4x book — vs. 18x / 2.6x for comparable Indian private banks. The discount has compressed but remains historically wide.</p>
<h3>2. ROE rebound is starting</h3>
<p>Sector ROE bottomed at 11.8% in FY 2080/81 and has climbed to 14.2% in the latest reporting period. Several analysts see 17%+ as achievable by FY 2083/84 if asset-quality trends hold.</p>
<h3>3. Currency stability</h3>
<p>The NPR's pegged-but-flexible relationship with the INR limits FX risk relative to other frontier markets. For a USD-based fund, that's a real edge.</p>`,
    category: "Analysis",
    section: "trending",
    sort_order: 3,
    read_time: "7 min read",
    author: "ShareSanskar Team",
    image_url: IMG.banking[2],
    daysAgo: 8,
    views: 16234,
  },
  {
    title: "NIC Asia Bank Approves 22% Dividend (12% Bonus + 10% Cash)",
    slug: "nic-asia-bank-22-percent-dividend",
    excerpt: "The board recommendation, subject to AGM approval, sets one of the more generous payout ratios in the commercial-banking peer group this cycle.",
    content: `<p>NIC Asia Bank's board today approved a <strong>22% dividend</strong> for FY 2081/82 — comprising 12% bonus shares and 10% cash dividend — making it one of the more generous payouts in the commercial-banking peer group this cycle.</p>
<p>Based on FY 2081/82 EPS of Rs. 41.20, the cash component represents a payout ratio of 24.3% and a current-price yield of approximately 1.8%.</p>
<h3>Eligibility & timeline</h3>
<ul>
<li><strong>Book closure:</strong> Two weeks before AGM (date to be announced).</li>
<li><strong>AGM:</strong> Targeted for last week of Falgun.</li>
<li><strong>Distribution:</strong> Within 30 days of AGM approval.</li>
</ul>`,
    category: "Banking",
    section: "trending",
    sort_order: 4,
    read_time: "2 min read",
    author: "ShareSanskar Team",
    image_url: IMG.banking[3],
    daysAgo: 10,
    views: 13782,
  },
  {
    title: "Watch List: 7 Hydropower Stocks With PPAs Expiring in FY 2083/84",
    slug: "watch-list-7-hydropower-ppa-expiring-2083-84",
    excerpt: "Several mid-tier producers face PPA renegotiations next fiscal year — the outcomes will materially shape long-term cash flows.",
    content: `<p>Several mid-tier hydropower producers face Power Purchase Agreement (PPA) renegotiations in FY 2083/84. The outcomes will materially shape long-term cash flows. Here are the seven worth watching:</p>
<ol>
<li><strong>Sanima Mai Hydropower</strong> — current rate Rs. 8.40/unit, expires Asar 2084</li>
<li><strong>Arun Valley Hydropower</strong> — current rate Rs. 7.60/unit, expires Bhadra 2084</li>
<li><strong>Chilime Hydropower</strong> — partial PPA expiry, 30% of capacity</li>
<li><strong>Barun Hydropower</strong> — current rate Rs. 9.10/unit (high)</li>
<li><strong>National Hydropower Company</strong> — multi-tier PPA, complex renegotiation</li>
<li><strong>Khimti Hydropower</strong> — first PPA renewal in 25 years</li>
<li><strong>Synergy Power Development</strong> — small but illustrative test case</li>
</ol>
<p>Industry sources suggest the new tariff structure will likely move toward a time-of-day pricing model, which could benefit producers with surplus dry-season generation but penalise those over-indexed to monsoon flows.</p>`,
    category: "Analysis",
    section: "trending",
    sort_order: 5,
    read_time: "9 min read",
    author: "ShareSanskar Team",
    image_url: IMG.hydropower[2],
    daysAgo: 12,
    views: 11842,
  },

  // ═══════════════════════ FEATURED (deep dives) ════════════════════════
  {
    title: "The Complete Guide to Reading a Nepali Bank's Quarterly Report",
    slug: "complete-guide-reading-nepali-bank-quarterly-report",
    excerpt: "From CD ratio to PCR — a clause-by-clause walkthrough of a commercial bank's quarterly disclosure, with what to weight and what to ignore.",
    content: `<p>Nepali commercial banks publish quarterly disclosures running 40+ pages. Most retail investors skim the headline EPS and miss the lines that actually drive future returns. Here's a structured way to read one.</p>
<h2>Section 1: Capital adequacy (don't skip this)</h2>
<p>The CAR ratio is the single most important number on the page. Anything below 11% is a yellow flag — anything below 10% is a red flag, regardless of how good current EPS looks.</p>
<h3>Within CAR, read these sub-lines:</h3>
<ul>
<li><strong>Tier 1 capital</strong> — should be ≥ 8.5%, with growth tracking asset growth</li>
<li><strong>Tier 2 capital</strong> — supplementary; sustained reliance is a sign of dilution risk</li>
<li><strong>Risk-weighted assets growth</strong> — if growing > 20% YoY without commensurate Tier 1 growth, expect a future rights issue</li>
</ul>
<h2>Section 2: Asset quality</h2>
<p>Three lines matter and they need to be read together:</p>
<h3>NPL ratio</h3>
<p>Below 2% = healthy. 2–4% = monitor. Above 4% = stress signal. But always compare to the bank's own trailing four quarters, not just peers.</p>
<h3>Restructured loans</h3>
<p>Often hidden in footnotes. A bank with 1.5% headline NPL but 6% restructured book is functionally weaker than a peer with 3% NPL and 1% restructured.</p>
<h3>Provision Coverage Ratio (PCR)</h3>
<p>The cushion against future losses. PCR above 80% indicates conservative provisioning; below 60% suggests management is optimising near-term EPS at the cost of future flexibility.</p>
<h2>Section 3: The income statement</h2>
<p>Look at the components of net interest income separately:</p>
<ul>
<li>Spread (NIM) trajectory tells you about pricing power.</li>
<li>Fee income tells you about franchise depth.</li>
<li>Treasury income is volatile — strip it out for trend analysis.</li>
</ul>
<h2>Section 4: The disclosures most people miss</h2>
<p>Toward the back of the report:</p>
<blockquote>The "Off-balance-sheet exposures" line tells you about contingent liabilities — guarantees, LCs, derivatives. A bank with high OBS relative to peers carries hidden risk that doesn't show up in headline ratios.</blockquote>
<p>And finally, the "Related-party transactions" section. Sustained growth in related-party lending without commensurate growth in the broader loan book is one of the most reliable early-warning signs of governance issues.</p>`,
    category: "Education",
    section: "featured",
    sort_order: 1,
    read_time: "14 min read",
    author: "ShareSanskar Team",
    image_url: IMG.education[1],
    daysAgo: 14,
    views: 28421,
  },
  {
    title: "Hydropower Investing in Nepal: A Framework That Actually Works",
    slug: "hydropower-investing-nepal-framework-actually-works",
    excerpt: "Most retail frameworks for valuing hydropower stocks are wrong. Here's the one professional analysts actually use, with worked examples.",
    content: `<p>Most retail frameworks for valuing hydropower stocks are wrong because they apply generic equity heuristics (P/E, P/B) to what is fundamentally a long-duration project-finance asset. Here's the framework that professional analysts actually use.</p>
<h2>Step 1: Decompose the cash-flow profile</h2>
<p>A hydropower project has three distinct cash-flow phases:</p>
<ol>
<li><strong>Construction phase</strong> — negative free cash flow, equity dilution risk if cost overruns</li>
<li><strong>Ramp phase</strong> — first 2–3 years of operations, sub-optimal generation as the system stabilises</li>
<li><strong>Steady-state phase</strong> — predictable seasonal cash flows for the remaining PPA life</li>
</ol>
<p>P/E ratios mix these phases together and produce misleading numbers.</p>
<h2>Step 2: Forecast generation, not earnings</h2>
<p>Earnings can be smoothed via depreciation and tax-credit timing. Generation can't. Get the project's energy report and compare:</p>
<ul>
<li>Theoretical contracted energy (from PPA)</li>
<li>Five-year actual generation track record</li>
<li>Seasonal pattern (monsoon vs. dry-season split)</li>
</ul>
<h2>Step 3: Build a simple DCF</h2>
<p>Use these assumptions for a steady-state hydropower DCF:</p>
<ul>
<li><strong>Revenue:</strong> Generation × current PPA tariff, with assumed renegotiation outcomes</li>
<li><strong>Operating costs:</strong> Typically 12–18% of revenue for run-of-river projects</li>
<li><strong>Maintenance capex:</strong> 2–3% of project cost per year</li>
<li><strong>Discount rate:</strong> 10–12% for established producers, 13–14% for early-stage</li>
</ul>
<h2>Step 4: PPA renegotiation scenarios</h2>
<p>This is where most analyses go wrong. Build three scenarios — base, bear, bull — for the PPA renewal and weight by your subjective probability. The valuation difference between bear and bull cases is often 40%+, so this single assumption dominates the answer.</p>
<h2>Worked example: a hypothetical 25 MW producer</h2>
<p>Assume a 25 MW project at 65% plant load factor, current PPA at Rs. 8.40/unit with 15 years remaining, total project cost Rs. 5 billion.</p>
<ul>
<li>Annual generation: 142 GWh</li>
<li>Current revenue: Rs. 1.19 billion</li>
<li>Operating costs (15%): Rs. 178 million</li>
<li>EBITDA: Rs. 1.01 billion</li>
<li>EBITDA margin: 85%</li>
</ul>
<p>At 11% discount rate and a base-case PPA renewal at Rs. 9.20/unit, the per-MW DCF value comes out to roughly Rs. 280 million — meaningfully different from what crude P/E heuristics would suggest.</p>`,
    category: "Education",
    section: "featured",
    sort_order: 2,
    read_time: "16 min read",
    author: "ShareSanskar Team",
    image_url: IMG.hydropower[3],
    daysAgo: 18,
    views: 22310,
  },
  {
    title: "Five Years of NEPSE Cycles: Patterns, Peaks, and What's Different This Time",
    slug: "five-years-nepse-cycles-patterns-peaks",
    excerpt: "A data-driven look back at NEPSE's last five up-down cycles, the structural shifts in market microstructure, and what the analysis suggests about the current rally.",
    content: `<p>NEPSE has been through five distinct cycles since 2021. Looking at the data carefully, two patterns repeat — and one is notably absent in the current cycle.</p>
<h2>The recurring patterns</h2>
<h3>Pattern 1: Peaks coincide with credit-deposit ratio extremes</h3>
<p>Every NEPSE peak in the last five years has occurred within 60 days of the system-wide CD ratio crossing 89%. The mechanism is simple: when banks run out of lending headroom, margin financing dries up, and the marginal buyer disappears.</p>
<p>Current CD ratio: 81.4%. Plenty of room.</p>
<h3>Pattern 2: Bottoms coincide with NRB pivot signals</h3>
<p>NEPSE bottoms have lined up almost perfectly with NRB's first communicated rate cut or RR reduction. The signal beats the actual cut by 2–4 weeks.</p>
<h2>The pattern that's missing this cycle</h2>
<p>In the 2021 and 2023 rallies, the run-up was disproportionately driven by retail-investor accounts. DMAT account growth in those periods was 40–50% YoY — pure speculative excess.</p>
<p>This time, DMAT growth is a much more measured 12% YoY. The buying is concentrated in foreign institutional flows and domestic mutual funds, not retail FOMO. That's a structurally healthier base.</p>
<h2>What it suggests about the current setup</h2>
<p>Combining all three signals:</p>
<ul>
<li>Lending headroom intact (CD ratio at 81.4%)</li>
<li>NRB still in easing mode</li>
<li>Buyer base institutional rather than speculative retail</li>
</ul>
<p>The simple historical pattern would suggest the rally has further to run. The usual caveats apply — it's not a forecast, and any single shock (geopolitical, fiscal, or asset-quality) could break the pattern.</p>`,
    category: "Analysis",
    section: "featured",
    sort_order: 3,
    read_time: "12 min read",
    author: "ShareSanskar Team",
    image_url: IMG.analysis[2],
    daysAgo: 22,
    views: 19842,
  },
  {
    title: "How Mutual Funds Actually Work: From NAV to Distribution",
    slug: "how-mutual-funds-actually-work-nav-distribution",
    excerpt: "A jargon-free walkthrough of mutual-fund mechanics — how units are created, how NAV is calculated, and what the four return components really mean.",
    content: `<p>Mutual funds in Nepal manage close to Rs. 80 billion in assets, but most retail investors don't actually understand how they work. Here's a clean, jargon-free explanation.</p>
<h2>The basic mechanic</h2>
<p>A mutual fund is a pool of money from many investors, managed by a fund manager who buys stocks, bonds, or other assets on behalf of the pool. Each investor owns "units" of the pool, and the value per unit is the Net Asset Value (NAV).</p>
<h3>How NAV is calculated</h3>
<p>NAV = (Total value of all assets − Total expenses) ÷ Total units outstanding</p>
<p>NAV is calculated daily after market close, using closing prices for all underlying holdings. The published NAV is what you'd buy or sell at on the next trading day.</p>
<h2>Where your returns come from</h2>
<p>A mutual fund's total return has four distinct components:</p>
<h3>1. Capital appreciation</h3>
<p>The increase in market value of the fund's holdings. This is the most visible part of returns.</p>
<h3>2. Dividend income</h3>
<p>Cash dividends received from holdings, distributed periodically to unit-holders.</p>
<h3>3. Bonus shares</h3>
<p>When portfolio companies issue bonus shares, those flow into the fund and increase per-unit holdings.</p>
<h3>4. Re-invested gains</h3>
<p>For growth-oriented funds, realised capital gains are reinvested rather than distributed, compounding the NAV.</p>
<h2>What to evaluate before buying</h2>
<ul>
<li><strong>Expense ratio</strong> — typically 1.5–2.0% in Nepal. Lower is better, all else equal.</li>
<li><strong>Fund size</strong> — too small (< Rs. 100 crore) means high per-unit costs. Too large (> Rs. 1,500 crore) can constrain stock selection.</li>
<li><strong>Manager track record</strong> — at least three years of audited performance.</li>
<li><strong>Portfolio concentration</strong> — top-10 holdings shouldn't exceed 60% of the fund.</li>
</ul>
<h2>Common misconceptions</h2>
<blockquote>"A higher NAV means a more expensive fund." — Wrong. NAV is just a unit price. Two funds with identical portfolios but different inception dates will have different NAVs.</blockquote>
<blockquote>"Dividend-paying funds are better than growth funds." — Wrong. Dividends are paid from the fund's NAV; the NAV drops by the dividend amount on ex-date. The total return is the same.</blockquote>`,
    category: "Education",
    section: "featured",
    sort_order: 4,
    read_time: "11 min read",
    author: "ShareSanskar Team",
    image_url: IMG.education[2],
    daysAgo: 26,
    views: 17234,
  },
  {
    title: "The Insurance Sector's Quiet Re-Rating: Why It Might Just Be Starting",
    slug: "insurance-sector-quiet-rerating-just-starting",
    excerpt: "Nepal's insurance sector trades at half the multiples of regional peers despite faster growth. Three structural shifts are starting to close that gap.",
    content: `<p>Nepal's insurance sector trades at an aggregate forward P/E of around 13x, vs. 28x for regional peers in India and Sri Lanka, despite premium growth running 18–22% YoY. The gap has persisted for years — but three structural shifts are starting to close it.</p>
<h2>Shift 1: Penetration inflection</h2>
<p>Insurance penetration in Nepal sits at 2.1% of GDP. Sri Lanka, with similar GDP per capita, sits at 4.8%. India is at 4.2%. Penetration usually inflects when GDP per capita crosses a threshold around USD 1,500 — Nepal crossed it in 2024.</p>
<p>The simple math: if penetration moves from 2.1% to 3.5% over five years, sector premium grows ~12% annually from penetration alone, before any underlying GDP growth.</p>
<h2>Shift 2: Distribution unbundling</h2>
<p>Bancassurance was historically dominated by parent-bank channels with poor cost-to-income economics. New regulations now allow insurers to partner with mobile-money platforms and digital marketplaces, dramatically lowering distribution costs.</p>
<h3>Two early winners</h3>
<ul>
<li><strong>Citizen Life</strong> — partnered with eSewa for term-life sales; new business premium grew 41% YoY in Q2.</li>
<li><strong>Sagarmatha Insurance</strong> — pilot with Khalti for travel insurance; achieved 12% market share in that micro-segment within six months.</li>
</ul>
<h2>Shift 3: Investment-portfolio quality</h2>
<p>Historically, insurers parked 70%+ of investments in government bonds and bank deposits, with thin equity exposure. Updated SEBON rules now allow up to 30% in listed equities and 10% in foreign assets via approved channels.</p>
<p>The shift is underway: aggregate sector equity exposure has moved from 9% to 17% over the last 18 months, and several leading insurers are now significant participants in the IPO market.</p>
<h2>What could break the thesis</h2>
<p>The biggest risk is a sustained interest-rate-driven NAV decline that hits insurers' bond books, eroding capital and forcing pricing increases that crimp premium growth. The thesis works in stable or falling-rate environments — it gets harder if rates spike.</p>`,
    category: "Insurance",
    section: "featured",
    sort_order: 5,
    read_time: "10 min read",
    author: "ShareSanskar Team",
    image_url: IMG.insurance[1],
    daysAgo: 30,
    views: 14982,
  },
  {
    title: "Risk Management for Retail Traders: 8 Rules That Actually Help",
    slug: "risk-management-retail-traders-8-rules",
    excerpt: "Position sizing, stop placement, and account-level rules — practical risk-management discipline distilled into eight actionable principles.",
    content: `<p>Most retail traders blow up not because they pick wrong stocks, but because they manage positions wrong. Here are eight rules drawn from observing what consistently profitable traders actually do.</p>
<h2>1. Risk a fixed percentage per trade, not a fixed amount</h2>
<p>Risk 1% of your account on any single trade — meaning if your stop is hit, you lose 1% of total equity, no more. Position size flows from that, not the other way around.</p>
<h2>2. Define your stop before you enter, not after</h2>
<p>The most common loss-management mistake: entering a trade and then deciding where the stop "should" go. By that point, your bias is already pulling the stop wider. Decide your invalidation level <em>before</em> you click buy.</p>
<h2>3. Use a maximum-loss day rule</h2>
<p>If you lose 3% of account equity in a single day, stop trading for the day. Forced break, no exceptions. The biggest blow-ups happen when traders try to "make it back" on the same session.</p>
<h2>4. Don't pyramid losing positions</h2>
<p>Adding to losing positions ("averaging down") when your original thesis is being invalidated is the single fastest way to small problems become big problems. Pyramid winners, not losers.</p>
<h2>5. Cap sector exposure</h2>
<p>No more than 25% of account equity in any single sector. Even if banks are working, concentration risk doesn't reward you proportionally — it just enlarges the downside.</p>
<h2>6. Track win rate AND average win/loss separately</h2>
<p>A 60% win rate with average win = average loss is identical to a 40% win rate with average win = 1.5x average loss. Both metrics matter independently, and both can be improved.</p>
<h2>7. Use end-of-day decisions for swing trades</h2>
<p>Intraday volatility is mostly noise. For positions you intend to hold more than a day, make decisions based on closing prices, not intraday spikes. This eliminates 80% of the bad decisions made in the heat of the moment.</p>
<h2>8. Keep a written trade journal</h2>
<blockquote>"You can't improve what you don't measure. Every losing trade is information; without a journal, that information disappears."</blockquote>
<p>Record entry, exit, thesis, what worked, what didn't. Review weekly. Patterns emerge that you'd never spot trade-by-trade.</p>`,
    category: "Education",
    section: "featured",
    sort_order: 6,
    read_time: "13 min read",
    author: "ShareSanskar Team",
    image_url: IMG.analysis[3],
    daysAgo: 35,
    views: 16742,
  },

  // ═══════════════════════ ADDITIONAL LATEST/TRENDING (depth) ══════════
  {
    title: "Asian Development Bank Approves USD 200 Million Energy Loan to Nepal",
    slug: "adb-200-million-energy-loan-nepal",
    excerpt: "The concessional financing will fund transmission upgrades and a new 220 kV cross-border line, supporting the export thesis.",
    content: `<p>The Asian Development Bank (ADB) has approved a USD 200 million concessional loan to support Nepal's energy infrastructure, with the bulk of the financing earmarked for high-voltage transmission upgrades.</p>
<h3>Use of proceeds</h3>
<ul>
<li><strong>USD 130 million</strong> — domestic 220 kV transmission backbone</li>
<li><strong>USD 50 million</strong> — new cross-border line to Bangladesh via Indian grid</li>
<li><strong>USD 20 million</strong> — distribution-loss reduction programmes</li>
</ul>
<p>The loan carries a 25-year tenor with a five-year grace period and an interest rate of 1.5% over LIBOR — exceptionally favourable terms that reflect the project's developmental priority.</p>`,
    category: "Hydropower",
    section: "latest",
    sort_order: 10,
    read_time: "3 min read",
    author: "ShareSanskar Team",
    image_url: IMG.hydropower[4],
    daysAgo: 9,
    views: 4231,
  },
  {
    title: "Sanima Bank, Global IME to Merge in Largest Banking Consolidation Yet",
    slug: "sanima-bank-global-ime-merger-largest-banking",
    excerpt: "The combined entity would become Nepal's third-largest commercial bank by assets, with NRB approval expected within 90 days.",
    content: `<p>Sanima Bank and Global IME Bank announced a merger agreement late this evening, in what would be Nepal's largest banking consolidation to date.</p>
<h3>Combined-entity profile</h3>
<ul>
<li><strong>Assets:</strong> Rs. 482 billion (3rd largest in NEPSE)</li>
<li><strong>Branches:</strong> 287 across all seven provinces</li>
<li><strong>Customers:</strong> 4.8 million accounts</li>
<li><strong>Combined NPL:</strong> 1.94%</li>
</ul>
<p>Swap ratio is set at 100 Sanima shares for 92 Global IME shares, reflecting Sanima's slightly higher book value per share. Both banks' boards have approved the deal; shareholder vote and NRB approval are next.</p>
<p>The deal is expected to close within 6–8 months. Initial cost-synergy guidance is Rs. 1.8 billion annually, primarily from branch rationalisation and IT consolidation.</p>`,
    category: "Banking",
    section: "latest",
    sort_order: 11,
    read_time: "4 min read",
    author: "ShareSanskar Team",
    image_url: IMG.banking[4],
    daysAgo: 11,
    views: 22341,
  },
  {
    title: "RSDC Closes Rs. 80 Crore Right Share Issuance Successfully",
    slug: "rsdc-80-crore-right-share-issuance",
    excerpt: "Subscription rate of 132% indicates continued retail confidence in the development-bank segment despite recent regulatory tightening.",
    content: `<p>Reliable Sourcing Development Commerce Bank's Rs. 80 crore right-share issuance closed with 132% subscription, the issue manager confirmed today.</p>
<p>The issuance was at 1:1 ratio for existing shareholders at par value of Rs. 100, with proceeds going toward CAR strengthening and branch expansion in Lumbini and Karnali provinces.</p>
<h3>Post-issue capital structure</h3>
<p>Paid-up capital rises from Rs. 80 crore to Rs. 160 crore, comfortably exceeding the new SEBON minimums for the development-bank category. CAR moves from 11.4% to 14.2% post-issue.</p>`,
    category: "IPO",
    section: "latest",
    sort_order: 12,
    read_time: "2 min read",
    author: "ShareSanskar Team",
    image_url: IMG.ipo[2],
    daysAgo: 13,
    views: 3214,
  },
  {
    title: "Government Bond Yields Move Lower After Successful T-Bill Auction",
    slug: "government-bond-yields-lower-tbill-auction",
    excerpt: "The 91-day T-bill cut-off rate fell to 3.42%, the lowest in 14 months, reflecting ample liquidity and a shift in rate-cycle expectations.",
    content: `<p>Yields on Nepal's government securities moved lower across the curve following a successful T-bill auction, with the 91-day cut-off rate falling to 3.42% — the lowest level in 14 months.</p>
<h3>Auction details</h3>
<p>NRB offered Rs. 25 billion across the 91-day, 182-day, and 364-day tenors. Total bids received were Rs. 73.4 billion, indicating a bid-cover ratio of 2.94x — meaningfully above the trailing six-month average.</p>
<p>The strong demand reflects two converging factors: ample banking-system liquidity, and a clear shift in market expectations toward further monetary easing.</p>`,
    category: "Market",
    section: "latest",
    sort_order: 13,
    read_time: "3 min read",
    author: "ShareSanskar Team",
    image_url: IMG.market[3],
    daysAgo: 14,
    views: 2921,
  },
  {
    title: "Capital Markets Conference: Five Takeaways That Matter",
    slug: "capital-markets-conference-five-takeaways",
    excerpt: "Themes from the annual industry conference: derivative-market launch, ESG disclosures, and a long-overdue conversation about retail-investor protection.",
    content: `<p>The annual Capital Markets Conference wrapped up yesterday with a denser-than-usual policy agenda. Five takeaways stood out:</p>
<h3>1. Derivative market launch is real</h3>
<p>SEBON Chairman confirmed the equity-derivative segment will go live in Q1 of FY 2083/84. Initial products: stock futures on the top 30 NEPSE constituents and index futures on NEPSE-50.</p>
<h3>2. ESG disclosures becoming mandatory</h3>
<p>From FY 2083/84, all listed companies will need to publish standardised ESG metrics in annual reports. Initial framework borrows heavily from the SEBI guidelines.</p>
<h3>3. Retail-investor protection on the agenda</h3>
<p>Multiple panels discussed mis-selling in the IPO market and unauthorised "advisory" services on Telegram and Viber. Concrete enforcement actions are expected within six months.</p>
<h3>4. Foreign listing pathway clarified</h3>
<p>Nepali companies will be allowed to dual-list on Indian exchanges from FY 2083/84, with reciprocal rules under negotiation for Indian companies to list on NEPSE.</p>
<h3>5. T+1 settlement coming</h3>
<p>The shift from T+2 to T+1 settlement was confirmed for the second half of next fiscal year, bringing Nepal in line with regional best practice.</p>`,
    category: "Regulation",
    section: "latest",
    sort_order: 14,
    read_time: "5 min read",
    author: "ShareSanskar Team",
    image_url: IMG.regulation[2],
    daysAgo: 15,
    views: 5821,
  },
  {
    title: "Top 10 Stocks by FY-to-Date Foreign Buying",
    slug: "top-10-stocks-foreign-buying-fyt",
    excerpt: "FII flows have been concentrated — these ten names absorbed nearly 80% of the Rs. 18.4 billion in net foreign buying so far this fiscal year.",
    content: `<p>Net foreign buying so far in FY 2082/83 has totalled <strong>Rs. 18.4 billion</strong>, but the flows have been remarkably concentrated. The top-10 names below absorbed almost 80% of the total inflow:</p>
<ol>
<li><strong>Nabil Bank</strong> — Rs. 3.42 billion (18.6%)</li>
<li><strong>NIC Asia Bank</strong> — Rs. 2.18 billion (11.8%)</li>
<li><strong>Nepal Investment Bank</strong> — Rs. 1.92 billion (10.4%)</li>
<li><strong>Upper Tamakoshi</strong> — Rs. 1.41 billion (7.7%)</li>
<li><strong>Standard Chartered Nepal</strong> — Rs. 1.32 billion (7.2%)</li>
<li><strong>Himalayan Bank</strong> — Rs. 1.18 billion (6.4%)</li>
<li><strong>Chilime Hydropower</strong> — Rs. 0.84 billion (4.6%)</li>
<li><strong>NLG Insurance</strong> — Rs. 0.71 billion (3.9%)</li>
<li><strong>Sanima Bank</strong> — Rs. 0.62 billion (3.4%)</li>
<li><strong>Citizens Bank</strong> — Rs. 0.58 billion (3.2%)</li>
</ol>
<p>The concentration tells you what foreign investors actually trust at scale: large-cap commercial banks plus the highest-quality hydropower producers. Mid-caps have seen marginal foreign participation.</p>`,
    category: "Analysis",
    section: "trending",
    sort_order: 6,
    read_time: "4 min read",
    author: "ShareSanskar Team",
    image_url: IMG.analysis[3],
    daysAgo: 17,
    views: 14821,
  },
  {
    title: "Morning Brief: NEPSE Pre-Market Sentiment Tracker",
    slug: "morning-brief-nepse-pre-market-sentiment",
    excerpt: "Today's session preview — futures-implied open, key earnings on the docket, and the macro print to watch.",
    content: `<p>Quick session preview before the bell:</p>
<h3>Implied open</h3>
<p>Based on close-of-week ADR-equivalent indicators and Asian peer movement overnight, NEPSE is set up for a roughly +0.4% open. Banking sub-index implied open: +0.6%.</p>
<h3>Earnings today</h3>
<ul>
<li><strong>NMB Bank</strong> — pre-market disclosure expected</li>
<li><strong>Soaltee Hotel</strong> — post-market</li>
<li><strong>Bottlers Nepal</strong> — post-market</li>
</ul>
<h3>Macro print to watch</h3>
<p>Mid-month liquidity update from NRB at 11:00 NPT. A reading above Rs. 80 billion in surplus would extend the recent rate-easing narrative.</p>
<h3>Top stocks on the watchlist</h3>
<p>Continuing themes: bank earnings momentum, hydropower export-deal beneficiaries, and the tighter microfinance regulatory backdrop.</p>`,
    category: "Market",
    section: "trending",
    sort_order: 7,
    read_time: "2 min read",
    author: "ShareSanskar Team",
    image_url: IMG.market[4],
    daysAgo: 19,
    views: 8421,
  },
  {
    title: "Five Common IPO Application Mistakes That Cost You Allotment",
    slug: "five-ipo-application-mistakes-cost-allotment",
    excerpt: "Even with bank-balance buffers and timely application, a surprising fraction of IPO applications get rejected on technicalities. Here's what to avoid.",
    content: `<p>Even highly-oversubscribed IPOs see 4–6% of applications rejected — usually for avoidable reasons. Here are the five most common.</p>
<h3>1. KYC / DMAT account inactive</h3>
<p>If your DMAT account hasn't had any activity in 12+ months, some depository participants flag it as inactive. Applications from inactive accounts are rejected in bulk before allotment.</p>
<p><em>Fix:</em> Log in once a quarter, even if you don't trade.</p>
<h3>2. PAN-DMAT name mismatch</h3>
<p>If your PAN card name has any deviation (extra middle name, different spelling) from your DMAT registered name, applications are auto-rejected.</p>
<h3>3. Insufficient bank-balance lock</h3>
<p>The application amount must be locked in your linked bank account from the day of application until allotment. Withdrawal during the lock period — even temporarily — invalidates the application.</p>
<h3>4. Multiple applications from related accounts</h3>
<p>If your spouse or minor children apply from accounts linked to your bank/PAN, regulators treat them as related. All applications from related accounts may be rejected.</p>
<h3>5. Application from wrong bank type</h3>
<p>For some institutional-only tranches, applications from individual savings accounts are auto-rejected. Always check the prospectus for eligible account types.</p>
<blockquote>"The IPO mechanism rewards boring discipline. Most rejections come from carelessness, not bad luck."</blockquote>`,
    category: "Education",
    section: "featured",
    sort_order: 7,
    read_time: "6 min read",
    author: "ShareSanskar Team",
    image_url: IMG.education[2],
    daysAgo: 21,
    views: 13421,
  },
  {
    title: "Why Most NEPSE Technical-Analysis YouTubers Are Wrong",
    slug: "why-most-nepse-technical-analysis-youtubers-wrong",
    excerpt: "Pattern recognition is seductive but unreliable. A look at the actual base-rate effectiveness of the most-quoted chart patterns on Nepali stock charts.",
    content: `<p>Open YouTube and search "NEPSE technical analysis" — you'll find hundreds of videos confidently identifying head-and-shoulders patterns, double bottoms, and bull flags. Most of those calls don't survive contact with statistical scrutiny. Here's what the data actually says.</p>
<h2>The base-rate problem</h2>
<p>Pattern-recognition systems suffer from a fundamental statistical issue: humans see patterns in random noise. To validate a pattern, you need to compare its predictive value against the unconditional base rate of the outcome.</p>
<p>For NEPSE stocks, the unconditional base rate of a 10%+ rally over the next 30 days is roughly 22%. So any pattern that "predicts" a 25% probability of such a rally is barely better than random — and most popular patterns are.</p>
<h2>Patterns that actually have edge</h2>
<p>Backtested across the last seven years of NEPSE data, three patterns show statistically significant predictive value:</p>
<h3>1. 50-day MA breakout on volume</h3>
<p>Stocks crossing their 50-day MA on volume ≥ 2x trailing average have a <strong>34% probability</strong> of a 10%+ rally over the next 30 days — vs. the 22% base rate. Modest edge, but consistent.</p>
<h3>2. 52-week high after consolidation</h3>
<p>Stocks making new 52-week highs after at least 8 weeks of sideways action (price range < 12%) have a <strong>41% probability</strong> of continuing 15%+ over the next 60 days. Stronger edge.</p>
<h3>3. Relative-strength leadership across cycles</h3>
<p>Stocks in the top quintile of relative strength vs. NEPSE for two consecutive months have a <strong>38% probability</strong> of continuing to outperform NEPSE over the next quarter — vs. the 20% base rate.</p>
<h2>Patterns that don't actually work</h2>
<p>The data on these is at best random:</p>
<ul>
<li>Head-and-shoulders</li>
<li>Triple top / triple bottom</li>
<li>Pennant continuation patterns</li>
<li>Most candlestick reversal patterns (doji, hammer, shooting star)</li>
</ul>
<p>That doesn't mean they never work — it means their hit rate is statistically indistinguishable from randomness, and trading them is no better than coin-flipping.</p>`,
    category: "Analysis",
    section: "featured",
    sort_order: 8,
    read_time: "11 min read",
    author: "ShareSanskar Team",
    image_url: IMG.analysis[1],
    daysAgo: 28,
    views: 18234,
  },

  // ═══════════════════════ MORE LATEST (variety) ════════════════════════
  {
    title: "Quarterly Earnings Calendar: 14 Banks Reporting This Week",
    slug: "quarterly-earnings-calendar-14-banks-week",
    excerpt: "A heavy reporting week ahead — here's the schedule, consensus estimates, and what to focus on for each major reporter.",
    content: `<p>This week is one of the heaviest of the reporting cycle, with 14 commercial banks scheduled to publish quarterly disclosures. Here's the day-by-day schedule and what to focus on.</p>
<h3>Monday</h3>
<ul>
<li><strong>Nepal SBI Bank</strong> — Watch the Indian-corporate-loan disclosure</li>
<li><strong>Standard Chartered Nepal</strong> — Always sets the bar for fee-income growth</li>
</ul>
<h3>Tuesday</h3>
<ul>
<li><strong>Everest Bank</strong> — Look for SME-loan-book trends</li>
<li><strong>Kumari Bank</strong> — Post-merger integration update</li>
</ul>
<h3>Wednesday</h3>
<ul>
<li><strong>Nabil Bank</strong> — Bellwether report; expect strong numbers</li>
<li><strong>Himalayan Bank</strong> — Watch the corporate-restructuring book</li>
<li><strong>Mega Bank</strong> — First quarter post-management change</li>
</ul>
<h3>Thursday</h3>
<ul>
<li><strong>Citizens Bank</strong> — AI-loan-product impact on yields</li>
<li><strong>Prabhu Bank</strong> — Always volatile on asset-quality numbers</li>
<li><strong>Civil Bank</strong> — Governance overhang continues</li>
</ul>
<h3>Friday</h3>
<ul>
<li><strong>NIC Asia Bank</strong> — Watch credit growth post-merger</li>
<li><strong>Global IME Bank</strong> — Last quarterly before merger close</li>
<li><strong>Sanima Bank</strong> — Last quarterly before merger close</li>
<li><strong>Machhapuchchhre Bank</strong> — Mid-tier read</li>
</ul>`,
    category: "Banking",
    section: "latest",
    sort_order: 15,
    read_time: "4 min read",
    author: "ShareSanskar Team",
    image_url: IMG.banking[2],
    daysAgo: 16,
    views: 6421,
  },
  {
    title: "Soaltee Hotel Reports Best Quarter in Three Years",
    slug: "soaltee-hotel-best-quarter-three-years",
    excerpt: "Average daily rates and occupancy both hit record levels as Nepal's tourism sector continues its post-pandemic recovery.",
    content: `<p>Soaltee Hotel & Resort reported its strongest quarterly results in three years, with revenue and occupancy both hitting record levels.</p>
<h3>The numbers</h3>
<ul>
<li><strong>Quarterly revenue:</strong> Rs. 412 million (+34% YoY)</li>
<li><strong>Average occupancy:</strong> 78.4% (record)</li>
<li><strong>ADR:</strong> Rs. 12,420 per night (record)</li>
<li><strong>Net profit:</strong> Rs. 84 million (+92% YoY)</li>
</ul>
<p>Tourism arrivals to Nepal in the period were 21% above the same quarter last year, with particularly strong demand from European and Australian markets. Average length of stay rose to 11.2 nights from 9.8 a year ago.</p>`,
    category: "Market",
    section: "latest",
    sort_order: 16,
    read_time: "3 min read",
    author: "ShareSanskar Team",
    image_url: IMG.market[0],
    daysAgo: 18,
    views: 4892,
  },
  {
    title: "Two New Mutual Funds Launch with Combined Rs. 200 Crore Target",
    slug: "two-new-mutual-funds-200-crore-target",
    excerpt: "NIBL Sahabhagita-2 and Siddhartha Investment Growth-2 launch this week, the first new mutual-fund issuances of the calendar year.",
    content: `<p>Two new mutual funds open for subscription this week, the first new fund issuances of the calendar year. Combined target collection: Rs. 200 crore.</p>
<h3>NIBL Sahabhagita-2</h3>
<p>Open-ended fund managed by NIBL Ace Capital. Target collection Rs. 100 crore. Investment objective: long-term capital growth via equity investments, with up to 25% in fixed income. Expense ratio: 1.85%.</p>
<h3>Siddhartha Investment Growth-2</h3>
<p>Closed-ended fund with 7-year tenure. Target collection Rs. 100 crore. Allocation: 70% equity, 25% bonds, 5% liquid. Expense ratio: 1.75%.</p>
<p>Both funds are listed at Rs. 10 per unit and are open to retail and institutional investors via the MeroShare platform. Subscription closes in 21 days.</p>`,
    category: "IPO",
    section: "latest",
    sort_order: 17,
    read_time: "3 min read",
    author: "ShareSanskar Team",
    image_url: IMG.ipo[3],
    daysAgo: 20,
    views: 5621,
  },
  {
    title: "MeroShare Platform Sees Record 4.2 Million DMAT Accounts",
    slug: "meroshare-record-4-2-million-dmat-accounts",
    excerpt: "Active investor base grows 14% YoY, with mobile-app adoption now at 78% of all account-holders.",
    content: `<p>The MeroShare platform crossed <strong>4.2 million</strong> DMAT accounts this month, growing 14% year-over-year. Mobile-app adoption now stands at 78% of all account-holders, reflecting Nepal's broader smartphone-first investing trend.</p>
<h3>User segmentation</h3>
<ul>
<li>Active monthly users: 1.84 million (44% of total)</li>
<li>Daily active users: 624,000 (15%)</li>
<li>App-only users: 2.34 million (56%)</li>
<li>App + web users: 980,000 (23%)</li>
</ul>
<p>The platform processed 18.4 million transactions in the last quarter, supporting Rs. 412 billion in trading turnover and 1.2 million IPO applications.</p>`,
    category: "Market",
    section: "latest",
    sort_order: 18,
    read_time: "2 min read",
    author: "ShareSanskar Team",
    image_url: IMG.market[1],
    daysAgo: 22,
    views: 3812,
  },
  {
    title: "Kathmandu Office Property Yields Edge Higher Amid Slow Demand",
    slug: "kathmandu-office-property-yields-higher",
    excerpt: "Net rental yields in prime commercial districts inch up to 6.8% as new supply outpaces tenant demand for Grade-A space.",
    content: `<p>Net rental yields on prime Kathmandu office property edged up to <strong>6.8%</strong> in the latest quarter, reflecting a softening rental market as new supply outpaces tenant demand.</p>
<h3>Sub-market rates</h3>
<ul>
<li><strong>New Baneshwor / Tinkune</strong>: Rs. 65–82 per sq ft / month (Grade A)</li>
<li><strong>Lazimpat / Maharajgunj</strong>: Rs. 78–95 per sq ft / month</li>
<li><strong>Pulchowk / Kupondole</strong>: Rs. 55–72 per sq ft / month</li>
<li><strong>Suburban (Bhaktapur / Lalitpur)</strong>: Rs. 28–42 per sq ft / month</li>
</ul>
<p>Banks and insurance companies remain the largest source of demand for Grade-A space, while the IT/BPO sector — once a major tenant category — has shifted toward hybrid arrangements that reduce floor-area requirements.</p>`,
    category: "Analysis",
    section: "latest",
    sort_order: 19,
    read_time: "3 min read",
    author: "ShareSanskar Team",
    image_url: IMG.analysis[2],
    daysAgo: 24,
    views: 2821,
  },
  {
    title: "Insurance IPO Pipeline: Three Names Cleared for Q1 FY 2083/84",
    slug: "insurance-ipo-pipeline-three-names-q1",
    excerpt: "After a quiet 18-month stretch, the insurance-IPO pipeline reopens with three new issuances scheduled for the first quarter of next fiscal.",
    content: `<p>The insurance-sector IPO pipeline reopens in Q1 of FY 2083/84 after an 18-month dry spell, with three issuances cleared by SEBON.</p>
<h3>The three names</h3>
<ul>
<li><strong>Reliable Nepal Life Insurance</strong> — Rs. 110 crore raise, 11 million units at par</li>
<li><strong>Sagarmatha General Insurance Reinsurance</strong> — Rs. 75 crore raise, 7.5 million units at par</li>
<li><strong>Citizen Reinsurance Company</strong> — Rs. 250 crore raise, 25 million units at par</li>
</ul>
<p>Combined target collection of Rs. 435 crore would represent the largest cumulative insurance-IPO quarter in NEPSE history. All three are subject to standard SEBON timeline and prospectus requirements.</p>`,
    category: "IPO",
    section: "latest",
    sort_order: 20,
    read_time: "3 min read",
    author: "ShareSanskar Team",
    image_url: IMG.insurance[2],
    daysAgo: 25,
    views: 6421,
  },
];

// ── Insertion logic ─────────────────────────────────────────────

async function insertIfMissing(item: Article): Promise<"inserted" | "skipped"> {
  const exists = await pool.query("SELECT id FROM news WHERE slug = $1 LIMIT 1", [item.slug]);
  if (exists.rows.length > 0) return "skipped";

  const created = new Date(Date.now() - item.daysAgo * 24 * 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO news
       (title, slug, excerpt, content, author, image_url, category, section,
        sort_order, is_published, read_time, views, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10, $11, $12, $12)`,
    [
      item.title,
      item.slug,
      item.excerpt,
      item.content,
      item.author,
      item.image_url,
      item.category,
      item.section,
      item.sort_order,
      item.read_time,
      item.views,
      created.toISOString(),
    ]
  );
  return "inserted";
}

async function main() {
  if (RESET) {
    console.log("⚠ --reset specified — deleting all rows from news table.");
    await pool.query("DELETE FROM news");
  }

  let inserted = 0;
  let skipped = 0;
  for (const item of articles) {
    try {
      const result = await insertIfMissing(item);
      if (result === "inserted") inserted += 1;
      else skipped += 1;
    } catch (err) {
      console.error(`✗ Failed to insert "${item.slug}":`, (err as Error).message);
    }
  }

  console.log("");
  console.log("──────── Bulk seed summary ────────");
  console.log(`  Total articles in script : ${articles.length}`);
  console.log(`  Inserted                 : ${inserted}`);
  console.log(`  Skipped (already exists) : ${skipped}`);
  console.log("");
  console.log("Tip: run `npm run sync-media -- --apply` to download the");
  console.log("Unsplash images locally so they survive offline / source changes.");

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
