import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import HostRoomClient from "./HostRoomClient";

export default async function HostRoomPage({
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

  return (
    <HostRoomClient initialRoom={room} initialPlayers={players ?? []} />
  );
}
