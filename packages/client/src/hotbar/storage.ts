import type { HotbarRef } from "./types";

const STORAGE_PREFIX = "rpgjs:hotbar:";

export function getHotbarStorageKey(storageKey: string): string {
  return `${STORAGE_PREFIX}${storageKey}`;
}

export function loadHotbarRefs(storageKey: string): Array<HotbarRef | null> | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(getHotbarStorageKey(storageKey));
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return null;
    return value.map((entry) => normalizeStoredRef(entry));
  } catch {
    return null;
  }
}

export function saveHotbarRefs(storageKey: string, refs: Array<HotbarRef | null>) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(getHotbarStorageKey(storageKey), JSON.stringify(refs));
  } catch {
    // Browsers can reject localStorage writes in private or restricted contexts.
  }
}

function normalizeStoredRef(value: any): HotbarRef | null {
  if (!value || typeof value !== "object") return null;
  if (typeof value.type !== "string" || typeof value.id !== "string") return null;
  return {
    type: value.type,
    id: value.id,
  };
}
