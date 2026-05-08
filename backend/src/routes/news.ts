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
  return null;
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

// --- Public routes ---

router.get("/", async (req, res) => {
  const { section, category, search, page = "1", limit = "20" } = req.query;
  const pageNum = Math.max(1, parseInt(page as string, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
  const offset = (pageNum - 1) * limitNum;

  let query = "SELECT * FROM news WHERE is_published = TRUE";
  const params: (string | number)[] = [];
  let paramIdx = 1;

  if (section) {
    query += ` AND section = $${paramIdx++}`;
    params.push(section as string);
  }

  if (category) {
    query += ` AND category = $${paramIdx++}`;
    params.push(category as string);
  }

  if (search && typeof search === "string") {
    // Split into individual terms and AND them together so multi-word
    // queries narrow results (e.g. "ipo banking" requires both). Each term
    // matches across title / excerpt / category for a sensible balance —
    // no full-text indexing needed at this scale, and `content` is skipped
    // to avoid scanning large HTML bodies on every request.
    const terms = search
      .trim()
      .slice(0, 80) // bound input length
      .split(/\s+/)
      .filter((t) => t.length > 0)
      .slice(0, 5); // at most 5 terms

    for (const term of terms) {
      query += ` AND (title ILIKE $${paramIdx} OR excerpt ILIKE $${paramIdx} OR category ILIKE $${paramIdx})`;
      params.push(`%${term}%`);
      paramIdx++;
    }
  }

  // Get total count
  const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as total");
  const { rows: countRows } = await pool.query(countQuery, params);
  const total = parseInt(countRows[0].total, 10);

  query += ` ORDER BY sort_order ASC, created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
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
      let fallbackQuery = "SELECT * FROM news WHERE is_published = TRUE";
      const fallbackParams: (string | number)[] = [];
      if (excludeIds.length > 0) {
        const placeholders = excludeIds.map((_, i) => `$${i + 1}`).join(",");
        fallbackQuery += ` AND id NOT IN (${placeholders})`;
        fallbackParams.push(...excludeIds);
      }
      fallbackQuery += ` ORDER BY sort_order ASC, created_at DESC LIMIT $${fallbackParams.length + 1}`;
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

// Get all categories
router.get("/categories", async (_req, res) => {
  const { rows } = await pool.query(
    "SELECT DISTINCT category FROM news WHERE is_published = TRUE ORDER BY category"
  );
  res.json(rows.map((r: { category: string }) => r.category));
});

// Get single news by ID or slug
router.get("/:idOrSlug", async (req, res) => {
  const param = req.params.idOrSlug;
  const isNumeric = /^\d+$/.test(param);

  let query: string;
  let queryParam: string | number;

  if (isNumeric) {
    query = "SELECT * FROM news WHERE id = $1";
    queryParam = parseInt(param, 10);
  } else {
    query = "SELECT * FROM news WHERE slug = $1";
    queryParam = param;
  }

  const { rows } = await pool.query(query, [queryParam]);
  if (rows.length === 0) {
    res.status(404).json({ error: "News not found" });
    return;
  }

  // Increment views
  await pool.query("UPDATE news SET views = COALESCE(views, 0) + 1 WHERE id = $1", [rows[0].id]);

  // Get related news
  const { rows: related } = await pool.query(
    "SELECT id, title, slug, excerpt, image_url, category, created_at FROM news WHERE is_published = TRUE AND category = $1 AND id != $2 ORDER BY created_at DESC LIMIT 4",
    [rows[0].category, rows[0].id]
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

  const { title, slug: requestedSlug, excerpt, content, author, image_url, category, section, sort_order, is_published, read_time } = req.body;

  if (!title || !excerpt) {
    res.status(400).json({ error: "Title and excerpt are required" });
    return;
  }

  const sizeError = validateArticleSizes({ title, slug: requestedSlug, excerpt, content, read_time, author, image_url });
  if (sizeError) {
    res.status(413).json({ error: sizeError });
    return;
  }

  // Authors without can_publish always create as draft
  let publishState = is_published ?? true;
  if (req.userRole === "author") {
    const { rows: authorRows } = await pool.query("SELECT can_publish FROM authors WHERE id = $1", [req.userId]);
    if (authorRows.length > 0 && !authorRows[0].can_publish) {
      publishState = false;
    }
  }

  // Determine author_id
  let authorId: number | null = null;
  let authorName = author || "ShareSanskar Team";
  if (req.userRole === "author") {
    authorId = req.userId!;
    const { rows: authorRows } = await pool.query("SELECT full_name FROM authors WHERE id = $1", [req.userId]);
    if (authorRows.length > 0 && authorRows[0].full_name) {
      authorName = authorRows[0].full_name;
    }
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
    `INSERT INTO news (title, slug, excerpt, content, author, author_id, image_url, category, section, sort_order, is_published, read_time)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
    [
      title,
      slug,
      excerpt,
      content || "",
      authorName,
      authorId,
      image_url || "",
      category || "Market",
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

  const { title, slug: requestedSlug, excerpt, content, author, image_url, category, section, sort_order, is_published, read_time } = req.body;

  const sizeError = validateArticleSizes({ title, slug: requestedSlug, excerpt, content, read_time, author, image_url });
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

  const { rows } = await pool.query(
    `UPDATE news SET title = $1, slug = $2, excerpt = $3, content = $4, author = $5, image_url = $6, category = $7, section = $8,
     sort_order = $9, is_published = $10, read_time = $11, updated_at = NOW()
     WHERE id = $12 RETURNING *`,
    [
      title ?? old.title,
      slug,
      excerpt ?? old.excerpt,
      content !== undefined ? content : old.content,
      author ?? old.author,
      image_url ?? old.image_url,
      category ?? old.category,
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

export default router;
