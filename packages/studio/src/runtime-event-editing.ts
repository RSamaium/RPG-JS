/** What a map editor needs of the map the game runs, to change its events without loading it again. */
export interface StudioRuntimeEventMap {
  scale?: number;
  events(): Record<string, { sourceEventId?: unknown; teleport?(position: { x: number; y: number }): unknown }>;
  getEvent(id: string): { teleport?(position: { x: number; y: number }): unknown } | undefined;
  createDynamicEvent(placement: { id: string; x: number; y: number; event: unknown }): Promise<string | undefined>;
  removeEvent(id: string): unknown;
}

export interface StudioRuntimeEventRecord {
  readonly _id: string;
  readonly [key: string]: unknown;
}

/**
 * What a map editor can do to the events the game runs: put one of the project on the map, move one, take one off. An event is put
 * as the map load puts them (its media are resolved, its workflows and its hitbox are those of the project), so it acts at once: an
 * enemy attacks, a character with a workflow answers. Positions are those the map stores (the game scales them by the map scale).
 */
export function createStudioRuntimeEventEditing(
  map: StudioRuntimeEventMap,
  hydrate: (events: any[]) => Promise<any[]>
) {
  const scale = (): number => (typeof map.scale === "number" && map.scale > 0 ? map.scale : 1);
  return {
    /** Puts an event of the project at `x, y` (with the `scale` and the `hitbox` this map gives it, if any). Gives its runtime id, or `undefined` when there is already one by that id. */
    async placeStudioEvent(record: StudioRuntimeEventRecord, placement: { x: number; y: number; runtimeId: string; scale?: number; hitbox?: { width: number; height: number } }): Promise<string | undefined> {
      const [event] = await hydrate([
        { ...record, eventId: record._id, id: record._id, sourceEventId: record._id, runtimeEventId: placement.runtimeId, x: placement.x, y: placement.y, ...(placement.scale ? { scale: placement.scale } : {}), ...(placement.hitbox ? { hitbox: placement.hitbox } : {}) },
      ]);
      return map.createDynamicEvent({ id: placement.runtimeId, x: placement.x, y: placement.y, event });
    },
    /** Moves an event the game runs to `x, y` (as the map stores positions). */
    async moveStudioEvent(runtimeId: string, x: number, y: number): Promise<boolean> {
      const event = map.getEvent(runtimeId);
      if (!event?.teleport) return false;
      await event.teleport({ x: x * scale(), y: y * scale() });
      return true;
    },
    /** Takes an event off the map. */
    removeStudioEvent(runtimeId: string): boolean {
      if (!map.getEvent(runtimeId)) return false;
      map.removeEvent(runtimeId);
      return true;
    },
    /** The events the game runs, with the event of the project each one is. */
    listStudioEvents(): Array<{ runtimeId: string; sourceEventId: string }> {
      return Object.entries(map.events()).map(([runtimeId, event]) => ({ runtimeId, sourceEventId: typeof event?.sourceEventId === "string" ? event.sourceEventId : "" }));
    },
  };
}

export type StudioRuntimeEventEditing = ReturnType<typeof createStudioRuntimeEventEditing>;
