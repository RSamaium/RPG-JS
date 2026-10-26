import { createModule, defineModule, type RpgProvider } from "@rpgjs/common";
import type { RpgMap, RpgPlayer, RpgServer } from "@rpgjs/server";
import {
  createMapAuthority,
  restoreMapAuthority,
  type AuthorityConnection,
  type MapAuthority,
  type MapAuthorityOptions,
  type PersistOptions,
} from "../authority/authority";
import type { MapStore } from "../authority/store";
import type { AssetResolver } from "../model/assets";
import type { MapDefinition, MapEvent } from "../model/definition";
import type { MapChange } from "../model/model";
import type { MapPatch } from "../model/patches";
import type { Catalog } from "../interaction/catalog";
import type { MapSource } from "../model/source";
import type { DescribeContext } from "../renderer/scene";
import {
  MAP_BUILDER_CHANNEL,
  changedElementIds,
  forgetHitboxes,
  syncElementHitboxes,
  unwrap,
  wrap,
  type StaticHitboxHost,
} from "../rpgjs/shared";

export { MAP_BUILDER_CHANNEL } from "../rpgjs/shared";
export { keyValueMapStore, roomStorageMapStore, type KeyValueStorage } from "./storage";

/** Where the modifiable maps come from, by the id of the RPGJS map. A map without a definition is left alone. */
export type MapBuilderMaps =
  | Readonly<Record<string, MapDefinition>>
  | ((mapId: string) => MapDefinition | undefined | Promise<MapDefinition | undefined>)
  | MapSource;

/** An RPGJS event made for a map event: hooks, hitbox, and what the game wants it to do. */
export interface MapBuilderEventDefinition {
  readonly hooks?: Record<string, unknown>;
  readonly hitbox?: { readonly width: number; readonly height: number };
}

export interface MapBuilderEventsOptions {
  /**
   * What an RPGJS event does for a map event: `onAction`, `onPlayerTouch`… By default it is
   * only drawn, with the `graphic` of the map event as its RPGJS graphic.
   */
  readonly define?: (event: MapEvent, map: RpgMap) => MapBuilderEventDefinition | undefined;
  /** Prefix of the ids of the RPGJS events, so they never meet the game's own. Defaults to `"builder:"`. */
  readonly idPrefix?: string;
}

export interface MapBuilderServerOptions<C extends Catalog<string> = Catalog<string>> {
  /** What the maps are made of. A server has no image to measure: assets must declare a `size` or a `frame`. */
  readonly assets: AssetResolver;
  readonly maps: MapBuilderMaps;
  /** Rules, catalog, who may send patches, who is the author of a change… */
  readonly authority?: Omit<MapAuthorityOptions<C>, "definition" | "revision" | "assets" | "persist" | "onChange" | "replay" | "onError">;
  /** Keep a map between restarts: `(map) => ({ store: roomStorageMapStore(map) })`. Off by default. */
  readonly persist?: (map: RpgMap) => Omit<PersistOptions, "id"> & { readonly id?: string } | MapStore | undefined;
  /** Who is acting, as the rules of the pipelines see them. Defaults to the player. */
  readonly actor?: (player: RpgPlayer) => unknown;
  /** Keep the static colliders of the physics world in step with the elements. Defaults to true. */
  readonly physics?: boolean;
  /** Turn the events of the map into RPGJS events. Defaults to on, drawn only; `false` leaves events alone. */
  readonly events?: false | MapBuilderEventsOptions;
  /** Called once the authority of a map exists: the place to hook a lever, a quest, a timer. */
  readonly onReady?: (authority: MapAuthority, map: RpgMap) => void;
  readonly onError?: (error: unknown) => void;
}

interface Entry {
  readonly ready: Promise<MapAuthority | undefined>;
  authority?: MapAuthority;
  /** By player id: the player object is not always the same instance from one hook to the other. */
  readonly connections: Map<string, AuthorityConnection>;
  /** RPGJS events this module created, so it can remove them. */
  readonly eventIds: Set<string>;
  /** Event changes are applied one after the other: creating an event is asynchronous. */
  queue: Promise<void>;
}

const entries = new WeakMap<object, Entry>();
/** The map each player is connected to. A player changing map does not always leave the old one through a hook. */
const connectedTo = new Map<string, { readonly map: object; readonly connection: AuthorityConnection }>();

/** The authority of a map, once it exists. For game code: `getMapAuthority(player.getCurrentMap())?.apply(…)`. */
export const getMapAuthority = (map: object | null | undefined): MapAuthority | undefined => (map ? entries.get(map)?.authority : undefined);

/** Resolves when the authority of a map exists, or to `undefined` for a map that is not modifiable. */
export const whenMapAuthority = (map: object | null | undefined): Promise<MapAuthority | undefined> =>
  (map ? entries.get(map)?.ready : undefined) ?? Promise.resolve(undefined);

const isSource = (maps: MapBuilderMaps): maps is MapSource => typeof maps === "object" && typeof (maps as MapSource).load === "function";

async function resolveDefinition(maps: MapBuilderMaps, mapId: string): Promise<MapDefinition | undefined> {
  if (typeof maps === "function") return maps(mapId);
  if (isSource(maps)) {
    try {
      return await maps.load(mapId);
    } catch (error) {
      if ((error as { code?: string }).code === "not-found") return undefined;
      throw error;
    }
  }
  return Object.hasOwn(maps, mapId) ? (maps as Record<string, MapDefinition>)[mapId] : undefined;
}

const isStore = (value: unknown): value is MapStore => typeof (value as MapStore | undefined)?.load === "function";

/** The module of the map builder for an RPGJS server. Install it with `provideMapBuilder`, or `provideServerModules`. */
export function createMapBuilderServer<C extends Catalog<string> = Catalog<string>>(options: MapBuilderServerOptions<C>): RpgServer {
  const reportError = options.onError ?? ((error: unknown) => console.error(error));
  const describeContext: DescribeContext = { assets: options.assets, ...(options.authority?.hooks ? { hooks: options.authority.hooks } : {}) };
  const eventsOptions = options.events === false ? undefined : (options.events ?? {});
  const prefix = eventsOptions?.idPrefix ?? "builder:";
  const physics = options.physics !== false;
  const bound = new WeakSet<object>();

  const hitboxHost = (map: RpgMap): StaticHitboxHost => map as unknown as StaticHitboxHost;

  /** Creates, moves and removes the RPGJS events of a map, in order. */
  const syncEvents = (map: RpgMap, entry: Entry, authority: MapAuthority, patches: readonly MapPatch[] | "all"): void => {
    if (!eventsOptions) return;
    const state = authority.model.state;
    entry.queue = entry.queue
      .then(async () => {
        const wanted = new Map(state.events.map((event) => [event.id, event]));
        const touched =
          patches === "all"
            ? new Set<string>([...entry.eventIds, ...wanted.keys()])
            : new Set(
                patches.flatMap((patch) =>
                  patch.type === "event.add" ? [patch.event.id] : patch.type === "event.remove" || patch.type === "event.move" ? [patch.id] : [],
                ),
              );
        for (const id of touched) {
          const event = wanted.get(id);
          const rpgId = `${prefix}${id}`;
          const existing = map.getEvent(rpgId) as unknown as { teleport?(position: { x: number; y: number }): unknown } | undefined;
          if (!event) {
            if (entry.eventIds.delete(id) || existing) map.removeEvent(rpgId);
          } else if (existing) {
            await existing.teleport?.({ x: event.x, y: event.y });
          } else {
            const defined = eventsOptions.define?.(event, map);
            const hooks = defined?.hooks ?? {};
            await map.createDynamicEvent({
              id: rpgId,
              x: event.x,
              y: event.y,
              ...(defined?.hitbox ? { hitbox: defined.hitbox } : {}),
              event: {
                ...hooks,
                name: event.kind,
                onInit(this: { setGraphic?(graphic: string): void }) {
                  (hooks.onInit as (() => void) | undefined)?.call(this);
                  if (event.graphic) this.setGraphic?.(event.graphic);
                },
              } as never,
            });
            entry.eventIds.add(id);
          }
        }
      })
      .catch(reportError);
  };

  const createEntry = (map: RpgMap): Entry => {
    const entry: Entry = {
      ready: Promise.resolve(undefined),
      connections: new Map(),
      eventIds: new Set(),
      queue: Promise.resolve(),
    };
    const ready = (async (): Promise<MapAuthority | undefined> => {
      const definition = await resolveDefinition(options.maps, map.id);
      if (!definition) return undefined;

      const persistChoice = options.persist?.(map);
      const persist: PersistOptions | undefined = persistChoice
        ? isStore(persistChoice)
          ? { store: persistChoice, id: map.id }
          : { ...persistChoice, id: persistChoice.id ?? map.id }
        : undefined;

      const authorityOptions = {
        ...options.authority,
        definition,
        assets: options.assets,
        ...(persist ? { persist } : {}),
        onError: reportError,
        onChange: (change: MapChange) => {
          if (physics) syncElementHitboxes(hitboxHost(map), authority.model.state, changedElementIds(change.patches), describeContext);
          syncEvents(map, entry, authority, change.patches);
        },
      } satisfies MapAuthorityOptions<C>;
      const authority: MapAuthority = persist
        ? await restoreMapAuthority({ ...authorityOptions, persist })
        : createMapAuthority(authorityOptions);

      entry.authority = authority;
      if (physics) syncElementHitboxes(hitboxHost(map), authority.model.state, "all", describeContext);
      syncEvents(map, entry, authority, "all");
      options.onReady?.(authority, map);
      return authority;
    })().catch((error) => {
      reportError(error);
      return undefined;
    });
    (entry as { ready: Promise<MapAuthority | undefined> }).ready = ready;
    return entry;
  };

  const entryOf = (map: RpgMap): Entry => {
    let entry = entries.get(map);
    if (!entry) {
      entry = createEntry(map);
      entries.set(map, entry);
    }
    return entry;
  };

  /** Routes what a player sends to the connection they have on the map they are on. */
  const bindPlayer = (player: RpgPlayer): void => {
    if (bound.has(player)) return;
    bound.add(player);
    player.on(MAP_BUILDER_CHANNEL, (raw: unknown) => {
      const envelope = unwrap(raw);
      const map = player.getCurrentMap() as RpgMap | null | undefined;
      if (!envelope || !map || envelope.map !== map.id) return;
      entries.get(map)?.connections.get(player.id)?.receive(envelope.message);
    });
  };

  /** Ends the connection of a player to a map (to whichever they are on, when none is given). */
  const disconnect = (player: RpgPlayer, only?: object): void => {
    const current = connectedTo.get(player.id);
    if (!current || (only && current.map !== only)) return;
    current.connection.disconnect();
    entries.get(current.map)?.connections.delete(player.id);
    connectedTo.delete(player.id);
  };

  return defineModule<RpgServer>({
    player: {
      onConnected: (player: RpgPlayer) => bindPlayer(player),
      onJoinMap: (player: RpgPlayer) => bindPlayer(player),
    },
    map: {
      async onLoad(map: RpgMap) {
        const authority = await entryOf(map).ready;
        if (!authority) return;
        // Runs again whenever the map is updated or restored, which wipes events and colliders: put them back.
        if (physics) syncElementHitboxes(hitboxHost(map), authority.model.state, "all", describeContext);
        syncEvents(map, entryOf(map), authority, "all");
      },
      onPhysicsInit(map: RpgMap) {
        forgetHitboxes(map); // the physics world was rebuilt: nothing we applied is there any more
        const authority = entries.get(map)?.authority;
        if (physics && authority) syncElementHitboxes(hitboxHost(map), authority.model.state, "all", describeContext);
      },
      async onJoin(player: RpgPlayer, map: RpgMap) {
        bindPlayer(player);
        const entry = entryOf(map);
        const authority = await entry.ready;
        if (!authority) return;
        // Whatever the player was connected to before, they are on this map now.
        disconnect(player);
        const id = map.id;
        const connection = authority.connect({
          id: player.id,
          actor: options.actor?.(player) ?? player,
          send: (message) => {
            // A player who moved on, or went away, is dropped the first time something is sent to them.
            if ((player.getCurrentMap() as unknown) !== map) return disconnect(player, map);
            player.emit(MAP_BUILDER_CHANNEL, wrap(id, message));
          },
        });
        entry.connections.set(player.id, connection);
        connectedTo.set(player.id, { map, connection });
      },
      onLeave(player: RpgPlayer, map: RpgMap) {
        disconnect(player, map);
        // RPGJS has no hook for a map that is unloaded: the last player leaving is the closest moment to save what is pending.
        const entry = entries.get(map);
        if (entry && entry.connections.size === 0) void entry.authority?.flush().catch(reportError);
      },
    },
  });
}

/**
 * Installs the map builder on an RPGJS server:
 *
 * ```ts
 * createServer({ providers: [provideMapBuilder({ assets, maps: { forest }, authority: { … } })] })
 * ```
 */
export function provideMapBuilder<C extends Catalog<string> = Catalog<string>>(options: MapBuilderServerOptions<C>): RpgProvider[] {
  return createModule("MapBuilder", [{ server: createMapBuilderServer(options) }]);
}
