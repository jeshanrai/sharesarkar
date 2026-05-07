"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Image as ImageIcon,
  ImageOff,
  Upload,
  Link as LinkIcon,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Check,
} from "lucide-react";
import {
  listMedia,
  uploadMedia,
  type MediaPage,
} from "@/lib/media";
import { resolveImageUrl } from "@/lib/resolveImageUrl";

const PAGE_SIZE = 24;

interface MediaPickerProps {
  /** Current value — an absolute URL or a relative `/uploads/...` path. */
  value: string;
  onChange: (next: string) => void;
  /** Optional override for the section heading shown above the picker. */
  label?: string;
}

/**
 * Featured-image picker. Library-first: tapping the trigger opens the
 * `MediaLibraryDialog`, which is also reusable from the rich-text editor's
 * "insert image" button.
 */
export default function MediaPicker({ value, onChange, label = "Featured image" }: MediaPickerProps) {
  const [open, setOpen] = useState(false);
  // Tracks whether the preview <img> failed to load. Reset whenever the
  // value changes so a fresh URL gets a fresh chance.
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
  }, [value]);

  const resolved = resolveImageUrl(value);

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        <ImageIcon className="w-4 h-4 inline mr-1" /> {label}
      </label>

      {value && !broken ? (
        <div className="relative rounded-lg overflow-hidden bg-gray-100 border border-gray-100">
          <div className="relative h-44">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolved ?? ""}
              alt="Featured image preview"
              className="w-full h-full object-cover"
              onError={() => setBroken(true)}
            />
          </div>
          <div className="absolute top-2 right-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="px-3 py-1.5 bg-white/95 hover:bg-white rounded-md text-xs font-medium text-gray-800 shadow-sm transition-colors"
            >
              Change
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label="Remove image"
              className="p-1.5 bg-white/95 hover:bg-white text-gray-700 hover:text-red-600 rounded-md shadow-sm transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : value && broken ? (
        // The reference is set but the image won't load — almost always a
        // dangling /uploads/... key after a database/disk drift. Surface it
        // explicitly so the editor doesn't accidentally re-save the broken URL.
        <div className="rounded-lg border-2 border-dashed border-red-200 bg-red-50/50 p-4">
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 inline-flex items-center justify-center rounded-full bg-red-100 text-red-600 shrink-0">
              <ImageOff className="w-4 h-4" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-800">This image is missing</p>
              <p className="text-xs text-red-700/80 mt-0.5 truncate font-mono">{value}</p>
              <p className="text-xs text-gray-600 mt-1.5">
                The file no longer exists on the server. Replace it with a working image, or remove it from this article.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="px-3 py-1.5 bg-[#009429] text-white rounded-md text-xs font-semibold hover:bg-[#007a22] transition-colors"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:text-red-600 hover:border-red-200 rounded-md text-xs font-medium transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex flex-col items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-gray-200 hover:border-[#009429] hover:bg-[#009429]/5 rounded-xl text-sm text-gray-600 transition-colors"
        >
          <ImageIcon className="w-6 h-6 text-gray-400" />
          <span className="font-medium">Choose from library</span>
          <span className="text-xs text-gray-400">or upload a new image</span>
        </button>
      )}

      {open && (
        <MediaLibraryDialog
          onPick={(url) => {
            onChange(url);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

// ── Library dialog ──────────────────────────────────────────────

/**
 * Reusable media-picker dialog. Owns its own list/upload/URL state.
 * Used both by `MediaPicker` (above) and by the rich-text editor's
 * "insert image" toolbar button.
 */
export function MediaLibraryDialog({
  onPick,
  onClose,
}: {
  onPick: (url: string) => void;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [data, setData] = useState<MediaPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlMode, setUrlMode] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listMedia({ page, limit: PAGE_SIZE, q: search });
      setData(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void load();
  }, [load]);

  // Esc to close + lock background scroll while the picker is open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const result = await uploadMedia(file);
      onPick(result.media.url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function submitUrl() {
    const v = urlValue.trim();
    if (!v) return;
    onPick(v);
  }

  function runSearch() {
    setPage(1);
    setSearch(searchInput.trim());
  }

  function clearSearch() {
    setSearchInput("");
    setSearch("");
    setPage(1);
  }

  const items = data?.data ?? [];
  const totalPages = data?.pagination.totalPages ?? 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose an image"
      className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-5xl max-h-[90vh] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
        <header className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100 flex-wrap">
          <h2 className="text-sm font-semibold text-gray-900">Media Library</h2>
          <div className="flex items-center gap-2">
            <div className="relative" role="search">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    runSearch();
                  }
                }}
                placeholder="Search…"
                aria-label="Search media"
                className="pl-9 pr-9 py-2 border border-gray-200 rounded-lg text-sm w-56 focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#009429] text-white text-xs font-semibold rounded-lg hover:bg-[#007a22] disabled:opacity-70 transition-colors"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              Upload
            </button>
            <button
              type="button"
              onClick={() => setUrlMode((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                urlMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              URL
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-2 text-gray-400 hover:text-gray-700 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Upload image"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>
        </header>

        {urlMode && (
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <input
              type="url"
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitUrl();
                }
              }}
              placeholder="https://example.com/photo.jpg"
              autoFocus
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
            />
            <button
              type="button"
              onClick={submitUrl}
              disabled={!urlValue.trim()}
              className="px-4 py-2 bg-[#009429] text-white text-sm font-medium rounded-lg hover:bg-[#007a22] disabled:opacity-50 transition-colors"
            >
              Use URL
            </button>
          </div>
        )}

        {error && (
          <div className="px-5 py-2 bg-red-50 border-b border-red-100 text-xs text-red-700">{error}</div>
        )}

        <div className="flex-1 overflow-y-auto p-5">
          {loading && items.length === 0 ? (
            <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <li key={i} className="aspect-square bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </ul>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-500">
              {search ? `No results for "${search}".` : "No media yet — upload one to get started."}
            </div>
          ) : (
            <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onPick(item.url)}
                    className="group relative block w-full aspect-square rounded-lg overflow-hidden border border-gray-100 bg-gray-50 hover:border-[#009429] focus-visible:border-[#009429] transition-colors"
                    title={item.original_name || ""}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveImageUrl(item.url) ?? ""}
                      alt={item.alt_text || ""}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute inset-0 ring-2 ring-[#009429] ring-inset opacity-0 group-hover:opacity-100 transition-opacity rounded-lg pointer-events-none" />
                    <span className="absolute top-1.5 right-1.5 w-6 h-6 inline-flex items-center justify-center bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow">
                      <Check className="w-3.5 h-3.5 text-[#009429]" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {totalPages > 1 && (
          <footer className="flex items-center justify-center gap-2 px-5 py-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <span className="text-xs text-gray-500 px-2">
              Page <span className="font-semibold text-gray-900">{page}</span> of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
