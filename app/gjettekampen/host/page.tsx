import CreateRoomForm from "./CreateRoomForm";

export default function HostNewRoomPage() {
  return (
    <main className="flex flex-col gap-6">
      <header>
        <p className="text-4xl">🎬</p>
        <h1 className="mt-2 bg-gradient-to-br from-orange-600 to-rose-600 bg-clip-text text-4xl font-black text-transparent">
          Opprett rom
        </h1>
        <p className="mt-2 text-neutral-700">
          Velg tid per tegne-runde og poengvekter. Ord legges inn etter at
          spillerne har joinet.
        </p>
      </header>
      <div className="rounded-3xl border-2 border-amber-200 bg-white/80 p-6 shadow-xl backdrop-blur">
        <CreateRoomForm />
      </div>
    </main>
  );
}
