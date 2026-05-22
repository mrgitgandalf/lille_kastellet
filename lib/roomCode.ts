/**
 * Genererer et 4-sifret romkode-streng (0000–9999).
 * Unikhet håndteres ved retry på DB-konflikt – kode kollisjon på <10 000
 * aktive rom er uansett uvanlig i praksis.
 */
export function generateRoomCode(): string {
  const n = Math.floor(Math.random() * 10_000);
  return n.toString().padStart(4, "0");
}

export function isValidRoomCode(input: string): boolean {
  return /^\d{4}$/.test(input);
}
