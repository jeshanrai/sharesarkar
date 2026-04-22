import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import { JWT_SECRET, requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }

  const { rows } = await pool.query("SELECT * FROM admin_users WHERE username = $1", [username]);
  const user = rows[0];

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = jwt.sign({ id: user.id, role: "admin" }, JWT_SECRET, { expiresIn: "24h" });
  res.json({ token, username: user.username });
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const { rows } = await pool.query(
    "SELECT id, username, created_at FROM admin_users WHERE id = $1",
    [req.adminId]
  );

  if (rows.length === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(rows[0]);
});

export default router;
