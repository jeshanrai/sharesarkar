/**
 * Shared size caps for article fields. These match the values enforced by
 * the backend (`backend/src/routes/news.ts`) and the JSON body limit
 * (`backend/src/index.ts`). Keep both in sync so the UI never lets a user
 * commit work that the server will then reject.
 */
export const ARTICLE_LIMITS = {
  title: 200,
  slug: 120,
  excerpt: 500,
  read_time: 32,
  author: 120,
  // Bytes (UTF-8). HTML article body — accommodates a few inline images.
  content: 2 * 1024 * 1024,
  // Bytes (UTF-8). Featured-image data URL — supports a base64-encoded hero.
  image_url: 8 * 1024 * 1024,
} as const;

export function byteLength(s: string): number {
  // Same calculation as the server (Buffer.byteLength). Falls back to
  // TextEncoder which all modern browsers ship.
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(s).length;
  }
  // Pessimistic fallback: assume worst-case 4 bytes/char.
  return s.length * 4;
}

export function formatMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Validate before submit. Returns null on success, or an error string. */
export function validateArticleSizes(form: {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  read_time?: string;
  author?: string;
  image_url?: string;
}): string | null {
  if (form.title && form.title.length > ARTICLE_LIMITS.title)
    return `Title is too long (${form.title.length} chars). Maximum ${ARTICLE_LIMITS.title}.`;
  if (form.slug && form.slug.length > ARTICLE_LIMITS.slug)
    return `Slug is too long (${form.slug.length} chars). Maximum ${ARTICLE_LIMITS.slug}.`;
  if (form.excerpt && form.excerpt.length > ARTICLE_LIMITS.excerpt)
    return `Excerpt is too long (${form.excerpt.length} chars). Maximum ${ARTICLE_LIMITS.excerpt}.`;
  if (form.read_time && form.read_time.length > ARTICLE_LIMITS.read_time)
    return `Read time is too long. Maximum ${ARTICLE_LIMITS.read_time} chars.`;
  if (form.author && form.author.length > ARTICLE_LIMITS.author)
    return `Author name is too long. Maximum ${ARTICLE_LIMITS.author} chars.`;
  if (form.content) {
    const n = byteLength(form.content);
    if (n > ARTICLE_LIMITS.content) {
      return `Article content is too large (${formatMB(n)}). Maximum ${formatMB(ARTICLE_LIMITS.content)}. Consider hosting large media externally and inserting a URL instead.`;
    }
  }
  if (form.image_url) {
    const n = byteLength(form.image_url);
    if (n > ARTICLE_LIMITS.image_url) {
      return `Featured image is too large (${formatMB(n)}). Maximum ${formatMB(ARTICLE_LIMITS.image_url)}. Try a smaller file or paste a hosted URL.`;
    }
  }
  return null;
}
