"use client";

import { useEffect, useState } from "react";

export default function Timer({
  startedAt,
  durationSeconds,
  onExpire,
}: {
  startedAt: number;
  durationSeconds: number;
  onExpire?: () => void;
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

  return (
    <span
      className={`tabular-nums font-mono text-lg ${
        isLow ? "text-red-600" : "text-neutral-700"
      }`}
    >
      {mm}:{ss}
    </span>
  );
}
