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
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-600">
            🎮 Romkode
          </p>
          <p className="bg-gradient-to-br bg-neutral-800 bg-clip-text text-7xl font-black tracking-[0.2em] text-transparent">
            {room.code}
          </p>
        </header>

        <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-neutral-300 bg-white/80 p-5 shadow-xl backdrop-blur">
          {joinUrl && <RoomQRCode url={joinUrl} />}
          <p className="text-sm text-neutral-700">
            Scan eller gå til <strong>{joinUrl}</strong>
          </p>
        </div>

        <section className="rounded-3xl border-2 border-neutral-300 bg-white/80 p-5 shadow-xl backdrop-blur">
          <h2 className="mb-3 font-bold text-neutral-800">
            🙋 Spillere ({players.length})
          </h2>
          {players.length === 0 ? (
            <p className="text-sm text-neutral-500">Venter på spillere…</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {players.map((p) => (
                <li
                  key={p.id}
                  className="rounded-full bg-pink-100 px-4 py-1.5 text-sm font-semibold text-neutral-800"
                >
                  {p.name}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-3xl border-2 border-pink-200 bg-white/80 p-5 shadow-xl backdrop-blur">
          <h2 className="mb-3 font-bold text-pink-700">
            📝 Ord ({liveWordCount}) — én per linje
          </h2>
          <textarea
            value={wordsText}
            onChange={(e) => setWordsText(e.target.value)}
            onBlur={doSetWords}
            rows={8}
            placeholder={"sykkel\nflyplass\nelefant\n..."}
            className="w-full rounded-xl border-2 border-pink-200 bg-white px-3 py-2 font-mono text-sm focus:border-pink-500 focus:outline-none"
          />
          <p className="mt-2 text-xs text-neutral-600">
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

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={doStart}
          disabled={
            pending || players.length < 2 || liveWordCount < players.length
          }
          className="rounded-xl bg-neutral-900 px-4 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-neutral-800 disabled:bg-neutral-400 disabled:from-neutral-400 disabled:to-neutral-400"
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
      <header className="flex items-center justify-between rounded-3xl bg-gradient-to-r from-neutral-900 to-neutral-800 px-5 py-4 text-white shadow-xl ring-2 ring-pink-400/40">
        <div>
          <p className="text-xs uppercase tracking-wide text-pink-300">
            🎙️ Vert-visning · Rom {room.code}
          </p>
          <p className="text-2xl font-black">
            {remaining} ord igjen ({finishedCount}/{totalTurns})
          </p>
        </div>
        {activeTurn && drawer && (
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-neutral-400">Tegner</p>
            <p className="text-lg font-semibold">{drawer.name}</p>
            <div className="flex items-center justify-end gap-2">
              <p className="text-sm text-yellow-300">
                Ord: {wordHidden ? "●●●●●" : activeTurn.word}
              </p>
              <button
                type="button"
                onClick={() => setWordHidden((v) => !v)}
                className="rounded-md border border-neutral-600 px-2 py-0.5 text-xs text-neutral-300 hover:bg-neutral-800"
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
        />
      )}

      <section className="rounded-3xl border-2 border-neutral-300 bg-white/80 p-4 shadow-xl backdrop-blur">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-neutral-800">
          💬 Gjetninger
        </h2>
        <GuessFeed guesses={guesses} players={players} />
      </section>

      <section className="rounded-3xl border-2 border-pink-200 bg-white/80 p-4 shadow-xl backdrop-blur">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-pink-700">
          🏆 Stilling
        </h2>
        <Standings standings={standings} />
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={doNext}
          disabled={pending}
          className="flex-1 rounded-xl bg-neutral-900 px-4 py-3 font-bold text-white shadow-lg transition hover:bg-neutral-800 disabled:opacity-50"
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
            className="rounded-xl border-2 border-neutral-400 bg-white px-4 py-3 text-sm font-semibold text-neutral-800 hover:bg-pink-50"
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
