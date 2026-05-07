/**
 * Sync article images into the media library.
 *
 *   tsx src/syncMediaLibrary.ts            # dry run (default)
 *   tsx src/syncMediaLibrary.ts --apply    # download + register in DB
 *
 * What it does:
 *   1. Scans every `news.image_url` in the database.
 *   2. For external HTTP(S) URLs (e.g. Unsplash): downloads the image,
 *      saves it to the uploads directory, registers it in the `media`
 *      table, and rewrites the article's `image_url` to the local
 *      `/uploads/<key>` path. This makes the image appear in the media
 *      gallery and ensures it loads even if the external source goes down.
 *   3. For `/uploads/<key>` paths where the file is missing on disk:
 *      marks them as broken (optionally resets to empty).
 *   4. Skips articles that already have a working local upload.
 *
 * Idempotent — safe to re-run. Dedup via SHA-256 checksum.
 */

import "dotenv/config";
import { createHash, randomUUID } from "crypto";
import { existsSync } from "fs";
import { join } from "path";
import pool from "./db.js";
import { getStorage } from "./services/storage.js";
import { detectMimeFromBytes, extensionFor, type AllowedMime } from "./services/imageValidation.js";
import { imageSize } from "image-size";

const DRY_RUN = !process.argv.includes("--apply");

interface NewsRow {
  id: number;
  title: string;
  image_url: string | null;
}

interface MediaRow {
  id: string;
  storage_key: string | null;
}

interface Stats {
  articles: number;
  external: number;
  externalDownloaded: number;
  externalFailed: number;
  externalDeduped: number;
  brokenUploads: number;
  brokenReset: number;
  alreadyLocal: number;
  skippedEmpty: number;
  contentBrokenImgs: number;
  contentImgsRemoved: number;
}

const stats: Stats = {
  articles: 0,
  external: 0,
  externalDownloaded: 0,
  externalFailed: 0,
  externalDeduped: 0,
  brokenUploads: 0,
  brokenReset: 0,
  alreadyLocal: 0,
  skippedEmpty: 0,
  contentBrokenImgs: 0,
  contentImgsRemoved: 0,
};

/**
 * Download an image from a URL and return the buffer.
 * Follows redirects and respects a 15-second timeout.
 */
async function downloadImage(url: string): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "ShareSanskar-MediaSync/1.0" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Import a downloaded buffer into storage + media table.
 * Returns the public URL or null if it fails validation.
 */
async function importBuffer(
  buf: Buffer,
  originalUrl: string
): Promise<string | null> {
  const mime = detectMimeFromBytes(buf);
  if (!mime) {
    console.log(`    ⚠ Not a valid image (bad magic bytes), skipping`);
    return null;
  }

  const ext = extensionFor(mime);
  let width = 0;
  let height = 0;
  try {
    const dims = imageSize(buf);
    width = dims.width || 0;
    height = dims.height || 0;
  } catch {
    // non-fatal — we'll just store 0×0
  }

  const checksum = createHash("sha256").update(buf).digest("hex");

  // Dedup — same bytes already in library?
  const existing = await pool.query<{ storage_key: string | null }>(
    "SELECT storage_key FROM media WHERE checksum = $1 LIMIT 1",
    [checksum]
  );
  if (existing.rows.length > 0 && existing.rows[0].storage_key) {
    stats.externalDeduped += 1;
    return getStorage().publicUrl(existing.rows[0].storage_key);
  }

  if (DRY_RUN) {
    stats.externalDownloaded += 1;
    return "<dry-run>";
  }

  const storage = getStorage();
  const { key } = await storage.put(buf, ext, mime);

  await pool.query(
    `INSERT INTO media
       (id, storage_key, external_url, original_name, mime_type, size_bytes,
        width, height, checksum, alt_text, caption, source, uploader_role)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, '', '', 'imported', 'system')
     ON CONFLICT (checksum) WHERE checksum IS NOT NULL DO NOTHING`,
    [
      randomUUID(),
      key,
      originalUrl,
      originalUrl.split("/").pop()?.split("?")[0] || "image",
      mime,
      buf.length,
      width,
      height,
      checksum,
    ]
  );

  stats.externalDownloaded += 1;
  return storage.publicUrl(key);
}

async function main() {
  console.log(
    DRY_RUN
      ? "🔎 DRY RUN — no files or DB rows will be written. Pass --apply to commit."
      : "🚚 APPLY — images will be downloaded and articles will be updated."
  );

  const storage = getStorage();

  const { rows } = await pool.query<NewsRow>(
    "SELECT id, title, image_url FROM news ORDER BY id ASC"
  );
  stats.articles = rows.length;
  console.log(`\nFound ${rows.length} articles to process.\n`);

  for (const row of rows) {
    const url = row.image_url?.trim() || "";
    const label = `#${row.id} "${row.title.slice(0, 50)}"`;

    // ── Empty ──
    if (!url) {
      stats.skippedEmpty += 1;
      continue;
    }

    // ── Already a local /uploads/... path ──
    if (url.startsWith("/uploads/")) {
      const key = url.replace("/uploads/", "");
      const filePath = join(storage.directory, key);
      if (existsSync(filePath)) {
        stats.alreadyLocal += 1;

        // Make sure it's in the media table too
        const inMedia = await pool.query(
          "SELECT id FROM media WHERE storage_key = $1 LIMIT 1",
          [key]
        );
        if (inMedia.rows.length === 0 && !DRY_RUN) {
          // Read the file and register it
          const { readFileSync } = await import("fs");
          const buf = readFileSync(filePath);
          const mime = detectMimeFromBytes(buf);
          if (mime) {
            const checksum = createHash("sha256").update(buf).digest("hex");
            let width = 0, height = 0;
            try {
              const dims = imageSize(buf);
              width = dims.width || 0;
              height = dims.height || 0;
            } catch { /* non-fatal */ }
            await pool.query(
              `INSERT INTO media
                 (id, storage_key, mime_type, size_bytes, width, height,
                  checksum, alt_text, caption, source, uploader_role)
               VALUES ($1, $2, $3, $4, $5, $6, $7, '', '', 'imported', 'system')
               ON CONFLICT (checksum) WHERE checksum IS NOT NULL DO NOTHING`,
              [randomUUID(), key, mime, buf.length, width, height, checksum]
            );
            console.log(`  ✓ ${label}: registered existing file in media library`);
          }
        }
        continue;
      }

      // File is missing on disk
      stats.brokenUploads += 1;
      console.log(`  ✗ ${label}: file missing at ${filePath}`);
      if (!DRY_RUN) {
        // Reset broken image_url to empty so it doesn't 404
        await pool.query(
          "UPDATE news SET image_url = '', updated_at = NOW() WHERE id = $1",
          [row.id]
        );
        stats.brokenReset += 1;
        console.log(`    → Reset image_url to empty`);
      }
      continue;
    }

    // ── External HTTP(S) URL ──
    if (url.startsWith("http://") || url.startsWith("https://")) {
      stats.external += 1;
      console.log(`  ↓ ${label}: downloading ${url.slice(0, 80)}...`);

      try {
        const buf = await downloadImage(url);
        const localUrl = await importBuffer(buf, url);

        if (localUrl && !DRY_RUN && localUrl !== "<dry-run>") {
          await pool.query(
            "UPDATE news SET image_url = $1, updated_at = NOW() WHERE id = $2",
            [localUrl, row.id]
          );
          console.log(`    ✓ Saved as ${localUrl}`);
        } else if (localUrl) {
          console.log(`    ✓ Would save as local upload`);
        }
      } catch (err) {
        stats.externalFailed += 1;
        console.log(`    ✗ Failed: ${(err as Error).message}`);
      }
      continue;
    }

    // ── data: URL or unknown format ──
    console.log(`  ? ${label}: unhandled URL format, skipping`);
  }

  // ── Repair article bodies: strip broken /uploads/... <img> tags ──
  // Without this, an article whose featured image was repaired above can
  // still 404 because its body HTML references the same missing key.
  console.log("\n── Scanning article content for broken /uploads/ images ──");
  const contentRows = await pool.query<{ id: number; content: string | null }>(
    "SELECT id, content FROM news WHERE content IS NOT NULL AND content != '' ORDER BY id ASC"
  );

  // Match a full <img ...> tag so we can drop the whole element when its
  // source is a missing /uploads/<key>. Matches single- or double-quoted
  // src attributes; stops at the next > to avoid swallowing trailing markup.
  const IMG_TAG_REGEX = /<img\b[^>]*\bsrc=(['"])([^'"]+)\1[^>]*>/gi;

  for (const row of contentRows.rows) {
    if (!row.content) continue;
    let updatedContent = row.content;
    let removedHere = 0;
    // Iterate matches manually so we can rebuild the string without each
    // dropped tag without reshuffling indices via splice.
    updatedContent = updatedContent.replace(IMG_TAG_REGEX, (full, _quote, src) => {
      if (typeof src !== "string" || !src.startsWith("/uploads/")) return full;
      const key = src.replace("/uploads/", "");
      const filePath = join(storage.directory, key);
      if (existsSync(filePath)) return full; // healthy — leave it alone
      stats.contentBrokenImgs += 1;
      removedHere += 1;
      return ""; // drop the entire <img> tag
    });

    if (removedHere > 0) {
      console.log(`  ✗ #${row.id}: removed ${removedHere} broken /uploads image(s)`);
      if (!DRY_RUN) {
        await pool.query(
          "UPDATE news SET content = $1, updated_at = NOW() WHERE id = $2",
          [updatedContent, row.id]
        );
        stats.contentImgsRemoved += removedHere;
      }
    }
  }

  // ── Also register any content-embedded external images ──
  console.log("\n── Scanning article content for external images ──");
  const IMG_SRC_REGEX = /<img\b[^>]*\bsrc=(['"])([^'"]+)\1/gi;
  let contentImages = 0;

  for (const row of contentRows.rows) {
    if (!row.content) continue;
    const matches = row.content.matchAll(IMG_SRC_REGEX);
    for (const m of matches) {
      const src = m[2];
      if (!src.startsWith("http://") && !src.startsWith("https://")) continue;

      // Check if already in library
      const exists = await pool.query(
        "SELECT id FROM media WHERE external_url = $1 LIMIT 1",
        [src]
      );
      if (exists.rows.length > 0) continue;

      contentImages += 1;
      if (!DRY_RUN) {
        await pool.query(
          `INSERT INTO media (id, external_url, mime_type, source, alt_text, caption, uploader_role)
           VALUES ($1, $2, 'image/external', 'imported', '', '', 'system')`,
          [randomUUID(), src]
        );
      }
    }
  }
  console.log(`  Found ${contentImages} new content-embedded images to register.`);

  // ── Summary ──
  console.log("\n──────── Sync summary ────────");
  for (const [k, v] of Object.entries(stats)) {
    console.log(`  ${k.padEnd(24)} ${v}`);
  }
  if (DRY_RUN) {
    console.log("\nNothing was written. Re-run with --apply to commit changes.");
  } else {
    console.log("\n✅ Done! Restart the backend server to serve the new files.");
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
