"use client";

import { Fragment, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import PageLayout from "@/components/PageLayout";
import AdvertisementSlot from "@/components/AdvertisementSlot";
import Toast from "@/components/Toast";
import { useSavedStories } from "@/lib/useSavedStories";
import { resolveImageUrl, isBackendMedia } from "@/lib/resolveImageUrl";
import { ArrowLeft, Share2, Bookmark, BookmarkCheck, Link2, Check } from "lucide-react";

interface NewsArticle {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  image_url: string;
  category: string;
  categories: string[];
  tags: string[];
  section: string;
  read_time: string | null;
  views: number;
  created_at: string;
  updated_at: string;
  related: RelatedNews[];
}

interface RelatedNews {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  image_url: string;
  category: string;
  created_at: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr.endsWith("Z") ? dateStr : dateStr + "Z");
  return date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr.endsWith("Z") ? dateStr : dateStr + "Z");
  const diffHrs = Math.floor((Date.now() - date.getTime()) / 3_600_000);
  if (diffHrs < 1) return "Just now";
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const d = Math.floor(diffHrs / 24);
  if (d < 7) return `${d}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Split a block of editor HTML into top-level paragraph chunks for ad
// injection. We close every <p>...</p> as its own chunk and keep any
// non-paragraph blocks (figures, headings, embedded HTML) attached to
// the surrounding chunk so the visual flow stays intact.
//
// Deliberately resilient: a body with no <p> tags returns a single
// chunk, and the caller skips inline injection — better than mangling
// short bulletins, copied press releases, or CMS content shaped like
// raw <div>s.
function splitHtmlByParagraph(html: string): string[] {
  const closingP = /<\/p\s*>/gi;
  const chunks: string[] = [];
  let lastEnd = 0;
  let match: RegExpExecArray | null;
  while ((match = closingP.exec(html)) !== null) {
    chunks.push(html.slice(lastEnd, match.index + match[0].length));
    lastEnd = match.index + match[0].length;
  }
  // Trailing content after the final </p> (e.g. closing figure, h2) gets
  // appended to the last chunk so we don't drop anything.
  if (lastEnd < html.length) {
    const tail = html.slice(lastEnd);
    if (chunks.length === 0) chunks.push(tail);
    else chunks[chunks.length - 1] += tail;
  }
  return chunks;
}

interface ArticleClientProps {
  /** Route param — either a numeric id or a slug. Resolved by the server page. */
  idOrSlug: string;
  /** Optional initial article payload from the server fetch, used to skip the
   *  client-side fetch on the first render so the page is interactive instantly. */
  initialArticle?: NewsArticle | null;
}

export default function ArticleClient({ idOrSlug, initialArticle }: ArticleClientProps) {
  const [article, setArticle] = useState<NewsArticle | null>(initialArticle ?? null);
  const [loading, setLoading] = useState(initialArticle == null);
  const [error, setError] = useState(false);
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  // window.location.href is only available on the client; we resolve it
  // post-mount so the server-rendered Facebook share href matches the
  // client-rendered one (was an empty string on SSR and the resolved
  // URL on hydration, which tripped React's mismatch warning).
  const [currentUrl, setCurrentUrl] = useState("");
  const [toast, setToast] = useState<{ msg: string; trigger: number; variant: "default" | "success" }>({
    msg: "",
    trigger: 0,
    variant: "default",
  });

  const { isSaved, toggle: toggleSaved } = useSavedStories();
  const saved = article ? isSaved({ id: article.id, slug: article.slug }) : false;

  function handleToggleSave() {
    if (!article) return;
    const nowSaved = toggleSaved({
      id: article.id,
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      image_url: article.image_url,
      category: article.category,
      created_at: article.created_at,
    });
    setToast({
      msg: nowSaved ? "Saved to Read Later" : "Removed from Read Later",
      trigger: Date.now(),
      variant: nowSaved ? "success" : "default",
    });
  }

  // Native Web Share where available, copy-to-clipboard fallback otherwise.
  async function handleShare() {
    if (typeof window === "undefined" || !article) return;
    const shareData = {
      title: article.title,
      text: article.excerpt,
      url: window.location.href,
    };
    const nav = window.navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
      canShare?: (data: ShareData) => boolean;
    };
    try {
      if (nav.share && (!nav.canShare || nav.canShare(shareData))) {
        await nav.share(shareData);
        return;
      }
    } catch {
      // User cancelled or share failed — fall through to copy.
    }
    void copyLink();
  }

  async function copyLink() {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Older browsers — surface a prompt as a last-ditch fallback.
      window.prompt("Copy this link", window.location.href);
    }
  }

  useEffect(() => {
    // Skip the fetch when the server already handed us the article — we still
    // re-fetch in the background so view counts and 'related' stay fresh on
    // soft navigations from /news → article.
    if (initialArticle) return;
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/news/${idOrSlug}`);
        if (!res.ok) {
          setError(true);
          return;
        }
        setArticle(await res.json());
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    if (idOrSlug) load();
  }, [idOrSlug, initialArticle]);

  // Capture window.location once mounted so server- and client-rendered
  // share links agree. Re-runs on path change via the dependency.
  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, [idOrSlug]);

  // Reading progress bar
  useEffect(() => {
    function onScroll() {
      const h = document.documentElement;
      const total = h.scrollHeight - h.clientHeight;
      setProgress(total > 0 ? Math.min(100, (h.scrollTop / total) * 100) : 0);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (loading) {
    return (
      <PageLayout>
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-16 grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-6">
            <div className="h-3 w-24 skeleton" />
            <div className="space-y-3">
              <div className="h-12 skeleton" />
              <div className="h-12 w-4/5 skeleton" />
            </div>
            <div className="aspect-[16/9] skeleton" />
            <div className="space-y-2">
              <div className="h-4 skeleton" />
              <div className="h-4 w-11/12 skeleton" />
              <div className="h-4 w-10/12 skeleton" />
            </div>
          </div>
          <div className="lg:col-span-4 space-y-3">
            <div className="h-3 w-16 skeleton" />
            <div className="h-20 skeleton" />
            <div className="h-20 skeleton" />
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error || !article) {
    return (
      <PageLayout>
        <div className="max-w-3xl mx-auto px-4 lg:px-8 py-24 text-center">
          <p className="eyebrow text-[#d32027] section-rule justify-center inline-flex">404</p>
          <h1 className="headline-xl text-gray-900 mt-4 mb-3">Article not found</h1>
          <p className="lead text-gray-500 mx-auto mb-8">
            The story you&apos;re looking for has moved or never existed. Try the latest from the newsroom.
          </p>
          <Link
            href="/news"
            className="btn-text inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white hover:bg-[#d32027] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to News
          </Link>
        </div>
      </PageLayout>
    );
  }

  const articleContent = article.content || article.excerpt;
  // If the body looks like HTML (created via the rich-text editor) we render it
  // directly. Otherwise we split plain-text on newlines for backward compatibility.
  const isHtml = /<\/?(p|h[1-6]|ul|ol|li|blockquote|strong|em|b|i|u|a|img|br)[\s>]/i.test(articleContent);
  const paragraphs = isHtml ? [] : articleContent.split("\n").filter((p) => p.trim());

  // Split HTML on closing </p> so we can inject an inline ad after a
  // specific paragraph. Falls back to a single chunk when the body
  // isn't paragraph-structured (short bulletins, press releases pasted
  // as raw <div>s, etc.) — in that case we render the body untouched
  // and skip the inline ad.
  const htmlParagraphChunks = isHtml ? splitHtmlByParagraph(articleContent) : [];
  const inlineAdAfterIndex = 2; // hardcoded: after paragraph 3 (0-indexed)
  const MIN_PARAGRAPHS_FOR_INLINE_AD = 5;
  const shouldInjectInlineAd =
    isHtml && htmlParagraphChunks.length >= MIN_PARAGRAPHS_FOR_INLINE_AD;

  return (
    <PageLayout>
      {/* Reading progress bar */}
      <div className="fixed top-0 left-0 right-0 h-0.5 bg-transparent z-[70] pointer-events-none">
        <div
          className="h-full bg-[#d32027] transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      <article>
        {/* Top banner ad — admin-managed, sits above the article header
            band. Collapses cleanly when no creative is configured. */}
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <AdvertisementSlot placement="article_top" />
        </div>

        {/* ── Header band (full-bleed bg, content aligned to grid) ── */}
        <header className="border-b border-gray-200 bg-gray-50/60">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10 lg:py-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:items-start">
              <aside className="hidden lg:block lg:col-span-2 pt-1">
                <div>
                  <p className="eyebrow text-[#d32027] section-rule inline-flex">{article.category}</p>
                  <p className="meta text-gray-500 mt-5">Market Desk</p>
                  <p className="meta text-gray-400 mt-2 leading-relaxed">
                    Daily context and signals from the Nepal equities market.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200/80">
                  <p className="eyebrow text-gray-500">At a glance</p>
                  <div className="mt-3 space-y-2">
                    {article.read_time && (
                      <p className="meta text-gray-600">Read time: {article.read_time}</p>
                    )}
                    <p className="meta text-gray-600">Views: {Number(article.views).toLocaleString()}</p>
                    <time dateTime={article.created_at} className="meta text-gray-500 block">
                      Published {timeAgo(article.created_at)}
                    </time>
                  </div>
                </div>
              </aside>

              <div className="lg:col-span-6">
                <Link
                  href={`/news?category=${article.category}`}
                  className="eyebrow text-[#d32027] hover:underline underline-offset-4 lg:hidden"
                >
                  {article.category}
                </Link>

                <h1 className="headline-lg text-gray-900 mt-4 lg:mt-0 mb-6">
                  {article.title}
                </h1>

                <p className="lead text-gray-700">{article.excerpt}</p>

                {/* Keep a compact meta row for non-desktop sizes. */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-8 pt-6 border-t border-gray-200 lg:hidden">
                  <span className="byline text-gray-900">
                    By {article.author || "ShareSanskar Newsroom"}
                  </span>
                  <span className="text-gray-300">·</span>
                  <time dateTime={article.created_at} className="meta text-gray-600">
                    {formatDate(article.created_at)}
                  </time>
                  {article.read_time && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span className="meta text-gray-600">{article.read_time}</span>
                    </>
                  )}
                  <span className="text-gray-300">·</span>
                  <span className="price text-gray-600">
                    {Number(article.views).toLocaleString()} views
                  </span>
                </div>
              </div>

              <aside className="hidden lg:block lg:col-span-4">
                <div className="border border-gray-200 bg-white p-5">
                  <p className="eyebrow text-gray-500">Story context</p>
                  <div className="mt-4 space-y-3">
                    <p className="byline text-gray-900">By {article.author || "ShareSanskar Newsroom"}</p>
                    <time dateTime={article.created_at} className="meta text-gray-600 block">
                      {formatDate(article.created_at)}
                    </time>
                    <div className="flex items-center gap-2 text-gray-300">
                      {article.read_time && <span className="meta text-gray-600">{article.read_time}</span>}
                      {article.read_time && <span>·</span>}
                      <span className="price text-gray-600">{Number(article.views).toLocaleString()} views</span>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-gray-200 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleToggleSave}
                      aria-pressed={saved}
                      className={`btn-text inline-flex items-center gap-1.5 transition-colors ${
                        saved ? "text-[#009429] hover:text-[#007a22]" : "text-gray-600 hover:text-[#d32027]"
                      }`}
                    >
                      {saved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                      {saved ? "Saved" : "Save"}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={copyLink}
                        className={`p-1.5 transition-colors ${copied ? "text-[#009429]" : "text-gray-400 hover:text-gray-900"}`}
                        aria-label={copied ? "Link copied" : "Copy link"}
                        title={copied ? "Link copied" : "Copy link"}
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={handleShare}
                        className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors"
                        aria-label="Share"
                        title="Share"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <Link
                    href="/market"
                    className="btn-text mt-4 inline-block text-gray-700 hover:text-[#d32027] transition-colors"
                  >
                    View Markets →
                  </Link>
                </div>
              </aside>
            </div>
          </div>
        </header>

        {/* ── Body ────────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Main column */}
            <div className="lg:col-span-8">
              {/* Hero image */}
              {(() => {
                const src = resolveImageUrl(article.image_url);
                return src ? (
                  <figure className="mb-10">
                    <div className="relative aspect-[16/9] bg-gray-100 overflow-hidden">
                      <Image
                        src={src}
                        alt={article.title}
                        fill
                        unoptimized={isBackendMedia(src)}
                        className="object-cover"
                        sizes="(min-width: 1024px) 60vw, 100vw"
                        priority
                      />
                    </div>
                    <figcaption className="meta text-gray-500 mt-3">
                      Photograph · ShareSanskar
                    </figcaption>
                  </figure>
                ) : null;
              })()}

              {/* Article body — drop-cap on first paragraph. For HTML
                  content with enough structure, inject an inline ad
                  after the third paragraph; otherwise render the body
                  in one piece. */}
              {isHtml ? (
                shouldInjectInlineAd ? (
                  <div className="prose-editorial">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: htmlParagraphChunks.slice(0, inlineAdAfterIndex + 1).join(""),
                      }}
                    />
                    <AdvertisementSlot placement="article_inline" />
                    <div
                      dangerouslySetInnerHTML={{
                        __html: htmlParagraphChunks.slice(inlineAdAfterIndex + 1).join(""),
                      }}
                    />
                  </div>
                ) : (
                  <div
                    className="prose-editorial"
                    dangerouslySetInnerHTML={{ __html: articleContent }}
                  />
                )
              ) : (
                <div className="prose-editorial">
                  {paragraphs.map((p, i) => (
                    <Fragment key={i}>
                      <p>{p}</p>
                      {i === inlineAdAfterIndex &&
                        paragraphs.length >= MIN_PARAGRAPHS_FOR_INLINE_AD && (
                          <AdvertisementSlot placement="article_inline" />
                        )}
                    </Fragment>
                  ))}
                </div>
              )}

              {/* Share rail */}
              <div className="mt-12 pt-8 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="eyebrow text-gray-500 mr-2">Share</span>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-gray-400 hover:text-[#1da1f2] transition-colors"
                    aria-label="Share on Twitter"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  </a>
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-gray-400 hover:text-[#1877f2] transition-colors"
                    aria-label="Share on Facebook"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </a>
                  <button
                    type="button"
                    onClick={copyLink}
                    className={`p-2 transition-colors ${copied ? "text-[#009429]" : "text-gray-400 hover:text-gray-900"}`}
                    aria-label={copied ? "Link copied" : "Copy link"}
                    title={copied ? "Link copied" : "Copy link"}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
                    aria-label="Share"
                    title="Share"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleToggleSave}
                  aria-pressed={saved}
                  className={`btn-text flex items-center gap-2 transition-colors ${
                    saved ? "text-[#009429] hover:text-[#007a22]" : "text-gray-500 hover:text-[#d32027]"
                  }`}
                >
                  {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  {saved ? "Saved" : "Save Story"}
                </button>
              </div>

              {/* Categories */}
              {article.categories && article.categories.length > 0 && (
                <div className="mt-6 flex flex-wrap items-center gap-2">
                  <span className="eyebrow text-gray-500 mr-1">Filed under</span>
                  {article.categories.map((cat) => (
                    <Link
                      key={cat}
                      href={`/news?category=${encodeURIComponent(cat)}`}
                      className="meta px-3 py-1 border border-gray-200 text-gray-700 hover:border-[#d32027] hover:text-[#d32027] transition-colors"
                    >
                      {cat}
                    </Link>
                  ))}
                </div>
              )}

              {/* Tags */}
              {article.tags && article.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="eyebrow text-gray-500 mr-1">Tags</span>
                  {article.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/news?tag=${encodeURIComponent(tag)}`}
                      className="meta px-3 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-[#d32027]/10 hover:text-[#d32027] transition-colors"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              )}

              <Link
                href="/news"
                className="btn-text mt-12 inline-flex items-center gap-2 text-gray-700 hover:text-[#d32027] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to All News
              </Link>
            </div>

            {/* Side rail: Related + market CTA */}
            <aside className="lg:col-span-4">
              <div className="lg:sticky lg:top-32">
                <p className="eyebrow section-rule mb-4">Related</p>
                {article.related && article.related.length > 0 ? (
                  <ol className="space-y-5 border-t border-gray-200 pt-5">
                    {article.related.map((item, i) => (
                      <li key={item.id}>
                        <Link href={`/news/${item.slug || item.id}`} className="group flex gap-3">
                          <span className="numeric text-gray-200 group-hover:text-[#d32027] transition-colors text-2xl font-bold leading-none w-8 shrink-0">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="eyebrow text-[#d32027]">{item.category}</span>
                            <h4 className="headline-sm text-gray-900 mt-1 group-hover:text-[#d32027] transition-colors line-clamp-3">
                              {item.title}
                            </h4>
                            <p className="meta text-gray-400 mt-2">{timeAgo(item.created_at)}</p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="meta text-gray-500 border-t border-gray-200 pt-5">No related stories yet.</p>
                )}

                <Link
                  href="/market"
                  className="mt-10 block bg-black text-white p-5 hover:bg-[#d32027] transition-colors"
                >
                  <p className="eyebrow text-white/60">Live</p>
                  <p className="headline-md text-white mt-2">NEPSE Market Snapshot</p>
                  <p className="footer-text text-white/70 mt-2">
                    Index, sector breadth, gainers and losers — updated through the trading day.
                  </p>
                  <span className="btn-text inline-block mt-4">
                    View Markets →
                  </span>
                </Link>

                {/* Sidebar ad — admin-managed via /admin/ads. Renders
                    nothing if no active creative is assigned to this
                    placement. Sticky is desktop-only (CSS-only). */}
                <AdvertisementSlot placement="article_sidebar" />
              </div>
            </aside>
          </div>
        </div>

        {/* Article footer ad — full container width so the 970×250
            creative doesn't leave a blank 4-column gap on desktop.
            Collapses cleanly when no ad is configured. */}
        <div className="max-w-7xl mx-auto px-4 lg:px-8 pb-10 lg:pb-14">
          <AdvertisementSlot placement="article_footer" />
        </div>
      </article>
      <Toast message={toast.msg} trigger={toast.trigger} variant={toast.variant} />
    </PageLayout>
  );
}
