import { afterEach, describe, expect, test, vi } from "vitest";
import { MAXHP, MAXSP } from "@rpgjs/common";
import { RpgPlayer, type RpgMap } from "@rpgjs/server";
import studioServer, { resolveRuntimeEventHitbox } from "../src/server";
import {
  configureGameDataProvider,
  configureStudioGameRuntime,
  resetGameDataProvider,
} from "../src/data-provider";

afterEach(() => {
  delete (globalThis as typeof globalThis & { gameConfig?: unknown }).gameConfig;
  configureStudioGameRuntime({ projectId: null });
  resetGameDataProvider();
});

describe("Studio server runtime", () => {
  test("resolves the runtime event hitbox from the game map payload", () => {
    expect(resolveRuntimeEventHitbox({
      hitbox: { width: 56, height: 50 },
      triggers: [
        { enabled: true, hitbox: { width: 32, height: 32 } },
      ],
    }, {})).toEqual({
      width: 56,
      height: 50,
    });
  });

  test("falls back to the last enabled trigger hitbox", () => {
    expect(resolveRuntimeEventHitbox({
      triggers: [
        { enabled: true, hitbox: { width: 18, height: 26 } },
        { enabled: false, hitbox: { width: 90, height: 90 } },
        { enabled: true, hitbox: { width: 56, height: 50 } },
      ],
    }, {})).toEqual({
      width: 56,
      height: 50,
    });
  });

  test("supports physics-style hitbox keys from params", () => {
    expect(resolveRuntimeEventHitbox({}, {
      hitbox: { w: 24, h: 40 },
    })).toEqual({
      width: 24,
      height: 40,
    });
  });

  test("initializes each player from the joined map project", async () => {
    (globalThis as typeof globalThis & { gameConfig?: unknown }).gameConfig = {
      _id: "global-project",
      startMapId: "global-map",
      hero: {
        parameters: {
          [MAXHP]: 1,
          [MAXSP]: 1,
          projectMarker: 1,
        },
      },
    };
    configureStudioGameRuntime({ projectId: "fixed-project" });

    const getPlayerStartConfig = vi.fn(async ({ projectId }: { projectId?: string | null }) => ({
      startingInventory: [{ itemId: `${projectId}-potion`, amount: 1 }],
    }));
    const getDatabase = vi.fn(async (projectId?: string) => ([{
      _id: `${projectId}-potion`,
      itemType: "item",
      name: `${projectId} potion`,
    }]));
    configureGameDataProvider({
      kind: "online",
      getProject: vi.fn(),
      getMap: vi.fn(),
      getMedia: vi.fn(),
      getPlayerStartConfig,
      getDatabase,
    });

    const onJoinMap = (studioServer() as any).player.onJoinMap as (player: RpgPlayer, map: RpgMap) => Promise<void>;
    const projects = [
      { id: "project-a", mapId: "map-a", maxHp: 90, maxSp: 45, marker: 101 },
      { id: "project-b", mapId: "map-b", maxHp: 80, maxSp: 40, marker: 202 },
    ];

    for (const project of projects) {
      const database: Record<string, any> = {};
      const map = {
        globalConfig: {
          _id: project.id,
          startMapId: project.mapId,
          hero: {
            parameters: {
              [MAXHP]: project.maxHp,
              [MAXSP]: project.maxSp,
              projectMarker: project.marker,
            },
          },
        },
        database: () => database,
        addInDatabase: (id: string, value: any) => {
          database[id] = value;
        },
        startPosition: { x: 0, y: 0 },
        scale: 1,
      } as unknown as RpgMap;
      const player = new RpgPlayer();
      player.initializeDefaultStats();
      player.setMap(map);

      await onJoinMap(player, map);

      expect(player.param[MAXHP]).toBe(project.maxHp);
      expect(player.param[MAXSP]).toBe(project.maxSp);
      expect(player.hp).toBe(project.maxHp);
      expect(player.sp).toBe(project.maxSp);
      expect(player.param.projectMarker).toBe(project.marker);
      expect(database[`${project.id}-potion`]?.name).toBe(`${project.id} potion`);
    }

    expect(getPlayerStartConfig.mock.calls.map(([query]) => ({
      projectId: query.projectId,
      mapId: query.mapId,
    }))).toEqual([
      { projectId: "project-a", mapId: "map-a" },
      { projectId: "project-b", mapId: "map-b" },
    ]);
    expect(getDatabase.mock.calls.map(([projectId]) => projectId)).toEqual([
      "project-a",
      "project-b",
    ]);
  });

  test("keeps the legacy global project fallback for maps without config", async () => {
    (globalThis as typeof globalThis & { gameConfig?: unknown }).gameConfig = {
      _id: "legacy-project",
      startMapId: "legacy-map",
      hero: {
        parameters: {
          projectMarker: 303,
        },
      },
    };
    const getPlayerStartConfig = vi.fn(async () => null);
    configureGameDataProvider({
      kind: "online",
      getProject: vi.fn(),
      getMap: vi.fn(),
      getMedia: vi.fn(),
      getDatabase: vi.fn(async () => []),
      getPlayerStartConfig,
    });

    const player = new RpgPlayer();
    const map = {
      globalConfig: {},
      database: () => ({}),
      addInDatabase: vi.fn(),
      startPosition: { x: 0, y: 0 },
      scale: 1,
    } as unknown as RpgMap;
    player.setMap(map);

    await (studioServer() as any).player.onJoinMap(player, map);

    expect(player.param.projectMarker).toBe(303);
    expect(getPlayerStartConfig).toHaveBeenCalledWith(expect.objectContaining({
      projectId: "legacy-project",
      mapId: "legacy-map",
    }));
  });

  test("prefers a configured fixed project before the legacy project id", async () => {
    (globalThis as typeof globalThis & { gameConfig?: unknown }).gameConfig = {
      _id: "legacy-project",
      startMapId: "legacy-map",
      hero: {},
    };
    configureStudioGameRuntime({ projectId: "fixed-project" });
    const getPlayerStartConfig = vi.fn(async () => null);
    configureGameDataProvider({
      kind: "online",
      getProject: vi.fn(),
      getMap: vi.fn(),
      getMedia: vi.fn(),
      getDatabase: vi.fn(async () => []),
      getPlayerStartConfig,
    });

    const player = new RpgPlayer();
    const map = {
      globalConfig: {},
      database: () => ({}),
      addInDatabase: vi.fn(),
      startPosition: { x: 0, y: 0 },
      scale: 1,
    } as unknown as RpgMap;
    player.setMap(map);

    await (studioServer() as any).player.onJoinMap(player, map);

    expect(getPlayerStartConfig).toHaveBeenCalledWith(expect.objectContaining({
      projectId: "fixed-project",
      mapId: "legacy-map",
    }));
  });
});
