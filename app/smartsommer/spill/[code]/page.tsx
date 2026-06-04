import { notFound } from "next/navigation";
import { getPlayers, getRoomByCode } from "../../actions";
import PlayerLobbyClient from "./PlayerLobbyClient";

export default async function PlayerRoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const room = await getRoomByCode(code);
  if (!room) notFound();
  const players = await getPlayers(room.id);
  return <PlayerLobbyClient initialRoom={room} initialPlayers={players} />;
}
