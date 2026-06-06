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
import { randomPraise, randomTimeout } from "@/lib/praise";
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
      };
      setStandings(await getStandings(room.id));
      const t = await getActiveTurn(room.id);
      setActiveTurn(t);
      setTurns(await getAllTurns(room.id));
      if (t) setGuesses(await getGuessesForTurn(t.id));
      if (data?.endReason === "timeout") {
        setTimeoutMessage(randomTimeout(data.word));
      }
    });
    channel.subscribe("guess.posted", async (msg) => {
      const data = msg.data as GjetteGuess;
      setGuesses((prev) =>
        prev.some((g) => g.id === data.id) ? prev : [...prev, data],
      );
      if (data.is_correct) {
        const player =
          (await getPlayers(room.id)).find((p) => p.id === data.player_id) ??
          null;
        setPraiseMessage(randomPraise(player?.name ?? "Spiller"));
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

  function doSetWords() {
    if (!hostToken) return;
    setError(null);
    startTransition(async () => {
      try {
        const { wordCount } = await setWords({
          roomId: room.id,
          hostToken,
          wordsText,
        });
        setWordsState(await getWords(room.id));
        if (wordCount === 0) setError("Lim inn minst ett ord.");
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
          <p className="text-sm uppercase tracking-widest text-neutral-500">Romkode</p>
          <p className="text-6xl font-bold tracking-[0.3em]">{room.code}</p>
        </header>

        <div className="flex flex-col items-center gap-3">
          {joinUrl && <RoomQRCode url={joinUrl} />}
          <p className="text-sm text-neutral-600">
            Scan eller gå til <strong>{joinUrl}</strong>
          </p>
        </div>

        <section className="rounded-2xl border border-neutral-200 p-4">
          <h2 className="mb-2 font-semibold">Spillere ({players.length})</h2>
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

        <section className="rounded-2xl border border-neutral-200 p-4">
          <h2 className="mb-2 font-semibold">
            Ord ({words.length}) — én per linje
          </h2>
          <textarea
            value={wordsText}
            onChange={(e) => setWordsText(e.target.value)}
            onBlur={doSetWords}
            rows={8}
            placeholder={"sykkel\nflyplass\nelefant\n..."}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono text-sm"
          />
          <p className="mt-2 text-xs text-neutral-500">
            {players.length >= 2 && words.length >= players.length
              ? `Spillet bruker ${
                  Math.floor(words.length / players.length) * players.length
                } ord (${Math.floor(words.length / players.length)} per spiller). ${
                  words.length % players.length > 0
                    ? `${words.length % players.length} overskudd-ord brukes ikke.`
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
            pending || players.length < 2 || words.length < players.length
          }
          className="rounded-lg bg-neutral-900 px-4 py-3 text-white disabled:opacity-50"
        >
          {players.length < 2
            ? `Minst 2 spillere må joine (${players.length}/2)`
            : words.length < players.length
            ? `Trenger ${players.length - words.length} ord til`
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
      <header className="flex items-center justify-between rounded-2xl bg-neutral-900 px-4 py-3 text-white">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-400">
            Vert-visning · Rom {room.code}
          </p>
          <p className="text-lg font-semibold">
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

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Gjetninger
        </h2>
        <GuessFeed guesses={guesses} players={players} />
      </section>

      <section className="rounded-2xl border border-neutral-200 p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Stilling
        </h2>
        <Standings standings={standings} />
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={doNext}
          disabled={pending}
          className="flex-1 rounded-lg bg-neutral-900 px-4 py-3 text-white disabled:opacity-50"
        >
          {remaining === 0
            ? "Avslutt og vis resultat"
            : activeTurn
            ? "Neste runde"
            : "Start neste runde"}
        </button>
        {activeTurn && (
          <button
            type="button"
            onClick={doSkip}
            disabled={pending}
            className="rounded-lg border border-neutral-300 px-4 py-3 text-sm"
          >
            Hopp over runde
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
