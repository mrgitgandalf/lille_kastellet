"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAblyClient } from "@/lib/ably-client";
import RoomQRCode from "@/components/RoomQRCode";
import {
  deleteRoom,
  getPlayers,
  getRoomById,
  getSubmittedAuthors,
  nextRound,
  startGame,
} from "../../actions";
import type { Player, Room } from "@/lib/types";

export default function HostRoomClient({
  initialRoom,
  initialPlayers,
}: {
  initialRoom: Room;
  initialPlayers: Player[];
}) {
  const router = useRouter();
  const [room, setRoom] = useState<Room>(initialRoom);
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  const [hostToken, setHostToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHostToken(localStorage.getItem(`host_token:${room.code}`));
  }, [room.code]);

  // Ably realtime: lytt på events for dette rommet
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
    const refreshSubmissions = async () => {
      const ids = await getSubmittedAuthors(room.id, room.current_round);
      setSubmittedIds(new Set(ids));
    };

    channel.subscribe("room.updated", refreshRoom);
    channel.subscribe("players.updated", refreshPlayers);
    channel.subscribe("pages.updated", refreshSubmissions);

    // Hent submissions første gang når runden er aktiv
    if (initialRoom.state === "playing") refreshSubmissions();

    return () => {
      channel.unsubscribe();
      client.close();
    };
  }, [room.id, room.current_round, initialRoom.state]);

  // Når runden eller state endres, reset submissions og timer-anker
  useEffect(() => {
    startedAtRef.current = Date.now();
    if (room.state === "playing") {
      (async () => {
        const ids = await getSubmittedAuthors(room.id, room.current_round);
        setSubmittedIds(new Set(ids));
      })();
    } else {
      setSubmittedIds(new Set());
    }
  }, [room.current_round, room.state, room.id]);

  // Når spillet går til reveal, send host til reveal-skjermen
  useEffect(() => {
    if (room.state === "reveal") {
      router.push(`/tegnekjeden/host/${room.code}/reveal`);
    }
  }, [room.state, room.code, router]);

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
        router.push("/tegnekjeden");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Feil.");
      }
    });
  }

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/tegnekjeden/spill/${room.code}`
      : "";

  return (
    <main className="flex flex-col gap-6">
      <header className="text-center">
        <p className="text-xs font-black uppercase tracking-widest text-violet-700">
          🎮 Romkode
        </p>
        <p className="mt-2 text-5xl font-black tracking-[0.2em] text-violet-200 sm:text-7xl [text-shadow:_4px_4px_0_#5b21b6,_-3px_-3px_0_#5b21b6,_3px_-3px_0_#5b21b6,_-3px_3px_0_#5b21b6,_3px_3px_0_#5b21b6]">
          {room.code}
        </p>
      </header>

      {room.state === "lobby" && (
        <>
          <div className="flex flex-col items-center gap-3 rounded-2xl border-4 border-sky-700/40 bg-sky-100 p-5 shadow-[6px_6px_0_0_rgba(0,0,0,0.15)]">
            {joinUrl && <RoomQRCode url={joinUrl} />}
            <p className="text-sm font-semibold text-sky-900">
              Scan eller gå til <strong>{joinUrl}</strong>
            </p>
          </div>

          <section className="rounded-2xl border-4 border-emerald-700/40 bg-emerald-100 p-5 shadow-[6px_6px_0_0_rgba(0,0,0,0.15)]">
            <h2 className="mb-3 font-black uppercase tracking-wide text-emerald-900">
              🙋 Spillere ({players.length})
            </h2>
            {players.length === 0 ? (
              <p className="text-sm font-semibold text-emerald-800/70">
                Venter på spillere…
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {players.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-lg border-2 border-emerald-800/40 bg-[#fdf5e0] px-4 py-1.5 text-sm font-bold text-emerald-900"
                  >
                    {p.name}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {error && (
            <p className="text-sm font-semibold text-red-700">{error}</p>
          )}

          <button
            type="button"
            onClick={doStart}
            disabled={pending || players.length < 2}
            className="rounded-xl border-4 border-violet-950 bg-violet-800 px-4 py-4 text-lg font-black uppercase tracking-wide text-violet-50 shadow-[4px_4px_0_0_#0b0420] transition hover:bg-violet-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#0b0420] disabled:border-stone-700 disabled:bg-stone-500"
          >
            {players.length < 2
              ? `Minst 2 spillere må joine (${players.length}/2)`
              : pending
              ? "Starter…"
              : "Start spill 🎬"}
          </button>

          <button
            type="button"
            onClick={doDelete}
            className="text-sm font-semibold text-red-700 underline"
          >
            Slett rom
          </button>
        </>
      )}

      {room.state === "playing" && room.pages_per_book && (
        <PlayingHostView
          room={room}
          players={players}
          submittedIds={submittedIds}
          onNext={doNext}
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
  submittedIds,
  onNext,
  pending,
  error,
  onDelete,
}: {
  room: Room;
  players: Player[];
  submittedIds: Set<string>;
  onNext: () => void;
  pending: boolean;
  error: string | null;
  onDelete: () => void;
}) {
  const N = room.pages_per_book ?? players.length;
  const round = room.current_round;
  const totalSubmitted = submittedIds.size;

  return (
    <>
      <section className="rounded-2xl border-4 border-violet-950 bg-violet-900 px-5 py-4 text-violet-50 shadow-[6px_6px_0_0_#0b0420]">
        <p className="text-xs font-black uppercase tracking-wide text-amber-300">
          Runde {round + 1} av {N}
        </p>
        <p className="mt-1 text-2xl font-black uppercase">
          {totalSubmitted} av {players.length} har sendt inn
        </p>
      </section>

      <section className="rounded-2xl border-4 border-emerald-700/40 bg-emerald-100 p-5 shadow-[6px_6px_0_0_rgba(0,0,0,0.15)]">
        <h2 className="mb-3 font-black uppercase tracking-wide text-emerald-900">
          🙋 Spillere
        </h2>
        <ul className="flex flex-col gap-2">
          {players.map((p) => {
            const submitted = submittedIds.has(p.id);
            return (
              <li
                key={p.id}
                className={`flex items-center justify-between rounded-lg border-2 px-3 py-2 ${
                  submitted
                    ? "border-emerald-700/50 bg-emerald-200 shadow-[2px_2px_0_0_rgba(0,0,0,0.15)]"
                    : "border-emerald-800/30 bg-[#fdf5e0]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`inline-block h-3 w-3 rounded-full border-2 ${
                      submitted
                        ? "border-emerald-900 bg-emerald-600"
                        : "border-emerald-800/30 bg-white"
                    }`}
                  />
                  <span className="font-bold text-emerald-900">{p.name}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {error && <p className="text-sm font-semibold text-red-700">{error}</p>}

      <button
        type="button"
        onClick={onNext}
        disabled={pending}
        className="rounded-xl border-4 border-violet-950 bg-violet-800 px-4 py-3 font-black uppercase tracking-wide text-violet-50 shadow-[4px_4px_0_0_#0b0420] transition hover:bg-violet-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#0b0420] disabled:opacity-50"
      >
        {pending
          ? "Går videre…"
          : round + 1 >= N
          ? "Gå til reveal 🎉"
          : "Neste runde →"}
      </button>

      <button
        type="button"
        onClick={onDelete}
        className="text-sm font-semibold text-red-700 underline"
      >
        Avbryt og slett rom
      </button>
    </>
  );
}
