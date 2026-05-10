"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft, Plus, Edit3, Trash2, ChevronRight, ChevronDown,
  FolderTree, Save, X, ArrowUp, ArrowDown, FileText, ExternalLink,
  Search, Newspaper,
} from "lucide-react";
import { resolveImageUrl, isBackendMedia } from "@/lib/resolveImageUrl";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface CategoryNode {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  sort_order: number;
  children: CategoryNode[];
}

interface NewsItem {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  image_url: string;
  category: string;
  categories: string[];
  section: string;
  is_published: boolean;
  created_at: string;
  author: string;
}

export default function AdminCategoriesPage() {
  const router = useRouter();
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [addingTo, setAddingTo] = useState<number | null | "root">(null);
  const [newName, setNewName] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);
  const editInputRef = useRef<HTMLInputElement | null>(null);
  const addInputRef = useRef<HTMLInputElement | null>(null);

  // Right panel state
  const [selectedCategory, setSelectedCategory] = useState<CategoryNode | null>(null);
  const [categoryNews, setCategoryNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsSearch, setNewsSearch] = useState("");

  // --- Category CRUD ---
  const loadCategories = useCallback(async () => {
    const token = localStorage.getItem("admin_token");
    if (!token) { router.push("/admin/login"); return; }
    try {
      const res = await fetch(`${API_URL}/api/categories`);
      if (res.ok) {
        const data = await res.json();
        setTree(data.tree || []);
        const ids = new Set<number>();
        function walk(nodes: CategoryNode[]) {
          for (const n of nodes) { if (n.children.length > 0) ids.add(n.id); walk(n.children); }
        }
        walk(data.tree || []);
        setExpanded(ids);
      }
    } catch { /* keep empty */ }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  useEffect(() => { if (editingId !== null) setTimeout(() => editInputRef.current?.focus(), 50); }, [editingId]);
  useEffect(() => { if (addingTo !== null) setTimeout(() => addInputRef.current?.focus(), 50); }, [addingTo]);

  // --- Load news for selected category ---
  const loadCategoryNews = useCallback(async (categoryName: string) => {
    setNewsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/news?category=${encodeURIComponent(categoryName)}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setCategoryNews(data.data || []);
      }
    } catch { /* ignore */ }
    finally { setNewsLoading(false); }
  }, []);

  useEffect(() => {
    if (selectedCategory) loadCategoryNews(selectedCategory.name);
    else setCategoryNews([]);
  }, [selectedCategory, loadCategoryNews]);

  function selectCategory(node: CategoryNode) {
    setSelectedCategory(node);
    setNewsSearch("");
  }

  function toggleExpand(id: number) {
    setExpanded((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  async function handleAdd(parentId: number | null) {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch(`${API_URL}/api/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: trimmed, parent_id: parentId, sort_order: 0 }),
      });
      if (res.ok) {
        await loadCategories();
        if (parentId) setExpanded((prev) => new Set([...prev, parentId]));
      } else { const err = await res.json(); alert(err.error || "Failed to create category"); }
    } catch { alert("Failed to create category"); }
    setNewName(""); setAddingTo(null);
  }

  async function handleRename(id: number) {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch(`${API_URL}/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        await loadCategories();
        if (selectedCategory?.id === id) setSelectedCategory((prev) => prev ? { ...prev, name: trimmed } : null);
      } else { const err = await res.json(); alert(err.error || "Failed to rename"); }
    } catch { alert("Failed to rename"); }
    setEditingId(null); setEditingName("");
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this category?")) return;
    const token = localStorage.getItem("admin_token");
    setDeleting(id);
    try {
      const res = await fetch(`${API_URL}/api/categories/${id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await loadCategories();
        if (selectedCategory?.id === id) setSelectedCategory(null);
      } else { const err = await res.json(); alert(err.error || "Failed to delete"); }
    } catch { alert("Failed to delete"); }
    finally { setDeleting(null); }
  }

  async function handleReorder(id: number, direction: "up" | "down", siblings: CategoryNode[]) {
    const idx = siblings.findIndex((s) => s.id === id);
    if (idx === -1) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === siblings.length - 1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const token = localStorage.getItem("admin_token");
    try {
      await Promise.all([
        fetch(`${API_URL}/api/categories/${siblings[idx].id}`, {
          method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ sort_order: siblings[swapIdx].sort_order }),
        }),
        fetch(`${API_URL}/api/categories/${siblings[swapIdx].id}`, {
          method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ sort_order: siblings[idx].sort_order }),
        }),
      ]);
      await loadCategories();
    } catch { alert("Failed to reorder"); }
  }

  function countTotal(nodes: CategoryNode[]): number {
    let c = 0; for (const n of nodes) { c += 1 + countTotal(n.children); } return c;
  }

  function getDepth(node: CategoryNode): number {
    let d = 0, flatList: CategoryNode[] = [];
    function flatten(nodes: CategoryNode[]) { for (const n of nodes) { flatList.push(n); flatten(n.children); } }
    flatten(tree);
    let current: CategoryNode | undefined = node;
    while (current?.parent_id) { d++; current = flatList.find((n) => n.id === current!.parent_id); }
    return d;
  }

  // Check if a node is an ancestor of the currently selected category
  function isAncestorOfSelected(node: CategoryNode): boolean {
    if (!selectedCategory) return false;
    function hasDescendant(parent: CategoryNode, targetId: number): boolean {
      for (const child of parent.children) {
        if (child.id === targetId) return true;
        if (hasDescendant(child, targetId)) return true;
      }
      return false;
    }
    return hasDescendant(node, selectedCategory.id);
  }

  // --- Filtered news ---
  const filteredNews = newsSearch
    ? categoryNews.filter((n) => n.title.toLowerCase().includes(newsSearch.toLowerCase()))
    : categoryNews;

  function formatDate(d: string) {
    const date = new Date(d.endsWith("Z") ? d : d + "Z");
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  // --- Render tree node ---
  function renderNode(node: CategoryNode, depth: number, siblings: CategoryNode[]) {
    const hasChildren = node.children.length > 0;
    const isExpanded = expanded.has(node.id);
    const isEditing = editingId === node.id;
    const isSelected = selectedCategory?.id === node.id;
    const isAncestor = !isSelected && isAncestorOfSelected(node);

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 py-2 px-3 rounded-lg transition-colors group cursor-pointer ${
            isSelected ? "bg-[#009429]/10 ring-1 ring-[#009429]/30" : isAncestor ? "bg-[#009429]/5" : isEditing ? "bg-blue-50/50" : "hover:bg-gray-50"
          }`}
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
          onClick={() => !isEditing && selectCategory(node)}
        >
          {hasChildren ? (
            <button type="button" onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
              className="p-0.5 text-gray-400 hover:text-gray-600 shrink-0">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : <span className="w-5 shrink-0" />}

          <FolderTree className={`w-4 h-4 shrink-0 ${isSelected ? "text-[#009429]" : isAncestor ? "text-[#009429]/70" : hasChildren ? "text-[#009429]/60" : "text-gray-400"}`} />

          {isEditing ? (
            <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
              <input ref={editInputRef} type="text" value={editingName}
                onChange={(e) => setEditingName(e.target.value.slice(0, 60))}
                onKeyDown={(e) => { if (e.key === "Enter") handleRename(node.id); if (e.key === "Escape") { setEditingId(null); setEditingName(""); } }}
                className="flex-1 px-2 py-1 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#009429]/30 bg-white" />
              <button type="button" onClick={() => handleRename(node.id)} className="p-1 text-[#009429] hover:bg-[#009429]/10 rounded"><Save className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={() => { setEditingId(null); setEditingName(""); }} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <span className={`text-sm font-medium flex-1 truncate ${isSelected ? "text-[#009429]" : isAncestor ? "text-[#009429]/80" : "text-gray-800"}`}>{node.name}</span>
          )}

          {!isEditing && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={() => handleReorder(node.id, "up", siblings)} className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded" title="Move up"><ArrowUp className="w-3 h-3" /></button>
              <button type="button" onClick={() => handleReorder(node.id, "down", siblings)} className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded" title="Move down"><ArrowDown className="w-3 h-3" /></button>
              {getDepth(node) < 2 && (
                <button type="button" onClick={() => { setAddingTo(node.id); setExpanded((prev) => new Set([...prev, node.id])); }}
                  className="p-1 text-gray-400 hover:text-[#009429] hover:bg-green-50 rounded" title="Add sub"><Plus className="w-3.5 h-3.5" /></button>
              )}
              <button type="button" onClick={() => { setEditingId(node.id); setEditingName(node.name); }}
                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Rename"><Edit3 className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={() => handleDelete(node.id)} disabled={deleting === node.id}
                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          )}
        </div>

        {hasChildren && isExpanded && <div>{node.children.map((c) => renderNode(c, depth + 1, node.children))}</div>}

        {addingTo === node.id && (
          <div className="flex items-center gap-2 py-2 px-3" style={{ paddingLeft: `${(depth + 1) * 20 + 12}px` }}>
            <FolderTree className="w-4 h-4 text-gray-300 shrink-0" />
            <input ref={addInputRef} type="text" value={newName} onChange={(e) => setNewName(e.target.value.slice(0, 60))}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(node.id); if (e.key === "Escape") { setAddingTo(null); setNewName(""); } }}
              placeholder="Subcategory name..." className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]" />
            <button type="button" onClick={() => handleAdd(node.id)} className="px-3 py-1.5 bg-[#009429] text-white text-xs font-medium rounded-lg hover:bg-[#007a22]">Add</button>
            <button type="button" onClick={() => { setAddingTo(null); setNewName(""); }} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200">Cancel</button>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#009429]/30 border-t-[#009429] rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Loading categories...</p>
        </div>
      </div>
    );
  }

  const totalCount = countTotal(tree);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
            <p className="text-sm text-gray-500 mt-0.5">{totalCount} categories · Click a category to view its news</p>
          </div>
        </div>
        <button type="button" onClick={() => setAddingTo("root")}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#009429] text-white rounded-xl text-sm font-medium hover:bg-[#007a22] hover:-translate-y-0.5 transition-all shadow-sm hover:shadow-md">
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Category Tree */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-24">
            <div className="border-b border-gray-100 px-4 py-3 bg-gray-50/50">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <FolderTree className="w-3.5 h-3.5" /> Category Tree
              </div>
            </div>
            <div className="p-2 max-h-[70vh] overflow-y-auto">
              {tree.length === 0 && addingTo !== "root" ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <FolderTree className="w-10 h-10 mb-3 text-gray-300" />
                  <p className="font-medium text-gray-600 mb-1">No categories yet</p>
                  <p className="text-sm mb-4">Create your first category</p>
                  <button type="button" onClick={() => setAddingTo("root")}
                    className="flex items-center gap-2 px-4 py-2 bg-[#009429] text-white rounded-lg text-sm font-medium hover:bg-[#007a22]">
                    <Plus className="w-4 h-4" /> Add Category
                  </button>
                </div>
              ) : (
                <>{tree.map((node) => renderNode(node, 0, tree))}</>
              )}

              {addingTo === "root" && (
                <div className="flex items-center gap-2 py-2 px-3">
                  <FolderTree className="w-4 h-4 text-gray-300 shrink-0" />
                  <input ref={addInputRef} type="text" value={newName} onChange={(e) => setNewName(e.target.value.slice(0, 60))}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAdd(null); if (e.key === "Escape") { setAddingTo(null); setNewName(""); } }}
                    placeholder="Root category name..." className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]" />
                  <button type="button" onClick={() => handleAdd(null)} className="px-3 py-1.5 bg-[#009429] text-white text-xs font-medium rounded-lg hover:bg-[#007a22]">Add</button>
                  <button type="button" onClick={() => { setAddingTo(null); setNewName(""); }} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200">Cancel</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: News in selected category */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {!selectedCategory ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Newspaper className="w-14 h-14 mb-4 text-gray-200" />
                <p className="font-medium text-gray-600 mb-1">Select a category</p>
                <p className="text-sm">Click any category on the left to view and manage its news articles</p>
              </div>
            ) : (
              <>
                {/* Category header */}
                <div className="border-b border-gray-100 px-5 py-4 bg-gray-50/50">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <FolderTree className="w-4 h-4 text-[#009429]" />
                        <h2 className="text-lg font-bold text-gray-900">{selectedCategory.name}</h2>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{filteredNews.length} articles</span>
                      </div>
                      <p className="text-xs text-gray-500">/{selectedCategory.slug}</p>
                    </div>
                    <Link href={`/admin/news/new?category=${encodeURIComponent(selectedCategory.name)}`}
                      className="flex items-center gap-2 px-4 py-2 bg-[#009429] text-white rounded-xl text-sm font-medium hover:bg-[#007a22] transition-colors shadow-sm">
                      <Plus className="w-4 h-4" /> New Article
                    </Link>
                  </div>

                  {/* Search within category */}
                  <div className="relative mt-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={newsSearch} onChange={(e) => setNewsSearch(e.target.value)}
                      placeholder={`Search in ${selectedCategory.name}...`}
                      className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]" />
                  </div>
                </div>

                {/* News list */}
                <div className="divide-y divide-gray-100">
                  {newsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-8 h-8 border-4 border-[#009429]/30 border-t-[#009429] rounded-full animate-spin" />
                    </div>
                  ) : filteredNews.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                      <FileText className="w-10 h-10 mb-3 text-gray-200" />
                      <p className="font-medium text-gray-600 mb-1">No articles found</p>
                      <p className="text-sm mb-4">{newsSearch ? "Try a different search term" : `No published articles in "${selectedCategory.name}" yet`}</p>
                      <Link href={`/admin/news/new?category=${encodeURIComponent(selectedCategory.name)}`}
                        className="flex items-center gap-2 px-4 py-2 bg-[#009429] text-white rounded-lg text-sm font-medium hover:bg-[#007a22]">
                        <Plus className="w-4 h-4" /> Create Article
                      </Link>
                    </div>
                  ) : (
                    filteredNews.map((article) => {
                      const imgSrc = resolveImageUrl(article.image_url);
                      return (
                        <div key={article.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group">
                          {/* Thumbnail */}
                          <div className="relative w-20 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                            {imgSrc ? (
                              <Image src={imgSrc} alt="" fill unoptimized={isBackendMedia(imgSrc)} className="object-cover" sizes="80px" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><FileText className="w-5 h-5 text-gray-300" /></div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${article.is_published ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                                {article.is_published ? "Published" : "Draft"}
                              </span>
                              {article.section && article.section !== "latest" && (
                                <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded capitalize">{article.section}</span>
                              )}
                              <span className="text-[10px] font-semibold bg-[#009429]/10 text-[#007a22] ring-1 ring-[#009429]/20 px-1.5 py-0.5 rounded">
                                <span className="uppercase opacity-70 mr-1">Primary</span>
                                {article.category}
                              </span>
                              <span className="text-xs text-gray-400">{formatDate(article.created_at)}</span>
                            </div>
                            <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 group-hover:text-[#009429] transition-colors">{article.title}</h3>
                            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{article.excerpt}</p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link href={`/admin/news/${article.id}`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit">
                              <Edit3 className="w-4 h-4" />
                            </Link>
                            <Link href={`/news/${article.slug || article.id}`} target="_blank" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg" title="View">
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
