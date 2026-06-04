# Lille Kastellet

Statisk forside for **lillekastellet.no** + spillappen
**Tegnekjeden** (Telephone Pictionary) på `/tegnekjeden`.

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

Appen kjører på http://localhost:3000. Spillet ligger under
http://localhost:3000/tegnekjeden.

---

## 1. Sett opp Neon Postgres

1. Logg inn på [neon.tech](https://neon.tech) og opprett prosjekt
   (gratisplan). Velg region nær deg (eu-central anbefales fra Norge).
2. Åpne **SQL Editor** → lim inn alt fra `db/schema.sql` → Run. Du
   skal nå ha tabellene `rooms`, `players`, `books`, `pages`.
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

- **Skriving:** alle mutasjoner går via Next.js server actions i
  `app/tegnekjeden/actions.ts`. Disse snakker med Neon via
  `@neondatabase/serverless` (HTTP-driver, ingen connection pool nødvendig).
- **Realtime:** server actions publiserer events (`room.updated`,
  `players.updated`, `pages.updated`) på Ably-kanalen `room:<roomId>`.
  Klientene subscriber via token-auth (`/api/ably-token`) og refetcher
  data via server actions når events kommer.
- **Tegninger:** lagret som base64-PNG i `pages.content`. Sendes ikke
  via Ably (sparer messagekvota), kun "page submitted"-event.

---

## Bruke spillet på sommeravslutningen

1. Gå til `lillekastellet.no/tegnekjeden` på laptop, klikk **Opprett
   rom**. Velg modus (egne setninger eller forhåndsdefinerte) og
   rundetid. Lim evt. inn setningene dine (én per linje).
2. Vis 4-sifret kode + QR-kode på prosjektoren.
3. Spillerne åpner mobilkamera → skanner QR → skriver navn → joiner.
4. Klikk **Start spill** når alle er inne (min. 3 spillere).
5. Hver runde:
   - Spillerne får tekst eller tegning på mobil og sender inn.
   - Du ser i sanntid hvor mange som er ferdige.
   - Trykk **Neste runde** når du vil gå videre (uavsendte sider
     fylles med "(hoppet over)").
6. Etter siste runde havner du i **reveal-modus** – bla deg gjennom
   bøkene side for side med piltaster eller knapper på storskjermen.
7. Klikk **Avslutt og slett rom** når kvelden er over.
