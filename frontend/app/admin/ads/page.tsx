"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Megaphone, Plus, Trash2, Edit, Eye, EyeOff, Upload, Link as LinkIcon,
  Image as ImageIcon, X, Save, AlertCircle, FolderOpen,
} from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import { MediaLibraryDialog } from "@/components/admin/MediaPicker";
import { resolveImageUrl } from "@/lib/resolveImageUrl";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type Placement = "news_listing" | "news_article" | "all_news";

interface Ad {
  id: number;
  name: string;
  image_url: string;
  link_url: string | null;
  alt_text: string;
  placement: Placement;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const PLACEMENT_LABEL: Record<Placement, string> = {
  news_listing: "News listing",
  news_article: "Article sidebar",
  all_news: "Both news pages",
};

const PLACEMENT_HINT: Record<Placement, string> = {
  news_listing: "Shown below the article grid on /news",
  news_article: "Shown below the related rail on /news/[article]",
  all_news: "Shown below the article grid AND in the article sidebar",
};

interface AdFormState {
  id: number | null;
  name: string;
  image_url: string;
  link_url: string;
  alt_text: string;
  placement: Placement;
  is_active: boolean;
  sort_order: number;
}

const EMPTY_FORM: AdFormState = {
  id: null,
  name: "",
  image_url: "",
  link_url: "",
  alt_text: "",
  placement: "all_news",
  is_active: true,
  sort_order: 0,
};

export default function AdminAdsPage() {
  const router = useRouter();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<AdFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Ad | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
    const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    return token ? { Authorization: `Bearer ${token}`, ...extra } : extra;
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/ads/admin/all`, {
        headers: authHeaders(),
      });
      if (res.status === 401) {
        localStorage.removeItem("admin_token");
        router.push("/admin/login");
        return;
      }
      if (!res.ok) {
        setError("Failed to load advertisements.");
        return;
      }
      setAds(await res.json());
    } catch {
      setError("Network error — couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setForm(EMPTY_FORM);
    setError(null);
    setEditorOpen(true);
  }

  function openEdit(ad: Ad) {
    setForm({
      id: ad.id,
      name: ad.name,
      image_url: ad.image_url,
      link_url: ad.link_url || "",
      alt_text: ad.alt_text,
      placement: ad.placement,
      is_active: ad.is_active,
      sort_order: ad.sort_order,
    });
    setError(null);
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setForm(EMPTY_FORM);
    setError(null);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // allow re-selecting the same file later
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_URL}/api/ads/upload`, {
        method: "POST",
        headers: authHeaders(),
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Upload failed.");
        return;
      }
      setForm((f) => ({ ...f, image_url: json.url }));
    } catch {
      setError("Upload failed — check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!form.image_url.trim()) {
      setError("Upload a creative or paste an image URL.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        image_url: form.image_url.trim(),
        link_url: form.link_url.trim() || null,
        alt_text: form.alt_text.trim(),
        placement: form.placement,
        is_active: form.is_active,
        sort_order: Number.isFinite(form.sort_order) ? form.sort_order : 0,
      };
      const url = form.id ? `${API_URL}/api/ads/${form.id}` : `${API_URL}/api/ads`;
      const method = form.id ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Save failed.");
        return;
      }
      closeEditor();
      load();
    } catch {
      setError("Save failed — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(ad: Ad) {
    try {
      const res = await fetch(`${API_URL}/api/ads/${ad.id}`, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ is_active: !ad.is_active }),
      });
      if (res.ok) load();
    } catch {
      // ignore
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await fetch(`${API_URL}/api/ads/${confirmDelete.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      setConfirmDelete(null);
      load();
    } catch {
      setConfirmDelete(null);
    }
  }

  const activeCount = ads.filter((a) => a.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-[#009429]" /> Advertisements
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage promotional creatives shown on news pages. Static images and animated GIFs are supported.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#009429] text-white rounded-xl btn-text hover:bg-[#007a22] transition-all"
        >
          <Plus className="w-4 h-4" /> New Advertisement
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total" value={ads.length} accent="bg-gray-50 text-gray-700" />
        <StatCard label="Active" value={activeCount} accent="bg-green-50 text-green-700" />
        <StatCard label="Paused" value={ads.length - activeCount} accent="bg-orange-50 text-orange-700" />
        <StatCard
          label="Article placements"
          value={ads.filter((a) => a.is_active && (a.placement === "news_article" || a.placement === "all_news")).length}
          accent="bg-blue-50 text-blue-700"
        />
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500 text-sm">Loading advertisements…</div>
        ) : ads.length === 0 ? (
          <div className="p-12 text-center">
            <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">No advertisements yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Upload a banner or GIF and pick where it should appear.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {ads.map((ad) => {
              const previewUrl = resolveImageUrl(ad.image_url);
              return (
                <li key={ad.id} className="p-4 flex flex-wrap md:flex-nowrap items-center gap-4">
                  <div className="w-32 h-20 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                    {previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewUrl}
                        alt={ad.alt_text || ad.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-gray-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 truncate">{ad.name}</p>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          ad.is_active
                            ? "bg-green-50 text-green-700"
                            : "bg-orange-50 text-orange-700"
                        }`}
                      >
                        {ad.is_active ? "Active" : "Paused"}
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {PLACEMENT_LABEL[ad.placement]}
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        Order {ad.sort_order}
                      </span>
                    </div>
                    {ad.link_url && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 truncate">
                        <LinkIcon className="w-3 h-3 shrink-0" />
                        <span className="truncate">{ad.link_url}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => toggleActive(ad)}
                      title={ad.is_active ? "Pause" : "Activate"}
                      className="p-2 rounded-lg text-gray-400 hover:text-[#009429] hover:bg-green-50 transition-colors"
                    >
                      {ad.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => openEdit(ad)}
                      title="Edit"
                      className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(ad)}
                      title="Delete"
                      className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Editor modal */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <form
            onSubmit={handleSave}
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">
                {form.id ? "Edit advertisement" : "New advertisement"}
              </h2>
              <button
                type="button"
                onClick={closeEditor}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 overflow-y-auto space-y-5">
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Field label="Name" hint="Internal label — readers never see this.">
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Diwali brokerage promo"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
                  maxLength={200}
                />
              </Field>

              <Field
                label="Creative"
                hint="JPG, PNG, WebP, or GIF. GIFs animate inline. Max 10 MB. Use Upload for new files (GIFs supported), or pick a static image from the Media Library."
              >
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFile}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#009429] text-white text-sm font-medium hover:bg-[#007a22] disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    {uploading ? "Uploading…" : "Upload new"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLibraryOpen(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Choose from gallery
                  </button>
                  {form.image_url && (
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, image_url: "" }))}
                      className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-500 hover:text-red-600 hover:border-red-200"
                    >
                      <X className="w-4 h-4" />
                      Clear
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={form.image_url}
                  onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                  placeholder="https://… or /uploads/… (auto-filled after upload)"
                  className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
                />
                {form.image_url && (
                  <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-3 flex items-center justify-center max-h-48 overflow-hidden">
                    {(() => {
                      const src = resolveImageUrl(form.image_url);
                      return src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={src}
                          alt="Preview"
                          className="max-h-44 max-w-full object-contain"
                        />
                      ) : null;
                    })()}
                  </div>
                )}
              </Field>

              <Field label="Click-through URL (optional)">
                <input
                  type="url"
                  value={form.link_url}
                  onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
                  placeholder="https://example.com/landing"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
                />
              </Field>

              <Field label="Alt text" hint="Read by screen readers and shown if the image fails to load.">
                <input
                  type="text"
                  value={form.alt_text}
                  onChange={(e) => setForm((f) => ({ ...f, alt_text: e.target.value }))}
                  placeholder="e.g. Open a brokerage account in 5 minutes"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
                  maxLength={300}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Placement" hint={PLACEMENT_HINT[form.placement]}>
                  <select
                    value={form.placement}
                    onChange={(e) => setForm((f) => ({ ...f, placement: e.target.value as Placement }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
                  >
                    <option value="all_news">{PLACEMENT_LABEL.all_news}</option>
                    <option value="news_listing">{PLACEMENT_LABEL.news_listing}</option>
                    <option value="news_article">{PLACEMENT_LABEL.news_article}</option>
                  </select>
                </Field>

                <Field label="Sort order" hint="Lower numbers render first when more than one ad is active.">
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sort_order: parseInt(e.target.value, 10) || 0 }))
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
                  />
                </Field>
              </div>

              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="w-4 h-4 accent-[#009429]"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">Active</p>
                  <p className="text-xs text-gray-500">Only active ads are shown to readers.</p>
                </div>
              </label>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2 bg-gray-50/50">
              <button
                type="button"
                onClick={closeEditor}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-[#009429] text-white rounded-lg text-sm font-medium hover:bg-[#007a22] disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving…" : form.id ? "Save changes" : "Create advertisement"}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        open={confirmDelete !== null}
        title="Delete advertisement?"
        message={
          confirmDelete
            ? `“${confirmDelete.name}” will stop showing on the site immediately. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {libraryOpen && (
        <MediaLibraryDialog
          onPick={(url) => {
            setForm((f) => ({ ...f, image_url: url }));
            setLibraryOpen(false);
          }}
          onClose={() => setLibraryOpen(false)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      <span className={`mt-2 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${accent}`}>
        {label}
      </span>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-500 mt-1.5">{hint}</p>}
    </div>
  );
}
