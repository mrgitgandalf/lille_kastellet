"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { publishRoomEvent } from "@/lib/ably-server";
import { generateRoomCode } from "@/lib/roomCode";
import {
  firstActiveRound,
  ownerSeatForRound,
  pageKindForIndex,
  shuffle,
} from "@/lib/game";
import type { Book, Page, Player, Room, RoomMode } from "@/lib/types";

// ===== Mutations =====================================================

const createRoomSchema = z.object({
  mode: z.enum(["player_prompts", "preset_prompts"]),
  presetPrompts: z.string().max(50_000).optional().default(""),
  roundSeconds: z.coerce.number().int().min(15).max(600),
});

export async function createRoom(input: {
  mode: RoomMode;
  presetPrompts: string;
  roundSeconds: number;
}): Promise<{ code: string; hostToken: string }> {
  const parsed = createRoomSchema.parse(input);
  const prompts =
    parsed.mode === "preset_prompts"
      ? parsed.presetPrompts
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
      : [];

  if (parsed.mode === "preset_prompts" && prompts.length === 0) {
    throw new Error("Lim inn minst én startsetning, eller velg fri modus.");
  }

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateRoomCode();
    try {
      const rows = (await sql`
        insert into rooms (code, mode, preset_prompts, round_seconds)
        values (${code}, ${parsed.mode}, ${prompts}, ${parsed.roundSeconds})
        returning code, host_token
      `) as { code: string; host_token: string }[];
      if (rows[0]) return { code: rows[0].code, hostToken: rows[0].host_token };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("duplicate") && !msg.includes("unique")) throw err;
    }
  }
  throw new Error("Klarte ikke å generere en unik romkode. Prøv igjen.");
}

const joinRoomSchema = z.object({
  code: z.string().regex(/^\d{4}$/),
  name: z.string().min(1).max(40),
});

export async function joinRoom(input: {
  code: string;
  name: string;
}): Promise<{ playerId: string; clientToken: string; roomId: string }> {
  const parsed = joinRoomSchema.parse(input);

  const roomRows = (await sql`
    select id, state from rooms where code = ${parsed.code}
  `) as { id: string; state: string }[];
  const room = roomRows[0];
  if (!room) throw new Error("Fant ikke rom med den koden.");
  if (room.state !== "lobby") throw new Error("Spillet har allerede startet.");

  const maxSeatRows = (await sql`
    select coalesce(max(seat_order), -1) as max_seat
    from players where room_id = ${room.id}
  `) as { max_seat: number }[];
  const nextSeat = (maxSeatRows[0]?.max_seat ?? -1) + 1;
  if (nextSeat >= 20) throw new Error("Rommet er fullt (maks 20 spillere).");

  const inserted = (await sql`
    insert into players (room_id, name, seat_order)
    values (${room.id}, ${parsed.name.trim()}, ${nextSeat})
    returning id, client_token, room_id
  `) as { id: string; client_token: string; room_id: string }[];

  const player = inserted[0];
  await publishRoomEvent(room.id, "players.updated");
  return {
    playerId: player.id,
    clientToken: player.client_token,
    roomId: player.room_id,
  };
}

export async function startGame(input: {
  roomId: string;
  hostToken: string;
}): Promise<void> {
  const roomRows = (await sql`
    select * from rooms
    where id = ${input.roomId} and host_token = ${input.hostToken}
  `) as Room[];
  const room = roomRows[0];
  if (!room) throw new Error("Uautorisert eller ukjent rom.");
  if (room.state !== "lobby") throw new Error("Spillet har allerede startet.");

  const players = (await sql`
    select * from players where room_id = ${room.id}
    order by seat_order asc
  `) as Player[];
  if (players.length < 3) {
    throw new Error("Minst 3 spillere må være med før spillet kan starte.");
  }
  const N = players.length;

  // Opprett én bok per spiller. Sender flere insert-statements som
  // Neon batcher under panseret.
  const books = (await sql`
    insert into books (room_id, owner_player_id)
    select ${room.id}::uuid, p.id
    from players p where p.room_id = ${room.id}
    returning id, owner_player_id
  `) as Pick<Book, "id" | "owner_player_id">[];

  if (room.mode === "preset_prompts") {
    const seed = Date.parse(room.created_at) & 0x7fffffff;
    const shuffled = shuffle(room.preset_prompts, seed);
    for (let i = 0; i < books.length; i++) {
      const content = shuffled[i % shuffled.length];
      await sql`
        insert into pages (book_id, page_index, author_player_id, kind, content)
        values (${books[i].id}, 0, null, 'text', ${content})
      `;
    }
  }

  await sql`
    update rooms set
      state = 'playing',
      pages_per_book = ${N},
      current_round = ${firstActiveRound(room.mode)}
    where id = ${room.id}
  `;

  await publishRoomEvent(room.id, "room.updated");
  revalidatePath(`/smartsommer/host/${room.code}`);
}

const submitPageSchema = z.object({
  clientToken: z.string().uuid(),
  content: z.string().max(800_000),
});

export async function submitPage(input: {
  clientToken: string;
  content: string;
}): Promise<void> {
  const parsed = submitPageSchema.parse(input);

  const playerRows = (await sql`
    select * from players where client_token = ${parsed.clientToken}
  `) as Player[];
  const player = playerRows[0];
  if (!player) throw new Error("Spilleren ble ikke funnet.");

  const roomRows = (await sql`
    select * from rooms where id = ${player.room_id}
  `) as Room[];
  const room = roomRows[0];
  if (!room) throw new Error("Rommet finnes ikke lenger.");
  if (room.state !== "playing") throw new Error("Spillet er ikke aktivt.");

  const N = room.pages_per_book!;
  const round = room.current_round;
  const ownerSeat = ownerSeatForRound(player.seat_order, round, N);

  const ownerRows = (await sql`
    select id from players
    where room_id = ${room.id} and seat_order = ${ownerSeat}
  `) as { id: string }[];
  if (!ownerRows[0]) throw new Error("Fant ikke boken din for denne runden.");

  const bookRows = (await sql`
    select id from books
    where room_id = ${room.id} and owner_player_id = ${ownerRows[0].id}
  `) as { id: string }[];
  if (!bookRows[0]) throw new Error("Fant ikke boken din for denne runden.");

  const kind = pageKindForIndex(round, room.mode);

  await sql`
    insert into pages (book_id, page_index, author_player_id, kind, content)
    values (${bookRows[0].id}, ${round}, ${player.id}, ${kind}, ${parsed.content})
    on conflict (book_id, page_index)
    do update set
      author_player_id = excluded.author_player_id,
      kind = excluded.kind,
      content = excluded.content,
      submitted_at = now()
  `;

  await publishRoomEvent(room.id, "pages.updated", { round });
}

export async function nextRound(input: {
  roomId: string;
  hostToken: string;
}): Promise<void> {
  const roomRows = (await sql`
    select * from rooms
    where id = ${input.roomId} and host_token = ${input.hostToken}
  `) as Room[];
  const room = roomRows[0];
  if (!room) throw new Error("Uautorisert eller ukjent rom.");
  if (room.state !== "playing") throw new Error("Spillet er ikke aktivt.");

  const N = room.pages_per_book!;
  const round = room.current_round;

  const players = (await sql`
    select * from players where room_id = ${room.id}
    order by seat_order asc
  `) as Player[];
  const books = (await sql`
    select id, owner_player_id from books where room_id = ${room.id}
  `) as { id: string; owner_player_id: string }[];
  const booksByOwner = new Map(books.map((b) => [b.owner_player_id, b.id]));
  const bookIds = books.map((b) => b.id);

  const existingPages = (await sql`
    select book_id from pages
    where page_index = ${round}
    and book_id = any(${bookIds}::uuid[])
  `) as { book_id: string }[];
  const filledBookIds = new Set(existingPages.map((p) => p.book_id));

  const kind = pageKindForIndex(round, room.mode);
  for (const p of players) {
    const ownerSeat = ownerSeatForRound(p.seat_order, round, N);
    const owner = players.find((x) => x.seat_order === ownerSeat);
    if (!owner) continue;
    const bookId = booksByOwner.get(owner.id);
    if (!bookId || filledBookIds.has(bookId)) continue;
    await sql`
      insert into pages (book_id, page_index, author_player_id, kind, content)
      values (${bookId}, ${round}, ${p.id}, ${kind}, ${kind === "text" ? "(hoppet over)" : ""})
      on conflict (book_id, page_index) do nothing
    `;
  }

  const nextRoundIndex = round + 1;
  const isFinished = nextRoundIndex >= N;

  await sql`
    update rooms set
      current_round = ${isFinished ? round : nextRoundIndex},
      state = ${isFinished ? "reveal" : "playing"}
    where id = ${room.id}
  `;

  await publishRoomEvent(room.id, "room.updated");
  revalidatePath(`/smartsommer/host/${room.code}`);
}

export async function setPlayerSkipped(input: {
  roomId: string;
  hostToken: string;
  playerId: string;
  skipped: boolean;
}): Promise<void> {
  const ok = (await sql`
    select id from rooms
    where id = ${input.roomId} and host_token = ${input.hostToken}
  `) as { id: string }[];
  if (!ok[0]) throw new Error("Uautorisert.");
  await sql`
    update players set is_skipped = ${input.skipped}
    where id = ${input.playerId} and room_id = ${input.roomId}
  `;
  await publishRoomEvent(input.roomId, "players.updated");
}

export async function deleteRoom(input: {
  roomId: string;
  hostToken: string;
}): Promise<void> {
  const ok = (await sql`
    select id from rooms
    where id = ${input.roomId} and host_token = ${input.hostToken}
  `) as { id: string }[];
  if (!ok[0]) throw new Error("Uautorisert.");
  await publishRoomEvent(input.roomId, "room.updated", { deleted: true });
  await sql`delete from rooms where id = ${input.roomId}`;
}

// ===== Queries (kalt fra klient-komponenter ved Ably-events) ==========

export async function getRoomByCode(code: string): Promise<Room | null> {
  const rows = (await sql`select * from rooms where code = ${code}`) as Room[];
  return rows[0] ?? null;
}

export async function getRoomById(id: string): Promise<Room | null> {
  const rows = (await sql`select * from rooms where id = ${id}`) as Room[];
  return rows[0] ?? null;
}

export async function getPlayers(roomId: string): Promise<Player[]> {
  return (await sql`
    select * from players where room_id = ${roomId}
    order by seat_order asc
  `) as Player[];
}

/**
 * Returnerer hvilke spillere som har sendt inn side for inneværende runde.
 * Brukes av host-skjermen til å vise live progress.
 */
export async function getSubmittedAuthors(
  roomId: string,
  round: number,
): Promise<string[]> {
  const rows = (await sql`
    select distinct p.author_player_id as id
    from pages p
    join books b on b.id = p.book_id
    where b.room_id = ${roomId}
    and p.page_index = ${round}
    and p.author_player_id is not null
  `) as { id: string }[];
  return rows.map((r) => r.id);
}

/**
 * Henter forrige side for spilleren i inneværende runde, slik at de
 * vet hva de skal beskrive/tegne basert på.
 */
export async function getPreviousPageForPlayer(input: {
  clientToken: string;
}): Promise<{ kind: "text" | "drawing"; content: string } | null> {
  const players = (await sql`
    select * from players where client_token = ${input.clientToken}
  `) as Player[];
  const player = players[0];
  if (!player) return null;

  const rooms = (await sql`select * from rooms where id = ${player.room_id}`) as Room[];
  const room = rooms[0];
  if (!room || !room.pages_per_book) return null;

  const round = room.current_round;
  if (round === 0) return null;

  const N = room.pages_per_book;
  const ownerSeat = ownerSeatForRound(player.seat_order, round, N);

  const owners = (await sql`
    select id from players
    where room_id = ${room.id} and seat_order = ${ownerSeat}
  `) as { id: string }[];
  if (!owners[0]) return null;

  const books = (await sql`
    select id from books
    where room_id = ${room.id} and owner_player_id = ${owners[0].id}
  `) as { id: string }[];
  if (!books[0]) return null;

  const pages = (await sql`
    select kind, content from pages
    where book_id = ${books[0].id} and page_index = ${round - 1}
  `) as { kind: "text" | "drawing"; content: string }[];
  return pages[0] ?? null;
}

export async function getRevealData(code: string): Promise<{
  room: Room;
  players: Player[];
  books: Book[];
  pages: Page[];
} | null> {
  const rooms = (await sql`select * from rooms where code = ${code}`) as Room[];
  const room = rooms[0];
  if (!room) return null;

  const players = (await sql`
    select * from players where room_id = ${room.id} order by seat_order asc
  `) as Player[];
  const books = (await sql`
    select * from books where room_id = ${room.id}
  `) as Book[];
  const bookIds = books.map((b) => b.id);
  const pages = bookIds.length
    ? ((await sql`
        select * from pages
        where book_id = any(${bookIds}::uuid[])
        order by page_index asc
      `) as Page[])
    : [];
  return { room, players, books, pages };
}
