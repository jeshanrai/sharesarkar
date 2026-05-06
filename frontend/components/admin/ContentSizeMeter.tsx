"use client";

import { ARTICLE_LIMITS, byteLength, formatMB } from "@/lib/articleLimits";

interface ContentSizeMeterProps {
  value: string;
  /** Field cap in bytes. Defaults to article content cap. */
  max?: number;
  className?: string;
}

/**
 * Inline byte-size meter for the rich-text editor. Turns yellow above 75 %
 * and red above 95 % so authors notice before they hit the hard cap.
 */
export default function ContentSizeMeter({ value, max = ARTICLE_LIMITS.content, className = "" }: ContentSizeMeterProps) {
  const used = byteLength(value);
  const pct = Math.min(100, Math.round((used / max) * 100));
  const tone =
    pct >= 95 ? "text-red-600 bg-red-100" : pct >= 75 ? "text-amber-700 bg-amber-100" : "text-gray-500 bg-gray-100";
  const bar =
    pct >= 95 ? "bg-red-500" : pct >= 75 ? "bg-amber-500" : "bg-[#009429]";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden" aria-hidden="true">
        <div className={`h-full ${bar} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${tone}`}>
        {formatMB(used)} / {formatMB(max)}
      </span>
    </div>
  );
}
