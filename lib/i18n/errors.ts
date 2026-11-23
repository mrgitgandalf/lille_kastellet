// Server actions kaster feil som en kode («E:<nøkkel>|<json-params>») i stedet
// for ferdig tekst. Klienten oversetter koden til brukerens valgte språk.
// (Kan importeres fra både server actions og klientkomponenter.)

import type { Key } from "./dict";

export function appError(key: Key, params?: Record<string, string | number>): Error {
  return new Error(`E:${key}${params ? "|" + JSON.stringify(params) : ""}`);
}

export function parseAppError(
  err: unknown,
): { key: Key; params?: Record<string, string | number> } | null {
  const msg = err instanceof Error ? err.message : "";
  if (!msg.startsWith("E:")) return null;
  const [key, json] = msg.slice(2).split(/\|(.+)/s);
  try {
    return { key: key as Key, params: json ? JSON.parse(json) : undefined };
  } catch {
    return { key: key as Key };
  }
}
