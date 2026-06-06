"use client";

import { useEffect, useState } from "react";

type Props = {
  message: string | null;
  durationMs?: number;
};

export function PraiseBanner({ message, durationMs = 4000 }: Props) {
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
  return (
    <div
      className={`pointer-events-none fixed inset-x-0 top-1/4 z-50 flex justify-center px-4 transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      aria-live="polite"
    >
      <div className="max-w-2xl rounded-3xl bg-yellow-300 px-8 py-6 text-center shadow-2xl ring-4 ring-yellow-500">
        <p className="text-3xl font-black leading-tight text-neutral-900 sm:text-5xl">
          {current}
        </p>
      </div>
    </div>
  );
}
