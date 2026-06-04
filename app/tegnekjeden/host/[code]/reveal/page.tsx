import { notFound } from "next/navigation";
import { getRevealData } from "../../../actions";
import RevealClient from "./RevealClient";

export default async function HostRevealPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const data = await getRevealData(code);
  if (!data) notFound();
  return (
    <RevealClient
      room={data.room}
      players={data.players}
      books={data.books}
      pages={data.pages}
    />
  );
}
