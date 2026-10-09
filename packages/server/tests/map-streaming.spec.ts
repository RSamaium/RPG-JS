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
    const map = { getPlayers: () => [player] };

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
      getPlayers: () => [player],
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
      getPlayers: () => [player],
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

  it("keeps projectile impacts and destruction scoped to previously disclosed projectiles", () => {
    const player = { id: "player", conn: {}, x: () => 10, y: () => 10, emit: vi.fn() };
    const map = { getPlayers: () => [player] };

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
    const map = { getPlayers: () => [player] };
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
    const map = { getPlayers: () => [player] };

    installMapStreaming(map as any, createDefinition(), { loadRadius: 0, retainRadius: 2 });

    expect(isMapStreamingPositionVisible(map as any, player as any, 10, 10)).toBe(true);
    expect(isMapStreamingPositionVisible(map as any, player as any, 110, 10)).toBe(false);
  });

  it("queries visible synchronized entities through the retained chunk bounds", () => {
    const emit = vi.fn();
    const player = { id: "player", conn: {}, x: () => 10, y: () => 10, emit };
    const event = { id: "event", x: () => 20, y: () => 20 };
    const players = { player };
    const events = { event };
    const queryHitbox = vi.fn(() => [player, event]);
    const map = {
      getPlayers: () => [player],
      players: () => players,
      events: () => events,
      queryHitbox,
    };

    installMapStreaming(map as any, createDefinition(), { loadRadius: 0, retainRadius: 1 });

    expect(getMapStreamingVisibleEntityIds(map as any, player as any)).toEqual({
      players: new Set(["player"]),
      events: new Set(["event"]),
    });
    expect(queryHitbox).toHaveBeenCalledWith({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });
  });
});
