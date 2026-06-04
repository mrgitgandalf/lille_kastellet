import Ably from "ably";

/**
 * Server-side Ably-instans. Brukes til å publisere events fra server
 * actions etter at en mutasjon er gjort. Klienten lytter via egen
 * Ably-tilkobling (token-auth, se /api/ably-token).
 */
let cached: Ably.Rest | null = null;

function getAblyRest(): Ably.Rest {
  if (cached) return cached;
  cached = new Ably.Rest({ key: process.env.ABLY_API_KEY! });
  return cached;
}

export type RoomEvent =
  | "room.updated"
  | "players.updated"
  | "pages.updated"
  | "turn.started"
  | "turn.ended"
  | "guess.posted"
  | "game.finished";

export async function publishRoomEvent(
  roomId: string,
  event: RoomEvent,
  data?: Record<string, unknown>,
): Promise<void> {
  const rest = getAblyRest();
  await rest.channels.get(`room:${roomId}`).publish(event, data ?? {});
}
