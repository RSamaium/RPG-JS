import { signal } from "canvasengine";

/** Internal, deterministic browser-language negotiation; catalogue spelling is retained. */
export function resolveBrowserLocale(available: string[], fallback: string, languages: readonly string[]): string {
  for (const language of languages) {
    const normalized = language.toLowerCase();
    const exact = available.find(locale => locale.toLowerCase() === normalized);
    if (exact) return exact;
    const base = available.find(locale => locale.toLowerCase() === normalized.split("-")[0]);
    if (base) return base;
  }
  return fallback;
}

export function createLocalePreferences(available: string[], fallback: string, project: string,
  languages: readonly string[], storage?: Pick<Storage, "getItem" | "setItem" | "removeItem">) {
  const key = `rpgjs:locale:${project}`;
  let saved: string | null = null;
  try { saved = storage?.getItem(key) ?? null; } catch { /* Optional storage. */ }
  const preference = signal(available.includes(saved!) ? saved! : "auto");
  if (saved && preference() === "auto") {
    try { storage?.removeItem(key); } catch { /* Optional storage. */ }
  }
  return {
    preference,
    resolve: () => preference() === "auto" ? resolveBrowserLocale(available, fallback, languages) : preference(),
    select(value: string) {
      preference.set(available.includes(value) ? value : "auto");
      try {
        if (preference() === "auto") storage?.removeItem(key);
        else storage?.setItem(key, preference());
      } catch { /* Keep session preference in restricted browsers. */ }
    },
  };
}
