"use client";

import Ably from "ably";

/**
 * Client-side Ably-instans. Henter kortvarig token fra /api/ably-token
 * (token-auth). Eksponerer ikke API-keyen til klient-bundlen.
 *
 * Token-auth-flyten kjører automatisk i bakgrunnen ved tilkobling
 * og fornyelse.
 */
export function createAblyClient(): Ably.Realtime {
  return new Ably.Realtime({
    authUrl: "/api/ably-token",
    authMethod: "POST",
  });
}
