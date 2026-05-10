import { Move, RpgEvent, RpgMap, RpgPlayer, RpgServer } from "@rpgjs/server";
import { defineModule, WorldMapsManager } from "@rpgjs/common";
import { BlockExecutionService } from "./block-executor";
import { apiUrl } from "./constants";
import { RATIO_MAP_X, RATIO_MAP_Y } from "@common/map";
import { matchesPageConditions } from "@common/blocks";
import type { ProjectBasic } from "@common/types/project";
import {
  applyTriggerSettings,
  getEventTypeRuntime,
  getGraphicKey,
  RpgMapExtended,
} from "./event-type-runtime";
import { normalizeEventType } from "@common/event-types";
import { assignParams } from "./assign-params";
import { normalizeWeatherState } from "@common/weather";
import {
  getGameDataProvider,
  getStudioGameRuntimeConfig,
} from "./data-provider";

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
    startingEquipment: {
      ...(baseConfig.startingEquipment ?? {}),
      ...(overrideConfig.startingEquipment ?? {}),
    },
  };
};

const resolvePlayerConfig = async (player: RpgPlayer): Promise<ProjectBasic> => {
  const gameConfig = (window as any).gameConfig ?? {};
  const baseHeroConfig = (gameConfig.hero ?? {}) as ProjectBasic;
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

const startGame = async (player: RpgPlayer) => {
  const heroConfig = await resolvePlayerConfig(player);
  assignParams(player, heroConfig);
};

const databaseCacheByProjectId = new Map<string, any>();
const eventsCacheByBundlePath = new Map<string, Promise<any[]>>();

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

const resolveMapEventReferences = async (events: unknown): Promise<any[]> => {
  const list = parseArrayValue(events);
  if (list.length === 0) return [];

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

export default (_config?: unknown) => {
  return defineModule<RpgServer>({
    player: {
      onStart: async (player: RpgPlayer) => {
        await startGame(player);
        await player.changeMap("simplemap");
      },
      onJoinMap: (player: RpgPlayer, map: RpgMap) => {
        const startMapId = map.globalConfig.startMapId;
        const isStartMap = map.data().data._id === startMapId;
        const mapExtended = map as RpgMapExtended;
        const heroGraphic = (mapExtended.globalConfig.hero as any)?.graphic;
        const heroGraphicKey = getGraphicKey(heroGraphic);
        if (heroGraphicKey) {
          player.setGraphic(heroGraphicKey);
        } else {
          player.setGraphic("default_character");
        }
        if (player.x() == 0 && player.y() == 0) {
          player.teleport({
            x: (mapExtended.startPosition?.x ?? 0) * mapExtended.scale,
            y: (mapExtended.startPosition?.y ?? 0) * mapExtended.scale,
          });
        }
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
    },
    map: {
      async onBeforeUpdate(mapData: any, map) {
        const mapExtended = map as RpgMapExtended;
        const resolvedEvents = await resolveMapEventReferences(
          mapData?.events ?? mapData?.data?.events,
        );
        const resolvedEventsById = new Map<string, any>();
        resolvedEvents.forEach((entry) => {
          const id = String(entry?.eventId ?? entry?.id ?? entry?._id ?? "");
          if (id) resolvedEventsById.set(id, entry);
        });
        (mapExtended as any).__resolvedEventsById = resolvedEventsById;

        mapData.events = resolvedEvents;
        if (mapData?.data) {
          mapData.data.events = resolvedEvents;
        }
        mapExtended.startPosition = mapData.data.start;
        mapExtended.scale = mapData.data.params.scale || 1;
        const normalizedInitialWeather = normalizeWeatherState(
          mapData?.data?.weather,
        );
        mapData.data.weather = normalizedInitialWeather;
        // Add baseUrl to map context for use in block executors
        (mapExtended as any).apiBaseUrl = apiUrl;

        if (mapData.config.worldMaps) {
          const worldManager = new WorldMapsManager();
          const worldMaps = mapData.config.worldMaps.map((worldMap: any) => ({
            ...worldMap,
            worldX: worldMap.worldX * RATIO_MAP_X,
            worldY: worldMap.worldY * RATIO_MAP_Y,
          }));
          worldManager.configure(worldMaps);
          mapExtended.setInWorldMaps(worldManager as any);
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
                matchesPageConditions(trigger.conditions, { player: player as any, event: event as any }) &&
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
            const blockExecutor = new BlockExecutionService(player as any, event as any);
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
      const gameConfig = (window as any).gameConfig;
      const resolvedProjectId = configuredProjectId || gameConfig?._id || "";

      if (databaseCacheByProjectId.has(resolvedProjectId)) {
        return databaseCacheByProjectId.get(resolvedProjectId);
      }

      const response = await getGameDataProvider().getDatabase(
        configuredProjectId || gameConfig?._id,
      );
      const database: any = {};
      for (const item of response) {
        item.id = item._id;
        item._type = item.itemType;
        delete item.itemType;
        delete item._id;
        database[item.id] = item;
      }
      databaseCacheByProjectId.set(resolvedProjectId, database);
      return database;
    },
  });
};
