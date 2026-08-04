import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { testing, type TestingFixture } from "@rpgjs/testing";
import { createModule, defineModule, Direction, type MapStreamDefinition } from "@rpgjs/common";
import { RpgPlayer, RpgServer } from "../src";
import { installMapStreaming } from "../src/map-streaming";

function createStreamingDefinition(): MapStreamDefinition {
  return {
    manifest: {
      protocol: 1,
      mapId: "test-map",
      revision: "spatial-query",
      width: 300,
      height: 100,
      chunkWidth: 100,
      chunkHeight: 100,
      columns: 3,
      rows: 1,
      renderData: {},
    },
    chunks: Object.fromEntries([0, 1, 2].map((x) => [`${x}:0`, {
      key: `${x}:0`,
      x,
      y: 0,
      bounds: { x: x * 100, y: 0, width: 100, height: 100 },
      renderData: {},
      hitboxes: [],
    }])),
  };
}

const serverModule = defineModule<RpgServer>({
  maps: [
    {
      id: "test-map",
      file: "",
    },
  ],
  player: {
    async onConnected(player) {
      await player.changeMap("test-map", { x: 100, y: 100 });
    },
  },
});

let fixture: TestingFixture;
let client: any;
let player: RpgPlayer;
let serverMap: any;

beforeEach(async () => {
  const module = createModule("PredictionServerModule", [
    {
      server: serverModule,
    },
  ]);
  fixture = await testing(module);
  client = await fixture.createClient();
  player = await client.waitForMapChange("test-map");
  serverMap = fixture.server.subRoom as any;
});

afterEach(async () => {
  await fixture.clear();
});

describe("Prediction + Reconciliation Server Protocol", () => {
  test("should reply pong with server tick", () => {
    const emitSpy = vi.spyOn(player, "emit");
    const payload = {
      clientTime: 1234,
      clientFrame: 42,
    };

    serverMap.onPing(player, payload);

    expect(emitSpy).toHaveBeenCalledWith(
      "pong",
      expect.objectContaining({
        clientTime: payload.clientTime,
        clientFrame: payload.clientFrame,
        serverTick: serverMap.getTick(),
      }),
    );
  });

  test("should include authoritative ack metadata in sync interceptor", async () => {
    const frame = 7;
    await serverMap.onInput(player, {
      input: Direction.Right,
      frame,
      tick: 0,
      timestamp: Date.now(),
    });
    await serverMap.processInput(player.id);

    const intercepted = serverMap.interceptorPacket(
      player,
      { type: "sync", value: {} },
      player.conn,
    );

    expect(intercepted?.value?.ack).toEqual(
      expect.objectContaining({
        frame,
        serverTick: expect.any(Number),
        x: expect.any(Number),
        y: expect.any(Number),
        direction: expect.any(String),
      }),
    );
  });

  test("should reset spatial entity visibility when a public player id reconnects", () => {
    serverMap.spatialVisibleEventIds.set(player.id, new Set(["old-event"]));
    serverMap.spatialVisiblePlayerIds.set(player.id, new Set([player.id]));

    serverMap.onJoin(player, player.conn);

    expect(serverMap.spatialVisibleEventIds.has(player.id)).toBe(false);
    expect(serverMap.spatialVisiblePlayerIds.has(player.id)).toBe(false);
  });

  test("should mark an existing visible player as connected in a new client's initial snapshot", () => {
    const existingPlayer = new RpgPlayer();
    existingPlayer.id = "existing-player";
    existingPlayer.x.set(player.x());
    existingPlayer.y.set(player.y());
    existingPlayer.isConnected.set(true);
    existingPlayer.setGraphic("hero");
    serverMap.players()[existingPlayer.id] = existingPlayer;

    const intercepted = serverMap.interceptorPacket(
      player,
      {
        type: "sync",
        value: {
          players: {
            [existingPlayer.id]: {
              graphics: ["hero"],
              x: existingPlayer.x(),
              y: existingPlayer.y(),
            },
          },
        },
      },
      player.conn,
    );

    expect(intercepted?.value?.players?.[existingPlayer.id]).toEqual(
      expect.objectContaining({
        graphics: ["hero"],
        isConnected: true,
      }),
    );
  });

  test("should use spatial candidates for streamed player visibility transitions", () => {
    installMapStreaming(serverMap, createStreamingDefinition(), {
      loadRadius: 0,
      retainRadius: 0,
    });
    serverMap.spatialVisiblePlayerIds.delete(player.id);
    serverMap.spatialVisibleEventIds.delete(player.id);

    const nearbyPlayer = new RpgPlayer();
    nearbyPlayer.id = "nearby-player";
    nearbyPlayer.x.set(player.x());
    nearbyPlayer.y.set(player.y());
    nearbyPlayer.isConnected.set(true);
    nearbyPlayer.setGraphic("hero");
    serverMap.players()[nearbyPlayer.id] = nearbyPlayer;

    const farPlayer = new RpgPlayer();
    farPlayer.id = "far-player";
    farPlayer.x.set(250);
    farPlayer.y.set(player.y());
    const farX = vi.fn(() => 250);
    farPlayer.x = farX as any;
    serverMap.players()[farPlayer.id] = farPlayer;
    farX.mockClear();

    const queryHitbox = vi.spyOn(serverMap, "queryHitbox")
      .mockReturnValue([player])
      .mockReturnValueOnce([player, nearbyPlayer])
      .mockReturnValueOnce([player]);

    const entering = serverMap.interceptorPacket(
      player,
      { type: "sync", value: {} },
      player.conn,
    );
    expect(entering?.value?.players?.[nearbyPlayer.id]).toEqual(
      expect.objectContaining({ isConnected: true, graphics: ["hero"] }),
    );
    expect(farX).not.toHaveBeenCalled();

    nearbyPlayer.x.set(250);
    const leaving = serverMap.interceptorPacket(
      player,
      { type: "sync", value: {} },
      player.conn,
    );
    expect(leaving?.value?.players?.[nearbyPlayer.id]).toBe("$delete");

    const pendingIndexPlayer = new RpgPlayer();
    pendingIndexPlayer.id = "pending-index-player";
    pendingIndexPlayer.x.set(player.x());
    pendingIndexPlayer.y.set(player.y());
    pendingIndexPlayer.isConnected.set(true);
    serverMap.players()[pendingIndexPlayer.id] = pendingIndexPlayer;
    const supplemented = serverMap.interceptorPacket(
      player,
      {
        type: "sync",
        value: {
          players: {
            [pendingIndexPlayer.id]: { x: player.x(), y: player.y() },
          },
        },
      },
      player.conn,
    );
    expect(supplemented?.value?.players?.[pendingIndexPlayer.id]).toEqual(
      expect.objectContaining({ isConnected: true }),
    );
    expect(queryHitbox).toHaveBeenCalledTimes(3);
  });

  test("should stream shared and owned scenario events only while they remain visible", async () => {
    installMapStreaming(serverMap, createStreamingDefinition(), {
      loadRadius: 0,
      retainRadius: 0,
    });
    serverMap.spatialVisiblePlayerIds.delete(player.id);
    serverMap.spatialVisibleEventIds.delete(player.id);

    const sharedId = await serverMap.createDynamicEvent({
      id: "shared-event",
      x: player.x(),
      y: player.y(),
      event: { name: "Shared" },
    });
    const ownedId = await serverMap.createDynamicEvent({
      id: "owned-event",
      x: player.x(),
      y: player.y(),
      event: { name: "Owned" },
    }, { mode: "scenario", scenarioOwnerId: player.id });
    const privateId = await serverMap.createDynamicEvent({
      id: "private-event",
      x: player.x(),
      y: player.y(),
      event: { name: "Private" },
    }, { mode: "scenario", scenarioOwnerId: "another-player" });
    const sharedEvent = serverMap.events()[sharedId];
    const ownedEvent = serverMap.events()[ownedId];
    const privateEvent = serverMap.events()[privateId];

    vi.spyOn(serverMap, "queryHitbox")
      .mockReturnValueOnce([player, sharedEvent, ownedEvent, privateEvent])
      .mockReturnValueOnce([player]);

    const entering = serverMap.interceptorPacket(
      player,
      { type: "sync", value: {} },
      player.conn,
    );
    expect(entering?.value?.events?.[sharedId]).toBeDefined();
    expect(entering?.value?.events?.[ownedId]).toBeDefined();
    expect(entering?.value?.events?.[privateId]).toBeUndefined();

    sharedEvent.x.set(250);
    ownedEvent.x.set(250);
    const leaving = serverMap.interceptorPacket(
      player,
      { type: "sync", value: {} },
      player.conn,
    );
    expect(leaving?.value?.events).toEqual({
      [sharedId]: "$delete",
      [ownedId]: "$delete",
    });
  });

  test("should keep ack position aligned with its processed frame when the sync snapshot advances", () => {
    player._lastFramePositions = {
      frame: 21,
      position: {
        x: 0,
        y: 0,
        direction: Direction.Down,
      },
      serverTick: 1,
    };

    const intercepted = serverMap.interceptorPacket(
      player,
      {
        type: "sync",
        value: {
          players: {
            [player.id]: {
              x: 321,
              y: 45,
              direction: Direction.Left,
            },
          },
        },
      },
      player.conn,
    );

    expect(intercepted?.value?.ack).toEqual(
      expect.objectContaining({
        frame: 21,
        x: 0,
        y: 0,
        direction: Direction.Down,
        serverTick: 1,
      }),
    );
  });

  test("should queue trajectory frames and replay them progressively on server ticks", async () => {
    const baseTs = Date.now();
    await serverMap.onInput(player, {
      input: Direction.Right,
      frame: 3,
      tick: 3,
      timestamp: baseTs + 32,
      trajectory: [
        {
          input: Direction.Right,
          frame: 1,
          tick: 1,
          timestamp: baseTs,
          x: 101,
          y: 100,
          direction: Direction.Right,
        },
        {
          input: Direction.Right,
          frame: 2,
          tick: 2,
          timestamp: baseTs + 16,
          x: 102,
          y: 100,
          direction: Direction.Right,
        },
        {
          input: Direction.Right,
          frame: 3,
          tick: 3,
          timestamp: baseTs + 32,
          x: 103,
          y: 100,
          direction: Direction.Right,
        },
      ],
    });

    expect(player.pendingInputs.map((entry: any) => entry.frame)).toEqual([1, 2, 3]);

    await serverMap.nextTickAsync();
    expect(player._lastFramePositions?.frame).toBe(1);
    expect(player.pendingInputs.map((entry: any) => entry.frame)).toEqual([2, 3]);

    await serverMap.nextTickAsync();
    expect(player._lastFramePositions?.frame).toBe(2);
    expect(player.pendingInputs.map((entry: any) => entry.frame)).toEqual([3]);

    await serverMap.nextTickAsync();
    expect(player._lastFramePositions?.frame).toBe(3);
    expect(player.pendingInputs).toHaveLength(0);
  });

  test("should preserve client physics tick spacing while replaying queued inputs", async () => {
    const baseTs = Date.now();
    await serverMap.onInput(player, {
      input: Direction.Right,
      frame: 2,
      tick: 13,
      timestamp: baseTs + 48,
      trajectory: [
        { input: Direction.Right, frame: 1, tick: 10, timestamp: baseTs },
        { input: Direction.Right, frame: 2, tick: 13, timestamp: baseTs + 48 },
      ],
    });

    await serverMap.nextTickAsync();
    const firstServerTick = player.lastProcessedInputServerTick;
    expect(player._lastFramePositions?.frame).toBe(1);

    await serverMap.nextTickAsync();
    expect(player._lastFramePositions?.frame).toBe(1);
    await serverMap.nextTickAsync();
    expect(player._lastFramePositions?.frame).toBe(1);
    await serverMap.nextTickAsync();

    expect(player._lastFramePositions?.frame).toBe(2);
    expect(player.lastProcessedInputTick).toBe(13);
    expect(player.lastProcessedInputServerTick).toBe(firstServerTick + 3);
  });

  test("should use server time for movement idle detection despite an old client timestamp", async () => {
    const staleClientTimestamp = Date.now() - 5_000;
    await serverMap.onInput(player, {
      input: Direction.Right,
      frame: 1,
      tick: 1,
      timestamp: staleClientTimestamp,
    });

    await serverMap.nextTickAsync();

    expect(player.lastProcessedClientInputTs).toBe(staleClientTimestamp);
    expect(player.lastProcessedInputTs).toBeGreaterThan(staleClientTimestamp + 4_000);

    const stopMovement = vi.spyOn(serverMap, "stopMovement");
    await serverMap.nextTickAsync();
    expect(stopMovement).not.toHaveBeenCalled();
  });

  test("should process dash inputs through the movement queue", async () => {
    const dashBody = vi.spyOn(serverMap, "dashBody" as any);
    const frame = 11;
    const timestamp = Date.now();

    await serverMap.onInput(player, {
      input: {
        type: "dash",
        direction: { x: 1, y: 0 },
        additionalSpeed: 8,
        duration: 180,
        cooldown: 450,
      },
      frame,
      tick: 0,
      timestamp,
    });

    await serverMap.processInput(player.id);

    expect(dashBody).toHaveBeenCalledWith(
      player,
      expect.objectContaining({
        type: "dash",
        direction: { x: 1, y: 0 },
        additionalSpeed: 8,
        duration: 180,
        cooldown: 450,
      }),
    );
    expect(player._lastFramePositions?.frame).toBe(frame);
    expect(player._lastFramePositions?.position?.direction).toBe(Direction.Right);
    expect(player.lastProcessedInputTs).toBeGreaterThanOrEqual(timestamp + 180);
  });

  test("should process pending input before the physics step in server nextTickAsync", async () => {
    const initialX = player.x();
    const frame = 31;

    await serverMap.onInput(player, {
      input: Direction.Right,
      frame,
      tick: 0,
      timestamp: Date.now(),
    });

    const executed = await serverMap.nextTickAsync(20);

    expect(executed).toBe(1);
    expect(player.pendingInputs).toHaveLength(0);
    expect(player._lastFramePositions?.frame).toBe(frame);
    expect(player.x()).toBeGreaterThan(initialX);
    expect(player._lastFramePositions?.position?.x).toBe(Math.round(player.x()));
    expect(player._lastFramePositions?.serverTick).toBe(serverMap.getTick());
    expect(serverMap.getTick()).toBeGreaterThan(0);
  });

  test("should run one fixed step on default nextTickAsync", async () => {
    const initialTick = serverMap.getTick();
    const initialX = player.x();
    const frame = 32;

    await serverMap.onInput(player, {
      input: Direction.Right,
      frame,
      tick: 0,
      timestamp: Date.now(),
    });

    const executed = await serverMap.nextTickAsync();

    expect(executed).toBe(1);
    expect(serverMap.getTick()).toBe(initialTick + 1);
    expect(player.pendingInputs).toHaveLength(0);
    expect(player._lastFramePositions?.frame).toBe(frame);
    expect(player.x()).toBeGreaterThan(initialX);
  });

  test("should not consume queued trajectory inputs on partial accumulator ticks", async () => {
    const baseTs = Date.now();
    await serverMap.onInput(player, {
      input: Direction.Down,
      frame: 34,
      tick: 34,
      timestamp: baseTs + 16,
      trajectory: [
        {
          input: Direction.Right,
          frame: 33,
          tick: 33,
          timestamp: baseTs,
        },
        {
          input: Direction.Down,
          frame: 34,
          tick: 34,
          timestamp: baseTs + 16,
        },
      ],
    });

    expect(player.pendingInputs.map((entry: any) => entry.frame)).toEqual([33, 34]);

    const firstExecuted = await serverMap.nextTickAsync(8);
    expect(firstExecuted).toBe(0);
    expect(player.pendingInputs.map((entry: any) => entry.frame)).toEqual([33, 34]);

    const secondExecuted = await serverMap.nextTickAsync(9);
    expect(secondExecuted).toBe(1);
    expect(player._lastFramePositions?.frame).toBe(33);
    expect(player.pendingInputs.map((entry: any) => entry.frame)).toEqual([34]);
  });

  test("should run projectiles once for each fixed server step", async () => {
    const stepSpy = vi.spyOn(serverMap.projectiles, "step");

    const executed = await serverMap.nextTickAsync(80);

    expect(executed).toBe(4);
    expect(stepSpy).toHaveBeenCalledTimes(4);
  });

  test("should start and stop the unified auto tick subscription with setAutoTick", () => {
    expect(serverMap.tickSubscription).toBeFalsy();

    serverMap.setAutoTick(true);
    expect(serverMap.tickSubscription).toBeTruthy();

    serverMap.setAutoTick(false);
    expect(serverMap.tickSubscription).toBeFalsy();
  });
});
