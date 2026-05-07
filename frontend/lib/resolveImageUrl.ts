/**
 * Resolve a potentially relative image URL (e.g. `/uploads/<key>`) to an
 * absolute URL pointing at the backend API.
 *
 * The backend stores uploaded media under `/uploads/` and serves them as
 * static files. When the DB column `image_url` contains a relative path the
 * Next.js `<Image>` component must receive a fully-qualified URL — otherwise
 * it either tries to serve the file from the frontend's own `public/` dir
 * (404) or the image-optimisation proxy rejects the unknown origin (400).
 *
 * Returns:
 *   • Absolute HTTP(S) URLs and data-URIs unchanged.
 *   • Relative paths like `/uploads/abc.webp` with the API base prepended.
 *   • `null` for empty / falsy / whitespace-only inputs — callers MUST
 *     branch on null and render a placeholder. Passing `""` to next/image
 *     triggers a console error and a wasted network round-trip.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }
  // Relative path — prefix with the backend origin.
  return `${API_URL.replace(/\/$/, "")}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

/**
 * Whether this URL should bypass next/image's optimizer.
 *
 * The optimizer requires an exact `remotePatterns` allowlist match in
 * `next.config.ts`, and config changes require a dev-server restart to
 * take effect. Backend-hosted media (`/uploads/...` on our own API) never
 * benefit from the optimizer — those files are already at sensible sizes
 * thanks to upload validation, and bypassing the optimizer eliminates an
 * entire class of "url not allowed" rejections during dev.
 *
 * Pass the resolved URL to `<Image unoptimized={isBackendMedia(src)}>`.
 */
export function isBackendMedia(url: string | null): boolean {
  if (!url) return false;
  const apiOrigin = API_URL.replace(/\/$/, "");
  return url.startsWith(apiOrigin + "/uploads/") || url.startsWith("data:");
}
