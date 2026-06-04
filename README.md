# Lille Kastellet

Statisk forside for **lillekastellet.no** + to spillapper:
- **Tegnekjeden** (Telephone Pictionary) på `/tegnekjeden`
- **Gjettekampen** (alle-mot-alle pictionary) på `/gjettekampen`

Stack: Next.js 15 (App Router) · React 19 · Tailwind CSS · TypeScript ·
**Neon Postgres** (serverless DB) · **Ably** (realtime). Deploy: Vercel.

---

## Lokal utvikling

```bash
npm install
cp .env.local.example .env.local
# fyll inn DATABASE_URL og ABLY_API_KEY
npm run dev
```

Appen kjører på http://localhost:3000. Spillene ligger under
`/tegnekjeden` og `/gjettekampen`.

---

## 1. Sett opp Neon Postgres

1. Logg inn på [neon.tech](https://neon.tech) og opprett prosjekt
   (gratisplan). Velg region nær deg (eu-central anbefales fra Norge).
2. Åpne **SQL Editor** → lim inn alt fra `db/schema.sql` → Run. Du
   skal nå ha tabellene `rooms`, `players`, `books`, `pages`.
3. Lim inn `db/2025_gjettekampen.sql` → Run. Legger til `game_type`-
   kolonne og `gjette_words`/`gjette_turns`/`gjette_guesses`. Idempotent.
3. Hent connection string under **Connection Details** → kopier
   "pooled connection" URI til `DATABASE_URL` i `.env.local`.

---

## 2. Sett opp Ably (realtime)

1. Lag konto på [ably.com](https://ably.com) (gratisplan: 6M
   meldinger/mnd, 200 samtidige tilkoblinger – mer enn nok).
2. Opprett en app → **API Keys** → kopier root-keyen (har capabilities
   for publish + subscribe + presence). Lim inn i `ABLY_API_KEY`.

> ⚠️ `ABLY_API_KEY` brukes kun server-side. Klienten henter
> kortvarige tokens via `/api/ably-token` for å unngå å eksponere
> keyen i nettleseren.

---

## 3. Sett env-variabler

**Lokalt:** Kopier `.env.local.example` til `.env.local` og fyll inn.
Filen er gitignorert.

**På Vercel:** Project Settings → Environment Variables. Legg inn
de samme to nøklene for både **Production** og **Preview**:

| Navn            | Verdi                                        | Synlighet |
| --------------- | -------------------------------------------- | --------- |
| `DATABASE_URL`  | postgresql://USER:PASS@host/db?sslmode=require | Server  |
| `ABLY_API_KEY`  | xVLyHQ.xxxxx:xxxxxxxxxxxxxxxxxxxxx           | Server    |

---

## 4. Deploy til Vercel (første gang)

Domenet `lillekastellet.no` står i dag på **GitHub Pages**
(DNS-en peker til 185.199.108–111.153). Flytt det til Vercel slik:

1. **Importer repoet i Vercel**: vercel.com → Add New → Project →
   velg `mrgitgandalf/lille_kastellet`. La build-settings stå på
   default (Next.js detekteres automatisk).
2. **Legg inn env-variablene** (se tabellen over) før første deploy.
3. **Deploy** – verifiser at appen kjører på den genererte
   `*.vercel.app`-URL-en.
4. **Legg til custom domains** i Vercel: Project → Settings → Domains
   → legg til `lillekastellet.no` og `www.lillekastellet.no`. Vercel
   gir deg DNS-instruksjoner.
5. **Oppdater DNS hos Domeneshop:**
   - Fjern de fire A-records som peker til `185.199.108–111.153`.
   - Legg til én A-record: `@ → 76.76.21.21`.
   - Endre CNAME: `www → cname.vercel-dns.com`.
   - La TXT-records (SPF, DMARC) stå urørt.
6. **Vent 5 min–1 t på DNS-propagering.** Verifiser:
   ```bash
   dig +short lillekastellet.no
   dig +short www.lillekastellet.no
   ```
7. **Deaktiver GitHub Pages** i repo-settings (Pages → None) så det
   ikke blir to deploy-targets som krangler om domenet.

Etter dette deployer Vercel automatisk hver gang du pusher til main.

---

## Arkitektur kort

- **Skriving:** mutasjoner går via Next.js server actions
  (`app/tegnekjeden/actions.ts`, `app/gjettekampen/actions.ts`) mot
  Neon via `@neondatabase/serverless`.
- **Diskriminator:** `rooms.game_type` skiller spillene. Lookups på
  romkode filtrerer eksplisitt på `game_type` så koder ikke kolliderer.
- **Realtime:** server actions publiserer events (`room.updated`,
  `players.updated`, `pages.updated`, `turn.started`, `turn.ended`,
  `guess.posted`, `game.finished`) på Ably-kanalen `room:<roomId>`.
  Klientene subscriber via token-auth (`/api/ably-token`).
- **Tegninger tegnekjeden:** base64-PNG i `pages.content`. Kun
  «submitted»-event via Ably.
- **Tegninger gjettekampen:** strøk publiseres LIVE fra drawer-klienten
  rett til Ably (`stroke.added` per fullført strøk), ikke lagret i DB.
  Drawer-refresh nullstiller canvas (v1-trade-off).

---

## Bruke Tegnekjeden

1. Gå til `lillekastellet.no/tegnekjeden` på laptop, klikk **Opprett
   rom**. Velg modus og rundetid.
2. Vis 4-sifret kode + QR på prosjektoren. Spillere joiner fra mobil.
3. Klikk **Start spill** (min. 2 spillere). Hver runde: spillere sender
   tekst/tegning, du går videre med **Neste runde**.
4. Reveal-modus blar gjennom bøkene side for side.

## Bruke Gjettekampen

1. Gå til `lillekastellet.no/gjettekampen`, klikk **Opprett rom**.
   Velg tid per tegne-runde (anbefalt: 180 s).
2. Vis 4-sifret kode + QR. Spillere joiner.
3. Lim inn ord-listen (ett ord per linje, minst like mange som spillere).
4. Klikk **Start spill**. Hver tur: én spiller tegner, andre gjetter
   live. Førstemann med riktig svar får 1p, tegner får 3p hvis
   noen gjettet riktig.
5. Etter siste tur: klikk **Avslutt og vis resultat** for nedteller
   og leaderboard med feiring.
