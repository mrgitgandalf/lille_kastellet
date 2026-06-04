"use client";

import Link from "next/link";
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

  const topScore = standings[0]?.score ?? 0;
  const winners = standings.filter(
    (s) => s.score === topScore && s.score > 0,
  );
  const isTie = winners.length > 1;
  const hasWinner = winners.length > 0;

  return (
    <div className="flex flex-col gap-6 py-6">
      <Confetti trigger={confettiTick} intensity="large" />
      {hasWinner ? (
        <div className="rounded-2xl bg-yellow-100 p-6 text-center ring-2 ring-yellow-400">
          <p className="text-sm font-semibold uppercase tracking-wide text-yellow-900">
            {isTie ? `Uavgjort på topp (${winners.length} vinnere)` : "Vinner"}
          </p>
          <div className="mt-2 flex flex-col gap-1">
            {winners.map((w) => (
              <p
                key={w.player_id}
                className="text-5xl font-black text-neutral-900"
              >
                👑 {w.name}
              </p>
            ))}
          </div>
          <p className="mt-2 text-lg text-neutral-700">{topScore} poeng</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-neutral-100 p-6 text-center">
          <p className="text-2xl font-semibold text-neutral-700">
            Ingen scoret poeng 🤷
          </p>
        </div>
      )}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Sluttstilling</h2>
        <Standings standings={standings} highlightLeader />
      </div>
      <Link
        href="/gjettekampen"
        className="self-center rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-700"
      >
        Tilbake til Gjettekampen
      </Link>
    </div>
  );
}
