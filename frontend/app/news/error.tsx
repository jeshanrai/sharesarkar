"use client";

import { useEffect } from "react";

export default function NewsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[news] Route error:", error);
  }, [error]);

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-16 text-center">
      <p className="eyebrow text-[#d32027] mb-4">Something went wrong</p>
      <h2 className="headline-lg text-gray-900 mb-4">
        We couldn't load the news
      </h2>
      <p className="lead text-gray-500 mb-8 mx-auto">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#d32027] text-white text-sm font-semibold rounded hover:bg-red-700 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
