"use client";

import { useEffect } from "react";

export default function MarketError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[market] Route error:", error);
  }, [error]);

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-16 text-center">
      <p className="eyebrow text-[#d32027] mb-4">Market data unavailable</p>
      <h2 className="headline-lg text-gray-900 mb-4">
        Could not load NEPSE data
      </h2>
      <p className="lead text-gray-500 mb-8 mx-auto">
        {error.message ||
          "Live market data is temporarily unavailable. Please try again in a moment."}
      </p>
      <button
        onClick={reset}
        className="px-5 py-2.5 bg-[#009429] text-white text-sm font-semibold rounded hover:bg-green-700 transition-colors"
      >
        Refresh
      </button>
    </div>
  );
}
