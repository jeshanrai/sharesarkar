"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import RichTextEditor from "@/components/admin/RichTextEditor";
import SlugField, { finalizeSlug, softSlug } from "@/components/admin/SlugField";
import ImagePicker from "@/components/admin/ImagePicker";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const SECTIONS = [
  { value: "hero_main", label: "Hero Main" },
  { value: "hero_stories", label: "Hero Stories" },
  { value: "latest", label: "Latest News" },
  { value: "trending", label: "Trending" },
  { value: "featured", label: "Featured Articles" },
];

const CATEGORIES = ["Market", "Banking", "Hydropower", "IPO", "Insurance", "Analysis", "Education", "Regulation", "Breaking"];

export default function NewArticlePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    author: "ShareSanskar Team",
    image_url: "",
    category: "Market",
    section: "latest",
    sort_order: 0,
    is_published: true,
    read_time: "",
  });

  function updateTitle(title: string) {
    setForm((f) => ({
      ...f,
      title,
      // While the user hasn't manually touched the slug, keep mirroring the title.
      // We use softSlug here so the auto-derived value matches the input semantics.
      slug: slugTouched ? f.slug : softSlug(title),
    }));
  }

  function updateSlug(next: string) {
    setSlugTouched(true);
    setForm((f) => ({ ...f, slug: next }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    setSaving(true);
    try {
      const finalSlug = finalizeSlug(form.slug || form.title);
      const res = await fetch(`${API_URL}/api/news`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          slug: finalSlug || undefined,
          sort_order: Number(form.sort_order),
          is_published: form.is_published,
        }),
      });

      if (res.ok) {
        router.push("/admin");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create article");
      }
    } catch {
      alert("Failed to create article");
    } finally {
      setSaving(false);
    }
  }

  const previewSlug = finalizeSlug(form.slug);
  const previewUrl = previewSlug ? `/news/${previewSlug}` : "/news/<slug>";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Article</h1>
          <p className="text-sm text-gray-500 mt-0.5">Write and publish a new news article</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Article Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateTitle(e.target.value)}
              placeholder="Enter a compelling headline..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
              required
            />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <SlugField value={form.slug} onChange={updateSlug} preview={previewUrl} />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Excerpt / Summary *</label>
            <textarea
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              placeholder="Write a brief summary..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429] resize-none"
              required
            />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Full Article Content</label>
            <RichTextEditor
              value={form.content}
              onChange={(html) => setForm((f) => ({ ...f, content: html }))}
              placeholder="Write the full article body — use the toolbar to format headings, links, lists, and more."
              minHeight={420}
            />
            <p className="text-xs text-gray-400 mt-2">Tip: paste plain text to avoid pulling in foreign styles.</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <ImagePicker
              value={form.image_url}
              onChange={(next) => setForm((f) => ({ ...f, image_url: next }))}
            />
          </div>
        </div>

        {/* Sidebar Settings */}
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
                <p className="text-[11px] text-gray-400 mt-1.5">
                  {form.is_published
                    ? "Visible on the public site immediately after saving."
                    : "Saved as draft — hidden from readers until published."}
                </p>
              </div>
              <div>
                <label htmlFor="new-article-section" className="block text-xs font-medium text-gray-600 mb-1.5">Section</label>
                <select id="new-article-section" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 cursor-pointer">
                  {SECTIONS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
                </select>
              </div>
              <div>
                <label htmlFor="new-article-category" className="block text-xs font-medium text-gray-600 mb-1.5">Category</label>
                <select id="new-article-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 cursor-pointer">
                  {CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
              <div>
                <label htmlFor="new-article-author" className="block text-xs font-medium text-gray-600 mb-1.5">Author</label>
                <input id="new-article-author" type="text" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="new-article-sort-order" className="block text-xs font-medium text-gray-600 mb-1.5">Sort Order</label>
                  <input id="new-article-sort-order" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20" />
                </div>
                <div>
                  <label htmlFor="new-article-read-time" className="block text-xs font-medium text-gray-600 mb-1.5">Read Time</label>
                  <input id="new-article-read-time" type="text" value={form.read_time} onChange={(e) => setForm({ ...form, read_time: e.target.value })} placeholder="5 min read" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 py-3 bg-[#009429] text-white rounded-xl text-sm font-medium hover:bg-[#007a22] transition-colors disabled:opacity-70">
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : form.is_published ? "Publish Article" : "Save Draft"}
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
