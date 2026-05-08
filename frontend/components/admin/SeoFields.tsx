"use client";

import { ARTICLE_LIMITS } from "@/lib/articleLimits";

export interface SeoValues {
  meta_title: string;
  meta_description: string;
  og_image_url: string;
  canonical_url: string;
  noindex: boolean;
}

interface Props {
  values: SeoValues;
  /** Used to show editors what would render if they leave the override blank. */
  fallbacks: { title: string; description: string };
  onChange: (next: SeoValues) => void;
}

/**
 * SEO panel for the article admin form.
 *
 * Editors can override what appears in <title>, the meta description, the
 * social-share image, and the canonical URL. When fields are left blank the
 * public article page falls back to the article's own title / excerpt / hero,
 * so editors only need to fill these in when the auto-derived value is wrong
 * or sub-optimal.
 *
 * Counter colors track Google's typical display limits (60 chars for the
 * title, 160 for the description) — we *don't* hard-block at those numbers,
 * just nudge.
 */
export default function SeoFields({ values, fallbacks, onChange }: Props) {
  function update<K extends keyof SeoValues>(key: K, val: SeoValues[K]) {
    onChange({ ...values, [key]: val });
  }

  const titleLen = values.meta_title.length;
  const titleSoftLimit = ARTICLE_LIMITS.meta_title_recommended;
  const titleColor = titleLen === 0
    ? "text-gray-300"
    : titleLen <= titleSoftLimit
    ? "text-gray-400"
    : "text-orange-500";

  const descLen = values.meta_description.length;
  const descSoftLimit = ARTICLE_LIMITS.meta_description_recommended;
  const descColor = descLen === 0
    ? "text-gray-300"
    : descLen <= descSoftLimit
    ? "text-gray-400"
    : "text-orange-500";

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="seo-meta-title" className="block text-xs font-medium text-gray-600 mb-1.5">
          Meta title
        </label>
        <input
          id="seo-meta-title"
          type="text"
          value={values.meta_title}
          onChange={(e) => update("meta_title", e.target.value.slice(0, ARTICLE_LIMITS.meta_title))}
          placeholder={fallbacks.title || "Will fall back to the article title"}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
        />
        <div className="flex items-center justify-between mt-1">
          <p className="text-[11px] text-gray-400">Aim for ~50–60 chars to avoid Google truncation.</p>
          <p className={`text-[11px] ${titleColor}`}>{titleLen} / {titleSoftLimit}</p>
        </div>
      </div>

      <div>
        <label htmlFor="seo-meta-desc" className="block text-xs font-medium text-gray-600 mb-1.5">
          Meta description
        </label>
        <textarea
          id="seo-meta-desc"
          value={values.meta_description}
          onChange={(e) => update("meta_description", e.target.value.slice(0, ARTICLE_LIMITS.meta_description))}
          rows={3}
          placeholder={fallbacks.description || "Will fall back to the article excerpt"}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429] resize-none"
        />
        <div className="flex items-center justify-between mt-1">
          <p className="text-[11px] text-gray-400">Aim for ~140–160 chars.</p>
          <p className={`text-[11px] ${descColor}`}>{descLen} / {descSoftLimit}</p>
        </div>
      </div>

      <div>
        <label htmlFor="seo-og-image" className="block text-xs font-medium text-gray-600 mb-1.5">
          Social share image URL
        </label>
        <input
          id="seo-og-image"
          type="url"
          value={values.og_image_url}
          onChange={(e) => update("og_image_url", e.target.value)}
          placeholder="Defaults to the article hero image"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
        />
        <p className="text-[11px] text-gray-400 mt-1">Recommended: 1200×630 PNG/JPG.</p>
      </div>

      <div>
        <label htmlFor="seo-canonical" className="block text-xs font-medium text-gray-600 mb-1.5">
          Canonical URL
        </label>
        <input
          id="seo-canonical"
          type="url"
          value={values.canonical_url}
          onChange={(e) => update("canonical_url", e.target.value.slice(0, ARTICLE_LIMITS.canonical_url))}
          placeholder="Leave blank to point to this article"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
        />
        <p className="text-[11px] text-gray-400 mt-1">
          Set only if this story is republished from another URL that should own the SEO ranking.
        </p>
      </div>

      <label className="flex items-start gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={values.noindex}
          onChange={(e) => update("noindex", e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#009429] focus:ring-[#009429]/30"
        />
        <span className="text-xs">
          <span className="font-medium text-gray-700">Hide from search engines</span>
          <span className="block text-gray-400 text-[11px] mt-0.5">
            Adds <code className="font-mono">noindex</code> — use for previews, syndicated reprints, or
            deprecated stories.
          </span>
        </span>
      </label>
    </div>
  );
}
