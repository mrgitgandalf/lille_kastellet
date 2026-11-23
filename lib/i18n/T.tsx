"use client";

import { useI18n, type Key } from "./index";

/** Oversatt tekst som kan brukes direkte fra server-komponenter. */
export function T({ k, params }: { k: Key; params?: Record<string, string | number> }) {
  const { t } = useI18n();
  return <>{t(k, params)}</>;
}
