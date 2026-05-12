"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import PageLayout from "@/components/PageLayout";
import Breadcrumb from "@/components/Breadcrumb";
import AdvertisementSlot from "@/components/AdvertisementSlot";
import { resolveImageUrl, isBackendMedia } from "@/lib/resolveImageUrl";
import { Search, Filter, Clock, ArrowRight, TrendingUp, X, Zap, Flame, Star, Newspaper, Menu, ChevronDown, ChevronUp } from "lucide-react";

const SECTION_TABS = [
  { value: "all", label: "All", icon: Newspaper },
  { value: "breaking", label: "Breaking", icon: Zap },
  { value: "latest", label: "Latest News", icon: Clock },
  { value: "trending", label: "Trending", icon: Flame },
  { value: "featured", label: "Featured", icon: Star },
];

interface NewsItem {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  image_url: string;
  category: string;
  section: string;
  author: string;
  read_time: string | null;
  views: number;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr.endsWith("Z") ? dateStr : dateStr + "Z");
  const diffMs = now.getTime() - date.getTime();
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHrs < 1) return "Just now";
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function NewsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Seed state from URL so deep-links like /news?search=ipo&category=Banking
  // (e.g. coming from the navbar search) load with the right filters applied.
  const initialSearch = searchParams.get("search") || "";
  const initialCategory = searchParams.get("category") || "All";
  const initialTag = searchParams.get("tag") || "";
  const initialSection = searchParams.get("section") || "all";

  const [news, setNews] = useState<NewsItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 12, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [activeTag, setActiveTag] = useState(initialTag);
  const [activeSection, setActiveSection] = useState(initialSection);

  // Keep state in sync when the URL query string changes (e.g. user navigates
  // back/forward, or another nav button rewrites the query).
  useEffect(() => {
    setSearchQuery(searchParams.get("search") || "");
    setSearchInput(searchParams.get("search") || "");
    setActiveCategory(searchParams.get("category") || "All");
    setActiveTag(searchParams.get("tag") || "");
    setActiveSection(searchParams.get("section") || "all");
  }, [searchParams]);

  // Reflect filter changes back into the URL so the page is shareable.
  function syncUrl(next: { search?: string; category?: string; section?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const search = next.search ?? searchQuery;
    const category = next.category ?? activeCategory;
    const section = next.section ?? activeSection;
    if (search) params.set("search", search);
    else params.delete("search");
    if (category && category !== "All") params.set("category", category);
    else params.delete("category");
    if (section && section !== "all") params.set("section", section);
    else params.delete("section");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const fetchNews = useCallback(async (page: number, category: string, search: string, tag: string, section: string) => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/news?page=${page}&limit=12`;
      if (category && category !== "All") url += `&category=${encodeURIComponent(category)}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (tag) url += `&tag=${encodeURIComponent(tag)}`;
      if (section && section !== "all") url += `&section=${encodeURIComponent(section)}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setNews(data.data || []);
        setPagination(data.pagination || { page: 1, limit: 12, total: 0, totalPages: 0 });
      }
    } catch {
      // Keep empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews(pagination.page, activeCategory, searchQuery, activeTag, activeSection);
  }, [pagination.page, activeCategory, searchQuery, activeTag, activeSection, fetchNews]);

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch(`${API_URL}/api/news/categories`);
        if (res.ok) {
          const cats = await res.json();
          setCategories(["All", ...cats]);
        }
      } catch {
        setCategories(["All"]);
      }
    }
    loadCategories();
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = searchInput.trim();
    setSearchQuery(trimmed);
    setPagination((p) => ({ ...p, page: 1 }));
    syncUrl({ search: trimmed });
  }

  function clearSearch() {
    setSearchInput("");
    setSearchQuery("");
    setPagination((p) => ({ ...p, page: 1 }));
    syncUrl({ search: "" });
  }

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <Breadcrumb items={[{ label: "News" }]} />

        {/* Header */}
        <div className="mb-8">
          <h1 className="headline-lg text-gray-900 mb-2">Latest News</h1>
          <p className="text-gray-500 meta">Stay updated with Nepal stock market news, analysis, and insights</p>
        </div>

        {/* DESKTOP: Section Tabs & Categories (Auto-fill one line) */}
        <div className="hidden md:flex flex-wrap items-center content-start gap-x-2 gap-y-8 mb-8 border-b border-gray-200 pb-1 h-[50px] overflow-hidden">
          {/* Sections */}
          {SECTION_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.value && activeCategory === "All";
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setActiveSection(tab.value);
                  setActiveCategory("All");
                  setPagination((p) => ({ ...p, page: 1 }));
                  syncUrl({ section: tab.value, category: "" });
                }}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                  isActive
                    ? "border-brand-green text-brand-green"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-brand-green" : "text-gray-400"}`} />
                {tab.value === "breaking" && (
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-red-500" : "bg-red-400"} animate-pulse`} />
                )}
                {tab.label}
              </button>
            );
          })}

          <div className="w-px h-6 bg-gray-200 mx-1 shrink-0" />

          {/* Categories (Fills the line, extra wrap to hidden area) */}
          {categories.filter(c => c !== "All" && c !== "Breaking").map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setActiveCategory(cat);
                  setActiveSection("all");
                  setPagination((p) => ({ ...p, page: 1 }));
                  syncUrl({ category: cat, section: "all" });
                }}
                className={`flex items-center px-4 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                  isActive
                    ? "border-brand-green text-brand-green"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* MOBILE: Hamburger Menu */}
        <div className="md:hidden mb-6 relative z-20">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm text-sm font-medium text-gray-700"
          >
             <span className="flex items-center gap-2">
               <Menu className="w-4 h-4" /> 
               {activeCategory !== "All" ? activeCategory : (SECTION_TABS.find(t => t.value === activeSection)?.label || "News Menu")}
             </span>
             {isMobileMenuOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {isMobileMenuOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-2 space-y-1 max-h-[60vh] overflow-y-auto">
                 <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Sections</div>
                 {SECTION_TABS.map((tab) => {
                   const Icon = tab.icon;
                   const isActive = activeSection === tab.value && activeCategory === "All";
                   return (
                     <button
                       key={tab.value}
                       type="button"
                       onClick={() => {
                         setActiveSection(tab.value);
                         setActiveCategory("All");
                         setPagination((p) => ({ ...p, page: 1 }));
                         syncUrl({ section: tab.value, category: "" });
                         setIsMobileMenuOpen(false);
                       }}
                       className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm ${
                         isActive ? "bg-brand-green/10 text-brand-green font-medium" : "text-gray-700 hover:bg-gray-50"
                       }`}
                     >
                       <Icon className={`w-4 h-4 ${isActive ? "text-brand-green" : "text-gray-400"}`} />
                       {tab.label}
                     </button>
                   );
                 })}
                 
                 <div className="h-px bg-gray-100 my-2 mx-2" />
                 <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Categories</div>
                 {categories.filter(c => c !== "All" && c !== "Breaking").map((cat) => {
                   const isActive = activeCategory === cat;
                   return (
                     <button
                       key={cat}
                       type="button"
                       onClick={() => {
                         setActiveCategory(cat);
                         setActiveSection("all");
                         setPagination((p) => ({ ...p, page: 1 }));
                         syncUrl({ category: cat, section: "all" });
                         setIsMobileMenuOpen(false);
                       }}
                       className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm ${
                         isActive ? "bg-brand-green/10 text-brand-green font-medium" : "text-gray-700 hover:bg-gray-50"
                       }`}
                     >
                       {cat}
                     </button>
                   );
                 })}
              </div>
            </div>
          )}
        </div>

        {/* Results info */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <p className="meta text-gray-500">
            {pagination.total} article{pagination.total !== 1 ? "s" : ""} found
            {searchQuery && <span> for &ldquo;{searchQuery}&rdquo;</span>}
            {activeTag && <span> tagged &ldquo;{activeTag}&rdquo;</span>}
          </p>
          {activeTag && (
            <button
              type="button"
              onClick={() => {
                setActiveTag("");
                setPagination((p) => ({ ...p, page: 1 }));
                const params = new URLSearchParams(searchParams.toString());
                params.delete("tag");
                const qs = params.toString();
                router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
              }}
              className="meta inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-[#d32027]/10 hover:text-[#d32027] transition-colors"
            >
              #{activeTag}
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="h-48 bg-gray-200" />
                <div className="p-5 space-y-3">
                  <div className="h-3 bg-gray-200 rounded w-20" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-20">
            <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No articles found</h3>
            <p className="text-gray-500 text-sm">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <>
            {/* Featured first article */}
            {pagination.page === 1 && news.length > 0 && (
              <Link href={`/news/${news[0].slug || news[0].id}`} className="block mb-8 group">
                <article className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                    <div className="relative h-64 lg:h-80 bg-gray-100">
                      {(() => {
                        const src = resolveImageUrl(news[0].image_url);
                        return src ? (
                          <Image
                            src={src}
                            alt={news[0].title}
                            fill
                            unoptimized={isBackendMedia(src)}
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : null;
                      })()}
                      <div className="absolute top-4 left-4">
                        <span className="px-3 py-1 bg-brand-red text-white eyebrow rounded-full">
                          {news[0].category}
                        </span>
                      </div>
                    </div>
                    <div className="p-6 lg:p-8 flex flex-col justify-center">
                      <div className="flex items-center gap-3 eyebrow text-gray-500 mb-3">
                        <span>{news[0].author || "ShareSanskar Team"}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timeAgo(news[0].created_at)}
                        </span>
                        {news[0].read_time && (
                          <>
                            <span>•</span>
                            <span>{news[0].read_time}</span>
                          </>
                        )}
                      </div>
                      <h2 className="headline-lg text-gray-900 mb-3 transition-colors leading-tight">
                        {news[0].title}
                      </h2>
                      <p className="text-gray-600 meta line-clamp-3 mb-4">{news[0].excerpt}</p>
                      <div className="flex items-center text-brand-green meta gap-1">
                        Read Full Article
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </article>
              </Link>
            )}

            {/* News Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {(pagination.page === 1 ? news.slice(1) : news).map((item) => (
                <Link href={`/news/${item.slug || item.id}`} key={item.id} className="group">
                  <article className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all h-full flex flex-col">
                    <div className="relative h-48 bg-gray-100 overflow-hidden">
                      {(() => {
                        const src = resolveImageUrl(item.image_url);
                        return src ? (
                          <Image
                            src={src}
                            alt={item.title}
                            fill
                            unoptimized={isBackendMedia(src)}
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : null;
                      })()}
                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-0.5 bg-gray-900/80 backdrop-blur-sm text-white eyebrow rounded-full">
                          {item.category}
                        </span>
                      </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex items-center gap-2 text-[10px] text-gray-400 mb-2">
                        <Clock className="w-3 h-3" />
                        <span>{timeAgo(item.created_at)}</span>
                        {item.read_time && (
                          <>
                            <span>•</span>
                            <span>{item.read_time}</span>
                          </>
                        )}
                      </div>
                      <h3 className="headline-sm text-gray-900 transition-colors line-clamp-2 meta mb-2 flex-1">
                        {item.title}
                      </h3>
                      <p className="text-gray-500 line-clamp-2 mb-3">{item.excerpt}</p>
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
                        <span className="meta text-gray-400">{item.author || "ShareSanskar"}</span>
                        <span className="meta text-gray-400">{item.views || 0} views</span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 py-8">
                <button
                  onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(5, pagination.totalPages) }).map((_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPagination((p) => ({ ...p, page: pageNum }))}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                        pagination.page === pageNum
                          ? "bg-brand-green text-white"
                          : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPagination((p) => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        <AdvertisementSlot placement="news_listing" />
      </div>
    </PageLayout>
  );
}

// Next requires `useSearchParams()` consumers to live inside a Suspense
// boundary so the build can pre-render the rest of the tree while deferring
// the search-params-dependent part to client render.
export default function NewsPage() {
  return (
    <Suspense fallback={<NewsPageFallback />}>
      <NewsPageInner />
    </Suspense>
  );
}

function NewsPageFallback() {
  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse mb-3" />
        <div className="h-4 w-72 bg-gray-100 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="h-48 bg-gray-100 animate-pulse" />
              <div className="p-5 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
