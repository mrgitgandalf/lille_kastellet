import { notFound } from "next/navigation";
import { getPlayers, getRoomByCode } from "../../actions";
import HostRoomClient from "./HostRoomClient";

export default async function HostRoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const room = await getRoomByCode(code);
  if (!room) notFound();
  const players = await getPlayers(room.id);
  return <HostRoomClient initialRoom={room} initialPlayers={players} />;
}
