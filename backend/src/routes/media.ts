import { Router } from "express";
import multer from "multer";
import { createHash, randomUUID } from "crypto";
import pool from "../db.js";
import { requireAnyAuth, type AuthRequest } from "../middleware/auth.js";
import { getStorage } from "../services/storage.js";
import {
  validateImageBuffer,
  MAX_FILE_BYTES,
} from "../services/imageValidation.js";

const router = Router();

// In-memory storage so we can validate magic bytes / dimensions before
// touching disk. 5 MB cap matches the validator — multer rejects bigger
// files before we even buffer them.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1 },
});

interface MediaRow {
  id: string;
  storage_key: string | null;
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

interface MediaDto extends Omit<MediaRow, "storage_key"> {
  url: string;
}

function toDto(row: MediaRow): MediaDto {
  const url = row.storage_key
    ? getStorage().publicUrl(row.storage_key)
    : row.external_url || "";
  // Keep storage_key out of the public DTO — the URL is the only thing
  // clients need, and exposing the key invites tampering.
  const { storage_key: _omit, ...rest } = row;
  void _omit;
  return { ...rest, url };
}

// ── List / search ───────────────────────────────────────────────

router.get("/", requireAnyAuth, async (req: AuthRequest, res) => {
  const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
  const limit = Math.min(80, Math.max(1, parseInt((req.query.limit as string) || "40", 10)));
  const offset = (page - 1) * limit;
  const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 80) : "";

  const params: (string | number)[] = [];
  let where = "";
  if (q) {
    params.push(`%${q}%`);
    where = `WHERE original_name ILIKE $1 OR alt_text ILIKE $1 OR caption ILIKE $1`;
  }

  const countSql = `SELECT COUNT(*)::int AS total FROM media ${where}`;
  const { rows: countRows } = await pool.query<{ total: number }>(countSql, params);
  const total = countRows[0]?.total ?? 0;

  const listSql = `
    SELECT * FROM media
    ${where}
    ORDER BY created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
  const { rows } = await pool.query<MediaRow>(listSql, [...params, limit, offset]);

  res.json({
    data: rows.map(toDto),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

// ── Upload ──────────────────────────────────────────────────────

router.post("/", requireAnyAuth, upload.single("file"), async (req: AuthRequest, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "No file uploaded. Use field name \"file\"." });
    return;
  }

  let validated;
  try {
    validated = validateImageBuffer(file.buffer);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
    return;
  }

  const storage = getStorage();

  // Dedup — if we already have a row for this exact byte content AND the
  // backing file still exists on disk, return it instead of writing a new
  // copy. We skip dangling rows so the user gets a fresh, working upload
  // instead of a broken URL handed back from a stale row.
  const checksum = createHash("sha256").update(file.buffer).digest("hex");
  const existing = await pool.query<MediaRow>(
    "SELECT * FROM media WHERE checksum = $1 LIMIT 1",
    [checksum]
  );
  if (existing.rows.length > 0 && existing.rows[0].storage_key && storage.exists(existing.rows[0].storage_key)) {
    res.status(200).json({ media: toDto(existing.rows[0]), deduplicated: true });
    return;
  }
  // If we found a dangling row, drop it so the unique-checksum index lets
  // us insert a fresh, working entry below.
  if (existing.rows.length > 0) {
    await pool.query("DELETE FROM media WHERE id = $1", [existing.rows[0].id]);
  }

  const { key } = await storage.put(file.buffer, validated.ext, validated.mime);

  const id = randomUUID();
  const altText = typeof req.body?.alt_text === "string" ? req.body.alt_text.slice(0, 300) : "";
  const caption = typeof req.body?.caption === "string" ? req.body.caption.slice(0, 500) : "";

  let rows: MediaRow[];
  try {
    const result = await pool.query<MediaRow>(
      `INSERT INTO media
         (id, storage_key, original_name, mime_type, size_bytes, width, height,
          checksum, alt_text, caption, uploaded_by, uploader_role, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'upload')
       RETURNING *`,
      [
        id,
        key,
        file.originalname?.slice(0, 255) || null,
        validated.mime,
        validated.size,
        validated.width,
        validated.height,
        checksum,
        altText,
        caption,
        req.userId ?? null,
        req.userRole ?? null,
      ]
    );
    rows = result.rows;
  } catch (err) {
    // DB insert failed — don't leave the file orphaned on disk.
    await storage.delete(key).catch(() => undefined);
    throw err;
  }

  res.status(201).json({ media: toDto(rows[0]), deduplicated: false });
});

// ── Update metadata ─────────────────────────────────────────────

router.patch("/:id", requireAnyAuth, async (req: AuthRequest, res) => {
  const id = String(req.params.id);
  const { alt_text, caption } = req.body || {};

  const fields: string[] = [];
  const params: string[] = [];
  let idx = 1;

  if (typeof alt_text === "string") {
    fields.push(`alt_text = $${idx++}`);
    params.push(alt_text.slice(0, 300));
  }
  if (typeof caption === "string") {
    fields.push(`caption = $${idx++}`);
    params.push(caption.slice(0, 500));
  }

  if (fields.length === 0) {
    res.status(400).json({ error: "Nothing to update." });
    return;
  }

  params.push(id);
  const { rows } = await pool.query<MediaRow>(
    `UPDATE media SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    params
  );
  if (rows.length === 0) {
    res.status(404).json({ error: "Media not found." });
    return;
  }
  res.json({ media: toDto(rows[0]) });
});

// ── Delete ──────────────────────────────────────────────────────

router.delete("/:id", requireAnyAuth, async (req: AuthRequest, res) => {
  // Authors can only delete their own uploads; admins can delete anything.
  const { rows } = await pool.query<MediaRow>("SELECT * FROM media WHERE id = $1", [req.params.id]);
  if (rows.length === 0) {
    res.status(404).json({ error: "Media not found." });
    return;
  }
  const row = rows[0];
  if (req.userRole === "author" && row.uploaded_by !== req.userId) {
    res.status(403).json({ error: "You can only delete your own uploads." });
    return;
  }

  // Best-effort file cleanup. We don't fail the request if the file is
  // already gone — the DB row removal is the source of truth for visibility.
  if (row.storage_key) {
    try {
      await getStorage().delete(row.storage_key);
    } catch {
      // ignore
    }
  }

  await pool.query("DELETE FROM media WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

export default router;
