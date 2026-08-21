import { Move, RpgEvent, RpgMap, RpgPlayer, RpgServer, provideServerMapStreaming, type RpgPlayerConnectionContext } from "@rpgjs/server";
import { defineModule, normalizeLightingState, WorldMapsManager, type RpgActionInput, type WorldMapConfig } from "@rpgjs/common";
import { BlockExecutionService } from "./block-executor";
import { apiUrl, configureStudioConstants } from "./constants";
import { RATIO_MAP_X, RATIO_MAP_Y } from "@common/map";
import { matchesPageConditions } from "@common/blocks";
import type { ProjectBasic } from "@common/types/project";
import { applyTriggerSettings, getEventTypeRuntime, getGraphicKey, getGraphicScale, RpgMapExtended } from "./event-type-runtime";
import { normalizeEventType } from "@common/event-types";
import { normalizeWeatherState } from "@common/weather";
import { getGameDataProvider, getStudioGameRuntimeConfig, configureStudioGameRuntime, resetGameDataProvider } from "./data-provider";
import type { GameDataProvider, GameRuntimeMode } from "./data-provider";
import { normalizeStudioDatabase, normalizeStudioDatabaseRecord } from "./database-normalizer";
import { createStudioDefaultClass, normalizeStudioSkillsToLearn } from "./skills-to-learn";
import { getStudioSkillChangeNotification } from "./skill-notification";
import { triggerMatchesExecution, type StudioTouchTarget } from "./touch-runtime";
import { compileStudioMapStream, isStudioDirectLoadPayload, prepareStudioMapPayload, type PreparedStudioMapPayload } from "./map-streaming";
import { prepareStudioTerrainControlRegions } from "./terrain-control-streaming";
import { assignStudioEventPlacementIds } from "./event-placement";
import {
  isStartingEquipmentCompatible,
  resolveStartingEquipmentType,
  resolveStudioItemType,
} from "./starting-equipment";
import { normalizeStudioCharacterSelectSettings } from "./action-battle-audio";
import { StudioStartupError, type StudioPlayerStartup } from "./startup";
export { createStudioActionBattleAnimations } from "./action-battle-animations";
export type { StudioCombatAnimationIds, StudioCombatAnimationOptions } from "./action-battle-animations";
export {
  createStudioActionBattleAudio,
  createStudioActionBattlePreset,
} from "./action-battle-audio";
export type { StudioCombatAudioConfig } from "./action-battle-audio";
export type {
  StudioGuiBinding,
  StudioHotbarContent,
  StudioHotbarBinding,
  StudioHotbarSettings,
  StudioMenusSettings,
  StudioCharacterSelectBinding,
  StudioCharacterSelectSettings,
} from "./action-battle-audio";
export {
  normalizeStudioHotbarSettings,
  normalizeStudioCharacterSelectSettings,
  resolveStudioHotbarSettings,
} from "./action-battle-audio";

const mergePlayerConfig = (baseConfig: ProjectBasic = {}, overrideConfig?: Partial<ProjectBasic> | null): ProjectBasic => {
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
    skillsToLearn: overrideConfig.skillsToLearn ?? overrideConfig.skills ?? baseConfig.skillsToLearn ?? baseConfig.skills,
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

const createMapVariableConditionSubject = (map: RpgMap | null) => {
  if (!map || typeof (map as any).getVariable !== "function") {
    return null;
  }
  return {
    getVariable: (variableId: string) => (map as any).getVariable(variableId),
    setVariable: (variableId: string, value: unknown) => (map as any).setVariable?.(variableId, value),
    hasItem: () => false,
    getItemCount: () => 0,
    gold: 0,
  };
};

const readGameConfig = (): any => {
  const globalScope = globalThis as typeof globalThis & {
    gameConfig?: any;
    window?: { gameConfig?: any };
  };

  return globalScope.window?.gameConfig ?? globalScope.gameConfig ?? {};
};

const normalizeRuntimeHitbox = (value: unknown): { width: number; height: number } | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const rawWidth = record.width ?? record.w;
  const rawHeight = record.height ?? record.h;
  const width = typeof rawWidth === "number" ? rawWidth : Number(rawWidth);
  const height = typeof rawHeight === "number" ? rawHeight : Number(rawHeight);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return undefined;
  }
  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  };
};

export const resolveRuntimeEventHitbox = (object: any, params: any): { width: number; height: number } | undefined => {
  const triggerHitbox = Array.isArray(object?.triggers)
    ? [...object.triggers].reverse().find((trigger: any) => trigger?.enabled !== false && normalizeRuntimeHitbox(trigger?.hitbox))?.hitbox
    : undefined;

  return normalizeRuntimeHitbox(object?.hitbox) ?? normalizeRuntimeHitbox(triggerHitbox) ?? normalizeRuntimeHitbox(params?.hitbox);
};

const normalizeProjectId = (value: unknown): string | null => {
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const resolveStudioRuntimeContext = (map?: RpgMap): { gameConfig: any; projectId: string | null } => {
  const legacyGameConfig = readGameConfig();
  const mapConfig = map?.globalConfig;
  if (mapConfig && typeof mapConfig === "object" && Object.keys(mapConfig).length > 0) {
    return {
      gameConfig: mapConfig,
      projectId:
        normalizeProjectId(mapConfig._id ?? mapConfig.projectId)
        ?? normalizeProjectId(getStudioGameRuntimeConfig().projectId)
        ?? normalizeProjectId(legacyGameConfig?._id ?? legacyGameConfig?.projectId),
    };
  }
  return {
    gameConfig: legacyGameConfig,
    projectId:
      normalizeProjectId(getStudioGameRuntimeConfig().projectId)
      ?? normalizeProjectId(legacyGameConfig?._id ?? legacyGameConfig?.projectId),
  };
};

const resolvePlayerConfig = async (player: RpgPlayer, map?: RpgMap): Promise<ProjectBasic> => {
  const { gameConfig, projectId } = resolveStudioRuntimeContext(map);
  const selectedActor = await resolveSelectedStudioActor(player, projectId);
  let selectedClass: Record<string, any> | null = null;
  if (selectedActor?.classId) {
    try {
      const records = await getGameDataProvider().getDatabase(projectId ?? undefined);
      selectedClass = resolveStudioActorClass(selectedActor, records);
    } catch (error) {
      console.warn("[StudioGame] selected actor class preload failed", error);
    }
  }
  const baseHeroConfig = {
    ...(selectedActor ?? gameConfig.hero ?? {}),
    class: selectedClass ?? undefined,
    skillsToLearn: selectedActor?.skills
      ?? selectedActor?.skillsToLearn
      ?? gameConfig.skillsToLearn
      ?? gameConfig.skills
      ?? gameConfig.hero?.skillsToLearn
      ?? gameConfig.hero?.skills,
    animations: selectedActor?.animations ?? gameConfig.animations ?? gameConfig.hero?.animations,
  } as ProjectBasic;
  const provider = getGameDataProvider();
  const providerStartConfig = provider.getPlayerStartConfig;

  if (!providerStartConfig) {
    return baseHeroConfig;
  }

  try {
    const overrideConfig = await providerStartConfig.call(provider, {
      player,
      heroConfig: baseHeroConfig,
      gameConfig,
      projectId,
      mapId: gameConfig?.startMapId || null,
    });

    return mergePlayerConfig(baseHeroConfig, overrideConfig);
  } catch (error) {
    console.error("[StudioGame] getPlayerStartConfig failed", error);
    return baseHeroConfig;
  }
};

const startGame = async (player: RpgPlayer, map?: RpgMap, heroConfig?: ProjectBasic) => {
  heroConfig ??= await resolvePlayerConfig(player, map);
  (player as any).studioCombatAnimations = heroConfig.animations ?? {};
  (player as any).combatAnimations = heroConfig.animations ?? {};
  const startingItems = await ensureStartingItemsInDatabase(player, heroConfig, map);
  assignPlayerStartParams(player, heroConfig, startingItems);
  applyPlayerHitbox(player, heroConfig);
};

const applyStartGameOnce = async (player: RpgPlayer, map?: RpgMap, heroConfig?: ProjectBasic) => {
  const runtimePlayer = player as RpgPlayer & {
    __studioStartGameApplied?: boolean;
  };
  if (runtimePlayer.__studioStartGameApplied) return;
  await startGame(player, map, heroConfig);
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

const applyPlayerHitbox = (player: RpgPlayer, config: ProjectBasic): void => {
  const hitbox = normalizeRuntimeHitbox((config as any).hitbox);
  if (!hitbox || typeof (player as any).setHitbox !== "function") return;
  (player as any).setHitbox(hitbox.width, hitbox.height);
};

const addStudioDefaultClass = (
  database: Record<string, any>,
  gameConfig: any,
): Record<string, any> => {
  const defaultClass = createStudioDefaultClass(
    gameConfig?.skillsToLearn
      ?? gameConfig?.skills
      ?? gameConfig?.hero?.skillsToLearn
      ?? gameConfig?.hero?.skills,
  );
  if (!defaultClass) return database;
  return {
    ...database,
    [defaultClass.id]: defaultClass,
  };
};

const assignPlayerStartParams = (player: RpgPlayer, config: ProjectBasic, startingItems: Record<string, any> = {}) => {
  const assignedClass = (config as any).class;
  if (assignedClass && typeof (player as any).setClass === "function") {
    (player as any).setClass(assignedClass);
  }
  const defaultClass = createStudioDefaultClass(config.skillsToLearn);
  const currentClass = (player as any)._class?.();
  const hasCurrentClass = currentClass && typeof currentClass === "object" && Object.keys(currentClass).length > 0;
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
  player.allRecovery();

  for (const skill of normalizeStudioSkillsToLearn(config.skillsToLearn)) {
    if (skill.level <= player.level && !player.getSkill(skill.skill)) {
      player.learnSkill(skill.skill, {
        source: skill.source,
        level: skill.level,
      });
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
      if (!isStartingEquipmentCompatible(type, itemData)) {
        const expectedType = resolveStartingEquipmentType(type);
        const actualType = resolveStudioItemType(itemData) ?? "unknown";
        console.warn(
          expectedType
            ? `[StudioGame] starting equipment ${type}=${itemId} must reference a ${expectedType}, received ${actualType}`
            : `[StudioGame] starting equipment field ${type} is not supported`,
        );
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

const ensureStartingItemsInDatabase = async (player: RpgPlayer, config: ProjectBasic, mapOverride?: RpgMap): Promise<Record<string, any>> => {
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

  const { projectId } = resolveStudioRuntimeContext(map);

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

const eventsCacheByBundlePath = new Map<string, Promise<any[]>>();
const projectCacheByKey = new Map<string, Promise<any>>();

const getPublishedStudioDatabase = (map?: RpgMap): any => {
  const publishedMapData =
    typeof (map as any)?.data === "function"
      ? (map as any).data()
      : undefined;
  return publishedMapData?.database;
};

const refreshOnlineStudioDatabase = async (map: RpgMap): Promise<void> => {
  const publishedDatabase = getPublishedStudioDatabase(map);
  if (
    Array.isArray(publishedDatabase)
    || (publishedDatabase && typeof publishedDatabase === "object")
  ) {
    return;
  }

  const provider = getGameDataProvider();
  if (provider.kind === "offline") return;

  const { projectId } = resolveStudioRuntimeContext(map);
  if (!projectId || typeof (map as any).addInDatabase !== "function") return;

  try {
    const records = await provider.getDatabase(projectId);
    const database = normalizeStudioDatabase(records);
    for (const [id, data] of Object.entries(database)) {
      (map as any).addInDatabase(id, data, { force: true });
    }
  } catch (error) {
    console.error("[StudioGame] database refresh failed", error);
  }
};

/** Server-side and trusted-publisher options for a Studio game. */
export interface CreateStudioMapUpdatePayloadOptions {
  /** Studio project identifier used to load project and database records. */
  projectId?: string | null;
  /** Map used when the project does not define another starting map. */
  startMapId?: string;
  /**
   * Trusted server-owned Studio data source used for project, map, media, and
   * database reads. Browser code must not receive providers that expose private
   * storage or credentials.
   */
  dataProvider?: GameDataProvider;
  /** Studio data source. Trusted publishers normally use `online`. */
  runtimeMode?: GameRuntimeMode;
  /** Compatibility alias for `apiUrl`. */
  apiBaseUrl?: string;
  /** Studio API root. Defaults to `<baseUrl>/api`. */
  apiUrl?: string;
  /** Public Studio media root used by render descriptors. */
  assetsUrl?: string;
  /** Studio application root. Defaults to `https://rpgjs.studio`. */
  baseUrl?: string;
  /** Exported Studio bundle root when using offline or auto mode. */
  bundleBasePath?: string;
  /** Authoritative chunk-streaming settings applied by the map room. */
  streaming?:
    | false
    | {
        /** Width and height of one chunk in Studio cells. Defaults to 16. */
        chunkSize?: number;
        /** Radius sent around the authoritative player position. Defaults to 2. */
        loadRadius?: number;
        /** Radius retained by the client to avoid boundary churn. Defaults to 3. */
        retainRadius?: number;
      };
}

type StudioServerConfig = CreateStudioMapUpdatePayloadOptions & {
  autoStart?: boolean;
  displayTitleScreen?: boolean;
  skipCharacterSelect?: boolean;
  resolveStartup?: import("./startup").StudioStartupResolver;
};

export const prepareStudioWorldMaps = (worldMaps: unknown): WorldMapConfig[] =>
  parseArrayValue(worldMaps).map((worldMap: any) => ({
    ...worldMap,
    worldX: Math.round(Number(worldMap?.worldX ?? 0) * RATIO_MAP_X),
    worldY: Math.round(Number(worldMap?.worldY ?? 0) * RATIO_MAP_Y),
  }));

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
  return toIdentifierString(record._id) || toIdentifierString(record.id) || toIdentifierString(record.mediaId) || toIdentifierString(record.referenceId);
};

const resolveMediaReference = async (value: unknown, provider: GameDataProvider): Promise<unknown> => {
  if (!value) return value;
  const referenceId = toIdentifierString(value);
  if (!referenceId) return value;

  const candidateIds = Array.from(new Set([referenceId, referenceId.startsWith("#") ? referenceId.slice(1) : referenceId].filter(Boolean)));

  for (const candidateId of candidateIds) {
    try {
      const media = await provider.getMedia(candidateId);
      if (media && !media.__placeholder) {
        return value && typeof value === "object" ? { ...(value as Record<string, unknown>), ...media } : media;
      }
    } catch {
      // Keep the original reference when Studio cannot resolve it as media.
    }
  }

  return value;
};

const hydrateEventMediaReferences = async (
  events: any[],
  provider: GameDataProvider = getGameDataProvider(),
): Promise<any[]> => {
  return Promise.all(
    events.map(async (event) => {
      if (!event || typeof event !== "object") return event;
      const nextEvent = { ...event };
      if (nextEvent.params?.graphic) {
        nextEvent.params = {
          ...nextEvent.params,
          graphic: await resolveMediaReference(nextEvent.params.graphic, provider),
        };
      }
      if (Array.isArray(nextEvent.triggers)) {
        nextEvent.triggers = await Promise.all(
          nextEvent.triggers.map(async (trigger: any) => {
            if (!trigger || typeof trigger !== "object") return trigger;
            if (!trigger.graphic) return trigger;
            return {
              ...trigger,
              graphic: await resolveMediaReference(trigger.graphic, provider),
            };
          }),
        );
      }
      return nextEvent;
    }),
  );
};

const shouldUseLocalBundleEvents = (config: StudioServerConfig = {}): boolean => {
  const runtimeConfig = getStudioGameRuntimeConfig();
  const runtimeMode = config.runtimeMode ?? runtimeConfig.runtimeMode;
  if (runtimeMode === "online") return false;

  const gameConfig = readGameConfig();
  const projectId = config.projectId?.trim?.() || runtimeConfig.projectId?.trim?.() || gameConfig?._id || null;

  return !projectId;
};

const resolveMapEventReferences = async (events: unknown, options: { useLocalBundleEvents: boolean }): Promise<any[]> => {
  const list = parseArrayValue(events);
  if (list.length === 0) return [];
  if (!options.useLocalBundleEvents) return list;

  const hasEventIdReference = list.some((entry) => entry && typeof entry === "object" && typeof (entry as Record<string, unknown>).eventId === "string");

  if (!hasEventIdReference) {
    return list;
  }

  const bundleEvents = await fetchBundleEvents();
  if (bundleEvents.length === 0) {
    return list;
  }

  const byId = new Map<string, any>();
  bundleEvents.forEach((entry) => {
    const ids = [entry?.eventId, entry?.id, entry?._id].filter((value): value is string => typeof value === "string" && value.length > 0);
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

const resolveStudioMapPositions = (
  positions: Record<string, { x: number; y: number }> | undefined,
  mapData: any,
): Record<string, { x: number; y: number }> => {
  const start = mapData?.start;
  if (
    typeof start?.x !== "number"
    || !Number.isFinite(start.x)
    || typeof start?.y !== "number"
    || !Number.isFinite(start.y)
  ) {
    return positions ?? {};
  }

  const scale = typeof mapData?.params?.scale === "number"
    && Number.isFinite(mapData.params.scale)
    ? mapData.params.scale
    : 1;

  return {
    ...(positions ?? {}),
    start: {
      x: start.x * scale,
      y: start.y * scale,
    },
  };
};

const resolveStudioProject = async (
  mapId?: string,
  config: StudioServerConfig = {},
  provider: GameDataProvider = config.dataProvider ?? getGameDataProvider(),
): Promise<any> => {
  const runtimeConfig = getStudioGameRuntimeConfig();
  const gameConfig = readGameConfig();
  const projectId = config.projectId?.trim?.() || runtimeConfig.projectId?.trim?.() || gameConfig?._id || null;
  const query = projectId ? { projectId } : { mapId };

  if (config.dataProvider) {
    return provider.getProject(query).catch((error) => {
      console.warn("[StudioGame] project preload failed", error);
      return {};
    });
  }

  const cacheKey = projectId ? `project:${projectId}` : `map:${mapId ?? ""}`;

  if (!projectCacheByKey.has(cacheKey)) {
    const promise = provider
      .getProject(query)
      .catch((error) => {
        projectCacheByKey.delete(cacheKey);
        console.warn("[StudioGame] project preload failed", error);
        return {};
      });
    projectCacheByKey.set(cacheKey, promise);
  }

  return projectCacheByKey.get(cacheKey)!;
};

const studioActorRecordId = (actor: unknown): string | null => {
  if (!actor || typeof actor !== "object") return null;
  const record = actor as Record<string, unknown>;
  const id = record._id ?? record.id;
  return typeof id === "string" && id.trim().length > 0 ? id : null;
};

const isStudioActorRecord = (actor: unknown): actor is Record<string, any> => {
  if (!actor || typeof actor !== "object") return false;
  const record = actor as Record<string, unknown>;
  return (record.type ?? record._type) === "actor" && studioActorRecordId(record) !== null;
};

const isStudioClassRecord = (value: unknown): value is Record<string, any> => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (record.type ?? record._type) === "class" && studioActorRecordId(record) !== null;
};

const resolveStudioActorClass = (
  actor: Record<string, any>,
  records: readonly any[],
): Record<string, any> | null => {
  const classId = typeof actor.classId === "object"
    ? studioActorRecordId(actor.classId)
    : actor.classId;
  const classRecord = isStudioClassRecord(actor.classId)
    ? actor.classId
    : records.find((record) => isStudioClassRecord(record) && studioActorRecordId(record) === classId);
  if (!classRecord) return null;
  return {
    id: studioActorRecordId(classRecord)!,
    name: classRecord.name,
    description: classRecord.description,
    icon: getGraphicKey(classRecord.icon) ?? undefined,
    skillsToLearn: normalizeStudioSkillsToLearn(classRecord.skillsToLearn ?? classRecord.skills),
  };
};

const resolveStudioActorIllustration = async (
  actor: Record<string, any>,
  provider: GameDataProvider,
): Promise<string | undefined> => {
  const direct = getGraphicKey(actor.illustration ?? actor.graphic?.metadata?.illustration);
  if (direct) return direct;
  const graphicId = getGraphicKey(actor.graphic);
  if (!graphicId) return undefined;
  try {
    const graphicMedia = await provider.getMedia(graphicId);
    return getGraphicKey(graphicMedia?.metadata?.illustration) ?? undefined;
  } catch {
    return undefined;
  }
};

const selectedStudioActorId = (player: RpgPlayer): string | null => {
  const value = (player as any).studioSelectedActorId;
  const resolved = typeof value === "function" ? value() : value;
  return typeof resolved === "string" && resolved.trim().length > 0 ? resolved : null;
};

const setSelectedStudioActorId = (player: RpgPlayer, actorId: string): void => {
  const property = (player as any).studioSelectedActorId;
  if (property && typeof property.set === "function") {
    property.set(actorId);
    return;
  }
  (player as any).studioSelectedActorId = actorId;
};

const resolveSelectedStudioActor = async (
  player: RpgPlayer,
  projectId: string | null,
): Promise<Record<string, any> | null> => {
  const runtimePlayer = player as RpgPlayer & { __studioSelectedActor?: Record<string, any> };
  const selectedId = selectedStudioActorId(player);
  if (!selectedId) return null;
  if (studioActorRecordId(runtimePlayer.__studioSelectedActor) === selectedId) {
    return runtimePlayer.__studioSelectedActor ?? null;
  }
  try {
    const records = await getGameDataProvider().getDatabase(projectId ?? undefined);
    const actor = records.find((record) => isStudioActorRecord(record) && studioActorRecordId(record) === selectedId);
    if (actor) runtimePlayer.__studioSelectedActor = actor;
    return actor ?? null;
  } catch (error) {
    console.warn("[StudioGame] selected actor preload failed", error);
    return null;
  }
};

const selectStudioActorForNewGame = async (
  player: RpgPlayer,
  project: any,
  config: StudioServerConfig,
): Promise<void> => {
  const settings = normalizeStudioCharacterSelectSettings(project?.menus?.characterSelect);
  if (!settings.enabled) return;

  const provider = config.dataProvider ?? getGameDataProvider();
  let records: any[];
  try {
    records = await provider.getDatabase(project?._id ?? config.projectId ?? undefined);
  } catch (error) {
    console.warn("[StudioGame] character select actors could not be loaded; using the project main actor", error);
    return;
  }
  const actors = records.filter(isStudioActorRecord);
  const actorsById = new Map(actors.map((actor) => [studioActorRecordId(actor)!, actor]));
  const offeredActors = settings.allActors
    ? actors
    : settings.actorIds.flatMap((id) => actorsById.get(id) ? [actorsById.get(id)!] : []);

  if (offeredActors.length === 0) {
    console.warn("[StudioGame] character select has no valid actors; using the project main actor");
    return;
  }

  const presentationActors = await Promise.all(offeredActors.map(async (actor) => {
    const actorClass = resolveStudioActorClass(actor, records);
    return {
      id: studioActorRecordId(actor)!,
      name: typeof actor.name === "string" ? actor.name : undefined,
      description: typeof actor.description === "string" ? actor.description : undefined,
      graphic: getGraphicKey(actor.graphic) ?? undefined,
      faceset: getGraphicKey(actor.faceset) ?? undefined,
      illustration: await resolveStudioActorIllustration(actor, provider),
      class: actorClass ?? undefined,
      parameters: actor.parameters,
    };
  }));
  const selected = await player.showCharacterSelect(
    presentationActors,
    {
      selectedActorId: actorsById.has(project?.mainActorId) ? project.mainActorId : undefined,
      allowCancel: false,
    },
  );
  if (!selected?.id) return;

  const actor = actorsById.get(selected.id);
  if (!actor) return;
  const actorClass = resolveStudioActorClass(actor, records);
  player.setActor({
    id: selected.id,
    name: actor.name,
    ...(actorClass ? { class: actorClass } : {}),
    parameters: {},
    startingEquipment: [],
  });
  setSelectedStudioActorId(player, selected.id);
  (player as RpgPlayer & { __studioSelectedActor?: Record<string, any> }).__studioSelectedActor = actor;
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
  provider?: GameDataProvider,
): Promise<any> => {
  if (initialMapData?.data?.params) return initialMapData;
  const resolvedProvider = provider ?? config.dataProvider ?? getGameDataProvider();

  const [project, mapResponse] = await Promise.all([
    resolveStudioProject(mapId, config, resolvedProvider),
    resolvedProvider.getMap(mapId),
  ]);
  const useLocalBundleEvents = shouldUseLocalBundleEvents(config);
  const params = mapResponse.params ?? {};
  const isV2 = mapResponse.creationDetails?.version === "v2";
  const resolvedEvents = await resolveMapEventReferences(mapResponse.events ?? mapResponse.data?.events, { useLocalBundleEvents });
  const hydratedEvents = assignStudioEventPlacementIds(
    await hydrateEventMediaReferences(resolvedEvents, resolvedProvider)
  );
  const hydratedCommonEvents = await hydrateEventMediaReferences(
    parseArrayValue(mapResponse.commonEvents ?? mapResponse.data?.commonEvents),
    resolvedProvider,
  );
  const mapDataValue = Array.isArray(mapResponse.data) ? mapResponse.data : parseJsonValue(mapResponse.data, []);
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
    commonEvents: hydratedCommonEvents,
    params,
  };

  return {
    ...initialMapData,
    id: normalizedMap.id,
    data: normalizedMap,
    positions: resolveStudioMapPositions({
      ...(mapResponse.positions ?? {}),
      ...(initialMapData?.positions ?? {}),
    }, normalizedMap),
    events: hydratedEvents,
    commonEvents: hydratedCommonEvents,
    hitboxes: mergedHitboxes,
    width: initialMapData?.width || (isV2 ? params.width * 48 : params.width) || mapResponse.width || 1,
    height: initialMapData?.height || (isV2 ? params.height * 48 : params.height) || mapResponse.height || 1,
    config: {
      ...project,
      ...(initialMapData?.config ?? {}),
      startMapId: config.startMapId ?? project?.startMapId ?? mapId,
    },
  };
};

/**
 * Load and prepare a complete Studio v2 map for an authenticated `/map/update` call.
 * This function is intended for Vite, Studio, CI, or another trusted Node process.
 */
export async function createStudioMapUpdatePayload(mapId: string, config: CreateStudioMapUpdatePayloadOptions = {}): Promise<PreparedStudioMapPayload> {
  const resolvedBaseUrl = config.baseUrl ?? "https://rpgjs.studio";
  const resolvedApiUrl = config.apiUrl ?? config.apiBaseUrl ?? `${resolvedBaseUrl}/api`;
  configureStudioConstants({
    baseUrl: resolvedBaseUrl,
    apiUrl: resolvedApiUrl,
    assetsUrl: config.assetsUrl ?? "https://assets.rpgjs.studio",
  });
  configureStudioGameRuntime({
    projectId: config.projectId ?? null,
    runtimeMode: config.runtimeMode ?? "online",
    apiBaseUrl: resolvedApiUrl,
    bundleBasePath: config.bundleBasePath,
  });
  resetGameDataProvider();
  const provider = config.dataProvider ?? getGameDataProvider();
  const normalized = await normalizeStudioMapPayload(
    mapId,
    {
      id: mapId,
      width: 0,
      height: 0,
      events: [],
    },
    config,
    provider,
  );
  const projectId = config.projectId?.trim() || normalized.config?._id || normalized.data?.projectId;
  const database = projectId ? await provider.getDatabase(projectId) : [];
  const preparedMap = prepareStudioMapPayload(normalized, {
    id: mapId,
    config: normalized.config,
    database,
  });
  const prepared = await prepareStudioTerrainControlRegions(
    preparedMap,
    config.streaming === false ? 16 : config.streaming?.chunkSize
  );
  const worldMaps = prepareStudioWorldMaps(normalized.config?.worldMaps);
  if (worldMaps.length > 0) {
    prepared.worldUpdates = [{
      id: String(normalized.config?._id ?? projectId ?? "studio-world"),
      maps: worldMaps,
    }];
  }
  return prepared;
}

export default (_config?: unknown) => {
  const config = (_config ?? {}) as StudioServerConfig;
  const startupByPlayer = new WeakMap<RpgPlayer, Promise<StudioServerConfig>>();
  const validateResolvedStartup = async (startup: StudioPlayerStartup): Promise<StudioServerConfig> => {
    const projectId = startup.projectId?.trim();
    if (!projectId) {
      throw new StudioStartupError("PROJECT_REQUIRED", "Studio startup requires a projectId");
    }

    const provider = config.dataProvider ?? getGameDataProvider();
    let project: any;
    try {
      project = await provider.getProject({ projectId });
    }
    catch (error) {
      throw new StudioStartupError("PROJECT_NOT_FOUND", `Studio project could not be resolved: ${projectId}`);
    }
    if (normalizeProjectId(project?._id ?? project?.id) !== projectId) {
      throw new StudioStartupError("PROJECT_NOT_FOUND", `Studio project could not be resolved: ${projectId}`);
    }

    if (startup.flow === "title") {
      return {
        ...config,
        projectId,
        startMapId: startup.startMapId,
        autoStart: false,
        displayTitleScreen: true,
        skipCharacterSelect: false,
      };
    }

    const mapId = startup.mapId?.trim();
    if (!mapId) {
      throw new StudioStartupError("MAP_REQUIRED", "Direct Studio startup requires a mapId");
    }

    let mapProject: any;
    try {
      mapProject = await provider.getProject({ mapId });
    }
    catch (error) {
      throw new StudioStartupError(
        "MAP_PROJECT_MISMATCH",
        `Studio map ${mapId} does not belong to project ${projectId}`,
      );
    }
    if (normalizeProjectId(mapProject?._id ?? mapProject?.id) !== projectId) {
      throw new StudioStartupError(
        "MAP_PROJECT_MISMATCH",
        `Studio map ${mapId} does not belong to project ${projectId}`,
      );
    }

    return {
      ...config,
      projectId,
      startMapId: mapId,
      autoStart: true,
      displayTitleScreen: false,
      skipCharacterSelect: true,
    };
  };
  const resolvePlayerStartup = (
    player: RpgPlayer,
    connectionContext?: RpgPlayerConnectionContext,
  ): Promise<StudioServerConfig> => {
    const cached = startupByPlayer.get(player);
    if (cached) return cached;

    const pending = typeof config.resolveStartup === "function"
      ? connectionContext
        ? Promise.resolve(config.resolveStartup({
            ...connectionContext,
            player,
          })).then(validateResolvedStartup)
        : Promise.reject(new Error("Studio startup was requested before connection acceptance"))
      : Promise.resolve(config);
    startupByPlayer.set(player, pending);
    return pending;
  };
  const shouldAutoStart = async (playerConfig: StudioServerConfig) => {
    if (playerConfig.autoStart === true) return true;
    if (playerConfig.displayTitleScreen === true) return false;
    const project = await resolveStudioProject(undefined, playerConfig);
    return project?.menus?.titleScreen?.enabled === false;
  };
  const streamingOptions = config.streaming === false ? undefined : config.streaming ?? {};
  const streamingModule = streamingOptions
    ? provideServerMapStreaming(
        {
          compile(mapData: PreparedStudioMapPayload) {
            if (isStudioDirectLoadPayload(mapData)) return undefined;
            return compileStudioMapStream(mapData, {
              chunkSize: streamingOptions.chunkSize,
            });
          },
        },
        streamingOptions,
      )
    : undefined;

  return defineModule<RpgServer>({
    player: {
      props: {
        studioSelectedActorId: {
          $default: null,
          $syncWithClient: false,
          $permanent: true,
        },
      },
      onAccepted: async (player: RpgPlayer, connectionContext: RpgPlayerConnectionContext) => {
        const roomId = String((player as any).getCurrentMap?.()?.id ?? (player as any).map?.id ?? "");
        if (roomId && !roomId.startsWith("lobby-")) return;

        const playerConfig = await resolvePlayerStartup(player, connectionContext);
        if (!await shouldAutoStart(playerConfig)) return;
        player.initializeDefaultStats();
        if (playerConfig.skipCharacterSelect !== true) {
          await selectStudioActorForNewGame(player, await resolveStudioProject(undefined, playerConfig), playerConfig);
        }
        await player.changeMap(await resolveStartMapId(playerConfig));
      },
      onStart: async (player: RpgPlayer) => {
        const playerConfig = await resolvePlayerStartup(player);
        if (await shouldAutoStart(playerConfig)) return;
        await selectStudioActorForNewGame(player, await resolveStudioProject(undefined, playerConfig), playerConfig);
        await player.changeMap(await resolveStartMapId(playerConfig));
      },
      onJoinMap: async (player: RpgPlayer, map: RpgMap) => {
        const startPosition = typeof (map as any).data === "function"
          ? (map as any).data()?.positions?.start
          : undefined;
        if (
          player.x() === 0
          && player.y() === 0
          && typeof startPosition?.x === "number"
          && typeof startPosition?.y === "number"
        ) {
          await player.teleport(startPosition);
        }

        await refreshOnlineStudioDatabase(map);
        const heroConfig = await resolvePlayerConfig(player, map);
        const heroGraphic = (heroConfig as any)?.graphic;
        const heroGraphicKey = getGraphicKey(heroGraphic);
        if (heroGraphicKey) {
          (player as any)._graphicScale?.set(getGraphicScale((heroConfig as any)?.params, heroConfig) ?? null);
          player.setGraphic(heroGraphicKey);
        } else {
          (player as any)._graphicScale?.set(null);
          player.setGraphic("default_character");
        }

        await applyStartGameOnce(player, map, heroConfig);
      },
      onInput: (player: RpgPlayer, input: RpgActionInput<unknown>) => {
        if (input.action == "escape") {
          const map = player.getCurrentMap?.();
          if (map?.globalConfig?.menus?.mainMenu?.enabled === false) return;
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
        const isDirectLoad = isStudioDirectLoadPayload(mapData);
        const useLocalBundleEvents = shouldUseLocalBundleEvents(config);
        const hydratedMapData = await normalizeStudioMapPayload(mapData?.id ?? mapData?.data?._id ?? mapData?.data?.id, mapData, config);
        Object.assign(mapData, hydratedMapData);
        mapData.positions = resolveStudioMapPositions(mapData.positions, mapData.data);
        if (streamingOptions && !isDirectLoad && !mapData?.data?.__studioPrepared) {
          const preparedMapData = prepareStudioMapPayload(mapData, {
            id: mapData?.id,
            config: mapData?.config,
            database: mapData?.database,
          });
          await prepareStudioTerrainControlRegions(
            preparedMapData,
            streamingOptions?.chunkSize
          );
          Object.assign(mapData, preparedMapData);
        }
        mapExtended.globalConfig = mapData.config ?? {};

        const resolvedEvents = await resolveMapEventReferences(mapData?.events ?? mapData?.data?.events, { useLocalBundleEvents });
        const hydratedEvents = assignStudioEventPlacementIds(
          await hydrateEventMediaReferences(resolvedEvents)
        );
        const resolvedEventsById = new Map<string, any>();
        hydratedEvents.forEach((entry) => {
          const id = String(entry?.eventId ?? entry?.id ?? entry?._id ?? "");
          if (id) resolvedEventsById.set(id, entry);
        });
        (mapExtended as any).__resolvedEventsById = resolvedEventsById;

        const hydratedCommonEvents = await hydrateEventMediaReferences(parseArrayValue(mapData?.commonEvents ?? mapData?.data?.commonEvents));
        const commonEventsById = new Map<string, any>();
        hydratedCommonEvents.forEach((entry) => {
          const ids = [entry?.eventId, entry?.id, entry?._id].filter((value): value is string => typeof value === "string" && value.length > 0);
          ids.forEach((id) => commonEventsById.set(id, entry));
        });
        (mapExtended as any).__studioCommonEventsById = commonEventsById;
        (mapExtended as any).__studioMapLoadBlocks = parseArrayValue(mapData?.mapLoadBlocks ?? mapData?.data?.mapLoadBlocks);

        mapData.events = hydratedEvents;
        mapData.commonEvents = hydratedCommonEvents;
        if (mapData?.data) {
          mapData.data.events = hydratedEvents;
          mapData.data.commonEvents = hydratedCommonEvents;
        }
        mapExtended.scale = mapData.data?.params?.scale || 1;
        const initialWeather = mapData?.data?.weather !== undefined
          ? mapData.data.weather
          : mapData?.data?.params?.weather;
        const normalizedInitialWeather = normalizeWeatherState(initialWeather);
        if (mapData?.data) {
          mapData.data.weather = normalizedInitialWeather;
          mapData.data.lighting = normalizeLightingState(mapData?.data?.lighting);
        }
        if (normalizedInitialWeather) {
          mapExtended.setWeather(normalizedInitialWeather);
        }
        // Add baseUrl to map context for use in block executors
        (mapExtended as any).apiBaseUrl = apiUrl;

        if (mapData.config?.worldMaps) {
          const worldManager = new WorldMapsManager();
          const worldMaps = prepareStudioWorldMaps(mapData.config.worldMaps);
          worldManager.configure(worldMaps);
          mapExtended.setInWorldMaps(worldManager);
        }

        await streamingModule?.map?.onBeforeUpdate?.(mapData, map);

        return map as any;
      },
      async onJoin(player: RpgPlayer, map: RpgMap) {
        const blocks = (map as any).__studioMapLoadBlocks;
        if (!Array.isArray(blocks) || blocks.length === 0) {
          return;
        }

        const blockExecutor = new BlockExecutionService(player, null, map);
        await blockExecutor.executeBlockSequence(blocks);
      },
      onLeave(player: RpgPlayer, map: RpgMap) {
        return streamingModule?.map?.onLeave?.(player, map);
      },
    },
    event: {
      onBeforeCreated(eventPlacement, map: RpgMap) {
        const mapExtended = map as RpgMapExtended;
        if (typeof eventPlacement.event === "function") {
          return eventPlacement;
        }
        let object = eventPlacement.event as Record<string, any>;

        const objectRefId = String(object?.eventId ?? object?.id ?? object?._id ?? "");
        const hasDetailedEventData = Boolean(object?.triggers && Array.isArray(object.triggers)) || Boolean(object?.params && typeof object.params === "object");

        if (!hasDetailedEventData && objectRefId) {
          const resolved = (mapExtended as any).__resolvedEventsById?.get?.(objectRefId);
          if (resolved) {
            const x = typeof object?.x === "number" ? object.x : typeof resolved?.x === "number" ? resolved.x : resolved?.position?.x;
            const y = typeof object?.y === "number" ? object.y : typeof resolved?.y === "number" ? resolved.y : resolved?.position?.y;

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
        const hitbox = resolveRuntimeEventHitbox(object, params);
        const scale = mapExtended.scale;
        const eventType = normalizeEventType(object.eventType || object.type || "character") || "character";
        const runtime = getEventTypeRuntime(eventType);

        // Add block execution utility to the event
        const eventObj: any = {};

        // If the event has triggers defined, add execution methods
        if (object.triggers && Array.isArray(object.triggers)) {
          eventObj.resolveActiveTrigger = function (player: RpgPlayer | null, event: RpgEvent) {
            const conditionPlayer = player ?? createMapVariableConditionSubject(event.getCurrentMap?.() ?? map);
            for (let i = object.triggers.length - 1; i >= 0; i--) {
              const trigger = object.triggers[i];
              const isEnabled = trigger?.enabled !== false;
              if (
                matchesPageConditions(trigger.conditions, {
                  player: conditionPlayer as any,
                  event,
                }) &&
                isEnabled
              ) {
                return { trigger, index: i };
              }
            }
            return null;
          };

          eventObj.applyActiveTrigger = function (player: RpgPlayer | null, event: RpgEvent) {
            let resolved = eventObj.resolveActiveTrigger(player, event);
            if (!resolved && !player) {
              const fallbackIndex = object.triggers.findIndex((trigger: any) => trigger?.enabled !== false);
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
            options?: {
              touchTarget?: StudioTouchTarget;
              variableScope?: "player" | "map";
            },
          ) {
            const blockExecutor = new BlockExecutionService(player, event, event.getCurrentMap?.() ?? map, { variableScope: options?.variableScope });
            const conditionPlayer = options?.variableScope === "map" ? null : player;
            const trigger = eventObj.applyActiveTrigger(conditionPlayer, event);
            if (!triggerMatchesExecution(trigger, triggerType, options?.touchTarget)) {
              return;
            }
            if (trigger && trigger.blocks) {
              await blockExecutor.executeBlockSequence(trigger.blocks);
            }
          };

          // Add trigger-specific execution methods
          eventObj.onInit = async function () {
            (this as any).sourceEventId =
              object.sourceEventId ?? object.eventId ?? object.id ?? object._id;
            (this as any).studioEventId = (this as any).sourceEventId;
            setTimeout(async () => {
              const map = this.getCurrentMap();
              const [player] = map?.getPlayers() ?? [];
              const runParallelLoop = () => {
                const loop = () => {
                  eventObj.executeBlocks(player, "onParallel", this).then(() => {
                    setTimeout(loop, 1000);
                  });
                };
                loop();
              };
              const runInitLifecycle = async (options?: { runInitBlocks?: boolean; startParallelLoop?: boolean }) => {
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

          const createContext = (player: RpgPlayer | null, event: RpgEvent, triggerType: string, touchContext?: any) => {
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
              touchContext,
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
              await eventObj.executeBlocks(player, "onTouch", this, {
                touchTarget: "player",
              });
              player.syncChanges();
            };
            if (runtime.hooks?.onTouch) {
              await runtime.hooks.onTouch(context, defaultHandler);
            } else {
              await defaultHandler();
            }
          };

          eventObj.onTouch = async function (_other: RpgPlayer | RpgEvent, touchContext: any) {
            if (touchContext?.otherType !== "event") {
              return;
            }
            const currentMap = this.getCurrentMap?.() ?? map;
            const [fallbackPlayer] = currentMap?.getPlayers?.() ?? [];
            const player = fallbackPlayer ?? null;
            const context = createContext(player, this, "onTouch", touchContext);
            const defaultHandler = async () => {
              await eventObj.executeBlocks(player, "onTouch", this, {
                touchTarget: "event",
                variableScope: "map",
              });
              player?.syncChanges?.();
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
          ...(hitbox ? { hitbox } : {}),
          id:
            object.runtimeEventId ||
            object.eventId ||
            object.id ||
            object._id,
        };
      },
    },
    database: async (map: RpgMap) => {
      const publishedMapData =
        typeof (map as any)?.data === "function"
          ? (map as any).data()
          : undefined;
      const resolvedGameConfig =
        publishedMapData?.config
        ?? (map as any)?.globalConfig
        ?? readGameConfig();
      const publishedDatabase = getPublishedStudioDatabase(map);
      if (Array.isArray(publishedDatabase)) {
        return addStudioDefaultClass(normalizeStudioDatabase(publishedDatabase), resolvedGameConfig);
      }
      if (publishedDatabase && typeof publishedDatabase === "object") {
        return addStudioDefaultClass(publishedDatabase, resolvedGameConfig);
      }
      const configuredProjectId = getStudioGameRuntimeConfig().projectId?.trim() || null;
      const gameConfig = readGameConfig();
      const response = await getGameDataProvider().getDatabase(configuredProjectId || gameConfig?._id);
      const database = normalizeStudioDatabase(response);
      return addStudioDefaultClass(database, resolvedGameConfig);
    },
  });
};
