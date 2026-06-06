"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAblyClient } from "@/lib/ably-client";
import { getPlayers, getRoomById, joinRoom } from "../../actions";
import type { Player, Room } from "@/lib/types";

export default function PlayerLobbyClient({
  initialRoom,
  initialPlayers,
}: {
  initialRoom: Room;
  initialPlayers: Player[];
}) {
  const router = useRouter();
  const [room, setRoom] = useState<Room>(initialRoom);
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [clientToken, setClientToken] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (typeof window === "undefined") return;
    setClientToken(localStorage.getItem(`client_token:${room.code}`));
  }, [room.code]);

  const myPlayer = useMemo(
    () => players.find((p) => p.client_token === clientToken) ?? null,
    [players, clientToken],
  );

  useEffect(() => {
    const client = createAblyClient();
    const channel = client.channels.get(`room:${room.id}`);
    const refreshRoom = async () => {
      const r = await getRoomById(room.id);
      if (r) setRoom(r);
    };
    const refreshPlayers = async () => {
      setPlayers(await getPlayers(room.id));
    };
    channel.subscribe("room.updated", refreshRoom);
    channel.subscribe("players.updated", refreshPlayers);
    return () => {
      channel.unsubscribe();
      client.close();
    };
  }, [room.id]);

  useEffect(() => {
    if ((room.state === "playing" || room.state === "finished") && myPlayer) {
      router.push(`/gjettekampen/spill/${room.code}/runde`);
    }
  }, [room.state, myPlayer, room.code, router]);

  function doJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length === 0) {
      setError("Skriv inn navnet ditt.");
      return;
    }
    startTransition(async () => {
      try {
        const result = await joinRoom({ code: room.code, name: name.trim() });
        if (typeof window !== "undefined") {
          localStorage.setItem(`client_token:${room.code}`, result.clientToken);
        }
        setClientToken(result.clientToken);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Kunne ikke bli med.");
      }
    });
  }

  if (room.state !== "lobby" && !myPlayer) {
    return (
      <main className="text-center">
        <h1 className="text-2xl font-semibold">Spillet er allerede i gang</h1>
        <p className="mt-2 text-neutral-600">
          Du kan ikke joine etter at host har startet.
        </p>
      </main>
    );
  }

  if (!myPlayer) {
    return (
      <main className="flex flex-col gap-4">
        <header className="text-center">
          <p className="text-5xl">🚪</p>
          <h1 className="mt-3 text-3xl font-black uppercase tracking-tight text-violet-200 sm:text-4xl [text-shadow:_3px_3px_0_#5b21b6,_-2px_-2px_0_#5b21b6,_2px_-2px_0_#5b21b6,_-2px_2px_0_#5b21b6,_2px_2px_0_#5b21b6]">
            Rom {room.code}
          </h1>
        </header>
        <form
          onSubmit={doJoin}
          className="flex flex-col gap-3 rounded-2xl border-4 border-sky-700/40 bg-sky-100 p-6 shadow-[6px_6px_0_0_rgba(0,0,0,0.15)]"
        >
          <label
            className="text-sm font-black uppercase tracking-wide text-sky-900"
            htmlFor="name"
          >
            Navnet ditt
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            className="rounded-xl border-4 border-sky-700/40 bg-[#fdf5e0] px-4 py-3 text-lg font-bold text-sky-900 focus:border-sky-700 focus:outline-none"
          />
          {error && (
            <p className="text-sm font-semibold text-red-700">{error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl border-4 border-violet-950 bg-violet-800 px-4 py-3 font-black uppercase tracking-wide text-violet-50 shadow-[4px_4px_0_0_#0b0420] transition hover:bg-violet-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#0b0420] disabled:opacity-50"
          >
            {pending ? "Blir med..." : "Bli med 🚀"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6 text-center">
      <header>
        <p className="text-6xl">👋</p>
        <h1 className="mt-3 text-3xl font-black uppercase tracking-tight text-emerald-200 sm:text-4xl [text-shadow:_3px_3px_0_#065f46,_-2px_-2px_0_#065f46,_2px_-2px_0_#065f46,_-2px_2px_0_#065f46,_2px_2px_0_#065f46]">
          Hei, {myPlayer.name}!
        </h1>
      </header>
      <p className="font-semibold text-stone-700">
        Venter på at vert starter spillet. Hold telefonen klar – du kommer
        kanskje til å tegne! ✏️
      </p>
      <section className="rounded-2xl border-4 border-emerald-700/40 bg-emerald-100 p-5 shadow-[6px_6px_0_0_rgba(0,0,0,0.15)]">
        <h2 className="mb-3 font-black uppercase tracking-wide text-emerald-900">
          Spillere i rommet ({players.length})
        </h2>
        <ul className="flex flex-wrap justify-center gap-2">
          {players.map((p) => (
            <li
              key={p.id}
              className={`rounded-lg border-2 px-4 py-1.5 text-sm font-bold ${
                p.id === myPlayer.id
                  ? "border-violet-950 bg-violet-800 text-violet-50 shadow-[2px_2px_0_0_#0b0420]"
                  : "border-emerald-800/40 bg-[#fdf5e0] text-emerald-900"
              }`}
            >
              {p.name}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
