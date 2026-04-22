// ── Quiz Game Utilities ────────────────────────────────────────────────────────

export const GAME_THEMES = [
  {
    id: "classic",
    name: "Classic",
    bg: "#4a1942",
    card: "rgba(0,0,0,0.55)",
    accent: "#ff006e",
    preview: "linear-gradient(135deg, #4a1942, #7c2d6e)",
  },
  {
    id: "neon",
    name: "Neon",
    bg: "#0d0d0d",
    card: "rgba(0,255,136,0.08)",
    accent: "#00ff88",
    preview: "linear-gradient(135deg, #0d0d0d, #003322)",
  },
  {
    id: "ocean",
    name: "Ocean",
    bg: "#0a1628",
    card: "rgba(0,100,200,0.25)",
    accent: "#00c8ff",
    preview: "linear-gradient(135deg, #0a1628, #0a3060)",
  },
  {
    id: "sunset",
    name: "Sunset",
    bg: "#1a0a00",
    card: "rgba(255,100,0,0.18)",
    accent: "#ff6b35",
    preview: "linear-gradient(135deg, #1a0a00, #5a1a00)",
  },
  {
    id: "forest",
    name: "Forest",
    bg: "#0a1a0a",
    card: "rgba(0,100,0,0.25)",
    accent: "#00cc44",
    preview: "linear-gradient(135deg, #0a1a0a, #0a3a0a)",
  },
  {
    id: "monochrome",
    name: "Monochrome",
    bg: "#111111",
    card: "rgba(255,255,255,0.08)",
    accent: "#ffffff",
    preview: "linear-gradient(135deg, #111, #333)",
  },
  {
    id: "cosmic",
    name: "Cosmic",
    bg: "#020010",
    card: "rgba(100,0,200,0.25)",
    accent: "#a855f7",
    preview: "linear-gradient(135deg, #020010, #1a0040)",
  },
] as const;

export type ThemeId = typeof GAME_THEMES[number]["id"];

export const ANSWER_COLORS = ["#7cb342", "#8e24aa", "#f4511e", "#00897b"] as const;
export const ANSWER_LABELS = ["1", "2", "3", "4"] as const;

export const AVATAR_EMOJIS = [
  "🦊","🐯","🦁","🐸","🐧","🦅","🐬","🦋","🐉","🦄",
  "🎃","👾","🤖","👻","🎯","🚀","⚡","🌟","🔥","💎",
];

export const FUN_NAMES = [
  "SpeedyLion","BraveFox","MightyEagle","SwiftTiger","BoldDragon",
  "CleverOwl","FierceWolf","NobleFalcon","WildPanther","QuickHawk",
  "StrongBear","SharpMind","FlashRunner","StarSeeker","LightBringer",
];

export function randomAvatar(): string {
  return AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];
}

export function randomFunName(): string {
  return FUN_NAMES[Math.floor(Math.random() * FUN_NAMES.length)];
}

export function generateJoinCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function getTheme(id: string) {
  return GAME_THEMES.find(t => t.id === id) ?? GAME_THEMES[0];
}

export function ordinal(n: number): string {
  const s = ["th","st","nd","rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function calcPoints(timeMs: number, maxTimeMs: number, basePoints = 1000): number {
  if (maxTimeMs <= 0) return basePoints;
  const ratio = Math.max(0, 1 - timeMs / maxTimeMs);
  return Math.round(basePoints * 0.5 + basePoints * 0.5 * ratio);
}
