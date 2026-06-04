# Lille Kastellet - lillekastellet.no

## Prosjekt
- Statisk forside for domenet lillekastellet.no.
- **Tegnekjeden** – Telephone Pictionary-spill på `/tegnekjeden`
  for teambuilding (3–20 spillere på mobil, host på laptop).

## Teknologi
- **Next.js 15** (App Router) + React 19
- **Neon Postgres** (serverless DB) – DB-schema i `db/schema.sql`
- **Ably** for realtime (events publiseres av server actions,
  klienter subscriber via token-auth fra `/api/ably-token`)
- **Tailwind CSS** for styling
- TypeScript

## Filstruktur
```
app/
  layout.tsx           # Felles HTML-skall
  page.tsx             # Forsiden (lillekastellet.no)
  globals.css
  tegnekjeden/         # Spillet
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
  db.ts                # Neon-driver
  ably-server.ts       # Server-side Ably publish
  ably-client.ts       # Client-side Ably (token-auth)
  game.ts              # Rotasjonslogikk
  roomCode.ts
  types.ts
app/api/ably-token/    # Token-endepunkt for Ably-klient
db/
  schema.sql           # Postgres-tabeller (kjøres i Neon SQL Editor)
public/
  lille_kastellet.jpg  # Forsidebildet
```

## Deploy
- **Hosting**: Vercel (auto-deploy fra GitHub `main`).
- **Domenehåndtering**: Domeneshop er kun DNS-registrar; A-records og
  CNAME peker til Vercel (`76.76.21.21` / `cname.vercel-dns.com`).
- **Env-variabler i Vercel**: `DATABASE_URL` (Neon), `ABLY_API_KEY` (Ably).

Se `README.md` for full Neon-, Ably- og deploy-oppsett.

## Lokal utvikling
```
npm install
cp .env.local.example .env.local   # fyll inn DATABASE_URL + ABLY_API_KEY
npm run dev
```
