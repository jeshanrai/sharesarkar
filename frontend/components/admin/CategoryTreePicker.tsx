"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, ChevronDown, Plus, Check, FolderTree } from "lucide-react";

interface CategoryNode {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  sort_order: number;
  children: CategoryNode[];
}

interface Props {
  /** Currently selected category names (matches the form.categories array). */
  values: string[];
  onChange: (next: string[]) => void;
  /** Hard cap on chip count. */
  max: number;
  /** Per-chip max length. */
  maxLength: number;
  /** Marks the first chip as the "primary" label. */
  primaryLabel?: string;
  helpText?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/**
 * Nested category picker for the news create/edit forms.
 *
 * Displays a collapsible category tree with checkboxes. The first selected
 * category is treated as the "primary" category (displayed with a badge).
 * Includes inline "Add subcategory" creation at each level.
 */
export default function CategoryTreePicker({
  values,
  onChange,
  max,
  maxLength,
  primaryLabel,
  helpText,
}: Props) {
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [addingTo, setAddingTo] = useState<number | null | "root">(null);
  const [newName, setNewName] = useState("");
  const addInputRef = useRef<HTMLInputElement | null>(null);

  // Load category tree
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/categories`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setTree(data.tree || []);
            // Auto-expand nodes that contain selected values
            const expandIds = new Set<number>();
            function walkForSelected(nodes: CategoryNode[]) {
              for (const node of nodes) {
                const hasSelected =
                  values.includes(node.name) ||
                  node.children.some((c) => values.includes(c.name));
                if (hasSelected || node.children.length > 0) {
                  // Expand ancestors of selected items
                  if (nodeContainsSelected(node, values)) {
                    expandIds.add(node.id);
                  }
                }
                walkForSelected(node.children);
              }
            }
            walkForSelected(data.tree || []);
            setExpanded(expandIds);
          }
        }
      } catch {
        // keep empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus the add input when it appears
  useEffect(() => {
    if (addingTo !== null) {
      setTimeout(() => addInputRef.current?.focus(), 50);
    }
  }, [addingTo]);

  const lowerValues = useMemo(
    () => new Set(values.map((v) => v.toLowerCase())),
    [values]
  );

  function toggleSelect(name: string) {
    const lower = name.toLowerCase();
    if (lowerValues.has(lower)) {
      onChange(values.filter((v) => v.toLowerCase() !== lower));
    } else {
      if (values.length >= max) return;
      onChange([...values, name]);
    }
  }

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAddCategory(parentId: number | null) {
    const trimmed = newName.trim().slice(0, maxLength);
    if (!trimmed) return;

    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: trimmed,
          parent_id: parentId,
          sort_order: 0,
        }),
      });
      if (res.ok) {
        // Reload tree
        const treeRes = await fetch(`${API_URL}/api/categories`);
        if (treeRes.ok) {
          const data = await treeRes.json();
          setTree(data.tree || []);
        }
        // Auto-select the new category
        if (values.length < max) {
          onChange([...values, trimmed]);
        }
        // Expand the parent
        if (parentId) {
          setExpanded((prev) => new Set([...prev, parentId]));
        }
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create category");
      }
    } catch {
      alert("Failed to create category");
    }

    setNewName("");
    setAddingTo(null);
  }

  function renderNode(node: CategoryNode, depth: number) {
    const isSelected = lowerValues.has(node.name.toLowerCase());
    const hasChildren = node.children.length > 0;
    const isExpanded = expanded.has(node.id);
    const isPrimary = primaryLabel && values.length > 0 && values[0].toLowerCase() === node.name.toLowerCase();

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-1.5 py-1.5 px-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 group ${
            isSelected ? "bg-[#009429]/5" : ""
          }`}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
        >
          {/* Expand/collapse toggle */}
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
              className="p-0.5 text-gray-400 hover:text-gray-600 shrink-0"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <span className="w-4.5 shrink-0" />
          )}

          {/* Checkbox */}
          <button
            type="button"
            onClick={() => toggleSelect(node.name)}
            disabled={!isSelected && values.length >= max}
            className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all ${
              isSelected
                ? "bg-[#009429] border-[#009429] text-white"
                : "border-gray-300 hover:border-[#009429] disabled:opacity-40"
            }`}
          >
            {isSelected && <Check className="w-3 h-3" />}
          </button>

          {/* Label */}
          <span
            className={`text-sm flex-1 ${isSelected ? "font-semibold text-gray-900" : "text-gray-700"}`}
            onClick={() => toggleSelect(node.name)}
          >
            {node.name}
          </span>

          {/* Primary badge */}
          {isPrimary && (
            <span className="text-[9px] uppercase tracking-wider text-[#009429]/80 bg-[#009429]/10 px-1.5 py-0.5 rounded font-medium">
              {primaryLabel}
            </span>
          )}

          {/* Add child button */}
          {depth < 2 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAddingTo(node.id);
                setExpanded((prev) => new Set([...prev, node.id]));
              }}
              className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-[#009429] transition-all"
              title="Add subcategory"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}

        {/* Inline add form */}
        {addingTo === node.id && (
          <div
            className="flex items-center gap-2 py-1.5 px-2"
            style={{ paddingLeft: `${(depth + 1) * 20 + 8}px` }}
          >
            <span className="w-4.5 shrink-0" />
            <input
              ref={addInputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value.slice(0, maxLength))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCategory(node.id);
                } else if (e.key === "Escape") {
                  setAddingTo(null);
                  setNewName("");
                }
              }}
              placeholder="Subcategory name..."
              className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#009429]/30 focus:border-[#009429]"
            />
            <button
              type="button"
              onClick={() => handleAddCategory(node.id)}
              className="px-2 py-1 bg-[#009429] text-white text-xs rounded-md hover:bg-[#007a22] transition-colors"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => { setAddingTo(null); setNewName(""); }}
              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Categories</label>
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-4 h-4 border-2 border-gray-300/30 border-t-gray-400 rounded-full animate-spin" />
            Loading categories...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">Categories</label>

      {/* Selected chips preview */}
      {values.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {values.map((value, idx) => {
            const isPrimary = !!primaryLabel && idx === 0;
            return (
              <span
                key={`${value}-${idx}`}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                  isPrimary
                    ? "bg-[#009429]/10 text-[#007a22] ring-1 ring-[#009429]/20"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {isPrimary && (
                  <span className="text-[9px] uppercase tracking-wider text-[#009429]/80">
                    {primaryLabel}
                  </span>
                )}
                <span>{value}</span>
                <button
                  type="button"
                  onClick={() => toggleSelect(value)}
                  className="text-gray-400 hover:text-gray-700 ml-0.5"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Tree */}
      <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto py-1">
        {tree.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-400">
            <FolderTree className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            No categories yet. Add one below.
          </div>
        ) : (
          tree.map((node) => renderNode(node, 0))
        )}

        {/* Root-level add */}
        {addingTo === "root" ? (
          <div className="flex items-center gap-2 py-1.5 px-3">
            <input
              ref={addInputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value.slice(0, maxLength))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCategory(null);
                } else if (e.key === "Escape") {
                  setAddingTo(null);
                  setNewName("");
                }
              }}
              placeholder="New category name..."
              className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#009429]/30 focus:border-[#009429]"
            />
            <button
              type="button"
              onClick={() => handleAddCategory(null)}
              className="px-2 py-1 bg-[#009429] text-white text-xs rounded-md hover:bg-[#007a22] transition-colors"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => { setAddingTo(null); setNewName(""); }}
              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddingTo("root")}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#009429] px-3 py-2 w-full transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add new category
          </button>
        )}
      </div>

      <div className="flex items-center justify-between mt-1">
        <p className="text-[11px] text-gray-400">
          {helpText || "Select categories from the tree. Click + to add subcategories."}
        </p>
        <p className="text-[11px] text-gray-400">{values.length} / {max}</p>
      </div>
    </div>
  );
}

/** Check if any node in the subtree has a name matching the selected values. */
function nodeContainsSelected(node: CategoryNode, values: string[]): boolean {
  const lower = new Set(values.map((v) => v.toLowerCase()));
  if (lower.has(node.name.toLowerCase())) return true;
  return node.children.some((c) => nodeContainsSelected(c, lower as unknown as string[]));
}
