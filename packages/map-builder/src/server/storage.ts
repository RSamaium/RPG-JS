import type { MapStore, PatchEntry, StoredMap } from "../authority/store";

/** The two calls of a key-value store: a Durable Object's storage, KV, a file. */
export interface KeyValueStorage {
  get(key: string): unknown | Promise<unknown>;
  put(key: string, value: unknown): unknown | Promise<unknown>;
}

/**
 * Keeps maps in any key-value storage: a snapshot under one key, the changes made since under
 * another. Values must be small enough for the storage (a Durable Object accepts 128 KiB per key
 * with the key-value API): for large maps, write snapshots often so the log stays short, or give
 * the authority a store of your own.
 */
export function keyValueMapStore(storage: KeyValueStorage, prefix = "$room:map-builder:"): MapStore {
  const snapshotKey = (id: string): string => `${prefix}${id}:snapshot`;
  const logKey = (id: string): string => `${prefix}${id}:log`;
  const readLog = async (id: string): Promise<PatchEntry[]> => ((await storage.get(logKey(id))) as PatchEntry[] | undefined) ?? [];

  return {
    async load(id): Promise<StoredMap | undefined> {
      const snapshot = (await storage.get(snapshotKey(id))) as StoredMap["snapshot"] | undefined;
      if (!snapshot) return undefined;
      return { snapshot, patches: (await readLog(id)).filter((entry) => entry.revision > snapshot.revision) };
    },
    async save(id, snapshot) {
      await storage.put(snapshotKey(id), snapshot);
      // What the snapshot covers is no longer needed.
      await storage.put(logKey(id), (await readLog(id)).filter((entry) => entry.revision > snapshot.revision));
    },
    async append(id, entry) {
      await storage.put(logKey(id), [...(await readLog(id)), entry]);
    },
  };
}

/** The storage of the room of a map, which survives a restart of the server. */
export function roomStorageMapStore(map: object): MapStore {
  // RPGJS rooms keep their storage in a field that is not part of the public types.
  const storage = (map as { partyRoom?: { storage?: KeyValueStorage } }).partyRoom?.storage;
  if (!storage) throw new Error("This map has no room storage: give the authority a store of its own (`persist`)");
  return keyValueMapStore(storage);
}
