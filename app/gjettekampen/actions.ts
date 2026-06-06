"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { publishRoomEvent } from "@/lib/ably-server";
import { generateRoomCode } from "@/lib/roomCode";
import { shuffle } from "@/lib/game";
import { randomPraise, randomTimeout } from "@/lib/praise";
import type {
  GjetteGuess,
  GjetteTurn,
  GjetteWord,
  Player,
  Room,
  Standing,
} from "@/lib/types";

// ===== Mutations =====================================================

const createRoomSchema = z.object({
  roundSeconds: z.coerce.number().int().refine(
    (n) => n === 0 || (n >= 15 && n <= 600),
    "roundSeconds må være 0 (ingen tid) eller mellom 15 og 600",
  ),
  guessPoints: z.coerce.number().int().min(0).max(20),
  drawerPoints: z.coerce.number().int().min(0).max(20),
  wordsText: z.string().max(20_000).optional().default(""),
});

export async function createRoom(input: {
  roundSeconds: number;
  guessPoints: number;
  drawerPoints: number;
  wordsText?: string;
}): Promise<{ code: string; hostToken: string }> {
  const parsed = createRoomSchema.parse(input);
  const words = parsed.wordsText
    .split("\n")
    .map((w) => w.trim())
    .filter((w) => w.length > 0 && w.length <= 100);

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateRoomCode();
    try {
      const rows = (await sql`
        insert into rooms (
          code, game_type, mode, round_seconds,
          gjette_guess_points, gjette_drawer_points
        )
        values (
          ${code}, 'gjettekampen', 'player_prompts', ${parsed.roundSeconds},
          ${parsed.guessPoints}, ${parsed.drawerPoints}
        )
        returning id, code, host_token
      `) as { id: string; code: string; host_token: string }[];
      if (rows[0]) {
        const roomId = rows[0].id;
        for (let i = 0; i < words.length; i++) {
          await sql`
            insert into gjette_words (room_id, word, word_order)
            values (${roomId}, ${words[i]}, ${i})
          `;
        }
        return { code: rows[0].code, hostToken: rows[0].host_token };
      }
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
    select id, state from rooms
    where code = ${parsed.code} and game_type = 'gjettekampen'
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

const setWordsSchema = z.object({
  roomId: z.string().uuid(),
  hostToken: z.string().uuid(),
  wordsText: z.string().max(20_000),
});

export async function setWords(input: {
  roomId: string;
  hostToken: string;
  wordsText: string;
}): Promise<{ wordCount: number }> {
  const parsed = setWordsSchema.parse(input);

  const rooms = (await sql`
    select id, state from rooms
    where id = ${parsed.roomId} and host_token = ${parsed.hostToken}
      and game_type = 'gjettekampen'
  `) as { id: string; state: string }[];
  const room = rooms[0];
  if (!room) throw new Error("Uautorisert eller ukjent rom.");
  if (room.state !== "lobby") throw new Error("Kan ikke endre ord etter spillet har startet.");

  const words = parsed.wordsText
    .split("\n")
    .map((w) => w.trim())
    .filter((w) => w.length > 0 && w.length <= 100);

  await sql`delete from gjette_words where room_id = ${room.id}`;
  for (let i = 0; i < words.length; i++) {
    await sql`
      insert into gjette_words (room_id, word, word_order)
      values (${room.id}, ${words[i]}, ${i})
    `;
  }
  await publishRoomEvent(room.id, "room.updated");
  return { wordCount: words.length };
}

export async function startGame(input: {
  roomId: string;
  hostToken: string;
}): Promise<void> {
  const roomRows = (await sql`
    select * from rooms
    where id = ${input.roomId} and host_token = ${input.hostToken}
      and game_type = 'gjettekampen'
  `) as Room[];
  const room = roomRows[0];
  if (!room) throw new Error("Uautorisert eller ukjent rom.");
  if (room.state !== "lobby") throw new Error("Spillet har allerede startet.");

  const players = (await sql`
    select * from players where room_id = ${room.id} order by seat_order asc
  `) as Player[];
  if (players.length < 2) {
    throw new Error("Minst 2 spillere må være med før spillet kan starte.");
  }

  const words = (await sql`
    select * from gjette_words where room_id = ${room.id} order by word_order asc
  `) as GjetteWord[];
  if (words.length < players.length) {
    throw new Error(
      `Trenger minst ${players.length} ord (du har ${words.length}).`,
    );
  }

  // Rettferdig fordeling: bruk floor(words/players) × players ord
  // så alle tegner like mange ganger. Overskudd kappes.
  const turnsPerPlayer = Math.floor(words.length / players.length);
  const turnsCount = turnsPerPlayer * players.length;

  const seed = Date.parse(room.created_at) & 0x7fffffff;
  const shuffled = shuffle(players, seed);

  for (let i = 0; i < turnsCount; i++) {
    const drawer = shuffled[i % shuffled.length];
    await sql`
      insert into gjette_turns (room_id, turn_order, drawer_player_id, word, state)
      values (${room.id}, ${i}, ${drawer.id}, ${words[i].word},
              ${i === 0 ? "active" : "pending"})
    `;
  }
  await sql`
    update gjette_turns set started_at = now()
    where room_id = ${room.id} and turn_order = 0
  `;
  await sql`
    update rooms set state = 'playing', pages_per_book = ${turnsCount}
    where id = ${room.id}
  `;

  await publishRoomEvent(room.id, "room.updated");
  await publishRoomEvent(room.id, "turn.started", { turnOrder: 0 });
  revalidatePath(`/gjettekampen/host/${room.code}`);
}

function normaliseGuess(s: string): string {
  return s.trim().toLowerCase();
}

const submitGuessSchema = z.object({
  clientToken: z.string().uuid(),
  text: z.string().min(1).max(200),
});

export async function submitGuess(input: {
  clientToken: string;
  text: string;
}): Promise<{ accepted: boolean; isCorrect: boolean }> {
  const parsed = submitGuessSchema.parse(input);

  const playerRows = (await sql`
    select * from players where client_token = ${parsed.clientToken}
  `) as Player[];
  const player = playerRows[0];
  if (!player) throw new Error("Spilleren ble ikke funnet.");

  const turnRows = (await sql`
    select * from gjette_turns
    where room_id = ${player.room_id} and state = 'active'
    limit 1
  `) as GjetteTurn[];
  const turn = turnRows[0];
  if (!turn) return { accepted: false, isCorrect: false };
  if (turn.drawer_player_id === player.id) {
    return { accepted: false, isCorrect: false };
  }

  const isCorrect = normaliseGuess(parsed.text) === normaliseGuess(turn.word);

  if (isCorrect) {
    const updated = (await sql`
      update gjette_turns set
        state = 'finished',
        ended_at = now(),
        end_reason = 'correct_guess',
        winner_player_id = ${player.id}
      where id = ${turn.id} and state = 'active'
      returning id
    `) as { id: string }[];

    if (updated.length === 0) {
      // En annen vant racet — registrer gjetningen, men ikke som riktig.
      const ins = (await sql`
        insert into gjette_guesses (turn_id, player_id, text, is_correct)
        values (${turn.id}, ${player.id}, ${parsed.text}, false)
        returning id, created_at
      `) as { id: string; created_at: string }[];
      await publishRoomEvent(player.room_id, "guess.posted", {
        id: ins[0].id,
        turn_id: turn.id,
        player_id: player.id,
        text: parsed.text,
        is_correct: false,
        created_at: ins[0].created_at,
      });
      return { accepted: true, isCorrect: false };
    }

    const ins = (await sql`
      insert into gjette_guesses (turn_id, player_id, text, is_correct)
      values (${turn.id}, ${player.id}, ${parsed.text}, true)
      returning id, created_at
    `) as { id: string; created_at: string }[];
    const praiseMessage = randomPraise(player.name);
    await publishRoomEvent(player.room_id, "guess.posted", {
      id: ins[0].id,
      turn_id: turn.id,
      player_id: player.id,
      text: parsed.text,
      is_correct: true,
      created_at: ins[0].created_at,
      praiseMessage,
    });
    await publishRoomEvent(player.room_id, "turn.ended", {
      turnId: turn.id,
      winnerId: player.id,
      word: turn.word,
      endReason: "correct_guess",
    });
    return { accepted: true, isCorrect: true };
  }

  const ins = (await sql`
    insert into gjette_guesses (turn_id, player_id, text, is_correct)
    values (${turn.id}, ${player.id}, ${parsed.text}, false)
    returning id, created_at
  `) as { id: string; created_at: string }[];
  await publishRoomEvent(player.room_id, "guess.posted", {
    id: ins[0].id,
    turn_id: turn.id,
    player_id: player.id,
    text: parsed.text,
    is_correct: false,
    created_at: ins[0].created_at,
  });
  return { accepted: true, isCorrect: false };
}

export async function markTurnTimeout(input: {
  roomId: string;
  hostToken: string;
}): Promise<void> {
  const roomRows = (await sql`
    select * from rooms
    where id = ${input.roomId} and host_token = ${input.hostToken}
      and game_type = 'gjettekampen'
  `) as Room[];
  const room = roomRows[0];
  if (!room) throw new Error("Uautorisert eller ukjent rom.");
  if (room.state !== "playing") return;

  // Lukk kun den aktive turen (med timeout). Verten starter neste manuelt.
  const updated = (await sql`
    update gjette_turns set
      state = 'finished',
      ended_at = now(),
      end_reason = 'timeout'
    where room_id = ${room.id} and state = 'active'
    returning id, word
  `) as { id: string; word: string }[];

  if (updated[0]) {
    await publishRoomEvent(room.id, "turn.ended", {
      turnId: updated[0].id,
      winnerId: null,
      word: updated[0].word,
      endReason: "timeout",
      timeoutMessage: randomTimeout(updated[0].word),
    });
  }
}

export async function nextTurn(input: {
  roomId: string;
  hostToken: string;
}): Promise<void> {
  const roomRows = (await sql`
    select * from rooms
    where id = ${input.roomId} and host_token = ${input.hostToken}
      and game_type = 'gjettekampen'
  `) as Room[];
  const room = roomRows[0];
  if (!room) throw new Error("Uautorisert eller ukjent rom.");
  if (room.state !== "playing") throw new Error("Spillet er ikke aktivt.");

  // Steng aktiv tur (timeout hvis ikke allerede ferdig)
  const active = (await sql`
    select * from gjette_turns
    where room_id = ${room.id} and state = 'active'
    limit 1
  `) as GjetteTurn[];
  if (active[0]) {
    await sql`
      update gjette_turns set
        state = 'finished',
        ended_at = now(),
        end_reason = 'timeout'
      where id = ${active[0].id} and state = 'active'
    `;
    await publishRoomEvent(room.id, "turn.ended", {
      turnId: active[0].id,
      winnerId: null,
      word: active[0].word,
      endReason: "timeout",
      timeoutMessage: randomTimeout(active[0].word),
    });
  }

  const next = (await sql`
    select * from gjette_turns
    where room_id = ${room.id} and state = 'pending'
    order by turn_order asc
    limit 1
  `) as GjetteTurn[];

  if (!next[0]) {
    await sql`update rooms set state = 'finished' where id = ${room.id}`;
    await publishRoomEvent(room.id, "game.finished");
    await publishRoomEvent(room.id, "room.updated");
    revalidatePath(`/gjettekampen/host/${room.code}`);
    return;
  }

  await sql`
    update gjette_turns set state = 'active', started_at = now()
    where id = ${next[0].id}
  `;
  await publishRoomEvent(room.id, "turn.started", { turnOrder: next[0].turn_order });
}

export async function skipTurn(input: {
  roomId: string;
  hostToken: string;
}): Promise<void> {
  const roomRows = (await sql`
    select * from rooms
    where id = ${input.roomId} and host_token = ${input.hostToken}
      and game_type = 'gjettekampen'
  `) as Room[];
  const room = roomRows[0];
  if (!room) throw new Error("Uautorisert.");

  const active = (await sql`
    select * from gjette_turns
    where room_id = ${room.id} and state = 'active'
    limit 1
  `) as GjetteTurn[];
  if (active[0]) {
    await sql`
      update gjette_turns set
        state = 'finished',
        ended_at = now(),
        end_reason = 'skipped'
      where id = ${active[0].id} and state = 'active'
    `;
    await publishRoomEvent(room.id, "turn.ended", {
      turnId: active[0].id,
      winnerId: null,
      word: active[0].word,
      endReason: "skipped",
    });
  }
  await nextTurn(input);
}

export async function endGame(input: {
  roomId: string;
  hostToken: string;
}): Promise<void> {
  const roomRows = (await sql`
    select * from rooms
    where id = ${input.roomId} and host_token = ${input.hostToken}
      and game_type = 'gjettekampen'
  `) as Room[];
  const room = roomRows[0];
  if (!room) throw new Error("Uautorisert.");

  await sql`
    update gjette_turns set
      state = 'finished',
      ended_at = coalesce(ended_at, now()),
      end_reason = coalesce(end_reason, 'timeout')
    where room_id = ${room.id} and state = 'active'
  `;
  await sql`update rooms set state = 'finished' where id = ${room.id}`;
  await publishRoomEvent(room.id, "game.finished");
  await publishRoomEvent(room.id, "room.updated");
}

export async function deleteRoom(input: {
  roomId: string;
  hostToken: string;
}): Promise<void> {
  const ok = (await sql`
    select id from rooms
    where id = ${input.roomId} and host_token = ${input.hostToken}
      and game_type = 'gjettekampen'
  `) as { id: string }[];
  if (!ok[0]) throw new Error("Uautorisert.");
  await publishRoomEvent(input.roomId, "room.updated", { deleted: true });
  await sql`delete from rooms where id = ${input.roomId}`;
}

// ===== Queries =======================================================

export async function getRoomByCode(code: string): Promise<Room | null> {
  const rows = (await sql`
    select * from rooms where code = ${code} and game_type = 'gjettekampen'
  `) as Room[];
  return rows[0] ?? null;
}

export async function getRoomById(id: string): Promise<Room | null> {
  const rows = (await sql`
    select * from rooms where id = ${id} and game_type = 'gjettekampen'
  `) as Room[];
  return rows[0] ?? null;
}

export async function getPlayers(roomId: string): Promise<Player[]> {
  return (await sql`
    select * from players where room_id = ${roomId} order by seat_order asc
  `) as Player[];
}

export async function getWords(roomId: string): Promise<GjetteWord[]> {
  return (await sql`
    select * from gjette_words where room_id = ${roomId} order by word_order asc
  `) as GjetteWord[];
}

export async function getActiveTurn(roomId: string): Promise<GjetteTurn | null> {
  const rows = (await sql`
    select * from gjette_turns
    where room_id = ${roomId} and state = 'active'
    limit 1
  `) as GjetteTurn[];
  return rows[0] ?? null;
}

export async function getAllTurns(roomId: string): Promise<GjetteTurn[]> {
  return (await sql`
    select * from gjette_turns where room_id = ${roomId} order by turn_order asc
  `) as GjetteTurn[];
}

export async function getGuessesForTurn(turnId: string): Promise<GjetteGuess[]> {
  return (await sql`
    select * from gjette_guesses
    where turn_id = ${turnId}
    order by created_at asc
  `) as GjetteGuess[];
}

export async function getStandings(roomId: string): Promise<Standing[]> {
  const roomRows = (await sql`
    select gjette_guess_points, gjette_drawer_points from rooms where id = ${roomId}
  `) as { gjette_guess_points: number; gjette_drawer_points: number }[];
  const guessPoints = roomRows[0]?.gjette_guess_points ?? 1;
  const drawerPoints = roomRows[0]?.gjette_drawer_points ?? 3;

  const rows = (await sql`
    with finished as (
      select drawer_player_id, winner_player_id
      from gjette_turns
      where room_id = ${roomId} and state = 'finished'
    )
    select
      p.id as player_id,
      p.name,
      coalesce((select count(*) from finished f
        where f.drawer_player_id = p.id and f.winner_player_id is not null), 0)::int
        as draws_won,
      coalesce((select count(*) from finished f
        where f.winner_player_id = p.id), 0)::int
        as guesses_won
    from players p
    where p.room_id = ${roomId}
    order by p.seat_order asc
  `) as { player_id: string; name: string; draws_won: number; guesses_won: number }[];
  return rows
    .map((r) => ({
      ...r,
      score: r.draws_won * drawerPoints + r.guesses_won * guessPoints,
    }))
    .sort((a, b) => b.score - a.score);
}
