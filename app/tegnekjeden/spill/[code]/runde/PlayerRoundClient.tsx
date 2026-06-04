"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAblyClient } from "@/lib/ably-client";
import {
  getPreviousPageForPlayer,
  getRoomById,
  submitPage,
} from "../../../actions";
import { DrawingCanvas, type DrawingCanvasHandle } from "@/components/DrawingCanvas";
import Timer from "@/components/Timer";
import { pageKindForIndex } from "@/lib/game";
import type { Room } from "@/lib/types";

export default function PlayerRoundClient({ initialRoom }: { initialRoom: Room }) {
  const router = useRouter();
  const [room, setRoom] = useState<Room>(initialRoom);
  const [clientToken, setClientToken] = useState<string | null>(null);
  const [previousContent, setPreviousContent] = useState<{
    kind: "text" | "drawing";
    content: string;
  } | null>(null);
  const [textInput, setTextInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const canvasRef = useRef<DrawingCanvasHandle | null>(null);
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    if (typeof window === "undefined") return;
    setClientToken(localStorage.getItem(`client_token:${room.code}`));
  }, [room.code]);

  // Lytt på room.updated for å vite når runde / state endrer seg
  useEffect(() => {
    const client = createAblyClient();
    const channel = client.channels.get(`room:${room.id}`);
    const refreshRoom = async () => {
      const r = await getRoomById(room.id);
      if (r) setRoom(r);
    };
    channel.subscribe("room.updated", refreshRoom);
    return () => {
      channel.unsubscribe();
      client.close();
    };
  }, [room.id]);

  // Når runden endres, reset submit-state og hent forrige side
  useEffect(() => {
    setSubmitted(false);
    setTextInput("");
    setError(null);
    startedAtRef.current = Date.now();
    canvasRef.current?.clear();

    if (!clientToken || !room.pages_per_book) return;
    if (room.current_round === 0) {
      setPreviousContent(null);
      return;
    }
    (async () => {
      const prev = await getPreviousPageForPlayer({ clientToken });
      setPreviousContent(prev);
    })();
  }, [clientToken, room.current_round, room.pages_per_book, room.id]);

  // Når host sender til reveal, redirect
  useEffect(() => {
    if (room.state === "reveal") {
      router.push(`/tegnekjeden/spill/${room.code}/venter`);
    }
  }, [room.state, room.code, router]);

  if (!clientToken) {
    return (
      <main className="text-center">
        <p>Laster spilleren din...</p>
      </main>
    );
  }

  if (!room.pages_per_book || room.state !== "playing") {
    return (
      <main className="text-center">
        <h1 className="text-xl font-semibold">
          Venter på at host starter neste...
        </h1>
      </main>
    );
  }

  const round = room.current_round;
  const kind = pageKindForIndex(round, room.mode);

  function doSubmit() {
    if (!clientToken) return;
    setError(null);
    let content: string;
    if (kind === "text") {
      if (textInput.trim().length === 0) {
        setError("Skriv noe før du sender inn.");
        return;
      }
      content = textInput.trim();
    } else {
      content = canvasRef.current?.toPng() ?? "";
      if (!content) {
        setError("Tegningen mangler.");
        return;
      }
    }
    startTransition(async () => {
      try {
        await submitPage({ clientToken, content });
        setSubmitted(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Kunne ikke sende inn.");
      }
    });
  }

  if (submitted) {
    return (
      <main className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-semibold">Sendt inn! 🎉</h1>
        <p className="text-neutral-600">
          Venter på de andre. Host starter neste runde.
        </p>
        {room.round_seconds > 0 && (
          <Timer
            startedAt={startedAtRef.current}
            durationSeconds={room.round_seconds}
          />
        )}
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          Runde {round + 1} av {room.pages_per_book}
        </p>
        {room.round_seconds > 0 && (
          <Timer
            startedAt={startedAtRef.current}
            durationSeconds={room.round_seconds}
          />
        )}
      </header>

      {previousContent && (
        <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            {previousContent.kind === "text"
              ? "Beskriv dette med en tegning:"
              : "Beskriv denne tegningen med ord:"}
          </p>
          {previousContent.kind === "text" ? (
            <p className="text-lg">{previousContent.content}</p>
          ) : (
            <img
              src={previousContent.content}
              alt="Forrige tegning"
              className="w-full rounded-lg"
            />
          )}
        </section>
      )}

      {kind === "text" ? (
        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          rows={5}
          maxLength={300}
          placeholder={round === 0 ? "Skriv din startsetning..." : "Beskriv tegningen..."}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-base"
        />
      ) : (
        <DrawingCanvas ref={canvasRef} />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={doSubmit}
        disabled={pending}
        className="rounded-lg bg-neutral-900 px-4 py-3 text-white disabled:opacity-50"
      >
        {pending ? "Sender inn..." : "Send inn"}
      </button>
    </main>
  );
}
