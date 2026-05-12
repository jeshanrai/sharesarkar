import { Router } from "express";
import multer from "multer";
import { readFile } from "fs/promises";
import { join } from "path";
import pool from "../db.js";
import { requireAnyAuth, type AuthRequest } from "../middleware/auth.js";
import { getStorage } from "../services/storage.js";
import {
  validateAdImageBuffer,
  measureImageBuffer,
  MAX_AD_FILE_BYTES,
} from "../services/imageValidation.js";

const router = Router();

// Permission gate for ads CRUD: admins always pass; authors need the
// can_manage_ads flag set on their row. Mirrors the pattern videos.ts
// uses for its permission check, but applies to every write endpoint
// (upload, POST, PATCH, DELETE) so author UX is consistent.
async function requireAdsPermission(
  req: AuthRequest,
  res: import("express").Response,
  next: import("express").NextFunction
) {
  if (req.userRole === "admin") return next();
  if (req.userRole !== "author") {
    res.status(403).json({ error: "Forbidden." });
    return;
  }
  const { rows } = await pool.query(
    "SELECT can_manage_ads FROM authors WHERE id = $1",
    [req.userId]
  );
  if (rows.length === 0 || !rows[0].can_manage_ads) {
    res.status(403).json({ error: "Advertisement management permission required." });
    return;
  }
  next();
}

// Memory storage so we can validate magic bytes / dimensions before disk I/O.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AD_FILE_BYTES, files: 1 },
});

// Canonical placement keys. Each ad targets exactly one slot — no
// wildcard fallback inventory, no legacy aliases. The renderer picks
// layout from the slot it lives in, so we don't store a per-ad
// variant either.
const VALID_PLACEMENTS = [
  "news_listing",
  "article_top",
  "article_sidebar",
  "article_inline",
  "article_footer",
] as const;
type Placement = (typeof VALID_PLACEMENTS)[number];

// Canonical sizes — must stay in sync with frontend/lib/adPlacements.ts.
const VALID_SIZES = [
  "300x250",
  "300x600",
  "728x90",
  "970x250",
  "320x100",
] as const;
type AdSize = (typeof VALID_SIZES)[number];

const SIZE_DIMENSIONS: Record<AdSize, { width: number; height: number }> = {
  "300x250": { width: 300, height: 250 },
  "300x600": { width: 300, height: 600 },
  "728x90": { width: 728, height: 90 },
  "970x250": { width: 970, height: 250 },
  "320x100": { width: 320, height: 100 },
};

// Which sizes each placement will render. Mirrors PLACEMENT_SIZE_COMPAT
// on the frontend — enforced server-side too, so an admin can't sneak
// a 970×250 into the sidebar by editing the form payload directly.
const PLACEMENT_SIZE_COMPAT: Record<Placement, AdSize[]> = {
  news_listing: ["728x90", "970x250"],
  article_top: ["970x250", "728x90"],
  article_sidebar: ["300x250", "300x600"],
  article_inline: ["728x90", "320x100", "300x250"],
  article_footer: ["970x250", "728x90", "320x100"],
};

function isValidPlacement(p: unknown): p is Placement {
  return typeof p === "string" && (VALID_PLACEMENTS as readonly string[]).includes(p);
}

function isValidSize(s: unknown): s is AdSize {
  return typeof s === "string" && (VALID_SIZES as readonly string[]).includes(s);
}

interface AdRow {
  id: number;
  name: string;
  image_url: string;
  link_url: string | null;
  alt_text: string;
  placement: Placement;
  size: AdSize;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function clampString(v: unknown, max: number): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

// pg surfaces unique-constraint violations as code 23505. We translate
// the raw error into a friendly admin-facing message for the
// (placement, sort_order) constraint so the form can react properly.
function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}

// Resolve an image_url to a Buffer for server-side measurement. Two
// shapes:
//   1. Locally-hosted (`/uploads/...`) — read straight from disk via
//      the storage adapter. Avoids a network round-trip back to
//      ourselves and works in environments where the backend can't
//      reach its own public URL.
//   2. External (`https://...`) — fetched with a 5 s timeout and a
//      hard byte cap so a hostile URL can't OOM the process.
const MAX_REMOTE_IMAGE_BYTES = MAX_AD_FILE_BYTES; // mirror the upload cap
const REMOTE_IMAGE_TIMEOUT_MS = 5_000;

async function fetchImageBuffer(imageUrl: string): Promise<Buffer> {
  const storage = getStorage();
  const localPrefix = storage.urlPrefix;
  // Strip an absolute origin if present so we can recognize our own
  // upload URLs (admin form sometimes saves them with a host prefix).
  let path: string | null = null;
  try {
    const u = new URL(imageUrl);
    if (u.pathname.startsWith(`${localPrefix}/`)) path = u.pathname;
  } catch {
    // Not absolute — could be a bare path.
    if (imageUrl.startsWith(`${localPrefix}/`)) path = imageUrl;
  }

  if (path) {
    const key = path.slice(localPrefix.length + 1);
    // Defence in depth — the storage adapter rejects traversal too,
    // but we want to fail fast before touching the disk.
    if (!key || key.includes("..") || key.includes("/") || key.includes("\\")) {
      throw new Error("Invalid local image path.");
    }
    return readFile(join(storage.directory, key));
  }

  // External URL — fetch with a timeout and a streaming size guard.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REMOTE_IMAGE_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(imageUrl, { signal: controller.signal });
  } catch (err) {
    clearTimeout(timer);
    if ((err as { name?: string })?.name === "AbortError") {
      throw new Error("Image URL timed out — verify it loads in a browser.");
    }
    throw new Error("Could not download image from the provided URL.");
  }
  clearTimeout(timer);
  if (!res.ok) {
    throw new Error(`Image URL returned HTTP ${res.status}.`);
  }
  const contentLength = Number(res.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_REMOTE_IMAGE_BYTES) {
    throw new Error(
      `Image at URL is too large (${(contentLength / (1024 * 1024)).toFixed(2)} MB).`
    );
  }
  const ab = await res.arrayBuffer();
  if (ab.byteLength > MAX_REMOTE_IMAGE_BYTES) {
    throw new Error(
      `Image at URL is too large (${(ab.byteLength / (1024 * 1024)).toFixed(2)} MB).`
    );
  }
  return Buffer.from(ab);
}

/**
 * Verify that the image at `image_url` actually has the pixel
 * dimensions implied by `size`. Throws an admin-facing Error on
 * mismatch, network failure, or unparseable image. The ads POST/PATCH
 * routes call this before writing to the DB so every ad — uploaded,
 * pasted URL, or picked from the media library — is dimensionally
 * correct on the way in.
 */
async function assertImageMatchesSize(image_url: string, size: AdSize): Promise<void> {
  const expected = SIZE_DIMENSIONS[size];
  const buf = await fetchImageBuffer(image_url);
  const { width, height } = measureImageBuffer(buf);
  if (width !== expected.width || height !== expected.height) {
    throw new Error(
      `Image at this URL is ${width}×${height} px but the ${size} slot requires exactly ${expected.width}×${expected.height} px.`
    );
  }
}

// ── Public: list active ads for a placement ─────────────────────
//
// Front-end calls this with one of the canonical placement keys.
// Slot-driven model: each ad targets exactly one slot, and the slot
// only serves size-compatible inventory.
router.get("/", async (req, res) => {
  const rawPlacement = typeof req.query.placement === "string" ? req.query.placement : "";

  // Slot-driven model: one ad per slot, picked from inventory that
  // exactly matches both the placement and an allowed size. No
  // wildcard fallback — if a slot has no inventory, the slot stays
  // empty. Rotation is `sort_order ASC, RANDOM()` so admins can
  // prioritize while still rotating ties across page loads.
  //
  // No placement → admin tooling / debug ping; return everything
  // active in deterministic order.
  if (!rawPlacement) {
    const { rows } = await pool.query<AdRow>(
      `SELECT * FROM advertisements WHERE is_active = TRUE
       ORDER BY sort_order ASC, created_at DESC`
    );
    res.json({ data: rows });
    return;
  }

  if (!isValidPlacement(rawPlacement)) {
    res.status(400).json({ error: "Invalid placement." });
    return;
  }

  const placement: Placement = rawPlacement;
  const allowedSizes = PLACEMENT_SIZE_COMPAT[placement];
  const { rows } = await pool.query<AdRow>(
    `SELECT * FROM advertisements
     WHERE is_active = TRUE
       AND placement = $1
       AND size = ANY($2::text[])
     ORDER BY sort_order ASC, RANDOM()
     LIMIT 1`,
    [placement, allowedSizes]
  );
  res.json({ data: rows });
});

// ── Admin / author (with can_manage_ads): list all ads ─────────

router.get("/admin/all", requireAnyAuth, requireAdsPermission, async (_req: AuthRequest, res) => {
  const { rows } = await pool.query<AdRow>(
    `SELECT * FROM advertisements ORDER BY sort_order ASC, created_at DESC`
  );
  res.json(rows);
});

// ── Admin / author (with can_manage_ads): upload creative file ─
//
// Returns the URL the admin then submits with the rest of the ad metadata
// via POST /. This two-step flow mirrors the media library UX and lets the
// admin preview the creative before saving the row.
router.post(
  "/upload",
  requireAnyAuth,
  requireAdsPermission,
  upload.single("file"),
  async (req: AuthRequest, res) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No file uploaded. Use field name \"file\"." });
      return;
    }

    // The admin tells us which slot size this creative is for via a
    // form field next to the file. Required so we can reject the upload
    // before we've written anything to disk if the dimensions don't
    // match — otherwise the admin ends up with orphaned files.
    const intendedSize = req.body?.size;
    if (!isValidSize(intendedSize)) {
      res.status(400).json({
        error: `Size is required. Allowed: ${VALID_SIZES.join(", ")}.`,
      });
      return;
    }

    let validated;
    try {
      validated = validateAdImageBuffer(file.buffer);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
      return;
    }

    const expected = SIZE_DIMENSIONS[intendedSize];
    if (validated.width !== expected.width || validated.height !== expected.height) {
      res.status(400).json({
        error: `Image is ${validated.width}×${validated.height} px but the ${intendedSize} slot requires exactly ${expected.width}×${expected.height} px. Resize and try again.`,
      });
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

// ── Admin / author (with can_manage_ads): create ad ────────────

router.post("/", requireAnyAuth, requireAdsPermission, async (req: AuthRequest, res) => {
  const name = clampString(req.body?.name, 200).trim();
  const image_url = clampString(req.body?.image_url, 2048).trim();
  const link_url = clampString(req.body?.link_url, 2048).trim();
  const alt_text = clampString(req.body?.alt_text, 300);
  const placement = req.body?.placement;
  const size = req.body?.size;
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
  if (!isValidSize(size)) {
    res.status(400).json({
      error: `Size must be one of: ${VALID_SIZES.join(", ")}.`,
    });
    return;
  }
  if (!PLACEMENT_SIZE_COMPAT[placement].includes(size)) {
    res.status(400).json({
      error: `${size} is not allowed in the ${placement} placement. Allowed sizes: ${PLACEMENT_SIZE_COMPAT[placement].join(", ")}.`,
    });
    return;
  }

  // Server-side dimension check on every save path — uploaded files,
  // pasted external URLs, and media-library picks all flow through
  // here. Catches the case where the upload validator was bypassed.
  try {
    await assertImageMatchesSize(image_url, size);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
    return;
  }

  try {
    const { rows } = await pool.query<AdRow>(
      `INSERT INTO advertisements
         (name, image_url, link_url, alt_text, placement, size, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, image_url, link_url || null, alt_text, placement, size, is_active, sort_order]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (isUniqueViolation(err)) {
      res.status(409).json({
        error: `Sort order ${sort_order} is already used in the ${placement} placement. Pick a different number.`,
      });
      return;
    }
    throw err;
  }
});

// ── Admin / author (with can_manage_ads): update ad ────────────

router.patch("/:id", requireAnyAuth, requireAdsPermission, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }

  // If any of placement / size / image_url is in the payload, load the
  // existing row so we can validate the merged (placement, size, image_url)
  // tuple — otherwise an admin could PATCH one of them in isolation and
  // leave the ad incoherent (970x250 stranded in the sidebar, or a 300x250
  // image swapped onto a 728x90 ad without re-validation).
  let existing: AdRow | null = null;
  if (
    req.body?.placement !== undefined ||
    req.body?.size !== undefined ||
    req.body?.image_url !== undefined
  ) {
    const { rows: existingRows } = await pool.query<AdRow>(
      "SELECT * FROM advertisements WHERE id = $1",
      [id]
    );
    if (existingRows.length === 0) {
      res.status(404).json({ error: "Ad not found." });
      return;
    }
    existing = existingRows[0];
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

  // Resolve the (placement, size) we'll write, validating compatibility
  // against the merged state regardless of which fields were submitted.
  let nextPlacement: Placement | null = null;
  if (req.body?.placement !== undefined) {
    if (!isValidPlacement(req.body.placement)) {
      res.status(400).json({
        error: `Placement must be one of: ${VALID_PLACEMENTS.join(", ")}.`,
      });
      return;
    }
    nextPlacement = req.body.placement;
  }

  let nextSize: AdSize | null = null;
  if (req.body?.size !== undefined) {
    if (!isValidSize(req.body.size)) {
      res.status(400).json({
        error: `Size must be one of: ${VALID_SIZES.join(", ")}.`,
      });
      return;
    }
    nextSize = req.body.size;
  }

  if (existing) {
    const mergedPlacement = nextPlacement ?? existing.placement;
    const mergedSize = nextSize ?? existing.size;
    if (!PLACEMENT_SIZE_COMPAT[mergedPlacement].includes(mergedSize)) {
      res.status(400).json({
        error: `${mergedSize} is not allowed in the ${mergedPlacement} placement. Allowed sizes: ${PLACEMENT_SIZE_COMPAT[mergedPlacement].join(", ")}.`,
      });
      return;
    }
    // Re-validate dimensions when either the image_url or the declared
    // size changes — both invalidate the prior check.
    const nextImageUrl =
      typeof req.body?.image_url === "string"
        ? clampString(req.body.image_url, 2048).trim()
        : existing.image_url;
    if (req.body?.image_url !== undefined || nextSize) {
      try {
        await assertImageMatchesSize(nextImageUrl, mergedSize);
      } catch (err) {
        res.status(400).json({ error: (err as Error).message });
        return;
      }
    }
  }

  if (nextPlacement) {
    fields.push(`placement = $${idx++}`);
    params.push(nextPlacement);
  }
  if (nextSize) {
    fields.push(`size = $${idx++}`);
    params.push(nextSize);
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

  try {
    const { rows } = await pool.query<AdRow>(
      `UPDATE advertisements SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      params
    );
    if (rows.length === 0) {
      res.status(404).json({ error: "Ad not found." });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    if (isUniqueViolation(err)) {
      res.status(409).json({
        error: "Sort order already used in this placement. Pick a different number.",
      });
      return;
    }
    throw err;
  }
});

// ── Admin: delete ad ───────────────────────────────────────────
//
// We don't try to clean up the underlying creative file — the same upload
// can be reused across ads, and the media library/orphan sweep handles
// stale uploads.
router.delete("/:id", requireAnyAuth, requireAdsPermission, async (req: AuthRequest, res) => {
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
