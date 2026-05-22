import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import PlayerRoundClient from "./PlayerRoundClient";

export default async function PlayerRoundPage({
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

  return <PlayerRoundClient initialRoom={room} />;
}
