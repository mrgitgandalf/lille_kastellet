"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { isValidRoomCode } from "@/lib/roomCode";
import { useI18n } from "@/lib/i18n";

export default function JoinForm() {
  const router = useRouter();
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [showErr, setShowErr] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidRoomCode(code)) {
      setShowErr(true);
      return;
    }
    setShowErr(false);
    router.push(`/gjettekampen/spill/${code}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label
        className="text-sm font-black uppercase tracking-wide text-emerald-900"
        htmlFor="roomcode"
      >
        {t("join.code.label")}
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
      {showErr && (
        <p className="text-sm font-semibold text-red-700">{t("join.code.err")}</p>
      )}
      <button
        type="submit"
        className="rounded-xl border-4 border-emerald-950 bg-emerald-700 px-4 py-3 font-black uppercase tracking-wide text-emerald-50 shadow-[4px_4px_0_0_#0b2a18] transition hover:bg-emerald-600 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#0b2a18]"
      >
        {t("join.btn")}
      </button>
    </form>
  );
}
