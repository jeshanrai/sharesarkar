"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] Route error:", error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center p-12">
      <div className="text-center max-w-md">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <span className="text-[#d32027] text-xl">⚠</span>
        </div>
        <h2 className="font-semibold text-gray-900 text-lg mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          {error.message || "An unexpected error occurred in the admin panel."}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-[#009429] text-white text-sm font-semibold rounded hover:bg-green-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
