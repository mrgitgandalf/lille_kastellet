import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import RevealClient from "./RevealClient";

export default async function HostRevealPage({
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

  const { data: books } = await supabase
    .from("books")
    .select("*")
    .eq("room_id", room.id);

  const bookIds = (books ?? []).map((b) => b.id);
  const { data: pages } = bookIds.length
    ? await supabase
        .from("pages")
        .select("*")
        .in("book_id", bookIds)
        .order("page_index", { ascending: true })
    : { data: [] };

  return (
    <RevealClient
      room={room}
      players={players ?? []}
      books={books ?? []}
      pages={pages ?? []}
    />
  );
}
