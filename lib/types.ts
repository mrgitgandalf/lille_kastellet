export type RoomState = "lobby" | "playing" | "reveal" | "finished";
export type RoomMode = "player_prompts" | "preset_prompts";
export type GameType = "tegnekjeden" | "gjettekampen";
export type PageKind = "text" | "drawing";

export type Room = {
  id: string;
  code: string;
  host_token: string;
  state: RoomState;
  mode: RoomMode;
  game_type: GameType;
  preset_prompts: string[];
  round_seconds: number;
  current_round: number;
  pages_per_book: number | null;
  gjette_guess_points: number;
  gjette_drawer_points: number;
  created_at: string;
};

export type Player = {
  id: string;
  room_id: string;
  name: string;
  client_token: string;
  seat_order: number;
  is_skipped: boolean;
  created_at: string;
};

export type Book = {
  id: string;
  room_id: string;
  owner_player_id: string;
  created_at: string;
};

export type Page = {
  id: string;
  book_id: string;
  page_index: number;
  author_player_id: string | null;
  kind: PageKind;
  content: string;
  submitted_at: string;
};

// --- Gjettekampen --------------------------------------------------

export type GjetteTurnState = "pending" | "active" | "finished";
export type GjetteEndReason = "correct_guess" | "timeout" | "skipped";

export type GjetteWord = {
  id: string;
  room_id: string;
  word: string;
  word_order: number;
  assigned_player_id: string | null;
  created_at: string;
};

export type GjetteTurn = {
  id: string;
  room_id: string;
  turn_order: number;
  drawer_player_id: string;
  word: string;
  state: GjetteTurnState;
  started_at: string | null;
  ended_at: string | null;
  end_reason: GjetteEndReason | null;
  winner_player_id: string | null;
};

export type GjetteGuess = {
  id: string;
  turn_id: string;
  player_id: string;
  text: string;
  is_correct: boolean;
  created_at: string;
};

export type Standing = {
  player_id: string;
  name: string;
  draws_won: number;
  guesses_won: number;
  score: number;
};

export type GjetteScoring = {
  guessPoints: number;
  drawerPoints: number;
};
