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
            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
              isLeader
                ? "border-yellow-400 bg-yellow-50 font-semibold"
                : "border-neutral-200 bg-white"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="text-neutral-400">{ranks[i]}.</span>
              <span>{s.name}</span>
              {isLeader && <span>👑</span>}
            </span>
            <span className="flex items-center gap-3 text-neutral-600">
              <span title="Tegninger gjettet">✏️ {s.draws_won}</span>
              <span title="Riktige gjetninger">🎯 {s.guesses_won}</span>
              <span className="text-base font-semibold text-neutral-900">{s.score}p</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
