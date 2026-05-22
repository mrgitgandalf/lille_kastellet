import type { PageKind, RoomMode } from "./types";

/**
 * Rotasjon: i runde R skriver spiller med seat s side R i boken eid av
 * spiller med seat (s - R) mod N. Det betyr at hver spiller bidrar
 * nøyaktig én gang til hver bok, og de ser aldri sin egen bok før reveal.
 */
export function ownerSeatForRound(playerSeat: number, round: number, totalPlayers: number): number {
  return ((playerSeat - round) % totalPlayers + totalPlayers) % totalPlayers;
}

export function pageKindForIndex(pageIndex: number, mode: RoomMode): PageKind {
  // Page 0 alltid tekst (setningen). Etter det veksler tegning/tekst.
  return pageIndex % 2 === 0 ? "text" : "drawing";
}

/**
 * Første runde der spillerne faktisk bidrar.
 * preset_prompts: side 0 er forhåndsutfylt av host, så runde starter på 1.
 * player_prompts: spillerne skriver selv side 0, så runde starter på 0.
 */
export function firstActiveRound(mode: RoomMode): number {
  return mode === "preset_prompts" ? 1 : 0;
}

/**
 * Stokker en liste deterministisk basert på seed (Fisher–Yates).
 * Brukes til å fordele preset_prompts på bøker uten gjentakelser.
 */
export function shuffle<T>(items: T[], seed: number): T[] {
  const copy = items.slice();
  let s = seed | 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
