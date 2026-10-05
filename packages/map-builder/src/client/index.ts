import { createModule, defineModule, type RpgProvider } from "@rpgjs/common";
import { inject, RpgClientEngine, WebSocketToken, type AbstractWebsocket, type RpgClient } from "@rpgjs/client";
import { signal } from "canvasengine";
import type { Container } from "pixi.js";
import type { AssetResolver } from "../model/assets";
import type { ApplyResult, Unsubscribe } from "../model/result";
import type { ClientMessage, MapTransport, ServerMessage } from "../protocol";
import { bindRemoteEffects, joinRemoteMap, type RemoteMap } from "../remote";
import type { FeatureApis, MapFeature } from "../renderer/feature";
import type { DescribeContext } from "../renderer/scene";
import { createMapView, type MapView, type MapViewOptions } from "../renderer/view";
import { elements } from "../features";
import {
  MAP_BUILDER_CHANNEL,
  changedElementIds,
  clearHitboxes,
  forgetHitboxes,
  syncElementHitboxes,
  unwrap,
  wrap,
  type StaticHitboxHost,
} from "../rpgjs/shared";

export { MAP_BUILDER_CHANNEL } from "../rpgjs/shared";

type Features = readonly MapFeature<string, object>[];

export interface MapBuilderClientOptions<F extends Features = Features> {
  /** What the maps are made of: the same assets the server has. */
  readonly assets: AssetResolver;
  /**
   * What the view draws and lets the player do. Defaults to `[elements()]`: events are RPGJS
   * events, drawn by RPGJS, so `events()` would draw them twice.
   */
  readonly features?: F;
  /** Options of the view: textures, hooks, modes, actor, culling… */
  readonly view?: Omit<MapViewOptions<F, Promise<ApplyResult>>, "model" | "assets" | "features">;
  /** Keep the static colliders of the client's physics in step, so the player does not walk through what was built. Defaults to true. */
  readonly physics?: boolean;
  /** How long to wait for the server before giving up. Defaults to 10000. */
  readonly timeoutMs?: number;
  /** The player is on a modifiable map: the place to wire controls (`handle.view.placement.start("oak")`). */
  readonly onJoin?: (handle: MapBuilderHandle<F>) => void;
  readonly onLeave?: (handle: MapBuilderHandle<F>) => void;
  readonly onError?: (error: unknown) => void;
}

export interface MapBuilderHandle<F extends Features = Features> {
  readonly mapId: string;
  readonly remote: RemoteMap;
  readonly view: MapView<Promise<ApplyResult>> & FeatureApis<F>;
  /** Adds the view to a PixiJS container, e.g. the `componentInstance` of a CanvasEngine component. */
  attachTo(container: Container): () => void;
  /** Leaves the map: stops listening, removes the colliders, destroys the view. */
  dispose(): void;
}

export interface MapBuilderClient<F extends Features = Features> {
  /** The map the player is on, once joined. */
  current(): MapBuilderHandle<F> | undefined;
  /** Resolves once the player has joined a modifiable map. */
  whenReady(): Promise<MapBuilderHandle<F>>;
  /**
   * The view as PixiJS children, for the `pixiChildren` prop of RPGJS's `EventLayerComponent`: that
   * puts the elements in the same layer as the characters, so they are sorted in depth together.
   * Empty when the player is not on a modifiable map.
   */
  readonly pixiChildren: { (): Container[]; set(value: Container[]): void };
  /** Called when the player joins or leaves a modifiable map. */
  onChange(listener: (handle: MapBuilderHandle<F> | undefined) => void): Unsubscribe;
}

interface State {
  readonly pixiChildren: { (): Container[]; set(value: Container[]): void };
  readonly listeners: Set<(handle: MapBuilderHandle<never> | undefined) => void>;
  readonly waiting: Array<(handle: MapBuilderHandle<never>) => void>;
  /** Messages that arrived for a map the client has not loaded yet, by map. */
  readonly buffered: Map<string, ServerMessage[]>;
  current?: MapBuilderHandle<never> & { readonly deliver: (message: ServerMessage) => void };
  joining?: string;
  socketBound?: AbstractWebsocket;
}

const states = new WeakMap<object, State>();
const MAX_BUFFERED = 64;

const stateOf = (engine: object): State => {
  let state = states.get(engine);
  if (!state) {
    state = { pixiChildren: signal<Container[]>([]) as State["pixiChildren"], listeners: new Set(), waiting: [], buffered: new Map() };
    states.set(engine, state);
  }
  return state;
};

/** What the map builder gives a game on the client. Pass the type of your features to get `view.placement` and the like typed. */
export function getMapBuilder<F extends Features = Features>(engine: object = inject(RpgClientEngine)): MapBuilderClient<F> {
  const state = stateOf(engine);
  return {
    current: () => state.current as unknown as MapBuilderHandle<F> | undefined,
    whenReady: () =>
      state.current ? Promise.resolve(state.current as unknown as MapBuilderHandle<F>) : new Promise((resolve) => state.waiting.push(resolve as never)),
    pixiChildren: state.pixiChildren,
    onChange(listener) {
      state.listeners.add(listener as never);
      return () => state.listeners.delete(listener as never);
    },
  };
}

/** The module of the map builder for an RPGJS client. Install it with `provideMapBuilder`, or `provideClientModules`. */
export function createMapBuilderClient<const F extends Features = readonly [ReturnType<typeof elements>]>(
  options: MapBuilderClientOptions<F>,
): RpgClient {
  const reportError = options.onError ?? ((error: unknown) => console.error(error));
  const features = (options.features ?? [elements()]) as unknown as F;
  const physics = options.physics !== false;
  const describeContext: DescribeContext = { assets: options.assets, ...(options.view?.hooks ? { hooks: options.view.hooks } : {}) };

  const sceneOf = (engine: RpgClientEngine): (StaticHitboxHost & { id: string }) => engine.scene as unknown as StaticHitboxHost & { id: string };

  const leave = (engine: RpgClientEngine): void => {
    const state = stateOf(engine);
    const handle = state.current;
    if (!handle) return;
    state.current = undefined;
    state.pixiChildren.set([]);
    if (physics) clearHitboxes(sceneOf(engine));
    try {
      options.onLeave?.(handle as never);
    } catch (error) {
      reportError(error);
    }
    handle.dispose();
    for (const listener of [...state.listeners]) listener(undefined);
  };

  /** Joins the modifiable map the player is on, if it is not already joined. */
  const join = async (engine: RpgClientEngine, mapId: string): Promise<void> => {
    const state = stateOf(engine);
    if (state.current?.mapId === mapId || state.joining === mapId) return;
    leave(engine);
    const socket = inject<AbstractWebsocket>(WebSocketToken);
    state.joining = mapId;

    const listeners = new Set<(message: ServerMessage) => void>();
    const transport: MapTransport = {
      send: (message: ClientMessage) => socket.emit(MAP_BUILDER_CHANNEL, wrap(mapId, message)),
      onMessage(listener) {
        listeners.add(listener);
        // What the server sent before the scene was loaded.
        for (const message of state.buffered.get(mapId)?.splice(0) ?? []) listener(message);
        return () => listeners.delete(listener);
      },
    };

    try {
      const remote = await joinRemoteMap({ transport, ...(options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}) });
      if (state.joining !== mapId) return remote.disconnect(); // the player moved on while we waited

      const view = createMapView({
        ...options.view,
        model: remote.model,
        assets: options.assets,
        features,
        onError: options.view?.onError ?? reportError,
      } as never) as unknown as MapBuilderHandle<F>["view"];
      const stopEffects = bindRemoteEffects(remote, view.effects);

      const host = sceneOf(engine);
      const stopPhysics = physics
        ? (() => {
            syncElementHitboxes(host, remote.model.state, "all", describeContext);
            return remote.model.subscribe((change) =>
              syncElementHitboxes(host, change.state, change.reset ? "all" : changedElementIds(change.patches), describeContext),
            );
          })()
        : () => undefined;

      const handle = {
        mapId,
        remote,
        view,
        deliver: (message: ServerMessage) => listeners.forEach((listener) => listener(message)),
        attachTo: (container: Container) => {
          container.addChild(view.root);
          return () => void (view.root.parent === container && container.removeChild(view.root));
        },
        dispose() {
          stopEffects();
          stopPhysics();
          view.destroy();
          remote.disconnect();
        },
      };
      state.current = handle as never;
      state.joining = undefined;
      state.pixiChildren.set([view.root]);
      for (const waiter of state.waiting.splice(0)) waiter(handle as never);
      for (const listener of [...state.listeners]) listener(handle as never);
      options.onJoin?.(handle as never);
    } catch (error) {
      if (state.joining === mapId) state.joining = undefined;
      reportError(error);
    }
  };

  /** Gives what the server sends to the join of the map it is about, or keeps it until the player is there. */
  const bindSocket = (engine: RpgClientEngine): void => {
    const state = stateOf(engine);
    const socket = inject<AbstractWebsocket>(WebSocketToken);
    if (state.socketBound === socket) return;
    state.socketBound = socket;
    socket.on(MAP_BUILDER_CHANNEL, (raw: unknown) => {
      const envelope = unwrap(raw);
      if (!envelope) return;
      const message = envelope.message as ServerMessage;
      if (state.current?.mapId === envelope.map) return state.current.deliver(message);
      const queue = state.buffered.get(envelope.map) ?? [];
      queue.push(message);
      if (queue.length > MAX_BUFFERED) queue.splice(0, queue.length - MAX_BUFFERED);
      state.buffered.set(envelope.map, queue);
      // The player may already be on that map, with nothing to tell us it loaded.
      if (sceneOf(engine).id === envelope.map) void join(engine, envelope.map);
    });
  };

  const onMapLoaded = (engine: RpgClientEngine): void => {
    const mapId = sceneOf(engine).id;
    if (mapId && stateOf(engine).buffered.has(mapId)) void join(engine, mapId);
  };

  return defineModule<RpgClient>({
    engine: {
      onStart(engine: RpgClientEngine) {
        bindSocket(engine);
      },
      onConnected(engine: RpgClientEngine) {
        bindSocket(engine);
      },
      onDisconnect(engine: RpgClientEngine) {
        leave(engine);
      },
    },
    sceneMap: {
      onAfterLoading(scene: unknown) {
        const engine = inject(RpgClientEngine);
        bindSocket(engine);
        // A different map from the one we joined: leave it, and join this one once the server has sent it.
        const joined = stateOf(engine).current;
        if (joined && (scene as { id?: string }).id !== joined.mapId) leave(engine);
        onMapLoaded(engine);
      },
      // Not every RPGJS setup calls `onAfterLoading`: the map being loaded, or its physics being built, also tell us the scene is ready.
      onChanges() {
        onMapLoaded(inject(RpgClientEngine));
      },
      onPhysicsInit(scene: unknown) {
        const engine = inject(RpgClientEngine);
        onMapLoaded(engine);
        const handle = stateOf(engine).current;
        if (!physics || !handle) return;
        // The physics world was rebuilt: put the colliders back.
        forgetHitboxes(scene as object);
        syncElementHitboxes(scene as unknown as StaticHitboxHost, handle.remote.model.state, "all", describeContext);
      },
    },
  });
}

/**
 * Installs the map builder on an RPGJS client:
 *
 * ```ts
 * startGame({ providers: [provideMapBuilder({ assets, features: [elements(), selection(), placement({ catalog })] })] })
 * ```
 */
export function provideMapBuilder<const F extends Features = readonly [ReturnType<typeof elements>]>(options: MapBuilderClientOptions<F>): RpgProvider[] {
  return createModule("MapBuilder", [{ client: createMapBuilderClient(options) }]);
}
