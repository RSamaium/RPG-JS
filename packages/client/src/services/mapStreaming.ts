import { Context, inject } from "@signe/di";
import {
  MAP_STREAM_EVENT,
  MAP_STREAM_REQUEST_EVENT,
  type MapChunkHitbox,
  type MapStreamChunk,
  type MapStreamManifest,
  type MapStreamPacket,
  type RpgContext,
  type RpgProvider,
} from "@rpgjs/common";
import { AbstractWebsocket, WebSocketToken } from "./AbstractSocket";
import { LoadMapToken, type MapData, type LoadMapOptions } from "./loadMap";
import { UpdateMapService, UpdateMapToken } from "@rpgjs/common";

export interface ClientMapStreamingAdapter<TManifestData = unknown, TChunkData = unknown, TState = unknown> {
  /** CanvasEngine component that renders the provider-specific state. */
  component: unknown;
  /** Create empty client render state from public manifest data. */
  createState(manifest: MapStreamManifest<TManifestData>): TState;
  /** Apply one disclosed render chunk to the state. */
  applyChunk(state: TState, chunk: MapStreamChunk<TChunkData>): void;
  /** Remove one chunk that left the retention window. */
  removeChunk(state: TState, key: string): void;
  /** Return the serializable/component-ready map value exposed to CanvasEngine. */
  getData(state: TState): unknown;
  /** Optionally derive component parameters from the public manifest. */
  getParams?(manifest: MapStreamManifest<TManifestData>): Record<string, unknown>;
}

export interface ClientMapStreamingOptions<TManifestData = unknown, TChunkData = unknown, TState = unknown> {
  /** Format adapter paired with the server compiler. */
  adapter: ClientMapStreamingAdapter<TManifestData, TChunkData, TState>;
  /** Optional direct loader used only by standalone RPG mode. */
  directLoad?: LoadMapOptions;
  /** Maximum wait for the initial authoritative manifest. Defaults to 10 seconds. */
  timeoutMs?: number;
}

type StreamingPhysicsMap = {
  data: { (): MapData | null; set(value: MapData): void };
  replaceStreamedStaticHitboxes(namespace: string, hitboxes: MapChunkHitbox[]): void;
  clearStreamedStaticHitboxes(namespace: string): void;
};

type Waiter = {
  resolve(controller: MapStreamClientController<any, any, any>): void;
  reject(error: Error): void;
  timer: ReturnType<typeof setTimeout>;
};

export class MapStreamClientController<TManifestData, TChunkData, TState> {
  private state: TState;
  private manifest: MapStreamManifest<TManifestData>;
  private readonly chunks = new Map<string, MapStreamChunk<TChunkData>>();
  private attachedMap?: StreamingPhysicsMap;

  constructor(
    private readonly adapter: ClientMapStreamingAdapter<TManifestData, TChunkData, TState>,
    manifest: MapStreamManifest<TManifestData>,
  ) {
    this.manifest = manifest;
    this.state = adapter.createState(manifest);
  }

  get revision(): string {
    return this.manifest.revision;
  }

  reset(manifest: MapStreamManifest<TManifestData>): void {
    const attachedMap = this.attachedMap;
    this.detach();
    this.manifest = manifest;
    this.state = this.adapter.createState(manifest);
    this.chunks.clear();
    this.attachedMap = attachedMap;
  }

  receive(packet: MapStreamPacket<TManifestData, TChunkData>): void {
    for (const key of packet.removed) {
      this.chunks.delete(key);
      this.adapter.removeChunk(this.state, key);
      this.attachedMap?.clearStreamedStaticHitboxes(key);
    }
    for (const chunk of packet.chunks) {
      this.chunks.set(chunk.key, chunk);
      this.adapter.applyChunk(this.state, chunk);
      this.attachedMap?.replaceStreamedStaticHitboxes(chunk.key, chunk.hitboxes);
    }
    this.publish();
  }

  toMapData(): MapData {
    return {
      id: this.manifest.mapId,
      width: this.manifest.width,
      height: this.manifest.height,
      data: this.adapter.getData(this.state),
      component: this.adapter.component,
      params: this.adapter.getParams?.(this.manifest),
      streamController: this,
    };
  }

  attach(map: StreamingPhysicsMap): void {
    this.attachedMap = map;
    for (const chunk of this.chunks.values()) {
      map.replaceStreamedStaticHitboxes(chunk.key, chunk.hitboxes);
    }
    this.updatePredictionBoundary();
  }

  detach(): void {
    if (!this.attachedMap) return;
    for (const key of this.chunks.keys()) {
      this.attachedMap.clearStreamedStaticHitboxes(key);
    }
    this.attachedMap.clearStreamedStaticHitboxes("__boundary__");
    this.attachedMap = undefined;
  }

  private publish(): void {
    if (!this.attachedMap) return;
    const current = this.attachedMap.data();
    if (current) {
      this.attachedMap.data.set({ ...current, data: this.adapter.getData(this.state) });
    }
    this.updatePredictionBoundary();
  }

  private updatePredictionBoundary(): void {
    const map = this.attachedMap;
    if (!map) return;
    if (this.chunks.size === 0) {
      map.clearStreamedStaticHitboxes("__boundary__");
      return;
    }
    const chunks = [...this.chunks.values()];
    const left = Math.min(...chunks.map((chunk) => chunk.bounds.x));
    const top = Math.min(...chunks.map((chunk) => chunk.bounds.y));
    const right = Math.max(...chunks.map((chunk) => chunk.bounds.x + chunk.bounds.width));
    const bottom = Math.max(...chunks.map((chunk) => chunk.bounds.y + chunk.bounds.height));
    const thickness = 2;
    const barriers: MapChunkHitbox[] = [];
    if (left > 0) barriers.push({ x: left - thickness, y: top, width: thickness, height: bottom - top });
    if (top > 0) barriers.push({ x: left, y: top - thickness, width: right - left, height: thickness });
    if (right < this.manifest.width) barriers.push({ x: right, y: top, width: thickness, height: bottom - top });
    if (bottom < this.manifest.height) barriers.push({ x: left, y: bottom, width: right - left, height: thickness });
    map.replaceStreamedStaticHitboxes("__boundary__", barriers);
  }
}

class MapStreamingClientService<TManifestData, TChunkData, TState> {
  private readonly controllers = new Map<string, MapStreamClientController<TManifestData, TChunkData, TState>>();
  private readonly waiters = new Map<string, Waiter[]>();

  constructor(
    private readonly socket: AbstractWebsocket,
    private readonly options: ClientMapStreamingOptions<TManifestData, TChunkData, TState>,
  ) {
    socket.on(MAP_STREAM_EVENT, (packet) => this.receive(packet));
  }

  async load(mapId: string): Promise<MapData> {
    const normalizedId = mapId.replace(/^map-/, "");
    const shouldRequest = !this.waiters.has(normalizedId);
    const controllerPromise = new Promise<MapStreamClientController<TManifestData, TChunkData, TState>>((resolve, reject) => {
      const timeoutMs = Math.max(1, this.options.timeoutMs ?? 10_000);
      const waiter: Waiter = { resolve, reject, timer: undefined as unknown as ReturnType<typeof setTimeout> };
      const timer = setTimeout(() => {
        const current = this.waiters.get(normalizedId) ?? [];
        const remaining = current.filter((entry) => entry !== waiter);
        if (remaining.length > 0) this.waiters.set(normalizedId, remaining);
        else this.waiters.delete(normalizedId);
        reject(new Error(`Map stream '${normalizedId}' was not received after ${timeoutMs}ms`));
      }, timeoutMs);
      waiter.timer = timer;
      const waiters = this.waiters.get(normalizedId) ?? [];
      waiters.push(waiter);
      this.waiters.set(normalizedId, waiters);
    });
    // The map-room connection is established before load() runs. Request the
    // initial packet only after the waiter is registered so fast local and DO
    // transports cannot deliver it before the client is ready.
    if (shouldRequest) {
      this.socket.emit(MAP_STREAM_REQUEST_EVENT, { mapId: normalizedId });
    }
    return (await controllerPromise).toMapData();
  }

  private receive(packet: MapStreamPacket<TManifestData, TChunkData>): void {
    if (!packet || typeof packet.mapId !== "string") return;
    const mapId = packet.mapId.replace(/^map-/, "");
    let controller = this.controllers.get(mapId);
    if (!controller) {
      if (!packet.manifest) return;
      controller = new MapStreamClientController(this.options.adapter, packet.manifest);
      this.controllers.set(mapId, controller);
    }
    else if (packet.manifest && controller.revision !== packet.manifest.revision) {
      controller.reset(packet.manifest);
    }
    controller.receive(packet);

    const waiters = this.waiters.get(mapId) ?? [];
    waiters.forEach((waiter) => {
      clearTimeout(waiter.timer);
      waiter.resolve(controller!);
    });
    this.waiters.delete(mapId);
  }
}

class MapStreamingLoadMapService<TManifestData, TChunkData, TState> {
  private socket?: AbstractWebsocket;
  private stream?: MapStreamingClientService<TManifestData, TChunkData, TState>;
  private updateMap?: UpdateMapService;

  constructor(
    private readonly context: RpgContext,
    private readonly options: ClientMapStreamingOptions<TManifestData, TChunkData, TState>,
  ) {}

  initialize(): void {
    if (this.stream) return;
    this.socket = inject<AbstractWebsocket>(this.context as Context, WebSocketToken);
    this.stream = new MapStreamingClientService(this.socket, this.options);
  }

  async load(mapId: string): Promise<MapData> {
    this.initialize();
    const map = this.socket?.mode === "standalone" && this.options.directLoad
      ? await this.options.directLoad(mapId.replace(/^map-/, ""))
      : await this.stream!.load(mapId);
    this.updateMap ??= inject<UpdateMapService>(this.context as Context, UpdateMapToken);
    await this.updateMap.update(map);
    return map;
  }
}

/**
 * Provide a transport-neutral client map loader backed by authoritative chunks.
 * Standalone mode may keep a direct loader while MMORPG mode never fetches the
 * private source map.
 *
 * @param options - Client adapter, optional standalone loader, and timeout.
 * @returns Dependency-injection providers for the RPGJS map loader.
 *
 * @example
 * ```ts
 * provideClientMapStreaming({
 *   adapter: {
 *     component: MyMap,
 *     createState: (manifest) => ({ manifest, chunks: new Map() }),
 *     applyChunk: (state, chunk) => state.chunks.set(chunk.key, chunk.renderData),
 *     removeChunk: (state, key) => state.chunks.delete(key),
 *     getData: (state) => state,
 *   },
 * })
 * ```
 */
export function provideClientMapStreaming<TManifestData, TChunkData, TState>(
  options: ClientMapStreamingOptions<TManifestData, TChunkData, TState>,
): RpgProvider[] {
  return [
    {
      provide: LoadMapToken,
      useFactory: (context: RpgContext) => new MapStreamingLoadMapService(context, options),
    },
  ];
}
