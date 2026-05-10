"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const SOCIAL_FOLLOWS: { name: string; href: string; brand: string; brandHover: string; icon: React.ReactNode }[] = [
  {
    name: "TikTok",
    href: "https://www.tiktok.com/@sharesanskar",
    brand: "hover:text-white hover:bg-black hover:border-black",
    brandHover: "group-hover:text-white",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.85a8.16 8.16 0 0 0 4.77 1.52V6.91a4.79 4.79 0 0 1-1.84-.22z" />
      </svg>
    ),
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/sharesanskar",
    brand: "hover:text-white hover:bg-gradient-to-tr hover:from-[#feda75] hover:via-[#d62976] hover:to-[#4f5bd5] hover:border-transparent",
    brandHover: "group-hover:text-white",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.163c3.204 0 3.584.012 4.849.07 1.366.062 2.633.336 3.608 1.311.975.975 1.249 2.242 1.311 3.608.058 1.265.07 1.645.07 4.849s-.012 3.584-.07 4.849c-.062 1.366-.336 2.633-1.311 3.608-.975.975-2.242 1.249-3.608 1.311-1.265.058-1.645.07-4.849.07s-3.584-.012-4.849-.07c-1.366-.062-2.633-.336-3.608-1.311-.975-.975-1.249-2.242-1.311-3.608C2.175 15.747 2.163 15.367 2.163 12s.012-3.584.07-4.849c.062-1.366.336-2.633 1.311-3.608.975-.975 2.242-1.249 3.608-1.311C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.332.014 7.052.072 5.775.13 4.602.396 3.635 1.363 2.668 2.33 2.402 3.503 2.344 4.78 2.286 6.06 2.272 6.469 2.272 9.728c0 3.259.014 3.668.072 4.948.058 1.277.324 2.45 1.291 3.417.967.967 2.14 1.233 3.417 1.291 1.28.058 1.689.072 4.948.072s3.668-.014 4.948-.072c1.277-.058 2.45-.324 3.417-1.291.967-.967 1.233-2.14 1.291-3.417.058-1.28.072-1.689.072-4.948 0-3.259-.014-3.668-.072-4.948-.058-1.277-.324-2.45-1.291-3.417C19.398.396 18.225.13 16.948.072 15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
    ),
  },
  {
    name: "Facebook",
    href: "https://www.facebook.com/sanskarshare",
    brand: "hover:text-white hover:bg-[#1877F2] hover:border-[#1877F2]",
    brandHover: "group-hover:text-white",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
];

type Platform = "tiktok" | "instagram" | "facebook";

interface VideoRow {
  id: number;
  platform: Platform;
  url: string;
  caption: string;
}

// TikTok video URLs look like:  https://www.tiktok.com/@user/video/<numeric id>
// We extract that id for the official embed blockquote's data-video-id attr.
function extractTikTokId(url: string): string | null {
  const m = url.match(/\/video\/(\d+)/);
  return m ? m[1] : null;
}

declare global {
  interface Window {
    instgrm?: { Embeds?: { process: () => void } };
    FB?: { XFBML?: { parse: (el?: HTMLElement) => void } };
  }
}

// TikTok's and Instagram's embed scripts only auto-process the blockquotes
// they find at script-load time. With Next.js client-side navigation the
// script may already be cached from a previous page (TikTok in particular
// won't re-scan the DOM), so we re-inject fresh <script> tags on each mount
// and poll briefly for IG's process() once it's defined.
function loadEmbedScript(src: string, attr: string) {
  // Remove any prior copy so the script re-executes and rescans the DOM.
  document.querySelectorAll(`script[${attr}]`).forEach((s) => s.remove());
  const s = document.createElement("script");
  s.src = src;
  s.async = true;
  s.setAttribute(attr, "true");
  document.body.appendChild(s);
  return s;
}

export default function YouTubeSection() {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Pull the active video list from the API; admins manage it via /admin/videos.
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/videos`)
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((json) => {
        if (cancelled) return;
        setVideos(Array.isArray(json?.data) ? json.data : []);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-inject embed scripts whenever the video list changes so each platform's
  // SDK rescans the freshly rendered blockquotes.
  useEffect(() => {
    if (!loaded || videos.length === 0) return;

    const hasTikTok = videos.some((v) => v.platform === "tiktok");
    const hasInstagram = videos.some((v) => v.platform === "instagram");
    const hasFacebook = videos.some((v) => v.platform === "facebook");

    const scripts: HTMLScriptElement[] = [];
    if (hasTikTok) scripts.push(loadEmbedScript("https://www.tiktok.com/embed.js", "data-reels-tiktok"));
    if (hasInstagram) scripts.push(loadEmbedScript("https://www.instagram.com/embed.js", "data-reels-instagram"));
    if (hasFacebook) scripts.push(loadEmbedScript("https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v18.0", "data-reels-facebook"));

    // Poll briefly for each SDK's processor and call it once available.
    let tries = 0;
    const poll = window.setInterval(() => {
      tries += 1;
      if (window.instgrm?.Embeds?.process) window.instgrm.Embeds.process();
      if (window.FB?.XFBML?.parse) window.FB.XFBML.parse();
      if (tries > 25) window.clearInterval(poll);
    }, 200);

    return () => {
      window.clearInterval(poll);
      scripts.forEach((s) => s.remove());
    };
  }, [videos, loaded]);

  function scrollBy(direction: 1 | -1) {
    const el = railRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-reel-card]");
    const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: step * direction, behavior: "smooth" });
  }

  return (
    <>
      <section className="py-12 border-b border-gray-200">
        <header className="flex flex-wrap items-end justify-between gap-4 mb-3 pb-1">
          <div className="max-w-3xl">
            <p className="eyebrow section-rule">Reels</p>
            <h2 className="headline-lg text-gray-900 mt-3 text-balance">ShareSanskar Shorts</h2>
            <p className="lead mt-3 text-gray-500 text-[0.9375rem] max-w-2xl">
              Sixty-second market reads from our TikTok, Instagram and Facebook — swipe through the rail.
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-2.5">
            {SOCIAL_FOLLOWS.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Follow ShareSanskar on ${s.name}`}
                className={`group inline-flex items-center justify-center gap-2 h-10 px-3 sm:px-4 rounded-full border border-gray-200 bg-white text-gray-700 text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${s.brand}`}
              >
                <span className={`text-gray-500 transition-colors ${s.brandHover}`}>{s.icon}</span>
                <span className="hidden sm:inline">Follow</span>
                <span>{s.name}</span>
              </a>
            ))}
          </div>
        </header>

        <div className="relative">
          {/* Rail controls */}
          <div className="hidden md:flex items-center justify-end gap-2 mb-4">
            <button
              type="button"
              aria-label="Scroll reels left"
              onClick={() => scrollBy(-1)}
              className="w-9 h-9 rounded-full border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 flex items-center justify-center text-gray-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Scroll reels right"
              onClick={() => scrollBy(1)}
              className="w-9 h-9 rounded-full border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 flex items-center justify-center text-gray-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {loaded && videos.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              No videos available right now — check back soon.
            </div>
          ) : (
            <div
              ref={railRef}
              className="reels-rail flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth"
            >
              {videos.map((v) => {
                const tikTokId = v.platform === "tiktok" ? extractTikTokId(v.url) : null;
                return (
                  <div
                    key={v.id}
                    data-reel-card
                    className="snap-start shrink-0 w-[min(85vw,360px)] sm:w-[360px]"
                  >
                    <div className="relative bg-white border border-gray-100 overflow-hidden">
                      {v.platform === "tiktok" && tikTokId ? (
                        <TikTokEmbed url={v.url} id={tikTokId} />
                      ) : v.platform === "instagram" ? (
                        <InstagramEmbed permalink={v.url} />
                      ) : v.platform === "facebook" ? (
                        <FacebookEmbed url={v.url} />
                      ) : null}
                    </div>
                    {v.caption && (
                      <p className="meta text-gray-500 mt-3 line-clamp-2">{v.caption}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <style jsx global>{`
        .reels-rail::-webkit-scrollbar {
          height: 6px;
        }
        .reels-rail::-webkit-scrollbar-track {
          background: transparent;
        }
        .reels-rail::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 3px;
        }
        .reels-rail::-webkit-scrollbar-thumb:hover {
          background: #d4d4d8;
        }
        /* Remove the embeds' default outer margins so cards align cleanly,
           but let TikTok/Instagram keep their internal min-width (TikTok
           requires >= 325px to render its iframe). */
        .reels-rail .tiktok-embed,
        .reels-rail .instagram-media,
        .reels-rail .fb-video {
          margin: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
        }
        /* TikTok and Facebook render iframes inside their wrappers that
           ignore the parent's width; pin them to the card so they don't
           overflow. */
        .reels-rail .tiktok-embed iframe,
        .reels-rail .fb-video iframe {
          width: 100% !important;
          max-width: 100% !important;
        }
      `}</style>
    </>
  );
}

function TikTokEmbed({ url, id }: { url: string; id: string }) {
  return (
    <blockquote
      className="tiktok-embed"
      cite={url}
      data-video-id={id}
      style={{ maxWidth: "605px", minWidth: "325px" }}
    >
      <section>
        <a target="_blank" rel="noopener noreferrer" href={`${url}?refer=embed`}>
          @sharesanskar on TikTok
        </a>
      </section>
    </blockquote>
  );
}

function InstagramEmbed({ permalink }: { permalink: string }) {
  return (
    <blockquote
      className="instagram-media"
      data-instgrm-captioned
      data-instgrm-permalink={`${permalink}?utm_source=ig_embed&utm_campaign=loading`}
      data-instgrm-version="14"
      style={{
        background: "#FFF",
        border: 0,
        margin: 0,
        maxWidth: 540,
        minWidth: 326,
        padding: 0,
        width: "100%",
      }}
    >
      <div style={{ padding: 16 }}>
        <a
          href={`${permalink}?utm_source=ig_embed&utm_campaign=loading`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ background: "#FFFFFF", lineHeight: 0, textDecoration: "none", width: "100%" }}
        >
          View this reel on Instagram
        </a>
      </div>
    </blockquote>
  );
}

// Facebook's XFBML SDK turns this div into a full embed once parsed.
// data-href accepts post, video, or reel URLs.
function FacebookEmbed({ url }: { url: string }) {
  return (
    <div
      className="fb-video"
      data-href={url}
      data-show-text="false"
      data-allowfullscreen="true"
      data-width="auto"
    >
      <a href={url} target="_blank" rel="noopener noreferrer" className="block p-4 text-sm text-gray-600">
        View this video on Facebook
      </a>
    </div>
  );
}
