import { notFound } from "next/navigation";
import {
  getActiveTurn,
  getAllTurns,
  getGuessesForTurn,
  getPlayers,
  getRoomByCode,
  getStandings,
} from "../../../actions";
import PlayerTurnClient from "./PlayerTurnClient";

export default async function PlayerTurnPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const room = await getRoomByCode(code);
  if (!room) notFound();
  const [players, turns, activeTurn, standings] = await Promise.all([
    getPlayers(room.id),
    getAllTurns(room.id),
    getActiveTurn(room.id),
    getStandings(room.id),
  ]);
  const guesses = activeTurn ? await getGuessesForTurn(activeTurn.id) : [];
  return (
    <PlayerTurnClient
      initialRoom={room}
      initialPlayers={players}
      initialTurns={turns}
      initialActiveTurn={activeTurn}
      initialGuesses={guesses}
      initialStandings={standings}
    />
  );
}
