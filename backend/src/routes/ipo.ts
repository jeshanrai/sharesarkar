import { Router } from "express";
import pool from "../db.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();

// --- Public routes ---

router.get("/", async (req, res) => {
  const { status } = req.query;

  let query = "SELECT * FROM ipo_listings WHERE is_published = TRUE";
  const params: string[] = [];

  if (status) {
    query += " AND status = $1";
    params.push(status as string);
  }

  query += " ORDER BY CASE status WHEN 'open' THEN 1 WHEN 'upcoming' THEN 2 WHEN 'closed' THEN 3 WHEN 'listed' THEN 4 END, open_date DESC";

  const { rows } = await pool.query(query, params);
  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM ipo_listings WHERE id = $1", [req.params.id]);
  if (rows.length === 0) {
    res.status(404).json({ error: "IPO not found" });
    return;
  }
  res.json(rows[0]);
});

// --- Admin CRUD ---

router.get("/admin/all", requireAuth, async (_req: AuthRequest, res) => {
  const { rows } = await pool.query("SELECT * FROM ipo_listings ORDER BY created_at DESC");
  res.json(rows);
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const { company_name, symbol, sector, share_type, units, price_per_unit, total_amount, open_date, close_date, listing_date, status } = req.body;

  if (!company_name || !symbol) {
    res.status(400).json({ error: "Company name and symbol are required" });
    return;
  }

  const { rows } = await pool.query(
    `INSERT INTO ipo_listings (company_name, symbol, sector, share_type, units, price_per_unit, total_amount, open_date, close_date, listing_date, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [
      company_name, symbol, sector || "Others", share_type || "IPO",
      units || 0, price_per_unit || 100, total_amount || "",
      open_date || null, close_date || null, listing_date || null,
      status || "upcoming",
    ]
  );
  res.status(201).json(rows[0]);
});

router.put("/:id", requireAuth, async (req: AuthRequest, res) => {
  const { rows: existing } = await pool.query("SELECT * FROM ipo_listings WHERE id = $1", [req.params.id]);
  if (existing.length === 0) {
    res.status(404).json({ error: "IPO not found" });
    return;
  }

  const old = existing[0];
  const { company_name, symbol, sector, share_type, units, price_per_unit, total_amount, open_date, close_date, listing_date, status, is_published } = req.body;

  const { rows } = await pool.query(
    `UPDATE ipo_listings SET company_name=$1, symbol=$2, sector=$3, share_type=$4, units=$5, price_per_unit=$6,
     total_amount=$7, open_date=$8, close_date=$9, listing_date=$10, status=$11, is_published=$12, updated_at=NOW()
     WHERE id=$13 RETURNING *`,
    [
      company_name ?? old.company_name, symbol ?? old.symbol, sector ?? old.sector,
      share_type ?? old.share_type, units ?? old.units, price_per_unit ?? old.price_per_unit,
      total_amount ?? old.total_amount, open_date !== undefined ? open_date : old.open_date,
      close_date !== undefined ? close_date : old.close_date, listing_date !== undefined ? listing_date : old.listing_date,
      status ?? old.status, is_published ?? old.is_published, req.params.id,
    ]
  );
  res.json(rows[0]);
});

router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  await pool.query("DELETE FROM ipo_listings WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

export default router;
