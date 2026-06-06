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
import {
  deleteRoom,
  endGame,
  getActiveTurn,
  getAllTurns,
  getGuessesForTurn,
  getPlayers,
  getRoomById,
  getStandings,
  getWords,
  markTurnTimeout,
  nextTurn,
  setWords,
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
  const [room, setRoom] = useState<Room>(initialRoom);
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [words, setWordsState] = useState<GjetteWord[]>(initialWords);
  const [turns, setTurns] = useState<GjetteTurn[]>(initialTurns);
  const [activeTurn, setActiveTurn] = useState<GjetteTurn | null>(initialActiveTurn);
  const [guesses, setGuesses] = useState<GjetteGuess[]>(initialGuesses);
  const [standings, setStandings] = useState<Standing[]>(initialStandings);
  const [externalStrokes, setExternalStrokes] = useState<Stroke[]>([]);
  const [wordsText, setWordsText] = useState(
    initialWords.map((w) => w.word).join("\n"),
  );
  const [hostToken, setHostToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wordHidden, setWordHidden] = useState(true);
  const [praiseMessage, setPraiseMessage] = useState<string | null>(null);
  const [timeoutMessage, setTimeoutMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [, startSaveWordsTransition] = useTransition();
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
        timeoutMessage?: string;
      };
      setStandings(await getStandings(room.id));
      const t = await getActiveTurn(room.id);
      setActiveTurn(t);
      setTurns(await getAllTurns(room.id));
      if (t) setGuesses(await getGuessesForTurn(t.id));
      if (data?.endReason === "timeout" && data.timeoutMessage) {
        setTimeoutMessage(data.timeoutMessage);
      }
    });
    channel.subscribe("guess.posted", async (msg) => {
      const data = msg.data as GjetteGuess & { praiseMessage?: string };
      setGuesses((prev) =>
        prev.some((g) => g.id === data.id) ? prev : [...prev, data],
      );
      if (data.is_correct && data.praiseMessage) {
        setPraiseMessage(data.praiseMessage);
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

  // Autosave på blur — kjører i egen transition så Start-knappen ikke
  // disables av et samtidig blur-trigget setWords-kall.
  function doSetWords() {
    if (!hostToken) return;
    setError(null);
    startSaveWordsTransition(async () => {
      try {
        await setWords({ roomId: room.id, hostToken, wordsText });
        setWordsState(await getWords(room.id));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Feil.");
      }
    });
  }

  function doStart() {
    if (!hostToken) return setError("Mangler host-token. Last siden på nytt.");
    setError(null);
    startTransition(async () => {
      try {
        // Lagre nyeste ord-input før vi starter (i tilfelle bruker
        // klikker Start uten å ha blurret tekstområdet).
        await setWords({ roomId: room.id, hostToken, wordsText });
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
        await nextTurn({ roomId: room.id, hostToken });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Feil.");
      }
    });
  }

  function doSkip() {
    if (!hostToken) return;
    startTransition(async () => {
      try {
        await skipTurn({ roomId: room.id, hostToken });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Feil.");
      }
    });
  }

  function doEnd() {
    if (!hostToken) return;
    if (!confirm("Avslutt spillet nå?")) return;
    startTransition(async () => {
      try {
        await endGame({ roomId: room.id, hostToken });
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
        router.push("/gjettekampen");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Feil.");
      }
    });
  }

  const liveWordCount = wordsText
    .split("\n")
    .map((w) => w.trim())
    .filter((w) => w.length > 0).length;

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
            Slett rom
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
            🎮 Romkode
          </p>
          <p className="mt-2 text-7xl font-black tracking-[0.2em] text-violet-200 [text-shadow:_4px_4px_0_#5b21b6,_-3px_-3px_0_#5b21b6,_3px_-3px_0_#5b21b6,_-3px_3px_0_#5b21b6,_3px_3px_0_#5b21b6]">
            {room.code}
          </p>
        </header>

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

        <section className="rounded-2xl border-4 border-rose-700/40 bg-rose-100 p-5 shadow-[6px_6px_0_0_rgba(0,0,0,0.15)]">
          <h2 className="mb-3 font-black uppercase tracking-wide text-rose-900">
            📝 Ord ({liveWordCount}) — én per linje
          </h2>
          <textarea
            value={wordsText}
            onChange={(e) => setWordsText(e.target.value)}
            onBlur={doSetWords}
            rows={8}
            placeholder={"sykkel\nflyplass\nelefant\n..."}
            className="w-full rounded-xl border-4 border-rose-700/40 bg-[#fdf5e0] px-3 py-2 font-mono text-sm font-semibold text-rose-900 focus:border-rose-700 focus:outline-none"
          />
          <p className="mt-2 text-xs font-semibold text-rose-900/80">
            {players.length >= 2 && liveWordCount >= players.length
              ? `Spillet bruker ${
                  Math.floor(liveWordCount / players.length) * players.length
                } ord (${Math.floor(liveWordCount / players.length)} per spiller). ${
                  liveWordCount % players.length > 0
                    ? `${liveWordCount % players.length} overskudd-ord brukes ikke.`
                    : ""
                }`
              : `Trenger minst ${Math.max(2, players.length)} ord (én per spiller).`}
          </p>
        </section>

        {error && <p className="text-sm font-semibold text-red-700">{error}</p>}

        <button
          type="button"
          onClick={doStart}
          disabled={
            pending || players.length < 2 || liveWordCount < players.length
          }
          className="rounded-xl border-4 border-violet-950 bg-violet-800 px-4 py-4 text-lg font-black uppercase tracking-wide text-violet-50 shadow-[4px_4px_0_0_#0b0420] transition hover:bg-violet-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#0b0420] disabled:border-stone-700 disabled:bg-stone-500"
        >
          {players.length < 2
            ? `Minst 2 spillere må joine (${players.length}/2)`
            : liveWordCount < players.length
            ? `Trenger ${players.length - liveWordCount} ord til`
            : pending
            ? "Starter…"
            : "Start spill 🎬"}
        </button>

        <button
          type="button"
          onClick={doDelete}
          className="text-sm text-red-600 underline"
        >
          Slett rom
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
      setError(err instanceof Error ? err.message : "Feil ved timeout.");
      expiredTurnRef.current = null;
    });
  }

  return (
    <main className="flex flex-col gap-5">
      <header className="flex items-center justify-between rounded-2xl border-4 border-violet-950 bg-violet-900 px-5 py-4 text-violet-50 shadow-[6px_6px_0_0_#0b0420]">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-amber-300">
            🎙️ Vert · Rom {room.code}
          </p>
          <p className="text-2xl font-black uppercase">
            {remaining} ord igjen ({finishedCount}/{totalTurns})
          </p>
        </div>
        {activeTurn && drawer && (
          <div className="text-right">
            <p className="text-xs font-black uppercase tracking-wide text-amber-300">
              Tegner
            </p>
            <p className="text-xl font-black uppercase">{drawer.name}</p>
            <div className="flex items-center justify-end gap-2">
              <p className="text-sm font-bold text-amber-200">
                Ord: {wordHidden ? "●●●●●" : activeTurn.word}
              </p>
              <button
                type="button"
                onClick={() => setWordHidden((v) => !v)}
                className="rounded-md border-2 border-violet-300/50 px-2 py-0.5 text-xs font-bold uppercase text-violet-100 hover:bg-violet-800"
                title={wordHidden ? "Vis ordet" : "Skjul ordet"}
              >
                {wordHidden ? "Vis" : "Skjul"}
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
      <PraiseBanner message={praiseMessage} />
      <PraiseBanner message={timeoutMessage} variant="timeout" />

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
          💬 Gjetninger
        </h2>
        <GuessFeed guesses={guesses} players={players} />
      </section>

      <section className="rounded-2xl border-4 border-rose-700/40 bg-rose-100 p-4 shadow-[6px_6px_0_0_rgba(0,0,0,0.15)]">
        <h2 className="mb-2 text-sm font-black uppercase tracking-wide text-rose-900">
          🏆 Stilling
        </h2>
        <Standings standings={standings} />
      </section>

      {error && <p className="text-sm font-semibold text-red-700">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={doNext}
          disabled={pending}
          className="flex-1 rounded-xl border-4 border-violet-950 bg-violet-800 px-4 py-3 font-black uppercase tracking-wide text-violet-50 shadow-[4px_4px_0_0_#0b0420] transition hover:bg-violet-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#0b0420] disabled:opacity-50"
        >
          {remaining === 0
            ? "Avslutt og vis resultat 🏁"
            : activeTurn
            ? "Neste runde →"
            : "Start neste runde →"}
        </button>
        {activeTurn && (
          <button
            type="button"
            onClick={doSkip}
            disabled={pending}
            className="rounded-xl border-4 border-rose-900 bg-rose-200 px-4 py-3 text-sm font-black uppercase text-rose-900 shadow-[3px_3px_0_0_#881337] hover:bg-rose-300 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_#881337]"
          >
            Hopp over
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={doEnd}
        className="text-sm text-neutral-500 underline"
      >
        Avslutt spillet
      </button>
    </main>
  );
}
