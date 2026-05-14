import { Router } from "express";
import pool from "../db.js";
import { requireAuth, requireAuthor, requireAnyAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();

// --- Helper: generate slug ---
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120);
}

// --- Size limits for article fields ----------------------------
// Caps are enforced server-side so a single article can never blow out the
// db row, the JSON parser, or downstream pages. The content cap accommodates
// inline base64 media uploaded via the rich-text editor; for very large media
// authors should host externally and link instead.
const LIMITS = {
  title: 200,
  slug: 120,
  excerpt: 500,
  read_time: 32,
  author: 120,
  // ~2 MB of HTML — enough room for a few inline images at reasonable size.
  content: 2 * 1024 * 1024,
  // ~8 MB to allow a base64 hero image.
  image_url: 8 * 1024 * 1024,
  // SEO overrides — short text fields capped to fit Google's typical display.
  meta_title: 200,
  meta_description: 320,
  canonical_url: 500,
  og_image_url: 8 * 1024 * 1024,
  // Taxonomy — one category/tag is short, but many would bloat the row.
  category_name: 60,
  tag_name: 60,
  max_categories: 8,
  max_tags: 16,
};

function byteLength(s: string): number {
  return Buffer.byteLength(s, "utf8");
}

function lenError(field: string, max: number, actual: number, unit: "chars" | "bytes" = "chars"): string {
  if (unit === "bytes") {
    const mb = (max / (1024 * 1024)).toFixed(1);
    const actualMB = (actual / (1024 * 1024)).toFixed(2);
    return `${field} is too large (${actualMB} MB) — maximum is ${mb} MB.`;
  }
  return `${field} is too long (${actual} chars) — maximum is ${max}.`;
}

/**
 * Validate field sizes. Returns null on success, or an error message string.
 * Uses byte length for free-form HTML and image fields (they may contain
 * base64 data) and character length for short metadata fields.
 */
function validateArticleSizes(body: {
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
  categories?: unknown;
  tags?: unknown;
}): string | null {
  if (typeof body.title === "string" && body.title.length > LIMITS.title)
    return lenError("Title", LIMITS.title, body.title.length);
  if (typeof body.slug === "string" && body.slug.length > LIMITS.slug)
    return lenError("Slug", LIMITS.slug, body.slug.length);
  if (typeof body.excerpt === "string" && body.excerpt.length > LIMITS.excerpt)
    return lenError("Excerpt", LIMITS.excerpt, body.excerpt.length);
  if (typeof body.read_time === "string" && body.read_time.length > LIMITS.read_time)
    return lenError("Read time", LIMITS.read_time, body.read_time.length);
  if (typeof body.author === "string" && body.author.length > LIMITS.author)
    return lenError("Author", LIMITS.author, body.author.length);
  if (typeof body.content === "string") {
    const n = byteLength(body.content);
    if (n > LIMITS.content) return lenError("Article content", LIMITS.content, n, "bytes");
  }
  if (typeof body.image_url === "string") {
    const n = byteLength(body.image_url);
    if (n > LIMITS.image_url) return lenError("Featured image", LIMITS.image_url, n, "bytes");
  }
  if (typeof body.meta_title === "string" && body.meta_title.length > LIMITS.meta_title)
    return lenError("Meta title", LIMITS.meta_title, body.meta_title.length);
  if (typeof body.meta_description === "string" && body.meta_description.length > LIMITS.meta_description)
    return lenError("Meta description", LIMITS.meta_description, body.meta_description.length);
  if (typeof body.canonical_url === "string" && body.canonical_url.length > LIMITS.canonical_url)
    return lenError("Canonical URL", LIMITS.canonical_url, body.canonical_url.length);
  if (typeof body.og_image_url === "string") {
    const n = byteLength(body.og_image_url);
    if (n > LIMITS.og_image_url) return lenError("Social share image", LIMITS.og_image_url, n, "bytes");
  }
  if (Array.isArray(body.categories)) {
    if (body.categories.length > LIMITS.max_categories)
      return `Too many categories (${body.categories.length}). Maximum ${LIMITS.max_categories}.`;
    for (const c of body.categories) {
      if (typeof c !== "string" || c.length > LIMITS.category_name)
        return `Category name is too long. Maximum ${LIMITS.category_name} chars.`;
    }
  }
  if (Array.isArray(body.tags)) {
    if (body.tags.length > LIMITS.max_tags)
      return `Too many tags (${body.tags.length}). Maximum ${LIMITS.max_tags}.`;
    for (const t of body.tags) {
      if (typeof t !== "string" || t.length > LIMITS.tag_name)
        return `Tag name is too long. Maximum ${LIMITS.tag_name} chars.`;
    }
  }
  return null;
}

/**
 * Normalize a list of free-form taxonomy strings (categories, tags). Trims
 * whitespace, drops empties, dedupes case-insensitively while preserving the
 * editor's chosen casing for the first occurrence.
 */
function normalizeTaxonomy(input: unknown, max: number): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim().replace(/\s+/g, " ");
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= max) break;
  }
  return out;
}

// --- Admin routes (defined before /:id to avoid conflicts) ---

// Admin: get ALL news (admin sees everything, author sees own)
router.get("/admin/all", requireAnyAuth, async (req: AuthRequest, res) => {
  if (req.userRole === "admin") {
    const { rows } = await pool.query(
      `SELECT n.*, a.full_name as author_name FROM news n
       LEFT JOIN authors a ON n.author_id = a.id
       ORDER BY n.section, n.sort_order ASC, n.created_at DESC`
    );
    res.json(rows);
  } else {
    // Author: only their own articles
    const { rows } = await pool.query(
      `SELECT n.*, a.full_name as author_name FROM news n
       LEFT JOIN authors a ON n.author_id = a.id
       WHERE n.author_id = $1
       ORDER BY n.section, n.sort_order ASC, n.created_at DESC`,
      [req.userId]
    );
    res.json(rows);
  }
});

router.put("/admin/reorder", requireAuth, async (req: AuthRequest, res) => {
  const { items } = req.body;

  if (!Array.isArray(items)) {
    res.status(400).json({ error: "Items array is required" });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const item of items as { id: number; sort_order: number }[]) {
      await client.query("UPDATE news SET sort_order = $1 WHERE id = $2", [item.sort_order, item.id]);
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  res.json({ success: true });
});

// Admin: server-side search — replaces the old "fetch all and filter in JS" pattern.
// Uses the pre-computed tsvector index for O(log n) matching; falls back to ILIKE
// if the migration has not been run yet (graceful degradation).
router.get("/admin/search", requireAnyAuth, async (req: AuthRequest, res) => {
  const raw = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 200) : "";
  const limitNum = Math.min(20, Math.max(1, parseInt((req.query.limit as string) || "10", 10)));

  if (!raw) {
    res.json({ news: [] });
    return;
  }

  // Build AND-joined tsquery — strip special chars so user input can't break the parser
  const tsQuery = raw
    .split(/\s+/)
    .map((t) => t.replace(/[^a-zA-Z0-9\u0900-\u097F]/g, ""))
    .filter((t) => t.length > 0)
    .slice(0, 8)
    .join(" & ");

  if (!tsQuery) {
    res.json({ news: [] });
    return;
  }

  try {
    let rows;
    if (req.userRole === "admin") {
      const result = await pool.query(
        `SELECT id, title, category, is_published, views, created_at
         FROM news
         WHERE search_vector @@ to_tsquery('simple', $1)
         ORDER BY ts_rank(search_vector, to_tsquery('simple', $1)) DESC
         LIMIT $2`,
        [tsQuery, limitNum]
      );
      rows = result.rows;
    } else {
      const result = await pool.query(
        `SELECT id, title, category, is_published, views, created_at
         FROM news
         WHERE search_vector @@ to_tsquery('simple', $1) AND author_id = $2
         ORDER BY ts_rank(search_vector, to_tsquery('simple', $1)) DESC
         LIMIT $3`,
        [tsQuery, req.userId, limitNum]
      );
      rows = result.rows;
    }
    res.json({ news: rows });
  } catch {
    // Migration 011 not yet applied — graceful ILIKE fallback so admin UI keeps working
    const col = req.userRole !== "admin" ? "AND author_id = $3" : "";
    const p: (string | number)[] = [`%${raw}%`];
    if (req.userRole !== "admin") p.push(req.userId!, limitNum);
    else p.push(limitNum);
    const { rows } = await pool.query(
      `SELECT id, title, category, is_published, views, created_at
       FROM news WHERE (title ILIKE $1 OR category ILIKE $1) ${col}
       ORDER BY created_at DESC LIMIT $${p.length}`,
      p
    );
    res.json({ news: rows });
  }
});

// --- Public routes ---

router.get("/", async (req, res) => {
  const { section, category, search, page = "1", limit = "20" } = req.query;
  const pageNum = Math.max(1, parseInt(page as string, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
  const offset = (pageNum - 1) * limitNum;

  // Join authors so the byline always reflects the author's current
  // full_name — admins editing /admin/authors should see the new name
  // flow through to every article they own. Falls back to the denormalized
  // n.author string for legacy/admin-written articles with no author_id.
  let query = `SELECT n.*, COALESCE(a.full_name, n.author) AS author
               FROM news n
               LEFT JOIN authors a ON n.author_id = a.id
               WHERE n.is_published = TRUE`;
  const params: (string | number)[] = [];
  let paramIdx = 1;

  if (section) {
    query += ` AND n.section = $${paramIdx++}`;
    params.push(section as string);
  }

  if (category) {
    // Match either the primary `category` column or anything in the
    // `categories` array, so multi-category articles surface in every
    // category they belong to (not just their primary).
    query += ` AND (n.category = $${paramIdx} OR $${paramIdx} = ANY(n.categories))`;
    params.push(category as string);
    paramIdx++;
  }

  const { tag } = req.query;
  if (tag && typeof tag === "string") {
    query += ` AND $${paramIdx} = ANY(n.tags)`;
    params.push(tag);
    paramIdx++;
  }

  if (search && typeof search === "string") {
    // Use the pre-computed weighted tsvector index (migration 011) for fast
    // full-text search. Terms are AND-joined so "ipo banking" requires both.
    // Special characters are stripped so user input can't break the tsquery parser.
    // Falls back to ILIKE silently if the column doesn't exist yet.
    const rawTerms = search
      .trim()
      .slice(0, 200)
      .split(/\s+/)
      .map((t) => t.replace(/[^a-zA-Z0-9\u0900-\u097F]/g, ""))
      .filter((t) => t.length > 0)
      .slice(0, 8);

    if (rawTerms.length > 0) {
      const tsQuery = rawTerms.join(" & ");
      query += ` AND n.search_vector @@ to_tsquery('simple', $${paramIdx++})`;
      params.push(tsQuery);
    }
  }

  // Get total count
  const countQuery = query.replace(
    /SELECT n\.\*, COALESCE\(a\.full_name, n\.author\) AS author/,
    "SELECT COUNT(*) as total"
  );
  const { rows: countRows } = await pool.query(countQuery, params);
  const total = parseInt(countRows[0].total, 10);

  query += ` ORDER BY n.sort_order ASC, n.created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
  params.push(limitNum, offset);

  const { rows } = await pool.query(query, params);
  // Server-side safety: ensure the 'trending' section returns at least a
  // small minimum number of items to avoid empty desktop rails. If the
  // original query returned fewer than the minimum, pull additional items
  // (latest) excluding those already returned.
  if (section === "trending") {
    const MIN_TRENDING = 5;
    let finalRows = rows;
    if (finalRows.length < MIN_TRENDING) {
      const need = MIN_TRENDING - finalRows.length;
      const excludeIds: number[] = finalRows.map((r: any) => r.id).filter(Boolean);
      let fallbackQuery = `SELECT n.*, COALESCE(a.full_name, n.author) AS author
                           FROM news n
                           LEFT JOIN authors a ON n.author_id = a.id
                           WHERE n.is_published = TRUE`;
      const fallbackParams: (string | number)[] = [];
      if (excludeIds.length > 0) {
        const placeholders = excludeIds.map((_, i) => `$${i + 1}`).join(",");
        fallbackQuery += ` AND n.id NOT IN (${placeholders})`;
        fallbackParams.push(...excludeIds);
      }
      fallbackQuery += ` ORDER BY n.sort_order ASC, n.created_at DESC LIMIT $${fallbackParams.length + 1}`;
      fallbackParams.push(need);
      const { rows: extra } = await pool.query(fallbackQuery, fallbackParams);
      finalRows = finalRows.concat(extra);
    }

    res.json({
      data: finalRows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
    return;
  }

  res.json({
    data: rows,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

// Get all categories — union of the primary `category` column and any
// extra entries in the `categories` array, so multi-category articles
// surface every label they use.
router.get("/categories", async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT DISTINCT label FROM (
       SELECT category AS label FROM news WHERE is_published = TRUE AND category <> ''
       UNION
       SELECT unnest(categories) AS label FROM news WHERE is_published = TRUE
     ) t
     WHERE label IS NOT NULL AND label <> ''
     ORDER BY label`
  );
  res.json(rows.map((r: { label: string }) => r.label));
});

// Get all tags — distinct, sorted, used to power tag autocomplete in the
// admin form and tag pages on the public site.
router.get("/tags", async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT DISTINCT unnest(tags) AS tag FROM news WHERE is_published = TRUE
     ORDER BY tag`
  );
  res.json(rows.map((r: { tag: string }) => r.tag).filter(Boolean));
});

// Get single news by ID or slug
router.get("/:idOrSlug", async (req, res) => {
  const param = req.params.idOrSlug;
  const isNumeric = /^\d+$/.test(param);

  let query: string;
  let queryParam: string | number;

  // Join authors so the byline always reflects the author's current
  // full_name. Falls back to n.author for articles with no linked author.
  const baseSelect = `SELECT n.*, COALESCE(a.full_name, n.author) AS author
                      FROM news n
                      LEFT JOIN authors a ON n.author_id = a.id`;

  if (isNumeric) {
    query = `${baseSelect} WHERE n.id = $1`;
    queryParam = parseInt(param, 10);
  } else {
    query = `${baseSelect} WHERE n.slug = $1`;
    queryParam = param;
  }

  const { rows } = await pool.query(query, [queryParam]);
  if (rows.length === 0) {
    res.status(404).json({ error: "News not found" });
    return;
  }

  // Increment views
  await pool.query("UPDATE news SET views = COALESCE(views, 0) + 1 WHERE id = $1", [rows[0].id]);

  // Get related news — match any overlap on the primary category or the
  // categories array, so multi-category articles surface a richer rail.
  const articleCats: string[] = Array.isArray(rows[0].categories) && rows[0].categories.length > 0
    ? rows[0].categories
    : [rows[0].category];
  const { rows: related } = await pool.query(
    `SELECT id, title, slug, excerpt, image_url, category, created_at FROM news
     WHERE is_published = TRUE
       AND id != $1
       AND (category = ANY($2::text[]) OR categories && $2::text[])
     ORDER BY created_at DESC LIMIT 4`,
    [rows[0].id, articleCats]
  );

  res.json({ ...rows[0], related });
});

// --- Create news (admin or author with can_create_news) ---

router.post("/", requireAnyAuth, async (req: AuthRequest, res) => {
  // Permission check for authors
  if (req.userRole === "author") {
    const { rows: authorRows } = await pool.query("SELECT * FROM authors WHERE id = $1", [req.userId]);
    if (authorRows.length === 0 || !authorRows[0].can_create_news) {
      res.status(403).json({ error: "You do not have permission to create news" });
      return;
    }
  }

  const {
    title,
    slug: requestedSlug,
    excerpt,
    content,
    author,
    image_url,
    category,
    categories,
    tags,
    meta_title,
    meta_description,
    og_image_url,
    canonical_url,
    noindex,
    section,
    sort_order,
    is_published,
    read_time,
  } = req.body;

  if (!title || !excerpt) {
    res.status(400).json({ error: "Title and excerpt are required" });
    return;
  }

  const sizeError = validateArticleSizes({
    title,
    slug: requestedSlug,
    excerpt,
    content,
    read_time,
    author,
    image_url,
    meta_title,
    meta_description,
    canonical_url,
    og_image_url,
    categories,
    tags,
  });
  if (sizeError) {
    res.status(413).json({ error: sizeError });
    return;
  }

  const primaryCategory = (typeof category === "string" && category.trim()) || "Market";
  const normalizedCategories = normalizeTaxonomy(categories, LIMITS.max_categories);
  // Always ensure the primary category is also present in the array so list
  // queries that filter via `ANY(categories)` still find this article.
  if (!normalizedCategories.some((c) => c.toLowerCase() === primaryCategory.toLowerCase())) {
    normalizedCategories.unshift(primaryCategory);
  }
  const normalizedTags = normalizeTaxonomy(tags, LIMITS.max_tags);

  // Authors without can_publish always create as draft
  let publishState = is_published ?? true;
  if (req.userRole === "author") {
    const { rows: authorRows } = await pool.query("SELECT can_publish FROM authors WHERE id = $1", [req.userId]);
    if (authorRows.length > 0 && !authorRows[0].can_publish) {
      publishState = false;
    }
  }

  // Determine author_id and byline string. Admins may pass an explicit
  // `author` value from the dropdown (their own name or any active author's
  // name); if they don't, fall back to their stored full_name from
  // admin_users so the default byline tracks /admin/settings edits.
  let authorId: number | null = null;
  let authorName = typeof author === "string" && author.trim() ? author : "";
  if (req.userRole === "author") {
    authorId = req.userId!;
    const { rows: authorRows } = await pool.query("SELECT full_name FROM authors WHERE id = $1", [req.userId]);
    if (authorRows.length > 0 && authorRows[0].full_name) {
      authorName = authorRows[0].full_name;
    }
  } else if (!authorName) {
    const { rows: adminRows } = await pool.query("SELECT full_name FROM admin_users WHERE id = $1", [req.userId]);
    authorName = adminRows[0]?.full_name || "ShareSanskar Team";
  }

  // Use admin-supplied slug if provided, otherwise derive from title
  const requested = typeof requestedSlug === "string" ? requestedSlug.trim() : "";
  let slug = requested ? slugify(requested) : slugify(title);
  if (!slug) slug = slugify(title);
  const { rows: existing } = await pool.query("SELECT id FROM news WHERE slug = $1", [slug]);
  if (existing.length > 0) {
    slug = `${slug}-${Date.now()}`;
  }

  const { rows } = await pool.query(
    `INSERT INTO news (
       title, slug, excerpt, content, author, author_id, image_url,
       category, categories, tags,
       meta_title, meta_description, og_image_url, canonical_url, noindex,
       section, sort_order, is_published, read_time
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
     RETURNING *`,
    [
      title,
      slug,
      excerpt,
      content || "",
      authorName,
      authorId,
      image_url || "",
      primaryCategory,
      normalizedCategories,
      normalizedTags,
      typeof meta_title === "string" ? meta_title : "",
      typeof meta_description === "string" ? meta_description : "",
      typeof og_image_url === "string" ? og_image_url : "",
      typeof canonical_url === "string" ? canonical_url : "",
      noindex === true,
      section || "latest",
      sort_order ?? 0,
      publishState,
      read_time || null,
    ]
  );

  res.status(201).json(rows[0]);
});

// --- Update news (admin can edit all, author can edit own if permitted) ---

router.put("/:id", requireAnyAuth, async (req: AuthRequest, res) => {
  const { rows: existing } = await pool.query("SELECT * FROM news WHERE id = $1", [req.params.id]);
  if (existing.length === 0) {
    res.status(404).json({ error: "News not found" });
    return;
  }

  const old = existing[0];

  // Author permission checks
  if (req.userRole === "author") {
    if (old.author_id !== req.userId) {
      res.status(403).json({ error: "You can only edit your own articles" });
      return;
    }
    const { rows: authorRows } = await pool.query("SELECT * FROM authors WHERE id = $1", [req.userId]);
    if (authorRows.length === 0 || !authorRows[0].can_edit_own_news) {
      res.status(403).json({ error: "You do not have permission to edit articles" });
      return;
    }
  }

  const {
    title,
    slug: requestedSlug,
    excerpt,
    content,
    author,
    image_url,
    category,
    categories,
    tags,
    meta_title,
    meta_description,
    og_image_url,
    canonical_url,
    noindex,
    section,
    sort_order,
    is_published,
    read_time,
  } = req.body;

  const sizeError = validateArticleSizes({
    title,
    slug: requestedSlug,
    excerpt,
    content,
    read_time,
    author,
    image_url,
    meta_title,
    meta_description,
    canonical_url,
    og_image_url,
    categories,
    tags,
  });
  if (sizeError) {
    res.status(413).json({ error: sizeError });
    return;
  }

  // Authors without can_publish cannot change publish state
  let publishState = is_published ?? old.is_published;
  if (req.userRole === "author") {
    const { rows: authorRows } = await pool.query("SELECT can_publish FROM authors WHERE id = $1", [req.userId]);
    if (authorRows.length > 0 && !authorRows[0].can_publish) {
      publishState = old.is_published; // Keep existing state
    }
  }

  // Slug handling:
  //  - If admin explicitly provided a slug, normalize and use it (uniqueness-checked).
  //  - Otherwise, regenerate from title only when the title changed.
  let slug: string = old.slug;
  const requested = typeof requestedSlug === "string" ? requestedSlug.trim() : "";
  if (requested) {
    const candidate = slugify(requested) || old.slug;
    if (candidate !== old.slug) {
      const { rows: slugCheck } = await pool.query("SELECT id FROM news WHERE slug = $1 AND id != $2", [candidate, req.params.id]);
      slug = slugCheck.length > 0 ? `${candidate}-${Date.now()}` : candidate;
    }
  } else if (title && title !== old.title) {
    const candidate = slugify(title);
    const { rows: slugCheck } = await pool.query("SELECT id FROM news WHERE slug = $1 AND id != $2", [candidate, req.params.id]);
    slug = slugCheck.length > 0 ? `${candidate}-${Date.now()}` : candidate;
  }

  // Authors cannot change section or sort_order
  const finalSection = req.userRole === "author" ? old.section : (section ?? old.section);
  const finalSortOrder = req.userRole === "author" ? old.sort_order : (sort_order ?? old.sort_order);

  // Taxonomy: only overwrite when the client explicitly sent a value, so a
  // partial update (e.g. just toggling publish state) doesn't wipe categories.
  const finalPrimary = (typeof category === "string" && category.trim()) || old.category;
  let finalCategories: string[];
  if (Array.isArray(categories)) {
    finalCategories = normalizeTaxonomy(categories, LIMITS.max_categories);
    if (!finalCategories.some((c) => c.toLowerCase() === finalPrimary.toLowerCase())) {
      finalCategories.unshift(finalPrimary);
    }
  } else {
    finalCategories = Array.isArray(old.categories) ? old.categories : [];
    // Make sure the primary is reflected if it just changed.
    if (!finalCategories.some((c: string) => c.toLowerCase() === finalPrimary.toLowerCase())) {
      finalCategories = [finalPrimary, ...finalCategories];
    }
  }
  const finalTags = Array.isArray(tags)
    ? normalizeTaxonomy(tags, LIMITS.max_tags)
    : (Array.isArray(old.tags) ? old.tags : []);

  const finalMetaTitle = typeof meta_title === "string" ? meta_title : (old.meta_title ?? "");
  const finalMetaDescription = typeof meta_description === "string" ? meta_description : (old.meta_description ?? "");
  const finalOgImage = typeof og_image_url === "string" ? og_image_url : (old.og_image_url ?? "");
  const finalCanonical = typeof canonical_url === "string" ? canonical_url : (old.canonical_url ?? "");
  const finalNoindex = typeof noindex === "boolean" ? noindex : (old.noindex === true);

  // ── Save a revision snapshot (the BEFORE state) so editors can recover
  //    overwritten content. Runs in a separate try/catch so a revision
  //    save failure never blocks the actual article update.
  try {
    await pool.query(
      `INSERT INTO news_revisions
         (news_id, title, slug, excerpt, content, author, image_url,
          category, categories, tags, section, is_published,
          changed_by_id, changed_by_role)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        old.id, old.title, old.slug, old.excerpt, old.content, old.author,
        old.image_url, old.category, old.categories, old.tags, old.section,
        old.is_published, req.userId ?? null, req.userRole ?? "admin",
      ]
    );
  } catch (revErr) {
    // news_revisions table missing (migration pending) — log and continue
    console.warn("[news] Could not save revision:", (revErr as Error).message);
  }

  const { rows } = await pool.query(
    `UPDATE news SET
       title = $1, slug = $2, excerpt = $3, content = $4, author = $5, image_url = $6,
       category = $7, categories = $8, tags = $9,
       meta_title = $10, meta_description = $11, og_image_url = $12, canonical_url = $13, noindex = $14,
       section = $15, sort_order = $16, is_published = $17, read_time = $18, updated_at = NOW()
     WHERE id = $19 RETURNING *`,
    [
      title ?? old.title,
      slug,
      excerpt ?? old.excerpt,
      content !== undefined ? content : old.content,
      author ?? old.author,
      image_url ?? old.image_url,
      finalPrimary,
      finalCategories,
      finalTags,
      finalMetaTitle,
      finalMetaDescription,
      finalOgImage,
      finalCanonical,
      finalNoindex,
      finalSection,
      finalSortOrder,
      publishState,
      read_time !== undefined ? read_time : old.read_time,
      req.params.id,
    ]
  );

  res.json(rows[0]);
});

// --- Delete news (admin only) ---

router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  const { rows } = await pool.query("SELECT * FROM news WHERE id = $1", [req.params.id]);
  if (rows.length === 0) {
    res.status(404).json({ error: "News not found" });
    return;
  }

  await pool.query("DELETE FROM news WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

// --- Revision history ---

// List revisions for an article (admin sees all; author only sees their own)
router.get("/:id/revisions", requireAnyAuth, async (req: AuthRequest, res) => {
  const { rows: article } = await pool.query(
    "SELECT author_id FROM news WHERE id = $1",
    [req.params.id]
  );
  if (article.length === 0) {
    res.status(404).json({ error: "News not found" });
    return;
  }
  if (req.userRole === "author" && article[0].author_id !== req.userId) {
    res.status(403).json({ error: "You can only view revisions of your own articles" });
    return;
  }
  try {
    const { rows } = await pool.query(
      `SELECT id, news_id, title, slug, excerpt, author, category, section,
              is_published, changed_by_role, changed_by_id, created_at
       FROM news_revisions WHERE news_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.params.id]
    );
    res.json(rows);
  } catch {
    // Migration 012 not yet applied
    res.json([]);
  }
});

// Restore a specific revision (admin only)
router.post("/:id/revisions/:revId/restore", requireAuth, async (req: AuthRequest, res) => {
  const { rows: revRows } = await pool.query(
    "SELECT * FROM news_revisions WHERE id = $1 AND news_id = $2",
    [req.params.revId, req.params.id]
  );
  if (revRows.length === 0) {
    res.status(404).json({ error: "Revision not found" });
    return;
  }
  const rev = revRows[0];

  const { rows: current } = await pool.query("SELECT * FROM news WHERE id = $1", [req.params.id]);
  if (current.length === 0) {
    res.status(404).json({ error: "Article not found" });
    return;
  }
  const cur = current[0];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Archive current state before overwriting
    await client.query(
      `INSERT INTO news_revisions
         (news_id, title, slug, excerpt, content, author, image_url,
          category, categories, tags, section, is_published,
          changed_by_id, changed_by_role)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        cur.id, cur.title, cur.slug, cur.excerpt, cur.content, cur.author,
        cur.image_url, cur.category, cur.categories, cur.tags, cur.section,
        cur.is_published, req.userId ?? null, "admin",
      ]
    );
    const { rows } = await client.query(
      `UPDATE news SET
         title=$1, slug=$2, excerpt=$3, content=$4, author=$5, image_url=$6,
         category=$7, categories=$8, tags=$9, section=$10, is_published=$11,
         updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [
        rev.title, rev.slug, rev.excerpt, rev.content, rev.author, rev.image_url,
        rev.category, rev.categories, rev.tags, rev.section, rev.is_published,
        req.params.id,
      ]
    );
    await client.query("COMMIT");
    res.json({ message: "Revision restored successfully", article: rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

export default router;
