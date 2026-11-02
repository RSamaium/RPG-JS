import { signal } from "canvasengine";
import { BehaviorSubject, of } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import { RpgClientEngine } from "./RpgClientEngine";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function createEngine() {
  const mapLoad = deferred<any>();
  const roomComponent = () => null;
  const streamController = { attach: vi.fn(), detach: vi.fn() };
  const engine = Object.create(RpgClientEngine.prototype) as any;
  Object.assign(engine, {
    sceneTransferGeneration: 0,
    activeSceneKind: signal("map"),
    activeRoomSceneComponent: signal<any>(undefined),
    activeRoom: signal<any>(null),
    mapLoadCompleted$: new BehaviorSubject(false),
    playerIdReceived$: new BehaviorSubject(false),
    playersReceived$: new BehaviorSubject(false),
    eventsReceived$: new BehaviorSubject(false),
    playerIdSignal: signal(""),
    hooks: { callHooks: vi.fn(() => of(undefined)) },
    webSocket: {
      updateProperties: vi.fn(),
      reconnect: vi.fn(async () => {}),
    },
    loadMapService: { load: vi.fn(() => mapLoad.promise) },
    clientSceneRegistry: {
      get: (kind: string) => kind === "arena" ? { component: roomComponent } : undefined,
    },
    sceneMap: {
      data: signal<any>(undefined),
      lightingState: signal<any>(null),
      players: signal<any>({}),
      events: signal<any>(undefined),
      reset: vi.fn(),
      configureClientPrediction: vi.fn(),
      loadPhysic: vi.fn(),
    },
    sceneRoom: { reset: vi.fn() },
    projectiles: { clear: vi.fn() },
    resetSceneForMapTransfer: vi.fn(async () => {}),
    clearMapTransferPredictionStates: vi.fn(),
    clearClientPredictionStates: vi.fn(),
    setupOnAfterLoadingObserver: vi.fn(),
    callConnectError: vi.fn(async () => {}),
  });
  return { engine, mapLoad, roomComponent, streamController };
}

describe("a room change during a streamed map load", () => {
  it("keeps the room scene when the stale map load ends", async () => {
    const { engine, mapLoad, roomComponent, streamController } = createEngine();

    const changeMap = engine.handleChangeMap({ mapId: "map-map1" });
    await vi.waitFor(() => expect(engine.loadMapService.load).toHaveBeenCalledWith("map-map1"));

    await engine.handleChangeRoom({ id: "arena-1", kind: "arena", name: "arena" });
    expect(engine.activeSceneKind()).toBe("arena");

    mapLoad.resolve({ id: "map1", streamController });
    await changeMap;

    expect(engine.activeSceneKind()).toBe("arena");
    expect(engine.activeRoomSceneComponent()).toBe(roomComponent);
    expect(engine.activeRoom()).toEqual({ id: "arena-1", kind: "arena", name: "arena" });
    expect(engine.sceneMap.data()).toBeUndefined();
    expect(streamController.attach).not.toHaveBeenCalled();
    expect(engine.webSocket.updateProperties).toHaveBeenLastCalledWith({ room: "arena-1", query: undefined });
  });

  it("still mounts the map scene when no room change happens during the load", async () => {
    const { engine, mapLoad } = createEngine();

    const changeMap = engine.handleChangeMap({ mapId: "map-map1" });
    mapLoad.resolve({ id: "map1" });
    await changeMap;

    expect(engine.activeSceneKind()).toBe("map");
    expect(engine.sceneMap.data()).toEqual({ id: "map1" });
  });
});
