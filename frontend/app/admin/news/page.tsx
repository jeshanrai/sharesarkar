"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Edit, Trash2, ArrowUp, ArrowDown, FileText, CheckCircle2, Clock, Eye, Image as ImageIcon, Search, UserPen, Check, X } from "lucide-react";
import { resolveImageUrl } from "@/lib/resolveImageUrl";

type UserRole = "admin" | "author";

interface Permissions {
  can_create_news: boolean;
  can_edit_own_news: boolean;
  can_publish: boolean;
  can_manage_videos: boolean;
}

interface NewsItem {
  id: number;
  slug: string | null;
  title: string;
  excerpt: string;
  image_url: string;
  category: string;
  section: string;
  sort_order: number;
  is_published: boolean;
  read_time: string | null;
  views: number;
  author_name: string | null;
  created_at: string;
  updated_at: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const SECTION_LABELS: Record<string, string> = {
  hero_main: "Hero Main",
  hero_stories: "Hero Stories",
  latest: "Latest News",
  trending: "Trending",
  featured: "Featured Articles",
};

export default function AdminNewsPage() {
  const router = useRouter();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);
  const [role, setRole] = useState<UserRole>("admin");
  const [permissions, setPermissions] = useState<Permissions>({ can_create_news: true, can_edit_own_news: true, can_publish: false, can_manage_videos: false });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  async function loadNews() {
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    const storedRole = localStorage.getItem("admin_role") as UserRole;
    setRole(storedRole || "admin");
    try {
      const perms = localStorage.getItem("admin_permissions");
      if (perms) setPermissions(JSON.parse(perms));
    } catch { /* ignore */ }

    try {
      const res = await fetch(`${API_URL}/api/news/admin/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("admin_token");
        router.push("/admin/login");
        return;
      }
      const data = await res.json();
      // Normalize is_published to a real boolean — guards against any drift
      // (older payloads occasionally returned 0/1 or "t"/"f").
      type RawNewsItem = Omit<NewsItem, "is_published"> & { is_published: unknown };
      setNews(
        (Array.isArray(data) ? data : []).map((n: RawNewsItem): NewsItem => ({
          ...n,
          is_published: n.is_published === true || n.is_published === 1 || n.is_published === "t" || n.is_published === "true",
        }))
      );
    } catch {
      // API might be down
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNews();
  }, []);

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this news item?")) return;

    const token = localStorage.getItem("admin_token");
    if (!token) return;

    setDeleting(id);
    try {
      await fetch(`${API_URL}/api/news/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNews(news.filter((n) => n.id !== id));
    } catch {
      alert("Failed to delete");
    } finally {
      setDeleting(null);
    }
  }

  async function handleTogglePublish(item: NewsItem) {
    // Authors without can_publish cannot toggle
    if (role === "author" && !permissions.can_publish) return;

    const token = localStorage.getItem("admin_token");
    if (!token) return;

    const next = !item.is_published;
    // Optimistic update — flip immediately, revert on failure.
    setNews((prev) => prev.map((n) => (n.id === item.id ? { ...n, is_published: next } : n)));

    try {
      const res = await fetch(`${API_URL}/api/news/${item.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_published: next }),
      });
      if (!res.ok) throw new Error("update failed");
    } catch {
      // Revert on failure
      setNews((prev) => prev.map((n) => (n.id === item.id ? { ...n, is_published: !next } : n)));
      alert("Failed to update publish status");
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(ids: number[]) {
    setSelectedIds((prev) => {
      const allSelected = ids.every((id) => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  }

  async function handleBulkPublish(publish: boolean) {
    const token = localStorage.getItem("admin_token");
    if (!token || selectedIds.size === 0) return;

    setBulkProcessing(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`${API_URL}/api/news/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ is_published: publish }),
          })
        )
      );
      await loadNews();
      setSelectedIds(new Set());
    } catch {
      alert("Bulk action partially failed");
    } finally {
      setBulkProcessing(false);
    }
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selectedIds.size} selected article(s)?`)) return;
    const token = localStorage.getItem("admin_token");
    if (!token || selectedIds.size === 0) return;

    setBulkProcessing(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`${API_URL}/api/news/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
      setNews((prev) => prev.filter((n) => !selectedIds.has(n.id)));
      setSelectedIds(new Set());
    } catch {
      alert("Bulk delete partially failed");
    } finally {
      setBulkProcessing(false);
    }
  }

  async function handleMove(item: NewsItem, direction: "up" | "down") {
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    const sectionItems = news
      .filter((n) => n.section === item.section)
      .sort((a, b) => a.sort_order - b.sort_order);

    const idx = sectionItems.findIndex((n) => n.id === item.id);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === sectionItems.length - 1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const items = [
      { id: sectionItems[idx].id, sort_order: sectionItems[swapIdx].sort_order },
      { id: sectionItems[swapIdx].id, sort_order: sectionItems[idx].sort_order },
    ];

    try {
      await fetch(`${API_URL}/api/news/admin/reorder`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items }),
      });
      await loadNews();
    } catch {
      alert("Failed to reorder");
    }
  }

  // Filter and Search logic
  const filteredAndSearchedNews = news
    .filter((n) => filter === "all" || n.section === filter)
    .filter((n) => n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.category.toLowerCase().includes(searchQuery.toLowerCase()));

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSearchedNews.length / itemsPerPage);
  const currentItems = filteredAndSearchedNews.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#009429]/30 border-t-[#009429] rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Loading content...</p>
        </div>
      </div>
    );
  }

  const canCreate = role === "admin" || permissions.can_create_news;
  const canDelete = role === "admin";
  const canReorder = role === "admin";
  const canPublish = role === "admin" || permissions.can_publish;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">News Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            {role === "author" ? "Manage your articles." : "Manage and organize all news articles."}
          </p>
          {role === "author" && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg w-fit">
              <UserPen className="w-3.5 h-3.5" />
              Author mode — showing your articles only
            </div>
          )}
        </div>
        {canCreate && (
          <Link
            href="/admin/news/new"
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#009429] text-white rounded-xl text-sm font-medium hover:bg-[#007a22] hover:-translate-y-0.5 transition-all w-full sm:w-auto shadow-sm hover:shadow-md"
          >
            <Plus className="w-4 h-4" />
            Create New Article
          </Link>
        )}
      </div>

      {/* Tools / Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Search box Added */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to page 1 on search
              }}
              className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429] min-w-[200px]"
            />
          </div>

          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setCurrentPage(1); // Reset to page 1 on filter
            }}
            className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429] transition-all font-medium text-gray-700 cursor-pointer"
          >
            <option value="all">All Sections</option>
            {Object.entries(SECTION_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="text-sm text-gray-500 font-medium bg-gray-50 px-3 py-1.5 rounded-lg whitespace-nowrap">
          {filteredAndSearchedNews.length} items found
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#009429]/5 border border-[#009429]/20 rounded-2xl p-3 px-4">
          <p className="text-sm font-medium text-[#009429]">
            {selectedIds.size} article{selectedIds.size > 1 ? "s" : ""} selected
          </p>
          <div className="flex flex-wrap gap-2">
            {canPublish && (
              <>
                <button
                  onClick={() => handleBulkPublish(true)}
                  disabled={bulkProcessing}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-100 disabled:opacity-50 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Publish all
                </button>
                <button
                  onClick={() => handleBulkPublish(false)}
                  disabled={bulkProcessing}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-xs font-semibold hover:bg-orange-100 disabled:opacity-50 transition-colors"
                >
                  <Clock className="w-3.5 h-3.5" /> Move to draft
                </button>
              </>
            )}
            {canDelete && (
              <button
                onClick={handleBulkDelete}
                disabled={bulkProcessing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-100 disabled:opacity-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete selected
              </button>
            )}
            <button
              onClick={() => setSelectedIds(new Set())}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          </div>
        </div>
      )}

      {/* Modern Data Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
        <div className="overflow-x-auto flex-1">
          <table className="w-full whitespace-nowrap text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 sticky top-0 z-10 backdrop-blur-sm">
                <th className="px-4 py-4 rounded-tl-2xl w-10">
                  <input
                    type="checkbox"
                    checked={
                      currentItems.length > 0 &&
                      currentItems.every((i) => selectedIds.has(i.id))
                    }
                    onChange={() => toggleSelectAll(currentItems.map((i) => i.id))}
                    className="w-4 h-4 rounded border-gray-300 text-[#009429] focus:ring-[#009429]/30 cursor-pointer"
                  />
                </th>
                <th className="text-left px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider">
                  Article Details
                </th>
                <th className="text-left px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider">
                  Placement
                </th>
                <th className="text-left px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider text-center">
                  Stats
                </th>
                <th className="text-center px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                {canReorder && (
                <th className="text-center px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                )}
                <th className="text-right px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider rounded-tr-2xl">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {currentItems.map((item) => (
                <tr
                  key={item.id}
                  className={`hover:bg-blue-50/30 transition-colors group ${
                    selectedIds.has(item.id) ? "bg-[#009429]/5" : ""
                  }`}
                >
                  <td className="px-4 py-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="w-4 h-4 rounded border-gray-300 text-[#009429] focus:ring-[#009429]/30 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4 w-[40%]">
                    <div className="flex items-start gap-4">
                      {(() => {
                        // Resolve `/uploads/...` against the API origin —
                        // otherwise the browser tries to fetch the image
                        // from the frontend host and 404s.
                        const thumb = resolveImageUrl(item.image_url);
                        return thumb ? (
                          <div className="w-16 h-12 rounded-lg bg-gray-100 shrink-0 overflow-hidden relative shadow-inner">
                            <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                          </div>
                        ) : (
                          <div className="w-16 h-12 rounded-lg bg-gray-50 border border-gray-100 shrink-0 flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-gray-300" />
                          </div>
                        );
                      })()}
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 line-clamp-2 leading-tight mb-1 whitespace-normal break-words" title={item.title}>
                          {item.title}
                        </p>
                        <p className="text-[11px] text-gray-500 font-medium">
                          Created: {new Date(item.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric'})}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5 items-start">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                        {SECTION_LABELS[item.section] || item.section}
                      </span>
                      {item.categories && item.categories.length > 0 ? (
                        <div className="flex flex-col gap-1 mt-1">
                          {item.categories.map((c: string, i: number) => (
                            <span key={i} className={`text-[11px] font-semibold px-2 py-0.5 rounded-md w-fit ${c === item.category ? "bg-[#009429]/10 text-[#007a22] ring-1 ring-[#009429]/20" : "bg-gray-100 text-gray-500"}`}>
                              {c === item.category && <span className="text-[9px] uppercase mr-1 opacity-70">Primary</span>}{c}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-500 font-semibold bg-[#009429]/10 text-[#007a22] ring-1 ring-[#009429]/20 px-2 py-0.5 rounded-md mt-1 w-fit">
                          <span className="text-[9px] uppercase mr-1 opacity-70">Primary</span>{item.category}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-gray-600">
                      <Eye className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold">{item.views.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {canPublish ? (
                      <button
                        onClick={() => handleTogglePublish(item)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all shadow-sm
                          ${item.is_published
                            ? "bg-green-50 text-green-700 hover:bg-green-100 ring-1 ring-inset ring-green-600/20"
                            : "bg-orange-50 text-orange-700 hover:bg-orange-100 ring-1 ring-inset ring-orange-600/20"
                          }`}
                      >
                        {item.is_published ? (
                          <><CheckCircle2 className="w-3.5 h-3.5" /> Live</>
                        ) : (
                          <><Clock className="w-3.5 h-3.5" /> Draft</>
                        )}
                      </button>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold
                        ${item.is_published
                          ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20"
                          : "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20"
                        }`}
                      >
                        {item.is_published ? (
                          <><CheckCircle2 className="w-3.5 h-3.5" /> Live</>
                        ) : (
                          <><Clock className="w-3.5 h-3.5" /> Draft</>
                        )}
                      </span>
                    )}
                  </td>
                  {canReorder && (
                  <td className="px-6 py-4 text-center">
                    {filter !== "all" ? (
                      <div className="inline-flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-lg p-1">
                        <button
                          onClick={() => handleMove(item, "up")}
                          className="p-1 text-gray-400 hover:text-gray-700 hover:bg-white rounded transition-all shadow-sm"
                          title="Move up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[11px] font-bold text-gray-700 w-4 text-center">
                          {item.sort_order}
                        </span>
                        <button
                          onClick={() => handleMove(item, "down")}
                          className="p-1 text-gray-400 hover:text-gray-700 hover:bg-white rounded transition-all shadow-sm"
                          title="Move down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                       <span className="text-[11px] text-gray-400 italic">Filter section to reorder</span>
                    )}
                  </td>
                  )}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/news/${item.slug || item.id}`}
                        target="_blank"
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/admin/news/${item.id}`}
                        className="p-2 text-gray-400 hover:text-[#009429] hover:bg-green-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deleting === item.id}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {currentItems.length === 0 && (
                <tr>
                  <td
                    colSpan={canReorder ? 7 : 6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">No articles found</p>
                        <p className="text-sm mt-1">Try adjusting your summary or search.</p>
                      </div>
                      <Link href="/admin/news/new" className="mt-2 text-[#009429] hover:underline text-sm font-semibold">
                        Clear filters
                      </Link>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Added */}
        {totalPages > 1 && (
          <div className="border-t border-gray-100 p-4 bg-gray-50/50 flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSearchedNews.length)} of {filteredAndSearchedNews.length}
            </span>
            <div className="flex gap-1">
              <button 
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 py-1.5 rounded-lg border text-xs font-semibold transition-colors
                    ${currentPage === page 
                      ? "bg-[#009429] border-[#009429] text-white" 
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                >
                  {page}
                </button>
              ))}
              <button 
                 onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                 disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
