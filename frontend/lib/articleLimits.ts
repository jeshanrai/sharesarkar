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
  // SEO overrides.
  meta_title: 200,
  meta_description: 320,
  canonical_url: 500,
  og_image_url: 8 * 1024 * 1024,
  // Recommended (not enforced) caps shown to editors as a soft guideline.
  meta_title_recommended: 60,
  meta_description_recommended: 160,
  // Taxonomy.
  category_name: 60,
  tag_name: 60,
  max_categories: 8,
  max_tags: 16,
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
  meta_title?: string;
  meta_description?: string;
  canonical_url?: string;
  og_image_url?: string;
  categories?: string[];
  tags?: string[];
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
  if (form.meta_title && form.meta_title.length > ARTICLE_LIMITS.meta_title)
    return `Meta title is too long. Maximum ${ARTICLE_LIMITS.meta_title} chars.`;
  if (form.meta_description && form.meta_description.length > ARTICLE_LIMITS.meta_description)
    return `Meta description is too long. Maximum ${ARTICLE_LIMITS.meta_description} chars.`;
  if (form.canonical_url && form.canonical_url.length > ARTICLE_LIMITS.canonical_url)
    return `Canonical URL is too long. Maximum ${ARTICLE_LIMITS.canonical_url} chars.`;
  if (form.og_image_url) {
    const n = byteLength(form.og_image_url);
    if (n > ARTICLE_LIMITS.og_image_url) {
      return `Social share image is too large (${formatMB(n)}). Maximum ${formatMB(ARTICLE_LIMITS.og_image_url)}.`;
    }
  }
  if (form.categories) {
    if (form.categories.length > ARTICLE_LIMITS.max_categories)
      return `Too many categories (${form.categories.length}). Maximum ${ARTICLE_LIMITS.max_categories}.`;
    for (const c of form.categories) {
      if (c.length > ARTICLE_LIMITS.category_name)
        return `Category "${c.slice(0, 30)}…" is too long. Maximum ${ARTICLE_LIMITS.category_name} chars.`;
    }
  }
  if (form.tags) {
    if (form.tags.length > ARTICLE_LIMITS.max_tags)
      return `Too many tags (${form.tags.length}). Maximum ${ARTICLE_LIMITS.max_tags}.`;
    for (const t of form.tags) {
      if (t.length > ARTICLE_LIMITS.tag_name)
        return `Tag "${t.slice(0, 30)}…" is too long. Maximum ${ARTICLE_LIMITS.tag_name} chars.`;
    }
  }
  return null;
}
