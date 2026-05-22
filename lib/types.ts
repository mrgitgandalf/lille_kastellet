export type RoomState = "lobby" | "playing" | "reveal" | "finished";
export type RoomMode = "player_prompts" | "preset_prompts";
export type PageKind = "text" | "drawing";

export type Room = {
  id: string;
  code: string;
  host_token: string;
  state: RoomState;
  mode: RoomMode;
  preset_prompts: string[];
  round_seconds: number;
  current_round: number;
  pages_per_book: number | null;
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
