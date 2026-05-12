// Single source of truth for ad placement keys and sizes, shared
// between the admin form, the public AdvertisementSlot, and the
// backend validator in backend/src/routes/ads.ts.
//
// Slot-driven rendering: each ad targets exactly one placement and
// declares its rendered size. The slot decides the layout; we don't
// store a per-ad variant. There is no wildcard fallback inventory.

export const AD_PLACEMENTS = {
  NEWS_LISTING: "news_listing",
  ARTICLE_TOP: "article_top",
  ARTICLE_SIDEBAR: "article_sidebar",
  ARTICLE_INLINE: "article_inline",
  ARTICLE_FOOTER: "article_footer",
} as const;

export type AdPlacement = (typeof AD_PLACEMENTS)[keyof typeof AD_PLACEMENTS];

// Human-readable labels for the admin form's placement picker.
export const PLACEMENT_LABEL: Record<AdPlacement, string> = {
  news_listing: "News listing (below the article grid)",
  article_top: "Article top banner (above the hero image)",
  article_sidebar: "Article sidebar (sticky on desktop)",
  article_inline: "Article inline (after paragraph 3)",
  article_footer: "Article footer (below share/tags)",
};

export const PLACEMENT_HINT: Record<AdPlacement, string> = {
  news_listing: "Shown below the article grid on /news. Best for 728×90 or 970×250.",
  article_top: "Banner above the article's hero image. Best for 970×250 or 728×90.",
  article_sidebar: "Sticky in the right rail on /news/[article] — desktop only. Best for 300×250 or 300×600.",
  article_inline: "Injected after paragraph 3 of articles with five or more paragraphs. Best for 728×90 or 320×100.",
  article_footer: "Below the share/tag row at the end of an article. Best for 970×250 or 728×90.",
};

// ─── Ad sizes ────────────────────────────────────────────────────
//
// Fixed canonical sizes, enforced both at upload (pixel dimensions
// must match) and at save (selected size must be compatible with the
// chosen placement). Tied to a small allowlist so we don't end up
// with bespoke 312×248 creatives that break every slot.

export const AD_SIZES = [
  "300x250",
  "300x600",
  "728x90",
  "970x250",
  "320x100",
] as const;

export type AdSize = (typeof AD_SIZES)[number];

export const AD_SIZE_LABEL: Record<AdSize, string> = {
  "300x250": "300×250 — Medium Rectangle",
  "300x600": "300×600 — Half-Page",
  "728x90": "728×90 — Leaderboard",
  "970x250": "970×250 — Billboard",
  "320x100": "320×100 — Mobile Large Banner",
};

// Pixel dimensions parsed once for validators.
export const AD_SIZE_DIMENSIONS: Record<AdSize, { width: number; height: number }> = {
  "300x250": { width: 300, height: 250 },
  "300x600": { width: 300, height: 600 },
  "728x90": { width: 728, height: 90 },
  "970x250": { width: 970, height: 250 },
  "320x100": { width: 320, height: 100 },
};

// Which sizes each placement will render. The slot routing layer
// filters incoming inventory by these lists, and the admin form
// restricts the size picker once a placement is selected.
export const PLACEMENT_SIZE_COMPAT: Record<AdPlacement, AdSize[]> = {
  news_listing: ["728x90", "970x250"],
  article_top: ["970x250", "728x90"],
  article_sidebar: ["300x250", "300x600"],
  article_inline: ["728x90", "320x100", "300x250"],
  article_footer: ["970x250", "728x90", "320x100"],
};
