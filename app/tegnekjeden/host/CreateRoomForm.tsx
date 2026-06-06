"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createRoom } from "../actions";

export default function CreateRoomForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"player_prompts" | "preset_prompts">(
    "player_prompts",
  );
  const [presetPrompts, setPresetPrompts] = useState("");
  const [roundSeconds, setRoundSeconds] = useState(90);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const { code, hostToken } = await createRoom({
          mode,
          presetPrompts,
          roundSeconds,
        });
        if (typeof window !== "undefined") {
          localStorage.setItem(`host_token:${code}`, hostToken);
        }
        router.push(`/tegnekjeden/host/${code}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Noe gikk galt.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-3 rounded-xl border-4 border-emerald-700/40 bg-emerald-50 p-4 shadow-[3px_3px_0_0_rgba(0,0,0,0.12)]">
        <legend className="px-2 text-xs font-black uppercase tracking-wide text-emerald-900">
          🎭 Modus
        </legend>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="radio"
            name="mode"
            value="player_prompts"
            checked={mode === "player_prompts"}
            onChange={() => setMode("player_prompts")}
            className="mt-1 h-4 w-4 accent-violet-800"
          />
          <span>
            <strong className="font-black text-emerald-900">
              Spillerne skriver egne setninger
            </strong>
            <br />
            <span className="text-sm font-semibold text-emerald-800/80">
              Standard Gartic Phone – hver spiller starter med sin egen setning.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="radio"
            name="mode"
            value="preset_prompts"
            checked={mode === "preset_prompts"}
            onChange={() => setMode("preset_prompts")}
            className="mt-1 h-4 w-4 accent-violet-800"
          />
          <span>
            <strong className="font-black text-emerald-900">
              Forhåndsdefinerte setninger
            </strong>
            <br />
            <span className="text-sm font-semibold text-emerald-800/80">
              Lim inn en liste (én per linje). Hver bok starter med en av dine
              setninger i stedet for at spilleren skriver første side.
            </span>
          </span>
        </label>
      </fieldset>

      {mode === "preset_prompts" && (
        <label className="flex flex-col gap-2">
          <span className="text-xs font-black uppercase tracking-wide text-rose-900">
            Startsetninger (én per linje)
          </span>
          <textarea
            value={presetPrompts}
            onChange={(e) => setPresetPrompts(e.target.value)}
            rows={8}
            placeholder={"Den verste kundereisen jeg har sett...\nEn typisk mandag morgen på kontoret...\nHvis sjefen var et dyr, ville hen vært..."}
            className="rounded-xl border-4 border-rose-700/40 bg-[#fdf5e0] px-3 py-2 font-mono text-sm font-semibold text-rose-900 focus:border-rose-700 focus:outline-none"
          />
          <span className="text-xs font-semibold text-rose-900/70">
            Tips: lim inn flere enn antall spillere – setningene fordeles uten
            gjentakelser.
          </span>
        </label>
      )}

      <fieldset className="flex flex-col gap-3 rounded-xl border-4 border-sky-700/40 bg-sky-50 p-4 shadow-[3px_3px_0_0_rgba(0,0,0,0.12)]">
        <legend className="px-2 text-xs font-black uppercase tracking-wide text-sky-900">
          ⏱ Tid per runde
        </legend>
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={roundSeconds === 0}
            onChange={(e) => setRoundSeconds(e.target.checked ? 0 : 90)}
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
          Tiden er rådgivende – du som vert bestemmer når runden går videre.
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
