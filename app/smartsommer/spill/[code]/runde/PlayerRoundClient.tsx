"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { submitPage } from "../../../actions";
import { DrawingCanvas, type DrawingCanvasHandle } from "@/components/DrawingCanvas";
import Timer from "@/components/Timer";
import { ownerSeatForRound, pageKindForIndex } from "@/lib/game";
import type { Player, Room } from "@/lib/types";

export default function PlayerRoundClient({ initialRoom }: { initialRoom: Room }) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [room, setRoom] = useState<Room>(initialRoom);
  const [players, setPlayers] = useState<Player[]>([]);
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

  // Hold rom + spillerliste oppdatert
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", room.id)
        .order("seat_order", { ascending: true });
      if (!cancelled) setPlayers(data ?? []);
    })();

    const channel = supabase
      .channel(`player-round-${room.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `id=eq.${room.id}` },
        (payload) => {
          if (payload.new) setRoom(payload.new as Room);
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [room.id, supabase]);

  const me = useMemo(
    () => players.find((p) => p.client_token === clientToken) ?? null,
    [players, clientToken],
  );

  // Reset submit-state og hent forrige side når runden endres
  useEffect(() => {
    setSubmitted(false);
    setTextInput("");
    setError(null);
    startedAtRef.current = Date.now();
    canvasRef.current?.clear();

    if (!me || !room.pages_per_book) return;
    const N = room.pages_per_book;
    const round = room.current_round;
    if (round === 0) {
      setPreviousContent(null);
      return;
    }

    (async () => {
      const ownerSeat = ownerSeatForRound(me.seat_order, round, N);
      const owner = players.find((x) => x.seat_order === ownerSeat);
      if (!owner) return;
      const { data: book } = await supabase
        .from("books")
        .select("id")
        .eq("room_id", room.id)
        .eq("owner_player_id", owner.id)
        .maybeSingle();
      if (!book) return;
      const { data: page } = await supabase
        .from("pages")
        .select("kind, content")
        .eq("book_id", book.id)
        .eq("page_index", round - 1)
        .maybeSingle();
      if (page) setPreviousContent({ kind: page.kind as "text" | "drawing", content: page.content });
    })();
  }, [me, room.current_round, room.pages_per_book, room.id, players, supabase]);

  // Når host avslutter runden, oppdater state (rom-state endres via realtime)
  useEffect(() => {
    if (room.state === "reveal") {
      router.push(`/smartsommer/spill/${room.code}/venter`);
    }
  }, [room.state, room.code, router]);

  if (!clientToken || !me) {
    return (
      <main className="text-center">
        <p>Laster spilleren din...</p>
      </main>
    );
  }

  if (!room.pages_per_book || room.state !== "playing") {
    return (
      <main className="text-center">
        <h1 className="text-xl font-semibold">Venter på at host starter neste...</h1>
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
        <Timer
          startedAt={startedAtRef.current}
          durationSeconds={room.round_seconds}
        />
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          Runde {round + 1} av {room.pages_per_book}
        </p>
        <Timer
          startedAt={startedAtRef.current}
          durationSeconds={room.round_seconds}
        />
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
