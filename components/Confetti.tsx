"use client";

import { useEffect } from "react";

type Props = {
  trigger: number;
  intensity?: "small" | "large";
};

export function Confetti({ trigger, intensity = "small" }: Props) {
  useEffect(() => {
    if (trigger === 0) return;
    let cancelled = false;
    (async () => {
      const confetti = (await import("canvas-confetti")).default;
      if (cancelled) return;
      if (intensity === "large") {
        confetti({ particleCount: 250, spread: 120, origin: { y: 0.6 } });
        setTimeout(() => {
          confetti({ particleCount: 200, angle: 60, spread: 80, origin: { x: 0 } });
          confetti({ particleCount: 200, angle: 120, spread: 80, origin: { x: 1 } });
        }, 300);
      } else {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trigger, intensity]);
  return null;
}
