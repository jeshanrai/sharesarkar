"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Video as VideoIcon, Plus, X, Pencil, Trash2, Check,
  AlertCircle, ExternalLink, GripVertical, ToggleLeft, ToggleRight,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type Platform = "tiktok" | "instagram" | "facebook";

interface VideoRow {
  id: number;
  platform: Platform;
  url: string;
  caption: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const PLATFORM_LABEL: Record<Platform, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
};

const PLATFORM_BADGE: Record<Platform, string> = {
  tiktok: "bg-black text-white",
  instagram: "bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] text-white",
  facebook: "bg-[#1877F2] text-white",
};

const EMPTY_FORM: { platform: Platform; url: string; caption: string; sort_order: number; is_active: boolean } = {
  platform: "tiktok",
  url: "",
  caption: "",
  sort_order: 0,
  is_active: true,
};

export default function VideosPage() {
  const router = useRouter();
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      router.push("/admin/login");
      return;
    }
    fetchVideos();
  }, [router]);

  async function fetchVideos() {
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/videos/admin/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setVideos(await res.json());
      } else if (res.status === 403) {
        setError("You don't have permission to manage videos.");
      }
    } catch {
      // Network error
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, sort_order: videos.length });
    setError("");
    setShowModal(true);
  }

  function openEdit(v: VideoRow) {
    setEditingId(v.id);
    setForm({
      platform: v.platform,
      url: v.url,
      caption: v.caption,
      sort_order: v.sort_order,
      is_active: v.is_active,
    });
    setError("");
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    setSaving(true);
    setError("");

    try {
      const url = editingId
        ? `${API_URL}/api/videos/${editingId}`
        : `${API_URL}/api/videos`;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setShowModal(false);
      fetchVideos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/videos/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setVideos((prev) => prev.filter((v) => v.id !== id));
        setDeleteConfirm(null);
      }
    } catch {
      // ignore
    }
  }

  async function toggleActive(v: VideoRow) {
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/videos/${v.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !v.is_active }),
      });
      if (res.ok) fetchVideos();
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#009429]/30 border-t-[#009429] rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Loading videos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <VideoIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#009429] shrink-0" />
            <span className="truncate">Videos</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Embed short-form videos from TikTok, Instagram or Facebook into the public Shorts rail.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#009429] text-white rounded-xl text-sm font-medium hover:bg-[#007a22] transition-all shrink-0 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" /> New Video
        </button>
      </div>

      {error && !showModal && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* List */}
      {videos.length === 0 ? (
        <div className="text-center px-4 py-12 sm:py-20 bg-white rounded-2xl border border-gray-100">
          <VideoIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No videos yet</h3>
          <p className="text-gray-500 text-sm mb-6">Add your first embedded video to populate the Shorts rail.</p>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#009429] text-white rounded-xl text-sm font-medium hover:bg-[#007a22] transition-all"
          >
            <Plus className="w-4 h-4" /> Add Video
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {videos.map((v) => (
            <div
              key={v.id}
              className={`bg-white rounded-2xl border p-4 sm:p-5 transition-all hover:shadow-md ${
                v.is_active ? "border-gray-100" : "border-red-100 bg-red-50/30"
              }`}
            >
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 ${PLATFORM_BADGE[v.platform]}`}>
                    {PLATFORM_LABEL[v.platform]}
                  </span>
                  <span className="text-[11px] text-gray-400 truncate">#{v.sort_order}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(v)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {deleteConfirm === v.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDelete(v.id)}
                        className="p-1.5 text-red-600 bg-red-50 rounded-lg"
                        title="Confirm delete"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(null)}
                        className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(v.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <a
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#009429] hover:underline flex items-center gap-1 mb-2 truncate"
              >
                <ExternalLink className="w-3 h-3 shrink-0" />
                <span className="truncate">{v.url}</span>
              </a>

              {v.caption && (
                <p className="text-sm text-gray-700 mb-3 line-clamp-3">{v.caption}</p>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className={`text-xs font-medium ${v.is_active ? "text-green-600" : "text-red-500"}`}>
                  {v.is_active ? "Visible" : "Hidden"}
                </span>
                <button
                  type="button"
                  onClick={() => toggleActive(v)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title={v.is_active ? "Hide from public" : "Show on public"}
                >
                  {v.is_active ? (
                    <ToggleRight className="w-6 h-6 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-gray-300" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-lg w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between gap-2 sticky top-0 bg-white z-10">
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                  {editingId ? "Edit Video" : "Add New Video"}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Paste the public URL of a TikTok, Instagram or Facebook post.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-5">
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Platform</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(PLATFORM_LABEL) as Platform[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setForm({ ...form, platform: p })}
                      className={`py-2 rounded-xl text-sm font-medium transition-all ${
                        form.platform === p
                          ? `${PLATFORM_BADGE[p]} shadow-sm`
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {PLATFORM_LABEL[p]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="video-url" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Video URL <span className="text-red-500">*</span>
                </label>
                <input
                  id="video-url"
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder={
                    form.platform === "tiktok"
                      ? "https://www.tiktok.com/@user/video/123456..."
                      : form.platform === "instagram"
                      ? "https://www.instagram.com/reel/ABCDEF/"
                      : "https://www.facebook.com/.../videos/..."
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429] transition-all"
                  required
                />
              </div>

              <div>
                <label htmlFor="video-caption" className="block text-xs font-semibold text-gray-700 mb-1.5">Caption</label>
                <textarea
                  id="video-caption"
                  value={form.caption}
                  onChange={(e) => setForm({ ...form, caption: e.target.value })}
                  placeholder="Short description shown beneath the embed"
                  rows={2}
                  maxLength={500}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429] transition-all resize-none"
                />
                <p className="text-[11px] text-gray-400 mt-1 text-right">{form.caption.length} / 500</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="video-sort" className="block text-xs font-semibold text-gray-700 mb-1.5">Sort Order</label>
                  <input
                    id="video-sort"
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429] transition-all"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Lower numbers appear first.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Visibility</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, is_active: true })}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        form.is_active ? "bg-[#009429] text-white" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      Visible
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, is_active: false })}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        !form.is_active ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      Hidden
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#009429] text-white text-sm font-medium hover:bg-[#007a22] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingId ? "Update Video" : "Add Video"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
