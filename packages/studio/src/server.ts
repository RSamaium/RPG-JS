import { Move, RpgEvent, RpgMap, RpgPlayer, RpgServer } from "@rpgjs/server";
import { defineModule, normalizeLightingState, WorldMapsManager } from "@rpgjs/common";
import { BlockExecutionService } from "./block-executor";
import { apiUrl } from "./constants";
import { RATIO_MAP_X, RATIO_MAP_Y } from "@common/map";
import { matchesPageConditions } from "@common/blocks";
import type { ProjectBasic } from "@common/types/project";
import {
  applyTriggerSettings,
  getEventTypeRuntime,
  getGraphicKey,
  getGraphicScale,
  RpgMapExtended,
} from "./event-type-runtime";
import { normalizeEventType } from "@common/event-types";
import { normalizeWeatherState } from "@common/weather";
import {
  getGameDataProvider,
  getStudioGameRuntimeConfig,
} from "./data-provider";
import type { GameRuntimeMode } from "./data-provider";
import {
  normalizeStudioDatabase,
  normalizeStudioDatabaseRecord,
} from "./database-normalizer";
import { createStudioDefaultClass } from "./skills-to-learn";
import { getStudioSkillChangeNotification } from "./skill-notification";
export { createStudioActionBattleAnimations } from "./action-battle-animations";
export type {
  StudioCombatAnimationIds,
  StudioCombatAnimationOptions,
} from "./action-battle-animations";

const mergePlayerConfig = (
  baseConfig: ProjectBasic = {},
  overrideConfig?: Partial<ProjectBasic> | null,
): ProjectBasic => {
  if (!overrideConfig) {
    return {
      ...baseConfig,
    };
  }

  return {
    ...baseConfig,
    ...overrideConfig,
    expCurve: overrideConfig.expCurve ?? baseConfig.expCurve,
    parameters: {
      ...(baseConfig.parameters ?? {}),
      ...(overrideConfig.parameters ?? {}),
    },
    startingInventory: overrideConfig.startingInventory ?? baseConfig.startingInventory,
    skillsToLearn:
      overrideConfig.skillsToLearn ??
      overrideConfig.skills ??
      baseConfig.skillsToLearn ??
      baseConfig.skills,
    startingEquipment: {
      ...(baseConfig.startingEquipment ?? {}),
      ...(overrideConfig.startingEquipment ?? {}),
    },
    animations: {
      ...(baseConfig.animations ?? {}),
      ...(overrideConfig.animations ?? {}),
    },
  };
};

const readGameConfig = (): any => {
  const globalScope = globalThis as typeof globalThis & {
    gameConfig?: any;
    window?: { gameConfig?: any };
  };

  return globalScope.window?.gameConfig ?? globalScope.gameConfig ?? {};
};

const resolvePlayerConfig = async (player: RpgPlayer): Promise<ProjectBasic> => {
  const gameConfig = readGameConfig();
  const baseHeroConfig = {
    ...(gameConfig.hero ?? {}),
    skillsToLearn:
      gameConfig.skillsToLearn ??
      gameConfig.skills ??
      gameConfig.hero?.skillsToLearn ??
      gameConfig.hero?.skills,
    animations: gameConfig.animations ?? gameConfig.hero?.animations,
  } as ProjectBasic;
  const provider = getGameDataProvider();
  const providerStartConfig = provider.getPlayerStartConfig;

  if (!providerStartConfig) {
    return baseHeroConfig;
  }

  try {
    const configuredProjectId = getStudioGameRuntimeConfig().projectId?.trim() || null;
    const overrideConfig = await providerStartConfig.call(provider, {
      player,
      heroConfig: baseHeroConfig,
      gameConfig,
      projectId: configuredProjectId || gameConfig?._id || null,
      mapId: gameConfig?.startMapId || null,
    });

    return mergePlayerConfig(baseHeroConfig, overrideConfig);
  } catch (error) {
    console.error("[StudioGame] getPlayerStartConfig failed", error);
    return baseHeroConfig;
  }
};

const startGame = async (player: RpgPlayer, map?: RpgMap) => {
  const heroConfig = await resolvePlayerConfig(player);
  (player as any).studioCombatAnimations = heroConfig.animations ?? {};
  (player as any).combatAnimations = heroConfig.animations ?? {};
  const startingItems = await ensureStartingItemsInDatabase(player, heroConfig, map);
  assignPlayerStartParams(player, heroConfig, startingItems);
};

const applyStartGameOnce = async (player: RpgPlayer, map?: RpgMap) => {
  const runtimePlayer = player as RpgPlayer & { __studioStartGameApplied?: boolean };
  if (runtimePlayer.__studioStartGameApplied) return;
  await startGame(player, map);
  runtimePlayer.__studioStartGameApplied = true;
};

const collectStartingItemIds = (config: ProjectBasic): string[] => {
  const ids = new Set<string>();

  for (const item of config.startingInventory ?? []) {
    if (item?.itemId) ids.add(item.itemId);
  }

  for (const itemId of Object.values(config.startingEquipment ?? {})) {
    if (itemId) ids.add(itemId);
  }

  return [...ids];
};

const assignPlayerStartParams = (
  player: RpgPlayer,
  config: ProjectBasic,
  startingItems: Record<string, any> = {},
) => {
  const defaultClass = createStudioDefaultClass(config.skillsToLearn);
  const currentClass = (player as any)._class?.();
  const hasCurrentClass =
    currentClass &&
    typeof currentClass === "object" &&
    Object.keys(currentClass).length > 0;
  if (defaultClass && !hasCurrentClass && (player as any)._class?.set) {
    (player as any)._class.set(defaultClass);
  }

  player.level = config.initialLevel ?? 1;
  player.finalLevel = config.finalLevel ?? 99;
  player.expCurve = config.expCurve ?? {
    basis: 30,
    extra: 20,
    accelerationA: 30,
    accelerationB: 30,
  };

  if (config.parameters) {
    for (const paramName in config.parameters) {
      player.setParameter(paramName, config.parameters[paramName]);
    }
  }

  if (config.startingInventory) {
    for (const item of config.startingInventory) {
      if (!item.itemId) continue;
      const itemData = startingItems[item.itemId];
      if (!itemData) {
        console.warn(`[StudioGame] starting inventory item ${item.itemId} was not found in the database`);
        continue;
      }
      player.addItem(itemData, item.amount);
    }
  }

  if (config.startingEquipment) {
    for (const type in config.startingEquipment) {
      const itemId = config.startingEquipment[type];
      if (!itemId) continue;
      const itemData = startingItems[itemId];
      if (!itemData) {
        console.warn(`[StudioGame] starting equipment item ${itemId} was not found in the database`);
        continue;
      }
      if (!player.getItem(itemId)) {
        player.addItem(itemData, 1);
      }
      player.equip(itemId, "auto");
    }
  }
};

const notifySkillChange = (player: RpgPlayer, payload: any) => {
  const notification = getStudioSkillChangeNotification(payload);

  player.showNotification(notification.message, { type: notification.type });
};

const ensureStartingItemsInDatabase = async (
  player: RpgPlayer,
  config: ProjectBasic,
  mapOverride?: RpgMap,
): Promise<Record<string, any>> => {
  const itemIds = collectStartingItemIds(config);
  if (itemIds.length === 0) return {};

  const map = mapOverride || (player as any).getCurrentMap?.() || (player as any).map;
  if (!map?.database || !map?.addInDatabase) return {};

  const database = map.database();
  const missingIds = itemIds.filter((itemId) => !database[itemId]);
  const startingItems = itemIds.reduce<Record<string, any>>((items, itemId) => {
    if (database[itemId]) {
      items[itemId] = database[itemId];
    }
    return items;
  }, {});
  if (missingIds.length === 0) return startingItems;

  const gameConfig = readGameConfig();
  const configuredProjectId = getStudioGameRuntimeConfig().projectId?.trim() || null;
  const projectId = configuredProjectId || gameConfig?._id || null;

  try {
    const records = await getGameDataProvider().getDatabase(projectId ?? undefined);
    const missing = new Set(missingIds);

    for (const record of records) {
      const normalized = normalizeStudioDatabaseRecord(record);
      if (!normalized || !missing.has(normalized.id)) continue;
      map.addInDatabase(normalized.id, normalized.data, { force: true });
      startingItems[normalized.id] = normalized.data;
      missing.delete(normalized.id);
    }
  } catch (error) {
    console.error("[StudioGame] starting items database preload failed", error);
  }

  return startingItems;
};

const databaseCacheByProjectId = new Map<string, any>();
const eventsCacheByBundlePath = new Map<string, Promise<any[]>>();
const projectCacheByKey = new Map<string, Promise<any>>();

type StudioServerConfig = {
  projectId?: string | null;
  startMapId?: string;
  runtimeMode?: GameRuntimeMode;
};

const ensureLeadingSlash = (value: string): string => {
  if (!value) return "/game-data";
  return value.startsWith("/") ? value : `/${value}`;
};

const normalizeBundlePath = (value?: string): string => {
  const normalized = ensureLeadingSlash(value || "/game-data");
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
};

const parseArrayValue = (value: unknown): any[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const fetchBundleEvents = async (): Promise<any[]> => {
  const basePath = normalizeBundlePath(getStudioGameRuntimeConfig().bundleBasePath);
  if (!eventsCacheByBundlePath.has(basePath)) {
    const promise = fetch(`${basePath}/events.json`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`events.json read failed (${response.status})`);
        }
        return response.json();
      })
      .then((value) => (Array.isArray(value) ? value : []))
      .catch(() => []);
    eventsCacheByBundlePath.set(basePath, promise);
  }
  return eventsCacheByBundlePath.get(basePath)!;
};

const toIdentifierString = (value: unknown): string => {
  if (typeof value === "string" || typeof value === "number") {
    const result = String(value).trim();
    return result.startsWith("#") ? result.slice(1) : result;
  }
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  return (
    toIdentifierString(record._id) ||
    toIdentifierString(record.id) ||
    toIdentifierString(record.mediaId) ||
    toIdentifierString(record.referenceId)
  );
};

const resolveMediaReference = async (value: unknown): Promise<unknown> => {
  if (!value) return value;
  const referenceId = toIdentifierString(value);
  if (!referenceId) return value;

  const candidateIds = Array.from(
    new Set([
      referenceId,
      referenceId.startsWith("#") ? referenceId.slice(1) : referenceId,
    ].filter(Boolean)),
  );

  for (const candidateId of candidateIds) {
    try {
      const media = await getGameDataProvider().getMedia(candidateId);
      if (media && !media.__placeholder) {
        return value && typeof value === "object"
          ? { ...(value as Record<string, unknown>), ...media }
          : media;
      }
    } catch {
      // Keep the original reference when Studio cannot resolve it as media.
    }
  }

  return value;
};

const hydrateEventMediaReferences = async (events: any[]): Promise<any[]> => {
  return Promise.all(events.map(async (event) => {
    if (!event || typeof event !== "object") return event;
    const nextEvent = { ...event };
    if (nextEvent.params?.graphic) {
      nextEvent.params = {
        ...nextEvent.params,
        graphic: await resolveMediaReference(nextEvent.params.graphic),
      };
    }
    if (Array.isArray(nextEvent.triggers)) {
      nextEvent.triggers = await Promise.all(nextEvent.triggers.map(async (trigger: any) => {
        if (!trigger || typeof trigger !== "object") return trigger;
        if (!trigger.graphic) return trigger;
        return {
          ...trigger,
          graphic: await resolveMediaReference(trigger.graphic),
        };
      }));
    }
    return nextEvent;
  }));
};

const indexCommonEvents = (commonEvents: unknown): Map<string, any> => {
  const entries = parseArrayValue(commonEvents);
  const byId = new Map<string, any>();

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const ids = [record._id, record.id, record.commonEventId]
      .filter((value): value is string => typeof value === "string" && value.length > 0);
    ids.forEach((id) => byId.set(id, entry));
  }

  return byId;
};

const shouldUseLocalBundleEvents = (config: StudioServerConfig = {}): boolean => {
  const runtimeConfig = getStudioGameRuntimeConfig();
  const runtimeMode = config.runtimeMode ?? runtimeConfig.runtimeMode;
  if (runtimeMode === "online") return false;

  const gameConfig = readGameConfig();
  const projectId =
    config.projectId?.trim?.() ||
    runtimeConfig.projectId?.trim?.() ||
    gameConfig?._id ||
    null;

  return !projectId;
};

const resolveMapEventReferences = async (
  events: unknown,
  options: { useLocalBundleEvents: boolean },
): Promise<any[]> => {
  const list = parseArrayValue(events);
  if (list.length === 0) return [];
  if (!options.useLocalBundleEvents) return list;

  const hasEventIdReference = list.some(
    (entry) =>
      entry &&
      typeof entry === "object" &&
      typeof (entry as Record<string, unknown>).eventId === "string",
  );

  if (!hasEventIdReference) {
    return list;
  }

  const bundleEvents = await fetchBundleEvents();
  if (bundleEvents.length === 0) {
    return list;
  }

  const byId = new Map<string, any>();
  bundleEvents.forEach((entry) => {
    const ids = [
      entry?.eventId,
      entry?.id,
      entry?._id,
    ]
      .filter((value): value is string => typeof value === "string" && value.length > 0);
    ids.forEach((id) => byId.set(id, entry));
  });

  return list.map((entry) => {
    if (!entry || typeof entry !== "object") return entry;

    const candidate = entry as Record<string, unknown>;
    const refId = typeof candidate.eventId === "string" ? candidate.eventId : "";
    if (!refId) return entry;

    const resolved = byId.get(refId);
    if (!resolved) return entry;

    const x = typeof candidate.x === "number" ? candidate.x : resolved?.position?.x;
    const y = typeof candidate.y === "number" ? candidate.y : resolved?.position?.y;

    return {
      ...resolved,
      ...candidate,
      eventId: refId,
      id: resolved.id ?? resolved._id ?? refId,
      _id: resolved._id ?? resolved.id ?? refId,
      x,
      y,
      position: {
        ...(resolved.position || {}),
        ...(typeof x === "number" ? { x } : {}),
        ...(typeof y === "number" ? { y } : {}),
      },
    };
  });
};

const parseJsonValue = (value: unknown, fallback: any): any => {
  if (typeof value !== "string") return value ?? fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  try {
    return JSON.parse(trimmed);
  } catch {
    return fallback;
  }
};

const resolveStudioProject = async (
  mapId?: string,
  config: StudioServerConfig = {},
): Promise<any> => {
  const runtimeConfig = getStudioGameRuntimeConfig();
  const gameConfig = readGameConfig();
  const projectId =
    config.projectId?.trim?.() ||
    runtimeConfig.projectId?.trim?.() ||
    gameConfig?._id ||
    null;
  const cacheKey = projectId ? `project:${projectId}` : `map:${mapId ?? ""}`;

  if (!projectCacheByKey.has(cacheKey)) {
    const promise = getGameDataProvider()
      .getProject(projectId ? { projectId } : { mapId })
      .catch((error) => {
        projectCacheByKey.delete(cacheKey);
        console.warn("[StudioGame] project preload failed", error);
        return {};
      });
    projectCacheByKey.set(cacheKey, promise);
  }

  return projectCacheByKey.get(cacheKey)!;
};

const resolveStartMapId = async (config: StudioServerConfig): Promise<string> => {
  if (config.startMapId) return config.startMapId;

  const gameConfig = readGameConfig();
  if (gameConfig?.startMapId) return gameConfig.startMapId;

  const project = await resolveStudioProject(undefined, config);
  return project?.startMapId || "simplemap";
};

const normalizeStudioMapPayload = async (
  mapId: string,
  initialMapData: any,
  config: StudioServerConfig,
): Promise<any> => {
  if (initialMapData?.data?.params) return initialMapData;

  const [project, mapResponse] = await Promise.all([
    resolveStudioProject(mapId, config),
    getGameDataProvider().getMap(mapId),
  ]);
  const useLocalBundleEvents = shouldUseLocalBundleEvents(config);
  const params = mapResponse.params ?? {};
  const isV2 = mapResponse.creationDetails?.version === "v2";
  const resolvedEvents = await resolveMapEventReferences(
    mapResponse.events ?? mapResponse.data?.events,
    { useLocalBundleEvents },
  );
  const hydratedEvents = await hydrateEventMediaReferences(resolvedEvents);
  const mapDataValue = Array.isArray(mapResponse.data)
    ? mapResponse.data
    : parseJsonValue(mapResponse.data, []);
  const mergedHitboxes = [...(mapResponse.hitboxes ?? [])];

  if (Array.isArray(mapResponse.polygons)) {
    mapResponse.polygons.forEach((polygon: number[][], index: number) => {
      if (!Array.isArray(polygon) || polygon.length < 3) return;
      const xs = polygon.map((point) => point[0]);
      const ys = polygon.map((point) => point[1]);
      mergedHitboxes.push({
        id: `polygon_${index}`,
        points: polygon,
        x: Math.min(...xs),
        y: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
      });
    });
  }

  const normalizedMap = {
    ...mapResponse,
    id: mapResponse._id ?? mapResponse.id ?? mapId,
    data: mapDataValue,
    hitboxes: mergedHitboxes,
    events: hydratedEvents,
    commonEvents: parseArrayValue(mapResponse.commonEvents ?? mapResponse.data?.commonEvents),
    params,
  };

  return {
    ...initialMapData,
    id: normalizedMap.id,
    data: normalizedMap,
    events: hydratedEvents,
    commonEvents: normalizedMap.commonEvents,
    hitboxes: mergedHitboxes,
    width:
      initialMapData?.width ||
      (isV2 ? params.width * 48 : params.width) ||
      mapResponse.width ||
      1,
    height:
      initialMapData?.height ||
      (isV2 ? params.height * 48 : params.height) ||
      mapResponse.height ||
      1,
    config: {
      ...project,
      ...(initialMapData?.config ?? {}),
      startMapId: config.startMapId ?? project?.startMapId ?? mapId,
    },
  };
};

export default (_config?: unknown) => {
  const config = (_config ?? {}) as StudioServerConfig;

  return defineModule<RpgServer>({
    player: {
      onStart: async (player: RpgPlayer) => {
        await player.changeMap(await resolveStartMapId(config));
      },
      onJoinMap: async (player: RpgPlayer, map: RpgMap) => {
        const startMapId = map.globalConfig.startMapId;
        const mapExtended = map as RpgMapExtended;
        const heroGraphic = (mapExtended.globalConfig.hero as any)?.graphic;
        const heroGraphicKey = getGraphicKey(heroGraphic);
        if (heroGraphicKey) {
          (player as any)._graphicScale?.set(
            getGraphicScale(
              (mapExtended.globalConfig.hero as any)?.params,
              mapExtended.globalConfig.hero,
              heroGraphic,
            ) ?? null,
          );
          player.setGraphic(heroGraphicKey);
        } else {
          (player as any)._graphicScale?.set(null);
          player.setGraphic("default_character");
        }
        if (player.x() == 0 && player.y() == 0) {
          player.teleport({
            x: (mapExtended.startPosition?.x ?? 0) * mapExtended.scale,
            y: (mapExtended.startPosition?.y ?? 0) * mapExtended.scale,
          });
        }

        await applyStartGameOnce(player, map);
      },
      onInput: (player: RpgPlayer, input: { action: string }) => {
        if (input.action == "escape") {
          player.callMainMenu({
            menus: [
              {
                id: "items",
                label: "Items",
              },
              {
                id: "skills",
                label: "Skills",
              },
              {
                id: "equip",
                label: "Equipment",
              },
              {
                id: "save",
                label: "Save",
              },
            ],
          });
        }
      },
      onDead: async (player: RpgPlayer) => {
        const selection = await player.callGameover();
        if (selection?.id === "title") {
          await player.gui("rpg-title-screen").open();
        } else if (selection?.id === "load") {
          await player.showLoad();
        }
      },
      onLevelUp: async (player: RpgPlayer, nbLevel: number) => {
        player.showNotification(`You reached level ${player.level}`);
      },
      onSkillChange: async (player: RpgPlayer, payload: any) => {
        notifySkillChange(player, payload);
      },
    },
    map: {
      async onBeforeUpdate(mapData: any, map) {
        const mapExtended = map as RpgMapExtended;
        const useLocalBundleEvents = shouldUseLocalBundleEvents(config);
        const hydratedMapData = await normalizeStudioMapPayload(
          mapData?.id ?? mapData?.data?._id ?? mapData?.data?.id,
          mapData,
          config,
        );
        Object.assign(mapData, hydratedMapData);
        mapExtended.globalConfig = mapData.config ?? {};

        const resolvedEvents = await resolveMapEventReferences(
          mapData?.events ?? mapData?.data?.events,
          { useLocalBundleEvents },
        );
        const hydratedEvents = await hydrateEventMediaReferences(resolvedEvents);
        const resolvedEventsById = new Map<string, any>();
        hydratedEvents.forEach((entry) => {
          const id = String(entry?.eventId ?? entry?.id ?? entry?._id ?? "");
          if (id) resolvedEventsById.set(id, entry);
        });
        (mapExtended as any).__resolvedEventsById = resolvedEventsById;

        mapData.events = hydratedEvents;
        if (mapData?.data) {
          mapData.data.events = hydratedEvents;
        }
        const commonEvents = parseArrayValue(
          mapData?.commonEvents ?? mapData?.data?.commonEvents,
        );
        (mapExtended as any).__studioCommonEventsById = indexCommonEvents(commonEvents);
        mapData.commonEvents = commonEvents;
        if (mapData?.data) {
          mapData.data.commonEvents = commonEvents;
        }
        mapExtended.startPosition = mapData.data?.start;
        mapExtended.scale = mapData.data?.params?.scale || 1;
        const normalizedInitialWeather = normalizeWeatherState(
          mapData?.data?.weather,
        );
        if (mapData?.data) {
          mapData.data.weather = normalizedInitialWeather;
          mapData.data.lighting = normalizeLightingState(mapData?.data?.lighting);
        }
        // Add baseUrl to map context for use in block executors
        (mapExtended as any).apiBaseUrl = apiUrl;

        if (mapData.config?.worldMaps) {
          const worldManager = new WorldMapsManager();
          const worldMaps = mapData.config.worldMaps.map((worldMap: any) => ({
            ...worldMap,
            worldX: worldMap.worldX * RATIO_MAP_X,
            worldY: worldMap.worldY * RATIO_MAP_Y,
          }));
          worldManager.configure(worldMaps);
          mapExtended.setInWorldMaps(worldManager);
        }

        return map as any;
      },
    },
    event: {
      onBeforeCreated({ event: object }, map: RpgMap) {
        const mapExtended = map as RpgMapExtended;

        const objectRefId = String(object?.eventId ?? object?.id ?? object?._id ?? "");
        const hasDetailedEventData =
          Boolean(object?.triggers && Array.isArray(object.triggers)) ||
          Boolean(object?.params && typeof object.params === "object");

        if (!hasDetailedEventData && objectRefId) {
          const resolved = (mapExtended as any).__resolvedEventsById?.get?.(objectRefId);
          if (resolved) {
            const x =
              typeof object?.x === "number"
                ? object.x
                : typeof resolved?.x === "number"
                  ? resolved.x
                  : resolved?.position?.x;
            const y =
              typeof object?.y === "number"
                ? object.y
                : typeof resolved?.y === "number"
                  ? resolved.y
                  : resolved?.position?.y;

            object = {
              ...resolved,
              ...object,
              eventId: objectRefId,
              id: resolved.id ?? resolved._id ?? objectRefId,
              _id: resolved._id ?? resolved.id ?? objectRefId,
              x,
              y,
            };
          }
        }

        const params = object.params;
        const scale = mapExtended.scale;
        const eventType =
          normalizeEventType(object.eventType || object.type || "character") ||
          "character";
        const runtime = getEventTypeRuntime(eventType);

        // Add block execution utility to the event
        const eventObj: any = {};

        // If the event has triggers defined, add execution methods
        if (object.triggers && Array.isArray(object.triggers)) {
          eventObj.resolveActiveTrigger = function (
            player: RpgPlayer | null,
            event: RpgEvent,
          ) {
            for (let i = object.triggers.length - 1; i >= 0; i--) {
              const trigger = object.triggers[i];
              const isEnabled = trigger?.enabled !== false;
              if (
                matchesPageConditions(trigger.conditions, { player, event }) &&
                isEnabled
              ) {
                return { trigger, index: i };
              }
            }
            return null;
          };

          eventObj.applyActiveTrigger = function (
            player: RpgPlayer | null,
            event: RpgEvent,
          ) {
            let resolved = eventObj.resolveActiveTrigger(player, event);
            if (!resolved && !player) {
              const fallbackIndex = object.triggers.findIndex(
                (trigger: any) => trigger?.enabled !== false,
              );
              if (fallbackIndex >= 0) {
                resolved = {
                  trigger: object.triggers[fallbackIndex],
                  index: fallbackIndex,
                };
              }
            }
            if (!resolved) return null;
            if (eventObj.__activeTriggerIndex !== resolved.index) {
              eventObj.__activeTriggerIndex = resolved.index;
              applyTriggerSettings({
                event,
                trigger: resolved.trigger,
                fallbackParams: params,
                eventType,
                object,
              });
            }
            return resolved.trigger;
          };

          eventObj.executeBlocks = async function (
            player: RpgPlayer | null,
            triggerType: string,
            event: RpgEvent,
          ) {
            const blockExecutor = new BlockExecutionService(player, event);
            const trigger = eventObj.applyActiveTrigger(player, event);
            if (!trigger || trigger.type !== triggerType) {
              return;
            }
            if (trigger && trigger.blocks) {
              await blockExecutor.executeBlockSequence(trigger.blocks);
            }
          };

          // Add trigger-specific execution methods
          eventObj.onInit = async function () {
            setTimeout(async () => {
              const map = this.getCurrentMap();
              const [player] = map?.getPlayers() ?? [];
              const runParallelLoop = () => {
                const loop = () => {
                  eventObj
                    .executeBlocks(player, "onParallel", this)
                    .then(() => {
                      setTimeout(loop, 1000);
                    });
                };
                loop();
              };
              const runInitLifecycle = async (options?: {
                runInitBlocks?: boolean;
                startParallelLoop?: boolean;
              }) => {
                eventObj.applyActiveTrigger(player, this);
                this.teleport({
                  x: object.x * mapExtended.scale,
                  y: object.y * mapExtended.scale,
                });
                if (options?.runInitBlocks !== false) {
                  await eventObj.executeBlocks(player, "onInit", this);
                }
                if (options?.startParallelLoop !== false) {
                  runParallelLoop();
                }
              };
              const context = {
                event: this,
                player,
                map,
                object,
                params,
                eventType,
                triggerType: "onInit",
                resolveActiveTrigger: eventObj.resolveActiveTrigger,
                applyActiveTrigger: eventObj.applyActiveTrigger,
                executeBlocks: eventObj.executeBlocks,
                runInitLifecycle,
              };

              const defaultHandler = () => runInitLifecycle();
              if (runtime.hooks?.onInit) {
                await runtime.hooks.onInit(context, defaultHandler);
              } else {
                await defaultHandler();
              }
            }, 0);
          };

          const createContext = (
            player: RpgPlayer,
            event: RpgEvent,
            triggerType: string,
          ) => {
            return {
              event,
              player,
              map,
              object,
              params,
              resolveActiveTrigger: eventObj.resolveActiveTrigger,
              applyActiveTrigger: eventObj.applyActiveTrigger,
              executeBlocks: eventObj.executeBlocks,
              eventType,
              triggerType,
              moveApi: Move,
            };
          };

          eventObj.onAction = async function (player: RpgPlayer) {
            const context = createContext(player, this, "onAction");
            const defaultHandler = async () => {
              await eventObj.executeBlocks(player, "onAction", this);
              player.syncChanges();
            };
            if (runtime.hooks?.onAction) {
              await runtime.hooks.onAction(context, defaultHandler);
            } else {
              await defaultHandler();
            }
          };

          eventObj.onPlayerTouch = async function (player: RpgPlayer) {
            const context = createContext(player, this, "onTouch");
            const defaultHandler = async () => {
              await eventObj.executeBlocks(player, "onTouch", this);
              player.syncChanges();
            };
            if (runtime.hooks?.onTouch) {
              await runtime.hooks.onTouch(context, defaultHandler);
            } else {
              await defaultHandler();
            }
          };

          eventObj.onChanges = async function (player: RpgPlayer) {
            const context = createContext(player, this, "onChange");
            const defaultHandler = async () => {
              eventObj.applyActiveTrigger(player, this);
              await eventObj.executeBlocks(player, "onChange", this);
            };
            if (runtime.hooks?.onChange) {
              await runtime.hooks.onChange(context, defaultHandler);
            } else {
              await defaultHandler();
            }
          };
        }

        return {
          event: eventObj,
          x: object.x * mapExtended.scale,
          y: object.y * mapExtended.scale,
          id: object.eventId || object.id || object._id,
        };
      },
    },
    database: async () => {
      const configuredProjectId =
        getStudioGameRuntimeConfig().projectId?.trim() || null;
      const gameConfig = readGameConfig();
      const resolvedProjectId = configuredProjectId || gameConfig?._id || "";

      if (databaseCacheByProjectId.has(resolvedProjectId)) {
        return databaseCacheByProjectId.get(resolvedProjectId);
      }

      const response = await getGameDataProvider().getDatabase(
        configuredProjectId || gameConfig?._id,
      );
      const database = normalizeStudioDatabase(response);
      databaseCacheByProjectId.set(resolvedProjectId, database);
      return database;
    },
  });
};
