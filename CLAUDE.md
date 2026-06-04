# Lille Kastellet - lillekastellet.no

## Prosjekt
- Statisk forside for domenet lillekastellet.no.
- **Tegnekjeden** – Telephone Pictionary-spill på `/tegnekjeden`
  for teambuilding (3–20 spillere på mobil, host på laptop).
- **Gjettekampen** – Alle-mot-alle pictionary på `/gjettekampen`.
  Vert er observatør og legger inn ord-listen. Hver spiller tegner
  nøyaktig ett ord; gjettere ser tegningen live. Førstemann med
  riktig svar får 1p, tegneren får 3p hvis noen gjettet.

## Teknologi
- **Next.js 15** (App Router) + React 19
- **Neon Postgres** (serverless DB) – base-schema i `db/schema.sql`,
  gjettekampen-delta i `db/2025_gjettekampen.sql`. Delte tabeller
  (`rooms`, `players`) med `rooms.game_type` som diskriminator.
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
  tegnekjeden/         # Telephone Pictionary
    actions.ts         # Server actions: createRoom, joinRoom, startGame, submitPage, nextRound...
    layout.tsx
    page.tsx           # Landing: join eller host
    JoinForm.tsx
    host/
      page.tsx, CreateRoomForm.tsx
      [code]/page.tsx, HostRoomClient.tsx
      [code]/reveal/page.tsx, RevealClient.tsx
    spill/[code]/page.tsx, PlayerLobbyClient.tsx
                  runde/page.tsx, PlayerRoundClient.tsx
                  venter/page.tsx
  gjettekampen/        # Alle-mot-alle pictionary
    actions.ts         # createRoom, joinRoom, setWords, startGame,
                       # submitGuess, nextTurn, skipTurn, endGame...
    layout.tsx, page.tsx, JoinForm.tsx
    host/page.tsx, CreateRoomForm.tsx
         [code]/page.tsx, HostRoomClient.tsx
    spill/[code]/page.tsx, PlayerLobbyClient.tsx
                  runde/page.tsx, PlayerTurnClient.tsx
components/
  DrawingCanvas.tsx    # Touch-vennlig canvas. Props: onStrokeComplete,
                       # externalStrokes, mode='draw'|'spectate', hideToolbar
  RoomQRCode.tsx, Timer.tsx
  GuessFeed.tsx, Standings.tsx, FinalReveal.tsx, Confetti.tsx
lib/
  db.ts                # Neon-driver
  ably-server.ts       # Server-side Ably publish (event-union for begge spill)
  ably-client.ts       # Client-side Ably (token-auth med publish-rettighet)
  game.ts              # Rotasjonslogikk for tegnekjeden + delt shuffle()
  roomCode.ts
  types.ts             # Felles + GjetteWord/Turn/Guess/Standing
app/api/ably-token/    # Token-endepunkt (publish + subscribe på room:*)
db/
  schema.sql                  # Base-schema (kjøres første gang)
  2025_gjettekampen.sql       # game_type-kolonne + gjette_*-tabeller
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
