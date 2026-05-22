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
        router.push(`/smartsommer/host/${code}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Noe gikk galt.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4">
        <legend className="px-2 text-sm font-semibold">Modus</legend>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="radio"
            name="mode"
            value="player_prompts"
            checked={mode === "player_prompts"}
            onChange={() => setMode("player_prompts")}
            className="mt-1"
          />
          <span>
            <strong>Spillerne skriver egne setninger</strong>
            <br />
            <span className="text-sm text-neutral-600">
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
            className="mt-1"
          />
          <span>
            <strong>Forhåndsdefinerte setninger</strong>
            <br />
            <span className="text-sm text-neutral-600">
              Lim inn en liste (én per linje). Hver bok starter med en av dine
              setninger i stedet for at spilleren skriver første side.
            </span>
          </span>
        </label>
      </fieldset>

      {mode === "preset_prompts" && (
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Startsetninger (én per linje)</span>
          <textarea
            value={presetPrompts}
            onChange={(e) => setPresetPrompts(e.target.value)}
            rows={8}
            placeholder={"Den verste kundereisen jeg har sett...\nEn typisk mandag morgen på kontoret...\nHvis sjefen var et dyr, ville hen vært..."}
            className="rounded-lg border border-neutral-300 px-3 py-2 font-mono text-sm"
          />
          <span className="text-xs text-neutral-500">
            Tips: lim inn flere enn antall spillere – setningene fordeles uten
            gjentakelser.
          </span>
        </label>
      )}

      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold">
          Tid per runde: {roundSeconds} sekunder
        </span>
        <input
          type="range"
          min={30}
          max={240}
          step={15}
          value={roundSeconds}
          onChange={(e) => setRoundSeconds(parseInt(e.target.value, 10))}
        />
        <span className="text-xs text-neutral-500">
          Tiden er rådgivende – du som vert bestemmer når runden går videre.
        </span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-neutral-900 px-4 py-3 text-white disabled:opacity-50"
      >
        {pending ? "Oppretter..." : "Opprett rom"}
      </button>
    </form>
  );
}
