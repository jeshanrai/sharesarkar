import { Router } from "express";
import pool from "../db.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();

// --- Helper: generate slug ---
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120);
}

// --- Admin routes (defined before /:id to avoid conflicts) ---

router.get("/admin/all", requireAuth, async (_req: AuthRequest, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM news ORDER BY section, sort_order ASC, created_at DESC"
  );
  res.json(rows);
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

  if (search) {
    query += ` AND (title ILIKE $${paramIdx} OR excerpt ILIKE $${paramIdx})`;
    params.push(`%${search}%`);
    paramIdx++;
  }

  // Get total count
  const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as total");
  const { rows: countRows } = await pool.query(countQuery, params);
  const total = parseInt(countRows[0].total, 10);

  query += ` ORDER BY sort_order ASC, created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
  params.push(limitNum, offset);

  const { rows } = await pool.query(query, params);
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

// --- Admin CRUD ---

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const { title, excerpt, content, author, image_url, category, section, sort_order, is_published, read_time } = req.body;

  if (!title || !excerpt) {
    res.status(400).json({ error: "Title and excerpt are required" });
    return;
  }

  // Generate unique slug
  let slug = slugify(title);
  const { rows: existing } = await pool.query("SELECT id FROM news WHERE slug = $1", [slug]);
  if (existing.length > 0) {
    slug = `${slug}-${Date.now()}`;
  }

  const { rows } = await pool.query(
    `INSERT INTO news (title, slug, excerpt, content, author, image_url, category, section, sort_order, is_published, read_time)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [
      title,
      slug,
      excerpt,
      content || "",
      author || "ShareSanskar Team",
      image_url || "",
      category || "Market",
      section || "latest",
      sort_order ?? 0,
      is_published ?? true,
      read_time || null,
    ]
  );

  res.status(201).json(rows[0]);
});

router.put("/:id", requireAuth, async (req: AuthRequest, res) => {
  const { title, excerpt, content, author, image_url, category, section, sort_order, is_published, read_time } = req.body;

  const { rows: existing } = await pool.query("SELECT * FROM news WHERE id = $1", [req.params.id]);
  if (existing.length === 0) {
    res.status(404).json({ error: "News not found" });
    return;
  }

  const old = existing[0];

  // Re-generate slug if title changed
  let slug = old.slug;
  if (title && title !== old.title) {
    slug = slugify(title);
    const { rows: slugCheck } = await pool.query("SELECT id FROM news WHERE slug = $1 AND id != $2", [slug, req.params.id]);
    if (slugCheck.length > 0) {
      slug = `${slug}-${Date.now()}`;
    }
  }

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
      section ?? old.section,
      sort_order ?? old.sort_order,
      is_published ?? old.is_published,
      read_time !== undefined ? read_time : old.read_time,
      req.params.id,
    ]
  );

  res.json(rows[0]);
});

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
