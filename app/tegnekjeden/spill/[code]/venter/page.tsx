export default function PlayerWaitingForReveal() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-6xl">📺</p>
      <h1 className="text-3xl font-black uppercase tracking-tight text-violet-200 sm:text-4xl [text-shadow:_3px_3px_0_#5b21b6,_-2px_-2px_0_#5b21b6,_2px_-2px_0_#5b21b6,_-2px_2px_0_#5b21b6,_2px_2px_0_#5b21b6]">
        Se på storskjermen!
      </h1>
      <p className="max-w-md font-semibold text-stone-700">
        Spillet er ferdig. Host blar gjennom bøkene side for side på
        prosjektoren.
      </p>
    </main>
  );
}
