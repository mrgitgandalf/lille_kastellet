"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { no, sv, PRAISES, TIMEOUTS, type Key, type Lang } from "./dict";
import { parseAppError } from "./errors";

export type { Lang, Key };

export const LANG_COOKIE = "lang";
const dicts: Record<Lang, Record<Key, string>> = { no, sv };

type Params = Record<string, string | number>;

function fill(s: string, params?: Params): string {
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m));
}

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: Key, params?: Params) => string;
  praise: (idx: number, name: string) => string;
  timeout: (idx: number, word: string) => string;
  /** Oversetter en feil kastet av en server action (eller faller tilbake til `fallback`). */
  errText: (err: unknown, fallback?: Key) => string;
};

function build(lang: Lang, setLang: (l: Lang) => void): Ctx {
  const t = (key: Key, params?: Params) => fill(dicts[lang][key] ?? no[key], params);
  return {
    lang,
    setLang,
    t,
    praise: (idx, name) => {
      const list = PRAISES[lang];
      return fill(list[idx % list.length], { name });
    },
    timeout: (idx, word) => {
      const list = TIMEOUTS[lang];
      return fill(list[idx % list.length], { word });
    },
    errText: (err, fallback = "err.generic") => {
      const parsed = parseAppError(err);
      return parsed ? t(parsed.key, parsed.params) : t(fallback);
    },
  };
}

// Uten provider (f.eks. Tegnekjeden, som bruker de samme delte komponentene)
// faller alt tilbake til norsk — uendret oppførsel.
const FallbackCtx: Ctx = build("no", () => {});
const I18nContext = createContext<Ctx>(FallbackCtx);

export function I18nProvider({
  initialLang,
  children,
}: {
  initialLang: Lang;
  children: React.ReactNode;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = dicts[lang]["meta.title"];
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", dicts[lang]["meta.desc"]);
  }, [lang]);

  const value = useMemo(() => build(lang, setLang), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  return useContext(I18nContext);
}

export function LanguageToggle() {
  const { lang, setLang, t } = useI18n();
  return (
    <button
      type="button"
      onClick={() => setLang(lang === "no" ? "sv" : "no")}
      aria-label={t("toggle.aria")}
      className="fixed right-3 top-3 z-[60] rounded-lg border-4 border-violet-950 bg-violet-800 px-3 py-1 text-xs font-black uppercase tracking-wide text-violet-50 shadow-[3px_3px_0_0_#0b0420] transition hover:bg-violet-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_#0b0420]"
    >
      {lang === "no" ? "🇸🇪" : "🇳🇴"} {t("toggle.switchTo")}
    </button>
  );
}
