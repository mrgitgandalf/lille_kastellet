// 30 varianter for å hylle den som gjetter riktig.
// Bruk {name} som plassholder for spillerens navn.
const PRAISES: string[] = [
  "Du er en mester, {name}! 🏆",
  "Wow, {name} – du er rå!",
  "{name} traff blink! 🎯",
  "Sjefer, sjefer! Det er {name}!",
  "Hurra for {name}! 🎉",
  "{name} er en gjetning-ninja! 🥷",
  "Helt sjukt, {name}!",
  "Bingo! Du klarte det, {name}! 🎰",
  "Smart-{name}! 💡",
  "Hatten av for {name}! 🎩",
  "Tusen takk, {name}, du redda runden!",
  "Hold deg fast, {name} knuste det!",
  "Genial, {name}!",
  "Magisk gjetning, {name}! ✨",
  "{name} er en kløpper! 🧠",
  "Rakettfart, {name}! 🚀",
  "Sjekka, {name}! Sjekka!",
  "Hurra! {name} skjønte det!",
  "Du er på topp, {name}! 🏔️",
  "Knall og fall, {name}!",
  "Du dansa rett inn, {name}! 💃",
  "{name}, du er som Sherlock! 🔍",
  "Først ute, {name}! Bra jobba!",
  "Treffsikker, {name}! 🏹",
  "{name} – kongen av runden! 👑",
  "Saftig gjetning, {name}! 🍉",
  "Du sa det, {name}! 🎤",
  "Rett i blinken, {name}!",
  "Hau hau, {name}! Du tok'n!",
  "Bravo, {name}! 👏",
];

export function randomPraise(name: string): string {
  const tpl = PRAISES[Math.floor(Math.random() * PRAISES.length)];
  return tpl.replace("{name}", name);
}

const TIMEOUTS: string[] = [
  "Tiden er ute! Ordet var: {word} ⏰",
  "Au au! Ingen gjettet {word} 😱",
  "Pyttsann! {word} smatt unna! 🤷",
  "Buhu, ingen klarte {word} 😭",
  "Skuffende! Ordet var {word} 🙈",
  "Næ-næ, {word} fikk fred denne gangen! 🤐",
  "Ojsann! Ordet var: {word} 😬",
  "Skikkelig vanskelig — det var {word}! 🤔",
  "Bom! Riktig svar var: {word} 💥",
  "Slutt! Ordet var: {word} ⛔",
  "Glipp! Ingen fant {word} 😅",
  "Surt! Ordet var: {word} 🍋",
  "Ingen tegninger her kunne redde {word} 🎨",
  "Ojda! {word} var løsningen 🫣",
  "Klokken tikker — det var {word}! 🕰️",
  "Whops, det var {word}! 🤯",
  "Æsj! Ingen knekte {word} 🥲",
  "Tiden gikk — {word} fikk vinge! 🦋",
  "Fy søren! Ordet var: {word} 😵",
  "Spilltiden er ute! Det var {word} 🎯",
];

export function randomTimeout(word: string): string {
  const tpl = TIMEOUTS[Math.floor(Math.random() * TIMEOUTS.length)];
  return tpl.replace("{word}", word);
}
