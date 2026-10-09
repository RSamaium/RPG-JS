import {
  MAP_STREAM_EVENT,
  defineModule,
  getMapChunkCoordinates,
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
}

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
};

export type MapStreamingVisibleEntityIds = {
  players: Set<string>;
  events: Set<string>;
};

class ServerMapStreamingRuntime {
  private readonly players = new Map<string, PlayerInterest>();
  private readonly loadRadius: number;
  private readonly retainRadius: number;

  constructor(
    private readonly map: RpgMap,
    private readonly definition: MapStreamDefinition,
    options: ServerMapStreamingOptions,
  ) {
    this.loadRadius = Math.max(0, Math.floor(options.loadRadius ?? 2));
    this.retainRadius = Math.max(this.loadRadius, Math.floor(options.retainRadius ?? 3));
  }

  sendInitial(player: RpgPlayer): void {
    // A browser reload can reuse the same public player id while its local
    // renderer/physics state is empty. Never reuse the previous connection's
    // retained chunks or projectile visibility for an initial delivery.
    this.players.delete(player.id);
    this.sendForPosition(player, true);
  }

  refreshPlayers(): void {
    for (const player of this.map.getPlayers()) {
      this.sendForPosition(player, false);
    }
  }

  removePlayer(player: RpgPlayer): void {
    this.players.delete(player.id);
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

  getVisibleEntityIds(player: RpgPlayer): MapStreamingVisibleEntityIds {
    const players = new Set<string>([player.id]);
    const events = new Set<string>();
    const retained = this.players.get(player.id)?.retained;
    if (!retained || retained.size === 0) return { players, events };

    const visibleChunks = [...retained]
      .map((key) => this.definition.chunks[key])
      .filter((chunk) => !!chunk);
    if (visibleChunks.length === 0) return { players, events };

    const left = Math.min(...visibleChunks.map((chunk) => chunk.bounds.x));
    const top = Math.min(...visibleChunks.map((chunk) => chunk.bounds.y));
    const right = Math.max(...visibleChunks.map((chunk) => chunk.bounds.x + chunk.bounds.width));
    const bottom = Math.max(...visibleChunks.map((chunk) => chunk.bounds.y + chunk.bounds.height));
    const mapPlayers = this.map.players();
    const mapEvents = this.map.events();

    for (const entity of this.map.queryHitbox({
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    })) {
      const id = entity?.id;
      if (!id || !this.isPositionVisible(player, entity.x(), entity.y())) continue;
      if (mapPlayers[id]) players.add(id);
      else if (mapEvents[id]) events.add(id);
    }

    return { players, events };
  }

  filterProjectilePacket(player: RpgPlayer, packet: any): any {
    const state = this.players.get(player.id) ?? { retained: new Set<string>(), projectiles: new Set<string>() };
    this.players.set(player.id, state);
    const value = packet?.value;
    if (packet?.type === "projectile:spawnBatch") {
      const projectiles = (value?.projectiles ?? []).filter((projectile: any) => {
        const visible = projectile.ownerId === player.id
          || this.isPositionVisible(player, projectile.origin?.x ?? 0, projectile.origin?.y ?? 0);
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
      this.sendEnteringProjectiles(player, previous.projectiles);
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
    this.players.set(player.id, { centerKey, retained, projectiles });
    this.sendEnteringProjectiles(player, projectiles);
  }

  private sendEnteringProjectiles(player: RpgPlayer, visibleIds: Set<string>): void {
    const active = this.map.projectiles?.getActiveNetworkProjectiles?.() ?? [];
    const activeById = new Map(active.map((projectile) => [projectile.id, projectile]));
    const positionAtCurrentTick = (projectile: (typeof active)[number]) => {
      const elapsed = Math.max(0, (this.map.getTick() - projectile.spawnTick) / 60 - projectile.delay);
      return {
        x: projectile.origin.x + projectile.direction.x * projectile.speed * elapsed,
        y: projectile.origin.y + projectile.direction.y * projectile.speed * elapsed,
      };
    };
    const leaving = [...visibleIds].filter((id) => {
      const projectile = activeById.get(id);
      if (!projectile || projectile.ownerId === player.id) return false;
      const position = positionAtCurrentTick(projectile);
      return !this.isPositionVisible(player, position.x, position.y);
    });
    if (leaving.length > 0) {
      leaving.forEach((id) => visibleIds.delete(id));
      player.emit("projectile:destroyBatch", {
        mapId: this.map.id,
        projectiles: leaving.map((id) => ({ id, reason: "interest" })),
      });
    }
    const entering = active.filter((projectile) => {
      if (visibleIds.has(projectile.id)) return false;
      const position = positionAtCurrentTick(projectile);
      return projectile.ownerId === player.id || this.isPositionVisible(player, position.x, position.y);
    });
    if (entering.length === 0) return;
    entering.forEach((projectile) => visibleIds.add(projectile.id));
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
  const runtime = new ServerMapStreamingRuntime(map, definition, options);
  setRuntime(map, runtime);
  map.getPlayers().forEach((player) => runtime.sendInitial(player));
}

export function clearMapStreaming(map: RpgMap): void {
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

/** Resolve nearby synchronized entities through the map physics spatial index. */
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
 * @param options - Interest and retention radii expressed in chunks.
 * @returns A composable server module installed with `createServer()`.
 *
 * @example
 * ```ts
 * provideServerMapStreaming({
 *   compile(mapData) {
 *     return compileMyPrivateMap(mapData)
 *   },
 * }, { loadRadius: 2, retainRadius: 3 })
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
