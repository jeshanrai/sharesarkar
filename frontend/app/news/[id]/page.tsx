"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import PageLayout from "@/components/PageLayout";
import { ArrowLeft, Share2, Bookmark, Link2 } from "lucide-react";

interface NewsArticle {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  image_url: string;
  category: string;
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

export default function NewsArticlePage() {
  const params = useParams();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/news/${params.id}`);
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
    if (params.id) load();
  }, [params.id]);

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
        <div className="max-w-3xl mx-auto px-4 lg:px-8 py-16 space-y-6">
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
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white text-xs font-semibold tracking-widest uppercase hover:bg-[#d32027] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to News
          </Link>
        </div>
      </PageLayout>
    );
  }

  const articleContent = article.content || article.excerpt;
  const paragraphs = articleContent.split("\n").filter((p) => p.trim());

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
        {/* ── Header band ─────────────────────────────────────────── */}
        <header className="border-b border-gray-200 bg-gray-50/50">
          <div className="max-w-3xl mx-auto px-4 lg:px-8 py-10 lg:py-14">
            <Link
              href={`/news?category=${article.category}`}
              className="eyebrow text-[#d32027] hover:underline underline-offset-4"
            >
              {article.category}
            </Link>

            <h1 className="headline-hero text-gray-900 mt-5 mb-6 max-w-[22ch]">
              {article.title}
            </h1>

            <p className="lead text-gray-700">{article.excerpt}</p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-8 pt-6 border-t border-gray-200 text-[13px] text-gray-600">
              <span className="font-semibold text-gray-900">
                {article.author || "ShareSanskar Newsroom"}
              </span>
              <span className="text-gray-300">·</span>
              <time dateTime={article.created_at}>{formatDate(article.created_at)}</time>
              {article.read_time && (
                <>
                  <span className="text-gray-300">·</span>
                  <span>{article.read_time}</span>
                </>
              )}
              <span className="text-gray-300">·</span>
              <span className="numeric">{article.views} views</span>
            </div>
          </div>
        </header>

        {/* ── Body ────────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 lg:col-start-2">
            {/* Hero image */}
            {article.image_url && (
              <figure className="mb-10 -mx-4 lg:mx-0">
                <div className="relative aspect-[16/9] bg-gray-100 overflow-hidden">
                  <Image
                    src={article.image_url}
                    alt={article.title}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 60vw, 100vw"
                    priority
                  />
                </div>
                <figcaption className="mt-3 text-xs text-gray-500 italic px-4 lg:px-0">
                  Photograph · ShareSanskar
                </figcaption>
              </figure>
            )}

            {/* Article body — drop-cap on first paragraph */}
            <div className="prose-editorial">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            {/* Share rail */}
            <div className="mt-12 pt-8 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="eyebrow text-gray-500">Share</span>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-gray-400 hover:text-[#1da1f2] transition-colors"
                  title="Share on Twitter"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${typeof window !== "undefined" ? encodeURIComponent(window.location.href) : ""}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-gray-400 hover:text-[#1877f2] transition-colors"
                  title="Share on Facebook"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <button
                  onClick={() => {
                    if (typeof window !== "undefined") navigator.clipboard?.writeText(window.location.href);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
                  title="Copy link"
                >
                  <Link2 className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors" title="Share">
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
              <button className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-500 hover:text-[#d32027] transition-colors">
                <Bookmark className="w-4 h-4" /> Save Story
              </button>
            </div>

            {/* Tags */}
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="eyebrow text-gray-500">Filed under</span>
              {[article.category, "NEPSE", "Nepal Stock Market"].map((tag) => (
                <Link
                  key={tag}
                  href={`/news?category=${tag}`}
                  className="px-3 py-1 border border-gray-200 text-xs text-gray-700 hover:border-[#d32027] hover:text-[#d32027] transition-colors"
                >
                  {tag}
                </Link>
              ))}
            </div>

            <Link
              href="/news"
              className="mt-12 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-700 hover:text-[#d32027] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to All News
            </Link>
          </div>

          {/* ── Side rail: Related ────────────────────────────────── */}
          <aside className="lg:col-span-3">
            <div className="lg:sticky lg:top-32">
              <p className="eyebrow section-rule mb-4">Related</p>
              {article.related && article.related.length > 0 ? (
                <ol className="space-y-5 border-t border-gray-200 pt-2">
                  {article.related.map((item, i) => (
                    <li key={item.id}>
                      <Link href={`/news/${item.id}`} className="group flex gap-3">
                        <span className="font-serif text-2xl font-bold text-gray-200 leading-none w-7 shrink-0 group-hover:text-[#d32027] transition-colors numeric">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="flex-1">
                          <span className="eyebrow text-[#d32027]">{item.category}</span>
                          <h4 className="headline-sm text-[0.95rem] text-gray-900 mt-1 group-hover:text-[#d32027] transition-colors line-clamp-3">
                            {item.title}
                          </h4>
                          <p className="byline text-gray-400 mt-2">{timeAgo(item.created_at)}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-gray-500">No related stories yet.</p>
              )}

              <Link
                href="/market"
                className="mt-10 block bg-black text-white p-5 hover:bg-[#d32027] transition-colors"
              >
                <p className="eyebrow text-white/60">Live</p>
                <p className="font-serif font-bold text-xl mt-2">NEPSE Market Snapshot</p>
                <p className="text-xs text-white/70 mt-2">
                  Index, sector breadth, gainers and losers — updated through the trading day.
                </p>
                <span className="inline-block mt-4 text-[11px] font-semibold uppercase tracking-widest">
                  View Markets →
                </span>
              </Link>
            </div>
          </aside>
        </div>
      </article>
    </PageLayout>
  );
}
