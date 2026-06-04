-- 2025-06-04 Gjettekampen: konfigurerbar poenggiving per rom.
-- Idempotent.

alter table public.rooms
  add column if not exists gjette_guess_points int not null default 1
    check (gjette_guess_points between 0 and 20);

alter table public.rooms
  add column if not exists gjette_drawer_points int not null default 3
    check (gjette_drawer_points between 0 and 20);
