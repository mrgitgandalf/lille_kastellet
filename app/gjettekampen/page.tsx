import Link from "next/link";
import JoinForm from "./JoinForm";

export default function GjettekampenLanding() {
  return (
    <main className="flex flex-col gap-8">
      <header className="text-center">
        <h1 className="text-3xl font-semibold">Gjettekampen</h1>
        <p className="mt-2 text-neutral-600">
          Alle-mot-alle pictionary. Én tegner – alle andre gjetter. Førstemann
          med riktig svar får poeng.
        </p>
      </header>

      <section className="rounded-2xl border border-neutral-200 p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Bli med i spill</h2>
        <JoinForm />
      </section>

      <section className="rounded-2xl border border-neutral-200 p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Start et nytt spill</h2>
        <p className="mb-3 text-sm text-neutral-600">
          Du blir vert, legger inn ord-listen og følger med på spillet (uten å
          spille selv).
        </p>
        <Link
          href="/gjettekampen/host"
          className="inline-block rounded-lg bg-neutral-900 px-4 py-2 text-white"
        >
          Opprett rom
        </Link>
      </section>
    </main>
  );
}
