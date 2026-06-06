"use client";

import { useEffect, useRef } from "react";
import type { GjetteGuess, Player } from "@/lib/types";

type Props = {
  guesses: GjetteGuess[];
  players: Player[];
};

export function GuessFeed({ guesses, players }: Props) {
  const nameById = new Map(players.map((p) => [p.id, p.name]));
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [guesses.length]);

  return (
    <div
      ref={scrollRef}
      className="flex max-h-72 flex-col gap-1.5 overflow-y-auto rounded-lg border-2 border-stone-400/40 bg-[#fdf5e0] p-3 text-sm"
    >
      {guesses.length === 0 ? (
        <p className="text-center font-semibold text-stone-400">
          Ingen gjetninger ennå …
        </p>
      ) : (
        guesses.map((g) => {
          const name = nameById.get(g.player_id) ?? "Ukjent";
          if (g.is_correct) {
            return (
              <div
                key={g.id}
                className="rounded-lg border-2 border-emerald-700/50 bg-emerald-100 px-3 py-2 font-black uppercase text-emerald-900 shadow-[2px_2px_0_0_rgba(0,0,0,0.15)]"
              >
                <span className="mr-2">🎉</span>
                <span>{name}</span>
                <span className="mx-1 normal-case">gjettet riktig:</span>
                <span className="underline">{g.text}</span>
              </div>
            );
          }
          return (
            <div key={g.id} className="px-2">
              <span className="font-bold text-stone-700">{name}:</span>{" "}
              <span className="font-semibold text-stone-800">{g.text}</span>
            </div>
          );
        })
      )}
    </div>
  );
}
