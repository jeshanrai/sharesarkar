import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import { JWT_SECRET, requireAuth, requireAnyAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();

// ─── Admin login ────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }

  // Try admin_users first
  const { rows: adminRows } = await pool.query(
    "SELECT * FROM admin_users WHERE username = $1",
    [username]
  );

  if (adminRows.length > 0) {
    const admin = adminRows[0];
    if (!bcrypt.compareSync(password, admin.password_hash)) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const token = jwt.sign({ id: admin.id, role: "admin" }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ token, username: admin.username, role: "admin" });
    return;
  }

  // Try authors table
  const { rows: authorRows } = await pool.query(
    "SELECT * FROM authors WHERE username = $1",
    [username]
  );

  if (authorRows.length > 0) {
    const author = authorRows[0];

    if (!author.is_active) {
      res.status(403).json({ error: "Account is deactivated. Contact admin." });
      return;
    }

    if (!bcrypt.compareSync(password, author.password_hash)) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = jwt.sign({ id: author.id, role: "author" }, JWT_SECRET, { expiresIn: "24h" });
    res.json({
      token,
      username: author.username,
      role: "author",
      permissions: {
        can_create_news: author.can_create_news,
        can_edit_own_news: author.can_edit_own_news,
        can_publish: author.can_publish,
        can_manage_videos: author.can_manage_videos,
        can_manage_ads: author.can_manage_ads,
      },
    });
    return;
  }

  res.status(401).json({ error: "Invalid credentials" });
});

// ─── Get current user info ──────────────────────────────────────
router.get("/me", requireAnyAuth, async (req: AuthRequest, res) => {
  if (req.userRole === "admin") {
    const { rows } = await pool.query(
      "SELECT id, username, full_name, created_at FROM admin_users WHERE id = $1",
      [req.userId]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ ...rows[0], role: "admin" });
    return;
  }

  // Author
  const { rows } = await pool.query(
    "SELECT id, username, full_name, email, is_active, can_create_news, can_edit_own_news, can_publish, can_manage_videos, can_manage_ads, created_at FROM authors WHERE id = $1",
    [req.userId]
  );
  if (rows.length === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ ...rows[0], role: "author" });
});

// ─── Update own profile (admin or author) ───────────────────────
router.put("/me", requireAnyAuth, async (req: AuthRequest, res) => {
  const { full_name, email } = req.body || {};

  if (req.userRole === "admin") {
    // Admins can edit their display byline (full_name). Username is fixed.
    const { rows: existing } = await pool.query(
      "SELECT id, full_name FROM admin_users WHERE id = $1",
      [req.userId]
    );
    if (existing.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const nextName = typeof full_name === "string" && full_name.trim()
      ? full_name.trim().slice(0, 120)
      : existing[0].full_name;
    const { rows } = await pool.query(
      `UPDATE admin_users SET full_name = $1 WHERE id = $2
       RETURNING id, username, full_name, created_at`,
      [nextName, req.userId]
    );
    res.json({ ...rows[0], role: "admin" });
    return;
  }

  // Author can update full_name and email
  const { rows: existing } = await pool.query(
    "SELECT * FROM authors WHERE id = $1",
    [req.userId]
  );
  if (existing.length === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const old = existing[0];

  const { rows } = await pool.query(
    `UPDATE authors SET full_name = $1, email = $2, updated_at = NOW()
     WHERE id = $3
     RETURNING id, username, full_name, email, is_active, can_create_news, can_edit_own_news, can_publish, can_manage_videos, can_manage_ads, created_at, updated_at`,
    [full_name ?? old.full_name, email ?? old.email, req.userId]
  );
  res.json({ ...rows[0], role: "author" });
});

// ─── Change own password (admin or author) ──────────────────────
router.post("/me/password", requireAnyAuth, async (req: AuthRequest, res) => {
  const { current_password, new_password } = req.body || {};

  if (!current_password || !new_password) {
    res.status(400).json({ error: "Current and new passwords are required" });
    return;
  }
  if (String(new_password).length < 6) {
    res.status(400).json({ error: "New password must be at least 6 characters" });
    return;
  }

  const table = req.userRole === "admin" ? "admin_users" : "authors";
  const { rows } = await pool.query(
    `SELECT id, password_hash FROM ${table} WHERE id = $1`,
    [req.userId]
  );
  if (rows.length === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (!bcrypt.compareSync(current_password, rows[0].password_hash)) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  const newHash = bcrypt.hashSync(new_password, 10);
  await pool.query(
    `UPDATE ${table} SET password_hash = $1${req.userRole === "author" ? ", updated_at = NOW()" : ""} WHERE id = $2`,
    [newHash, req.userId]
  );

  res.json({ success: true, message: "Password updated successfully" });
});

// ─── Author management (admin only) ────────────────────────────

// List all authors
router.get("/authors", requireAuth, async (_req: AuthRequest, res) => {
  const { rows } = await pool.query(
    "SELECT id, username, full_name, email, is_active, can_create_news, can_edit_own_news, can_publish, can_manage_videos, can_manage_ads, created_at, updated_at FROM authors ORDER BY created_at DESC"
  );
  res.json(rows);
});

// Create author
router.post("/authors", requireAuth, async (req: AuthRequest, res) => {
  const { username, full_name, email, password, can_create_news, can_edit_own_news, can_publish, can_manage_videos, can_manage_ads } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  // Check uniqueness against both tables
  const { rows: existingAdmin } = await pool.query("SELECT id FROM admin_users WHERE username = $1", [username]);
  const { rows: existingAuthor } = await pool.query("SELECT id FROM authors WHERE username = $1", [username]);
  if (existingAdmin.length > 0 || existingAuthor.length > 0) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO authors (username, full_name, email, password_hash, can_create_news, can_edit_own_news, can_publish, can_manage_videos, can_manage_ads)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, username, full_name, email, is_active, can_create_news, can_edit_own_news, can_publish, can_manage_videos, can_manage_ads, created_at`,
    [
      username,
      full_name || "",
      email || "",
      passwordHash,
      can_create_news ?? true,
      can_edit_own_news ?? true,
      can_publish ?? false,
      can_manage_videos ?? false,
      can_manage_ads ?? false,
    ]
  );

  res.status(201).json(rows[0]);
});

// Update author (permissions, info, or password reset)
router.put("/authors/:id", requireAuth, async (req: AuthRequest, res) => {
  const { full_name, email, password, is_active, can_create_news, can_edit_own_news, can_publish, can_manage_videos, can_manage_ads } = req.body;

  const { rows: existing } = await pool.query("SELECT * FROM authors WHERE id = $1", [req.params.id]);
  if (existing.length === 0) {
    res.status(404).json({ error: "Author not found" });
    return;
  }

  const old = existing[0];

  let passwordHash = old.password_hash;
  if (password && password.length >= 6) {
    passwordHash = bcrypt.hashSync(password, 10);
  }

  const { rows } = await pool.query(
    `UPDATE authors SET full_name = $1, email = $2, password_hash = $3, is_active = $4,
     can_create_news = $5, can_edit_own_news = $6, can_publish = $7, can_manage_videos = $8, can_manage_ads = $9, updated_at = NOW()
     WHERE id = $10
     RETURNING id, username, full_name, email, is_active, can_create_news, can_edit_own_news, can_publish, can_manage_videos, can_manage_ads, created_at, updated_at`,
    [
      full_name ?? old.full_name,
      email ?? old.email,
      passwordHash,
      is_active ?? old.is_active,
      can_create_news ?? old.can_create_news,
      can_edit_own_news ?? old.can_edit_own_news,
      can_publish ?? old.can_publish,
      can_manage_videos ?? old.can_manage_videos,
      can_manage_ads ?? old.can_manage_ads,
      req.params.id,
    ]
  );

  res.json(rows[0]);
});

// Delete author
router.delete("/authors/:id", requireAuth, async (req: AuthRequest, res) => {
  const { rows } = await pool.query("SELECT id FROM authors WHERE id = $1", [req.params.id]);
  if (rows.length === 0) {
    res.status(404).json({ error: "Author not found" });
    return;
  }

  await pool.query("DELETE FROM authors WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

export default router;
