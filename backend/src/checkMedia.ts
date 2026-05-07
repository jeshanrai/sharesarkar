/**
 * Media library reconciler — DB ↔ disk drift check.
 *
 *   tsx src/checkMedia.ts          # report only (default)
 *   tsx src/checkMedia.ts --prune  # also delete media rows whose files are missing
 *
 * Different from `syncMediaLibrary.ts`, which works on `news.image_url`.
 * This script only inspects the `media` table and the storage directory.
 *
 * Reports two kinds of drift:
 *
 *   1. media rows whose storage_key file no longer exists on disk. These
 *      cause 404s from /uploads/<key> and 400s from Next's image optimiser.
 *      `--prune` removes the rows.
 *
 *   2. Files on disk that no media row references ("orphans"). Reported only
 *      — we never auto-delete files because article HTML may still reference
 *      them outside the media table.
 *
 * Use whenever you change MEDIA_DIR, restore from a backup, or move between
 * environments.
 */

import "dotenv/config";
import { readdirSync } from "fs";
import pool from "./db.js";
import { getStorage } from "./services/storage.js";

const PRUNE = process.argv.includes("--prune");

interface MediaRow {
  id: string;
  storage_key: string | null;
  external_url: string | null;
  original_name: string | null;
  source: string;
  created_at: string;
}

async function main() {
  const storage = getStorage();
  const dir = storage.directory;

  console.log(`🔎 Scanning media library`);
  console.log(`   Storage dir: ${dir}`);
  console.log(`   Mode:        ${PRUNE ? "PRUNE (will delete dangling DB rows)" : "REPORT only"}\n`);

  let onDisk: Set<string>;
  try {
    onDisk = new Set(readdirSync(dir));
  } catch (err) {
    console.error(`Could not read ${dir}: ${(err as Error).message}`);
    process.exit(1);
  }

  const { rows } = await pool.query<MediaRow>(
    "SELECT id, storage_key, external_url, original_name, source, created_at FROM media ORDER BY created_at DESC"
  );

  let externalRows = 0;
  const dangling: MediaRow[] = [];
  const referencedOnDisk = new Set<string>();

  for (const row of rows) {
    if (!row.storage_key) {
      externalRows += 1;
      continue;
    }
    if (onDisk.has(row.storage_key)) {
      referencedOnDisk.add(row.storage_key);
    } else {
      dangling.push(row);
    }
  }

  const orphanFiles = [...onDisk].filter((f) => !referencedOnDisk.has(f) && !f.startsWith("."));

  console.log("──────── Snapshot ────────");
  console.log(`  DB rows total        : ${rows.length}`);
  console.log(`  └─ external URLs     : ${externalRows}`);
  console.log(`  └─ healthy uploads   : ${referencedOnDisk.size}`);
  console.log(`  └─ DANGLING (no file): ${dangling.length}`);
  console.log(`  Files on disk        : ${onDisk.size}`);
  console.log(`  └─ ORPHAN (no row)   : ${orphanFiles.length}`);
  console.log("");

  if (dangling.length > 0) {
    console.log("Dangling DB rows (file missing on disk):");
    for (const row of dangling.slice(0, 25)) {
      const name = row.original_name || "(no name)";
      console.log(`  • ${row.storage_key}   ${row.source.padEnd(8)}  ${name}`);
    }
    if (dangling.length > 25) console.log(`  …and ${dangling.length - 25} more`);
    console.log("");
  }

  if (orphanFiles.length > 0) {
    console.log("Orphan files on disk (no DB row points at them):");
    for (const f of orphanFiles.slice(0, 25)) console.log(`  • ${f}`);
    if (orphanFiles.length > 25) console.log(`  …and ${orphanFiles.length - 25} more`);
    console.log("");
    console.log("Orphans are NOT auto-deleted — they may still be referenced by");
    console.log("article HTML that this script can't inspect.");
    console.log("");
  }

  if (PRUNE && dangling.length > 0) {
    const ids = dangling.map((d) => d.id);
    await pool.query("DELETE FROM media WHERE id = ANY($1::uuid[])", [ids]);
    console.log(`✓ Pruned ${ids.length} dangling DB row(s).`);
  } else if (dangling.length > 0) {
    console.log("Re-run with --prune to delete the dangling DB rows.");
  } else if (orphanFiles.length === 0) {
    console.log("✓ No drift — DB and disk agree.");
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
