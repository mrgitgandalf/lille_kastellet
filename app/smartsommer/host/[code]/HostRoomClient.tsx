"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import RoomQRCode from "@/components/RoomQRCode";
import {
  nextRound,
  setPlayerSkipped,
  startGame,
  deleteRoom,
} from "../../actions";
import type { Player, Room } from "@/lib/types";
import { ownerSeatForRound } from "@/lib/game";

type Page = {
  book_id: string;
  page_index: number;
  author_player_id: string | null;
};

export default function HostRoomClient({
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
  const [pages, setPages] = useState<Page[]>([]);
  const [hostToken, setHostToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHostToken(localStorage.getItem(`host_token:${room.code}`));
  }, [room.code]);

  // Realtime: rom, spillere, pages
  useEffect(() => {
    const channel = supabase
      .channel(`host-room-${room.id}`)
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pages" },
        async () => {
          const { data: books } = await supabase
            .from("books")
            .select("id")
            .eq("room_id", room.id);
          const bookIds = (books ?? []).map((b) => b.id);
          if (bookIds.length === 0) return;
          const { data } = await supabase
            .from("pages")
            .select("book_id, page_index, author_player_id")
            .in("book_id", bookIds);
          setPages(data ?? []);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.id, supabase]);

  // Når runde endres, reset timer-anker
  useEffect(() => {
    startedAtRef.current = Date.now();
  }, [room.current_round, room.state]);

  // Pages innsendt for inneværende runde
  const submittedThisRound = useMemo(() => {
    const round = room.current_round;
    return pages.filter((p) => p.page_index === round);
  }, [pages, room.current_round]);

  const playersWhoSubmitted = useMemo(() => {
    if (room.state !== "playing" || !room.pages_per_book) return new Set<string>();
    const N = room.pages_per_book;
    const round = room.current_round;
    const set = new Set<string>();
    for (const p of players) {
      const ownerSeat = ownerSeatForRound(p.seat_order, round, N);
      const ownerPlayer = players.find((x) => x.seat_order === ownerSeat);
      if (!ownerPlayer) continue;
      const submitted = submittedThisRound.some(
        (sp) => sp.author_player_id === p.id,
      );
      if (submitted) set.add(p.id);
    }
    return set;
  }, [players, room.state, room.current_round, room.pages_per_book, submittedThisRound]);

  function doStart() {
    if (!hostToken) return setError("Mangler host-token. Last siden på nytt.");
    setError(null);
    startTransition(async () => {
      try {
        await startGame({ roomId: room.id, hostToken });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Kunne ikke starte.");
      }
    });
  }

  function doNext() {
    if (!hostToken) return;
    startTransition(async () => {
      try {
        await nextRound({ roomId: room.id, hostToken });
        if (room.pages_per_book && room.current_round + 1 >= room.pages_per_book) {
          router.push(`/smartsommer/host/${room.code}/reveal`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Feil.");
      }
    });
  }

  function doSkip(playerId: string, skipped: boolean) {
    if (!hostToken) return;
    startTransition(async () => {
      try {
        await setPlayerSkipped({ roomId: room.id, hostToken, playerId, skipped });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Feil.");
      }
    });
  }

  function doDelete() {
    if (!hostToken) return;
    if (!confirm("Slett dette rommet og alle data? Kan ikke angres.")) return;
    startTransition(async () => {
      try {
        await deleteRoom({ roomId: room.id, hostToken });
        router.push("/smartsommer");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Feil.");
      }
    });
  }

  // Når spillet går til reveal, send host til reveal-skjermen
  useEffect(() => {
    if (room.state === "reveal") {
      router.push(`/smartsommer/host/${room.code}/reveal`);
    }
  }, [room.state, room.code, router]);

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/smartsommer/spill/${room.code}`
      : "";

  return (
    <main className="flex flex-col gap-6">
      <header className="text-center">
        <p className="text-sm uppercase tracking-widest text-neutral-500">
          Romkode
        </p>
        <p className="text-6xl font-bold tracking-[0.3em]">{room.code}</p>
      </header>

      {room.state === "lobby" && (
        <>
          <div className="flex flex-col items-center gap-3">
            {joinUrl && <RoomQRCode url={joinUrl} />}
            <p className="text-sm text-neutral-600">
              Scan eller gå til <strong>{joinUrl}</strong>
            </p>
          </div>

          <section className="rounded-2xl border border-neutral-200 p-4">
            <h2 className="mb-2 font-semibold">
              Spillere ({players.length})
            </h2>
            {players.length === 0 ? (
              <p className="text-sm text-neutral-500">Venter på spillere...</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {players.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-full bg-neutral-100 px-3 py-1 text-sm"
                  >
                    {p.name}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="button"
            onClick={doStart}
            disabled={pending || players.length < 3}
            className="rounded-lg bg-neutral-900 px-4 py-3 text-white disabled:opacity-50"
          >
            {players.length < 3
              ? `Minst 3 spillere må joine (${players.length}/3)`
              : pending
              ? "Starter..."
              : "Start spill"}
          </button>

          <button
            type="button"
            onClick={doDelete}
            className="text-sm text-red-600 underline"
          >
            Slett rom
          </button>
        </>
      )}

      {room.state === "playing" && room.pages_per_book && (
        <PlayingHostView
          room={room}
          players={players}
          playersWhoSubmitted={playersWhoSubmitted}
          onNext={doNext}
          onSkip={doSkip}
          pending={pending}
          error={error}
          onDelete={doDelete}
        />
      )}
    </main>
  );
}

function PlayingHostView({
  room,
  players,
  playersWhoSubmitted,
  onNext,
  onSkip,
  pending,
  error,
  onDelete,
}: {
  room: Room;
  players: Player[];
  playersWhoSubmitted: Set<string>;
  onNext: () => void;
  onSkip: (id: string, skipped: boolean) => void;
  pending: boolean;
  error: string | null;
  onDelete: () => void;
}) {
  const N = room.pages_per_book ?? players.length;
  const round = room.current_round;
  const totalSubmitted = playersWhoSubmitted.size;

  return (
    <>
      <section className="rounded-2xl border border-neutral-200 p-4">
        <p className="text-sm text-neutral-500">
          Runde {round + 1} av {N}
        </p>
        <p className="mt-1 text-lg font-semibold">
          {totalSubmitted} av {players.length} har sendt inn
        </p>
      </section>

      <section className="rounded-2xl border border-neutral-200 p-4">
        <h2 className="mb-2 font-semibold">Spillere</h2>
        <ul className="flex flex-col gap-2">
          {players.map((p) => {
            const submitted = playersWhoSubmitted.has(p.id);
            return (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      submitted ? "bg-green-500" : "bg-neutral-300"
                    }`}
                  />
                  <span>{p.name}</span>
                  {p.is_skipped && (
                    <span className="text-xs text-amber-600">(merket hoppet over)</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => onSkip(p.id, !p.is_skipped)}
                  className="text-xs text-neutral-500 underline"
                >
                  {p.is_skipped ? "Angre" : "Marker"}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={onNext}
        disabled={pending}
        className="rounded-lg bg-neutral-900 px-4 py-3 text-white disabled:opacity-50"
      >
        {pending
          ? "Går videre..."
          : round + 1 >= N
          ? "Gå til reveal"
          : "Neste runde"}
      </button>

      <button
        type="button"
        onClick={onDelete}
        className="text-sm text-red-600 underline"
      >
        Avbryt og slett rom
      </button>
    </>
  );
}
