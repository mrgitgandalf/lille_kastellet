-- 2025-06-04  Gjettekampen (all-vs-all pictionary) på samme Neon-DB.
-- Kjøres ETTER db/schema.sql. Idempotent — trygt å re-kjøre.

-- 1. Discriminator-kolonne på rooms ----------------------------------
alter table public.rooms
  add column if not exists game_type text not null default 'tegnekjeden';
alter table public.rooms
  drop constraint if exists rooms_game_type_check;
alter table public.rooms
  add constraint rooms_game_type_check
  check (game_type in ('tegnekjeden', 'gjettekampen'));

-- 2. Ord-liste satt opp av vert i lobbyen ----------------------------
create table if not exists public.gjette_words (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  word text not null,
  word_order int not null,
  assigned_player_id uuid references public.players(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (room_id, word_order)
);
create index if not exists gjette_words_room_idx on public.gjette_words (room_id);

-- 3. Turer (én rad per ord/tegner) -----------------------------------
create table if not exists public.gjette_turns (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  turn_order int not null,
  drawer_player_id uuid not null references public.players(id) on delete cascade,
  word text not null,
  state text not null default 'pending'
    check (state in ('pending', 'active', 'finished')),
  started_at timestamptz,
  ended_at timestamptz,
  end_reason text check (end_reason in ('correct_guess','timeout','skipped')),
  winner_player_id uuid references public.players(id) on delete set null,
  unique (room_id, turn_order)
);
create index if not exists gjette_turns_room_idx on public.gjette_turns (room_id);

-- 4. Gjetninger (chat-feed) ------------------------------------------
create table if not exists public.gjette_guesses (
  id uuid primary key default gen_random_uuid(),
  turn_id uuid not null references public.gjette_turns(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  text text not null,
  is_correct boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists gjette_guesses_turn_idx
  on public.gjette_guesses (turn_id, created_at);

-- Poengsum derives ved aggregat (3p per tur der drawer + winner_player_id ≠ null,
-- 1p per tur der winner_player_id = spilleren). Ingen score-kolonne.
