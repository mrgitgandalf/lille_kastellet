"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteRoom } from "../../../actions";
import type { Book, Page, Player, Room } from "@/lib/types";

export default function RevealClient({
  room,
  players,
  books,
  pages,
}: {
  room: Room;
  players: Player[];
  books: Book[];
  pages: Page[];
}) {
  const router = useRouter();
  const [bookIdx, setBookIdx] = useState(0);
  const [pageIdx, setPageIdx] = useState(0);
  const [hostToken, setHostToken] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHostToken(localStorage.getItem(`host_token:${room.code}`));
  }, [room.code]);

  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  // Sorter bøker etter eier-seat for stabil rekkefølge
  const sortedBooks = useMemo(() => {
    const list = books.slice();
    list.sort((a, b) => {
      const sa = playerById.get(a.owner_player_id)?.seat_order ?? 0;
      const sb = playerById.get(b.owner_player_id)?.seat_order ?? 0;
      return sa - sb;
    });
    return list;
  }, [books, playerById]);

  const pagesByBook = useMemo(() => {
    const map = new Map<string, Page[]>();
    for (const p of pages) {
      const arr = map.get(p.book_id) ?? [];
      arr.push(p);
      map.set(p.book_id, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.page_index - b.page_index);
    }
    return map;
  }, [pages]);

  const currentBook = sortedBooks[bookIdx];
  const currentPages = currentBook ? pagesByBook.get(currentBook.id) ?? [] : [];
  const currentPage = currentPages[pageIdx];
  const owner = currentBook ? playerById.get(currentBook.owner_player_id) : null;
  const totalPages = currentPages.length;

  function next() {
    if (pageIdx + 1 < totalPages) {
      setPageIdx(pageIdx + 1);
    } else if (bookIdx + 1 < sortedBooks.length) {
      setBookIdx(bookIdx + 1);
      setPageIdx(0);
    }
  }

  function prev() {
    if (pageIdx > 0) {
      setPageIdx(pageIdx - 1);
    } else if (bookIdx > 0) {
      const prevBookPages = pagesByBook.get(sortedBooks[bookIdx - 1].id) ?? [];
      setBookIdx(bookIdx - 1);
      setPageIdx(Math.max(0, prevBookPages.length - 1));
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") next();
      else if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function doDelete() {
    if (!hostToken) return;
    if (!confirm("Slett dette rommet og alle data? Kan ikke angres.")) return;
    startTransition(async () => {
      try {
        await deleteRoom({ roomId: room.id, hostToken });
        router.push("/tegnekjeden");
      } catch (err) {
        alert(err instanceof Error ? err.message : "Feil ved sletting.");
      }
    });
  }

  if (sortedBooks.length === 0) {
    return (
      <main className="text-center">
        <p>Ingen bøker å vise.</p>
      </main>
    );
  }

  const authorName = currentPage?.author_player_id
    ? playerById.get(currentPage.author_player_id)?.name ?? "Ukjent"
    : "Host (startsetning)";

  return (
    <main className="flex min-h-[80vh] flex-col gap-4">
      <header className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          Bok {bookIdx + 1} av {sortedBooks.length} – {owner?.name ?? "?"}
        </p>
        <p className="text-sm text-neutral-500">
          Side {pageIdx + 1} av {totalPages}
        </p>
      </header>

      <section className="flex h-[68vh] flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        {currentPage ? (
          currentPage.kind === "text" ? (
            <p className="max-w-3xl text-center text-3xl font-medium">
              {currentPage.content}
            </p>
          ) : (
            <img
              src={currentPage.content}
              alt="Tegning"
              className="max-h-[55vh] w-auto rounded-lg"
            />
          )
        ) : (
          <p className="text-neutral-500">Tom side</p>
        )}
        <p className="mt-4 text-sm text-neutral-500">av {authorName}</p>
      </section>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={prev}
          disabled={bookIdx === 0 && pageIdx === 0}
          className="rounded-lg border border-neutral-300 px-4 py-2 disabled:opacity-30"
        >
          ← Forrige
        </button>
        <p className="text-xs text-neutral-500">
          Bruk piltaster eller mellomrom for å bla
        </p>
        <button
          type="button"
          onClick={next}
          disabled={
            bookIdx === sortedBooks.length - 1 && pageIdx === totalPages - 1
          }
          className="rounded-lg bg-neutral-900 px-4 py-2 text-white disabled:opacity-30"
        >
          Neste →
        </button>
      </div>

      <button
        type="button"
        onClick={doDelete}
        disabled={pending}
        className="mt-6 self-center text-sm text-red-600 underline"
      >
        Avslutt og slett rom
      </button>
    </main>
  );
}
