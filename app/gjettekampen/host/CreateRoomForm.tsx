"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createRoom } from "../actions";

export default function CreateRoomForm() {
  const router = useRouter();
  const [roundSeconds, setRoundSeconds] = useState(180);
  const [guessPoints, setGuessPoints] = useState(1);
  const [drawerPoints, setDrawerPoints] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const { code, hostToken } = await createRoom({
          roundSeconds,
          guessPoints,
          drawerPoints,
        });
        if (typeof window !== "undefined") {
          localStorage.setItem(`host_token:${code}`, hostToken);
        }
        router.push(`/gjettekampen/host/${code}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Noe gikk galt.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4">
        <legend className="px-2 text-sm font-semibold">Tid per tegne-runde</legend>
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={roundSeconds === 0}
            onChange={(e) => setRoundSeconds(e.target.checked ? 0 : 180)}
          />
          <span className="text-sm">Ingen tidsbegrensning</span>
        </label>
        {roundSeconds > 0 && (
          <label className="flex flex-col gap-2">
            <span className="text-sm">
              {roundSeconds} sekunder per runde
            </span>
            <input
              type="range"
              min={30}
              max={240}
              step={15}
              value={roundSeconds}
              onChange={(e) => setRoundSeconds(parseInt(e.target.value, 10))}
            />
          </label>
        )}
        <span className="text-xs text-neutral-500">
          Maks 3 min (240 s) anbefales. Du kan alltid avslutte en runde manuelt.
        </span>
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-2xl border border-neutral-200 p-4">
        <legend className="px-2 text-sm font-semibold">Poenggiving</legend>
        <label className="flex flex-col gap-2">
          <span className="text-sm">
            Poeng til første riktige gjetter: <strong>{guessPoints}p</strong>
          </span>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={guessPoints}
            onChange={(e) => setGuessPoints(parseInt(e.target.value, 10))}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm">
            Poeng til tegner når noen gjetter riktig:{" "}
            <strong>{drawerPoints}p</strong>
          </span>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={drawerPoints}
            onChange={(e) => setDrawerPoints(parseInt(e.target.value, 10))}
          />
        </label>
        <span className="text-xs text-neutral-500">
          Standard: 1p til gjetter, 3p til tegner. Sett til 0 for å skru av.
        </span>
      </fieldset>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl border-4 border-violet-950 bg-violet-800 px-4 py-3 font-black uppercase tracking-wide text-violet-50 shadow-[4px_4px_0_0_#0b0420] transition hover:bg-violet-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#0b0420] disabled:opacity-50"
      >
        {pending ? "Oppretter..." : "Opprett rom →"}
      </button>
    </form>
  );
}
