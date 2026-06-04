import CreateRoomForm from "./CreateRoomForm";

export default function HostNewRoomPage() {
  return (
    <main className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold">Opprett rom</h1>
        <p className="mt-2 text-neutral-600">
          Velg tid per tegne-runde. Du legger inn ord etter at spillere har
          joinet.
        </p>
      </header>
      <CreateRoomForm />
    </main>
  );
}
