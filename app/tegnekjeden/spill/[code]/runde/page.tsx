import { notFound } from "next/navigation";
import { getRoomByCode } from "../../../actions";
import PlayerRoundClient from "./PlayerRoundClient";

export default async function PlayerRoundPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const room = await getRoomByCode(code);
  if (!room) notFound();
  return <PlayerRoundClient initialRoom={room} />;
}
