import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[900px] flex-col items-center justify-center px-4 py-8 text-center">
      <h1
        className="font-script text-[3rem] font-normal tracking-[0.05em] text-neutral-500"
        style={{ marginBottom: "1.5rem" }}
      >
        Lille Kastellet
      </h1>
      <figure>
        <Image
          src="/lille_kastellet.jpg"
          alt="Historisk fotografi av Lille Kastellet med hage og beboere"
          width={1600}
          height={1067}
          priority
          className="block h-auto w-full border border-neutral-200 shadow-[0_2px_12px_rgba(0,0,0,0.1)]"
        />
        <figcaption className="mt-2 text-xs text-neutral-500">
          Foto tilgjengeliggjort av Bekkelagshøgda lokalhistorisk forening (v/ Dag Jarnøy)
        </figcaption>
      </figure>
      <footer className="mt-8 text-[11px] text-neutral-400">
        <Link href="/tegnekjeden" className="hover:text-neutral-600">
          tegnekjeden
        </Link>
        <span className="mx-2">·</span>
        <Link href="/gjettekampen" className="hover:text-neutral-600">
          gjettekampen
        </Link>
      </footer>
    </main>
  );
}
