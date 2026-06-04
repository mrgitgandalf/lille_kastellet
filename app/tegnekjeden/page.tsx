import Link from "next/link";
import JoinForm from "./JoinForm";

export default function TegnekjedenLanding() {
  return (
    <main className="flex flex-col gap-8">
      <header className="text-center">
        <h1 className="text-3xl font-semibold">Tegnekjeden</h1>
        <p className="mt-2 text-neutral-600">
          Telefon-pictionary for teamet. Bli med via 4-sifret kode, eller start
          et nytt spill som vert.
        </p>
      </header>

      <section className="rounded-2xl border border-neutral-200 p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Bli med i spill</h2>
        <JoinForm />
      </section>

      <section className="rounded-2xl border border-neutral-200 p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Start et nytt spill</h2>
        <p className="mb-3 text-sm text-neutral-600">
          Du blir vert og styrer spillet fra denne enheten (laptop med
          prosjektor anbefales).
        </p>
        <Link
          href="/tegnekjeden/host"
          className="inline-block rounded-lg bg-neutral-900 px-4 py-2 text-white"
        >
          Opprett rom
        </Link>
      </section>
    </main>
  );
}
