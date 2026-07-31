const getMediaRefKey = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const key =
    candidate.id ?? candidate._id ?? candidate.mediaId ?? candidate.fileName;
  return typeof key === "string" && key.trim().length > 0 ? key : null;
};

/**
 * Collect every Studio media reference that Action Battle can render without
 * waiting for a later database or media request.
 */
export const collectStudioActionBattleMediaRefs = (
  database: any[] = [],
): unknown[] => {
  const refs: unknown[] = [];
  const seen = new Set<string>();
  const add = (value: unknown) => {
    const key = getMediaRefKey(value);
    if (!key || seen.has(key)) return;
    seen.add(key);
    refs.push(value);
  };

  for (const entry of database) {
    const animations = entry?.animations ?? entry?.combatAnimations;
    if (animations && typeof animations === "object") {
      Object.values(animations).forEach(add);
    }

    add(entry?.animation);
    add(entry?.action?.projectile?.graphic);
    add(entry?.actionBattle?.projectile?.graphic);
  }

  return refs;
};
