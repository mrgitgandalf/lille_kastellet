"use client";

import type { Standing } from "@/lib/types";

type Props = {
  standings: Standing[];
  highlightLeader?: boolean;
};

export function Standings({ standings, highlightLeader }: Props) {
  if (standings.length === 0) {
    return <p className="text-sm text-neutral-500">Ingen poeng ennå.</p>;
  }
  const max = standings[0]?.score ?? 0;
  // Standardranking: like poeng → samme plassering, neste hopper over.
  // Eksempel: 8p,8p,5p → 1,1,3
  const ranks: number[] = [];
  for (let i = 0; i < standings.length; i++) {
    if (i === 0 || standings[i].score !== standings[i - 1].score) {
      ranks.push(i + 1);
    } else {
      ranks.push(ranks[i - 1]);
    }
  }
  return (
    <ol className="flex flex-col gap-1.5">
      {standings.map((s, i) => {
        const isLeader = highlightLeader && s.score === max && s.score > 0;
        return (
          <li
            key={s.player_id}
            className={`flex items-center justify-between rounded-lg border-2 px-3 py-2 text-sm ${
              isLeader
                ? "border-amber-700/60 bg-amber-100 font-black uppercase shadow-[2px_2px_0_0_rgba(0,0,0,0.15)]"
                : "border-stone-400/40 bg-[#fdf5e0]"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="text-stone-500">{ranks[i]}.</span>
              <span className="font-bold">{s.name}</span>
              {isLeader && <span>👑</span>}
            </span>
            <span className="flex items-center gap-3 text-stone-700">
              <span title="Tegninger gjettet" className="font-bold">
                ✏️ {s.draws_won}
              </span>
              <span title="Riktige gjetninger" className="font-bold">
                🎯 {s.guesses_won}
              </span>
              <span className="text-base font-black text-stone-900">
                {s.score}p
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
