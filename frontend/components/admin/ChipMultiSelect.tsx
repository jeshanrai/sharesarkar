"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

interface Props {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  /** Suggestions for autocomplete — already-known categories/tags. */
  suggestions?: string[];
  /** Hard cap on chip count. */
  max: number;
  /** Per-chip max length, used to truncate paste-bombs early. */
  maxLength: number;
  /** Marks the first chip as the "primary" label, used for categories. */
  primaryLabel?: string;
  placeholder?: string;
  helpText?: string;
}

/**
 * Generic chip input used for both categories and tags.
 *
 * Behaviour:
 *  - Type, press Enter or comma to commit a chip.
 *  - Backspace on empty input removes the last chip.
 *  - Click X to remove a specific chip.
 *  - Filtered suggestion dropdown appears while typing; click to insert.
 *  - When `primaryLabel` is set, the first chip is marked visually so editors
 *    know which one drives hero badges and breadcrumbs.
 *
 * The component never lets duplicates through (case-insensitive). It does NOT
 * fetch suggestions itself — the caller passes them in so it can be reused for
 * tags and categories which load from different endpoints.
 */
export default function ChipMultiSelect({
  label,
  values,
  onChange,
  suggestions = [],
  max,
  maxLength,
  primaryLabel,
  placeholder,
  helpText,
}: Props) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const blurTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (blurTimer.current) window.clearTimeout(blurTimer.current);
  }, []);

  const lowerValues = useMemo(() => new Set(values.map((v) => v.toLowerCase())), [values]);

  const filtered = useMemo(() => {
    const q = draft.trim().toLowerCase();
    return suggestions
      .filter((s) => !lowerValues.has(s.toLowerCase()))
      .filter((s) => (q ? s.toLowerCase().includes(q) : true))
      .slice(0, 8);
  }, [draft, suggestions, lowerValues]);

  function commit(raw: string) {
    const next = raw.trim().replace(/\s+/g, " ").slice(0, maxLength);
    if (!next) return;
    if (lowerValues.has(next.toLowerCase())) {
      setDraft("");
      return;
    }
    if (values.length >= max) return;
    onChange([...values, next]);
    setDraft("");
  }

  function removeAt(idx: number) {
    onChange(values.filter((_, i) => i !== idx));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && !draft && values.length > 0) {
      removeAt(values.length - 1);
    }
  }

  const exactMatch = filtered.some((s) => s.toLowerCase() === draft.trim().toLowerCase());
  const showCreateOption = draft.trim().length > 0 && !exactMatch && !lowerValues.has(draft.trim().toLowerCase());

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <div className="relative">
        <div
          className="flex flex-wrap items-center gap-1.5 px-2 py-1.5 border border-gray-200 rounded-lg bg-white focus-within:ring-2 focus-within:ring-[#009429]/20 focus-within:border-[#009429] cursor-text"
          onClick={() => inputRef.current?.focus()}
        >
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
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAt(idx);
                  }}
                  className="text-gray-400 hover:text-gray-700"
                  aria-label={`Remove ${value}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
          <input
            ref={inputRef}
            type="text"
            value={draft}
            placeholder={values.length === 0 ? placeholder : ""}
            onChange={(e) => {
              setDraft(e.target.value.slice(0, maxLength));
              setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              // Defer so a click on a suggestion can commit before blur closes
              // the dropdown.
              blurTimer.current = window.setTimeout(() => setOpen(false), 120);
            }}
            disabled={values.length >= max}
            className="flex-1 min-w-[8ch] px-1 py-1 text-sm bg-transparent focus:outline-none disabled:bg-transparent"
          />
        </div>

        {open && (filtered.length > 0 || showCreateOption) && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-md max-h-56 overflow-auto">
            {filtered.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => {
                  // Use mousedown so we beat the input's blur handler.
                  e.preventDefault();
                  commit(s);
                }}
                className="block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                {s}
              </button>
            ))}
            {showCreateOption && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(draft);
                }}
                className="block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 border-t border-gray-100"
              >
                <span className="text-gray-500">Create new:</span>{" "}
                <span className="font-medium text-gray-900">{draft.trim()}</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-1">
        <p className="text-[11px] text-gray-400">
          {helpText || "Press Enter or comma to add."}
        </p>
        <p className="text-[11px] text-gray-400">{values.length} / {max}</p>
      </div>
    </div>
  );
}
