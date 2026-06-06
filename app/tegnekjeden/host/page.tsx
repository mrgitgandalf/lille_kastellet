import CreateRoomForm from "./CreateRoomForm";

export default function HostNewRoomPage() {
  return (
    <main className="flex flex-col gap-6">
      <header className="text-center">
        <p className="text-5xl">🎬</p>
        <h1 className="mt-3 text-3xl font-black uppercase tracking-tight text-rose-200 sm:text-5xl [text-shadow:_3px_3px_0_#9f1239,_-2px_-2px_0_#9f1239,_2px_-2px_0_#9f1239,_-2px_2px_0_#9f1239,_2px_2px_0_#9f1239]">
          Opprett rom
        </h1>
        <p className="mt-3 text-sm font-semibold text-stone-700">
          Velg modus og rundetid. Du får en 4-sifret kode som spillerne joiner
          med.
        </p>
      </header>
      <div className="rounded-2xl border-4 border-rose-700/40 bg-rose-100 p-6 shadow-[6px_6px_0_0_rgba(0,0,0,0.15)]">
        <CreateRoomForm />
      </div>
    </main>
  );
}
