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
    router.push(`/tegnekjeden/spill/${code}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label
        className="text-sm font-black uppercase tracking-wide text-emerald-900"
        htmlFor="roomcode"
      >
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
        className="rounded-xl border-4 border-emerald-700/40 bg-[#fdf5e0] px-4 py-4 text-center text-3xl font-black tracking-[0.4em] text-emerald-900 placeholder:text-emerald-700/30 focus:border-emerald-700 focus:outline-none"
      />
      {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
      <button
        type="submit"
        className="rounded-xl border-4 border-emerald-950 bg-emerald-700 px-4 py-3 font-black uppercase tracking-wide text-emerald-50 shadow-[4px_4px_0_0_#0b2a18] transition hover:bg-emerald-600 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#0b2a18]"
      >
        Bli med 🚀
      </button>
    </form>
  );
}
