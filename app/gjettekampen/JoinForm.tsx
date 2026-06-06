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
        className="rounded-xl border-2 border-amber-200 bg-white px-4 py-4 text-center text-3xl font-bold tracking-[0.4em] focus:border-amber-500 focus:outline-none"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        className="rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-4 py-3 font-bold text-white shadow-md transition hover:from-orange-600 hover:to-rose-600"
      >
        Bli med 🚀
      </button>
    </form>
  );
}
