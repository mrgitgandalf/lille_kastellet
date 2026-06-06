"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAblyClient } from "@/lib/ably-client";
import { DrawingCanvas, type Stroke } from "@/components/DrawingCanvas";
import { GuessFeed } from "@/components/GuessFeed";
import { Standings } from "@/components/Standings";
import { FinalReveal } from "@/components/FinalReveal";
import { Confetti } from "@/components/Confetti";
import Timer from "@/components/Timer";
import { PraiseBanner } from "@/components/PraiseBanner";
import {
  getActiveTurn,
  getAllTurns,
  getGuessesForTurn,
  getPlayers,
  getRoomById,
  getStandings,
  submitGuess,
} from "../../../actions";
import type {
  GjetteGuess,
  GjetteTurn,
  Player,
  Room,
  Standing,
} from "@/lib/types";

type Props = {
  initialRoom: Room;
  initialPlayers: Player[];
  initialTurns: GjetteTurn[];
  initialActiveTurn: GjetteTurn | null;
  initialGuesses: GjetteGuess[];
  initialStandings: Standing[];
};

export default function PlayerTurnClient({
  initialRoom,
  initialPlayers,
  initialTurns,
  initialActiveTurn,
  initialGuesses,
  initialStandings,
}: Props) {
  const router = useRouter();
  const [room, setRoom] = useState<Room>(initialRoom);
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [turns, setTurns] = useState<GjetteTurn[]>(initialTurns);
  const [activeTurn, setActiveTurn] = useState<GjetteTurn | null>(initialActiveTurn);
  const [guesses, setGuesses] = useState<GjetteGuess[]>(initialGuesses);
  const [standings, setStandings] = useState<Standing[]>(initialStandings);
  const [externalStrokes, setExternalStrokes] = useState<Stroke[]>([]);
  const [clientToken, setClientToken] = useState<string | null>(null);
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const [guess, setGuess] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confettiTick, setConfettiTick] = useState(0);
  const [praiseMessage, setPraiseMessage] = useState<string | null>(null);
  const [timeoutMessage, setTimeoutMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createAblyClient>["channels"]["get"]
  > | null>(null);
  const activeTurnIdRef = useRef<string | null>(initialActiveTurn?.id ?? null);

  useEffect(() => {
    activeTurnIdRef.current = activeTurn?.id ?? null;
  }, [activeTurn?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setClientToken(localStorage.getItem(`client_token:${room.code}`));
    setTokenLoaded(true);
  }, [room.code]);

  const myPlayer = useMemo(
    () => players.find((p) => p.client_token === clientToken) ?? null,
    [players, clientToken],
  );
  const isDrawer = activeTurn?.drawer_player_id === myPlayer?.id;

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
    const refreshTurn = async () => {
      const t = await getActiveTurn(room.id);
      setActiveTurn(t);
      setTurns(await getAllTurns(room.id));
      setStandings(await getStandings(room.id));
      setExternalStrokes([]);
      setGuesses(t ? await getGuessesForTurn(t.id) : []);
      setGuess("");
    };

    channel.subscribe("room.updated", refreshRoom);
    channel.subscribe("players.updated", refreshPlayers);
    channel.subscribe("turn.started", refreshTurn);
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
      if (data.is_correct) {
        setConfettiTick((t) => t + 1);
        if (data.praiseMessage) setPraiseMessage(data.praiseMessage);
      }
    });
    channel.subscribe("game.finished", async () => {
      setStandings(await getStandings(room.id));
      await refreshRoom();
    });
    channel.subscribe("stroke.added", (msg) => {
      const data = msg.data as { turnId: string; stroke: Stroke };
      if (data.turnId !== activeTurnIdRef.current) return;
      setExternalStrokes((prev) => [...prev, data.stroke]);
    });
    channel.subscribe("canvas.cleared", (msg) => {
      const data = msg.data as { turnId: string };
      if (data.turnId !== activeTurnIdRef.current) return;
      setExternalStrokes([]);
    });

    return () => {
      channel.unsubscribe();
      client.close();
      channelRef.current = null;
    };
  }, [room.id]);

  function publishStroke(stroke: Stroke) {
    const ch = channelRef.current;
    const turnId = activeTurnIdRef.current;
    if (!ch || !turnId) return;
    ch.publish("stroke.added", { turnId, stroke });
  }

  function publishClear() {
    const ch = channelRef.current;
    const turnId = activeTurnIdRef.current;
    if (!ch || !turnId) return;
    ch.publish("canvas.cleared", { turnId });
  }

  function doGuess(e: React.FormEvent) {
    e.preventDefault();
    if (!clientToken) return;
    const text = guess.trim();
    if (text.length === 0) return;
    setGuess("");
    setError(null);
    startTransition(async () => {
      try {
        await submitGuess({ clientToken, text });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Feil.");
      }
    });
  }

  useEffect(() => {
    if (tokenLoaded && !myPlayer) {
      router.push(`/gjettekampen/spill/${room.code}`);
    }
  }, [tokenLoaded, myPlayer, room.code, router]);

  if (!tokenLoaded || !myPlayer) return null;

  if (room.state === "finished") {
    return (
      <main className="flex flex-col gap-6">
        <FinalReveal standings={standings} />
      </main>
    );
  }

  const totalTurns = turns.length;
  const finishedCount = turns.filter((t) => t.state === "finished").length;
  const remaining = totalTurns - finishedCount;
  const drawer = activeTurn
    ? players.find((p) => p.id === activeTurn.drawer_player_id) ?? null
    : null;

  // Mellomstilling — ingen aktiv tur, men spillet er fortsatt 'playing'
  if (!activeTurn) {
    const allDone =
      totalTurns > 0 && turns.every((t) => t.state === "finished");
    return (
      <main className="flex flex-col gap-5">
        <Confetti trigger={confettiTick} />
        <PraiseBanner message={praiseMessage} />
        <PraiseBanner message={timeoutMessage} variant="timeout" />
        <header className="rounded-3xl bg-gradient-to-r from-neutral-900 to-neutral-800 px-5 py-4 text-center text-white shadow-xl ring-2 ring-pink-400/40">
          <p className="text-xs font-bold uppercase tracking-wide text-pink-300">
            {allDone ? "🏁 Spillet er slutt" : "⏸️ Pause"}
          </p>
          <p className="text-xl font-black">
            {remaining} ord igjen ({finishedCount}/{totalTurns})
          </p>
        </header>
        <section className="rounded-3xl border-2 border-pink-200 bg-white/80 p-4 shadow-xl backdrop-blur">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-pink-700">
            🏆 Stilling
          </h2>
          <Standings standings={standings} />
        </section>
        <p className="text-center text-sm text-neutral-500">
          {allDone
            ? "Venter på at verten viser sluttresultatet …"
            : "Venter på neste runde …"}
        </p>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-4">
      <Confetti trigger={confettiTick} />
      <PraiseBanner message={praiseMessage} />
      <PraiseBanner message={timeoutMessage} variant="timeout" />

      <header className="flex items-center justify-between rounded-3xl bg-gradient-to-r from-neutral-900 to-neutral-800 px-5 py-4 text-white shadow-xl ring-2 ring-pink-400/40">
        <div>
          <p className="text-xs uppercase tracking-wide text-pink-300">
            {remaining} ord igjen
          </p>
          <p className="text-xl font-black">
            {finishedCount + 1}/{totalTurns}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-pink-300">
            {isDrawer ? "✏️ Du tegner" : "✏️ Tegner"}
          </p>
          <p className="text-xl font-black">{drawer?.name ?? "?"}</p>
          {isDrawer && (
            <p className="text-base font-bold text-yellow-300">
              Ord: {activeTurn.word}
            </p>
          )}
          {room.round_seconds > 0 && activeTurn.started_at && (
            <div className="mt-1">
              <Timer
                startedAt={Date.parse(activeTurn.started_at)}
                durationSeconds={room.round_seconds}
                tone="dark"
              />
            </div>
          )}
        </div>
      </header>

      {isDrawer ? (
        <>
          <DrawingCanvas
            mode="draw"
            onStrokeComplete={publishStroke}
            onClear={publishClear}
          />
          <p className="text-center text-sm text-neutral-500">
            Tegn ordet! Du kan ikke gjette på din egen tegning.
          </p>
        </>
      ) : (
        <>
          <DrawingCanvas
            mode="spectate"
            externalStrokes={externalStrokes}
            hideToolbar
          />
          <form onSubmit={doGuess} className="flex gap-2">
            <input
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              maxLength={200}
              placeholder="Skriv gjetning…"
              className="flex-1 rounded-xl border-2 border-neutral-300 bg-white px-3 py-3 text-base focus:border-neutral-500 focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              disabled={pending || guess.trim().length === 0}
              className="rounded-xl bg-neutral-900 px-5 py-3 font-bold text-white shadow-md transition hover:bg-neutral-800 disabled:opacity-50"
            >
              Send 🎯
            </button>
          </form>
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

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
    </main>
  );
}
