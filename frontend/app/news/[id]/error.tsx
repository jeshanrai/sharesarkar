"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ArticleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[article] Route error:", error);
  }, [error]);

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-16 text-center">
      <p className="eyebrow text-[#d32027] mb-4">Article unavailable</p>
      <h2 className="headline-lg text-gray-900 mb-4">
        We couldn't load this article
      </h2>
      <p className="lead text-gray-500 mb-8 mx-auto">
        {error.message || "The article may have been removed or is temporarily unavailable."}
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#d32027] text-white text-sm font-semibold rounded hover:bg-red-700 transition-colors"
        >
          Try again
        </button>
        <Link
          href="/news"
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-sm font-semibold rounded hover:bg-gray-50 transition-colors"
        >
          ← All News
        </Link>
      </div>
    </div>
  );
}
