"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createRoom } from "../actions";

export default function CreateRoomForm() {
  const router = useRouter();
  const [roundSeconds, setRoundSeconds] = useState(180);
  const [guessPoints, setGuessPoints] = useState(1);
  const [drawerPoints, setDrawerPoints] = useState(3);
  const [wordsText, setWordsText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const liveWordCount = wordsText
    .split("\n")
    .map((w) => w.trim())
    .filter((w) => w.length > 0).length;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const { code, hostToken } = await createRoom({
          roundSeconds,
          guessPoints,
          drawerPoints,
          wordsText,
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
      <fieldset className="flex flex-col gap-3 rounded-xl border-4 border-sky-700/40 bg-sky-50 p-4 shadow-[3px_3px_0_0_rgba(0,0,0,0.12)]">
        <legend className="px-2 text-xs font-black uppercase tracking-wide text-sky-900">
          ⏱ Tid per tegne-runde
        </legend>
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={roundSeconds === 0}
            onChange={(e) => setRoundSeconds(e.target.checked ? 0 : 180)}
            className="h-5 w-5 accent-violet-800"
          />
          <span className="text-sm font-bold text-sky-900">
            Ingen tidsbegrensning
          </span>
        </label>
        {roundSeconds > 0 && (
          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold text-sky-900">
              <strong className="text-base">{roundSeconds}s</strong> per runde
            </span>
            <input
              type="range"
              min={30}
              max={240}
              step={15}
              value={roundSeconds}
              onChange={(e) => setRoundSeconds(parseInt(e.target.value, 10))}
              className="accent-violet-800"
            />
          </label>
        )}
        <span className="text-xs font-semibold text-sky-800/70">
          Maks 3 min (240 s) anbefales. Du kan alltid avslutte en runde manuelt.
        </span>
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-xl border-4 border-emerald-700/40 bg-emerald-50 p-4 shadow-[3px_3px_0_0_rgba(0,0,0,0.12)]">
        <legend className="px-2 text-xs font-black uppercase tracking-wide text-emerald-900">
          🎯 Poenggiving
        </legend>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-bold text-emerald-900">
            Poeng til første riktige gjetter:{" "}
            <strong className="text-base">{guessPoints}p</strong>
          </span>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={guessPoints}
            onChange={(e) => setGuessPoints(parseInt(e.target.value, 10))}
            className="accent-violet-800"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-bold text-emerald-900">
            Poeng til tegner når noen gjetter riktig:{" "}
            <strong className="text-base">{drawerPoints}p</strong>
          </span>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={drawerPoints}
            onChange={(e) => setDrawerPoints(parseInt(e.target.value, 10))}
            className="accent-violet-800"
          />
        </label>
        <span className="text-xs font-semibold text-emerald-800/70">
          Standard: 1p til gjetter, 3p til tegner. Sett til 0 for å skru av.
        </span>
      </fieldset>

      <fieldset className="flex flex-col gap-3 rounded-xl border-4 border-rose-700/40 bg-rose-50 p-4 shadow-[3px_3px_0_0_rgba(0,0,0,0.12)]">
        <legend className="px-2 text-xs font-black uppercase tracking-wide text-rose-900">
          📝 Ord ({liveWordCount}) — én per linje
        </legend>
        <textarea
          value={wordsText}
          onChange={(e) => setWordsText(e.target.value)}
          rows={8}
          placeholder={"sykkel\nflyplass\nelefant\n…"}
          className="w-full rounded-xl border-4 border-rose-700/40 bg-[#fdf5e0] px-3 py-2 font-mono text-sm font-semibold text-rose-900 focus:border-rose-700 focus:outline-none"
        />
        <span className="text-xs font-semibold text-rose-900/70">
          Valgfritt nå — du kan også legge inn / endre ord på rom-siden
          etterpå. Trenger minst like mange ord som spillere før spillet kan
          starte.
        </span>
      </fieldset>

      {error && <p className="text-sm font-semibold text-red-700">{error}</p>}

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
