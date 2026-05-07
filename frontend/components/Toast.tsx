"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  /** Bumping this number re-triggers the toast even with the same message. */
  trigger: number;
  durationMs?: number;
  variant?: "default" | "success";
}

/**
 * Tiny, dependency-free toast that fades in at the bottom-center of the
 * viewport, then auto-dismisses. Drive it by changing the `trigger` prop.
 */
export default function Toast({ message, trigger, durationMs = 1800, variant = "default" }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (trigger === 0) return;
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), durationMs);
    return () => window.clearTimeout(t);
  }, [trigger, durationMs]);

  const tone =
    variant === "success"
      ? "bg-[#009429] text-white"
      : "bg-gray-900 text-white";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed left-1/2 -translate-x-1/2 z-[80] pointer-events-none transition-all duration-200 ${
        visible ? "opacity-100 translate-y-0 bottom-8" : "opacity-0 translate-y-2 bottom-4"
      }`}
    >
        <div className={`${tone} px-4 py-2.5 rounded-full shadow-lg meta whitespace-nowrap`}>
        {message}
      </div>
    </div>
  );
}
