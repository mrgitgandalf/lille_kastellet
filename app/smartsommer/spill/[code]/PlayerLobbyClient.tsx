"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { joinRoom } from "../../actions";
import type { Player, Room } from "@/lib/types";

export default function PlayerLobbyClient({
  initialRoom,
  initialPlayers,
}: {
  initialRoom: Room;
  initialPlayers: Player[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [room, setRoom] = useState<Room>(initialRoom);
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [clientToken, setClientToken] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(`client_token:${room.code}`);
    setClientToken(stored);
  }, [room.code]);

  const myPlayer = useMemo(
    () => players.find((p) => p.client_token === clientToken) ?? null,
    [players, clientToken],
  );

  useEffect(() => {
    const channel = supabase
      .channel(`player-lobby-${room.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `id=eq.${room.id}` },
        (payload) => {
          if (payload.new) setRoom(payload.new as Room);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `room_id=eq.${room.id}` },
        async () => {
          const { data } = await supabase
            .from("players")
            .select("*")
            .eq("room_id", room.id)
            .order("seat_order", { ascending: true });
          setPlayers(data ?? []);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.id, supabase]);

  // Når spillet starter, send spilleren videre til rundeskjermen
  useEffect(() => {
    if (room.state === "playing" && myPlayer) {
      router.push(`/smartsommer/spill/${room.code}/runde`);
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
          Du kan ikke joine etter at host har startet runden.
        </p>
      </main>
    );
  }

  if (!myPlayer) {
    return (
      <main className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Bli med i rom {room.code}</h1>
        <form onSubmit={doJoin} className="flex flex-col gap-3">
          <label className="text-sm font-semibold" htmlFor="name">
            Navnet ditt
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            className="rounded-lg border border-neutral-300 px-4 py-3 text-lg"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-neutral-900 px-4 py-3 text-white disabled:opacity-50"
          >
            {pending ? "Blir med..." : "Bli med"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6 text-center">
      <h1 className="text-2xl font-semibold">Hei, {myPlayer.name}!</h1>
      <p className="text-neutral-600">
        Venter på at vert starter spillet. Hold telefonen klar.
      </p>
      <section className="rounded-2xl border border-neutral-200 p-4">
        <h2 className="mb-2 font-semibold">
          Spillere i rommet ({players.length})
        </h2>
        <ul className="flex flex-wrap justify-center gap-2">
          {players.map((p) => (
            <li
              key={p.id}
              className={`rounded-full px-3 py-1 text-sm ${
                p.id === myPlayer.id
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100"
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
