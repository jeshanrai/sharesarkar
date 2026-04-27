"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText, TrendingUp, Users, BarChart3, Eye, Clock,
  ArrowUpRight, ArrowDownRight, Plus, Newspaper, CalendarDays,
  ListChecks, Activity, Mail, UserPen
} from "lucide-react";

type UserRole = "admin" | "author";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface NewsItem {
  id: number;
  title: string;
  category: string;
  section: string;
  is_published: number;
  views: number;
  created_at: string;
}

interface IPOItem {
  id: number;
  company_name: string;
  symbol: string;
  status: string;
}

export default function AdminDashboard() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [ipos, setIpos] = useState<IPOItem[]>([]);
  const [subscribers, setSubscribers] = useState<{ id: number; email: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>("admin");

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem("admin_token");
      if (!token) return;
      const storedRole = localStorage.getItem("admin_role") as UserRole;
      setRole(storedRole || "admin");

      try {
        const promises: Promise<Response>[] = [
          fetch(`${API_URL}/api/news/admin/all`, { headers: { Authorization: `Bearer ${token}` } }),
        ];
        // Only fetch IPO/subscribers for admins
        if (storedRole === "admin") {
          promises.push(
            fetch(`${API_URL}/api/ipo/admin/all`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API_URL}/api/subscribers/admin/all`, { headers: { Authorization: `Bearer ${token}` } }),
          );
        }

        const results = await Promise.all(promises);
        if (results[0].ok) setNews(await results[0].json());
        if (storedRole === "admin") {
          if (results[1]?.ok) setIpos(await results[1].json());
          if (results[2]?.ok) setSubscribers(await results[2].json());
        }
      } catch {
        // API may be down
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const stats = {
    totalArticles: news.length,
    published: news.filter((n) => n.is_published).length,
    drafts: news.filter((n) => !n.is_published).length,
    totalViews: news.reduce((sum, n) => sum + (n.views || 0), 0),
    totalIPOs: ipos.length,
    openIPOs: ipos.filter((i) => i.status === "open").length,
    totalSubscribers: subscribers.length,
  };

  // Category breakdown
  const categories = news.reduce((acc, n) => {
    acc[n.category] = (acc[n.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Section breakdown
  const sections = news.reduce((acc, n) => {
    acc[n.section] = (acc[n.section] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const SECTION_LABELS: Record<string, string> = {
    hero_main: "Hero Main",
    hero_stories: "Hero Stories",
    latest: "Latest",
    trending: "Trending",
    featured: "Featured",
  };

  // Recent articles (last 5)
  const recentArticles = [...news]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Top viewed
  const topViewed = [...news]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 5);

  function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr.endsWith("Z") ? dateStr : dateStr + "Z");
    const diffMs = now.getTime() - date.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHrs < 1) return "Just now";
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#009429]/30 border-t-[#009429] rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const isAdmin = role === "admin";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isAdmin ? "Welcome back! Here's an overview of your portal." : "Welcome back! Here's an overview of your articles."}
          </p>
          {!isAdmin && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg w-fit">
              <UserPen className="w-3.5 h-3.5" />
              Author Dashboard
            </div>
          )}
        </div>
        <Link
          href="/admin/news/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-[#009429] text-white rounded-xl text-sm font-medium hover:bg-[#007a22] transition-all"
        >
          <Plus className="w-4 h-4" /> New Article
        </Link>
      </div>

      {/* Stats Grid */}
      <div className={`grid grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-4`}>
        <Link href="/admin/news" className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalArticles}</p>
          <p className="text-xs text-gray-500 mt-1">{isAdmin ? 'Total Articles' : 'My Articles'}</p>
          <div className="flex items-center gap-2 mt-2 text-[10px]">
            <span className="text-green-600 font-medium">{stats.published} published</span>
            <span className="text-gray-300">•</span>
            <span className="text-orange-600 font-medium">{stats.drafts} drafts</span>
          </div>
        </Link>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <Eye className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalViews.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Total Views</p>
          <div className="flex items-center gap-1 mt-2 text-[10px] text-green-600 font-medium">
            <TrendingUp className="w-3 h-3" /> Active readership
          </div>
        </div>

        {isAdmin && (
          <Link href="/admin/ipo" className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <BarChart3 className="w-5 h-5 text-green-600" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-green-500 transition-colors" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalIPOs}</p>
            <p className="text-xs text-gray-500 mt-1">IPO Listings</p>
            <div className="flex items-center gap-1 mt-2 text-[10px] text-green-600 font-medium">
              {stats.openIPOs} currently open
            </div>
          </Link>
        )}

        {isAdmin && (
          <Link href="/admin/subscribers" className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Mail className="w-5 h-5 text-orange-600" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-orange-500 transition-colors" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalSubscribers}</p>
            <p className="text-xs text-gray-500 mt-1">Subscribers</p>
            <div className="flex items-center gap-1 mt-2 text-[10px] text-blue-600 font-medium">
              Newsletter signups
            </div>
          </Link>
        )}
      </div>

      {/* Content Breakdown + Recent Articles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-gray-400" /> By Category
          </h3>
          <div className="space-y-3">
            {Object.entries(categories)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, count]) => (
                <div key={cat}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-700 font-medium">{cat}</span>
                    <span className="text-gray-500">{count}</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#009429] rounded-full transition-all"
                      style={{ width: `${(count / stats.totalArticles) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Section Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-gray-400" /> By Section
          </h3>
          <div className="space-y-3">
            {Object.entries(sections)
              .sort(([, a], [, b]) => b - a)
              .map(([sec, count]) => (
                <div key={sec} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#009429]" />
                    <span className="text-xs text-gray-700 font-medium">{SECTION_LABELS[sec] || sec}</span>
                  </div>
                  <span className="text-xs font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded-full">{count}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-400" /> Quick Actions
          </h3>
          <div className="space-y-2">
            <Link href="/admin/news/new" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
              <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition-colors">
                <Plus className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Create Article</p>
                <p className="text-[10px] text-gray-500">Write a new news article</p>
              </div>
            </Link>
            <Link href="/admin/news" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{isAdmin ? 'Manage All News' : 'My Articles'}</p>
                <p className="text-[10px] text-gray-500">{isAdmin ? 'Edit, reorder, or delete' : 'Edit your articles'}</p>
              </div>
            </Link>
            {isAdmin && (
              <Link href="/admin/authors" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                  <UserPen className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Manage Authors</p>
                  <p className="text-[10px] text-gray-500">Create and manage author accounts</p>
                </div>
              </Link>
            )}
            {isAdmin && (
              <Link href="/admin/ipo" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                  <BarChart3 className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Manage IPOs</p>
                  <p className="text-[10px] text-gray-500">Add or update IPO listings</p>
                </div>
              </Link>
            )}
            <Link href="/" target="_blank" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
              <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                <Eye className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">View Live Site</p>
                <p className="text-[10px] text-gray-500">Open the public portal</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Articles + Top Viewed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-gray-400" /> Recent Articles
            </h3>
            <Link href="/admin/news" className="text-xs text-[#009429] font-medium hover:underline">View all →</Link>
          </div>
          <div className="space-y-3">
            {recentArticles.map((item) => (
              <Link href={`/admin/news/${item.id}`} key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 group">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900 font-medium truncate group-hover:text-[#009429] transition-colors">{item.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{item.category}</span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{timeAgo(item.created_at)}</span>
                  </div>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.is_published ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"}`}>
                  {item.is_published ? "Live" : "Draft"}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Top Viewed */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-400" /> Most Viewed
            </h3>
          </div>
          <div className="space-y-3">
            {topViewed.map((item, i) => (
              <Link href={`/admin/news/${item.id}`} key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0 group">
                <span className="text-lg font-bold text-gray-200 w-6 text-center">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900 font-medium truncate group-hover:text-[#009429] transition-colors">{item.title}</p>
                  <span className="text-[10px] text-gray-400">{item.category}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-bold text-gray-900">{(item.views || 0).toLocaleString()}</span>
                  <p className="text-[9px] text-gray-400">views</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
