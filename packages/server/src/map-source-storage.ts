// Runtime adapters can persist private map sources outside room KV storage.
// These hooks are internal; the default Node/legacy storage contract is unchanged.
interface MapSourceStorage {
  get(): Promise<unknown>;
  put(value: unknown): Promise<void>;
}
interface RoomStorage {
  storage: {
    get<T = unknown>(key: string): Promise<T | undefined>;
    put(key: string, value: unknown): Promise<void>;
  };
}
const adapters = new WeakMap<object, MapSourceStorage>();
export function setMapSourceStorage(room: object, adapter: MapSourceStorage): void {
  adapters.set(room, adapter);
}
export async function readMapSource(room: RoomStorage): Promise<unknown> {
  const adapter = adapters.get(room);
  return adapter ? adapter.get() : room.storage.get('$room:rpgjs-map-source');
}
export async function writeMapSource(room: RoomStorage, value: unknown): Promise<void> {
  const adapter = adapters.get(room);
  if (adapter) await adapter.put(value);
  else await room.storage.put('$room:rpgjs-map-source', value);
}
