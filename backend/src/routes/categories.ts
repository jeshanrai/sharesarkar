import { Router } from "express";
import pool from "../db.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();

// --- Helper: generate slug ---
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120);
}

interface CategoryRow {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  sort_order: number;
  created_at: string;
}

interface CategoryNode extends CategoryRow {
  children: CategoryNode[];
}

/**
 * Build a tree from a flat list of category rows.
 * Returns an array of root-level nodes, each with nested `children`.
 */
function buildTree(rows: CategoryRow[]): CategoryNode[] {
  const map = new Map<number, CategoryNode>();
  const roots: CategoryNode[] = [];

  // First pass: create nodes
  for (const row of rows) {
    map.set(row.id, { ...row, children: [] });
  }

  // Second pass: wire parent→child
  for (const node of map.values()) {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort children by sort_order at each level
  function sortChildren(nodes: CategoryNode[]) {
    nodes.sort((a, b) => a.sort_order - b.sort_order);
    for (const n of nodes) sortChildren(n.children);
  }
  sortChildren(roots);

  return roots;
}

// ─── Public: get full category tree ──────────────────────────────
router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM categories ORDER BY sort_order ASC, name ASC"
    );
    const tree = buildTree(rows);
    res.json({ tree, flat: rows });
  } catch (err) {
    console.error("Failed to fetch categories:", err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// ─── Admin: create category ──────────────────────────────────────
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const { name, parent_id, sort_order } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Category name is required" });
    return;
  }

  const trimmed = name.trim().slice(0, 60);
  let slug = slugify(trimmed);
  if (!slug) slug = `category-${Date.now()}`;

  // If parent_id is provided, validate it exists and check depth
  if (parent_id) {
    const { rows: parentRows } = await pool.query(
      "SELECT id FROM categories WHERE id = $1",
      [parent_id]
    );
    if (parentRows.length === 0) {
      res.status(400).json({ error: "Parent category not found" });
      return;
    }

    // Check depth — max 3 levels (root=1, child=2, grandchild=3)
    const depth = await getDepth(parent_id);
    if (depth >= 3) {
      res.status(400).json({ error: "Maximum nesting depth is 3 levels" });
      return;
    }
  }

  // Ensure slug uniqueness
  const { rows: existing } = await pool.query(
    "SELECT id FROM categories WHERE slug = $1",
    [slug]
  );
  if (existing.length > 0) {
    slug = `${slug}-${Date.now()}`;
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO categories (name, slug, parent_id, sort_order)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [trimmed, slug, parent_id || null, sort_order ?? 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Failed to create category:", err);
    res.status(500).json({ error: "Failed to create category" });
  }
});

// ─── Admin: update category ──────────────────────────────────────
router.put("/:id", requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { name, parent_id, sort_order } = req.body;

  const { rows: existing } = await pool.query(
    "SELECT * FROM categories WHERE id = $1",
    [id]
  );
  if (existing.length === 0) {
    res.status(404).json({ error: "Category not found" });
    return;
  }

  const old = existing[0];
  const finalName = (typeof name === "string" && name.trim()) ? name.trim().slice(0, 60) : old.name;
  const finalParentId = parent_id !== undefined ? (parent_id || null) : old.parent_id;
  const finalSortOrder = sort_order !== undefined ? sort_order : old.sort_order;

  // Prevent circular references
  if (finalParentId === parseInt(id as string, 10)) {
    res.status(400).json({ error: "A category cannot be its own parent" });
    return;
  }

  // Check if moving under a new parent would exceed depth
  if (finalParentId && finalParentId !== old.parent_id) {
    const parentDepth = await getDepth(finalParentId);
    const subtreeDepth = await getSubtreeDepth(parseInt(id as string, 10));
    if (parentDepth + subtreeDepth >= 3) {
      res.status(400).json({ error: "Moving here would exceed maximum nesting depth of 3" });
      return;
    }

    // Prevent moving under own descendant
    if (await isDescendant(parseInt(id as string, 10), finalParentId)) {
      res.status(400).json({ error: "Cannot move a category under its own descendant" });
      return;
    }
  }

  // Regenerate slug if name changed
  let slug = old.slug;
  if (finalName !== old.name) {
    slug = slugify(finalName) || old.slug;
    const { rows: slugCheck } = await pool.query(
      "SELECT id FROM categories WHERE slug = $1 AND id != $2",
      [slug, id]
    );
    if (slugCheck.length > 0) {
      slug = `${slug}-${Date.now()}`;
    }
  }

  try {
    const { rows } = await pool.query(
      `UPDATE categories SET name = $1, slug = $2, parent_id = $3, sort_order = $4
       WHERE id = $5 RETURNING *`,
      [finalName, slug, finalParentId, finalSortOrder, id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error("Failed to update category:", err);
    res.status(500).json({ error: "Failed to update category" });
  }
});

// ─── Admin: delete category ──────────────────────────────────────
router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;

  // Check for children
  const { rows: children } = await pool.query(
    "SELECT id FROM categories WHERE parent_id = $1 LIMIT 1",
    [id]
  );
  if (children.length > 0) {
    res.status(400).json({
      error: "Cannot delete a category that has subcategories. Delete or move its children first.",
    });
    return;
  }

  try {
    const { rowCount } = await pool.query(
      "DELETE FROM categories WHERE id = $1",
      [id]
    );
    if (rowCount === 0) {
      res.status(404).json({ error: "Category not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to delete category:", err);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

// ─── Helper: get depth of a category (1 = root) ────────────────
async function getDepth(categoryId: number): Promise<number> {
  let depth = 0;
  let current: number | null = categoryId;
  while (current) {
    depth++;
    const result: { rows: { parent_id: number | null }[] } = await pool.query(
      "SELECT parent_id FROM categories WHERE id = $1",
      [current]
    );
    current = result.rows.length > 0 ? result.rows[0].parent_id : null;
  }
  return depth;
}

// ─── Helper: max depth of subtree below a category ──────────────
async function getSubtreeDepth(categoryId: number): Promise<number> {
  const { rows: children } = await pool.query(
    "SELECT id FROM categories WHERE parent_id = $1",
    [categoryId]
  );
  if (children.length === 0) return 1;
  let maxChild = 0;
  for (const child of children) {
    const d = await getSubtreeDepth(child.id);
    if (d > maxChild) maxChild = d;
  }
  return 1 + maxChild;
}

// ─── Helper: is `targetId` a descendant of `ancestorId`? ────────
async function isDescendant(ancestorId: number, targetId: number): Promise<boolean> {
  const { rows: children } = await pool.query(
    "SELECT id FROM categories WHERE parent_id = $1",
    [ancestorId]
  );
  for (const child of children) {
    if (child.id === targetId) return true;
    if (await isDescendant(child.id, targetId)) return true;
  }
  return false;
}

export default router;
