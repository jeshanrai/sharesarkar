"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import RichTextEditor from "@/components/admin/RichTextEditor";
import SlugField, { finalizeSlug } from "@/components/admin/SlugField";
import MediaPicker from "@/components/admin/MediaPicker";
import ContentSizeMeter from "@/components/admin/ContentSizeMeter";
import ChipMultiSelect from "@/components/admin/ChipMultiSelect";
import SeoFields, { type SeoValues } from "@/components/admin/SeoFields";
import { ARTICLE_LIMITS, validateArticleSizes } from "@/lib/articleLimits";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const SECTIONS = [
  { value: "hero_main", label: "Hero Main" },
  { value: "hero_stories", label: "Hero Stories" },
  { value: "latest", label: "Latest News" },
  { value: "trending", label: "Trending" },
  { value: "featured", label: "Featured Articles" },
];

const SEED_CATEGORIES = ["Market", "Banking", "Hydropower", "IPO", "Insurance", "Analysis", "Education", "Regulation", "Breaking"];

export default function EditArticlePage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    author: "",
    image_url: "",
    category: "Market",
    categories: ["Market"] as string[],
    tags: [] as string[],
    section: "latest",
    sort_order: 0,
    is_published: true,
    read_time: "",
  });
  const [seo, setSeo] = useState<SeoValues>({
    meta_title: "",
    meta_description: "",
    og_image_url: "",
    canonical_url: "",
    noindex: false,
  });
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>(SEED_CATEGORIES);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadSuggestions() {
      try {
        const [catRes, tagRes] = await Promise.all([
          fetch(`${API_URL}/api/news/categories`).then((r) => (r.ok ? r.json() : [])),
          fetch(`${API_URL}/api/news/tags`).then((r) => (r.ok ? r.json() : [])),
        ]);
        if (cancelled) return;
        const merged = Array.from(
          new Set([...(Array.isArray(catRes) ? catRes : []), ...SEED_CATEGORIES])
        ).sort();
        setCategorySuggestions(merged);
        setTagSuggestions(Array.isArray(tagRes) ? tagRes : []);
      } catch {
        // Silently fall back to seed categories.
      }
    }
    loadSuggestions();
    return () => {
      cancelled = true;
    };
  }, []);

  // Mirror the primary chip into `category` so the backend always sees a
  // consistent primary value even if the editor only edited the chip list.
  useEffect(() => {
    if (form.categories.length === 0) return;
    if (form.category !== form.categories[0]) {
      setForm((f) => ({ ...f, category: f.categories[0] }));
    }
  }, [form.categories, form.category]);

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
        const primary = data.category || "Market";
        const loadedCategories: string[] = Array.isArray(data.categories) && data.categories.length > 0
          ? data.categories
          : [primary];
        // Ensure the primary is the first chip even on legacy rows that
        // only had a `category` value pre-migration.
        const orderedCategories = loadedCategories.some((c) => c.toLowerCase() === primary.toLowerCase())
          ? loadedCategories.slice().sort((a, b) =>
              a.toLowerCase() === primary.toLowerCase() ? -1 :
              b.toLowerCase() === primary.toLowerCase() ? 1 : 0
            )
          : [primary, ...loadedCategories];
        setForm({
          title: data.title || "",
          slug: data.slug || "",
          excerpt: data.excerpt || "",
          content: data.content || "",
          author: data.author || "ShareSanskar Team",
          image_url: data.image_url || "",
          category: primary,
          categories: orderedCategories,
          tags: Array.isArray(data.tags) ? data.tags : [],
          section: data.section || "latest",
          sort_order: data.sort_order || 0,
          // Postgres BOOLEAN comes back as a real true/false, but defend against
          // older payloads that might still send 1/0 or "t"/"f".
          is_published: data.is_published === true || data.is_published === 1 || data.is_published === "t" || data.is_published === "true",
          read_time: data.read_time || "",
        });
        setSeo({
          meta_title: data.meta_title || "",
          meta_description: data.meta_description || "",
          og_image_url: data.og_image_url || "",
          canonical_url: data.canonical_url || "",
          noindex: data.noindex === true,
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

    if (form.categories.length === 0) {
      alert("Pick at least one category.");
      return;
    }

    // Pre-flight size check — same caps as the backend, so we fail early
    // with a friendly message instead of waiting for a 413.
    const sizeError = validateArticleSizes({ ...form, ...seo });
    if (sizeError) {
      alert(sizeError);
      return;
    }

    setSaving(true);
    try {
      const finalSlug = finalizeSlug(form.slug || form.title);
      const res = await fetch(`${API_URL}/api/news/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          ...seo,
          category: form.categories[0] || form.category,
          slug: finalSlug || undefined,
          sort_order: Number(form.sort_order),
          is_published: form.is_published,
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

  const previewSlug = finalizeSlug(form.slug);
  const previewUrl = previewSlug ? `/news/${previewSlug}` : `/news/${params.id}`;

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
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Enter a compelling headline..." maxLength={ARTICLE_LIMITS.title} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]" required />
            <p className="text-[11px] text-gray-400 mt-1.5 text-right">{form.title.length} / {ARTICLE_LIMITS.title}</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <SlugField
              value={form.slug}
              onChange={(next) => setForm((f) => ({ ...f, slug: next }))}
              preview={previewUrl}
            />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Excerpt / Summary *</label>
            <textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} placeholder="Write a brief summary..." rows={3} maxLength={ARTICLE_LIMITS.excerpt} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429] resize-none" required />
            <p className="text-[11px] text-gray-400 mt-1.5 text-right">{form.excerpt.length} / {ARTICLE_LIMITS.excerpt}</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Full Article Content</label>
            <RichTextEditor
              value={form.content}
              onChange={(html) => setForm((f) => ({ ...f, content: html }))}
              placeholder="Write the full article body — use the toolbar to format headings, links, lists, and more."
              minHeight={420}
            />
            <ContentSizeMeter value={form.content} className="mt-3" />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <MediaPicker
              value={form.image_url}
              onChange={(next) => setForm((f) => ({ ...f, image_url: next }))}
            />
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
                <p className="text-[11px] text-gray-400 mt-1.5">
                  {form.is_published
                    ? "Visible on the public site immediately after saving."
                    : "Saved as draft — hidden from readers until published."}
                </p>
              </div>
              <div>
                <label htmlFor="article-section" className="block text-xs font-medium text-gray-600 mb-1.5">Section</label>
                <select id="article-section" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 cursor-pointer">
                  {SECTIONS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
                </select>
              </div>
              <ChipMultiSelect
                label="Categories"
                values={form.categories}
                onChange={(next) => setForm((f) => ({ ...f, categories: next }))}
                suggestions={categorySuggestions}
                max={ARTICLE_LIMITS.max_categories}
                maxLength={ARTICLE_LIMITS.category_name}
                primaryLabel="Primary"
                placeholder="Type to add or pick…"
                helpText="The first chip is the primary category. Press Enter or comma to add."
              />
              <ChipMultiSelect
                label="Tags"
                values={form.tags}
                onChange={(next) => setForm((f) => ({ ...f, tags: next }))}
                suggestions={tagSuggestions}
                max={ARTICLE_LIMITS.max_tags}
                maxLength={ARTICLE_LIMITS.tag_name}
                placeholder="e.g. NABIL, dividend, hydropower"
                helpText="Tags help readers discover related stories. Free-form."
              />
              <div>
                <label htmlFor="article-author" className="block text-xs font-medium text-gray-600 mb-1.5">Author</label>
                <input id="article-author" type="text" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="article-sort-order" className="block text-xs font-medium text-gray-600 mb-1.5">Sort Order</label>
                  <input id="article-sort-order" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20" />
                </div>
                <div>
                  <label htmlFor="article-read-time" className="block text-xs font-medium text-gray-600 mb-1.5">Read Time</label>
                  <input id="article-read-time" type="text" value={form.read_time} onChange={(e) => setForm({ ...form, read_time: e.target.value })} placeholder="5 min read" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 text-sm mb-1">SEO &amp; Social</h3>
            <p className="text-[11px] text-gray-400 mb-4">
              Override what Google and social platforms display. Leave blank to inherit the article&rsquo;s own title, excerpt, and hero.
            </p>
            <SeoFields
              values={seo}
              fallbacks={{ title: form.title, description: form.excerpt }}
              onChange={setSeo}
            />
          </div>

          <div className="space-y-3">
            <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 py-3 bg-[#009429] text-white rounded-xl text-sm font-medium hover:bg-[#007a22] transition-colors disabled:opacity-70">
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : form.is_published ? "Update Article" : "Save Draft"}
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
