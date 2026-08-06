import { Action, Room } from "@signe/room";
import type {
  RpgProvider,
  RpgProviders,
  RpgRoomDescriptor,
  RpgRoomPathParam,
  RpgRoomTarget,
} from "@rpgjs/common";

const RPG_ROOM_METADATA = Symbol.for("@rpgjs/server/room-metadata");
const SERVER_ROOMS_PROVIDER_META = "rpgjs:server-rooms";

/** Constructor for an RPGJS gameplay room. */
export type RpgRoomClass<T = unknown> = new (room: unknown) => T;

/** Options understood by the RPGJS-owned room decorator. */
export interface RpgRoomOptions<TState = unknown> {
  /** Stable kind used by server transfers and client scene selection. */
  kind: string;
  /** Signe room path. Placeholders are resolved by `changeRoom()`. */
  path: string;
  /** Persist synchronized room state across room hibernation or restart. */
  persistState?: boolean;
  /** Create the initial synchronized state for a gameplay room instance. */
  initialState?: () => TState;
}

/** Read-only registration metadata attached by {@link RpgRoom}. */
export type RpgRoomMetadata<TState = unknown> = Readonly<RpgRoomOptions<TState>>;

/**
 * Declare a server room through the stable RPGJS API.
 *
 * The decorator keeps Signe metadata internal while exposing the room kind to
 * RPGJS registration, session transfer, diagnostics, and client scene routing.
 * It works in standalone and MMORPG runtimes.
 *
 * @example
 * ```ts
 * @RpgRoom({
 *   kind: "battle",
 *   path: "battle-{id}",
 *   initialState: () => ({ turn: 1 }),
 * })
 * class BattleRoom extends RpgGameplayRoom<{ turn: number }> {}
 * ```
 */
export function RpgRoom<TState = unknown>(options: RpgRoomOptions<TState>): ClassDecorator {
  validateRoomOptions(options);
  const signeDecorator = Room({
    path: options.path,
    persistState: options.persistState,
  });

  return (target) => {
    Object.defineProperty(target, RPG_ROOM_METADATA, {
      configurable: false,
      enumerable: false,
      value: Object.freeze({ ...options }),
      writable: false,
    });
    signeDecorator(target);
  };
}

/**
 * Register a server-authoritative action on an RPGJS gameplay room.
 *
 * @param name - Packet action name sent by the client.
 * @returns A method decorator backed internally by Signe rooms.
 */
export function RpgRoomAction(name: string): MethodDecorator {
  if (!name.trim()) {
    throw new Error("RpgRoomAction requires a non-empty action name");
  }
  return Action(name) as MethodDecorator;
}

/** Add custom gameplay-room classes to an RPGJS server bootstrap. */
export function provideServerRooms(rooms: RpgRoomClass[]): RpgProvider {
  const token = class RpgServerRoomsProvider {};
  return {
    provide: token,
    useValue: [...rooms],
    meta: { kind: SERVER_ROOMS_PROVIDER_META },
  };
}

export function getRpgRoomMetadata(roomClass: RpgRoomClass): RpgRoomMetadata | undefined {
  return (roomClass as unknown as Record<PropertyKey, unknown>)[RPG_ROOM_METADATA] as
    | RpgRoomMetadata
    | undefined;
}

export function collectProvidedServerRooms(providers: RpgProviders): RpgRoomClass[] {
  const rooms: RpgRoomClass[] = [];
  const visit = (entries: RpgProviders): void => {
    for (const entry of entries) {
      if (Array.isArray(entry)) {
        visit(entry);
        continue;
      }
      if (
        typeof entry === "object"
        && entry !== null
        && entry.meta?.kind === SERVER_ROOMS_PROVIDER_META
        && "useValue" in entry
        && Array.isArray(entry.useValue)
      ) {
        rooms.push(...entry.useValue as RpgRoomClass[]);
      }
    }
  };
  visit(providers);
  return rooms;
}

/** Runtime registry shared by room diagnostics and player transfers. */
export class RpgRoomRegistry {
  private readonly definitions = new Map<string, { roomClass: RpgRoomClass; metadata: RpgRoomMetadata }>();
  private readonly paths = new Set<string>();

  constructor(roomClasses: RpgRoomClass[]) {
    for (const roomClass of roomClasses) {
      const metadata = getRpgRoomMetadata(roomClass);
      if (!metadata) {
        throw new Error(`${roomClass.name || "AnonymousRoom"} must use @RpgRoom()`);
      }
      if (this.definitions.has(metadata.kind)) {
        throw new Error(`Duplicate RPGJS room kind: ${metadata.kind}`);
      }
      const canonicalPath = metadata.path.replace(/\{[^}]+\}/g, "{}");
      if (this.paths.has(canonicalPath)) {
        throw new Error(`Duplicate RPGJS room path: ${metadata.path}`);
      }
      this.definitions.set(metadata.kind, { roomClass, metadata });
      this.paths.add(canonicalPath);
    }
  }

  get roomClasses(): RpgRoomClass[] {
    return [...this.definitions.values()].map(({ roomClass }) => roomClass);
  }

  getMetadata(kind: string): RpgRoomMetadata | undefined {
    return this.definitions.get(kind)?.metadata;
  }

  describe(target: RpgRoomTarget): RpgRoomDescriptor {
    const definition = this.definitions.get(target.kind);
    if (!definition) {
      throw new Error(`Unknown RPGJS room kind: ${target.kind}`);
    }
    const params = target.params ?? {};
    const placeholders = [...definition.metadata.path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
    const expected = new Set(placeholders);
    const extras = Object.keys(params).filter((key) => !expected.has(key));
    if (extras.length > 0) {
      throw new Error(`Unexpected parameters for room kind ${target.kind}: ${extras.join(", ")}`);
    }

    let id = definition.metadata.path;
    for (const placeholder of placeholders) {
      const value = params[placeholder];
      id = id.replace(`{${placeholder}}`, normalizePathParam(target.kind, placeholder, value));
    }

    return {
      id,
      kind: target.kind,
      name: params.id === undefined ? id : String(params.id),
    };
  }

  describeId(id: string): RpgRoomDescriptor | undefined {
    for (const { metadata } of this.definitions.values()) {
      const names: string[] = [];
      const escaped = metadata.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = escaped.replace(/\\\{([^}]+)\\\}/g, (_match, name: string) => {
        names.push(name);
        return "([^/]+)";
      });
      const match = new RegExp(`^${pattern}$`).exec(id);
      if (!match) continue;
      const params = Object.fromEntries(names.map((name, index) => [name, match[index + 1]]));
      return { id, kind: metadata.kind, name: params.id ?? id };
    }
    return undefined;
  }
}

function validateRoomOptions(options: RpgRoomOptions): void {
  if (!options.kind.trim()) throw new Error("RpgRoom requires a non-empty kind");
  if (!/^[a-z][a-z0-9-]*$/.test(options.kind)) {
    throw new Error(`Invalid RPGJS room kind: ${options.kind}`);
  }
  if (!options.path.trim()) throw new Error("RpgRoom requires a non-empty path");
  if (options.path.startsWith("/") || options.path.endsWith("/") || /[?#]/.test(options.path)) {
    throw new Error(`Invalid RPGJS room path: ${options.path}`);
  }
  const withoutPlaceholders = options.path.replace(/\{[A-Za-z_][A-Za-z0-9_]*\}/g, "");
  if (/[{}]/.test(withoutPlaceholders)) {
    throw new Error(`Invalid RPGJS room path placeholders: ${options.path}`);
  }
}

function normalizePathParam(kind: string, name: string, value: RpgRoomPathParam | undefined): string {
  if (value === undefined || value === null || String(value).length === 0) {
    throw new Error(`Missing parameter ${name} for room kind ${kind}`);
  }
  const normalized = String(value);
  if (/[/?#]/.test(normalized)) {
    throw new Error(`Invalid parameter ${name} for room kind ${kind}`);
  }
  return normalized;
}
