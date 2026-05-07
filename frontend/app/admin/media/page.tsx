"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Toast from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";
import {
  listMedia,
  uploadMedia,
  updateMedia,
  deleteMedia,
  formatBytes,
  type MediaItem,
  type MediaPage,
} from "@/lib/media";
import {
  Upload,
  Search,
  X,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";

const PAGE_SIZE = 40;

export default function AdminMediaPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [data, setData] = useState<MediaPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MediaItem | null>(null);
  const [toast, setToast] = useState({ msg: "", trigger: 0, variant: "default" as "default" | "success" });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listMedia({ page, limit: PAGE_SIZE, q: search });
      setData(res);
    } catch (err) {
      setToast({ msg: (err as Error).message, trigger: Date.now(), variant: "default" });
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    let succeeded = 0;
    let dedup = 0;
    const errors: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const result = await uploadMedia(file);
        if (result.deduplicated) dedup += 1;
        else succeeded += 1;
      } catch (err) {
        errors.push(`${file.name}: ${(err as Error).message}`);
      }
    }
    setUploading(false);

    const parts: string[] = [];
    if (succeeded > 0) parts.push(`${succeeded} uploaded`);
    if (dedup > 0) parts.push(`${dedup} already in library`);
    if (errors.length > 0) parts.push(`${errors.length} failed`);
    setToast({
      msg: parts.length > 0 ? parts.join(" · ") : "No changes",
      trigger: Date.now(),
      variant: errors.length === 0 && (succeeded > 0 || dedup > 0) ? "success" : "default",
    });
    if (errors.length > 0) {
      // Surface the first error on a follow-up tick so users see specifics.
      setTimeout(() => {
        setToast({ msg: errors[0], trigger: Date.now(), variant: "default" });
      }, 1200);
    }
    setPage(1);
    void load();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSavePatch(patch: { alt_text?: string; caption?: string }) {
    if (!selected) return;
    try {
      const updated = await updateMedia(selected.id, patch);
      setSelected(updated);
      setData((prev) =>
        prev
          ? { ...prev, data: prev.data.map((m) => (m.id === updated.id ? updated : m)) }
          : prev
      );
      setToast({ msg: "Saved", trigger: Date.now(), variant: "success" });
    } catch (err) {
      setToast({ msg: (err as Error).message, trigger: Date.now(), variant: "default" });
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    try {
      await deleteMedia(target.id);
      setData((prev) =>
        prev
          ? { ...prev, data: prev.data.filter((m) => m.id !== target.id), pagination: { ...prev.pagination, total: prev.pagination.total - 1 } }
          : prev
      );
      if (selected?.id === target.id) setSelected(null);
      setToast({ msg: "Deleted", trigger: Date.now(), variant: "success" });
    } catch (err) {
      setToast({ msg: (err as Error).message, trigger: Date.now(), variant: "default" });
    }
  }

  async function copyUrl(item: MediaItem) {
    try {
      await navigator.clipboard.writeText(absoluteUrl(item.url));
      setCopiedId(item.id);
      setTimeout(() => setCopiedId((c) => (c === item.id ? null : c)), 1400);
    } catch {
      // ignored
    }
  }

  const items = data?.data ?? [];
  const totalPages = data?.pagination.totalPages ?? 1;
  const total = data?.pagination.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Media Library</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Upload once, reuse anywhere. JPEG, PNG, or WebP — 200×200 to 6000×6000 px, up to 5 MB.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <form onSubmit={handleSearch} className="relative" role="search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Filename, alt, caption…"
              aria-label="Search media"
              className="pl-9 pr-9 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setPage(1);
                }}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#009429] text-white text-sm font-medium rounded-lg hover:bg-[#007a22] disabled:opacity-70 transition-colors"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? "Uploading…" : "Upload"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            aria-label="Upload images"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      </div>

      <p className="text-xs text-gray-500">
        {loading
          ? "Loading…"
          : `${total.toLocaleString()} item${total === 1 ? "" : "s"}${search ? ` matching "${search}"` : ""}`}
      </p>

      {loading && items.length === 0 ? (
        <Skeleton />
      ) : items.length === 0 ? (
        <EmptyState onUpload={() => fileInputRef.current?.click()} />
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {items.map((item) => (
            <li key={item.id}>
              <div className="group relative block w-full aspect-square rounded-xl overflow-hidden border border-gray-100 bg-gray-50 hover:border-[#009429] focus-within:border-[#009429] focus-within:ring-2 focus-within:ring-[#009429]/20 transition-colors">
                <button
                  type="button"
                  onClick={() => setSelected(item)}
                  className="absolute inset-0 z-0 block w-full h-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#009429]/20"
                  aria-label={item.alt_text || item.original_name || "Media"}
                >
                  {/* Native lazy loading keeps the grid cheap even at 100s of items. */}
                  <img
                    src={absoluteUrl(item.url)}
                    alt={item.alt_text}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <span className="absolute inset-x-0 bottom-0 px-2 py-1.5 bg-linear-to-t from-black/65 to-transparent text-white text-[10px] truncate">
                    {item.original_name || "—"}
                  </span>
                </button>
                <span className="absolute top-1.5 right-1.5 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => void copyUrl(item)}
                    title="Copy URL"
                    aria-label="Copy URL"
                    className="w-7 h-7 inline-flex items-center justify-center rounded-md bg-white/90 hover:bg-white text-gray-700"
                  >
                    {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-[#009429]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(item)}
                    title="Delete"
                    aria-label="Delete"
                    className="w-7 h-7 inline-flex items-center justify-center rounded-md bg-white/90 hover:bg-white text-gray-700 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      )}

      {selected && (
        <DetailsDrawer
          item={selected}
          onClose={() => setSelected(null)}
          onSave={handleSavePatch}
          onDelete={() => setPendingDelete(selected)}
        />
      )}

      <ConfirmModal
        open={!!pendingDelete}
        variant="danger"
        title="Delete this image?"
        message={
          pendingDelete ? (
            <>
              <span className="font-semibold text-gray-900 line-clamp-2">
                {pendingDelete.original_name || "Untitled image"}
              </span>
              <span className="block mt-1">
                This removes it from the library. Articles already using it will keep showing it
                until the URL is updated.
              </span>
            </>
          ) : null
        }
        confirmLabel="Delete"
        cancelLabel="Keep"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <Toast message={toast.msg} trigger={toast.trigger} variant={toast.variant} />
    </div>
  );
}

// ── Subcomponents ──────────────────────────────────────────────

function Skeleton() {
  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <li key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse" />
      ))}
    </ul>
  );
}

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="text-center py-16 border border-dashed border-gray-200 rounded-2xl bg-gray-50/40">
      <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-4" />
      <h3 className="text-base font-semibold text-gray-700 mb-1">No media yet</h3>
      <p className="text-sm text-gray-500 mb-5 max-w-md mx-auto">
        Upload your first image and it&apos;ll show up here, ready to drop into any article.
      </p>
      <button
        type="button"
        onClick={onUpload}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#009429] text-white rounded-lg text-sm font-medium hover:bg-[#007a22] transition-colors"
      >
        <Upload className="w-4 h-4" /> Upload an image
      </button>
    </div>
  );
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  return (
    <nav className="flex items-center justify-center gap-2" aria-label="Pagination">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-4 h-4" /> Prev
      </button>
      <span className="text-xs text-gray-500 px-2">
        Page <span className="font-semibold text-gray-900">{page}</span> of {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Next <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  );
}

function DetailsDrawer({
  item,
  onClose,
  onSave,
  onDelete,
}: {
  item: MediaItem;
  onClose: () => void;
  onSave: (patch: { alt_text?: string; caption?: string }) => Promise<void>;
  onDelete: () => void;
}) {
  const [altText, setAltText] = useState(item.alt_text);
  const [caption, setCaption] = useState(item.caption);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAltText(item.alt_text);
    setCaption(item.caption);
  }, [item.id, item.alt_text, item.caption]);

  const dirty = altText !== item.alt_text || caption !== item.caption;

  async function handleSave() {
    setSaving(true);
    await onSave({ alt_text: altText, caption });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        aria-label="Close details"
        onClick={onClose}
        className="flex-1 bg-black/40 backdrop-blur-sm cursor-default"
      />
      <aside className="w-full max-w-md bg-white shadow-xl flex flex-col h-full">
        <header className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 truncate">
            {item.original_name || "Image details"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 text-gray-400 hover:text-gray-700 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="relative w-full aspect-video bg-gray-100 rounded-xl overflow-hidden">
            {/* `next/image` with unoptimized=true so we don't run optimizer on
                user-uploaded files (and external URLs we don't control). */}
            <Image
              src={absoluteUrl(item.url)}
              alt={item.alt_text || ""}
              fill
              unoptimized
              sizes="(min-width: 768px) 28rem, 100vw"
              className="object-contain"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <Field label="Type" value={item.mime_type} />
            <Field
              label="Dimensions"
              value={item.width && item.height ? `${item.width} × ${item.height}` : "—"}
            />
            <Field label="Size" value={formatBytes(item.size_bytes)} />
            <Field label="Source" value={item.source} />
          </div>

          <div>
            <label htmlFor="media-alt" className="block text-xs font-semibold text-gray-700 mb-1.5">
              Alt text <span className="text-gray-400 font-normal">(used for accessibility & SEO)</span>
            </label>
            <input
              id="media-alt"
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              maxLength={300}
              placeholder="Describe what's in the image"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
            />
          </div>

          <div>
            <label htmlFor="media-caption" className="block text-xs font-semibold text-gray-700 mb-1.5">
              Caption <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="media-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Photo credit or context"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429] resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">URL</label>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={absoluteUrl(item.url)}
                aria-label="Image URL"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs bg-gray-50 font-mono text-gray-700 truncate"
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(absoluteUrl(item.url));
                }}
                className="px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-gray-50"
              >
                Copy
              </button>
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-1 px-4 py-2 bg-[#009429] text-white text-sm font-medium rounded-lg hover:bg-[#007a22] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Save changes
          </button>
        </footer>
      </aside>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{label}</p>
      <p className="text-gray-800 mt-0.5 wrap-break-word">{value}</p>
    </div>
  );
}

function absoluteUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  // Build an absolute URL based on the API origin so admins can paste the
  // result anywhere (article HTML, external CMS) without ambiguity.
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  return `${apiUrl.replace(/\/$/, "")}${url.startsWith("/") ? url : `/${url}`}`;
}
