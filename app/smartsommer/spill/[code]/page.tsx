import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import PlayerLobbyClient from "./PlayerLobbyClient";

export default async function PlayerRoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = createSupabaseServerClient();
  const { data: room } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", code)
    .maybeSingle();
  if (!room) notFound();

  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("room_id", room.id)
    .order("seat_order", { ascending: true });

  return <PlayerLobbyClient initialRoom={room} initialPlayers={players ?? []} />;
}
