"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SectionHeader from "./SectionHeader";

type Reel =
  | { kind: "tiktok"; id: string; url: string; caption: string }
  | { kind: "instagram"; permalink: string; caption: string };

const reels: Reel[] = [
  {
    kind: "tiktok",
    id: "7581323326111419679",
    url: "https://www.tiktok.com/@sharesanskar/video/7581323326111419679",
    caption: "Reliance Spinning Mills opens IPO for foreign-employment applicants.",
  },
  {
    kind: "tiktok",
    id: "7581384609200344350",
    url: "https://www.tiktok.com/@sharesanskar/video/7581384609200344350",
    caption: "Cash-transaction ceiling tightened from Rs. 10 lakh to Rs. 5 lakh.",
  },
  {
    kind: "instagram",
    permalink: "https://www.instagram.com/reel/DYBnDDMxUCD/",
    caption: "From the @sharesanskar Instagram reels.",
  },
  {
    kind: "tiktok",
    id: "7636726820917808415",
    url: "https://www.tiktok.com/@sharesanskar/video/7636726820917808415",
    caption: "Netflix in talks with the government and Nepali telcos to launch domestically.",
  },
];

declare global {
  interface Window {
    instgrm?: { Embeds?: { process: () => void } };
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

  useEffect(() => {
    const tt = loadEmbedScript("https://www.tiktok.com/embed.js", "data-reels-tiktok");
    const ig = loadEmbedScript("https://www.instagram.com/embed.js", "data-reels-instagram");

    // Poll for window.instgrm and call process() once it's available; bail
    // after ~5s so we never loop forever.
    let tries = 0;
    const poll = window.setInterval(() => {
      tries += 1;
      if (window.instgrm?.Embeds?.process) {
        window.instgrm.Embeds.process();
        window.clearInterval(poll);
      } else if (tries > 25) {
        window.clearInterval(poll);
      }
    }, 200);

    return () => {
      window.clearInterval(poll);
      tt.remove();
      ig.remove();
    };
  }, []);

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
        <SectionHeader
          eyebrow="Reels"
          title="Sansar Shorts"
          description="Sixty-second market reads from our TikTok and Instagram — swipe through the rail."
          href="https://www.tiktok.com/@sharesanskar"
          hrefLabel="Follow on TikTok →"
        />

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

          <div
            ref={railRef}
            className="reels-rail flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth"
          >
            {reels.map((r, i) => (
              <div
                key={i}
                data-reel-card
                className="snap-start shrink-0 w-[min(85vw,360px)] sm:w-[360px]"
              >
                <div className="relative bg-white border border-gray-100 overflow-hidden">
                  {r.kind === "tiktok" ? (
                    <TikTokEmbed url={r.url} id={r.id} />
                  ) : (
                    <InstagramEmbed permalink={r.permalink} />
                  )}
                </div>
                <p className="meta text-gray-500 mt-3 line-clamp-2">{r.caption}</p>
              </div>
            ))}
          </div>
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
        .reels-rail .instagram-media {
          margin: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
        }
        /* TikTok renders an iframe inside the blockquote that ignores the
           parent's width; pin it to the card so it doesn't overflow. */
        .reels-rail .tiktok-embed iframe {
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
