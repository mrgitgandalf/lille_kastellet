"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAblyClient } from "@/lib/ably-client";
import RoomQRCode from "@/components/RoomQRCode";
import Timer from "@/components/Timer";
import { DrawingCanvas, type Stroke } from "@/components/DrawingCanvas";
import { GuessFeed } from "@/components/GuessFeed";
import { Standings } from "@/components/Standings";
import { FinalReveal } from "@/components/FinalReveal";
import { PraiseBanner } from "@/components/PraiseBanner";
import { useI18n } from "@/lib/i18n";
import { appError } from "@/lib/i18n/errors";
import {
  deleteRoom,
  endGame,
  getActiveTurn,
  getAllTurns,
  getGuessesForTurn,
  getPlayers,
  getRoomById,
  getStandings,
  markTurnTimeout,
  nextTurn,
  skipTurn,
  startGame,
} from "../../actions";
import type {
  GjetteGuess,
  GjetteTurn,
  GjetteWord,
  Player,
  Room,
  Standing,
} from "@/lib/types";

type Props = {
  initialRoom: Room;
  initialPlayers: Player[];
  initialWords: GjetteWord[];
  initialTurns: GjetteTurn[];
  initialActiveTurn: GjetteTurn | null;
  initialGuesses: GjetteGuess[];
  initialStandings: Standing[];
};

export default function HostRoomClient({
  initialRoom,
  initialPlayers,
  initialWords,
  initialTurns,
  initialActiveTurn,
  initialGuesses,
  initialStandings,
}: Props) {
  const router = useRouter();
  const { t, errText, praise, timeout } = useI18n();
  const [room, setRoom] = useState<Room>(initialRoom);
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [words] = useState<GjetteWord[]>(initialWords);
  const [turns, setTurns] = useState<GjetteTurn[]>(initialTurns);
  const [activeTurn, setActiveTurn] = useState<GjetteTurn | null>(initialActiveTurn);
  const [guesses, setGuesses] = useState<GjetteGuess[]>(initialGuesses);
  const [standings, setStandings] = useState<Standing[]>(initialStandings);
  const [externalStrokes, setExternalStrokes] = useState<Stroke[]>([]);
  const [hostToken, setHostToken] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const toErr = (e: unknown) => (e instanceof Error ? e : new Error());
  const [wordHidden, setWordHidden] = useState(true);
  const [praiseEv, setPraiseEv] = useState<{ idx: number; name: string } | null>(null);
  const [timeoutEv, setTimeoutEv] = useState<{ idx: number; word: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createAblyClient>["channels"]["get"]
  > | null>(null);
  const expiredTurnRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHostToken(localStorage.getItem(`host_token:${room.code}`));
  }, [room.code]);

  useEffect(() => {
    const client = createAblyClient();
    const channel = client.channels.get(`room:${room.id}`);
    channelRef.current = channel;

    const refreshRoom = async () => {
      const r = await getRoomById(room.id);
      if (r) setRoom(r);
    };
    const refreshPlayers = async () => {
      setPlayers(await getPlayers(room.id));
    };
    const refreshActiveTurn = async () => {
      const t = await getActiveTurn(room.id);
      setActiveTurn(t);
      setTurns(await getAllTurns(room.id));
      setStandings(await getStandings(room.id));
      setExternalStrokes([]);
      setGuesses(t ? await getGuessesForTurn(t.id) : []);
      // wordHidden beholdes mellom turer — verten styrer det selv
    };

    channel.subscribe("room.updated", refreshRoom);
    channel.subscribe("players.updated", refreshPlayers);
    channel.subscribe("turn.started", refreshActiveTurn);
    channel.subscribe("turn.ended", async (msg) => {
      const data = msg.data as {
        winnerId: string | null;
        word: string;
        endReason: string;
        timeoutIdx?: number;
      };
      setStandings(await getStandings(room.id));
      const t = await getActiveTurn(room.id);
      setActiveTurn(t);
      setTurns(await getAllTurns(room.id));
      if (t) setGuesses(await getGuessesForTurn(t.id));
      if (data?.endReason === "timeout" && data.timeoutIdx !== undefined) {
        setTimeoutEv({ idx: data.timeoutIdx, word: data.word });
      }
    });
    channel.subscribe("guess.posted", async (msg) => {
      const data = msg.data as GjetteGuess & { praiseIdx?: number; praiseName?: string };
      setGuesses((prev) =>
        prev.some((g) => g.id === data.id) ? prev : [...prev, data],
      );
      if (data.is_correct && data.praiseIdx !== undefined) {
        setPraiseEv({ idx: data.praiseIdx, name: data.praiseName ?? "" });
      }
    });
    channel.subscribe("game.finished", async () => {
      setStandings(await getStandings(room.id));
      await refreshRoom();
    });
    channel.subscribe("stroke.added", (msg) => {
      const data = msg.data as { turnId: string; stroke: Stroke };
      if (activeTurn && data.turnId !== activeTurn.id) return;
      setExternalStrokes((prev) => [...prev, data.stroke]);
    });
    channel.subscribe("canvas.cleared", (msg) => {
      const data = msg.data as { turnId: string };
      if (activeTurn && data.turnId !== activeTurn.id) return;
      setExternalStrokes([]);
    });

    return () => {
      channel.unsubscribe();
      client.close();
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, activeTurn?.id]);

  function doStart() {
    if (!hostToken) return setError(appError("host.noToken"));
    setError(null);
    startTransition(async () => {
      try {
        await startGame({ roomId: room.id, hostToken });
      } catch (err) {
        setError(toErr(err));
      }
    });
  }

  function doNext() {
    if (!hostToken) return;
    startTransition(async () => {
      try {
        await nextTurn({ roomId: room.id, hostToken });
      } catch (err) {
        setError(toErr(err));
      }
    });
  }

  function doSkip() {
    if (!hostToken) return;
    startTransition(async () => {
      try {
        await skipTurn({ roomId: room.id, hostToken });
      } catch (err) {
        setError(toErr(err));
      }
    });
  }

  function doEnd() {
    if (!hostToken) return;
    if (!confirm(t("host.confirm.end"))) return;
    startTransition(async () => {
      try {
        await endGame({ roomId: room.id, hostToken });
      } catch (err) {
        setError(toErr(err));
      }
    });
  }

  function doDelete() {
    if (!hostToken) return;
    if (!confirm(t("host.confirm.delete"))) return;
    startTransition(async () => {
      try {
        await deleteRoom({ roomId: room.id, hostToken });
        router.push("/gjettekampen");
      } catch (err) {
        setError(toErr(err));
      }
    });
  }

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/gjettekampen/spill/${room.code}`
      : "";

  if (room.state === "finished") {
    return (
      <main className="flex flex-col gap-6">
        <FinalReveal standings={standings} />
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={doDelete}
            className="text-sm text-red-600 underline"
          >
            {t("host.delete")}
          </button>
        </div>
      </main>
    );
  }

  if (room.state === "lobby") {
    return (
      <main className="flex flex-col gap-6">
        <header className="text-center">
          <p className="text-xs font-black uppercase tracking-widest text-violet-700">
            {t("host.code.label")}
          </p>
          <p className="mt-2 text-5xl font-black tracking-[0.2em] text-violet-200 sm:text-7xl [text-shadow:_4px_4px_0_#5b21b6,_-3px_-3px_0_#5b21b6,_3px_-3px_0_#5b21b6,_-3px_3px_0_#5b21b6,_3px_3px_0_#5b21b6]">
            {room.code}
          </p>
        </header>

        <div className="flex flex-col items-center gap-3 rounded-2xl border-4 border-sky-700/40 bg-sky-100 p-5 shadow-[6px_6px_0_0_rgba(0,0,0,0.15)]">
          {joinUrl && <RoomQRCode url={joinUrl} />}
          <p className="text-sm font-semibold text-sky-900">
            {t("host.scan")} <strong>{joinUrl}</strong>
          </p>
        </div>

        <section className="rounded-2xl border-4 border-emerald-700/40 bg-emerald-100 p-5 shadow-[6px_6px_0_0_rgba(0,0,0,0.15)]">
          <h2 className="mb-3 font-black uppercase tracking-wide text-emerald-900">
            {t("host.players", { n: players.length })}
          </h2>
          {players.length === 0 ? (
            <p className="text-sm font-semibold text-emerald-800/70">
              {t("host.waiting")}
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

        <p className="text-center text-sm font-semibold text-stone-600">
          {t("host.words.loaded", { n: words.length })} ·{" "}
          {players.length >= 2 && words.length >= players.length
            ? t("host.words.using", {
                used: Math.floor(words.length / players.length) * players.length,
                per: Math.floor(words.length / players.length),
              })
            : t("host.words.need", { n: Math.max(2, players.length) })}
        </p>

        {error && (
          <p className="text-sm font-semibold text-red-700">{errText(error, "err.short")}</p>
        )}

        <button
          type="button"
          onClick={doStart}
          disabled={
            pending || players.length < 2 || words.length < players.length
          }
          className="rounded-xl border-4 border-violet-950 bg-violet-800 px-4 py-4 text-lg font-black uppercase tracking-wide text-violet-50 shadow-[4px_4px_0_0_#0b0420] transition hover:bg-violet-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#0b0420] disabled:border-stone-700 disabled:bg-stone-500"
        >
          {players.length < 2
            ? t("host.start.minPlayers", { n: players.length })
            : words.length < players.length
            ? t("host.start.needWords", { n: players.length - words.length })
            : pending
            ? t("host.start.starting")
            : t("host.start.go")}
        </button>

        <button
          type="button"
          onClick={doDelete}
          className="text-sm text-red-600 underline"
        >
          {t("host.delete")}
        </button>
      </main>
    );
  }

  // playing
  const totalTurns = turns.length;
  const finishedCount = turns.filter((t) => t.state === "finished").length;
  const remaining = totalTurns - finishedCount;
  const drawer = activeTurn
    ? players.find((p) => p.id === activeTurn.drawer_player_id) ?? null
    : null;
  const turnStartMs = activeTurn?.started_at
    ? Date.parse(activeTurn.started_at)
    : null;

  function handleTimerExpire() {
    if (!hostToken || !activeTurn) return;
    if (expiredTurnRef.current === activeTurn.id) return;
    expiredTurnRef.current = activeTurn.id;
    // Bare avslutt aktiv tur — verten klikker «Start neste runde» selv
    markTurnTimeout({ roomId: room.id, hostToken }).catch((err) => {
      setError(toErr(err));
      expiredTurnRef.current = null;
    });
  }

  return (
    <main className="flex flex-col gap-5">
      <header className="flex items-center justify-between rounded-2xl border-4 border-violet-950 bg-violet-900 px-5 py-4 text-violet-50 shadow-[6px_6px_0_0_#0b0420]">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-amber-300">
            {t("host.role", { code: room.code })}
          </p>
          <p className="text-2xl font-black uppercase">
            {t("turns.left", { remaining, done: finishedCount, total: totalTurns })}
          </p>
        </div>
        {activeTurn && drawer && (
          <div className="text-right">
            <p className="text-xs font-black uppercase tracking-wide text-amber-300">
              {t("drawer.label")}
            </p>
            <p className="text-xl font-black uppercase">{drawer.name}</p>
            <div className="flex items-center justify-end gap-2">
              <p className="text-sm font-bold text-amber-200">
                {t("word.label")} {wordHidden ? "●●●●●" : activeTurn.word}
              </p>
              <button
                type="button"
                onClick={() => setWordHidden((v) => !v)}
                className="rounded-md border-2 border-violet-300/50 px-2 py-0.5 text-xs font-bold uppercase text-violet-100 hover:bg-violet-800"
                title={wordHidden ? t("word.showTitle") : t("word.hideTitle")}
              >
                {wordHidden ? t("word.show") : t("word.hide")}
              </button>
            </div>
            {room.round_seconds > 0 && turnStartMs && (
              <div className="mt-1">
                <Timer
                  startedAt={turnStartMs}
                  durationSeconds={room.round_seconds}
                  onExpire={handleTimerExpire}
                  tone="dark"
                />
              </div>
            )}
          </div>
        )}
      </header>
      <PraiseBanner message={praiseEv ? praise(praiseEv.idx, praiseEv.name) : null} />
      <PraiseBanner
        message={timeoutEv ? timeout(timeoutEv.idx, timeoutEv.word) : null}
        variant="timeout"
      />

      {activeTurn && (
        <DrawingCanvas
          mode="spectate"
          externalStrokes={externalStrokes}
          hideToolbar
          theme="retro"
        />
      )}

      <section className="rounded-2xl border-4 border-sky-700/40 bg-sky-100 p-4 shadow-[6px_6px_0_0_rgba(0,0,0,0.15)]">
        <h2 className="mb-2 text-sm font-black uppercase tracking-wide text-sky-900">
          {t("guesses.h")}
        </h2>
        <GuessFeed guesses={guesses} players={players} />
      </section>

      <section className="rounded-2xl border-4 border-rose-700/40 bg-rose-100 p-4 shadow-[6px_6px_0_0_rgba(0,0,0,0.15)]">
        <h2 className="mb-2 text-sm font-black uppercase tracking-wide text-rose-900">
          {t("standings.h")}
        </h2>
        <Standings standings={standings} />
      </section>

      {error && (
        <p className="text-sm font-semibold text-red-700">{errText(error, "err.short")}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={doNext}
          disabled={pending}
          className="flex-1 rounded-xl border-4 border-violet-950 bg-violet-800 px-4 py-3 font-black uppercase tracking-wide text-violet-50 shadow-[4px_4px_0_0_#0b0420] transition hover:bg-violet-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#0b0420] disabled:opacity-50"
        >
          {remaining === 0
            ? t("host.next.finish")
            : activeTurn
            ? t("host.next.next")
            : t("host.next.start")}
        </button>
        {activeTurn && (
          <button
            type="button"
            onClick={doSkip}
            disabled={pending}
            className="rounded-xl border-4 border-rose-900 bg-rose-200 px-4 py-3 text-sm font-black uppercase text-rose-900 shadow-[3px_3px_0_0_#881337] hover:bg-rose-300 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_#881337]"
          >
            {t("host.skip")}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={doEnd}
        className="text-sm text-neutral-500 underline"
      >
        {t("host.end")}
      </button>
    </main>
  );
}
