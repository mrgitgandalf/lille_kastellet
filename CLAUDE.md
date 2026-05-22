# Lille Kastellet - lillekastellet.no

## Prosjekt
- Statisk forside for domenet lillekastellet.no.
- **Smartsommer** – Telephone Pictionary-spill på `/smartsommer`
  for teambuilding (3–20 spillere på mobil, host på laptop).

## Teknologi
- **Next.js 15** (App Router) + React 19
- **Supabase** (Postgres + Realtime) – DB-schema i `supabase/schema.sql`
- **Tailwind CSS** for styling
- TypeScript

## Filstruktur
```
app/
  layout.tsx           # Felles HTML-skall
  page.tsx             # Forsiden (lillekastellet.no)
  globals.css
  smartsommer/         # Spillet
    actions.ts         # Server actions: createRoom, joinRoom, startGame, submitPage, nextRound...
    layout.tsx
    page.tsx           # Landing: join eller host
    JoinForm.tsx
    host/
      page.tsx         # Skjema for nytt rom
      CreateRoomForm.tsx
      [code]/
        page.tsx       # Host-lobby + spillkontroll
        HostRoomClient.tsx
        reveal/        # Reveal-modus for storskjerm
          page.tsx
          RevealClient.tsx
    spill/[code]/
      page.tsx         # Spiller-join + lobby
      PlayerLobbyClient.tsx
      runde/page.tsx   # Aktiv runde
      runde/PlayerRoundClient.tsx
      venter/page.tsx  # Mens host viser reveal
components/
  DrawingCanvas.tsx    # Touch-vennlig tegne-canvas
  RoomQRCode.tsx
  Timer.tsx
lib/
  supabase/
    client.ts          # Browser client (anon)
    server.ts          # Server client (service role)
  game.ts              # Rotasjonslogikk
  roomCode.ts
  types.ts
supabase/
  schema.sql           # Tabeller + RLS-policies + Realtime
public/
  lille_kastellet.jpg  # Forsidebildet
```

## Deploy
- **Hosting**: Vercel (auto-deploy fra GitHub `main`).
- **Domenehåndtering**: Domeneshop er kun DNS-registrar; A-records og
  CNAME peker til Vercel (`76.76.21.21` / `cname.vercel-dns.com`).
- **Env-variabler i Vercel**: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

Se `README.md` for full deploy- og Supabase-oppsett.

## Lokal utvikling
```
npm install
cp .env.local.example .env.local   # fyll inn Supabase-nøkler
npm run dev
```
