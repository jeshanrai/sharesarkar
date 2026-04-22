"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import PageLayout from "@/components/PageLayout";
import Breadcrumb from "@/components/Breadcrumb";
import { Clock, Eye, ArrowLeft, Share2, Bookmark, CalendarDays, User } from "lucide-react";

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
  const now = new Date();
  const date = new Date(dateStr.endsWith("Z") ? dateStr : dateStr + "Z");
  const diffMs = now.getTime() - date.getTime();
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHrs < 1) return "Just now";
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NewsArticlePage() {
  const params = useParams();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/news/${params.id}`);
        if (!res.ok) {
          setError(true);
          return;
        }
        const data = await res.json();
        setArticle(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    if (params.id) load();
  }, [params.id]);

  if (loading) {
    return (
      <PageLayout>
        <div className="max-w-4xl mx-auto px-4 lg:px-8 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-4 bg-gray-200 rounded w-32" />
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-80 bg-gray-200 rounded-xl" />
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded w-5/6" />
              <div className="h-4 bg-gray-200 rounded w-4/5" />
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error || !article) {
    return (
      <PageLayout>
        <div className="max-w-4xl mx-auto px-4 lg:px-8 py-20 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Eye className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Article Not Found</h1>
          <p className="text-gray-500 mb-6">The article you&apos;re looking for doesn&apos;t exist or has been removed.</p>
          <Link href="/news" className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-green text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to News
          </Link>
        </div>
      </PageLayout>
    );
  }

  // Render content – if the article has content, render it, otherwise use excerpt
  const articleContent = article.content || article.excerpt;

  return (
    <PageLayout>
      <article className="max-w-7xl mx-auto px-4 lg:px-8">
        <Breadcrumb items={[{ label: "News", href: "/news" }, { label: article.category, href: `/news?category=${article.category}` }, { label: article.title.slice(0, 50) + '...' }]} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
          {/* Main Article */}
          <div className="lg:col-span-2">
            {/* Category Badge */}
            <div className="mb-4">
              <span className="px-3 py-1 bg-brand-green/10 text-brand-green text-xs font-semibold rounded-full">
                {article.category}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight mb-4">
              {article.title}
            </h1>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-6 pb-6 border-b border-gray-100">
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4" />
                {article.author || "ShareSanskar Team"}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4" />
                {formatDate(article.created_at)}
              </span>
              {article.read_time && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {article.read_time}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                {article.views} views
              </span>
            </div>

            {/* Share Bar */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-xs text-gray-500 font-medium">Share:</span>
              <button className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors" title="Share on Facebook">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
              </button>
              <button className="w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center hover:bg-sky-600 transition-colors" title="Share on Twitter">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              </button>
              <button className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-300 transition-colors" title="Copy link">
                <Share2 className="w-3.5 h-3.5" />
              </button>
              <button className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-300 transition-colors ml-auto" title="Bookmark">
                <Bookmark className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Featured Image */}
            {article.image_url && (
              <div className="relative h-64 md:h-80 lg:h-96 rounded-xl overflow-hidden mb-8 bg-gray-100">
                <Image
                  src={article.image_url}
                  alt={article.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            )}

            {/* Excerpt / Lead */}
            <p className="text-lg text-gray-700 font-medium leading-relaxed mb-6 border-l-4 border-brand-green pl-4">
              {article.excerpt}
            </p>

            {/* Article Body */}
            <div className="prose prose-gray max-w-none mb-10 text-gray-700 leading-relaxed text-[15px] space-y-4">
              {articleContent.split("\n").map((paragraph, i) => (
                paragraph.trim() ? <p key={i}>{paragraph}</p> : null
              ))}
            </div>

            {/* Tags / Categories */}
            <div className="py-6 border-t border-gray-100">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">Tags:</span>
                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">{article.category}</span>
                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">NEPSE</span>
                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">Nepal Stock Market</span>
              </div>
            </div>

            {/* Back link */}
            <Link href="/news" className="inline-flex items-center gap-2 text-brand-green text-sm font-medium hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Back to All News
            </Link>
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-6">
            {/* Related News */}
            {article.related && article.related.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 mb-4 text-sm flex items-center gap-2">
                  <div className="w-1 h-4 bg-brand-green rounded-full" />
                  Related Articles
                </h3>
                <div className="space-y-4">
                  {article.related.map((item) => (
                    <Link href={`/news/${item.id}`} key={item.id} className="group flex gap-3">
                      <div className="relative w-20 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                        {item.image_url && (
                          <Image src={item.image_url} alt={item.title} fill className="object-cover group-hover:scale-105 transition-transform" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-medium text-gray-900 group-hover:text-brand-green transition-colors line-clamp-2 mb-1">
                          {item.title}
                        </h4>
                        <span className="text-[10px] text-gray-400">{timeAgo(item.created_at)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Sidebar */}
            <div className="bg-gray-900 rounded-xl p-5 text-white">
              <h3 className="font-semibold text-sm mb-4">📈 Market Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">NEPSE Index</span>
                  <span className="text-brand-green font-semibold">2,156.78 (+0.86%)</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Total Turnover</span>
                  <span className="font-medium">Rs. 4.52B</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Traded Shares</span>
                  <span className="font-medium">12,45,678</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Transactions</span>
                  <span className="font-medium">45,234</span>
                </div>
              </div>
              <Link href="/market" className="block mt-4 text-center text-xs text-brand-green font-medium hover:underline">
                View Full Market Data →
              </Link>
            </div>

            {/* Newsletter CTA */}
            <div className="bg-gradient-to-br from-brand-green to-green-700 rounded-xl p-5 text-white">
              <h3 className="font-semibold text-sm mb-2">📩 Never Miss an Update</h3>
              <p className="text-white/80 text-xs mb-3">Get daily market insights delivered to your inbox</p>
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full px-3 py-2 rounded-lg bg-white/10 placeholder-white/50 text-white text-sm border border-white/20 focus:outline-none focus:border-white/40 mb-2"
              />
              <button className="w-full py-2 bg-white text-brand-green rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                Subscribe Free
              </button>
            </div>
          </aside>
        </div>
      </article>
    </PageLayout>
  );
}
