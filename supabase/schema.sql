-- Smartsommer / Lille Kastellet – Telephone Pictionary
-- Kjør hele scriptet i Supabase SQL Editor på et tomt prosjekt.

create extension if not exists "pgcrypto";

-- ROOMS ---------------------------------------------------------------
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_token uuid not null default gen_random_uuid(),
  state text not null default 'lobby'
    check (state in ('lobby', 'playing', 'reveal', 'finished')),
  mode text not null default 'player_prompts'
    check (mode in ('player_prompts', 'preset_prompts')),
  preset_prompts text[] not null default '{}',
  round_seconds int not null default 90 check (round_seconds between 15 and 600),
  current_round int not null default 0,
  pages_per_book int,
  created_at timestamptz not null default now()
);
create index if not exists rooms_code_idx on public.rooms (code);

-- PLAYERS -------------------------------------------------------------
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null,
  client_token uuid not null default gen_random_uuid(),
  seat_order int not null,
  is_skipped boolean not null default false,
  created_at timestamptz not null default now(),
  unique (room_id, seat_order)
);
create index if not exists players_room_idx on public.players (room_id);
create index if not exists players_client_token_idx on public.players (client_token);

-- BOOKS ---------------------------------------------------------------
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  owner_player_id uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (room_id, owner_player_id)
);
create index if not exists books_room_idx on public.books (room_id);

-- PAGES ---------------------------------------------------------------
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  page_index int not null check (page_index >= 0),
  author_player_id uuid references public.players(id) on delete set null,
  kind text not null check (kind in ('text', 'drawing')),
  content text not null default '',
  submitted_at timestamptz not null default now(),
  unique (book_id, page_index)
);
create index if not exists pages_book_idx on public.pages (book_id);

-- REALTIME ------------------------------------------------------------
-- Aktiver Realtime på alle tabellene. I Supabase Studio:
--   Database → Replication → supabase_realtime → marker rooms, players, books, pages
-- Eller kjør:
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.books;
alter publication supabase_realtime add table public.pages;

-- RLS -----------------------------------------------------------------
-- Vi gjør all DB-skriving fra server actions med service role-nøkkelen,
-- så ingen anon-skriv er nødvendig. Anon trenger kun SELECT for å lytte
-- på Realtime-endringer.

alter table public.rooms enable row level security;
alter table public.players enable row level security;
alter table public.books enable row level security;
alter table public.pages enable row level security;

drop policy if exists "anon read rooms" on public.rooms;
drop policy if exists "anon read players" on public.players;
drop policy if exists "anon read books" on public.books;
drop policy if exists "anon read pages" on public.pages;

create policy "anon read rooms" on public.rooms for select to anon using (true);
create policy "anon read players" on public.players for select to anon using (true);
create policy "anon read books" on public.books for select to anon using (true);
create policy "anon read pages" on public.pages for select to anon using (true);
