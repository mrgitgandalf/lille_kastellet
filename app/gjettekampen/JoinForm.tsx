"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { isValidRoomCode } from "@/lib/roomCode";

export default function JoinForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidRoomCode(code)) {
      setError("Koden må være 4 sifre.");
      return;
    }
    setError(null);
    router.push(`/gjettekampen/spill/${code}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label className="text-sm font-medium" htmlFor="roomcode">
        Romkode
      </label>
      <input
        id="roomcode"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        placeholder="0000"
        className="rounded-xl border-2 border-pink-200 bg-white px-4 py-4 text-center text-3xl font-bold tracking-[0.4em] focus:border-pink-500 focus:outline-none"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        className="rounded-xl bg-neutral-900 px-4 py-3 font-bold text-white shadow-md ring-2 ring-pink-400/40 transition hover:bg-neutral-800 hover:ring-pink-400"
      >
        Bli med 🚀
      </button>
    </form>
  );
}
