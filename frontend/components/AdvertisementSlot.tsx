"use client";

import { useEffect, useState } from "react";
import { resolveImageUrl } from "@/lib/resolveImageUrl";

interface Ad {
  id: number;
  name: string;
  image_url: string;
  link_url: string | null;
  alt_text: string;
  placement: "news_listing" | "news_article" | "all_news";
  is_active: boolean;
  sort_order: number;
}

interface Props {
  /** Where on the site this slot lives — used to fetch matching ads. */
  placement: "news_listing" | "news_article";
  /**
   * Layout variant. "banner" is full-width with letterboxed art;
   * "card" is a tighter form for narrow sidebars.
   */
  variant?: "banner" | "card";
  /**
   * Maximum number of ads to render. Sidebars have less room than the
   * listing footer, so callers cap independently.
   */
  limit?: number;
  className?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/**
 * Renders active advertisements for a given placement.
 *
 * GIF animation note: we deliberately use a plain <img> tag rather than
 * next/image. The Next.js image optimizer strips animation from GIFs by
 * default, and the whole point of supporting GIFs here is the motion.
 * `unoptimized` would also work but plain <img> is one fewer moving part.
 *
 * Fails silently if no ads are configured — the slot just disappears,
 * which is the right behavior for an empty newsroom inventory.
 */
export default function AdvertisementSlot({
  placement,
  variant = "banner",
  limit = 1,
  className = "",
}: Props) {
  const [ads, setAds] = useState<Ad[]>([]);
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
        const data: Ad[] = Array.isArray(json?.data) ? json.data : [];
        setAds(data.slice(0, Math.max(1, limit)));
        setLoaded(true);
      } catch {
        if (!cancelled) setLoaded(true);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [placement, limit]);

  if (!loaded || ads.length === 0) return null;

  return (
    <aside
      aria-label="Advertisement"
      className={`${variant === "banner" ? "mt-10 pt-8 border-t border-gray-100" : "mt-8"} ${className}`}
    >
      <p className="eyebrow text-gray-400 mb-3 tracking-widest">Advertisement</p>
      <div
        className={
          variant === "banner"
            ? "grid grid-cols-1 gap-4 sm:gap-6"
            : "flex flex-col gap-4"
        }
      >
        {ads.map((ad) => (
          <AdCreative key={ad.id} ad={ad} variant={variant} />
        ))}
      </div>
    </aside>
  );
}

function AdCreative({ ad, variant }: { ad: Ad; variant: "banner" | "card" }) {
  const src = resolveImageUrl(ad.image_url);
  if (!src) return null;

  const wrapperClass =
    variant === "banner"
      ? "block group relative bg-gray-50 rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
      : "block group relative bg-gray-50 rounded-lg border border-gray-100 overflow-hidden hover:shadow-sm transition-shadow";

  // Banners get a generous max-height; cards stay tight to fit a sidebar.
  const imgClass =
    variant === "banner"
      ? "w-full h-auto max-h-[260px] object-contain mx-auto"
      : "w-full h-auto max-h-[220px] object-contain mx-auto";

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
      <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/60 text-white/90">
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
