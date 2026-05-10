import { Router } from "express";
import pool from "../db.js";
import { requireAuth, requireAnyAuth, type AuthRequest } from "../middleware/auth.js";

const router = Router();

const VALID_PLATFORMS = ["tiktok", "instagram", "facebook"] as const;
type Platform = (typeof VALID_PLATFORMS)[number];

interface VideoRow {
  id: number;
  platform: Platform;
  url: string;
  caption: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function isValidPlatform(p: unknown): p is Platform {
  return typeof p === "string" && (VALID_PLATFORMS as readonly string[]).includes(p);
}

function clampString(v: unknown, max: number): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

// Light URL validation — the embed scripts handle the heavy lifting,
// so we only reject obviously broken inputs here.
function isLikelyUrl(v: string): boolean {
  return /^https?:\/\/\S+$/i.test(v);
}

// ── Public: list active videos in display order ────────────────
router.get("/", async (_req, res) => {
  const { rows } = await pool.query<VideoRow>(
    `SELECT * FROM videos WHERE is_active = TRUE ORDER BY sort_order ASC, created_at DESC`
  );
  res.json({ data: rows });
});

// ── Admin/author (with can_manage_videos): list all ─────────────
router.get("/admin/all", requireAnyAuth, async (req: AuthRequest, res) => {
  if (req.userRole === "author") {
    const { rows: authorRows } = await pool.query(
      "SELECT can_manage_videos FROM authors WHERE id = $1",
      [req.userId]
    );
    if (authorRows.length === 0 || !authorRows[0].can_manage_videos) {
      res.status(403).json({ error: "Video management permission required." });
      return;
    }
  }

  const { rows } = await pool.query<VideoRow>(
    `SELECT * FROM videos ORDER BY sort_order ASC, created_at DESC`
  );
  res.json(rows);
});

// ── Admin: create video ────────────────────────────────────────
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const platform = req.body?.platform;
  const url = clampString(req.body?.url, 2048).trim();
  const caption = clampString(req.body?.caption, 500);
  const is_active = req.body?.is_active === undefined ? true : Boolean(req.body.is_active);
  const sort_order = Number.isFinite(Number(req.body?.sort_order))
    ? Number(req.body.sort_order)
    : 0;

  if (!isValidPlatform(platform)) {
    res.status(400).json({
      error: `Platform must be one of: ${VALID_PLATFORMS.join(", ")}.`,
    });
    return;
  }
  if (!url || !isLikelyUrl(url)) {
    res.status(400).json({ error: "A valid http(s) URL is required." });
    return;
  }

  const { rows } = await pool.query<VideoRow>(
    `INSERT INTO videos (platform, url, caption, sort_order, is_active)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [platform, url, caption, sort_order, is_active]
  );
  res.status(201).json(rows[0]);
});

// ── Admin: update video ────────────────────────────────────────
router.patch("/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }

  const fields: string[] = [];
  const params: (string | number | boolean | null)[] = [];
  let idx = 1;

  if (req.body?.platform !== undefined) {
    if (!isValidPlatform(req.body.platform)) {
      res.status(400).json({
        error: `Platform must be one of: ${VALID_PLATFORMS.join(", ")}.`,
      });
      return;
    }
    fields.push(`platform = $${idx++}`);
    params.push(req.body.platform);
  }
  if (typeof req.body?.url === "string") {
    const v = clampString(req.body.url, 2048).trim();
    if (!v || !isLikelyUrl(v)) {
      res.status(400).json({ error: "A valid http(s) URL is required." });
      return;
    }
    fields.push(`url = $${idx++}`);
    params.push(v);
  }
  if (typeof req.body?.caption === "string") {
    fields.push(`caption = $${idx++}`);
    params.push(clampString(req.body.caption, 500));
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

  const { rows } = await pool.query<VideoRow>(
    `UPDATE videos SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    params
  );
  if (rows.length === 0) {
    res.status(404).json({ error: "Video not found." });
    return;
  }
  res.json(rows[0]);
});

// ── Admin: delete video ────────────────────────────────────────
router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }
  const { rowCount } = await pool.query("DELETE FROM videos WHERE id = $1", [id]);
  if (rowCount === 0) {
    res.status(404).json({ error: "Video not found." });
    return;
  }
  res.json({ success: true });
});

export default router;
