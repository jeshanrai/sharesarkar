/**
 * Shared types + tiny client for the admin media library.
 *
 * The library is admin-only, so all endpoints require a Bearer token.
 * Public article pages never call these — they just render whatever URL
 * the article HTML already contains, served as static files.
 */

export interface MediaItem {
  id: string;
  url: string;
  external_url: string | null;
  original_name: string | null;
  mime_type: string;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  checksum: string | null;
  alt_text: string;
  caption: string;
  uploaded_by: number | null;
  uploader_role: string | null;
  source: string;
  created_at: string;
}

export interface MediaPage {
  data: MediaItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function authHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("admin_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function listMedia(params: { page?: number; limit?: number; q?: string } = {}): Promise<MediaPage> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.q) qs.set("q", params.q);
  const url = `${API_URL}/api/media${qs.toString() ? `?${qs.toString()}` : ""}`;
  const res = await fetch(url, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error(`Failed to load media (${res.status})`);
  return res.json();
}

export async function uploadMedia(file: File, opts: { altText?: string; caption?: string } = {}): Promise<{ media: MediaItem; deduplicated: boolean }> {
  const fd = new FormData();
  fd.append("file", file);
  if (opts.altText) fd.append("alt_text", opts.altText);
  if (opts.caption) fd.append("caption", opts.caption);
  const res = await fetch(`${API_URL}/api/media`, {
    method: "POST",
    headers: { ...authHeaders() }, // do NOT set Content-Type — browser handles boundary
    body: fd,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Upload failed (${res.status})`);
  return body;
}

export async function updateMedia(id: string, patch: { alt_text?: string; caption?: string }): Promise<MediaItem> {
  const res = await fetch(`${API_URL}/api/media/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(patch),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Update failed (${res.status})`);
  return body.media;
}

export async function deleteMedia(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/media/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Delete failed (${res.status})`);
  }
}

export function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
