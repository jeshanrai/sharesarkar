import { Router } from "express";
import multer from "multer";
import pool from "../db.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { getStorage } from "../services/storage.js";
import {
  validateAdImageBuffer,
  MAX_AD_FILE_BYTES,
} from "../services/imageValidation.js";

const router = Router();

// Memory storage so we can validate magic bytes / dimensions before disk I/O.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AD_FILE_BYTES, files: 1 },
});

const VALID_PLACEMENTS = ["news_listing", "news_article", "all_news"] as const;
type Placement = (typeof VALID_PLACEMENTS)[number];

interface AdRow {
  id: number;
  name: string;
  image_url: string;
  link_url: string | null;
  alt_text: string;
  placement: Placement;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function isValidPlacement(p: unknown): p is Placement {
  return typeof p === "string" && (VALID_PLACEMENTS as readonly string[]).includes(p);
}

function clampString(v: unknown, max: number): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

// ── Public: list active ads for a placement ─────────────────────
//
// Front-end calls this with ?placement=news_article (or news_listing).
// We always include ads tagged "all_news" alongside the requested slot so an
// admin doesn't have to duplicate a creative into both placements.
router.get("/", async (req, res) => {
  const placement = typeof req.query.placement === "string" ? req.query.placement : "";
  if (placement && !isValidPlacement(placement)) {
    res.status(400).json({ error: "Invalid placement." });
    return;
  }

  const params: string[] = [];
  let where = "WHERE is_active = TRUE";
  if (placement) {
    params.push(placement);
    where += ` AND (placement = $1 OR placement = 'all_news')`;
  }

  const { rows } = await pool.query<AdRow>(
    `SELECT * FROM advertisements ${where} ORDER BY sort_order ASC, created_at DESC`,
    params
  );
  res.json({ data: rows });
});

// ── Admin: list all ads (active + inactive) ─────────────────────

router.get("/admin/all", requireAuth, async (_req: AuthRequest, res) => {
  const { rows } = await pool.query<AdRow>(
    `SELECT * FROM advertisements ORDER BY sort_order ASC, created_at DESC`
  );
  res.json(rows);
});

// ── Admin: upload creative file ────────────────────────────────
//
// Returns the URL the admin then submits with the rest of the ad metadata
// via POST /. This two-step flow mirrors the media library UX and lets the
// admin preview the creative before saving the row.
router.post(
  "/upload",
  requireAuth,
  upload.single("file"),
  async (req: AuthRequest, res) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No file uploaded. Use field name \"file\"." });
      return;
    }

    let validated;
    try {
      validated = validateAdImageBuffer(file.buffer);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
      return;
    }

    const storage = getStorage();
    const { key, publicUrl } = await storage.put(file.buffer, validated.ext, validated.mime);
    res.status(201).json({
      url: publicUrl,
      key,
      mime: validated.mime,
      width: validated.width,
      height: validated.height,
      size: validated.size,
    });
  }
);

// ── Admin: create ad ───────────────────────────────────────────

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const name = clampString(req.body?.name, 200).trim();
  const image_url = clampString(req.body?.image_url, 2048).trim();
  const link_url = clampString(req.body?.link_url, 2048).trim();
  const alt_text = clampString(req.body?.alt_text, 300);
  const placement = req.body?.placement;
  const is_active = Boolean(req.body?.is_active);
  const sort_order = Number.isFinite(Number(req.body?.sort_order))
    ? Number(req.body.sort_order)
    : 0;

  if (!name) {
    res.status(400).json({ error: "Name is required." });
    return;
  }
  if (!image_url) {
    res.status(400).json({ error: "Image URL is required." });
    return;
  }
  if (!isValidPlacement(placement)) {
    res.status(400).json({
      error: `Placement must be one of: ${VALID_PLACEMENTS.join(", ")}.`,
    });
    return;
  }

  const { rows } = await pool.query<AdRow>(
    `INSERT INTO advertisements
       (name, image_url, link_url, alt_text, placement, is_active, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [name, image_url, link_url || null, alt_text, placement, is_active, sort_order]
  );
  res.status(201).json(rows[0]);
});

// ── Admin: update ad ───────────────────────────────────────────

router.patch("/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }

  const fields: string[] = [];
  const params: (string | number | boolean | null)[] = [];
  let idx = 1;

  if (typeof req.body?.name === "string") {
    const v = clampString(req.body.name, 200).trim();
    if (!v) {
      res.status(400).json({ error: "Name cannot be empty." });
      return;
    }
    fields.push(`name = $${idx++}`);
    params.push(v);
  }
  if (typeof req.body?.image_url === "string") {
    const v = clampString(req.body.image_url, 2048).trim();
    if (!v) {
      res.status(400).json({ error: "Image URL cannot be empty." });
      return;
    }
    fields.push(`image_url = $${idx++}`);
    params.push(v);
  }
  if (typeof req.body?.link_url === "string" || req.body?.link_url === null) {
    const v = req.body.link_url ? clampString(req.body.link_url, 2048).trim() : "";
    fields.push(`link_url = $${idx++}`);
    params.push(v || null);
  }
  if (typeof req.body?.alt_text === "string") {
    fields.push(`alt_text = $${idx++}`);
    params.push(clampString(req.body.alt_text, 300));
  }
  if (req.body?.placement !== undefined) {
    if (!isValidPlacement(req.body.placement)) {
      res.status(400).json({
        error: `Placement must be one of: ${VALID_PLACEMENTS.join(", ")}.`,
      });
      return;
    }
    fields.push(`placement = $${idx++}`);
    params.push(req.body.placement);
  }
  if (req.body?.is_active !== undefined) {
    fields.push(`is_active = $${idx++}`);
    params.push(Boolean(req.body.is_active));
  }
  if (req.body?.sort_order !== undefined) {
    const n = Number(req.body.sort_order);
    if (!Number.isFinite(n)) {
      res.status(400).json({ error: "sort_order must be a number." });
      return;
    }
    fields.push(`sort_order = $${idx++}`);
    params.push(n);
  }

  if (fields.length === 0) {
    res.status(400).json({ error: "Nothing to update." });
    return;
  }

  fields.push(`updated_at = NOW()`);
  params.push(id);

  const { rows } = await pool.query<AdRow>(
    `UPDATE advertisements SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    params
  );
  if (rows.length === 0) {
    res.status(404).json({ error: "Ad not found." });
    return;
  }
  res.json(rows[0]);
});

// ── Admin: delete ad ───────────────────────────────────────────
//
// We don't try to clean up the underlying creative file — the same upload
// can be reused across ads, and the media library/orphan sweep handles
// stale uploads.
router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }
  const { rowCount } = await pool.query(
    "DELETE FROM advertisements WHERE id = $1",
    [id]
  );
  if (rowCount === 0) {
    res.status(404).json({ error: "Ad not found." });
    return;
  }
  res.json({ success: true });
});

export default router;
