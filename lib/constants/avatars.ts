export const AVATAR_PRESETS = [
  { key: "fox", emoji: "🦊", bgClass: "bg-orange-100 dark:bg-orange-950" },
  { key: "bear", emoji: "🐻", bgClass: "bg-amber-100 dark:bg-amber-950" },
  { key: "cat", emoji: "🐱", bgClass: "bg-pink-100 dark:bg-pink-950" },
  { key: "panda", emoji: "🐼", bgClass: "bg-slate-100 dark:bg-slate-800" },
  { key: "rabbit", emoji: "🐰", bgClass: "bg-rose-100 dark:bg-rose-950" },
  { key: "owl", emoji: "🦉", bgClass: "bg-indigo-100 dark:bg-indigo-950" },
  { key: "penguin", emoji: "🐧", bgClass: "bg-sky-100 dark:bg-sky-950" },
  { key: "tiger", emoji: "🐯", bgClass: "bg-yellow-100 dark:bg-yellow-950" },
] as const;

export type AvatarKey = (typeof AVATAR_PRESETS)[number]["key"];

export const AVATAR_KEYS = AVATAR_PRESETS.map((preset) => preset.key) as [
  AvatarKey,
  ...AvatarKey[],
];

export function getAvatarPreset(key: string) {
  return AVATAR_PRESETS.find((preset) => preset.key === key) ?? AVATAR_PRESETS[0];
}
