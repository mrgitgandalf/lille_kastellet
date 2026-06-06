"use client";

import { useEffect, useState } from "react";

export default function Timer({
  startedAt,
  durationSeconds,
  onExpire,
  tone = "light",
}: {
  startedAt: number;
  durationSeconds: number;
  onExpire?: () => void;
  tone?: "light" | "dark";
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(
    0,
    Math.ceil((startedAt + durationSeconds * 1000 - now) / 1000),
  );

  useEffect(() => {
    if (remaining === 0 && onExpire) onExpire();
  }, [remaining, onExpire]);

  const mm = Math.floor(remaining / 60)
    .toString()
    .padStart(2, "0");
  const ss = (remaining % 60).toString().padStart(2, "0");
  const isLow = remaining <= 10;

  const colorClass =
    tone === "dark"
      ? isLow
        ? "text-red-400"
        : "text-yellow-300"
      : isLow
      ? "text-red-600"
      : "text-neutral-700";

  return (
    <span className={`tabular-nums font-mono text-2xl font-bold ${colorClass}`}>
      ⏱ {mm}:{ss}
    </span>
  );
}
