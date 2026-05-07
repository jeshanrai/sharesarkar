"use client";

import { Link2 } from "lucide-react";

/**
 * Lenient transform — applied on every keystroke so the user can type and
 * delete hyphens freely. Allows internal hyphens, including at the end while
 * typing. Final cleanup happens in `finalizeSlug` on blur / submit.
 */
export function softSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/\s+/g, "-")        // spaces → hyphens
    .replace(/[^a-z0-9-]/g, "")  // strip anything not alphanumeric or hyphen
    .replace(/-{2,}/g, "-")       // collapse runs of hyphens
    .slice(0, 120);
}

/**
 * Strict normalization — strip leading/trailing hyphens. Use on blur and
 * before submitting to the API so we never persist `-foo-` style slugs.
 */
export function finalizeSlug(input: string): string {
  return softSlug(input).replace(/^-+|-+$/g, "");
}

interface SlugFieldProps {
  value: string;
  onChange: (next: string) => void;
  /** Called on blur, after strict normalization. Receives the cleaned value. */
  onBlur?: (cleaned: string) => void;
  preview: string;
  placeholder?: string;
}

export default function SlugField({ value, onChange, onBlur, preview, placeholder }: SlugFieldProps) {
  return (
    <div>
      <label className="block meta text-gray-700 mb-2">
        <Link2 className="w-4 h-4 inline mr-1" /> URL Slug
      </label>
      <div className="flex items-stretch rounded-xl border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-[#009429]/20 focus-within:border-[#009429]">
        <span className="px-3 py-3 bg-gray-50 eyebrow text-gray-500 border-r border-gray-200 flex items-center whitespace-nowrap">
          /news/
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(softSlug(e.target.value))}
          onBlur={(e) => {
            const cleaned = finalizeSlug(e.target.value);
            onChange(cleaned);
            onBlur?.(cleaned);
          }}
          placeholder={placeholder || "article-url-slug"}
          className="flex-1 px-4 py-3 text-sm outline-none"
          spellCheck={false}
        />
      </div>
      <p className="eyebrow text-gray-400 mt-2">
        Lowercase letters, numbers, and hyphens. URL preview: <span className="font-mono text-gray-600">{preview}</span>
      </p>
    </div>
  );
}
