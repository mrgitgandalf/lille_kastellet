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
      className="flex max-h-72 flex-col gap-1.5 overflow-y-auto rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm"
    >
      {guesses.length === 0 ? (
        <p className="text-center text-neutral-400">Ingen gjetninger ennå …</p>
      ) : (
        guesses.map((g) => {
          const name = nameById.get(g.player_id) ?? "Ukjent";
          if (g.is_correct) {
            return (
              <div
                key={g.id}
                className="rounded-lg bg-green-100 px-3 py-2 font-semibold text-green-900 ring-1 ring-green-300"
              >
                <span className="mr-2">🎉</span>
                <span>{name}</span>
                <span className="mx-1">gjettet riktig:</span>
                <span className="underline">{g.text}</span>
              </div>
            );
          }
          return (
            <div key={g.id} className="px-2">
              <span className="font-semibold text-neutral-700">{name}:</span>{" "}
              <span className="text-neutral-800">{g.text}</span>
            </div>
          );
        })
      )}
    </div>
  );
}
