"use client";

import { useEffect, useState } from "react";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import {
  AD_PLACEMENTS,
  AD_SIZE_DIMENSIONS,
  type AdPlacement,
  type AdSize,
} from "@/lib/adPlacements";

interface Ad {
  id: number;
  name: string;
  image_url: string;
  link_url: string | null;
  alt_text: string;
  placement: AdPlacement;
  size: AdSize;
  is_active: boolean;
  sort_order: number;
}

interface Props {
  /** Where on the site this slot lives — used to fetch matching ads. */
  placement: AdPlacement;
  /**
   * Desktop-only sticky positioning. CSS-only — no scroll listeners.
   * Use for the article sidebar so the creative stays in view as the
   * reader scrolls through long articles.
   */
  sticky?: boolean;
  className?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Layout is slot-driven. The sidebar is a tight card; every other slot
// is a banner-shaped strip. We re-derive it from the placement prop so
// the renderer never carries extra state.
function isCardSlot(p: AdPlacement): boolean {
  return p === AD_PLACEMENTS.ARTICLE_SIDEBAR;
}

/**
 * Renders one active advertisement for a given placement.
 *
 * The backend rotates inventory via `ORDER BY sort_order ASC, RANDOM()
 * LIMIT 1`, so this component always receives at most one ad per
 * request and never stacks creatives in a single slot.
 *
 * GIF animation note: we deliberately use a plain <img> tag rather
 * than next/image. The Next.js image optimizer strips animation from
 * GIFs by default, and the whole point of supporting GIFs here is the
 * motion. Plain <img> is one fewer moving part.
 *
 * Fails silently if no ad is configured for this slot — the component
 * just disappears, which is the right behavior for an empty inventory.
 */
export default function AdvertisementSlot({
  placement,
  sticky = false,
  className = "",
}: Props) {
  const [ad, setAd] = useState<Ad | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `${API_URL}/api/ads?placement=${encodeURIComponent(placement)}`,
          { cache: "no-store" }
        );
        if (!res.ok) {
          if (!cancelled) setLoaded(true);
          return;
        }
        const json = await res.json();
        if (cancelled) return;
        const first: Ad | null = Array.isArray(json?.data) && json.data.length > 0 ? json.data[0] : null;
        setAd(first);
        setLoaded(true);
      } catch {
        if (!cancelled) setLoaded(true);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [placement]);

  // Collapse to nothing when no active ad exists for this slot — no
  // reserved space, no skeleton, no spacer. Avoids hollow gaps in the
  // layout (especially important for the inline slot).
  if (!loaded || !ad) return null;

  const card = isCardSlot(placement);
  const stickyClass = sticky ? "lg:sticky lg:top-24" : "";

  // Banners cap to the creative's natural width so a 728-wide ad doesn't
  // float inside a 1280-wide column. The sidebar card is different —
  // it should stretch to fill the rail column so it visually stacks
  // with the Story Context card above it; the image inside still
  // renders at its 300×250 natural size, just letterboxed within the
  // wider card.
  const naturalWidth = AD_SIZE_DIMENSIONS[ad.size]?.width;
  const widthCap = !card && naturalWidth ? { maxWidth: `${naturalWidth}px` } : undefined;

  return (
    <aside
      aria-label="Advertisement"
      className={`${card ? "mt-8" : "mt-6"} ${stickyClass} ${className}`}
    >
      <div className={card ? "" : "mx-auto"} style={widthCap}>
        {/* Minimal disclosure label — required for transparency on news
            sites, but kept small and uppercase so it reads as inventory
            metadata. Centered so it sits over the same axis as the
            creative for banner placements. */}
        <p
          className={`text-[9px] uppercase tracking-widest text-gray-400 mb-1.5 ${
            card ? "" : "text-center"
          }`}
        >
          Advertisement
        </p>
        <AdCreative ad={ad} card={card} />
      </div>
    </aside>
  );
}

function AdCreative({ ad, card }: { ad: Ad; card: boolean }) {
  const src = resolveImageUrl(ad.image_url);
  if (!src) return null;

  // Sidebar cards keep their subtle card chrome (they sit in a narrow
  // rail). Banners render borderless and flush so they read as
  // inventory, not editorial blocks.
  const wrapperClass = card
    ? "block group relative bg-gray-50 rounded-lg border border-gray-100 overflow-hidden hover:shadow-sm transition-shadow"
    : "block relative overflow-hidden";

  // Banners get a tight height cap so 970×250 creatives read as a
  // slim strip rather than dominating the editorial column. Cards
  // (sidebar) keep their existing caps — they're not the issue.
  const imgClass = card
    ? "w-full h-auto max-h-[160px] sm:max-h-[220px] object-contain mx-auto"
    : "w-full h-auto max-h-[90px] lg:max-h-[70px] object-contain mx-auto";

  const content = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={ad.alt_text || ad.name}
        loading="lazy"
        decoding="async"
        className={imgClass}
      />
      <span className="absolute top-1.5 right-1.5 text-[8px] font-semibold uppercase tracking-wider px-1 py-0.5 rounded bg-black/50 text-white/80">
        Ad
      </span>
    </>
  );

  if (ad.link_url) {
    return (
      <a
        href={ad.link_url}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className={wrapperClass}
        aria-label={ad.alt_text || ad.name}
      >
        {content}
      </a>
    );
  }
  return <div className={wrapperClass}>{content}</div>;
}
