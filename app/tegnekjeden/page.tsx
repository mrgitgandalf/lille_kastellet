import Link from "next/link";
import JoinForm from "./JoinForm";

export default function TegnekjedenLanding() {
  return (
    <main className="flex flex-col gap-8">
      <header className="text-center">
        <p className="text-5xl tracking-widest">📖 ✏️ 💬</p>
        <h1 className="mt-4 text-4xl font-black uppercase tracking-tight text-violet-200 sm:text-6xl [text-shadow:_3px_3px_0_#5b21b6,_-2px_-2px_0_#5b21b6,_2px_-2px_0_#5b21b6,_-2px_2px_0_#5b21b6,_2px_2px_0_#5b21b6]">
          Tegnekjeden
        </h1>
        <p className="mt-4 text-sm font-semibold text-stone-700">
          Telefon-pictionary for teamet. Bli med via 4-sifret kode, eller start
          et nytt spill som vert.
        </p>
      </header>

      <section className="rounded-2xl border-4 border-emerald-700/40 bg-emerald-100 p-6 shadow-[6px_6px_0_0_rgba(0,0,0,0.15)]">
        <h2 className="mb-3 text-xl font-black uppercase tracking-wide text-emerald-900">
          🕹️ Bli med i spill
        </h2>
        <JoinForm />
      </section>

      <section className="rounded-2xl border-4 border-rose-700/40 bg-rose-100 p-6 shadow-[6px_6px_0_0_rgba(0,0,0,0.15)]">
        <h2 className="mb-3 text-xl font-black uppercase tracking-wide text-rose-900">
          🎬 Start et nytt spill
        </h2>
        <p className="mb-4 text-sm font-semibold text-stone-700">
          Du blir vert og styrer spillet fra denne enheten (laptop med
          prosjektor anbefales).
        </p>
        <Link
          href="/tegnekjeden/host"
          className="inline-block rounded-xl border-4 border-violet-950 bg-violet-800 px-6 py-3 font-black uppercase tracking-wide text-violet-50 shadow-[4px_4px_0_0_#0b0420] transition hover:bg-violet-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#0b0420]"
        >
          Opprett rom →
        </Link>
      </section>
    </main>
  );
}
