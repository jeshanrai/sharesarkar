import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// In ESM, static imports are evaluated before the importing module's own code,
// so process.env is not fully populated from dotenv at this point.
// Validation of JWT_SECRET is performed in index.ts inside validateConfig(),
// which runs synchronously after app.listen() — by that point dotenv has run.
export const JWT_SECRET =
  process.env.JWT_SECRET || "sharesanskar-admin-secret-change-in-production";

/** The well-known placeholder that ships with the repo — never use in production. */
export const JWT_DEFAULT_PLACEHOLDER = "sharesanskar-admin-secret-change-in-production";


export type UserRole = "admin" | "author";

export interface AuthRequest extends Request {
  userId?: number;
  userRole?: UserRole;
}

/**
 * Require any authenticated user (admin OR author).
 * Populates req.userId and req.userRole.
 */
export function requireAnyAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: UserRole };
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

/**
 * Require admin role only. Rejects authors.
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  requireAnyAuth(req, res, () => {
    if (req.userRole !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  });
}

/**
 * Require author role (also allows admin as a superset).
 */
export function requireAuthor(req: AuthRequest, res: Response, next: NextFunction) {
  requireAnyAuth(req, res, () => {
    if (req.userRole !== "author" && req.userRole !== "admin") {
      res.status(403).json({ error: "Author access required" });
      return;
    }
    next();
  });
}
