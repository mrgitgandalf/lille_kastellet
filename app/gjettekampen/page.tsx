import Link from "next/link";
import JoinForm from "./JoinForm";

export default function GjettekampenLanding() {
  return (
    <main className="flex flex-col gap-8">
      <header className="text-center">
        <p className="text-5xl">🎨 ✏️ 🎯</p>
        <h1 className="mt-3 bg-gradient-to-br from-pink-600 to-fuchsia-700 bg-clip-text text-5xl font-black tracking-tight text-transparent">
          Gjettekampen
        </h1>
        <p className="mt-3 text-neutral-700">
          Alle-mot-alle pictionary. Én tegner – alle andre gjetter. Førstemann
          med riktig svar får poeng!
        </p>
      </header>

      <section className="rounded-3xl border-2 border-pink-200 bg-white/80 p-6 shadow-xl backdrop-blur">
        <h2 className="mb-3 text-xl font-bold text-pink-700">
          🕹️ Bli med i spill
        </h2>
        <JoinForm />
      </section>

      <section className="rounded-3xl border-2 border-pink-200 bg-white/80 p-6 shadow-xl backdrop-blur">
        <h2 className="mb-3 text-xl font-bold text-pink-700">
          🎬 Start et nytt spill
        </h2>
        <p className="mb-4 text-sm text-neutral-700">
          Du blir vert, legger inn ord-listen og følger med på spillet (uten å
          spille selv).
        </p>
        <Link
          href="/gjettekampen/host"
          className="inline-block rounded-xl bg-neutral-900 px-6 py-3 font-bold text-white shadow-md ring-2 ring-pink-400/40 transition hover:bg-neutral-800 hover:ring-pink-400"
        >
          Opprett rom →
        </Link>
      </section>
    </main>
  );
}
