"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createRoom } from "../actions";
import { useI18n } from "@/lib/i18n";
import { appError } from "@/lib/i18n/errors";

export default function CreateRoomForm() {
  const router = useRouter();
  const { t, errText } = useI18n();
  const [roundSeconds, setRoundSeconds] = useState(180);
  const [guessPoints, setGuessPoints] = useState(1);
  const [drawerPoints, setDrawerPoints] = useState(3);
  const [wordsText, setWordsText] = useState("");
  // Rå feil lagres og oversettes ved visning, så den følger språkvalget.
  const [error, setError] = useState<Error | null>(null);
  const [pending, startTransition] = useTransition();

  const liveWordCount = wordsText
    .split("\n")
    .map((w) => w.trim())
    .filter((w) => w.length > 0).length;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (liveWordCount < 2) {
      setError(appError("create.err.min", { n: liveWordCount }));
      return;
    }
    startTransition(async () => {
      try {
        const { code, hostToken } = await createRoom({
          roundSeconds,
          guessPoints,
          drawerPoints,
          wordsText,
        });
        if (typeof window !== "undefined") {
          localStorage.setItem(`host_token:${code}`, hostToken);
        }
        router.push(`/gjettekampen/host/${code}`);
      } catch (err) {
        setError(err instanceof Error ? err : new Error());
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-3 rounded-xl border-4 border-sky-700/40 bg-sky-50 p-4 shadow-[3px_3px_0_0_rgba(0,0,0,0.12)]">
        <legend className="px-2 text-xs font-black uppercase tracking-wide text-sky-900">
          {t("create.time.legend")}
        </legend>
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={roundSeconds === 0}
            onChange={(e) => setRoundSeconds(e.target.checked ? 0 : 180)}
            className="h-5 w-5 accent-violet-800"
          />
          <span className="text-sm font-bold text-sky-900">
            {t("create.time.none")}
          </span>
        </label>
        {roundSeconds > 0 && (
          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold text-sky-900">
              <strong className="text-base">{roundSeconds}s</strong>{" "}
              {t("create.time.perRound")}
            </span>
            <input
              type="range"
              min={30}
              max={240}
              step={15}
              value={roundSeconds}
              onChange={(e) => setRoundSeconds(parseInt(e.target.value, 10))}
              className="accent-violet-800"
            />
          </label>
        )}
        <span className="text-xs font-semibold text-sky-800/70">
          {t("create.time.hint")}
        </span>
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-xl border-4 border-emerald-700/40 bg-emerald-50 p-4 shadow-[3px_3px_0_0_rgba(0,0,0,0.12)]">
        <legend className="px-2 text-xs font-black uppercase tracking-wide text-emerald-900">
          {t("create.pts.legend")}
        </legend>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-bold text-emerald-900">
            {t("create.pts.guess")}{" "}
            <strong className="text-base">{guessPoints}p</strong>
          </span>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={guessPoints}
            onChange={(e) => setGuessPoints(parseInt(e.target.value, 10))}
            className="accent-violet-800"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-bold text-emerald-900">
            {t("create.pts.drawer")}{" "}
            <strong className="text-base">{drawerPoints}p</strong>
          </span>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={drawerPoints}
            onChange={(e) => setDrawerPoints(parseInt(e.target.value, 10))}
            className="accent-violet-800"
          />
        </label>
        <span className="text-xs font-semibold text-emerald-800/70">
          {t("create.pts.hint")}
        </span>
      </fieldset>

      <fieldset className="flex flex-col gap-3 rounded-xl border-4 border-rose-700/40 bg-rose-50 p-4 shadow-[3px_3px_0_0_rgba(0,0,0,0.12)]">
        <legend className="px-2 text-xs font-black uppercase tracking-wide text-rose-900">
          {t("create.words.legend", { n: liveWordCount })}
        </legend>
        <textarea
          value={wordsText}
          onChange={(e) => setWordsText(e.target.value)}
          rows={8}
          placeholder={t("create.words.placeholder")}
          className="w-full rounded-xl border-4 border-rose-700/40 bg-[#fdf5e0] px-3 py-2 font-mono text-sm font-semibold text-rose-900 focus:border-rose-700 focus:outline-none"
        />
        <span className="text-xs font-semibold text-rose-900/70">
          {t("create.words.hint")}
        </span>
      </fieldset>

      {error && (
        <p className="text-sm font-semibold text-red-700">{errText(error)}</p>
      )}

      <button
        type="submit"
        disabled={pending || liveWordCount < 2}
        className="rounded-xl border-4 border-violet-950 bg-violet-800 px-4 py-3 font-black uppercase tracking-wide text-violet-50 shadow-[4px_4px_0_0_#0b0420] transition hover:bg-violet-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#0b0420] disabled:border-stone-700 disabled:bg-stone-500"
      >
        {liveWordCount < 2
          ? t("create.btn.need", { n: 2 - liveWordCount })
          : pending
          ? t("create.btn.creating")
          : t("create.btn.create")}
      </button>
    </form>
  );
}
