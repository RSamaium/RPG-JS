const idOf = (value: any): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (!value || typeof value !== "object") return "";
  return idOf(value._id ?? value.id ?? value.eventId);
};

const sourceIdOf = (entry: any) =>
  idOf(
    entry?.sourceEventId ??
      entry?.eventId ??
      entry?.id ??
      entry?._id
  );

/**
 * Give repeated Studio placements deterministic runtime ids.
 *
 * Studio stores a definition id on every placement. RPGJS maps require each
 * runtime event to have a unique id, so the first occurrence keeps the legacy
 * id while following occurrences receive `::2`, `::3`, and so on.
 */
export const assignStudioEventPlacementIds = (events: any[]): any[] => {
  const counts = new Map<string, number>();
  const reserved = new Set(
    events.map(sourceIdOf).filter((id) => id.length > 0)
  );
  const assigned = new Set<string>();

  return events.map((entry) => {
    if (!entry || typeof entry !== "object") return entry;
    const sourceEventId = sourceIdOf(entry);
    if (!sourceEventId) return entry;
    const occurrence = (counts.get(sourceEventId) ?? 0) + 1;
    counts.set(sourceEventId, occurrence);
    let runtimeEventId = sourceEventId;
    if (occurrence > 1) {
      let suffix = occurrence;
      runtimeEventId = `${sourceEventId}::${suffix}`;
      while (reserved.has(runtimeEventId) || assigned.has(runtimeEventId)) {
        suffix += 1;
        runtimeEventId = `${sourceEventId}::${suffix}`;
      }
    }
    assigned.add(runtimeEventId);
    return {
      ...entry,
      sourceEventId,
      runtimeEventId,
    };
  });
};
