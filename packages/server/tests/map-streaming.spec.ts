import { describe, expect, it, vi } from "vitest";
import {
  installMapStreaming,
  filterMapStreamingProjectilePacket,
  isMapStreamingPositionVisible,
  getMapStreamingVisibleEntityIds,
  provideServerMapStreaming,
  refreshMapStreaming,
  sendInitialMapStreaming,
} from "../src/map-streaming";
import { getMapChunkKey, type MapStreamDefinition } from "@rpgjs/common";

function createDefinition(): MapStreamDefinition {
  const chunks = Object.fromEntries([0, 1, 2].map((x) => {
    const key = getMapChunkKey(x, 0);
    return [key, {
      key,
      x,
      y: 0,
      bounds: { x: x * 100, y: 0, width: 100, height: 100 },
      renderData: { x },
      hitboxes: [],
    }];
  }));
  return {
    manifest: {
      protocol: 1,
      mapId: "test",
      revision: "one",
      width: 300,
      height: 100,
      chunkWidth: 100,
      chunkHeight: 100,
      columns: 3,
      rows: 1,
      renderData: {},
    },
    chunks,
  };
}

describe("server map streaming", () => {
  it("sends only newly interested chunks and evicts chunks outside the retain radius", () => {
    let x = 10;
    const emit = vi.fn();
    const player = { id: "player", conn: {}, x: () => x, y: () => 10, emit };
    const map = { getPlayers: () => [player], getEvents: () => [] };

    installMapStreaming(map as any, createDefinition(), { loadRadius: 0, retainRadius: 1 });
    expect(emit.mock.calls[0][1]).toMatchObject({
      manifest: { mapId: "test" },
      chunks: [{ key: "0:0" }],
      removed: [],
    });

    x = 110;
    refreshMapStreaming(map as any);
    expect(emit.mock.calls[1][1]).toMatchObject({ chunks: [{ key: "1:0" }], removed: [] });

    x = 210;
    refreshMapStreaming(map as any);
    expect(emit.mock.calls[2][1]).toMatchObject({ chunks: [{ key: "2:0" }], removed: ["0:0"] });
  });

  it("removes an active projectile when it leaves the player's interest window", () => {
    let x = 10;
    const emit = vi.fn();
    const projectile = {
      id: "arrow-1",
      type: "arrow",
      origin: { x: 10, y: 10 },
      direction: { x: 0, y: 0 },
      speed: 100,
      range: 300,
      ttl: 3,
      spawnTick: 0,
      delay: 0,
      index: 0,
      count: 1,
      ownerId: "other",
    };
    const player = { id: "player", conn: {}, x: () => x, y: () => 10, emit };
    const map = {
      id: "test",
      getTick: () => 0,
      getPlayers: () => [player], getEvents: () => [],
      projectiles: { getActiveNetworkProjectiles: () => [projectile] },
    };

    installMapStreaming(map as any, createDefinition(), { loadRadius: 0, retainRadius: 0 });
    expect(emit).toHaveBeenCalledWith("projectile:spawnBatch", expect.objectContaining({
      projectiles: [projectile],
    }));

    x = 210;
    refreshMapStreaming(map as any);
    expect(emit).toHaveBeenCalledWith("projectile:destroyBatch", {
      mapId: "test",
      projectiles: [{ id: "arrow-1", reason: "interest" }],
    });
  });

  it("updates projectile interest while the player remains in the same chunk", () => {
    let tick = 0;
    const emit = vi.fn();
    const projectile = {
      id: "arrow-1",
      type: "arrow",
      origin: { x: 10, y: 10 },
      direction: { x: 1, y: 0 },
      speed: 60,
      range: 300,
      ttl: 5,
      spawnTick: 0,
      delay: 0,
      index: 0,
      count: 1,
      ownerId: "other",
    };
    const player = { id: "player", conn: {}, x: () => 10, y: () => 10, emit };
    const map = {
      id: "test",
      getTick: () => tick,
      getPlayers: () => [player], getEvents: () => [],
      projectiles: { getActiveNetworkProjectiles: () => [projectile] },
    };

    installMapStreaming(map as any, createDefinition(), { loadRadius: 0, retainRadius: 0 });
    emit.mockClear();

    tick = 120;
    refreshMapStreaming(map as any);

    expect(emit).toHaveBeenCalledWith("projectile:destroyBatch", {
      mapId: "test",
      projectiles: [{ id: "arrow-1", reason: "interest" }],
    });
  });

  it("computes the chunk of a flying projectile once per refresh, for every player", () => {
    let tick = 0;
    const projectile = {
      id: "arrow-1", type: "arrow", origin: { x: 10, y: 10 }, direction: { x: 1, y: 0 },
      speed: 60, range: 300, ttl: 5, spawnTick: 0, delay: 0, index: 0, count: 1, ownerId: "other",
    };
    const near = { id: "near", conn: {}, x: () => 10, y: () => 10, emit: vi.fn() };
    const far = { id: "far", conn: {}, x: () => 210, y: () => 10, emit: vi.fn() };
    const getActiveNetworkProjectiles = vi.fn(() => [projectile]);
    const map = {
      id: "test",
      getTick: () => tick,
      getPlayers: () => [near, far], getEvents: () => [],
      projectiles: { getActiveNetworkProjectiles },
    };
    installMapStreaming(map as any, createDefinition(), { loadRadius: 0, retainRadius: 0 });
    // Each player sees the projectile only while it is in its chunk
    expect(near.emit).toHaveBeenCalledWith("projectile:spawnBatch", expect.objectContaining({ projectiles: [projectile] }));
    expect(far.emit).not.toHaveBeenCalledWith("projectile:spawnBatch", expect.anything());

    getActiveNetworkProjectiles.mockClear();
    near.emit.mockClear();
    far.emit.mockClear();
    refreshMapStreaming(map as any);
    // One read of the projectiles for the two players, and nothing to send: nothing moved
    expect(getActiveNetworkProjectiles).toHaveBeenCalledTimes(1);
    expect(near.emit).not.toHaveBeenCalled();
    expect(far.emit).not.toHaveBeenCalled();

    // Two seconds later the projectile is at x = 130, then at x = 250: it leaves one player and reaches the other
    tick = 240;
    refreshMapStreaming(map as any);
    expect(near.emit).toHaveBeenCalledWith("projectile:destroyBatch", {
      mapId: "test",
      projectiles: [{ id: "arrow-1", reason: "interest" }],
    });
    expect(far.emit).toHaveBeenCalledWith("projectile:spawnBatch", expect.objectContaining({ projectiles: [projectile] }));
  });

  it("filters a spawn packet for every client from one computation of its chunks", () => {
    const near = { id: "near", conn: {}, x: () => 10, y: () => 10, emit: vi.fn() };
    const far = { id: "far", conn: {}, x: () => 210, y: () => 10, emit: vi.fn() };
    const map = { getPlayers: () => [near, far], getEvents: () => [] };
    installMapStreaming(map as any, createDefinition(), { loadRadius: 0, retainRadius: 0 });
    const readOrigin = vi.fn(() => ({ x: 20, y: 10 }));
    const packet = {
      type: "projectile:spawnBatch",
      value: { mapId: "test", projectiles: [{ id: "a", ownerId: "other", get origin() { return readOrigin(); } }] },
    };

    const forNear = filterMapStreamingProjectilePacket(map as any, near as any, packet);
    const forFar = filterMapStreamingProjectilePacket(map as any, far as any, packet);

    expect(forNear.value.projectiles.map((projectile: any) => projectile.id)).toEqual(["a"]);
    expect(forFar).toBeNull();
    expect(readOrigin).toHaveBeenCalledTimes(1);
  });

  it("keeps projectile impacts and destruction scoped to previously disclosed projectiles", () => {
    const player = { id: "player", conn: {}, x: () => 10, y: () => 10, emit: vi.fn() };
    const map = { getPlayers: () => [player], getEvents: () => [] };

    installMapStreaming(map as any, createDefinition(), { loadRadius: 0, retainRadius: 0 });

    const spawn = filterMapStreamingProjectilePacket(map as any, player as any, {
      type: "projectile:spawnBatch",
      value: {
        projectiles: [
          { id: "visible", ownerId: "other", origin: { x: 10, y: 10 } },
          { id: "hidden", ownerId: "other", origin: { x: 210, y: 10 } },
          { id: "owned", ownerId: "player", origin: { x: 210, y: 10 } },
        ],
      },
    });
    expect(spawn.value.projectiles.map((projectile: any) => projectile.id)).toEqual([
      "visible",
      "owned",
    ]);

    const impacts = filterMapStreamingProjectilePacket(map as any, player as any, {
      type: "projectile:impactBatch",
      value: {
        impacts: [
          { id: "visible", targetId: "target" },
          { id: "hidden", targetId: "target" },
          { id: "owned", targetId: "target" },
        ],
      },
    });
    expect(impacts.value.impacts.map((impact: any) => impact.id)).toEqual(["visible", "owned"]);

    const destroyed = filterMapStreamingProjectilePacket(map as any, player as any, {
      type: "projectile:destroyBatch",
      value: {
        projectiles: [
          { id: "hidden", reason: "hit" },
          { id: "visible", reason: "hit" },
        ],
      },
    });
    expect(destroyed.value.projectiles).toEqual([{ id: "visible", reason: "hit" }]);

    expect(filterMapStreamingProjectilePacket(map as any, player as any, {
      type: "projectile:impactBatch",
      value: { impacts: [{ id: "visible", targetId: "target" }] },
    })).toBeNull();
  });

  it("resends initial chunks when the same player id reconnects", async () => {
    const emit = vi.fn();
    const player = { id: "player", conn: {}, x: () => 10, y: () => 10, emit };
    const map = { getPlayers: () => [player], getEvents: () => [] };
    const module = provideServerMapStreaming({
      compile: () => createDefinition(),
    }, { loadRadius: 0, retainRadius: 1 });

    await module.map!.onBeforeUpdate!({}, map as any);
    sendInitialMapStreaming(map as any, player as any);

    expect(emit).toHaveBeenCalledTimes(2);
    expect(emit.mock.calls[0][1].chunks).toEqual([{ key: "0:0", ...createDefinition().chunks["0:0"] }]);
    expect(emit.mock.calls[1][1]).toMatchObject({
      manifest: { mapId: "test" },
      chunks: [{ key: "0:0" }],
    });
  });

  it("shows entities only in chunks actually disclosed to the player", () => {
    const player = { id: "player", conn: {}, x: () => 10, y: () => 10, emit: vi.fn() };
    const map = { getPlayers: () => [player], getEvents: () => [] };

    installMapStreaming(map as any, createDefinition(), { loadRadius: 0, retainRadius: 2 });

    expect(isMapStreamingPositionVisible(map as any, player as any, 10, 10)).toBe(true);
    expect(isMapStreamingPositionVisible(map as any, player as any, 110, 10)).toBe(false);
  });

  it("shows the players and the events whose position is in a retained chunk", () => {
    const player = { id: "player", conn: {}, x: () => 10, y: () => 10, emit: vi.fn() };
    const players = { player, near: { id: "near", x: () => 90, y: () => 50 }, far: { id: "far", x: () => 250, y: () => 10 } };
    const events = { event: { id: "event", x: () => 20, y: () => 20 }, away: { id: "away", x: () => 150, y: () => 20 } };
    const queryHitbox = vi.fn(() => []);
    const map = {
      getPlayers: () => [player], getEvents: () => [],
      players: () => players,
      events: () => events,
      queryHitbox,
    };

    installMapStreaming(map as any, createDefinition(), { loadRadius: 0, retainRadius: 1 });

    expect(getMapStreamingVisibleEntityIds(map as any, player as any)).toEqual({
      players: new Set(["player", "near"]),
      events: new Set(["event"]),
    });
    // No spatial query per client: an event without a physics body is visible too
    expect(queryHitbox).not.toHaveBeenCalled();
  });

  it("indexes the positions once per broadcast, and again for the next one", async () => {
    let eventX = 20;
    const readX = vi.fn(() => eventX);
    const first = { id: "first", conn: {}, x: () => 10, y: () => 10, emit: vi.fn() };
    const second = { id: "second", conn: {}, x: () => 30, y: () => 10, emit: vi.fn() };
    const map = {
      getPlayers: () => [first, second], getEvents: () => [],
      players: () => ({ first, second }),
      events: () => ({ event: { id: "event", x: readX, y: () => 20 } }),
    };
    installMapStreaming(map as any, createDefinition(), { loadRadius: 0, retainRadius: 1 });

    // Two clients of the same broadcast read one index
    expect(getMapStreamingVisibleEntityIds(map as any, first as any)?.events).toEqual(new Set(["event"]));
    expect(getMapStreamingVisibleEntityIds(map as any, second as any)?.events).toEqual(new Set(["event"]));
    expect(readX).toHaveBeenCalledTimes(1);

    eventX = 250;
    await Promise.resolve();
    expect(getMapStreamingVisibleEntityIds(map as any, first as any)?.events).toEqual(new Set());
    expect(readX).toHaveBeenCalledTimes(2);
  });
});
