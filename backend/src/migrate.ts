import "dotenv/config";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pool from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const migrationsDir = join(dirname(__filename), "..", "migrations");

async function run() {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("No migration files found.");
    process.exit(0);
  }

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    console.log(`▶ Running ${file}...`);
    try {
      await pool.query(sql);
      console.log(`✓ ${file}`);
    } catch (e) {
      console.error(`✗ ${file}:`, (e as Error).message);
      process.exit(1);
    }
  }

  await pool.end();
  console.log("All migrations applied.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
