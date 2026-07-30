import { afterEach, describe, expect, test, vi } from "vitest";
import { MAXHP, MAXSP } from "@rpgjs/common";
import { RpgPlayer, type RpgMap } from "@rpgjs/server";
import studioServer, {
  createStudioMapUpdatePayload,
  resolveRuntimeEventHitbox,
} from "../src/server";
import {
  configureGameDataProvider,
  configureStudioGameRuntime,
  resetGameDataProvider,
} from "../src/data-provider";
import type { GameDataProvider } from "../src/server-entry";

afterEach(() => {
  delete (globalThis as typeof globalThis & { gameConfig?: unknown }).gameConfig;
  configureStudioGameRuntime({ projectId: null });
  resetGameDataProvider();
});

describe("Studio server runtime", () => {
  test("starts a player immediately when autoStart is enabled", async () => {
    const calls: string[] = [];
    const player = {
      initializeDefaultStats() {
        calls.push("initialize");
      },
      async changeMap(mapId: string) {
        calls.push(`map:${mapId}`);
      },
    };
    const hooks = (studioServer({
      autoStart: true,
      startMapId: "requested-map",
    }) as any).player;

    await hooks.onConnected(player);
    await hooks.onStart(player);

    expect(calls).toEqual(["initialize", "map:requested-map"]);
  });

  test.each([
    { label: "by default", autoStart: undefined },
    { label: "when autoStart is disabled", autoStart: false },
  ])("keeps the title-screen start flow $label", async ({ autoStart }) => {
    const initializeDefaultStats = vi.fn();
    const changeMap = vi.fn(async () => true);
    const player = {
      initializeDefaultStats,
      changeMap,
    };
    const hooks = (studioServer({
      autoStart,
      startMapId: "requested-map",
    }) as any).player;

    await hooks.onConnected(player);
    expect(initializeDefaultStats).not.toHaveBeenCalled();
    expect(changeMap).not.toHaveBeenCalled();

    await hooks.onStart(player);
    expect(changeMap).toHaveBeenCalledOnce();
    expect(changeMap).toHaveBeenCalledWith("requested-map");
  });

  test("resolves the project start map for immediate startup", async () => {
    const getProject = vi.fn(async () => ({
      _id: "auto-start-project",
      startMapId: "project-start-map",
    }));
    configureGameDataProvider({
      kind: "online",
      getProject,
      getMap: vi.fn(),
      getMedia: vi.fn(),
      getDatabase: vi.fn(async () => []),
    });
    const initializeDefaultStats = vi.fn();
    const changeMap = vi.fn(async () => true);
    const hooks = (studioServer({
      autoStart: true,
      projectId: "auto-start-project",
    }) as any).player;

    await hooks.onConnected({
      initializeDefaultStats,
      changeMap,
    });

    expect(getProject).toHaveBeenCalledWith({
      projectId: "auto-start-project",
    });
    expect(initializeDefaultStats).toHaveBeenCalledOnce();
    expect(changeMap).toHaveBeenCalledWith("project-start-map");
  });

  test("starts directly when the project disables the title screen", async () => {
    configureGameDataProvider({
      kind: "online",
      getProject: vi.fn(async () => ({
        _id: "no-title-project",
        startMapId: "first-map",
        menus: {
          titleScreen: { enabled: false, guiId: null },
        },
      })),
      getMap: vi.fn(),
      getMedia: vi.fn(),
      getDatabase: vi.fn(async () => []),
    });
    const initializeDefaultStats = vi.fn();
    const changeMap = vi.fn(async () => true);
    const hooks = (studioServer({
      projectId: "no-title-project",
    }) as any).player;

    await hooks.onConnected({ initializeDefaultStats, changeMap });
    await hooks.onStart({ initializeDefaultStats, changeMap });

    expect(initializeDefaultStats).toHaveBeenCalledOnce();
    expect(changeMap).toHaveBeenCalledOnce();
    expect(changeMap).toHaveBeenCalledWith("first-map");
  });

  test("does not open the main menu when its project binding is disabled", () => {
    const callMainMenu = vi.fn();
    const hooks = (studioServer() as any).player;
    const player = {
      callMainMenu,
      getCurrentMap: () => ({
        globalConfig: {
          menus: {
            mainMenu: { enabled: false, guiId: null },
          },
        },
      }),
    };

    hooks.onInput(player, { action: "escape" });

    expect(callMainMenu).not.toHaveBeenCalled();
  });

  test("uses an injected provider to prepare trusted map updates", async () => {
    const getProject = vi.fn(async () => ({
      _id: "trusted-project",
      startMapId: "trusted-map",
    }));
    const getMap = vi.fn(async () => ({
      _id: "trusted-map",
      projectId: "trusted-project",
      creationDetails: { version: "v2" },
      params: { width: 2, height: 3 },
      events: [{
        id: "event-1",
        params: { graphic: { _id: "#hero-media" } },
      }],
      commonEvents: [{
        id: "common-event-1",
        triggers: [{ graphic: { mediaId: "trigger-media" } }],
      }],
      terrain: [],
      terrainByTileset: [],
    }));
    const getMedia = vi.fn(async (mediaId: string) => ({
      _id: mediaId,
      url: `https://private.example/${mediaId}.png`,
    }));
    const getDatabase = vi.fn(async () => [{
      _id: "potion",
      itemType: "item",
      name: "Trusted potion",
    }]);
    const dataProvider: GameDataProvider = {
      kind: "online",
      getProject,
      getMap,
      getMedia,
      getDatabase,
    };

    const payload = await createStudioMapUpdatePayload("trusted-map", {
      projectId: "trusted-project",
      dataProvider,
    });

    expect(getProject).toHaveBeenCalledWith({ projectId: "trusted-project" });
    expect(getMap).toHaveBeenCalledWith("trusted-map");
    expect(getMedia.mock.calls.map(([mediaId]) => mediaId)).toEqual([
      "hero-media",
      "trigger-media",
    ]);
    expect(getDatabase).toHaveBeenCalledWith("trusted-project");
    expect(payload.database).toEqual([expect.objectContaining({
      _id: "potion",
      name: "Trusted potion",
    })]);
    expect(payload.events[0].params.graphic).toEqual(expect.objectContaining({
      _id: "hero-media",
      url: "https://private.example/hero-media.png",
    }));
  });

  test.each([
    {
      label: "record arrays",
      published: [
        { _id: "potion", itemType: "item", name: "Published potion" },
      ],
      expected: {
        potion: {
          id: "potion",
          _type: "item",
          name: "Published potion",
        },
      },
    },
    {
      label: "normalized objects",
      published: {
        potion: {
          id: "potion",
          _type: "item",
          name: "Published potion",
        },
      },
      expected: {
        potion: {
          id: "potion",
          _type: "item",
          name: "Published potion",
        },
      },
    },
  ])("loads published Studio database $label without an HTTP fallback", async ({
    published,
    expected,
  }) => {
    const getDatabase = vi.fn(async () => {
      throw new Error("The published database should avoid the HTTP provider");
    });
    configureGameDataProvider({
      kind: "online",
      getProject: vi.fn(),
      getMap: vi.fn(),
      getMedia: vi.fn(),
      getDatabase,
    });
    const loadDatabase = (studioServer() as any).database as (
      map: Pick<RpgMap, "data">,
    ) => Promise<Record<string, any>>;

    await expect(loadDatabase({
      data: () => ({ database: published }),
    } as Pick<RpgMap, "data">)).resolves.toMatchObject(expected);
    expect(getDatabase).not.toHaveBeenCalled();
  });

  test("initializes starting inventory and equipment from the published database", async () => {
    const getDatabase = vi.fn(async () => {
      throw new Error("Player initialization should use the published database");
    });
    configureGameDataProvider({
      kind: "online",
      getProject: vi.fn(),
      getMap: vi.fn(),
      getMedia: vi.fn(),
      getDatabase,
    });
    const database = {
      potion: {
        id: "potion",
        _type: "item",
        name: "Published potion",
      },
      sword: {
        id: "sword",
        _type: "weapon",
        name: "Published sword",
      },
    };
    const map = {
      globalConfig: {
        startMapId: "published-map",
        hero: {
          startingInventory: [{ itemId: "potion", amount: 2 }],
          startingEquipment: { weapon: "sword" },
        },
      },
      database: () => database,
      addInDatabase: vi.fn(),
      startPosition: { x: 0, y: 0 },
      scale: 1,
    } as unknown as RpgMap;
    const player = new RpgPlayer();
    player.initializeDefaultStats();
    player.setMap(map);

    await (studioServer() as any).player.onJoinMap(player, map);

    expect(player.getItem("potion")?.quantity()).toBe(2);
    expect(player.getItem("sword")?.quantity()).toBe(1);
    expect(player.equipments().some((item) => item.id() === "sword")).toBe(true);
    expect(getDatabase).not.toHaveBeenCalled();
  });

  test("ignores incompatible starting equipment without adding it to inventory", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const database = {
      potion: {
        id: "potion",
        _type: "item",
        name: "Potion",
      },
      helmet: {
        id: "helmet",
        _type: "armor",
        name: "Helmet",
      },
    };
    const map = {
      globalConfig: {
        startMapId: "published-map",
        hero: {
          startingEquipment: {
            weaponId: "potion",
            armorId: "helmet",
          },
        },
      },
      database: () => database,
      addInDatabase: vi.fn(),
      startPosition: { x: 0, y: 0 },
      scale: 1,
    } as unknown as RpgMap;
    const player = new RpgPlayer();
    player.initializeDefaultStats();
    player.setMap(map);

    await (studioServer() as any).player.onJoinMap(player, map);

    expect(player.getItem("potion")).toBeUndefined();
    expect(player.getItem("helmet")?.quantity()).toBe(1);
    expect(player.equipments().some((item) => item.id() === "helmet")).toBe(true);
    expect(warn).toHaveBeenCalledWith(
      "[StudioGame] starting equipment weaponId=potion must reference a weapon, received item",
    );
    warn.mockRestore();
  });

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

  test("refreshes online item records when a player joins an existing map", async () => {
    const staleOnUse = vi.fn();
    const database: Record<string, any> = {
      potion: {
        id: "potion",
        _type: "item",
        useAnimation: "old-animation",
        onUse: staleOnUse,
      },
    };
    const getDatabase = vi.fn(async () => [{
      _id: "potion",
      itemType: "item",
      name: "Potion",
      useAnimation: null,
      useParticleEffect: "none",
    }]);
    configureGameDataProvider({
      kind: "online",
      getProject: vi.fn(),
      getMap: vi.fn(),
      getMedia: vi.fn(),
      getDatabase,
    });
    const map = {
      globalConfig: {
        _id: "live-project",
        startMapId: "live-map",
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

    await (studioServer() as any).player.onJoinMap(player, map);

    expect(getDatabase).toHaveBeenCalledWith("live-project");
    expect(database.potion).not.toHaveProperty("useAnimation");
    expect(database.potion).not.toHaveProperty("onUse");
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
