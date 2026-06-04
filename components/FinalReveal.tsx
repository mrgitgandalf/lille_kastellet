"use client";

import { useEffect, useState } from "react";
import type { Standing } from "@/lib/types";
import { Confetti } from "./Confetti";
import { Standings } from "./Standings";

type Props = {
  standings: Standing[];
};

export function FinalReveal({ standings }: Props) {
  const [count, setCount] = useState<number | null>(5);
  const [confettiTick, setConfettiTick] = useState(0);

  useEffect(() => {
    if (count === null) return;
    if (count === 0) {
      setConfettiTick((t) => t + 1);
      setCount(null);
      return;
    }
    const t = setTimeout(() => setCount(count - 1), 1000);
    return () => clearTimeout(t);
  }, [count]);

  if (count !== null) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-lg text-neutral-600">Vinneren er …</p>
        <div className="text-[12rem] font-black leading-none text-neutral-900 tabular-nums">
          {count}
        </div>
      </div>
    );
  }

  const winner = standings[0];
  return (
    <div className="flex flex-col gap-6 py-6">
      <Confetti trigger={confettiTick} intensity="large" />
      {winner && (
        <div className="rounded-2xl bg-yellow-100 p-6 text-center ring-2 ring-yellow-400">
          <p className="text-sm font-semibold uppercase tracking-wide text-yellow-900">
            Vinner
          </p>
          <p className="mt-2 text-5xl font-black text-neutral-900">
            👑 {winner.name}
          </p>
          <p className="mt-1 text-lg text-neutral-700">{winner.score} poeng</p>
        </div>
      )}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Sluttstilling</h2>
        <Standings standings={standings} highlightLeader />
      </div>
    </div>
  );
}
