"use client";

import { useEffect, useState } from "react";

type Props = {
  message: string | null;
  durationMs?: number;
  variant?: "praise" | "timeout";
};

export function PraiseBanner({
  message,
  durationMs = 4000,
  variant = "praise",
}: Props) {
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    setCurrent(message);
    setVisible(true);
    const t = setTimeout(() => setVisible(false), durationMs);
    return () => clearTimeout(t);
  }, [message, durationMs]);

  if (!current) return null;
  const tone =
    variant === "timeout"
      ? "border-orange-900 bg-orange-200 shadow-[6px_6px_0_0_#7c2d12]"
      : "border-amber-900 bg-amber-200 shadow-[6px_6px_0_0_#78350f]";
  return (
    <div
      className={`pointer-events-none fixed inset-x-0 top-1/4 z-50 flex justify-center px-4 transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      aria-live="polite"
    >
      <div
        className={`max-w-2xl rounded-2xl border-4 px-8 py-6 text-center ${tone}`}
      >
        <p className="text-2xl font-black uppercase leading-tight text-neutral-900 sm:text-5xl">
          {current}
        </p>
      </div>
    </div>
  );
}
