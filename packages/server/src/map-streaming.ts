import {
  MAP_STREAM_EVENT,
  defineModule,
  getMapChunkCoordinates,
  getMapChunkKey,
  getMapInterestKeys,
  type MapStreamDefinition,
  type MapStreamPacket,
} from "@rpgjs/common";
import type { RpgServer } from "./RpgServer";
import type { RpgPlayer } from "./Player/Player";
import type { RpgMap } from "./rooms/map";

export interface ServerMapStreamingOptions {
  /** Chunks sent around the authoritative player position. Defaults to 2. */
  loadRadius?: number;
  /** Chunks retained client-side to avoid churn at grid boundaries. Defaults to 3. */
  retainRadius?: number;
  /**
   * Which events of the map are simulated (routes, movements, physics).
   *
   * - `'interest'` (default): only the events in a chunk retained by at least one player. The others are paused where
   *   they are, keep their state, and go on when a player comes near. The server cost then grows with what players
   *   can see, not with the size of the map.
   * - `'always'`: every event, wherever the players are.
   *
   * An event with `alwaysSimulated = true` is simulated in both modes.
   */
  eventSimulation?: "interest" | "always";
}

/** Fixed steps between two checks of the events to pause or to resume (10 times per second at 60 Hz). */
const EVENT_SIMULATION_CHECK_STEPS = 6;
/** Fixed steps between two checks of the paused events when the retained chunks did not change (once per second). */
const PAUSED_EVENT_CHECK_STEPS = 60;

/** Adapter that compiles a private source map into serializable public chunks. */
export interface ServerMapStreamingAdapter<TMapData = unknown, TManifestData = unknown, TChunkData = unknown> {
  /** Compile private authoritative map data into client-safe public chunks. */
  compile(
    mapData: TMapData,
    map: RpgMap,
  ): MapStreamDefinition<TManifestData, TChunkData> | undefined | Promise<MapStreamDefinition<TManifestData, TChunkData> | undefined>;
}

type PlayerInterest = {
  centerKey?: string;
  retained: Set<string>;
  projectiles: Set<string>;
  /** Revision of the flying projectiles that this player was last compared with */
  projectileRevision?: number;
};

export type MapStreamingVisibleEntityIds = {
  players: Set<string>;
  events: Set<string>;
};

type NetworkProjectile = ReturnType<NonNullable<RpgMap["projectiles"]>["getActiveNetworkProjectiles"]>[number];

/** A flying projectile and the key of the chunk it is in, by projectile id. */
type FlyingProjectiles = Map<string, { projectile: NetworkProjectile; chunkKey: string }>;

type MapStreamingEntityIndex = {
  players: Map<string, string[]>;
  events: Map<string, string[]>;
};

class ServerMapStreamingRuntime {
  private readonly players = new Map<string, PlayerInterest>();
  private readonly loadRadius: number;
  private readonly retainRadius: number;
  private readonly eventSimulation: "interest" | "always";
  /** Chunks (`row * columns + column`) retained by at least one player; rebuilt when `interestChanged` */
  private readonly retainedByAnyPlayer = new Set<number>();
  private interestChanged = true;
  private stepsBeforeEventCheck = 0;
  private stepsBeforePausedCheck = 0;
  private entityIndex?: MapStreamingEntityIndex;
  /** Index of the flying projectiles of the refresh in progress, shared by every player */
  private flyingProjectiles?: FlyingProjectiles;
  private refreshing = false;
  /** Chunk key of each flying projectile at the last revision, and the number of that revision */
  private readonly flyingChunkKeys = new Map<string, string>();
  private flyingRevision = 0;
  /** Chunk keys of the origins of a spawn packet, by its array of projectiles */
  private readonly spawnChunkKeys = new WeakMap<object, string[]>();
  /** Events paused because no player retains their chunk */
  private pausedEvents = new Set<string>();

  constructor(
    private readonly map: RpgMap,
    readonly definition: MapStreamDefinition,
    options: ServerMapStreamingOptions,
  ) {
    this.loadRadius = Math.max(0, Math.floor(options.loadRadius ?? 2));
    this.retainRadius = Math.max(this.loadRadius, Math.floor(options.retainRadius ?? 3));
    this.eventSimulation = options.eventSimulation ?? "interest";
  }

  sendInitial(player: RpgPlayer): void {
    // A browser reload can reuse the same public player id while its local
    // renderer/physics state is empty. Never reuse the previous connection's
    // retained chunks or projectile visibility for an initial delivery.
    this.players.delete(player.id);
    this.interestChanged = true;
    this.sendForPosition(player, true);
  }

  refreshPlayers(): void {
    this.flyingProjectiles = this.indexFlyingProjectiles();
    this.trackFlyingChanges(this.flyingProjectiles);
    this.refreshing = true;
    try {
      for (const player of this.map.getPlayers()) {
        this.sendForPosition(player, false);
      }
    } finally {
      this.refreshing = false;
      this.flyingProjectiles = undefined;
    }
    this.updateEventSimulation();
  }

  removePlayer(player: RpgPlayer): void {
    this.players.delete(player.id);
    this.interestChanged = true;
  }

  /** Resume every event this runtime paused. Called when the runtime is replaced or removed. */
  dispose(): void {
    for (const id of this.pausedEvents) {
      this.map.moveManager.resume(id);
    }
    this.pausedEvents.clear();
  }

  /**
   * Pause the events that no player can see, resume those a player comes near.
   *
   * A paused event does not move. The events that are simulated are checked a few times per second (one walks out of
   * the retained area, or is created). The paused ones are checked when the retained chunks change, and once per
   * second in case a script moved one.
   */
  private updateEventSimulation(): void {
    if (this.eventSimulation !== "interest") return;
    this.stepsBeforeEventCheck -= 1;
    this.stepsBeforePausedCheck -= 1;
    if (!this.interestChanged && this.stepsBeforeEventCheck > 0) return;
    this.stepsBeforeEventCheck = EVENT_SIMULATION_CHECK_STEPS;

    const { chunkWidth, chunkHeight, columns, rows } = this.definition.manifest;
    const retained = this.retainedByAnyPlayer;
    const checkPaused = this.interestChanged || this.stepsBeforePausedCheck <= 0;
    if (checkPaused) this.stepsBeforePausedCheck = PAUSED_EVENT_CHECK_STEPS;
    if (this.interestChanged) {
      this.interestChanged = false;
      retained.clear();
      for (const state of this.players.values()) {
        for (const key of state.retained) {
          const chunk = this.definition.chunks[key];
          if (chunk) retained.add(chunk.y * columns + chunk.x);
        }
      }
    }

    const moveManager = this.map.moveManager;
    const previous = this.pausedEvents;
    const paused = new Set<string>();
    for (const event of this.map.getEvents()) {
      const id = event?.id;
      if (!id) continue;
      const wasPaused = previous.has(id);
      if (wasPaused && !checkPaused) {
        paused.add(id);
        continue;
      }
      if (event.alwaysSimulated) continue;
      // Same cell as `getMapChunkCoordinates()`, without an object and a string per event
      const column = Math.max(0, Math.min(columns - 1, Math.floor(event.x() / chunkWidth)));
      const row = Math.max(0, Math.min(rows - 1, Math.floor(event.y() / chunkHeight)));
      if (retained.has(row * columns + column)) continue;
      paused.add(id);
      // The body is created again when the physics of the map is reset: put it back to sleep
      if (!wasPaused || this.map.physic.getEntityByUUID(id)?.isSleeping() === false) {
        moveManager.pause(id);
      }
    }
    for (const id of previous) {
      if (!paused.has(id)) moveManager.resume(id);
    }
    this.pausedEvents = paused;
  }

  isPositionVisible(player: RpgPlayer, x: number, y: number): boolean {
    const manifest = this.definition.manifest;
    const target = getMapChunkCoordinates(x, y, manifest);
    const targetKey = `${target.x}:${target.y}`;
    const state = this.players.get(player.id);
    if (state) return state.retained.has(targetKey);
    const center = getMapChunkCoordinates(player.x(), player.y(), manifest);
    return getMapInterestKeys(center, this.loadRadius, manifest).has(targetKey);
  }

  /**
   * Ids of the players and of the events of the map, by chunk key.
   *
   * The positions are the same for every client of one sync broadcast: the index is built for the first client and
   * read by the others, then dropped at the end of the task so that the next broadcast reads the new positions.
   */
  private getEntityIndex(): MapStreamingEntityIndex {
    if (this.entityIndex) return this.entityIndex;
    const { chunkWidth, chunkHeight, columns, rows } = this.definition.manifest;
    const index: MapStreamingEntityIndex = { players: new Map(), events: new Map() };
    const add = (into: Map<string, string[]>, objects: Record<string, { x(): number; y(): number } | undefined>) => {
      for (const id of Object.keys(objects)) {
        const object = objects[id];
        if (!object) continue;
        // Same cell as `getMapChunkCoordinates()`, without an object per entity
        const column = Math.max(0, Math.min(columns - 1, Math.floor(object.x() / chunkWidth)));
        const row = Math.max(0, Math.min(rows - 1, Math.floor(object.y() / chunkHeight)));
        const key = getMapChunkKey(column, row);
        const ids = into.get(key);
        if (ids) ids.push(id);
        else into.set(key, [id]);
      }
    };
    add(index.players, this.map.players());
    add(index.events, this.map.events());
    this.entityIndex = index;
    queueMicrotask(() => {
      this.entityIndex = undefined;
    });
    return index;
  }

  getVisibleEntityIds(player: RpgPlayer): MapStreamingVisibleEntityIds {
    const players = new Set<string>([player.id]);
    const events = new Set<string>();
    // Before the first chunks are sent, the player sees its load window, like `isPositionVisible()`
    const retained = this.players.get(player.id)?.retained
      ?? getMapInterestKeys(
        getMapChunkCoordinates(player.x(), player.y(), this.definition.manifest),
        this.loadRadius,
        this.definition.manifest,
      );
    if (retained.size === 0) return { players, events };

    const index = this.getEntityIndex();
    for (const key of retained) {
      const playerIds = index.players.get(key);
      if (playerIds) for (const id of playerIds) players.add(id);
      const eventIds = index.events.get(key);
      if (eventIds) for (const id of eventIds) events.add(id);
    }
    return { players, events };
  }

  filterProjectilePacket(player: RpgPlayer, packet: any): any {
    const state = this.players.get(player.id) ?? { retained: new Set<string>(), projectiles: new Set<string>() };
    this.players.set(player.id, state);
    const value = packet?.value;
    if (packet?.type === "projectile:spawnBatch") {
      const spawned: any[] = value?.projectiles ?? [];
      // The same packet is filtered for every client: the chunk of each origin is computed once
      let chunkKeys = this.spawnChunkKeys.get(spawned);
      if (!chunkKeys) {
        const manifest = this.definition.manifest;
        chunkKeys = spawned.map((projectile) => {
          const origin = projectile.origin;
          const chunk = getMapChunkCoordinates(origin?.x ?? 0, origin?.y ?? 0, manifest);
          return getMapChunkKey(chunk.x, chunk.y);
        });
        this.spawnChunkKeys.set(spawned, chunkKeys);
      }
      const keys = chunkKeys;
      const projectiles = spawned.filter((projectile: any, index: number) => {
        const visible = projectile.ownerId === player.id || state.retained.has(keys[index]!);
        if (visible) state.projectiles.add(projectile.id);
        return visible;
      });
      return projectiles.length > 0 ? { ...packet, value: { ...value, projectiles } } : null;
    }
    if (packet?.type === "projectile:impactBatch") {
      const impacts = (value?.impacts ?? []).filter((impact: any) => state.projectiles.has(impact.id));
      return impacts.length > 0 ? { ...packet, value: { ...value, impacts } } : null;
    }
    if (packet?.type === "projectile:destroyBatch") {
      const projectiles = (value?.projectiles ?? []).filter((projectile: any) => {
        const visible = state.projectiles.has(projectile.id);
        state.projectiles.delete(projectile.id);
        return visible;
      });
      return projectiles.length > 0 ? { ...packet, value: { ...value, projectiles } } : null;
    }
    if (packet?.type === "projectile:clear") {
      state.projectiles.clear();
    }
    return packet;
  }

  private sendForPosition(player: RpgPlayer, includeManifest: boolean): void {
    if (!player.conn) return;
    const manifest = this.definition.manifest;
    const center = getMapChunkCoordinates(player.x(), player.y(), manifest);
    const centerKey = `${center.x}:${center.y}`;
    const previous = this.players.get(player.id);

    if (!includeManifest && previous?.centerKey === centerKey) {
      this.sendEnteringProjectiles(player, previous, false);
      return;
    }

    const wanted = getMapInterestKeys(center, this.loadRadius, manifest);
    const retainedWindow = getMapInterestKeys(center, this.retainRadius, manifest);
    const retained = new Set(
      [...(previous?.retained ?? [])].filter((key) => retainedWindow.has(key)),
    );
    const chunks = [...wanted]
      .filter((key) => !retained.has(key))
      .map((key) => this.definition.chunks[key])
      .filter((chunk) => !!chunk);
    chunks.forEach((chunk) => retained.add(chunk.key));
    const removed = [...(previous?.retained ?? [])].filter((key) => !retained.has(key));

    const packet: MapStreamPacket = {
      mapId: manifest.mapId,
      revision: manifest.revision,
      manifest: includeManifest || !previous ? manifest : undefined,
      chunks,
      removed,
    };
    player.emit(MAP_STREAM_EVENT, packet);
    const projectiles = previous?.projectiles ?? new Set<string>();
    const state: PlayerInterest = { centerKey, retained, projectiles };
    this.players.set(player.id, state);
    this.interestChanged = true;
    this.sendEnteringProjectiles(player, state);
  }

  /**
   * Flying projectiles, with the chunk of their position at the current tick.
   *
   * The position of a projectile is the same for every player: it is computed once per refresh, and each player only
   * looks its chunk up in the chunks it retains.
   */
  private indexFlyingProjectiles(): FlyingProjectiles | undefined {
    const active = this.map.projectiles?.getActiveNetworkProjectiles?.() ?? [];
    if (active.length === 0) return undefined;
    const { chunkWidth, chunkHeight, columns, rows } = this.definition.manifest;
    const tick = this.map.getTick();
    const flying: FlyingProjectiles = new Map();
    for (const projectile of active) {
      const elapsed = Math.max(0, (tick - projectile.spawnTick) / 60 - projectile.delay);
      const x = projectile.origin.x + projectile.direction.x * projectile.speed * elapsed;
      const y = projectile.origin.y + projectile.direction.y * projectile.speed * elapsed;
      // Same cell as `getMapChunkCoordinates()`, without an object per projectile
      const column = Math.max(0, Math.min(columns - 1, Math.floor(x / chunkWidth)));
      const row = Math.max(0, Math.min(rows - 1, Math.floor(y / chunkHeight)));
      flying.set(projectile.id, { projectile, chunkKey: getMapChunkKey(column, row) });
    }
    return flying;
  }

  /**
   * Count a new revision when a projectile appeared, ended or moved to another chunk since the previous refresh.
   * Between two revisions, a player whose retained chunks did not change sees the same projectiles.
   */
  private trackFlyingChanges(flying: FlyingProjectiles | undefined): void {
    const previous = this.flyingChunkKeys;
    let changed = (flying?.size ?? 0) !== previous.size;
    if (!changed && flying) {
      for (const [id, entry] of flying) {
        if (previous.get(id) !== entry.chunkKey) {
          changed = true;
          break;
        }
      }
    }
    if (!changed) return;
    this.flyingRevision += 1;
    previous.clear();
    if (flying) {
      for (const [id, entry] of flying) previous.set(id, entry.chunkKey);
    }
  }

  private sendEnteringProjectiles(player: RpgPlayer, state: PlayerInterest, retainedChanged = true): void {
    const visibleIds = state.projectiles;
    // During a refresh the index is shared by every player; `sendInitial()` builds its own
    const flying = this.refreshing ? this.flyingProjectiles : this.indexFlyingProjectiles();
    if (this.refreshing) {
      // Same projectiles in the same chunks, and same retained chunks: nothing enters or leaves
      if (!retainedChanged && state.projectileRevision === this.flyingRevision) return;
      state.projectileRevision = this.flyingRevision;
    }
    if (!flying) return;
    const retained = state.retained;

    let leaving: string[] | undefined;
    for (const id of visibleIds) {
      const entry = flying.get(id);
      // An ended projectile is removed from the set by its destroy packet
      if (!entry || entry.projectile.ownerId === player.id || retained.has(entry.chunkKey)) continue;
      (leaving ??= []).push(id);
    }
    if (leaving) {
      for (const id of leaving) visibleIds.delete(id);
      player.emit("projectile:destroyBatch", {
        mapId: this.map.id,
        projectiles: leaving.map((id) => ({ id, reason: "interest" })),
      });
    }

    let entering: NetworkProjectile[] | undefined;
    for (const [id, entry] of flying) {
      if (visibleIds.has(id)) continue;
      if (entry.projectile.ownerId !== player.id && !retained.has(entry.chunkKey)) continue;
      visibleIds.add(id);
      (entering ??= []).push(entry.projectile);
    }
    if (!entering) return;
    player.emit("projectile:spawnBatch", {
      mapId: this.map.id,
      projectiles: entering,
    });
  }
}

// The server package has independent root, Node and Cloudflare bundle entries.
// A module-local WeakMap would therefore be duplicated when a provider imports
// a different entry from the map room. Keep the runtime on the shared map
// instance so every bundle entry observes the same state.
const MAP_STREAMING_RUNTIME = Symbol.for("@rpgjs/server/map-streaming-runtime");

function getRuntime(map: RpgMap): ServerMapStreamingRuntime | undefined {
  return (map as any)[MAP_STREAMING_RUNTIME];
}

function setRuntime(map: RpgMap, runtime: ServerMapStreamingRuntime): void {
  Object.defineProperty(map, MAP_STREAMING_RUNTIME, {
    configurable: true,
    writable: true,
    value: runtime,
  });
}

export function installMapStreaming(
  map: RpgMap,
  definition: MapStreamDefinition,
  options: ServerMapStreamingOptions = {},
): void {
  getRuntime(map)?.dispose();
  const runtime = new ServerMapStreamingRuntime(map, definition, options);
  setRuntime(map, runtime);
  map.getPlayers().forEach((player) => runtime.sendInitial(player));
}

export function clearMapStreaming(map: RpgMap): void {
  getRuntime(map)?.dispose();
  delete (map as any)[MAP_STREAMING_RUNTIME];
}

export function refreshMapStreaming(map: RpgMap): void {
  getRuntime(map)?.refreshPlayers();
}

export function removeMapStreamingPlayer(map: RpgMap, player: RpgPlayer): void {
  getRuntime(map)?.removePlayer(player);
}

/** Send a fresh manifest and initial chunks after the room attaches a connection. */
export function sendInitialMapStreaming(map: RpgMap, player: RpgPlayer): void {
  getRuntime(map)?.sendInitial(player);
}

/** Compiled definition of this room instance, or `undefined` before compilation. */
export function getMapStreamingDefinition(map: RpgMap): MapStreamDefinition | undefined {
  return getRuntime(map)?.definition;
}

/** Whether this concrete room instance has compiled authoritative chunks. */
export function hasMapStreamingRuntime(map: RpgMap): boolean {
  return Boolean(getRuntime(map));
}

export function isMapStreamingPositionVisible(
  map: RpgMap,
  player: RpgPlayer,
  x: number,
  y: number,
): boolean {
  return getRuntime(map)?.isPositionVisible(player, x, y) ?? true;
}

/**
 * Ids of the players and of the events whose position is in a chunk retained by the player, or `undefined` when the
 * map is not streamed. The entities are indexed by chunk once per sync broadcast, not once per client.
 */
export function getMapStreamingVisibleEntityIds(
  map: RpgMap,
  player: RpgPlayer,
): MapStreamingVisibleEntityIds | undefined {
  return getRuntime(map)?.getVisibleEntityIds(player);
}

export function filterMapStreamingProjectilePacket(map: RpgMap, player: RpgPlayer, packet: any): any {
  const runtime = getRuntime(map);
  return runtime ? runtime.filterProjectilePacket(player, packet) : packet;
}

/**
 * Install a format adapter that streams map render and prediction data from the
 * authoritative room. It is transport-neutral and therefore behaves the same on
 * the Node.js room adapter and on a Cloudflare Durable Object.
 *
 * @param adapter - Server compiler for the installed map format.
 * @param options - Interest and retention radii expressed in chunks, and which events are simulated.
 * @returns A composable server module installed with `createServer()`.
 *
 * @example
 * ```ts
 * provideServerMapStreaming({
 *   compile(mapData) {
 *     return compileMyPrivateMap(mapData)
 *   },
 * }, { loadRadius: 2, retainRadius: 3 })
 *
 * // Keep simulating every event of the map, even far from the players
 * provideServerMapStreaming(adapter, { eventSimulation: 'always' })
 * ```
 */
export function provideServerMapStreaming<TMapData, TManifestData, TChunkData>(
  adapter: ServerMapStreamingAdapter<TMapData, TManifestData, TChunkData>,
  options: ServerMapStreamingOptions = {},
): RpgServer {
  return defineModule<RpgServer>({
    map: {
      async onBeforeUpdate(mapData, map) {
        const definition = await adapter.compile(mapData as TMapData, map);
        if (!definition) {
          clearMapStreaming(map);
          return;
        }
        installMapStreaming(map, definition, options);
      },
      onLeave(player, map) {
        removeMapStreamingPlayer(map, player);
      },
    },
  });
}
