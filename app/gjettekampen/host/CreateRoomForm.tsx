"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createRoom } from "../actions";

export default function CreateRoomForm() {
  const router = useRouter();
  const [roundSeconds, setRoundSeconds] = useState(180);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const { code, hostToken } = await createRoom({ roundSeconds });
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
