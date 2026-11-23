# Build brief: "Gjettekampen" – a real-time multiplayer drawing & guessing game

You are an AI coding agent. Build a web app that behaves like the spec below. Follow it closely; where it is silent, choose sensible defaults and say what you chose. Ask the human only about real blockers (accounts/API keys).

## 1. What it is

An all-against-all Pictionary game for a room of friends/colleagues. One **host** (on a laptop/projector) creates a room and enters a word list. **Players** (2–20) join from their phones with a 4-digit room code. Players take turns drawing a secret word; everyone else watches the drawing appear live and types guesses. **The first correct guess wins the turn.** The host does not play – they run the show and display the big screen.

Scoring (configurable per room): **1 point** to the first correct guesser, **3 points** to the drawer *if someone guessed correctly*. Both 0–10 in the UI (server allows 0–20). Score is always *derived* by aggregating finished turns, never stored.

Target: 4-digit room code, mobile-first player UI, big-screen host UI, works in any modern browser, no login/accounts.

## 2. Roles and screens

### Landing (`/gjettekampen`)
- Hero title + emoji, one-line tagline.
- Card "Join game": 4-digit numeric room-code input (big, centered, letter-spaced) → button. Validates `^\d{4}$`, navigates to `/spill/<code>`.
- Card "Start a new game": explains host role → link to `/host`.

### Host – create room (`/host`)
Form with three groups:
1. **Time per drawing round**: checkbox "No time limit" (stores 0) or slider 30–240 s, step 15, default 180.
2. **Scoring**: two sliders 0–10 (guess points default 1, drawer points default 3).
3. **Words**: textarea, one word per line, live counter. Words are **locked after room creation** (no editing later). Minimum 2 words. Trim, drop empty lines, drop lines > 100 chars.
Submit creates the room and stores the host secret (see §5) in `localStorage` as `host_token:<code>`, then goes to `/host/<code>`.

### Host – room (`/host/<code>`), three states
- **Lobby**: huge room code, QR code of the join URL + the URL in text, live list of joined players, a line saying how many words are loaded and how many will be used (`floor(words/players) * players`, i.e. everyone draws equally often, surplus words dropped), **Start** button (disabled until ≥2 players and words ≥ players, with the button label explaining why), "Delete room" link.
- **Playing**: header bar with words remaining `(done/total)`, current drawer's name, the secret word masked as `●●●●●` with Show/Hide toggle (host may want to hide it from the audience), countdown timer if a time limit is set. Below: read-only live canvas, guess feed, standings. Buttons: **Next round** (or "Start next round" when between turns, or "Finish and show result" when no turns remain), **Skip** (ends the current turn with reason `skipped`), and a small "End game" link. The host's browser is responsible for calling "timeout" when the timer hits 0 (guarded so it fires once per turn). After a turn ends, the **host manually starts the next one** – there is a pause between turns so people can laugh.
- **Finished**: final reveal (§4) + delete-room link.

### Player – join (`/spill/<code>`)
- If the room is no longer in lobby and this browser has no player token: "Game already started" message.
- Otherwise: name input (max 40 chars) → joins; stores the player secret in `localStorage` as `client_token:<code>`. Returning with the token = automatic re-entry (refresh-safe).
- After joining: "Hi <name>!" waiting screen with a live list of players (own name highlighted). When the room state becomes `playing` or `finished`, auto-navigate to `/spill/<code>/runde`.

### Player – game (`/spill/<code>/runde`)
- Header: words remaining, "turn n/total", drawer name, timer. If *I* am the drawer, the secret word is shown in the header.
- **Drawer view**: full drawing canvas with toolbar (6 colours, 3 brush sizes, Undo, Clear). Hint: you can't guess your own drawing.
- **Guesser view**: read-only live canvas + a text input + Send button (autofocus; max 200 chars).
- Both: guess feed + standings underneath.
- **Between turns** (no active turn): "Pause" card with standings and "waiting for next round…"; when all turns are finished: "Game over – waiting for the host to show the result".
- On a correct guess: confetti on every player's screen and a big banner with a random praise message naming the winner. On timeout: a banner with a random "time's up, the word was X" message.
- If the browser has no valid token → redirect back to the join page.

## 3. Game rules / server logic

State machine: `room.state`: `lobby → playing → finished`. `turn.state`: `pending → active → finished`, with `end_reason ∈ {correct_guess, timeout, skipped}`.

- **startGame** (host only): needs ≥2 players and ≥ players-many words. `turnsPerPlayer = floor(words/players)`; create `turnsPerPlayer * players` turns. Shuffle players with a **deterministic seeded shuffle** (seed from room creation time) and assign drawers round-robin so everyone draws the same number of times. Word *i* from the list goes to turn *i*. Turn 0 becomes `active` immediately.
- **submitGuess** (player): compare `trim().toLowerCase()` of guess vs. word (exact match, no fuzzy matching). The drawer's guesses are ignored. A correct guess is accepted with a **conditional update** (`update … set state='finished' … where id=? and state='active' returning id`) so that if two players answer simultaneously only one wins; the loser's guess is stored as an ordinary wrong guess. Every guess (right or wrong) is stored and broadcast.
- **nextTurn** (host): closes the active turn as `timeout` if one is still active, activates the lowest-`turn_order` pending turn; if none left → room `finished`.
- **markTurnTimeout** (host client calls when timer hits 0): finishes the active turn as `timeout`; does *not* start the next one.
- **skipTurn**, **endGame**, **deleteRoom**: host-only; all verify the host secret.
- Joining: only in `lobby`, max 20 players, 4-digit code lookup scoped to this game type, `seat_order` = next free integer.
- Room code: random 4 digits, retry (up to 8×) on unique-constraint collision.
- **Standings** = SQL aggregate over finished turns: `draws_won * drawerPoints + guesses_won * guessPoints`, sorted descending. Ranking uses standard competition ranking (8,8,5 → 1,1,3).
- All mutations validate input with **zod**.

## 4. Look & feel

Retro-arcade / sticker style, very colourful, high contrast, big touch targets.
- Page background cream `#fdf5e0`; content column `max-w-3xl`, centered; mobile-first.
- Cards: `rounded-2xl border-4`, a translucent coloured border (`border-emerald-700/40`) with a pale matching fill (`bg-emerald-100`) and a **hard offset shadow** (`shadow-[6px_6px_0_0_rgba(0,0,0,0.15)]`). Colour-code sections: emerald = join/players, sky = info/guesses/QR, rose = host/standings/words, violet = primary actions & headers, amber = winners.
- Buttons: `rounded-xl border-4 border-violet-950 bg-violet-800 text-violet-50 font-black uppercase tracking-wide` with `shadow-[4px_4px_0_0_#0b0420]`; on `:active` translate by 2px and shrink the shadow (physical "press" feel). Disabled = grey.
- Headings: `font-black uppercase`, pale text with a **hard 5-way text-shadow outline** in a dark shade of the same hue (e.g. `text-violet-200` + shadow `#5b21b6`).
- Dark violet header bar (`bg-violet-900`) with amber-300 labels for the in-game header.
- Drawing canvas: white, rounded, violet-950 border with offset shadow. Logical resolution **1200×900**, 4:3, scaled to container width; all coordinates sent in logical units so different screen sizes render identically. Pointer events with `touch-action: none`; brush size scaled by `LOGICAL_W/600`.
- Emoji used as icons everywhere (🎨✏️🎯🎬🕹️🏆💬👑🎉).
- Correct-guess rows in the feed: emerald highlight with 🎉; leader in standings: amber highlight with 👑.
- **Final reveal**: "The winner is …" then a 5-4-3-2-1 countdown (huge digits), then large confetti bursts and the winner card(s) with 👑 (handles ties: "Tie at the top (n winners)"; nobody scored → "Nobody scored 🤷"), then the full standings and a "Back" link.
- Praise banner: fixed, centered at 1/4 height, big bold text, amber (praise) or orange (timeout), auto-hides after 4 s with a fade.
- 30 random praise messages (use `{name}` placeholder, e.g. "{name} nailed it! 🎯") and 20 random timeout messages (`{word}` placeholder). **The server only picks an index and broadcasts it; each client renders the text in its own language** (important for i18n, see §7).

## 5. Architecture

**Stack** (use exactly this unless you have a strong reason): Next.js 15 App Router + React 19 + TypeScript, Tailwind CSS, Neon serverless Postgres (`@neondatabase/serverless`), Ably for realtime, `zod`, `qrcode`, `canvas-confetti`. Deployed on Vercel. Env vars: `DATABASE_URL`, `ABLY_API_KEY`.

**Pattern: server actions + server-rendered initial state + realtime nudges.**
- Every `page.tsx` is a **server component** that loads initial data directly via server-action query functions and passes it as `initial*` props to a **client component** (`HostRoomClient`, `PlayerLobbyClient`, `PlayerTurnClient`). Pages are dynamic (no caching).
- All mutations are **server actions** in one `actions.ts` (`"use server"`): `createRoom, joinRoom, startGame, submitGuess, markTurnTimeout, nextTurn, skipTurn, endGame, deleteRoom` + queries `getRoomByCode, getRoomById, getPlayers, getWords, getActiveTurn, getAllTurns, getGuessesForTurn, getStandings`.
- After each mutation the server publishes a small event on the Ably channel `room:<roomId>`: `room.updated`, `players.updated`, `turn.started`, `turn.ended`, `guess.posted`, `game.finished`. Clients **subscribe and re-fetch via the query actions** (events are nudges; DB is the source of truth). `guess.posted` carries the guess row itself (dedupe by id) so the feed feels instant.
- **Live drawing bypasses the server**: the drawer's client publishes `stroke.added {turnId, stroke}` and `canvas.cleared {turnId}` **directly to Ably** (client has publish capability). Strokes are *not* stored (a drawer refresh clears the canvas – accepted v1 trade-off). Receivers ignore strokes whose `turnId` ≠ the current active turn. A `stroke` = `{color, size, points:[{x,y}]}` published once per completed stroke (pointer-up), not per point. Undo is local-only; Clear is broadcast.
- **Ably auth**: `POST /api/ably-token` returns a token request with capability `{"room:*": ["subscribe","presence","history","publish"]}`, ttl 1 h. The API key never reaches the browser. Client uses `authUrl` + `authMethod: "POST"`.
- **Identity without accounts**: `rooms.host_token` (uuid, returned once on createRoom, kept in the host's localStorage) authorises all host actions; `players.client_token` (uuid, in the player's localStorage) authorises guesses. Every host action checks `id AND host_token AND game_type`.
- **Timer**: clients compute remaining time from `turn.started_at` (server timestamp) + `round_seconds`, ticking every 250 ms; the host client triggers the timeout action once.

**Database (Postgres)** – tables:
- `rooms(id uuid pk, code text unique, host_token uuid, state text [lobby|playing|finished], game_type text, round_seconds int, gjette_guess_points int 0–20 default 1, gjette_drawer_points int 0–20 default 3, pages_per_book int (reused as total turn count), created_at)`
- `players(id, room_id fk cascade, name, client_token uuid, seat_order int, created_at)`
- `gjette_words(id, room_id fk cascade, word, word_order int, unique(room_id, word_order))`
- `gjette_turns(id, room_id fk cascade, turn_order int, drawer_player_id fk, word, state [pending|active|finished], started_at, ended_at, end_reason, winner_player_id, unique(room_id, turn_order))`
- `gjette_guesses(id, turn_id fk cascade, player_id fk, text, is_correct bool, created_at; index (turn_id, created_at))`
(If you build only this game you can drop `game_type` and the unused columns; the original shares `rooms`/`players` with a second game.) Deleting a room cascades everything.

**File layout** (mirror this):
```
app/gjettekampen/{layout,page,JoinForm,not-found}.tsx, actions.ts
app/gjettekampen/host/{page,CreateRoomForm}.tsx, host/[code]/{page,HostRoomClient}.tsx
app/gjettekampen/spill/[code]/{page,PlayerLobbyClient}.tsx, runde/{page,PlayerTurnClient}.tsx
app/api/ably-token/route.ts
components/{DrawingCanvas,GuessFeed,Standings,FinalReveal,Confetti,PraiseBanner,RoomQRCode,Timer}.tsx
lib/{db,ably-server,ably-client,roomCode,game(shuffle),praise,types}.ts, lib/i18n/*
```
`DrawingCanvas` props: `mode: "draw"|"spectate"`, `onStrokeComplete`, `externalStrokes`, `hideToolbar`, `onClear`, `theme`. Exposes `toPng()`/`clear()` via ref. Spectate mode renders `externalStrokes` and ignores pointer events.

## 6. Edge cases to handle
- Two players answering correctly at the same moment (conditional update, §3).
- Player refresh mid-game (state restored from DB + localStorage token); host refresh (token from localStorage; if missing show "missing host token, reload").
- Drawer can't guess; guesses on a non-active turn are rejected silently.
- Late joiners blocked after start. Room full at 20.
- Word list smaller than player count → Start disabled with explanation. Surplus words ignored.
- Stale Ably events for an older turn must not paint on the current canvas.
- Guess-feed auto-scrolls to bottom.
- Disable browser zoom on the game pages (`maximumScale: 1`) so drawing doesn't pinch-zoom.

## 7. Language toggle (Norwegian ⇄ Swedish) – implemented, reproduce it
- Fixed button top-right on every page switches the *entire* UI between Norwegian and Swedish (and could be extended with more languages).
- **All UI text lives in two typed dictionaries** (`no` is the source; `sv: Record<Key,string>` so the compiler enforces complete coverage). Placeholders `{name}`. Arrays for praise/timeout messages with identical length in each language.
- Choice stored in a **cookie** (`lang`, 1 year) so the server layout reads it and renders the right language on first paint (no flash); a React context provider + `useI18n()` gives `t(key, params)`, `praise(idx,name)`, `timeout(idx,word)`, `errText(err)`. Also updates `<html lang>`, `<title>`, meta description.
- **Server errors are thrown as codes** (`new Error("E:<key>|{json params}")`) and translated on the client – so they follow the language the *viewer* has chosen. Server never sends finished prose to clients (that's why praise/timeout are sent as indexes). Error state in components is stored as the raw error and translated at render time, so switching language updates an already-visible error.
- Includes `aria-label`s, `title` tooltips, placeholders, `confirm()` dialogs, 404 page, page title/meta, and the QR-code label. User-generated text (player names, words, guesses) is naturally not translated.

## 8. Build order
1. Scaffold Next.js + Tailwind, Neon schema, `lib/db`, Ably token route.
2. Server actions + zod + types; test with a script.
3. Landing, create-room, host lobby, player join/lobby with realtime player list.
4. `DrawingCanvas` + live stroke broadcast; guess flow; feed; standings.
5. Timer, turn transitions, skip/end/delete; final reveal + confetti + praise banners.
6. i18n layer; polish visuals; mobile pass; deploy to Vercel (add both env vars for Production and Preview).

## 9. Done when
Two phones + one laptop can play a full game: join with a code, drawer's strokes appear live on all other screens (<1 s), first correct guess ends the turn for everybody with confetti/banner, scores are right, host can skip/end, game ends with the countdown reveal, and the language toggle flips every visible string.
