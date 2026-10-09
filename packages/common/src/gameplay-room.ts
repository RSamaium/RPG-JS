/** Primitive value accepted when resolving a registered gameplay-room path. */
export type RpgRoomPathParam = string | number;

/** Server-authoritative destination used by {@link RpgPlayer.changeRoom}. */
export interface RpgRoomTarget {
  /** Registered room kind, for example `battle`. */
  kind: string;
  /** Values substituted into the room path placeholders. */
  params?: Record<string, RpgRoomPathParam>;
}

/** Serializable metadata identifying the active gameplay room. */
export interface RpgRoomDescriptor {
  /** Full low-level room id, for example `battle-encounter-42`. */
  id: string;
  /** Registered gameplay kind used to select the client scene. */
  kind: string;
  /** Human-readable room name, normally the `id` path parameter. */
  name: string;
}
