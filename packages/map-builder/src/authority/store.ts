import type { MapDefinition } from "../model/definition";
import type { MapPatch } from "../model/patches";

/** The whole map at a revision. */
export interface MapStoreSnapshot {
  readonly definition: MapDefinition;
  readonly revision: number;
}

/** One change, as it was applied. */
export interface PatchEntry {
  readonly revision: number;
  readonly patches: readonly MapPatch[];
}

export interface StoredMap {
  readonly snapshot: MapStoreSnapshot;
  /** Changes made after the snapshot, in order. */
  readonly patches: readonly PatchEntry[];
}

/**
 * Where an authority keeps a map between restarts. A snapshot is written from time to
 * time; `append`, when the store offers it, records each change in between, so a restart
 * loses nothing even if the last snapshot is old.
 */
export interface MapStore {
  load(id: string): Promise<StoredMap | undefined>;
  /** Replaces the snapshot. Changes up to its revision are no longer needed. */
  save(id: string, snapshot: MapStoreSnapshot): Promise<void>;
  append?(id: string, entry: PatchEntry): Promise<void>;
}

export class MapStoreCorruptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MapStoreCorruptError";
  }
}

/** Keeps maps in memory. For tests, and for games that do not need to survive a restart. */
export function memoryMapStore(): MapStore & { readonly maps: ReadonlyMap<string, StoredMap> } {
  const maps = new Map<string, { snapshot: MapStoreSnapshot; patches: PatchEntry[] }>();
  const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
  return {
    maps,
    async load(id) {
      const stored = maps.get(id);
      return stored ? copy(stored) : undefined;
    },
    async save(id, snapshot) {
      const previous = maps.get(id);
      maps.set(id, {
        snapshot: copy(snapshot),
        patches: (previous?.patches ?? []).filter((entry) => entry.revision > snapshot.revision),
      });
    },
    async append(id, entry) {
      const stored = maps.get(id);
      if (!stored) throw new Error(`Cannot append to "${id}": it has no snapshot yet`);
      stored.patches.push(copy(entry));
    },
  };
}
