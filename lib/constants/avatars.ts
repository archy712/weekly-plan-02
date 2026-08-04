export const AVATAR_PRESETS = [
  { key: "fox", emoji: "🦊", bgClass: "bg-orange-100 dark:bg-orange-950" },
  { key: "bear", emoji: "🐻", bgClass: "bg-amber-100 dark:bg-amber-950" },
  { key: "cat", emoji: "🐱", bgClass: "bg-pink-100 dark:bg-pink-950" },
  { key: "panda", emoji: "🐼", bgClass: "bg-slate-100 dark:bg-slate-800" },
  { key: "rabbit", emoji: "🐰", bgClass: "bg-rose-100 dark:bg-rose-950" },
  { key: "owl", emoji: "🦉", bgClass: "bg-indigo-100 dark:bg-indigo-950" },
  { key: "penguin", emoji: "🐧", bgClass: "bg-sky-100 dark:bg-sky-950" },
  { key: "tiger", emoji: "🐯", bgClass: "bg-yellow-100 dark:bg-yellow-950" },
  { key: "dog", emoji: "🐶", bgClass: "bg-lime-100 dark:bg-lime-950" },
  { key: "lion", emoji: "🦁", bgClass: "bg-red-100 dark:bg-red-950" },
  { key: "koala", emoji: "🐨", bgClass: "bg-gray-100 dark:bg-gray-800" },
  { key: "cow", emoji: "🐮", bgClass: "bg-stone-100 dark:bg-stone-800" },
  { key: "pig", emoji: "🐷", bgClass: "bg-fuchsia-100 dark:bg-fuchsia-950" },
  { key: "frog", emoji: "🐸", bgClass: "bg-green-100 dark:bg-green-950" },
  { key: "monkey", emoji: "🐵", bgClass: "bg-amber-100 dark:bg-amber-900" },
  { key: "unicorn", emoji: "🦄", bgClass: "bg-violet-100 dark:bg-violet-950" },
  { key: "wolf", emoji: "🐺", bgClass: "bg-zinc-100 dark:bg-zinc-800" },
  { key: "raccoon", emoji: "🦝", bgClass: "bg-neutral-100 dark:bg-neutral-800" },
  { key: "hamster", emoji: "🐹", bgClass: "bg-orange-100 dark:bg-orange-900" },
  { key: "hedgehog", emoji: "🦔", bgClass: "bg-teal-100 dark:bg-teal-950" },
  { key: "chicken", emoji: "🐔", bgClass: "bg-yellow-100 dark:bg-yellow-900" },
  { key: "duck", emoji: "🦆", bgClass: "bg-cyan-100 dark:bg-cyan-950" },
  { key: "butterfly", emoji: "🦋", bgClass: "bg-purple-100 dark:bg-purple-950" },
  { key: "turtle", emoji: "🐢", bgClass: "bg-emerald-100 dark:bg-emerald-950" },
] as const;

export type AvatarKey = (typeof AVATAR_PRESETS)[number]["key"];

export const AVATAR_KEYS = AVATAR_PRESETS.map((preset) => preset.key) as [
  AvatarKey,
  ...AvatarKey[],
];

export function getAvatarPreset(key: string) {
  return AVATAR_PRESETS.find((preset) => preset.key === key) ?? AVATAR_PRESETS[0];
}
