import { notFound } from "next/navigation";
import {
  getActiveTurn,
  getAllTurns,
  getGuessesForTurn,
  getPlayers,
  getRoomByCode,
  getStandings,
  getWords,
} from "../../actions";
import HostRoomClient from "./HostRoomClient";

export default async function HostRoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const room = await getRoomByCode(code);
  if (!room) notFound();
  const [players, words, turns, activeTurn, standings] = await Promise.all([
    getPlayers(room.id),
    getWords(room.id),
    getAllTurns(room.id),
    getActiveTurn(room.id),
    getStandings(room.id),
  ]);
  const guesses = activeTurn ? await getGuessesForTurn(activeTurn.id) : [];
  return (
    <HostRoomClient
      initialRoom={room}
      initialPlayers={players}
      initialWords={words}
      initialTurns={turns}
      initialActiveTurn={activeTurn}
      initialGuesses={guesses}
      initialStandings={standings}
    />
  );
}
