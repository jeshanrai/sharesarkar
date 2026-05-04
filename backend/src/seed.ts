import "dotenv/config";
import pg from "pg";
import bcrypt from "bcryptjs";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || "postgres"}:${process.env.DB_PASSWORD || ""}@${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || "sharesanskar"}`,
});

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 120);
}

async function seed() {
  // For existing databases: add new columns before running schema (so indexes don't fail)
  try {
    // Check if news table exists first
    const { rows: tableCheck } = await pool.query(
      "SELECT 1 FROM information_schema.tables WHERE table_name = 'news'"
    );
    if (tableCheck.length > 0) {
      await pool.query("ALTER TABLE news ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE");
      await pool.query("ALTER TABLE news ADD COLUMN IF NOT EXISTS content TEXT DEFAULT ''");
      await pool.query("ALTER TABLE news ADD COLUMN IF NOT EXISTS author TEXT DEFAULT 'ShareSanskar Team'");
      await pool.query("ALTER TABLE news ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0");
    }
  } catch {
    // Table may not exist yet - that's fine, schema.sql will create it
  }

  // Run full schema (creates tables and indexes if they don't exist).
  // Split on semicolons and run statement-by-statement — some pg/Neon
  // combos throw "Cannot read properties of undefined (reading 'map')"
  // when handed a single multi-statement DDL string.
  const schema = fs.readFileSync(path.join(__dirname, "../schema.sql"), "utf-8");
  const statements = schema
    .split(/;\s*\r?\n/)
    .map((s) => s.replace(/^\s*--.*$/gm, "").trim())
    .filter((s) => s.length > 0);
  for (const stmt of statements) {
    await pool.query(stmt);
  }

  // Post-schema migration: add author_id if missing (depends on authors table existing)
  try {
    await pool.query("ALTER TABLE news ADD COLUMN IF NOT EXISTS author_id INTEGER REFERENCES authors(id) ON DELETE SET NULL");
  } catch {
    // Column may already exist
  }
  // Ensure the index exists
  try {
    await pool.query("CREATE INDEX IF NOT EXISTS idx_news_author ON news(author_id)");
  } catch {
    // Index may already exist
  }

  // --- Seed admin user ---
  const { rows: existingAdmin } = await pool.query("SELECT id FROM admin_users WHERE username = $1", ["admin"]);
  if (existingAdmin.length === 0) {
    const passwordHash = bcrypt.hashSync("admin123", 10);
    await pool.query("INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)", ["admin", passwordHash]);
    console.log("Admin user created -> username: admin | password: admin123");
  } else {
    console.log("Admin user already exists, skipping.");
  }

  // --- Seed demo author ---
  const { rows: existingAuthor } = await pool.query("SELECT id FROM authors WHERE username = $1", ["author1"]);
  if (existingAuthor.length === 0) {
    const authorPwHash = bcrypt.hashSync("author123", 10);
    await pool.query(
      `INSERT INTO authors (username, full_name, email, password_hash, can_create_news, can_edit_own_news, can_publish, can_manage_videos)
       VALUES ($1, $2, $3, $4, TRUE, TRUE, FALSE, FALSE)`,
      ["author1", "Demo Author", "author@sharesanskar.com", authorPwHash]
    );
    console.log("Demo author created -> username: author1 | password: author123");
  } else {
    console.log("Demo author already exists, skipping.");
  }

  // --- Seed news ---
  const { rows: countResult } = await pool.query("SELECT COUNT(*) as count FROM news");
  const newsCount = parseInt(countResult[0].count, 10);

  if (newsCount === 0) {
    const seedData = [
      // ---- hero_main (1 item) ----
      {
        title: "NEPSE Hits 6-Month High as Foreign Investors Return to Nepal Market",
        slug: "nepse-hits-6-month-high-foreign-investors",
        excerpt: "The Nepal Stock Exchange index reached its highest level in six months today, driven by renewed interest from foreign institutional investors and strong performance across all major sectors.",
        content: `The Nepal Stock Exchange (NEPSE) index surged to its highest point in six months during today's trading session, marking a significant milestone for Nepal's capital market recovery.

The benchmark index closed at 2,156.78 points, gaining 18.45 points or 0.86% from the previous session. This represents the highest closing level since October 2025, signaling renewed bullish sentiment among market participants.

Foreign institutional investors (FIIs) played a crucial role in driving the rally, with net buying reaching Rs. 45.6 crore during the session. Market analysts attribute this renewed interest to favorable monetary policy conditions and attractive valuations compared to regional peers.

"The return of foreign investors is a very positive signal for our market," said Ram Sharma, a senior analyst at Nepal Investment Bank. "It shows growing confidence in Nepal's economic fundamentals and the potential for sustained growth."

All major sectoral indices closed in the green, with the Banking sub-index leading the charge with a 1.45% gain. The Hydropower sub-index also showed strong momentum, rising 2.18% on the back of new power purchase agreements.

Trading volumes were significantly higher than average, with total turnover reaching Rs. 4.52 billion spread across 45,234 transactions. A total of 245 scrips were traded, with 156 advancing, 89 declining, and 12 remaining unchanged.

Market experts suggest that the upward trend could continue in the coming weeks, supported by improving corporate earnings and expectations of further monetary easing by Nepal Rastra Bank.`,
        image_url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=80",
        category: "Breaking",
        section: "hero_main",
        sort_order: 1,
        read_time: "4 min read",
        author: "ShareSanskar Team",
      },
      // ---- hero_stories (3 items) ----
      {
        title: "Banking Sector Rally Continues as Major Banks Post Strong Q2 Results",
        slug: "banking-sector-rally-continues-q2",
        excerpt: "Major commercial banks show strong quarterly earnings, driving sector-wide gains in the market.",
        content: "Nepal's banking sector continued its impressive rally this week as several major commercial banks reported better-than-expected second-quarter results. Nabil Bank led the pack with a 22% increase in net profit, while NIC Asia and Global IME Bank also posted double-digit earnings growth.\n\nThe Banking sub-index gained 1.45% during the session, outperforming the broader market. Analysts attribute the strong performance to improved asset quality, higher net interest margins, and growth in digital banking services.\n\nWith the sector trading at a forward P/E ratio of 12.5x, several analysts maintain a positive outlook for banking stocks in the medium term.",
        image_url: "https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?w=800&q=80",
        category: "Banking",
        section: "hero_stories",
        sort_order: 1,
        read_time: "3 min read",
        author: "ShareSanskar Team",
      },
      {
        title: "Hydropower Stocks Surge on New Electricity Export Deal with India",
        slug: "hydropower-stocks-surge-export-deal",
        excerpt: "Nepal signs a landmark electricity export agreement with India, boosting hydropower stock valuations.",
        content: "Hydropower stocks across NEPSE witnessed a significant surge today following the announcement of a new cross-border electricity export agreement between Nepal and India.\n\nThe deal, which is expected to facilitate the export of up to 10,000 MW of electricity over the next decade, sent shockwaves through the market as investors rush to re-evaluate the earnings potential of Nepal's hydropower companies.\n\nUpper Tamakoshi led the rally with an 8.50% gain, while Chilime Hydropower and other smaller producers also posted substantial gains.",
        image_url: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&q=80",
        category: "Hydropower",
        section: "hero_stories",
        sort_order: 2,
        read_time: "3 min read",
        author: "ShareSanskar Team",
      },
      {
        title: "New IPO of Citizen Investment Trust Opens for Public Subscription",
        slug: "new-ipo-citizen-investment-trust",
        excerpt: "The highly anticipated IPO attracts massive investor interest on its opening day.",
        content: "Citizen Investment Trust (CIT) opened its Initial Public Offering (IPO) today, receiving an overwhelming response from retail investors. The company is offering 500,000 units of mutual fund shares at Rs. 100 per unit.\n\nThe IPO, which will remain open until April 29, 2026, is being managed by NIBL Capital. Investors can apply through the MeroShare platform with a minimum application of 10 units.\n\nAnalysts expect the IPO to be heavily oversubscribed, given CIT's strong track record of consistent returns and its diversified investment portfolio.",
        image_url: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&q=80",
        category: "IPO",
        section: "hero_stories",
        sort_order: 3,
        read_time: "2 min read",
        author: "ShareSanskar Team",
      },
      // ---- latest (4 items) ----
      {
        title: "NEPSE Index Surges 18 Points Amid Strong Banking Sector Performance",
        slug: "nepse-surges-18-points-banking",
        excerpt: "The Nepal Stock Exchange witnessed a significant rally today as banking stocks led the charge with impressive gains across the board.",
        content: "The NEPSE index posted a strong gain of 18 points today, closing at 2,156.78. The rally was primarily driven by robust performance in the banking sector.\n\nCommercial banks collectively contributed over 60% of the day's total turnover, with several large-cap banks hitting new 52-week highs. The positive sentiment was also supported by favorable monetary policy expectations from Nepal Rastra Bank.",
        image_url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80",
        category: "Market",
        section: "latest",
        sort_order: 1,
        read_time: "3 min read",
        author: "ShareSanskar Team",
      },
      {
        title: "Nepal Rastra Bank Announces New Monetary Policy Guidelines for FY 2082/83",
        slug: "nrb-monetary-policy-2082-83",
        excerpt: "The central bank has released its mid-year review of monetary policy with focus on credit expansion and inflation control measures.",
        content: "Nepal Rastra Bank (NRB) today released its updated monetary policy guidelines, focusing on balancing credit growth with inflation management.\n\nKey highlights include a 0.5% reduction in the refinancing rate, increased limits for margin lending, and new provisions for digital lending platforms. The central bank also announced measures to encourage foreign investment in the capital market.",
        image_url: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&q=80",
        category: "Banking",
        section: "latest",
        sort_order: 2,
        read_time: "4 min read",
        author: "ShareSanskar Team",
      },
      {
        title: "Upper Tamakoshi Hydropower Reports Record Electricity Generation",
        slug: "upper-tamakoshi-record-generation",
        excerpt: "The country's largest hydropower project has achieved a new milestone in power generation during the monsoon season.",
        content: "Upper Tamakoshi Hydropower Company, Nepal's largest hydropower project with a capacity of 456 MW, has reported record electricity generation during the current monsoon season.\n\nThe project generated over 2,800 GWh of electricity in the past six months, exceeding its annual target. This achievement has significantly improved the company's revenue outlook and contributed to reduced power imports from India.",
        image_url: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&q=80",
        category: "Hydropower",
        section: "latest",
        sort_order: 3,
        read_time: "3 min read",
        author: "ShareSanskar Team",
      },
      {
        title: "SEBON Introduces New Trading Framework for Derivatives Market",
        slug: "sebon-new-trading-framework-derivatives",
        excerpt: "The Securities Board of Nepal unveils a comprehensive framework for derivatives trading, marking a new era for the market.",
        content: "The Securities Board of Nepal (SEBON) has officially unveiled its new regulatory framework for derivatives trading in Nepal's capital market.\n\nThe framework includes provisions for stock futures, index options, and currency derivatives. Implementation is expected to begin in phases starting from the next fiscal year.",
        image_url: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&q=80",
        category: "IPO",
        section: "latest",
        sort_order: 4,
        read_time: "3 min read",
        author: "ShareSanskar Team",
      },
      // ---- trending (5 items) ----
      {
        title: "Technical Analysis: NABIL Shows Bullish Pattern on Weekly Chart",
        slug: "technical-analysis-nabil-bullish",
        excerpt: "Expert analysis suggests potential breakout above resistance level.",
        content: "Nabil Bank's stock chart is showing a classic bullish cup-and-handle pattern on the weekly timeframe, suggesting a potential breakout above the Rs. 1,300 resistance level.\n\nTechnical indicators including RSI and MACD are also showing positive divergence, supporting the bullish outlook.",
        image_url: "https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=800&q=80",
        category: "Analysis",
        section: "trending",
        sort_order: 1,
        read_time: "5 min read",
        author: "ShareSanskar Team",
      },
      {
        title: "Insurance Sector Witnesses Surge in Premium Collection",
        slug: "insurance-sector-premium-surge",
        excerpt: "Life and non-life insurance companies report strong Q2 results.",
        content: "Nepal's insurance sector has reported a significant increase in premium collection during the second quarter, with both life and non-life segments showing strong growth.\n\nThe total premium collection for the sector reached Rs. 45 billion, representing a 28% year-over-year increase.",
        image_url: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80",
        category: "Insurance",
        section: "trending",
        sort_order: 2,
        read_time: "3 min read",
        author: "ShareSanskar Team",
      },
      {
        title: "Foreign Institutional Investors Show Renewed Interest in NEPSE",
        slug: "fii-renewed-interest-nepse",
        excerpt: "FII net buying reaches 6-month high in the current trading week.",
        content: "Foreign institutional investors have significantly increased their participation in Nepal's stock market, with net buying reaching a six-month high during the current trading week.",
        image_url: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&q=80",
        category: "Market",
        section: "trending",
        sort_order: 3,
        read_time: "2 min read",
        author: "ShareSanskar Team",
      },
      {
        title: "Nabil Bank Announces 25% Dividend for Shareholders",
        slug: "nabil-bank-25-percent-dividend",
        excerpt: "The board meeting approved bonus shares and cash dividend.",
        content: "Nabil Bank's board of directors has approved a 25% dividend for its shareholders, comprising 15% bonus shares and 10% cash dividend for the fiscal year 2081/82.",
        image_url: "https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?w=800&q=80",
        category: "Banking",
        section: "trending",
        sort_order: 4,
        read_time: "2 min read",
        author: "ShareSanskar Team",
      },
      {
        title: "SEBON Introduces New Trading Regulations for Market Efficiency",
        slug: "sebon-new-trading-regulations",
        excerpt: "The regulatory body aims to enhance market transparency and efficiency.",
        content: "SEBON has introduced several new trading regulations aimed at improving market efficiency and transparency in Nepal's capital market.",
        image_url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80",
        category: "Market",
        section: "trending",
        sort_order: 5,
        read_time: "3 min read",
        author: "ShareSanskar Team",
      },
      // ---- featured (6 items) ----
      {
        title: "Global Factors Affecting Nepal Stock Market: A Deep Analysis",
        slug: "global-factors-nepal-stock-market",
        excerpt: "Understanding how international economic trends influence NEPSE performance and investment strategies for Nepali investors.",
        content: "Nepal's stock market, while relatively insulated from global markets, is increasingly influenced by international economic trends. This article explores the key global factors that affect NEPSE performance.\n\nKey factors include US Federal Reserve interest rate decisions, commodity prices (especially crude oil), geopolitical tensions, and regional economic conditions in India and China.",
        image_url: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&q=80",
        category: "Analysis",
        section: "featured",
        sort_order: 1,
        read_time: "8 min read",
        author: "ShareSanskar Team",
      },
      {
        title: "Hydropower Stocks: Investment Opportunities in Nepal's Energy Sector",
        slug: "hydropower-investment-opportunities",
        excerpt: "A comprehensive guide to investing in hydropower companies as Nepal aims to become a major electricity exporter.",
        content: "Nepal's hydropower sector presents unique investment opportunities as the country accelerates its plans to become a major electricity exporter in South Asia.\n\nWith a theoretical hydropower potential of 83,000 MW and only about 2,800 MW developed so far, the growth runway for this sector is enormous.",
        image_url: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&q=80",
        category: "Hydropower",
        section: "featured",
        sort_order: 2,
        read_time: "6 min read",
        author: "ShareSanskar Team",
      },
      {
        title: "Understanding P/E Ratios in Nepal Banking Sector",
        slug: "understanding-pe-ratios-banking",
        excerpt: "Learn how to analyze price-to-earnings ratios and identify undervalued banking stocks in NEPSE.",
        content: "The price-to-earnings (P/E) ratio is one of the most important metrics for evaluating banking stocks in Nepal. This guide explains how to interpret and use P/E ratios effectively.\n\nA lower P/E relative to sector average may indicate an undervalued stock, while a higher P/E could suggest overvaluation or high growth expectations.",
        image_url: "https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?w=800&q=80",
        category: "Education",
        section: "featured",
        sort_order: 3,
        read_time: "5 min read",
        author: "ShareSanskar Team",
      },
      {
        title: "Mutual Funds in Nepal: A Beginner's Complete Guide",
        slug: "mutual-funds-nepal-beginners-guide",
        excerpt: "Everything you need to know about investing in mutual funds, from NAV calculation to fund selection criteria.",
        content: "Mutual funds offer a convenient way for retail investors to participate in Nepal's stock market without the need for active stock picking.\n\nThis comprehensive guide covers everything from understanding NAV (Net Asset Value) to selecting the right fund based on your risk tolerance and investment horizon.",
        image_url: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80",
        category: "Education",
        section: "featured",
        sort_order: 4,
        read_time: "10 min read",
        author: "ShareSanskar Team",
      },
      {
        title: "Insurance Sector Outlook: Growth Potential and Risks",
        slug: "insurance-sector-outlook-growth",
        excerpt: "Analyzing the future of life and non-life insurance companies in Nepal's developing financial market.",
        content: "Nepal's insurance sector is at an inflection point, with growing awareness about insurance products driving premium growth.\n\nThe sector still has significant untapped potential, with insurance penetration at just 2.1% of GDP compared to the global average of 7.4%.",
        image_url: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80",
        category: "Insurance",
        section: "featured",
        sort_order: 5,
        read_time: "7 min read",
        author: "ShareSanskar Team",
      },
      {
        title: "SEBON's New Regulations: Impact on Retail Investors",
        slug: "sebon-regulations-impact-retail",
        excerpt: "Breaking down the latest regulatory changes and how they affect your trading and investment decisions.",
        content: "The Securities Board of Nepal (SEBON) has recently introduced several regulatory changes that directly impact retail investors.\n\nKey changes include revised margin lending limits, new disclosure requirements, and updated KYC procedures for DMAT accounts.",
        image_url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80",
        category: "Regulation",
        section: "featured",
        sort_order: 6,
        read_time: "4 min read",
        author: "ShareSanskar Team",
      },
    ];

    for (const item of seedData) {
      await pool.query(
        `INSERT INTO news (title, slug, excerpt, content, author, image_url, category, section, sort_order, is_published, read_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10)`,
        [item.title, item.slug, item.excerpt, item.content, item.author, item.image_url, item.category, item.section, item.sort_order, item.read_time]
      );
    }

    console.log(`Seeded ${seedData.length} news items.`);
  } else {
    console.log(`News table already has ${newsCount} items, skipping seed.`);
  }

  // --- Seed IPO listings ---
  const { rows: ipoCount } = await pool.query("SELECT COUNT(*) as count FROM ipo_listings");
  if (parseInt(ipoCount[0].count, 10) === 0) {
    const ipoData = [
      { company_name: "Citizen Investment Trust", symbol: "CIT", sector: "Mutual Fund", share_type: "IPO", units: 500000, price_per_unit: 100, total_amount: "Rs. 5 Crore", open_date: "2026-04-25", close_date: "2026-04-29", status: "upcoming" },
      { company_name: "Nepal Hydro Developers Ltd", symbol: "NHDL", sector: "Hydropower", share_type: "IPO", units: 1000000, price_per_unit: 100, total_amount: "Rs. 10 Crore", open_date: "2026-04-15", close_date: "2026-04-19", status: "open" },
      { company_name: "Prabhu Capital Ltd", symbol: "PRCL", sector: "Finance", share_type: "Right Share", units: 750000, price_per_unit: 100, total_amount: "Rs. 7.5 Crore", open_date: "2026-04-10", close_date: "2026-04-14", status: "closed" },
      { company_name: "Shivam Cements Ltd", symbol: "SHIVM", sector: "Manufacturing", share_type: "FPO", units: 2000000, price_per_unit: 287, total_amount: "Rs. 57.4 Crore", open_date: "2026-03-20", close_date: "2026-03-24", listing_date: "2026-04-05", status: "listed" },
    ];

    for (const ipo of ipoData) {
      await pool.query(
        `INSERT INTO ipo_listings (company_name, symbol, sector, share_type, units, price_per_unit, total_amount, open_date, close_date, listing_date, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [ipo.company_name, ipo.symbol, ipo.sector, ipo.share_type, ipo.units, ipo.price_per_unit, ipo.total_amount, ipo.open_date, ipo.close_date, (ipo as Record<string, unknown>).listing_date || null, ipo.status]
      );
    }
    console.log(`Seeded ${ipoData.length} IPO listings.`);
  } else {
    console.log("IPO listings already seeded, skipping.");
  }

  console.log("Seed complete!");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
