"use client";

import { useEffect } from "react";

export default function IpoError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ipo] Route error:", error);
  }, [error]);

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-16 text-center">
      <p className="eyebrow text-[#d32027] mb-4">Something went wrong</p>
      <h2 className="headline-lg text-gray-900 mb-4">IPO data unavailable</h2>
      <p className="lead text-gray-500 mb-8 mx-auto">
        {error.message || "We couldn't load the IPO listings. Please try again."}
      </p>
      <button
        onClick={reset}
        className="px-5 py-2.5 bg-[#009429] text-white text-sm font-semibold rounded hover:bg-green-700 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
