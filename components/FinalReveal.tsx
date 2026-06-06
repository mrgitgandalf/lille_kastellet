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
        <div className="rounded-2xl border-4 border-amber-700/50 bg-amber-100 p-6 text-center shadow-[6px_6px_0_0_rgba(0,0,0,0.15)]">
          <p className="text-sm font-black uppercase tracking-wide text-amber-900">
            {isTie ? `Uavgjort på topp (${winners.length} vinnere)` : "Vinner"}
          </p>
          <div className="mt-2 flex flex-col gap-1">
            {winners.map((w) => (
              <p
                key={w.player_id}
                className="text-5xl font-black uppercase text-amber-200 [text-shadow:_3px_3px_0_#92400e,_-2px_-2px_0_#92400e,_2px_-2px_0_#92400e,_-2px_2px_0_#92400e,_2px_2px_0_#92400e]"
              >
                👑 {w.name}
              </p>
            ))}
          </div>
          <p className="mt-2 text-lg font-black text-amber-900">{topScore} poeng</p>
        </div>
      ) : (
        <div className="rounded-2xl border-4 border-stone-500/50 bg-stone-100 p-6 text-center shadow-[6px_6px_0_0_rgba(0,0,0,0.15)]">
          <p className="text-2xl font-black uppercase text-stone-700">
            Ingen scoret poeng 🤷
          </p>
        </div>
      )}
      <div>
        <h2 className="mb-3 font-black uppercase tracking-wide text-stone-800">
          Sluttstilling
        </h2>
        <Standings standings={standings} highlightLeader />
      </div>
      <Link
        href="/gjettekampen"
        className="self-center rounded-xl border-4 border-violet-950 bg-violet-800 px-4 py-2 text-sm font-black uppercase tracking-wide text-violet-50 shadow-[3px_3px_0_0_#0b0420] transition hover:bg-violet-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_#0b0420]"
      >
        Tilbake til Gjettekampen
      </Link>
    </div>
  );
}
