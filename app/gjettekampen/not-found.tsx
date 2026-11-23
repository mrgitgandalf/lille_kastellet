"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function GjettekampenNotFound() {
  const { t } = useI18n();
  return (
    <main className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="text-5xl">🤷</p>
      <h1 className="text-2xl font-black uppercase text-stone-800">{t("nf.title")}</h1>
      <Link
        href="/gjettekampen"
        className="rounded-xl border-4 border-violet-950 bg-violet-800 px-4 py-2 text-sm font-black uppercase tracking-wide text-violet-50 shadow-[3px_3px_0_0_#0b0420]"
      >
        {t("nf.back")}
      </Link>
    </main>
  );
}
