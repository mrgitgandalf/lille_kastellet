# Lille Kastellet

Statisk forside for **lillekastellet.no** + spillappen
**Smartsommer** (Telephone Pictionary) på `/smartsommer`.

Stack: Next.js 15 (App Router) · React 19 · Supabase (Postgres + Realtime)
· Tailwind CSS · TypeScript. Deploy: Vercel.

---

## Lokal utvikling

```bash
npm install
cp .env.local.example .env.local
# fyll inn Supabase-nøklene
npm run dev
```

Appen kjører på http://localhost:3000. Spillet ligger under
http://localhost:3000/smartsommer.

---

## 1. Sett opp Supabase

Free tier tillater **2 aktive prosjekter per organisasjon**. Hvis du
allerede har 2: opprett en **ny organisasjon** i Supabase
(brukermenyen → "New organization") og legg dette prosjektet der.

1. Opprett nytt Supabase-prosjekt. Velg region nær deg (eu-north-1
   anbefales fra Norge).
2. Åpne **SQL Editor** → "New query" → lim inn alt fra
   `supabase/schema.sql` → kjør. Du skal nå ha tabellene `rooms`,
   `players`, `books`, `pages`, samt RLS-policies for read-tilgang
   for anon.
3. Aktiver Realtime: **Database → Replication → supabase_realtime**.
   Marker alle fire tabellene. (SQL-scriptet legger dem til publikasjonen
   automatisk, men dobbeltsjekk at de står i lista.)
4. Hent nøkler under **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` (secret) → `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ `service_role` brukes kun server-side i Next.js server actions.
> Eksponer den aldri i klient-kode.

---

## 2. Sett env-variabler

**Lokalt:** Kopier `.env.local.example` til `.env.local` og fyll inn
nøklene. Filen er gitignorert.

**På Vercel:** Project Settings → Environment Variables. Legg inn de
samme tre nøklene for både **Production** og **Preview**:

| Navn                              | Verdi                      | Synlighet |
| --------------------------------- | -------------------------- | --------- |
| `NEXT_PUBLIC_SUPABASE_URL`        | https://xxxxx.supabase.co  | Klient    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | eyJhbGc... (anon)          | Klient    |
| `SUPABASE_SERVICE_ROLE_KEY`       | eyJhbGc... (service role)  | Server    |

---

## 3. Deploy til Vercel (første gang)

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
   Du skal se Vercels IP og CNAME.
7. **Deaktiver GitHub Pages** i repo-settings (Pages → None) så det
   ikke blir to deploy-targets som krangler om domenet.

Etter dette deployer Vercel automatisk hver gang du pusher til main.

---

## Bruke spillet på sommeravslutningen

1. Gå til `lillekastellet.no/smartsommer` på laptop, klikk **Opprett
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
