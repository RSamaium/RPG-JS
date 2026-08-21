import { afterEach, describe, expect, test, vi } from "vitest";
import { Direction, MAXHP, MAXSP, WorldMapsManager } from "@rpgjs/common";
import { RpgPlayer, type RpgMap } from "@rpgjs/server";
import studioServer, {
  createStudioMapUpdatePayload,
  prepareStudioWorldMaps,
  resolveRuntimeEventHitbox,
} from "../src/server";
import {
  configureGameDataProvider,
  configureStudioGameRuntime,
  resetGameDataProvider,
} from "../src/data-provider";
import type { GameDataProvider } from "../src/server-entry";

const acceptedContext = (query: Record<string, string> = {}) => ({
  connection: {
    id: "connection-1",
    state: null,
    setState: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
  },
  query,
  headers: {},
});

afterEach(() => {
  delete (globalThis as typeof globalThis & { gameConfig?: unknown }).gameConfig;
  configureStudioGameRuntime({ projectId: null });
  resetGameDataProvider();
});

describe("Studio server runtime", () => {
  test("publishes the generated Studio class in every map database", async () => {
    const databaseProvider = (studioServer() as any).database as (map: RpgMap) => Promise<Record<string, any>>;
    const database = await databaseProvider({
      data: () => ({
        config: {
          skills: [{ level: 1, skillId: "fire" }],
        },
        database: [],
      }),
    } as unknown as RpgMap);

    expect(database["studio-default-class"]).toEqual({
      id: "studio-default-class",
      name: "Studio Default Class",
      skillsToLearn: [{ level: 1, skill: "fire", source: "studio" }],
    });
  });

  test("normalizes real Studio world coordinates to touching pixel edges", () => {
    const [startMap, upperMap] = prepareStudioWorldMaps([
      {
        id: "333a4ea7-3c10-4bc8-b9be-acafe9d2c06b",
        worldX: -1432,
        worldY: -1040,
        width: 2400,
        height: 2400,
      },
      {
        id: "77a61765-58cd-41fa-a1a9-7f71ec2333cb",
        worldX: -1433,
        worldY: -1211,
        width: 1440,
        height: 960,
      },
    ]);
    const worldMaps = new WorldMapsManager();
    worldMaps.configure([startMap, upperMap]);

    expect(startMap.worldY).toBe(-5840);
    expect(upperMap.worldY).toBe(-6800);
    expect(upperMap.worldY + upperMap.height).toBe(startMap.worldY);
    expect(worldMaps.getAdjacentMaps(worldMaps.getMapInfo(startMap.id)!, Direction.Up))
      .toEqual([expect.objectContaining({ id: upperMap.id })]);
    expect(worldMaps.getAdjacentMaps(worldMaps.getMapInfo(upperMap.id)!, Direction.Down))
      .toEqual([expect.objectContaining({ id: startMap.id })]);
  });

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

    await hooks.onAccepted(player, acceptedContext());
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

    await hooks.onAccepted(player, acceptedContext());
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

    await hooks.onAccepted({
      initializeDefaultStats,
      changeMap,
    }, acceptedContext());

    expect(getProject).toHaveBeenCalledWith({
      projectId: "auto-start-project",
    });
    expect(initializeDefaultStats).toHaveBeenCalledOnce();
    expect(changeMap).toHaveBeenCalledWith("project-start-map");
  });

  test("resolves player-specific startup settings on a shared MMORPG server", async () => {
    const getProject = vi.fn(async ({ projectId }: { projectId?: string }) => ({
      _id: projectId,
      startMapId: `${projectId}-start`,
    }));
    configureGameDataProvider({
      kind: "online",
      getProject,
      getMap: vi.fn(),
      getMedia: vi.fn(),
      getDatabase: vi.fn(async () => []),
    });
    const resolveStartup = vi.fn(async ({ query }: { query: Record<string, string> }) => ({
      projectId: query.game,
      flow: "title" as const,
    }));
    const hooks = (studioServer({ resolveStartup }) as any).player;
    const firstPlayer = { id: "project-a:player-1", changeMap: vi.fn(async () => true) };
    const secondPlayer = { id: "project-b:player-2", changeMap: vi.fn(async () => true) };

    await hooks.onAccepted(firstPlayer, acceptedContext({ game: "project-a" }));
    await hooks.onAccepted(secondPlayer, acceptedContext({ game: "project-b" }));
    expect(firstPlayer.changeMap).not.toHaveBeenCalled();
    expect(secondPlayer.changeMap).not.toHaveBeenCalled();

    await hooks.onStart(firstPlayer);
    await hooks.onStart(secondPlayer);

    expect(firstPlayer.changeMap).toHaveBeenCalledWith("project-a-start");
    expect(secondPlayer.changeMap).toHaveBeenCalledWith("project-b-start");
    expect(getProject).toHaveBeenCalledWith({ projectId: "project-a" });
    expect(getProject).toHaveBeenCalledWith({ projectId: "project-b" });
    expect(resolveStartup).toHaveBeenCalledTimes(2);
  });

  test("skips character selection for a player-specific direct map startup", async () => {
    configureGameDataProvider({
      kind: "online",
      getProject: vi.fn(async (query: { projectId?: string; mapId?: string }) => ({
        _id: query.projectId ?? (query.mapId === "requested-map" ? "project-a" : undefined),
      })),
      getMap: vi.fn(),
      getMedia: vi.fn(),
      getDatabase: vi.fn(async () => []),
    });
    const showCharacterSelect = vi.fn();
    const changeMap = vi.fn(async () => true);
    const player = {
      id: "project-a:player-1",
      initializeDefaultStats: vi.fn(),
      showCharacterSelect,
      changeMap,
    };
    const hooks = (studioServer({
      resolveStartup: async () => ({
        projectId: "project-a",
        flow: "direct",
        mapId: "requested-map",
      }),
    }) as any).player;

    await hooks.onAccepted(player, acceptedContext({ game: "project-a", map: "requested-map" }));

    expect(player.initializeDefaultStats).toHaveBeenCalledOnce();
    expect(showCharacterSelect).not.toHaveBeenCalled();
    expect(changeMap).toHaveBeenCalledWith("requested-map");
  });

  test("rejects a direct map owned by another Studio project without fallback", async () => {
    configureGameDataProvider({
      kind: "online",
      getProject: vi.fn(async (query: { projectId?: string; mapId?: string }) => ({
        _id: query.projectId ?? (query.mapId ? "project-b" : undefined),
      })),
      getMap: vi.fn(),
      getMedia: vi.fn(),
      getDatabase: vi.fn(async () => []),
    });
    const player = {
      initializeDefaultStats: vi.fn(),
      changeMap: vi.fn(),
    };
    const hooks = (studioServer({
      resolveStartup: async () => ({
        projectId: "project-a",
        flow: "direct",
        mapId: "project-b-map",
      }),
    }) as any).player;

    await expect(hooks.onAccepted(
      player,
      acceptedContext({ game: "project-a", map: "project-b-map" }),
    )).rejects.toMatchObject({
      name: "StudioStartupError",
      code: "MAP_PROJECT_MISMATCH",
    });
    expect(player.initializeDefaultStats).not.toHaveBeenCalled();
    expect(player.changeMap).not.toHaveBeenCalled();
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

    const player = { initializeDefaultStats, changeMap };
    await hooks.onAccepted(player, acceptedContext());
    await hooks.onStart(player);

    expect(initializeDefaultStats).toHaveBeenCalledOnce();
    expect(changeMap).toHaveBeenCalledOnce();
    expect(changeMap).toHaveBeenCalledWith("first-map");
  });

  test("selects and applies an actor before the first map of a new game", async () => {
    const actors = [
      {
        _id: "actor-1",
        type: "actor",
        name: "Ayla",
        description: "Swift and precise",
        graphic: "ayla",
        classId: "ranger-class",
        parameters: { maxHp: { start: 90, end: 500 }, agi: { start: 18, end: 90 } },
      },
      { _id: "actor-2", type: "actor", name: "Borin", graphic: "borin", classId: "knight-class" },
      {
        _id: "ranger-class",
        type: "class",
        name: "Ranger",
        description: "A fast ranged fighter",
        icon: "bow-icon",
        skills: [{ skillId: "arrow-rain", level: 3 }],
      },
      { _id: "knight-class", type: "class", name: "Knight", skills: [{ skillId: "guard", level: 1 }] },
    ];
    configureGameDataProvider({
      kind: "online",
      getProject: vi.fn(async () => ({
        _id: "character-select-project",
        startMapId: "first-map",
        mainActorId: "actor-1",
        menus: {
          titleScreen: { enabled: false },
          characterSelect: {
            enabled: true,
            settings: { allActors: false, actorIds: ["actor-2", "actor-1"] },
          },
        },
      })),
      getMap: vi.fn(),
      getMedia: vi.fn(async (id: string) => ({
        _id: id,
        type: "spritesheet",
        fileName: `${id}.png`,
        metadata: id === "ayla" ? { illustration: "ayla-art" } : {},
      })),
      getDatabase: vi.fn(async () => actors),
    });
    const showCharacterSelect = vi.fn(async () => ({ id: "actor-2", name: "Borin" }));
    const setActor = vi.fn();
    const changeMap = vi.fn(async () => true);
    const player: any = {
      initializeDefaultStats: vi.fn(),
      showCharacterSelect,
      setActor,
      changeMap,
    };
    const hooks = (studioServer({ projectId: "character-select-project" }) as any).player;

    expect(hooks.props.studioSelectedActorId).toEqual({
      $default: null,
      $syncWithClient: false,
      $permanent: true,
    });

    await hooks.onAccepted(player, acceptedContext());

    expect(showCharacterSelect).toHaveBeenCalledWith([
      expect.objectContaining({ id: "actor-2", name: "Borin", graphic: "borin" }),
      expect.objectContaining({
        id: "actor-1",
        name: "Ayla",
        graphic: "ayla",
        illustration: "ayla-art",
        class: expect.objectContaining({
          id: "ranger-class",
          name: "Ranger",
          icon: "bow-icon",
          skillsToLearn: [{ level: 3, skill: "arrow-rain", source: "studio" }],
        }),
        parameters: expect.objectContaining({ maxHp: { start: 90, end: 500 } }),
      }),
    ], expect.objectContaining({ selectedActorId: "actor-1", allowCancel: false }));
    expect(setActor).toHaveBeenCalledWith(expect.objectContaining({
      id: "actor-2",
      name: "Borin",
      class: expect.objectContaining({ id: "knight-class", name: "Knight" }),
    }));
    expect(player.studioSelectedActorId).toBe("actor-2");
    expect(changeMap).toHaveBeenCalledWith("first-map");
  });

  test("skips an invalid character selection and keeps the main actor fallback", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    configureGameDataProvider({
      kind: "online",
      getProject: vi.fn(async () => ({
        _id: "empty-character-select-project",
        startMapId: "first-map",
        menus: {
          titleScreen: { enabled: false },
          characterSelect: {
            enabled: true,
            settings: { allActors: false, actorIds: ["deleted-actor"] },
          },
        },
      })),
      getMap: vi.fn(),
      getMedia: vi.fn(),
      getDatabase: vi.fn(async () => [
        { _id: "actor-1", type: "actor", name: "Ayla" },
      ]),
    });
    const showCharacterSelect = vi.fn();
    const changeMap = vi.fn(async () => true);
    const hooks = (studioServer({ projectId: "empty-character-select-project" }) as any).player;

    await hooks.onAccepted({
      initializeDefaultStats: vi.fn(),
      showCharacterSelect,
      setActor: vi.fn(),
      changeMap,
    }, acceptedContext());

    expect(showCharacterSelect).not.toHaveBeenCalled();
    expect(changeMap).toHaveBeenCalledWith("first-map");
    expect(warn).toHaveBeenCalledWith(
      "[StudioGame] character select has no valid actors; using the project main actor",
    );
    warn.mockRestore();
  });

  test("keeps the main actor fallback when character select actors cannot be loaded", async () => {
    const error = new Error("database unavailable");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    configureGameDataProvider({
      kind: "online",
      getProject: vi.fn(async () => ({
        _id: "unavailable-character-select-project",
        startMapId: "first-map",
        menus: {
          titleScreen: { enabled: false },
          characterSelect: { enabled: true, settings: { allActors: true, actorIds: [] } },
        },
      })),
      getMap: vi.fn(),
      getMedia: vi.fn(),
      getDatabase: vi.fn(async () => { throw error; }),
    });
    const showCharacterSelect = vi.fn();
    const changeMap = vi.fn(async () => true);
    const hooks = (studioServer({ projectId: "unavailable-character-select-project" }) as any).player;

    await hooks.onAccepted({
      initializeDefaultStats: vi.fn(),
      showCharacterSelect,
      setActor: vi.fn(),
      changeMap,
    }, acceptedContext());

    expect(showCharacterSelect).not.toHaveBeenCalled();
    expect(changeMap).toHaveBeenCalledWith("first-map");
    expect(warn).toHaveBeenCalledWith(
      "[StudioGame] character select actors could not be loaded; using the project main actor",
      error,
    );
    warn.mockRestore();
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
      params: { width: 2, height: 3, scale: 2 },
      start: { x: 24, y: 36 },
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
    expect(payload.positions?.start).toEqual({ x: 48, y: 72 });
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

  test("applies the selected actor resources and actor skills on map join", async () => {
    const records = [
      {
        _id: "actor-luna",
        type: "actor",
        name: "Luna",
        graphic: "luna-graphic",
        classId: "class-warrior",
        parameters: {
          [MAXHP]: { start: 420, end: 4200 },
          [MAXSP]: { start: 900, end: 7000 },
        },
        skills: [{ skillId: "skill-heal", level: 1 }],
      },
      {
        _id: "class-warrior",
        type: "class",
        name: "Warrior",
        skills: [],
      },
      {
        _id: "skill-heal",
        type: "skill",
        name: "Soin astral",
        spCost: 12,
        power: 35,
      },
    ];
    configureGameDataProvider({
      kind: "online",
      getProject: vi.fn(),
      getMap: vi.fn(),
      getMedia: vi.fn(),
      getDatabase: vi.fn(async () => records),
    });
    const database: Record<string, any> = {};
    const map = {
      globalConfig: {
        _id: "actor-project",
        startMapId: "actor-map",
        hero: {
          graphic: "fallback-graphic",
          parameters: {
            [MAXHP]: { start: 741, end: 7467 },
            [MAXSP]: { start: 534, end: 5500 },
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
    const player = new RpgPlayer() as RpgPlayer & {
      studioSelectedActorId: (() => string | null) & { set(value: string | null): void };
    };
    player.setSync({
      studioSelectedActorId: {
        $default: null,
        $syncWithClient: false,
        $permanent: true,
      },
    });
    player.studioSelectedActorId.set("actor-luna");
    (player as any).execMethod = vi.fn(async () => undefined);
    player.initializeDefaultStats();
    player.setMap(map);

    await (studioServer() as any).player.onJoinMap(player, map);

    expect(player.graphics()).toContain("luna-graphic");
    expect(player.hp).toBe(420);
    expect(player.sp).toBe(900);
    expect(player.getSkill("skill-heal")).toBeDefined();
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

  test("applies the named start position before refreshing the online database", async () => {
    let resolveDatabase!: (records: any[]) => void;
    const getDatabase = vi.fn(() => new Promise<any[]>((resolve) => {
      resolveDatabase = resolve;
    }));
    configureGameDataProvider({
      kind: "online",
      getProject: vi.fn(),
      getMap: vi.fn(),
      getMedia: vi.fn(),
      getDatabase,
    });
    const map = {
      globalConfig: {
        _id: "start-project",
        startMapId: "start-map",
        hero: {},
      },
      data: () => ({
        positions: {
          start: { x: 292, y: 550 },
        },
      }),
      database: () => ({}),
      addInDatabase: vi.fn(),
      scale: 1,
    } as unknown as RpgMap;
    const player = new RpgPlayer();
    player.initializeDefaultStats();
    player.setMap(map);

    const joining = (studioServer() as any).player.onJoinMap(player, map);

    await vi.waitFor(() => expect(getDatabase).toHaveBeenCalledWith("start-project"));
    expect(player.x()).toBe(292);
    expect(player.y()).toBe(550);

    resolveDatabase([]);
    await joining;
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
