-- ShareSanskar seed data (run AFTER schema.sql)
-- Usage:
--   psql "$DATABASE_URL" -f schema.sql
--   psql "$DATABASE_URL" -f seed.sql
--
-- Idempotent: safe to re-run. Uses ON CONFLICT / NOT EXISTS guards.
-- Default credentials (CHANGE AFTER FIRST LOGIN):
--   admin    / admin123
--   author1  / author123

-- ─── Admin user (admin / admin123) ───────────────────────────────
-- bcrypt hash of 'admin123' with cost 10
INSERT INTO admin_users (username, password_hash) VALUES
  ('admin', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy')
ON CONFLICT (username) DO NOTHING;

-- ─── Demo author (author1 / author123) ───────────────────────────
-- bcrypt hash of 'author123' with cost 10
INSERT INTO authors (username, full_name, email, password_hash, can_create_news, can_edit_own_news, can_publish, can_manage_videos) VALUES
  ('author1', 'Demo Author', 'author@sharesanskar.com', '$2b$10$8K1p/a0dCOC5vPqg0wQ6iuW/fb4q3K3F/GvU/3Vw8O0vP3bV6mZGS', TRUE, TRUE, FALSE, FALSE)
ON CONFLICT (username) DO NOTHING;

-- ─── App settings ────────────────────────────────────────────────
INSERT INTO app_settings (key, value) VALUES
  ('nepse_api_url', 'https://nepsescraper.onrender.com/data'),
  ('nepse_refresh_minutes', '5')
ON CONFLICT (key) DO NOTHING;

-- ─── News (only seeded if news table is empty) ───────────────────
INSERT INTO news (title, slug, excerpt, content, author, image_url, category, section, sort_order, is_published, read_time)
SELECT * FROM (VALUES
  -- hero_main (1)
  ('NEPSE Hits 6-Month High as Foreign Investors Return to Nepal Market',
   'nepse-hits-6-month-high-foreign-investors',
   'The Nepal Stock Exchange index reached its highest level in six months today, driven by renewed interest from foreign institutional investors and strong performance across all major sectors.',
   E'The Nepal Stock Exchange (NEPSE) index surged to its highest point in six months during today''s trading session, marking a significant milestone for Nepal''s capital market recovery.\n\nThe benchmark index closed at 2,156.78 points, gaining 18.45 points or 0.86% from the previous session. This represents the highest closing level since October 2025, signaling renewed bullish sentiment among market participants.\n\nForeign institutional investors (FIIs) played a crucial role in driving the rally, with net buying reaching Rs. 45.6 crore during the session.',
   'ShareSanskar Team',
   'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=80',
   'Breaking', 'hero_main', 1, TRUE, '4 min read'),

  -- hero_stories (3)
  ('Banking Sector Rally Continues as Major Banks Post Strong Q2 Results',
   'banking-sector-rally-continues-q2',
   'Major commercial banks show strong quarterly earnings, driving sector-wide gains in the market.',
   E'Nepal''s banking sector continued its impressive rally this week as several major commercial banks reported better-than-expected second-quarter results. Nabil Bank led the pack with a 22% increase in net profit, while NIC Asia and Global IME Bank also posted double-digit earnings growth.\n\nThe Banking sub-index gained 1.45% during the session, outperforming the broader market.',
   'ShareSanskar Team',
   'https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?w=800&q=80',
   'Banking', 'hero_stories', 1, TRUE, '3 min read'),

  ('Hydropower Stocks Surge on New Electricity Export Deal with India',
   'hydropower-stocks-surge-export-deal',
   'Nepal signs a landmark electricity export agreement with India, boosting hydropower stock valuations.',
   E'Hydropower stocks across NEPSE witnessed a significant surge today following the announcement of a new cross-border electricity export agreement between Nepal and India.\n\nThe deal is expected to facilitate the export of up to 10,000 MW of electricity over the next decade.',
   'ShareSanskar Team',
   'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&q=80',
   'Hydropower', 'hero_stories', 2, TRUE, '3 min read'),

  ('New IPO of Citizen Investment Trust Opens for Public Subscription',
   'new-ipo-citizen-investment-trust',
   'The highly anticipated IPO attracts massive investor interest on its opening day.',
   E'Citizen Investment Trust (CIT) opened its Initial Public Offering (IPO) today, receiving an overwhelming response from retail investors. The company is offering 500,000 units of mutual fund shares at Rs. 100 per unit.',
   'ShareSanskar Team',
   'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&q=80',
   'IPO', 'hero_stories', 3, TRUE, '2 min read'),

  -- latest (4)
  ('NEPSE Index Surges 18 Points Amid Strong Banking Sector Performance',
   'nepse-surges-18-points-banking',
   'The Nepal Stock Exchange witnessed a significant rally today as banking stocks led the charge with impressive gains across the board.',
   E'The NEPSE index posted a strong gain of 18 points today, closing at 2,156.78. The rally was primarily driven by robust performance in the banking sector.',
   'ShareSanskar Team',
   'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80',
   'Market', 'latest', 1, TRUE, '3 min read'),

  ('Nepal Rastra Bank Announces New Monetary Policy Guidelines for FY 2082/83',
   'nrb-monetary-policy-2082-83',
   'The central bank has released its mid-year review of monetary policy with focus on credit expansion and inflation control measures.',
   E'Nepal Rastra Bank (NRB) today released its updated monetary policy guidelines, focusing on balancing credit growth with inflation management.\n\nKey highlights include a 0.5% reduction in the refinancing rate, increased limits for margin lending, and new provisions for digital lending platforms.',
   'ShareSanskar Team',
   'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&q=80',
   'Banking', 'latest', 2, TRUE, '4 min read'),

  ('Upper Tamakoshi Hydropower Reports Record Electricity Generation',
   'upper-tamakoshi-record-generation',
   'The country''s largest hydropower project has achieved a new milestone in power generation during the monsoon season.',
   E'Upper Tamakoshi Hydropower Company, Nepal''s largest hydropower project with a capacity of 456 MW, has reported record electricity generation during the current monsoon season.',
   'ShareSanskar Team',
   'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&q=80',
   'Hydropower', 'latest', 3, TRUE, '3 min read'),

  ('SEBON Introduces New Trading Framework for Derivatives Market',
   'sebon-new-trading-framework-derivatives',
   'The Securities Board of Nepal unveils a comprehensive framework for derivatives trading, marking a new era for the market.',
   E'The Securities Board of Nepal (SEBON) has officially unveiled its new regulatory framework for derivatives trading in Nepal''s capital market.',
   'ShareSanskar Team',
   'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&q=80',
   'IPO', 'latest', 4, TRUE, '3 min read'),

  -- trending (5)
  ('Technical Analysis: NABIL Shows Bullish Pattern on Weekly Chart',
   'technical-analysis-nabil-bullish',
   'Expert analysis suggests potential breakout above resistance level.',
   E'Nabil Bank''s stock chart is showing a classic bullish cup-and-handle pattern on the weekly timeframe, suggesting a potential breakout above the Rs. 1,300 resistance level.',
   'ShareSanskar Team',
   'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=800&q=80',
   'Analysis', 'trending', 1, TRUE, '5 min read'),

  ('Insurance Sector Witnesses Surge in Premium Collection',
   'insurance-sector-premium-surge',
   'Life and non-life insurance companies report strong Q2 results.',
   E'Nepal''s insurance sector has reported a significant increase in premium collection during the second quarter, with both life and non-life segments showing strong growth.',
   'ShareSanskar Team',
   'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80',
   'Insurance', 'trending', 2, TRUE, '3 min read'),

  ('Foreign Institutional Investors Show Renewed Interest in NEPSE',
   'fii-renewed-interest-nepse',
   'FII net buying reaches 6-month high in the current trading week.',
   E'Foreign institutional investors have significantly increased their participation in Nepal''s stock market, with net buying reaching a six-month high during the current trading week.',
   'ShareSanskar Team',
   'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&q=80',
   'Market', 'trending', 3, TRUE, '2 min read'),

  ('Nabil Bank Announces 25% Dividend for Shareholders',
   'nabil-bank-25-percent-dividend',
   'The board meeting approved bonus shares and cash dividend.',
   E'Nabil Bank''s board of directors has approved a 25% dividend for its shareholders, comprising 15% bonus shares and 10% cash dividend for the fiscal year 2081/82.',
   'ShareSanskar Team',
   'https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?w=800&q=80',
   'Banking', 'trending', 4, TRUE, '2 min read'),

  ('SEBON Introduces New Trading Regulations for Market Efficiency',
   'sebon-new-trading-regulations',
   'The regulatory body aims to enhance market transparency and efficiency.',
   E'SEBON has introduced several new trading regulations aimed at improving market efficiency and transparency in Nepal''s capital market.',
   'ShareSanskar Team',
   'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80',
   'Market', 'trending', 5, TRUE, '3 min read'),

  -- featured (6)
  ('Global Factors Affecting Nepal Stock Market: A Deep Analysis',
   'global-factors-nepal-stock-market',
   'Understanding how international economic trends influence NEPSE performance and investment strategies for Nepali investors.',
   E'Nepal''s stock market, while relatively insulated from global markets, is increasingly influenced by international economic trends.',
   'ShareSanskar Team',
   'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&q=80',
   'Analysis', 'featured', 1, TRUE, '8 min read'),

  ('Hydropower Stocks: Investment Opportunities in Nepal''s Energy Sector',
   'hydropower-investment-opportunities',
   'A comprehensive guide to investing in hydropower companies as Nepal aims to become a major electricity exporter.',
   E'Nepal''s hydropower sector presents unique investment opportunities as the country accelerates its plans to become a major electricity exporter in South Asia.',
   'ShareSanskar Team',
   'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&q=80',
   'Hydropower', 'featured', 2, TRUE, '6 min read'),

  ('Understanding P/E Ratios in Nepal Banking Sector',
   'understanding-pe-ratios-banking',
   'Learn how to analyze price-to-earnings ratios and identify undervalued banking stocks in NEPSE.',
   E'The price-to-earnings (P/E) ratio is one of the most important metrics for evaluating banking stocks in Nepal.',
   'ShareSanskar Team',
   'https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?w=800&q=80',
   'Education', 'featured', 3, TRUE, '5 min read'),

  ('Mutual Funds in Nepal: A Beginner''s Complete Guide',
   'mutual-funds-nepal-beginners-guide',
   'Everything you need to know about investing in mutual funds, from NAV calculation to fund selection criteria.',
   E'Mutual funds offer a convenient way for retail investors to participate in Nepal''s stock market without the need for active stock picking.',
   'ShareSanskar Team',
   'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80',
   'Education', 'featured', 4, TRUE, '10 min read'),

  ('Insurance Sector Outlook: Growth Potential and Risks',
   'insurance-sector-outlook-growth',
   'Analyzing the future of life and non-life insurance companies in Nepal''s developing financial market.',
   E'Nepal''s insurance sector is at an inflection point, with growing awareness about insurance products driving premium growth.',
   'ShareSanskar Team',
   'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80',
   'Insurance', 'featured', 5, TRUE, '7 min read'),

  ('SEBON''s New Regulations: Impact on Retail Investors',
   'sebon-regulations-impact-retail',
   'Breaking down the latest regulatory changes and how they affect your trading and investment decisions.',
   E'The Securities Board of Nepal (SEBON) has recently introduced several regulatory changes that directly impact retail investors.',
   'ShareSanskar Team',
   'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80',
   'Regulation', 'featured', 6, TRUE, '4 min read')
) AS v(title, slug, excerpt, content, author, image_url, category, section, sort_order, is_published, read_time)
WHERE NOT EXISTS (SELECT 1 FROM news);

-- ─── IPO listings (only seeded if table is empty) ────────────────
INSERT INTO ipo_listings (company_name, symbol, sector, share_type, units, price_per_unit, total_amount, open_date, close_date, listing_date, status)
SELECT * FROM (VALUES
  ('Citizen Investment Trust', 'CIT',   'Mutual Fund',   'IPO',         500000::bigint,  100::numeric(10,2), 'Rs. 5 Crore',    DATE '2026-04-25', DATE '2026-04-29', NULL::date,         'upcoming'),
  ('Nepal Hydro Developers Ltd', 'NHDL', 'Hydropower',    'IPO',         1000000::bigint, 100::numeric(10,2), 'Rs. 10 Crore',   DATE '2026-04-15', DATE '2026-04-19', NULL::date,         'open'),
  ('Prabhu Capital Ltd',        'PRCL', 'Finance',       'Right Share', 750000::bigint,  100::numeric(10,2), 'Rs. 7.5 Crore',  DATE '2026-04-10', DATE '2026-04-14', NULL::date,         'closed'),
  ('Shivam Cements Ltd',        'SHIVM','Manufacturing', 'FPO',         2000000::bigint, 287::numeric(10,2), 'Rs. 57.4 Crore', DATE '2026-03-20', DATE '2026-03-24', DATE '2026-04-05',  'listed')
) AS v(company_name, symbol, sector, share_type, units, price_per_unit, total_amount, open_date, close_date, listing_date, status)
WHERE NOT EXISTS (SELECT 1 FROM ipo_listings);
