"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Image as ImageIcon, Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const SECTIONS = [
  { value: "hero_main", label: "Hero Main" },
  { value: "hero_stories", label: "Hero Stories" },
  { value: "latest", label: "Latest News" },
  { value: "trending", label: "Trending" },
  { value: "featured", label: "Featured Articles" },
];

const CATEGORIES = ["Market", "Banking", "Hydropower", "IPO", "Insurance", "Analysis", "Education", "Regulation", "Breaking"];

export default function EditArticlePage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    excerpt: "",
    content: "",
    author: "",
    image_url: "",
    category: "Market",
    section: "latest",
    sort_order: 0,
    is_published: true,
    read_time: "",
  });

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/news/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          alert("Article not found");
          router.push("/admin");
          return;
        }
        const data = await res.json();
        setForm({
          title: data.title || "",
          excerpt: data.excerpt || "",
          content: data.content || "",
          author: data.author || "ShareSanskar Team",
          image_url: data.image_url || "",
          category: data.category || "Market",
          section: data.section || "latest",
          sort_order: data.sort_order || 0,
          is_published: !!data.is_published,
          read_time: data.read_time || "",
        });
      } catch {
        alert("Failed to load article");
      } finally {
        setLoading(false);
      }
    }
    if (params.id) load();
  }, [params.id, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/news/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          sort_order: Number(form.sort_order),
          is_published: form.is_published ? 1 : 0,
        }),
      });

      if (res.ok) {
        router.push("/admin");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update article");
      }
    } catch {
      alert("Failed to update article");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[#009429] animate-spin" />
          <p className="text-gray-500 font-medium">Loading article...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Article</h1>
          <p className="text-sm text-gray-500 mt-0.5">Update article #{params.id}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Article Title *</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Enter a compelling headline..." className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]" required />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Excerpt / Summary *</label>
            <textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} placeholder="Write a brief summary..." rows={3} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429] resize-none" required />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Full Article Content</label>
            <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Write the full article body..." rows={15} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429] resize-y font-mono" />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2"><ImageIcon className="w-4 h-4 inline mr-1" /> Featured Image URL</label>
            <input type="url" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://images.unsplash.com/..." className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]" />
            {form.image_url && (
              <div className="mt-3 relative h-40 rounded-lg overflow-hidden bg-gray-100">
                <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 text-sm mb-4">Publish Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setForm({ ...form, is_published: true })} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${form.is_published ? "bg-[#009429] text-white" : "bg-gray-100 text-gray-600"}`}>Published</button>
                  <button type="button" onClick={() => setForm({ ...form, is_published: false })} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${!form.is_published ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600"}`}>Draft</button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Section</label>
                <select value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 cursor-pointer">
                  {SECTIONS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 cursor-pointer">
                  {CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Author</label>
                <input type="text" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Sort Order</label>
                  <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Read Time</label>
                  <input type="text" value={form.read_time} onChange={(e) => setForm({ ...form, read_time: e.target.value })} placeholder="5 min read" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 py-3 bg-[#009429] text-white rounded-xl text-sm font-medium hover:bg-[#007a22] transition-colors disabled:opacity-70">
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Update Article"}
            </button>
            <Link href="/admin" className="w-full flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
              Cancel
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
