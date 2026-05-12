"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import RichTextEditor from "@/components/admin/RichTextEditor";
import SlugField, { finalizeSlug, softSlug } from "@/components/admin/SlugField";
import MediaPicker from "@/components/admin/MediaPicker";
import ContentSizeMeter from "@/components/admin/ContentSizeMeter";
import ChipMultiSelect from "@/components/admin/ChipMultiSelect";
import CategoryTreePicker from "@/components/admin/CategoryTreePicker";
import SeoFields, { type SeoValues } from "@/components/admin/SeoFields";
import { ARTICLE_LIMITS, validateArticleSizes } from "@/lib/articleLimits";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const SECTIONS = [
  { value: "hero_main", label: "Hero Main" },
  { value: "hero_stories", label: "Hero Stories" },
  { value: "latest", label: "Latest News" },
  { value: "trending", label: "Trending" },
  { value: "featured", label: "Featured Articles" },
  { value: "breaking", label: "Breaking News" },
];

const SEED_CATEGORIES = ["Market", "Banking", "Hydropower", "IPO", "Insurance", "Analysis", "Education", "Regulation", "Breaking"];

interface AuthorOption {
  id: number;
  username: string;
  full_name: string;
  is_active: boolean;
}

const DEFAULT_AUTHOR = "ShareSanskar Team";

export default function NewArticlePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledCategory = searchParams.get("category") || "";
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [role, setRole] = useState<"admin" | "author">("admin");
  const [authorOptions, setAuthorOptions] = useState<string[]>([DEFAULT_AUTHOR]);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    author: DEFAULT_AUTHOR,
    image_url: "",
    category: prefilledCategory || "Market",
    categories: [prefilledCategory || "Market"] as string[],
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

  // Determine role and load author options for admin's dropdown.
  // Authors don't pick — backend forces their own name on insert.
  useEffect(() => {
    const storedRole = (localStorage.getItem("admin_role") as "admin" | "author") || "admin";
    setRole(storedRole);

    if (storedRole === "author") {
      const username = localStorage.getItem("admin_user") || "";
      // Fetch own profile so we can display the full_name in the read-only field.
      const token = localStorage.getItem("admin_token");
      if (token) {
        fetch(`${API_URL}/api/admin/me`, { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            const display = data?.full_name?.trim() || username;
            setForm((f) => ({ ...f, author: display }));
          })
          .catch(() => setForm((f) => ({ ...f, author: username })));
      } else {
        setForm((f) => ({ ...f, author: username }));
      }
      return;
    }

    // Admin: load the admin's own default byline from /admin/me and active
    // authors from /admin/authors. The admin's stored full_name (editable
    // from /admin/settings) replaces the hardcoded "ShareSanskar Team"
    // default option, so the dropdown reflects whatever the admin set.
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    Promise.all([
      fetch(`${API_URL}/api/admin/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`${API_URL}/api/admin/authors`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ]).then(([meData, authorData]) => {
      const adminName = meData?.full_name?.trim() || DEFAULT_AUTHOR;
      const names = Array.isArray(authorData)
        ? authorData
            .filter((a: AuthorOption) => a.is_active)
            .map((a: AuthorOption) => a.full_name?.trim() || a.username)
            .filter(Boolean)
        : [];
      // De-dupe so the admin's byline doesn't appear twice if it happens
      // to match an author's full_name.
      const merged = [adminName, ...names.filter((n) => n !== adminName)];
      setAuthorOptions(merged);
      setForm((f) => ({ ...f, author: adminName }));
    });
  }, []);

  // Pull existing categories & tags so editors get autocomplete from prior
  // articles. Falls back gracefully when the endpoint returns nothing.
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
        // Keep seed categories; tag list stays empty.
      }
    }
    loadSuggestions();
    return () => {
      cancelled = true;
    };
  }, []);

  // Removed lockstep effect so user can manually select Primary Category

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
      const res = await fetch(`${API_URL}/api/news`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          ...seo,
          // Send the primary explicitly — `category` mirrors categories[0]
          // but the backend treats the explicit field as authoritative.
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
              maxLength={ARTICLE_LIMITS.title}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
              required
            />
            <p className="text-[11px] text-gray-400 mt-1.5 text-right">
              {form.title.length} / {ARTICLE_LIMITS.title}
            </p>
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
              maxLength={ARTICLE_LIMITS.excerpt}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429] resize-none"
              required
            />
            <p className="text-[11px] text-gray-400 mt-1.5 text-right">
              {form.excerpt.length} / {ARTICLE_LIMITS.excerpt}
            </p>
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
            <p className="text-xs text-gray-400 mt-2">Tip: for very large media, host externally and insert a URL — keeps articles fast.</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <MediaPicker
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
              <CategoryTreePicker
                values={form.categories}
                onChange={(next) => setForm((f) => ({ ...f, categories: next }))}
                max={ARTICLE_LIMITS.max_categories}
                maxLength={ARTICLE_LIMITS.category_name}
                helpText="Select categories from the tree."
              />
              {form.categories.length > 0 && (
                <div className="mt-4">
                  <label htmlFor="primary-category" className="block text-xs font-medium text-gray-600 mb-1.5">Primary Category</label>
                  <select
                    id="primary-category"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 cursor-pointer"
                  >
                    {form.categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    This category is used for the breadcrumb, URL slug routing, and primary badge.
                  </p>
                </div>
              )}
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
                <label htmlFor="new-article-author" className="block text-xs font-medium text-gray-600 mb-1.5">Author</label>
                {role === "admin" ? (
                  <select
                    id="new-article-author"
                    value={form.author}
                    onChange={(e) => setForm({ ...form, author: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 cursor-pointer bg-white"
                  >
                    {authorOptions.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                ) : (
                  <>
                    <input
                      id="new-article-author"
                      type="text"
                      value={form.author}
                      readOnly
                      disabled
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                    <p className="text-[11px] text-gray-400 mt-1.5">Articles you create are attributed to your account.</p>
                  </>
                )}
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
