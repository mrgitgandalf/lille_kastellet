"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateRoomCode } from "@/lib/roomCode";
import {
  firstActiveRound,
  ownerSeatForRound,
  pageKindForIndex,
  shuffle,
} from "@/lib/game";
import type { Player, Room } from "@/lib/types";

// -------- createRoom --------------------------------------------------

const createRoomSchema = z.object({
  mode: z.enum(["player_prompts", "preset_prompts"]),
  presetPrompts: z.string().max(50_000).optional().default(""),
  roundSeconds: z.coerce.number().int().min(15).max(600),
});

export async function createRoom(input: {
  mode: "player_prompts" | "preset_prompts";
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

  const supabase = createSupabaseServerClient();

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateRoomCode();
    const { data, error } = await supabase
      .from("rooms")
      .insert({
        code,
        mode: parsed.mode,
        preset_prompts: prompts,
        round_seconds: parsed.roundSeconds,
      })
      .select("code, host_token")
      .single();
    if (!error && data) {
      return { code: data.code, hostToken: data.host_token };
    }
    if (error && error.code !== "23505") {
      throw new Error(error.message);
    }
  }
  throw new Error("Klarte ikke å generere en unik romkode. Prøv igjen.");
}

// -------- joinRoom ----------------------------------------------------

const joinRoomSchema = z.object({
  code: z.string().regex(/^\d{4}$/),
  name: z.string().min(1).max(40),
});

export async function joinRoom(input: {
  code: string;
  name: string;
}): Promise<{ playerId: string; clientToken: string; roomId: string }> {
  const parsed = joinRoomSchema.parse(input);
  const supabase = createSupabaseServerClient();

  const { data: room, error: roomErr } = await supabase
    .from("rooms")
    .select("id, state")
    .eq("code", parsed.code)
    .maybeSingle();

  if (roomErr) throw new Error(roomErr.message);
  if (!room) throw new Error("Fant ikke rom med den koden.");
  if (room.state !== "lobby") {
    throw new Error("Spillet har allerede startet.");
  }

  const { data: existing, error: countErr } = await supabase
    .from("players")
    .select("seat_order")
    .eq("room_id", room.id)
    .order("seat_order", { ascending: false })
    .limit(1);
  if (countErr) throw new Error(countErr.message);

  const nextSeat = existing && existing.length > 0 ? existing[0].seat_order + 1 : 0;
  if (nextSeat >= 20) throw new Error("Rommet er fullt (maks 20 spillere).");

  const { data: player, error: insertErr } = await supabase
    .from("players")
    .insert({
      room_id: room.id,
      name: parsed.name.trim(),
      seat_order: nextSeat,
    })
    .select("id, client_token, room_id")
    .single();
  if (insertErr) throw new Error(insertErr.message);

  return {
    playerId: player.id,
    clientToken: player.client_token,
    roomId: player.room_id,
  };
}

// -------- startGame ---------------------------------------------------

export async function startGame(input: {
  roomId: string;
  hostToken: string;
}): Promise<void> {
  const supabase = createSupabaseServerClient();

  const { data: room } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", input.roomId)
    .eq("host_token", input.hostToken)
    .maybeSingle();
  if (!room) throw new Error("Uautorisert eller ukjent rom.");
  if (room.state !== "lobby") throw new Error("Spillet har allerede startet.");

  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("room_id", room.id)
    .order("seat_order", { ascending: true });

  const playerList = (players ?? []) as Player[];
  if (playerList.length < 3) {
    throw new Error("Minst 3 spillere må være med før spillet kan starte.");
  }

  const N = playerList.length;

  const booksToInsert = playerList.map((p) => ({
    room_id: room.id,
    owner_player_id: p.id,
  }));
  const { data: books, error: booksErr } = await supabase
    .from("books")
    .insert(booksToInsert)
    .select("id, owner_player_id");
  if (booksErr) throw new Error(booksErr.message);

  if (room.mode === "preset_prompts") {
    const seed = Date.parse(room.created_at) & 0x7fffffff;
    const prompts = room.preset_prompts as string[];
    const shuffled = shuffle(prompts, seed);
    const pageInserts = (books ?? []).map((book, idx) => ({
      book_id: book.id,
      page_index: 0,
      author_player_id: null,
      kind: "text" as const,
      content: shuffled[idx % shuffled.length],
    }));
    const { error: pagesErr } = await supabase.from("pages").insert(pageInserts);
    if (pagesErr) throw new Error(pagesErr.message);
  }

  const { error: updateErr } = await supabase
    .from("rooms")
    .update({
      state: "playing",
      pages_per_book: N,
      current_round: firstActiveRound(room.mode as Room["mode"]),
    })
    .eq("id", room.id);
  if (updateErr) throw new Error(updateErr.message);

  revalidatePath(`/smartsommer/host/${room.code}`);
}

// -------- submitPage --------------------------------------------------

const submitPageSchema = z.object({
  clientToken: z.string().uuid(),
  content: z.string().max(800_000), // ~600KB base64 takk høyde for PNG
});

export async function submitPage(input: {
  clientToken: string;
  content: string;
}): Promise<void> {
  const parsed = submitPageSchema.parse(input);
  const supabase = createSupabaseServerClient();

  const { data: player } = await supabase
    .from("players")
    .select("*")
    .eq("client_token", parsed.clientToken)
    .maybeSingle();
  if (!player) throw new Error("Spilleren ble ikke funnet.");

  const { data: room } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", player.room_id)
    .maybeSingle();
  if (!room) throw new Error("Rommet finnes ikke lenger.");
  if (room.state !== "playing") throw new Error("Spillet er ikke aktivt.");

  const N = room.pages_per_book as number;
  const round = room.current_round as number;
  const ownerSeat = ownerSeatForRound(player.seat_order, round, N);

  const { data: owner } = await supabase
    .from("players")
    .select("id")
    .eq("room_id", room.id)
    .eq("seat_order", ownerSeat)
    .maybeSingle();
  if (!owner) throw new Error("Fant ikke boken din for denne runden.");

  const { data: book } = await supabase
    .from("books")
    .select("id")
    .eq("room_id", room.id)
    .eq("owner_player_id", owner.id)
    .maybeSingle();
  if (!book) throw new Error("Fant ikke boken din for denne runden.");

  const kind = pageKindForIndex(round, room.mode as Room["mode"]);

  const { error: insertErr } = await supabase.from("pages").upsert(
    {
      book_id: book.id,
      page_index: round,
      author_player_id: player.id,
      kind,
      content: parsed.content,
    },
    { onConflict: "book_id,page_index" },
  );
  if (insertErr) throw new Error(insertErr.message);
}

// -------- nextRound ---------------------------------------------------

export async function nextRound(input: {
  roomId: string;
  hostToken: string;
}): Promise<void> {
  const supabase = createSupabaseServerClient();

  const { data: room } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", input.roomId)
    .eq("host_token", input.hostToken)
    .maybeSingle();
  if (!room) throw new Error("Uautorisert eller ukjent rom.");
  if (room.state !== "playing") throw new Error("Spillet er ikke aktivt.");

  const N = room.pages_per_book as number;
  const round = room.current_round as number;

  // Fyll ut manglende sider for inneværende runde med placeholder.
  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("room_id", room.id);
  const playerList = (players ?? []) as Player[];

  const { data: books } = await supabase
    .from("books")
    .select("id, owner_player_id")
    .eq("room_id", room.id);
  const booksByOwner = new Map((books ?? []).map((b) => [b.owner_player_id, b.id]));

  const { data: existingPages } = await supabase
    .from("pages")
    .select("book_id")
    .eq("page_index", round)
    .in("book_id", Array.from(booksByOwner.values()));
  const filledBookIds = new Set((existingPages ?? []).map((p) => p.book_id));

  const placeholderInserts = playerList
    .map((p) => {
      const ownerSeat = ownerSeatForRound(p.seat_order, round, N);
      const owner = playerList.find((x) => x.seat_order === ownerSeat);
      if (!owner) return null;
      const bookId = booksByOwner.get(owner.id);
      if (!bookId || filledBookIds.has(bookId)) return null;
      const kind = pageKindForIndex(round, room.mode as Room["mode"]);
      return {
        book_id: bookId,
        page_index: round,
        author_player_id: p.id,
        kind,
        content: kind === "text" ? "(hoppet over)" : "",
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (placeholderInserts.length > 0) {
    const { error: pErr } = await supabase
      .from("pages")
      .upsert(placeholderInserts, { onConflict: "book_id,page_index" });
    if (pErr) throw new Error(pErr.message);
  }

  const nextRoundIndex = round + 1;
  const isFinished = nextRoundIndex >= N;

  const { error: updErr } = await supabase
    .from("rooms")
    .update({
      current_round: isFinished ? round : nextRoundIndex,
      state: isFinished ? "reveal" : "playing",
    })
    .eq("id", room.id);
  if (updErr) throw new Error(updErr.message);

  revalidatePath(`/smartsommer/host/${room.code}`);
}

// -------- skipPlayer (visuell markering, brukes ikke til logikk) ------

export async function setPlayerSkipped(input: {
  roomId: string;
  hostToken: string;
  playerId: string;
  skipped: boolean;
}): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: room } = await supabase
    .from("rooms")
    .select("id")
    .eq("id", input.roomId)
    .eq("host_token", input.hostToken)
    .maybeSingle();
  if (!room) throw new Error("Uautorisert.");
  const { error } = await supabase
    .from("players")
    .update({ is_skipped: input.skipped })
    .eq("id", input.playerId)
    .eq("room_id", input.roomId);
  if (error) throw new Error(error.message);
}

// -------- deleteRoom --------------------------------------------------

export async function deleteRoom(input: {
  roomId: string;
  hostToken: string;
}): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("rooms")
    .delete()
    .eq("id", input.roomId)
    .eq("host_token", input.hostToken);
  if (error) throw new Error(error.message);
}
