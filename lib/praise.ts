import { PRAISES, TIMEOUTS } from "@/lib/i18n/dict";

// Serveren velger bare en indeks; hver klient viser teksten på sitt eget språk
// (se PRAISES/TIMEOUTS i lib/i18n/dict.ts, samme lengde i begge språk).
export function randomPraiseIdx(): number {
  return Math.floor(Math.random() * PRAISES.no.length);
}

export function randomTimeoutIdx(): number {
  return Math.floor(Math.random() * TIMEOUTS.no.length);
}
