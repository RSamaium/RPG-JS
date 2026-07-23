import { Action, Request, Room, UnhandledAction } from "@signe/room";
import {
  Hooks,
  IceMovement,
  ModulesToken,
  ProjectileMovement,
  ProjectileType,
  RpgCommonMap,
  Control,
  Direction,
  RpgCommonPlayer,
  RpgShape,
  findModules,
  type MapPhysicsInitContext,
  type MapPhysicsEntityContext,
  type RpgActionInput,
  MAP_STREAM_REQUEST_EVENT,
} from "@rpgjs/common";
import {
  DEFAULT_DAY_LIGHTING,
  DEFAULT_NIGHT_LIGHTING,
  WorldMapsManager,
  cloneLightingState,
  mergeLightingState,
  normalizeLightingState,
  type LightingState,
  type LightingTransitionOptions,
  type WeatherState,
  type WorldMapConfig,
} from "@rpgjs/common";
import { RpgPlayer, RpgEvent } from "../Player/Player";
import { createStatesSnapshotDeep, generateShortUUID, sync, type, users } from "@signe/sync";
import { signal } from "@signe/reactive";
import { inject } from "@signe/di";
import { context } from "../core/context";;
import { finalize, lastValueFrom } from "rxjs";
import { Subject } from "rxjs";
import { BehaviorSubject } from "rxjs";
import { COEFFICIENT_ELEMENTS, DAMAGE_CRITICAL, DAMAGE_PHYSIC, DAMAGE_SKILL } from "../presets";
import { z } from "zod";
import { MapOptions } from "../decorators/map";
import { EventMode } from "../decorators/event";
import { BaseRoom } from "./BaseRoom";
import type { RpgWritableSignal } from "@rpgjs/common";
import { buildSaveSlotMeta, resolveSaveStorageStrategy } from "../services/save";
import { Log } from "../logs/log";
import { createMapUpdateHeaders, isMapUpdateAuthorized, MAP_UPDATE_TOKEN_ENV, MAP_UPDATE_TOKEN_HEADER } from "../map-update";
import { RpgMapProjectiles } from "../projectiles";
import type { DamageFormulas } from "../Player/BattleManager";
import {
  filterMapStreamingProjectilePacket,
  getMapStreamingVisibleEntityIds,
  hasMapStreamingRuntime,
  isMapStreamingPositionVisible,
  refreshMapStreaming,
  removeMapStreamingPlayer,
  sendInitialMapStreaming,
} from "../map-streaming";

const DEFAULT_DASH_COOLDOWN_MS = 450;
const GROUND_TOUCH_SENSOR_COVERAGE_THRESHOLD = 0.8;
const MAP_SOURCE_STORAGE_KEY = "$room:rpgjs-map-source";
const WORLD_MAPS_STORAGE_KEY = "$room:rpgjs-world-maps";

type StoredWorldMaps = {
  id: string;
  maps: WorldMapConfig[];
};

type PhysicsCollisionEntity = {
  uuid: string;
  owner?: any;
  position?: { x: number; y: number };
  width?: number;
  height?: number;
};

type TrackedTouchCollision = {
  entityA: PhysicsCollisionEntity;
  entityB: PhysicsCollisionEntity;
};

const isDashMovementInput = (input: any): input is {
  type: "dash";
  direction: { x: number; y: number };
  additionalSpeed?: number;
  duration?: number;
  cooldown?: number;
} => input && typeof input === "object" && input.type === "dash";

const isMoveMovementInput = (input: any): input is {
  type: "move";
  direction: Direction;
} => input && typeof input === "object" && input.type === "move";

const normalizeServerMovementInput = (input: any): Direction | {
  type: "dash";
  direction: { x: number; y: number };
  additionalSpeed: number;
  duration: number;
  cooldown: number;
} | null => {
  if (isMoveMovementInput(input)) {
    return input.direction;
  }
  if (!isDashMovementInput(input)) {
    if (typeof input !== "string" && typeof input !== "number") return null;
    return input as Direction;
  }

  const rawX = Number(input.direction?.x ?? 0);
  const rawY = Number(input.direction?.y ?? 0);
  const magnitude = Math.hypot(rawX, rawY);
  if (!Number.isFinite(magnitude) || magnitude <= 0) return null;

  return {
    type: "dash",
    direction: {
      x: rawX / magnitude,
      y: rawY / magnitude,
    },
    additionalSpeed:
      typeof input.additionalSpeed === "number" && Number.isFinite(input.additionalSpeed)
        ? Math.max(0, Math.min(input.additionalSpeed, 64))
        : 8,
    duration:
      typeof input.duration === "number" && Number.isFinite(input.duration)
        ? Math.max(1, Math.min(input.duration, 1000))
        : 180,
    cooldown:
      typeof input.cooldown === "number" && Number.isFinite(input.cooldown)
        ? Math.max(0, Math.min(input.cooldown, 5000))
        : DEFAULT_DASH_COOLDOWN_MS,
  };
};

const vectorToDirection = (direction: { x: number; y: number }): Direction => {
  if (Math.abs(direction.x) > Math.abs(direction.y)) {
    return direction.x < 0 ? Direction.Left : Direction.Right;
  }
  return direction.y < 0 ? Direction.Up : Direction.Down;
};

function isRpgLog(error: unknown): error is Log {
  return error instanceof Log
    || (typeof error === "object"
      && error !== null
      && "id" in error
      && (error as any).name === "RpgLog");
}

/**
 * Interface for input controls configuration
 * 
 * Defines the structure for input validation and anti-cheat controls
 */
export interface Controls {
  /** Maximum allowed time delta between inputs in milliseconds */
  maxTimeDelta?: number;
  /** Maximum allowed frame delta between inputs */
  maxFrameDelta?: number;
  /** Minimum time between inputs in milliseconds */
  minTimeBetweenInputs?: number;
  /** Whether to enable anti-cheat validation */
  enableAntiCheat?: boolean;
  /** Maximum number of queued inputs processed per server tick */
  maxInputsPerTick?: number;
}

/**
 * Zod schema for validating map update request body
 * 
 * This schema ensures that the required fields are present and properly typed
 * when updating a map configuration.
 */
const MapUpdateSchema = z.object({
  /** Configuration object for the map (optional) */
  config: z.any().optional(),
  /** Damage formulas configuration (optional) */
  damageFormulas: z.any().optional(),
  /** Unique identifier for the map (required) */
  id: z.string(),
  /** Width of the map in pixels (required) */
  width: z.number(),
  /** Height of the map in pixels (required) */
  height: z.number(),
  /** Map events to spawn (optional) */
  events: z.array(z.any()).optional(),
  /** Optional static hitboxes (custom maps) */
  hitboxes: z.array(z.any()).optional(),
  /** Optional named positions resolved by map integrations such as Tiled */
  positions: z.record(z.string(), z.any()).optional(),
  /** Parsed tiled map payload (optional) */
  parsedMap: z.any().optional(),
  /** Raw map source payload (optional) */
  data: z.any().optional(),
  /** Optional map params payload */
  params: z.any().optional(),
});

const SAFE_MAP_WIDTH = 1000;
const SAFE_MAP_HEIGHT = 1000;

/**
 * Interface representing hook methods available for map events
 * 
 * These hooks are triggered at specific moments during the event lifecycle.
 *
 * `onInit()` is intended for base event setup when the event instance is created.
 * At this stage, the event is not reacting to a specific player yet.
 *
 * `onChanges(player)` is reactive. It is called during the change-detection cycle,
 * for example after player state changes such as variable updates or when
 * `player.syncChanges()` is executed manually.
 */
export interface EventHooks {
  /**
   * Called when the event is first initialized.
   *
   * Use this hook for default setup that does not depend on a player interaction,
   * such as setting the initial graphic, speed, or movement route.
   */
  onInit?: (this: RpgEvent) => void;
  /**
   * Called during the change-detection cycle for the current player.
   *
   * Use this hook to recompute the event state from player data, especially
   * player variables. This is useful for reactive visuals such as an opened
   * chest, a hidden door, or a conditional NPC graphic.
   */
  onChanges?: (this: RpgEvent, player: RpgPlayer) => void;
  /** Called when a player performs an action on this event */
  onAction?: (this: RpgEvent, player: RpgPlayer, input: RpgActionInput<unknown>) => void | Promise<void>;
  /** Called when a player touches this event */
  onPlayerTouch?: (this: RpgEvent, player: RpgPlayer) => void;
  /** Called when this event starts touching a player or another event */
  onTouch?: (this: RpgEvent, other: RpgPlayer | RpgEvent, context: RpgTouchContext) => void | Promise<void>;
  /** Called when this event stops touching a player or another event */
  onTouchEnd?: (this: RpgEvent, other: RpgPlayer | RpgEvent, context: RpgTouchContext) => void | Promise<void>;
  /** Called when a player enters a shape attached to the event */
  onInShape?: (this: RpgEvent, zone: RpgShape, player: RpgPlayer) => void;
  /** Called when a player exits a shape attached to the event */
  onOutShape?: (this: RpgEvent, zone: RpgShape, player: RpgPlayer) => void;
  /** Called when a player is detected entering a detection shape attached to the event */
  onDetectInShape?: (this: RpgEvent, player: RpgPlayer, shape: RpgShape) => void;
  /** Called when a player is detected exiting a detection shape attached to the event */
  onDetectOutShape?: (this: RpgEvent, player: RpgPlayer, shape: RpgShape) => void;
}

export interface RpgTouchContext {
  self: RpgEvent;
  other: RpgPlayer | RpgEvent;
  otherType: "player" | "event";
  player?: RpgPlayer;
  phase: "start" | "end";
  pairId: string;
  map: RpgMap;
}

/** Type for event class constructor */
export type EventConstructor = new () => RpgEvent;

/**
 * Object-based event definition.
 *
 * Coordinates belong to the surrounding map event wrapper, not the event definition itself.
 */
export type EventDefinition = EventHooks & {
  /** Optional display name copied to the runtime event instance */
  name?: string;
  /** Shared or scenario event mode */
  mode?: EventMode | "shared" | "scenario";
  /** Whether players can physically push this event. `false` by default. */
  pushable?: boolean;
  /** Physical mass used when the event is pushable. `0` or `Infinity` makes it immovable. */
  mass?: number;
  /** Allow custom event metadata while keeping placement fields typed separately */
  [key: string]: unknown;
  /** Disallow placement fields on the event definition itself */
  id?: never;
  event?: never;
  x?: never;
  y?: never;
  scenarioOwnerId?: never;
};

/** Public event definition type accepted by map events and dynamic event creation */
export type MapEventDefinition = EventConstructor | EventDefinition;

/** Options for positioning and defining an event on the map */
export type EventPosOption = {
  /** ID of the event */
  id?: string,

  /** X position of the event on the map */
  x?: number,
  /** Y position of the event on the map */
  y?: number,
  /** Event mode override */
  mode?: EventMode | "shared" | "scenario",
  /** Owner player id when mode is scenario */
  scenarioOwnerId?: string,
  /** Initial event hitbox in RPGJS pixels */
  hitbox?: { width?: number; height?: number; w?: number; h?: number },
  /** 
   * Event definition - can be either:
   * - A class that extends RpgEvent
   * - An object with hook methods
   */
  event: MapEventDefinition
}

/** Public placed map event type */
export type MapEventPlacement = EventPosOption;

type CreateDynamicEventOptions = {
  mode?: EventMode | "shared" | "scenario";
  scenarioOwnerId?: string;
};

interface WeatherSetOptions {
  sync?: boolean;
}

interface LightingSetOptions {
  sync?: boolean;
  cancelTransition?: boolean;
}

/**
 * Stable connection surface passed to RPGJS room lifecycle methods.
 *
 * The room runtime owns the connection. Game code may send data, close the
 * socket, or replace its application state without depending on a transport
 * implementation.
 */
export interface RpgRoomConnection<TState = unknown> {
  /** Stable public connection identifier. */
  readonly id: string;
  /** Private session identifier retained by supported reconnection flows. */
  readonly sessionId?: string;
  /** Current application-owned state. Use `setState()` to replace it. */
  readonly state: Readonly<TState> | null;
  /** Replace the application-owned connection state. */
  setState(
    state: TState | ((previous: Readonly<TState> | null) => TState) | null,
  ): Readonly<TState> | null;
  /** Send data to this connection. */
  send(data: string | ArrayBuffer | ArrayBufferView): void;
  /** Close this connection. */
  close(code?: number, reason?: string): void;
}

@Room({
  path: "map-{id}",
  persistState: true
})
export class RpgMap extends RpgCommonMap<RpgPlayer> {
  private readonly partyRoom: {
    env: Record<string, unknown>;
    getConnections(): Iterable<unknown>;
    storage: {
      get<T = unknown>(key: string): Promise<T | undefined>;
      put(key: string, value: unknown): Promise<void>;
    };
  };
  private _clientListeners = new Map<string, Set<(player: RpgPlayer, data: unknown) => void | Promise<void>>>();
  private activeTouchCollisions = new Set<string>();
  private trackedTouchCollisions = new Map<string, TrackedTouchCollision>();
  private spatialVisibleEventIds = new Map<string, Set<string>>();
  private spatialVisiblePlayerIds = new Map<string, Set<string>>();

  /** 
   * Synchronized signal containing all players currently on the map
   * 
   * This signal is automatically synchronized with clients by RPGJS.
   * Players are indexed by their unique ID.
   * 
   * @example
   * ```ts
   * // Get all players
   * const allPlayers = map.players();
   * 
   * // Get a specific player
   * const player = map.players()['player-id'];
   * ```
   */
  @users(RpgPlayer) players = signal({}) as unknown as RpgWritableSignal<Record<string, RpgPlayer>>;

  /** 
   * Synchronized signal containing all events (NPCs, objects) on the map
   * 
   * This signal is automatically synchronized with clients by RPGJS.
   * Events are indexed by their unique ID.
   * 
   * @example
   * ```ts
   * // Get all events
   * const allEvents = map.events();
   * 
   * // Get a specific event
   * const event = map.events()['event-id'];
   * ```
   */
  @sync(RpgPlayer) events = signal({}) as unknown as RpgWritableSignal<Record<string, RpgEvent>>;

  /** 
   * Signal containing the map's database of items, classes, and other game data
   * 
   * This database can be dynamically populated using `addInDatabase()` and
   * `removeInDatabase()` methods. It's used to store game entities like items,
   * classes, skills, etc. that are specific to this map.
   * 
   * @example
   * ```ts
   * // Add data to database
   * map.addInDatabase('Potion', PotionClass);
   * 
   * // Access database
   * const potion = map.database()['Potion'];
   * ```
   */
  database = signal({}) as unknown as RpgWritableSignal<Record<string, any>>;

  variables: RpgWritableSignal<Record<string, unknown>> = type(
    signal<Record<string, unknown>>({}) as never,
    "variables",
    { persist: true },
    this as never
  ) as unknown as RpgWritableSignal<Record<string, unknown>>;

  /** 
   * Array of map configurations - can contain MapOptions objects or instances of map classes
   * 
   * This array stores the configuration for this map and any related maps.
   * It's populated when the map is loaded via `updateMap()`.
   */
  maps: (MapOptions | any)[] = []

  /** 
   * Array of sound IDs to play when players join the map
   * 
   * These sounds are automatically played for each player when they join the map.
   * Sounds must be defined on the client side.
   * 
   * @example
   * ```ts
   * // Set sounds for the map
   * map.sounds = ['background-music', 'ambient-forest'];
   * ```
   */
  sounds: string[] = []

  /** 
   * BehaviorSubject that completes when the map data is ready
   * 
   * This subject is used to signal when the map has finished loading all its data.
   * Players wait for this to complete before the map is fully initialized.
   * 
   * @example
   * ```ts
   * // Wait for map data to be ready
   * map.dataIsReady$.subscribe(() => {
   *   console.log('Map is ready!');
   * });
   * ```
   */
  dataIsReady$ = new BehaviorSubject<void>(undefined);

  /** 
   * Global configuration object for the map
   * 
   * This object contains configuration settings that apply to the entire map.
   * It's populated from the map data when `updateMap()` is called.
   */
  globalConfig: any = {}

  /** 
   * Damage formulas configuration for the map
   * 
   * Contains formulas for calculating damage from skills, physical attacks,
   * critical hits, and element coefficients. Default formulas are merged
   * with custom formulas when the map is loaded.
   */
  damageFormulas: DamageFormulas = {}
  private _weatherState: WeatherState | null = null;
  private _lightingState: LightingState | null = null;
  private _lightingTransitionTimer?: ReturnType<typeof setInterval>;
  /** Internal: Map of shapes by name */
  private _shapes: Map<string, RpgShape> = new Map();
  /** Internal: Map of shape entity UUIDs to RpgShape instances */
  private _shapeEntities: Map<string, RpgShape> = new Map();
  private _serverTickInProgress = false;
  private _queuedServerTickDelta = 0;
  private _serverTickLoopVersion = 0;
  /** Enable/disable automatic tick processing (useful for unit tests) */
  private _autoTickEnabled: boolean = true;
  /** Runtime templates for scenario events to instantiate per player */
  private _scenarioEventTemplates: EventPosOption[] = [];
  /** Runtime registry of event mode by id */
  private _eventModeById: Map<string, EventMode> = new Map();
  /** Runtime registry of scenario owner by event id */
  private _eventOwnerById: Map<string, string> = new Map();
  /** Runtime registry of spawned scenario event ids by player id */
  private _scenarioEventIdsByPlayer: Map<string, Set<string>> = new Map();
  private _syncChangesDepth = 0;
  projectiles = new RpgMapProjectiles(this);

  autoSync: boolean = true;

  constructor(room) {
    super();
    this.partyRoom = room;
    this.hooks.callHooks("server-map-onStart", this).subscribe();
    const isTest = room.env.TEST === 'true' ? true : false;
    if (isTest) {
      this.autoSync = false;
      this.setAutoTick(false);
      this.autoTickEnabled = false;
      this.throttleSync = 0;
      this.throttleStorage = 0;
    }
    else {
      this.throttleSync = this.isStandalone ? 1 : 50
      this.throttleStorage = this.isStandalone ? 1 : 50
    };
    this.sessionExpiryTime = 1000 * 60 * 5;
    this.setupCollisionDetection();
  }

  onStart() {
    return BaseRoom.prototype.onStart.call(this)
  }

  /** Rebuild non-serializable map resources after a room restart or hibernation. */
  async onRestore() {
    const restoredMap = this.data();
    if (!restoredMap?.id) return;
    const token = this.getRuntimeMapUpdateToken();
    await this.updateMap({
      url: `http://localhost/parties/main/map-${restoredMap.id}/map/update`,
      method: "POST",
      headers: createMapUpdateHeaders(token),
      json: async () => restoredMap,
      text: async () => JSON.stringify(restoredMap),
    } as Request);
    await this.restoreWorldMapsRuntime();
  }

  private getRuntimeMapUpdateToken(): string | undefined {
    const token = this.partyRoom.env[MAP_UPDATE_TOKEN_ENV];
    return typeof token === "string" && token.length > 0 ? token : undefined;
  }

  private async restoreMapStreamingRuntime(): Promise<void> {
    if (hasMapStreamingRuntime(this)) return;
    const storedMap = await this.partyRoom.storage.get<any>(MAP_SOURCE_STORAGE_KEY);
    if (!storedMap?.id) return;
    const token = this.getRuntimeMapUpdateToken();
    await this.updateMap({
      url: `http://localhost/parties/main/map-${storedMap.id}/map/update`,
      method: "POST",
      headers: createMapUpdateHeaders(token),
      data: storedMap,
      json: async () => storedMap,
      text: async () => JSON.stringify(storedMap),
    } as unknown as Request);
    await this.restoreWorldMapsRuntime();
  }

  private async restoreWorldMapsRuntime(): Promise<void> {
    const storedWorld = await this.partyRoom.storage.get<StoredWorldMaps>(WORLD_MAPS_STORAGE_KEY);
    if (!storedWorld?.id || !Array.isArray(storedWorld.maps)) return;
    await this.updateWorldMaps(storedWorld.id, storedWorld.maps);
  }

  private hasActiveConnections(): boolean {
    return Array.from(this.partyRoom.getConnections()).length > 0;
  }

  protected emitPhysicsInit(context: MapPhysicsInitContext): void {
    this.hooks.callHooks("server-map-onPhysicsInit", this, context).subscribe();
  }

  protected emitPhysicsEntityAdd(context: MapPhysicsEntityContext): void {
    this.hooks.callHooks("server-map-onPhysicsEntityAdd", this, context).subscribe();
  }

  protected emitPhysicsEntityRemove(context: MapPhysicsEntityContext): void {
    this.hooks.callHooks("server-map-onPhysicsEntityRemove", this, context).subscribe();
  }

  protected emitPhysicsReset(): void {
    this.hooks.callHooks("server-map-onPhysicsReset", this).subscribe();
  }

  protected runFixedTicks(
    deltaMs: number,
    hooks?: {
      beforeStep?: () => void;
      afterStep?: (tick: number) => void;
    },
  ): number {
    const fixedStep = this.physic.getWorld().getTimeStep();
    return super.runFixedTicks(deltaMs, {
      beforeStep: hooks?.beforeStep,
      afterStep: (tick) => {
        this.refreshTrackedTouchCollisions();
        hooks?.afterStep?.(tick);
        this.projectiles.step(fixedStep);
        refreshMapStreaming(this);
      },
    });
  }

  protected async runFixedTicksAsync(
    deltaMs: number,
    hooks?: {
      beforeStep?: () => void | Promise<void>;
      afterStep?: (tick: number) => void | Promise<void>;
    },
  ): Promise<number> {
    const fixedStep = this.physic.getWorld().getTimeStep();
    return super.runFixedTicksAsync(deltaMs, {
      beforeStep: hooks?.beforeStep,
      afterStep: async (tick) => {
        this.refreshTrackedTouchCollisions();
        await hooks?.afterStep?.(tick);
        this.projectiles.step(fixedStep);
        refreshMapStreaming(this);
      },
    });
  }

  loadPhysic(): void {
    const shouldAutoTick = this._autoTickEnabled;
    const previousAutoTickEnabled = this.autoTickEnabled;
    this.autoTickEnabled = false;
    super.loadPhysic();
    this.autoTickEnabled = previousAutoTickEnabled;

    if (shouldAutoTick) {
      this.startServerTickLoop();
    }
  }

  clearPhysic(): void {
    super.clearPhysic();
    this.projectiles.clear();
  }

  private isPositiveNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value) && value > 0;
  }

  private resolveTrustedMapDimensions(map: any): void {
    const normalizedId = typeof map?.id === "string"
      ? map.id.replace(/^map-/, "")
      : "";
    const worldMapInfo = normalizedId
      ? this.worldMapsManager?.getMapInfo(normalizedId)
      : null;

    if (!this.isPositiveNumber(map?.width)) {
      map.width = this.isPositiveNumber(worldMapInfo?.width)
        ? worldMapInfo.width
        : SAFE_MAP_WIDTH;
    }

    if (!this.isPositiveNumber(map?.height)) {
      map.height = this.isPositiveNumber(worldMapInfo?.height)
        ? worldMapInfo.height
        : SAFE_MAP_HEIGHT;
    }
  }

  private normalizeEventMode(mode: unknown): EventMode {
    return mode === EventMode.Scenario || mode === "scenario"
      ? EventMode.Scenario
      : EventMode.Shared;
  }

  private resolveEventMode(eventObj: any): EventMode {
    if (!eventObj) return EventMode.Shared;

    if (eventObj.mode !== undefined) {
      return this.normalizeEventMode(eventObj.mode);
    }

    const eventDef = eventObj.event ?? eventObj;
    if (eventDef?.mode !== undefined) {
      return this.normalizeEventMode(eventDef.mode);
    }

    if (typeof eventDef === "function") {
      const staticMode = (eventDef as any).mode;
      const prototypeMode = (eventDef as any).prototype?.mode;
      if (staticMode !== undefined) {
        return this.normalizeEventMode(staticMode);
      }
      if (prototypeMode !== undefined) {
        return this.normalizeEventMode(prototypeMode);
      }
    }

    return EventMode.Shared;
  }

  private resolveScenarioOwnerId(eventObj: any): string | undefined {
    if (!eventObj) return undefined;
    const ownerId = eventObj.scenarioOwnerId
      ?? eventObj._scenarioOwnerId
      ?? eventObj.event?.scenarioOwnerId
      ?? eventObj.event?._scenarioOwnerId;
    return typeof ownerId === "string" && ownerId.length > 0 ? ownerId : undefined;
  }

  private resolveEventMass(eventObj: any): number | undefined {
    const eventDef = eventObj?.event ?? eventObj;

    const readMass = (value: unknown): number | undefined => (
      typeof value === "number" && !Number.isNaN(value) && value >= 0
        ? value
        : undefined
    );

    const objectMass = readMass(eventDef?.mass);
    if (objectMass !== undefined) {
      return objectMass;
    }

    if (typeof eventDef === "function") {
      return readMass((eventDef as any).mass)
        ?? readMass((eventDef as any).prototype?._eventDataMass);
    }

    return undefined;
  }

  private resolveEventPushable(eventObj: any): boolean {
    const eventDef = eventObj?.event ?? eventObj;

    const readPushable = (value: unknown): boolean | undefined => (
      typeof value === "boolean" ? value : undefined
    );

    const objectPushable = readPushable(eventDef?.pushable);
    if (objectPushable !== undefined) {
      return objectPushable;
    }

    if (typeof eventDef === "function") {
      return readPushable((eventDef as any).pushable)
        ?? readPushable((eventDef as any).prototype?._eventDataPushable)
        ?? false;
    }

    return false;
  }

  private resolveEventHitbox(eventObj: any): { width: number; height: number } | undefined {
    const readHitbox = (value: unknown): { width: number; height: number } | undefined => {
      if (!value || typeof value !== "object") return undefined;
      const record = value as Record<string, unknown>;
      const widthValue = record.width ?? record.w;
      const heightValue = record.height ?? record.h;
      const width = typeof widthValue === "number" ? widthValue : Number(widthValue);
      const height = typeof heightValue === "number" ? heightValue : Number(heightValue);
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        return undefined;
      }
      return {
        width: Math.max(1, Math.round(width)),
        height: Math.max(1, Math.round(height)),
      };
    };

    const eventDef = eventObj?.event ?? eventObj;
    const directHitbox = readHitbox(eventObj?.hitbox);
    if (directHitbox) return directHitbox;

    const objectHitbox = readHitbox(eventDef?.hitbox);
    if (objectHitbox) return objectHitbox;

    if (typeof eventDef === "function") {
      return readHitbox((eventDef as any).hitbox)
        ?? readHitbox((eventDef as any).prototype?.hitbox);
    }

    return undefined;
  }

  private normalizeEventObject(eventObj: EventPosOption | any): EventPosOption {
    if (eventObj && typeof eventObj === "object" && "event" in eventObj) {
      return eventObj as EventPosOption;
    }
    return {
      event: eventObj as any,
    };
  }

  private cloneEventTemplate(eventObj: EventPosOption): EventPosOption {
    const clone: EventPosOption = { ...eventObj };
    if (clone.event && typeof clone.event === "object") {
      clone.event = { ...(clone.event as Record<string, any>) } as any;
    }
    return clone;
  }

  private buildRuntimeEventId(baseId: string | undefined, mode: EventMode, scenarioOwnerId?: string): string {
    const fallbackId = baseId || generateShortUUID();
    if (mode !== EventMode.Scenario || !scenarioOwnerId) {
      return fallbackId;
    }

    const scopedId = `${fallbackId}::${scenarioOwnerId}`;
    if (!this.events()[scopedId]) {
      return scopedId;
    }
    return `${scopedId}::${generateShortUUID()}`;
  }

  private setEventRuntimeMetadata(eventId: string, mode: EventMode, scenarioOwnerId?: string): void {
    this._eventModeById.set(eventId, mode);
    if (mode === EventMode.Scenario && scenarioOwnerId) {
      this._eventOwnerById.set(eventId, scenarioOwnerId);
      const ids = this._scenarioEventIdsByPlayer.get(scenarioOwnerId) ?? new Set<string>();
      ids.add(eventId);
      this._scenarioEventIdsByPlayer.set(scenarioOwnerId, ids);
      return;
    }
    this._eventOwnerById.delete(eventId);
  }

  private clearEventRuntimeMetadata(eventId: string): void {
    this._eventModeById.delete(eventId);
    const ownerId = this._eventOwnerById.get(eventId);
    if (ownerId) {
      const ids = this._scenarioEventIdsByPlayer.get(ownerId);
      if (ids) {
        ids.delete(eventId);
        if (ids.size === 0) {
          this._scenarioEventIdsByPlayer.delete(ownerId);
        }
      }
    }
    this._eventOwnerById.delete(eventId);
  }

  private getEventModeById(eventId: string): EventMode {
    const runtimeMode = this._eventModeById.get(eventId);
    if (runtimeMode) {
      return runtimeMode;
    }
    const event = this.getEvent(eventId) as any;
    return this.normalizeEventMode(event?.mode);
  }

  private getScenarioOwnerIdByEventId(eventId: string): string | undefined {
    const runtimeOwnerId = this._eventOwnerById.get(eventId);
    if (runtimeOwnerId) {
      return runtimeOwnerId;
    }
    const event = this.getEvent(eventId) as any;
    const ownerId = event?._scenarioOwnerId ?? event?.scenarioOwnerId;
    return typeof ownerId === "string" && ownerId.length > 0 ? ownerId : undefined;
  }

  isEventVisibleForPlayer(eventOrId: string | RpgEvent, playerOrId: string | RpgPlayer): boolean {
    const playerId = typeof playerOrId === "string" ? playerOrId : playerOrId?.id;
    if (!playerId) {
      return false;
    }
    const eventId = typeof eventOrId === "string" ? eventOrId : eventOrId?.id;
    if (!eventId) {
      return false;
    }
    const mode = this.getEventModeById(eventId);
    if (mode === EventMode.Shared) {
      return true;
    }
    const ownerId = this.getScenarioOwnerIdByEventId(eventId);
    return ownerId === playerId;
  }

  private async spawnScenarioEventsForPlayer(player: RpgPlayer): Promise<void> {
    if (!player?.id || this._scenarioEventTemplates.length === 0) {
      return;
    }
    this.removeScenarioEventsForPlayer(player.id);
    for (const template of this._scenarioEventTemplates) {
      const clone = this.cloneEventTemplate(template);
      await this.createDynamicEvent(clone, { mode: EventMode.Scenario, scenarioOwnerId: player.id });
    }
  }

  private removeScenarioEventsForPlayer(playerId: string): void {
    const ids = this._scenarioEventIdsByPlayer.get(playerId);
    if (!ids || ids.size === 0) {
      return;
    }
    for (const eventId of [...ids]) {
      const event = this.getEvent(eventId) as any;
      if (event && typeof event.remove === "function") {
        try {
          event.remove();
          continue;
        }
        catch {
          // Fallback to direct map removal when the event lifecycle is already partially torn down.
        }
      }
      this.removeEvent(eventId);
    }
    this._scenarioEventIdsByPlayer.delete(playerId);
  }

  private readBooleanSignal(value: any): boolean {
    if (typeof value === "function") {
      try {
        return value() === true;
      } catch {
        return false;
      }
    }
    return value === true;
  }

  private isGroundTouchSensorEntity(
    entity: PhysicsCollisionEntity,
    other: PhysicsCollisionEntity,
  ): boolean {
    const owner = entity.owner;
    if (!owner) return false;
    const otherIsEvent = !!this.getEvent(other.uuid);
    const through = this.readBooleanSignal(owner._through) || owner.through === true;
    const throughEvent =
      otherIsEvent &&
      (this.readBooleanSignal(owner._throughEvent) || owner.throughEvent === true);
    return through || throughEvent;
  }

  private haveDifferentTouchableZ(
    entityA: PhysicsCollisionEntity,
    entityB: PhysicsCollisionEntity,
  ): boolean {
    const zA = entityA.owner?.z();
    const zB = entityB.owner?.z();
    if (
      zA !== zB &&
      Number(zA) <= 0 &&
      Number(zB) <= 0 &&
      (this.isGroundTouchSensorEntity(entityA, entityB) ||
        this.isGroundTouchSensorEntity(entityB, entityA))
    ) {
      return false;
    }
    return zA !== zB;
  }

  private buildTouchPairId(
    entityA: PhysicsCollisionEntity,
    entityB: PhysicsCollisionEntity,
  ): string {
    return entityA.uuid < entityB.uuid
      ? `${entityA.uuid}-${entityB.uuid}`
      : `${entityB.uuid}-${entityA.uuid}`;
  }

  private getPhysicsRect(entity: PhysicsCollisionEntity): {
    left: number;
    top: number;
    right: number;
    bottom: number;
    area: number;
  } | null {
    const width = Number(entity.width);
    const height = Number(entity.height);
    const centerX = Number(entity.position?.x);
    const centerY = Number(entity.position?.y);
    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0 ||
      !Number.isFinite(centerX) ||
      !Number.isFinite(centerY)
    ) {
      return null;
    }
    const left = centerX - width / 2;
    const top = centerY - height / 2;
    return {
      left,
      top,
      right: left + width,
      bottom: top + height,
      area: width * height,
    };
  }

  private getSensorCoverage(
    sensor: PhysicsCollisionEntity,
    other: PhysicsCollisionEntity,
  ): number {
    const sensorRect = this.getPhysicsRect(sensor);
    const otherRect = this.getPhysicsRect(other);
    if (!sensorRect || !otherRect || sensorRect.area <= 0) {
      return 0;
    }
    const overlapWidth = Math.max(
      0,
      Math.min(sensorRect.right, otherRect.right) -
        Math.max(sensorRect.left, otherRect.left),
    );
    const overlapHeight = Math.max(
      0,
      Math.min(sensorRect.bottom, otherRect.bottom) -
        Math.max(sensorRect.top, otherRect.top),
    );
    return (overlapWidth * overlapHeight) / sensorRect.area;
  }

  private hasEnoughGroundSensorCoverage(
    entityA: PhysicsCollisionEntity,
    entityB: PhysicsCollisionEntity,
  ): boolean {
    const eventA = this.getEvent<RpgEvent>(entityA.uuid);
    const eventB = this.getEvent<RpgEvent>(entityB.uuid);
    if (!eventA || !eventB) {
      return true;
    }
    const sensors: Array<[PhysicsCollisionEntity, PhysicsCollisionEntity]> = [];
    if (this.isGroundTouchSensorEntity(entityA, entityB)) {
      sensors.push([entityA, entityB]);
    }
    if (this.isGroundTouchSensorEntity(entityB, entityA)) {
      sensors.push([entityB, entityA]);
    }
    if (sensors.length === 0) {
      return true;
    }
    return sensors.every(([sensor, other]) =>
      this.getSensorCoverage(sensor, other) >= GROUND_TOUCH_SENSOR_COVERAGE_THRESHOLD
    );
  }

  private dispatchTouch(
    self: RpgEvent,
    other: RpgPlayer | RpgEvent,
    otherType: "player" | "event",
    phase: "start" | "end",
    pairId: string,
    player?: RpgPlayer,
  ): void {
    const context: RpgTouchContext = {
      self,
      other,
      otherType,
      player,
      phase,
      pairId,
      map: this,
    };
    const method = phase === "start" ? "onTouch" : "onTouchEnd";
    void self.execMethod(method, [other, context]);
  }

  private dispatchTouchCollision(
    entityA: PhysicsCollisionEntity,
    entityB: PhysicsCollisionEntity,
    phase: "start" | "end",
    pairId: string,
  ): boolean {
    const playerA = this.getPlayer(entityA.uuid);
    const playerB = this.getPlayer(entityB.uuid);
    const eventA = this.getEvent<RpgEvent>(entityA.uuid);
    const eventB = this.getEvent<RpgEvent>(entityB.uuid);

    if (playerA && eventB && this.isEventVisibleForPlayer(eventB, playerA)) {
      this.dispatchTouch(eventB, playerA, "player", phase, pairId, playerA);
      if (phase === "start") {
        void eventB.execMethod("onPlayerTouch", [playerA]);
      }
      return true;
    }

    if (playerB && eventA && this.isEventVisibleForPlayer(eventA, playerB)) {
      this.dispatchTouch(eventA, playerB, "player", phase, pairId, playerB);
      if (phase === "start") {
        void eventA.execMethod("onPlayerTouch", [playerB]);
      }
      return true;
    }

    if (eventA && eventB) {
      this.dispatchTouch(eventA, eventB, "event", phase, pairId);
      this.dispatchTouch(eventB, eventA, "event", phase, pairId);
      return true;
    }

    return false;
  }

  private canActivateTouchCollision(
    entityA: PhysicsCollisionEntity,
    entityB: PhysicsCollisionEntity,
  ): boolean {
    return (
      !this.haveDifferentTouchableZ(entityA, entityB) &&
      this.hasEnoughGroundSensorCoverage(entityA, entityB)
    );
  }

  private updateTrackedTouchCollision(
    pairId: string,
    collision: TrackedTouchCollision,
  ): void {
    const active = this.activeTouchCollisions.has(pairId);
    const canActivate = this.canActivateTouchCollision(
      collision.entityA,
      collision.entityB,
    );

    if (canActivate && !active) {
      if (this.dispatchTouchCollision(collision.entityA, collision.entityB, "start", pairId)) {
        this.activeTouchCollisions.add(pairId);
      }
      return;
    }

    if (!canActivate && active) {
      this.dispatchTouchCollision(collision.entityA, collision.entityB, "end", pairId);
      this.activeTouchCollisions.delete(pairId);
    }
  }

  private refreshTrackedTouchCollisions(): void {
    for (const [pairId, collision] of this.trackedTouchCollisions) {
      this.updateTrackedTouchCollision(pairId, collision);
    }
  }

  private trackTouchCollision(
    entityA: PhysicsCollisionEntity,
    entityB: PhysicsCollisionEntity,
  ): void {
    const pairId = this.buildTouchPairId(entityA, entityB);
    const collision = { entityA, entityB };
    this.trackedTouchCollisions.set(pairId, collision);
    this.updateTrackedTouchCollision(pairId, collision);
  }

  private untrackTouchCollision(
    entityA: PhysicsCollisionEntity,
    entityB: PhysicsCollisionEntity,
    options: { dispatchEnd?: boolean } = {},
  ): void {
    const pairId = this.buildTouchPairId(entityA, entityB);
    if (this.activeTouchCollisions.has(pairId) && options.dispatchEnd !== false) {
      this.dispatchTouchCollision(entityA, entityB, "end", pairId);
    }
    if (this.activeTouchCollisions.has(pairId)) {
      this.activeTouchCollisions.delete(pairId);
    }
    this.trackedTouchCollisions.delete(pairId);
  }

  /**
   * Setup collision detection between players, events, and shapes
   * 
   * This method listens to physics collision events and triggers hooks:
   * - `onPlayerTouch` on events when a player collides with them
   * - `onInShape` on players and events when they enter a shape
   * - `onOutShape` on players and events when they exit a shape
   * 
   * ## Architecture
   * 
   * Uses the physics engine's collision event system to detect when entities collide.
   * When a collision is detected:
   * - Between a player and an event: triggers `onPlayerTouch` on the event
   * - Between a player/event and a shape: triggers `onInShape`/`onOutShape` hooks
   * 
   * @example
   * ```ts
   * // Event with onPlayerTouch hook
   * map.createDynamicEvent({
   *   x: 100,
   *   y: 200,
   *   event: {
   *     onPlayerTouch(player) {
   *       console.log(`Player ${player.id} touched this event!`);
   *     }
   *   }
   * });
   * 
   * // Player with onInShape hook
   * const player: RpgPlayerHooks = {
   *   onInShape(player: RpgPlayer, shape: RpgShape) {
   *     console.log('in', player.name, shape.name);
   *   },
   *   onOutShape(player: RpgPlayer, shape: RpgShape) {
   *     console.log('out', player.name, shape.name);
   *   }
   * };
   * ```
   */
  private setupCollisionDetection(): void {
    // Track collisions to avoid calling hooks multiple times for the same collision
    const activeShapeCollisions = new Set<string>();
    this.activeTouchCollisions.clear();
    this.trackedTouchCollisions.clear();

    // Listen to collision enter events
    this.physic.getEvents().onCollisionEnter((collision) => {
      const entityA = collision.entityA;
      const entityB = collision.entityB;

      // Skip collision callbacks if entities have different z (height)
      // Higher z entities should not trigger collision callbacks with lower z entities
      if (this.haveDifferentTouchableZ(entityA, entityB)) {
        return;
      }

      // Check for shape collisions first
      const shapeA = this._shapeEntities.get(entityA.uuid);
      const shapeB = this._shapeEntities.get(entityB.uuid);

      if (shapeA || shapeB) {
        // One of the entities is a shape
        const shape = shapeA || shapeB;
        const otherEntity = shapeA ? entityB : entityA;

        if (shape) {
          const shapeKey = `${otherEntity.uuid}-${shape.name}`;
          if (!activeShapeCollisions.has(shapeKey)) {
            activeShapeCollisions.add(shapeKey);

            // Check if the other entity is a player or event
            const player = this.getPlayer(otherEntity.uuid);
            const event = this.getEvent<RpgEvent>(otherEntity.uuid);

            if (player) {
              // Trigger onInShape hook on player
              player.execMethod('onInShape', [player, shape]);
            }
            if (event) {
              // Trigger onInShape hook on event
              event.execMethod('onInShape', [shape, player || event]);
            }
          }
        }
        return;
      }

      this.trackTouchCollision(entityA, entityB);
    });

    // Listen to collision exit events to clean up tracking
    this.physic.getEvents().onCollisionExit((collision) => {
      const entityA = collision.entityA;
      const entityB = collision.entityB;

      // Skip collision callbacks if entities have different z (height)
      if (this.haveDifferentTouchableZ(entityA, entityB)) {
        this.untrackTouchCollision(entityA, entityB, { dispatchEnd: false });
        return;
      }

      // Check for shape collisions
      const shapeA = this._shapeEntities.get(entityA.uuid);
      const shapeB = this._shapeEntities.get(entityB.uuid);

      if (shapeA || shapeB) {
        // One of the entities is a shape
        const shape = shapeA || shapeB;
        const otherEntity = shapeA ? entityB : entityA;

        if (shape) {
          const shapeKey = `${otherEntity.uuid}-${shape.name}`;
          if (activeShapeCollisions.has(shapeKey)) {
            activeShapeCollisions.delete(shapeKey);

            // Check if the other entity is a player or event
            const player = this.getPlayer(otherEntity.uuid);
            const event = this.getEvent<RpgEvent>(otherEntity.uuid);

            if (player) {
              // Trigger onOutShape hook on player
              player.execMethod('onOutShape', [player, shape]);
            }
            if (event) {
              // Trigger onOutShape hook on event
              event.execMethod('onOutShape', [shape, player || event]);
            }
          }
        }
        return;
      }

      this.untrackTouchCollision(entityA, entityB);
    });
  }

  setVariable<T = unknown>(key: string, val: T): void {
    this.variables.mutate((variables) => {
      variables[key] = val;
    });
    this.syncChanges();
  }

  getVariable<T = unknown>(key: string): T | undefined {
    return this.variables()[key] as T | undefined;
  }

  removeVariable(key: string): boolean {
    const variables = this.variables();
    if (!(key in variables)) {
      return false;
    }
    this.variables.mutate((draft) => {
      delete draft[key];
    });
    this.syncChanges();
    return true;
  }

  hasVariable(key: string): boolean {
    return key in this.variables();
  }

  getVariableKeys(): string[] {
    return Object.keys(this.variables());
  }

  clearVariables(): void {
    this.variables.set({});
    this.syncChanges();
  }

  syncChanges(): void {
    if (this._syncChangesDepth > 0) {
      return;
    }
    this._syncChangesDepth += 1;
    try {
      for (const player of Object.values(this.players()) as RpgPlayer[]) {
        player.syncChanges();
      }
    }
    finally {
      this._syncChangesDepth -= 1;
    }
  }

  /**
   * Intercepts and modifies packets before they are sent to clients
   * 
   * This method is automatically called by the RPGJS room runtime for each packet sent to clients.
   * It adds timestamp and acknowledgment information to sync packets for client-side
   * prediction reconciliation. This helps with network synchronization and reduces
   * perceived latency.
   * 
   * ## Architecture
   * 
   * Adds metadata to packets:
   * - `timestamp`: Current server time for client-side prediction
   * - `ack`: Acknowledgment info with last processed frame and authoritative position
   * 
   * @param player - The player receiving the packet
   * @param packet - The packet data to intercept
   * @param conn - The connection object
   * @returns Modified packet with timestamp and ack info, or null if player is invalid
   * 
   * @example
   * ```ts
   * // This method is called automatically by the framework
   * // You typically don't call it directly
   * ```
   */
  interceptorPacket(player: RpgPlayer, packet: any, conn: RpgRoomConnection) {
    let obj: any = {}
    let packetValue = packet?.value;

    if (!player) {
      return null
    }
    packet = filterMapStreamingProjectilePacket(this, player, packet);
    if (!packet) return null;
    packetValue = packet?.value;

    // Add timestamp to sync packets for client-side prediction reconciliation
    if (packet && typeof packet === 'object') {
      obj.timestamp = Date.now();

      // Add ack info: last processed frame and authoritative position.
      // When the sync payload already contains this player's coordinates,
      // prefer them to keep ack state aligned with the snapshot sent to the client.
      if (player) {
        const value = packet.value && typeof packet.value === "object" ? packet.value : undefined;
        const packetPlayers = value?.players && typeof value.players === "object" ? value.players : undefined;
        const playerSnapshot = packetPlayers?.[player.id];
        const bodyPos = this.getBodyPosition(player.id, "top-left");
        const ackX =
          typeof playerSnapshot?.x === "number" ? playerSnapshot.x : bodyPos?.x ?? player.x();
        const ackY =
          typeof playerSnapshot?.y === "number" ? playerSnapshot.y : bodyPos?.y ?? player.y();
        const lastFramePositions = player._lastFramePositions;
        obj.ack = {
          frame: lastFramePositions?.frame ?? 0,
          serverTick: this.getTick(),
          x: Math.round(ackX),
          y: Math.round(ackY),
          direction: playerSnapshot?.direction ?? player.direction(),
        };
      }
    }

    if (packet?.type === "sync" && packetValue && typeof packetValue === "object") {
      packetValue = { ...packetValue };
      const previousEvents = this.spatialVisibleEventIds.get(player.id) ?? new Set<string>();
      const previousPlayers = this.spatialVisiblePlayerIds.get(player.id) ?? new Set<string>();
      const streamingVisibility = getMapStreamingVisibleEntityIds(this, player);
      const visibleEvents = streamingVisibility?.events ?? new Set(previousEvents);
      const visiblePlayers = streamingVisibility?.players ?? new Set(previousPlayers);

      // Keep previously visible entities when their current authoritative
      // position is still retained. This avoids a transient delete if the
      // physics broad phase is one update behind synchronized state.
      if (streamingVisibility) {
        for (const eventId of previousEvents) {
          const event = this.events()[eventId];
          if (event && isMapStreamingPositionVisible(this, player, event.x(), event.y())) {
            visibleEvents.add(eventId);
          }
        }
        for (const otherId of previousPlayers) {
          const other = this.players()[otherId];
          if (other && (otherId === player.id
            || isMapStreamingPositionVisible(this, player, other.x(), other.y()))) {
            visiblePlayers.add(otherId);
          }
        }
      }

      // Packet entries supplement the physics query. This covers an entity
      // created or moved immediately before the broad-phase index is updated.
      for (const [eventId, value] of Object.entries(packetValue.events ?? {})) {
        if (value === "$delete") {
          visibleEvents.delete(eventId);
          continue;
        }
        const event = this.events()[eventId];
        if (event && this.isEventVisibleForPlayer(eventId, player)
          && (!streamingVisibility || isMapStreamingPositionVisible(this, player, event.x(), event.y()))) {
          visibleEvents.add(eventId);
        }
        else {
          visibleEvents.delete(eventId);
        }
      }
      for (const eventId of [...visibleEvents]) {
        const event = this.events()[eventId];
        if (!event || !this.isEventVisibleForPlayer(eventId, player)) {
          visibleEvents.delete(eventId);
        }
      }

      for (const [otherId, value] of Object.entries(packetValue.players ?? {})) {
        if (value === "$delete") {
          visiblePlayers.delete(otherId);
          continue;
        }
        const other = this.players()[otherId];
        if (other && (otherId === player.id || !streamingVisibility
          || isMapStreamingPositionVisible(this, player, other.x(), other.y()))) {
          visiblePlayers.add(otherId);
        }
        else {
          visiblePlayers.delete(otherId);
        }
      }
      visiblePlayers.add(player.id);

      const eventChanges: Record<string, unknown> = {};
      for (const [eventId, value] of Object.entries(packetValue.events ?? {})) {
        if (visibleEvents.has(eventId)) eventChanges[eventId] = value;
      }
      for (const eventId of visibleEvents) {
        if (!previousEvents.has(eventId)) {
          eventChanges[eventId] = createStatesSnapshotDeep(this.events()[eventId]);
        }
      }
      for (const eventId of previousEvents) {
        if (!visibleEvents.has(eventId)) eventChanges[eventId] = "$delete";
      }
      if (Object.keys(eventChanges).length > 0) packetValue.events = eventChanges;
      else delete packetValue.events;
      this.spatialVisibleEventIds.set(player.id, visibleEvents);

      const playerChanges: Record<string, unknown> = {};
      for (const [otherId, value] of Object.entries(packetValue.players ?? {})) {
        if (visiblePlayers.has(otherId)) playerChanges[otherId] = value;
      }
      for (const otherId of visiblePlayers) {
        if (!previousPlayers.has(otherId)) {
          const otherPlayer = this.players()[otherId];
          const existingPatch = playerChanges[otherId];
          playerChanges[otherId] = {
            ...createStatesSnapshotDeep(otherPlayer),
            ...(existingPatch && typeof existingPatch === "object" ? existingPatch : {}),
            // createStatesSnapshotDeep intentionally excludes persist:false
            // signals. `isConnected` is one of them, but the client uses it to
            // decide whether the character sprite is visible.
            isConnected: otherPlayer.isConnected(),
          };
        }
      }
      for (const otherId of previousPlayers) {
        if (!visiblePlayers.has(otherId)) playerChanges[otherId] = "$delete";
      }
      if (Object.keys(playerChanges).length > 0) packetValue.players = playerChanges;
      else delete packetValue.players;
      this.spatialVisiblePlayerIds.set(player.id, visiblePlayers);
    }

    if (typeof packet.value == 'string') {
      return packet
    }

    return {
      ...packet,
      value: {
        ...packetValue,
        ...obj
      }
    };
  }

  /**
   * Called when a player joins the map
   * 
   * This method is automatically called by the RPGJS room runtime when a player connects to the map.
   * It initializes the player's connection, sets up the map context, and waits for
   * the map data to be ready before playing sounds and triggering hooks.
   * 
   * ## Architecture
   * 
   * 1. Sets player's map reference and context
   * 2. Initializes the player
   * 3. Waits for map data to be ready
   * 4. Plays map sounds for the player
   * 5. Triggers `server-player-onJoinMap` hook
   * 
   * @param player - The player joining the map
   * @param conn - The connection object for the player
   * 
   * @example
   * ```ts
   * // This method is called automatically by the framework
   * // You can listen to the hook to perform custom logic
   * server.addHook('server-player-onJoinMap', (player, map) => {
   *   console.log(`Player ${player.id} joined map ${map.id}`);
   * });
   * ```
   */
  onJoin(player: RpgPlayer, conn: RpgRoomConnection) {
    // A reconnect reuses the public player id but starts with an empty client
    // entity cache. Force the next sync packet to include every visible entity.
    this.spatialVisibleEventIds.delete(player.id);
    this.spatialVisiblePlayerIds.delete(player.id);
    if (this.data()?.id) {
      this.setAutoTick(true);
    }
    const alignPlayerBodyWithSignals = () => {
      const hitbox = (typeof player.hitbox === 'function' ? player.hitbox() : player.hitbox) as any;
      const width = hitbox?.w ?? hitbox?.width ?? 32;
      const height = hitbox?.h ?? hitbox?.height ?? 32;
      const body = this.getBody(player.id) as any;
      if (body) {
        // Ensure physics callbacks target the current player instance
        // after session transfer/map return.
        body.owner = player;
      }
      // Keep physics body aligned with restored snapshot coordinates on map join.
      this.updateHitbox(player.id, player.x(), player.y(), width, height);
    };
    const teleportToPendingNamedPosition = async () => {
      const positionName = player.pendingMapPosition();
      player.pendingMapPosition.set(null);

      if (!positionName) {
        return;
      }

      const position = this.data()?.positions?.[positionName];
      if (
        position &&
        typeof position.x === "number" &&
        typeof position.y === "number"
      ) {
        await player.teleport({ x: position.x, y: position.y });
      }
    };

    if (player.setMap) {
      player.setMap(this);
    } else {
      player.map = this;
    }
    player.context = context;
    player.conn = conn;
    // Deliver opportunistically when this room instance is already compiled.
    // The explicit client request below remains the reliable fallback when a
    // hibernating provider recreated the room or the transport was not ready.
    sendInitialMapStreaming(this, player);
    player.pendingInputs = [];
    player.lastProcessedInputTs = 0;
    player._lastFramePositions = null;
    player._onInit()
    alignPlayerBodyWithSignals();
    this.dataIsReady$.pipe(
      finalize(() => {
        // Avoid unhandled promise rejections from async hook execution.
        void (async () => {
          try {
            await teleportToPendingNamedPosition();
            alignPlayerBodyWithSignals();
            await this.spawnScenarioEventsForPlayer(player);

            // Check if we should stop all sounds before playing new ones
            if ((this as any).stopAllSoundsBeforeJoin) {
              player.stopAllSounds();
            }

            this.sounds.forEach(sound => player.playSound(sound, { loop: true }));
            player.emit("weatherState", this.getWeather());
            player.emit("lightingState", this.getLighting());

            // Execute global map hooks (from RpgServer.map)
            await lastValueFrom(this.hooks.callHooks("server-map-onJoin", player, this));

            // // Execute map-specific hooks (from @MapData or MapOptions)
            if (typeof (this as any)._onJoin === 'function') {
              await (this as any)._onJoin(player);
            }

            // Execute player hooks
            await lastValueFrom(this.hooks.callHooks("server-player-onJoinMap", player, this));
          }
          catch (error) {
            if (isRpgLog(error)) {
              console.warn(`[RpgLog:${error.id}] ${error.message}`);
              return;
            }
            console.error("[RPGJS] Error during map onJoin hooks:", error);
          }
        })();
      })
    ).subscribe();
  }

  /**
   * Called when a player leaves the map
   * 
   * This method is automatically called by the RPGJS room runtime when a player disconnects from the map.
   * It cleans up the player's pending inputs and triggers the appropriate hooks.
   * 
   * ## Architecture
   * 
   * 1. Triggers `server-player-onLeaveMap` hook
   * 2. Clears pending inputs to prevent processing after disconnection
   * 
   * @param player - The player leaving the map
   * @param conn - The connection object for the player
   * 
   * @example
   * ```ts
   * // This method is called automatically by the framework
   * // You can listen to the hook to perform custom cleanup
   * server.addHook('server-player-onLeaveMap', (player, map) => {
   *   console.log(`Player ${player.id} left map ${map.id}`);
   * });
   * ```
   */
  async onLeave(player: RpgPlayer, conn: RpgRoomConnection) {
    removeMapStreamingPlayer(this, player);
    this.spatialVisibleEventIds.delete(player.id);
    this.spatialVisiblePlayerIds.delete(player.id);
    // Execute global map hooks (from RpgServer.map)
    await lastValueFrom(this.hooks.callHooks("server-map-onLeave", player, this));

    // Execute map-specific hooks (from @MapData or MapOptions)
    if (typeof (this as any)._onLeave === 'function') {
      await (this as any)._onLeave(player);
    }

    // Execute player hooks
    await lastValueFrom(this.hooks.callHooks("server-player-onLeaveMap", player, this));
    this.removeScenarioEventsForPlayer(player.id);
    player.pendingInputs = [];
    player.lastProcessedInputTs = 0;
    player._lastFramePositions = null;
    if (!this.hasActiveConnections()) {
      this.setAutoTick(false);
    }
  }

  /**
   * Get the hooks system for this map
   * 
   * Returns the dependency-injected Hooks instance that allows you to trigger
   * and listen to various game events.
   * 
   * @returns The Hooks instance for this map
   * 
   * @example
   * ```ts
   * // Trigger a custom hook
   * map.hooks.callHooks('custom-event', data).subscribe();
   * ```
   */
  get hooks() {
    return BaseRoom.prototype.hooks;
  }

  private _getClientListenerBucket(type: string): Set<(player: RpgPlayer, data: unknown) => void | Promise<void>> {
    let listeners = this._clientListeners.get(type);
    if (!listeners) {
      listeners = new Set();
      this._clientListeners.set(type, listeners);
    }
    return listeners;
  }

  private async _dispatchClientEvent(type: string, player: RpgPlayer, data: unknown): Promise<void> {
    const listeners = [...(this._clientListeners.get(type) ?? [])];
    for (const callback of listeners) {
      await callback(player, data);
    }
  }

  async onSessionRestore(payload: { userSnapshot: any; user?: RpgPlayer }) {
    return await BaseRoom.prototype.onSessionRestore.call(this, payload);
  }

  /**
   * Handle GUI interaction from a player
   * 
   * This method is called when a player interacts with a GUI element.
   * It synchronizes the player's changes to ensure the client state is up to date.
   * 
   * @param player - The player performing the interaction
   * @param value - The interaction data from the client
   * 
   * @example
   * ```ts
   * // This method is called automatically when a player interacts with a GUI
   * // The interaction data is sent from the client
   * ```
   */
  @Action('gui.interaction')
  async guiInteraction(player: RpgPlayer, value: { guiId: string, name: string, data: any }) {
    const gui = player.getGui(value.guiId)
    if (gui) {
      await gui.emit(value.name, value.data)
    }
    player.syncChanges();
  }

  /**
   * Handle GUI exit from a player
   * 
   * This method is called when a player closes or exits a GUI.
   * It removes the GUI from the player's active GUIs.
   * 
   * @param player - The player exiting the GUI
   * @param guiId - The ID of the GUI being exited
   * @param data - Optional data associated with the GUI exit
   * 
   * @example
   * ```ts
   * // This method is called automatically when a player closes a GUI
   * // The GUI is removed from the player's active GUIs
   * ```
   */
  @Action('gui.exit')
  guiExit(player: RpgPlayer, { guiId, data, guiOpenId }) {
    player.removeGui(guiId, data, guiOpenId)
  }

  /**
   * Handle action input from a player
   * 
   * This method is called when a player performs an action (like pressing a button).
   * It checks for collisions with events and triggers the appropriate hooks.
   * 
   * ## Architecture
   * 
   * 1. Gets all entities colliding with the player
   * 2. Triggers `onAction` hook on colliding events
   * 3. Triggers `onInput` hook on the player
   * 
   * @param player - The player performing the action
   * @param action - The action data (button pressed, etc.)
   * 
   * @example
   * ```ts
   * // This method is called automatically when a player presses an action button
   * // Events near the player will have their onAction hook triggered
   * ```
   */
  @Action('action')
  onAction(player: RpgPlayer, action: RpgActionInput<unknown>): void {
    const legacyAction = action as RpgActionInput<unknown> & { input?: string };
    const actionName = action?.action ?? legacyAction.input ?? action;
    const isDefaultAction = actionName === Control.Action || actionName === "action";

    if (isDefaultAction) {
      const guiActionBlockUntil = (player as any).__guiActionBlockUntil;
      if ((player as any).canMove === false) {
        return;
      }
      if (typeof guiActionBlockUntil === "number" && Date.now() < guiActionBlockUntil) {
        return;
      }
      const direction =
        typeof player.getDirection === "function"
          ? player.getDirection()
          : typeof player.direction === "function"
            ? player.direction()
            : undefined;
      const collisions = new Set<string>((this as any).getCollisions(player.id));
      const interactionCollisions = (this as any).getInteractionCollisions?.(player.id, direction);
      if (Array.isArray(interactionCollisions)) {
        interactionCollisions.forEach(id => collisions.add(id));
      }

      const events = Array.from(collisions)
        .map(id => this.getEvent<RpgEvent>(id))
        .filter((event): event is RpgEvent => !!event && this.isEventVisibleForPlayer(event, player));
      if (events.length > 0) {
        events.forEach(event => {
          event.execMethod('onAction', [player, action]);
        });
      }
    }
    player.execMethod('onInput', [action]);
  }

  /**
   * Handle movement input from a player
   * 
   * This method is called when a player sends movement input from the client.
   * It queues the input for processing by the game loop. Inputs are processed
   * with frame numbers to ensure proper ordering and client-side prediction.
   * 
   * ## Architecture
   * 
   * - Inputs are queued in `player.pendingInputs`
   * - Duplicate frames are skipped to prevent processing the same input twice
   * - Inputs are processed asynchronously by the game loop
   * 
   * @param player - The player sending the movement input
   * @param input - The input data containing frame number, input direction, and timestamp
   * 
   * @example
   * ```ts
   * // This method is called automatically when a player moves
   * // The input is queued and processed by processInput()
   * ```
   */
  @Action('move')
  async onInput(player: RpgPlayer, input: any) {
    if ((player as any).canMove === false) {
      player.pendingInputs = [];
      player.lastProcessedInputTs = 0;
      (this as any).stopMovement(player);
      return;
    }

    const lastAckedFrame = player._lastFramePositions?.frame ?? 0;
    const now = Date.now();
    const candidates: Array<{
      input: any;
      frame: number;
      tick?: number;
      timestamp: number;
      clientState?: { x: number; y: number; direction?: Direction };
    }> = [];

    const enqueueCandidate = (entry: any) => {
      if (typeof entry?.frame !== "number") {
        return;
      }
      if (!entry?.input) {
        return;
      }
      const candidate: {
        input: any;
        frame: number;
        tick?: number;
        timestamp: number;
        clientState?: { x: number; y: number; direction?: Direction };
      } = {
        input: entry.input,
        frame: entry.frame,
        tick: typeof entry.tick === "number" ? entry.tick : undefined,
        timestamp: typeof entry.timestamp === "number" ? entry.timestamp : now,
      };
      if (typeof entry.x === "number" && typeof entry.y === "number") {
        candidate.clientState = {
          x: entry.x,
          y: entry.y,
          direction: entry.direction,
        };
      }
      candidates.push(candidate);
    };

    for (const trajectoryEntry of Array.isArray(input?.trajectory) ? input.trajectory : []) {
      enqueueCandidate(trajectoryEntry);
    }

    enqueueCandidate(input);

    if (candidates.length === 0) {
      return;
    }

    candidates.sort((a, b) => a.frame - b.frame);
    const existingFrames = new Set<number>(
      player.pendingInputs
        .map((pending: any) => pending?.frame)
        .filter((frame: any): frame is number => typeof frame === "number"),
    );

    for (const candidate of candidates) {
      if (candidate.frame <= lastAckedFrame) {
        continue;
      }
      if (existingFrames.has(candidate.frame)) {
        continue;
      }
      player.pendingInputs.push(candidate);
      existingFrames.add(candidate.frame);
    }
  }

  @Action("ping")
  onPing(player: RpgPlayer, payload: { clientTime?: number; clientFrame?: number }) {
    player.emit("pong", {
      serverTick: this.getTick(),
      clientTime: typeof payload?.clientTime === "number" ? payload.clientTime : Date.now(),
      clientFrame: typeof payload?.clientFrame === "number" ? payload.clientFrame : 0,
    });
  }

  @Action(MAP_STREAM_REQUEST_EVENT)
  async onMapStreamRequest(player: RpgPlayer, payload?: { mapId?: string }) {
    const requestedMapId = payload?.mapId?.replace(/^map-/, "");
    const currentMapId = String(this.data()?.id ?? this.id ?? "").replace(/^map-/, "");
    if (requestedMapId && currentMapId && requestedMapId !== currentMapId) {
      return;
    }
    await this.restoreMapStreamingRuntime();
    sendInitialMapStreaming(this, player);
  }

  @Action('save.save')
  async saveSlot(player: RpgPlayer, value: { requestId: string; index: number; meta?: any }) {
    BaseRoom.prototype.saveSlot(player, value);
  }

  @Action('save.load')
  async loadSlot(player: RpgPlayer, value: { requestId: string; index: number }) {
    BaseRoom.prototype.loadSlot(player, value);
  }

  @Action('save.list')
  async listSaveSlots(player: RpgPlayer, value: { requestId: string }) {
    return await BaseRoom.prototype.listSaveSlots(player, value);
  }

  /**
   * Listen to custom websocket events sent by clients on this map.
   *
   * The callback receives the player who sent the event and the payload.
   * This is useful for map-wide custom interactions that are not covered
   * by built-in actions such as movement, GUI events, or the action button.
   *
   * @method map.on(type, cb)
   * @param type - Custom event name emitted by clients
   * @param cb - Callback invoked with the sending player and payload
   * @returns {void}
   *
   * @example
   * ```ts
   * map.on("chat:message", (player, data) => {
   *   console.log(player.id, data.text);
   * });
   * ```
   */
  on<T = unknown>(type: string, cb: (player: RpgPlayer, data: T) => void | Promise<void>): void {
    this._getClientListenerBucket(type).add(cb as (player: RpgPlayer, data: unknown) => void | Promise<void>);
  }

  /**
   * Remove all listeners for a custom client event on this map.
   *
   * @method map.off(type)
   * @param type - Custom event name to clear
   * @returns {void}
   */
  off(type: string) {
    this._clientListeners.delete(type);
  }

  /**
   * Broadcast a custom websocket event to all clients connected to this map.
   *
   * This is a convenience wrapper around `$broadcast({ type, value })`.
   * On the client side, receive the event by injecting `WebSocketToken`
   * and subscribing with `socket.on(type, cb)`.
   *
   * @method map.broadcast(type, value)
   * @param type - Custom event name sent to all clients on the map
   * @param value - Payload sent with the event
   * @returns {void}
   *
   * @example
   * ```ts
   * map.broadcast("weather:warning", {
   *   level: "storm",
   * });
   * ```
   *
   * @example
   * ```ts
   * import { inject } from "@rpgjs/client";
   * import { WebSocketToken, type AbstractWebsocket } from "@rpgjs/client";
   *
   * const socket = inject<AbstractWebsocket>(WebSocketToken);
   *
   * socket.on("weather:warning", (payload) => {
   *   console.log(payload.level);
   * });
   * ```
   */
  broadcast<T = unknown>(type: string, value?: T): void {
    this.$broadcast({
      type,
      value,
    });
  }

  @UnhandledAction()
  async _onUnhandledAction(player: RpgPlayer, message: { action: string; value: unknown }): Promise<void> {
    if (!player) return;
    await player._dispatchClientEvent(message.action, message.value);
    await this._dispatchClientEvent(message.action, player, message.value);
  }

  /**
   * Update the map configuration and data
   * 
   * This endpoint receives map data from the client and initializes the map.
   * It loads the map configuration, damage formulas, events, and physics.
   * 
   * ## Architecture
   * 
   * 1. Validates the request body using MapUpdateSchema
   * 2. Updates map data, global config, and damage formulas
   * 3. Merges events and sounds from map configuration
   * 4. Triggers hooks for map loading
   * 5. Loads physics engine
   * 6. Creates all events on the map
   * 7. Completes the dataIsReady$ subject
   * 
   * @param request - HTTP request containing map data
   * @returns Promise that resolves when the map is fully loaded
   * 
   * @example
   * ```ts
   * // This endpoint is called automatically when a map is loaded
   * // POST /map/update
   * // Body: { id: string, width: number, height: number, config?: any, damageFormulas?: any }
   * ```
   */
  @Request({
    path: "/map/update",
    method: "POST"
  }, MapUpdateSchema as any)
  async updateMap(request: Request) {
    if (!isMapUpdateAuthorized(request.headers, this.getRuntimeMapUpdateToken())) {
      return new Response(JSON.stringify({
        error: "Unauthorized map update",
        message: `Provide ${MAP_UPDATE_TOKEN_HEADER} or Authorization: Bearer <token> to call /map/update when ${MAP_UPDATE_TOKEN_ENV} is set.`,
      }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Signe exposes the schema-validated body on `request.data`. Native Fetch
    // bodies are single-use, so prefer it before falling back to `json()` for
    // direct calls that do not pass through the request decorator.
    const map = (request as Request & { data?: any }).data ?? await request.json()
    // Hibernating Durable Objects may freeze before Signe's debounced reactive
    // persistence runs. Persist the trusted private source explicitly and await
    // it before acknowledging publication, so a later WebSocket instance can
    // rebuild render chunks, physics and events reliably.
    await this.partyRoom.storage.put(MAP_SOURCE_STORAGE_KEY, map)
    this.data.set(map)
    this.globalConfig = map.config
    this.damageFormulas = map.damageFormulas || {};
    this.damageFormulas = {
      damageSkill: DAMAGE_SKILL,
      damagePhysic: DAMAGE_PHYSIC,
      damageCritical: DAMAGE_CRITICAL,
      coefficientElements: COEFFICIENT_ELEMENTS,
      ...this.damageFormulas
    }
    await lastValueFrom(this.hooks.callHooks("server-maps-load", this))
    await lastValueFrom(this.hooks.callHooks("server-worldMaps-load", this))
    await lastValueFrom(this.hooks.callHooks("server-databaseHooks-load", this))

    this.resolveTrustedMapDimensions(map)
    this.data.set(map)

    map.events = map.events ?? []
    let initialWeather: WeatherState | null | undefined = this.globalConfig?.weather;
    let initialLighting: LightingState | null | undefined = this.globalConfig?.lighting;

    if (map.id) {
      const mapFound = this.maps.find(m => m.id === map.id)
      if (typeof mapFound?.weather !== "undefined") {
        initialWeather = mapFound.weather;
      }
      if (typeof mapFound?.lighting !== "undefined") {
        initialLighting = mapFound.lighting;
      }
      if (mapFound?.events) {
        map.events = [
          ...mapFound.events,
          ...map.events
        ]
      }
      if (mapFound?.sounds) {
        this.sounds = [
          ...(map.sounds ?? []),
          ...mapFound.sounds
        ]
      }
      else {
        this.sounds = map.sounds ?? []
      }

      // Attach map-specific hooks from MapOptions or @MapData
      if (mapFound?.onLoad) {
        (this as any)._onLoad = mapFound.onLoad;
      }
      if (mapFound?.onJoin) {
        (this as any)._onJoin = mapFound.onJoin;
      }
      if (mapFound?.onLeave) {
        (this as any)._onLeave = mapFound.onLeave;
      }
      if (mapFound?.stopAllSoundsBeforeJoin !== undefined) {
        (this as any).stopAllSoundsBeforeJoin = mapFound.stopAllSoundsBeforeJoin;
      }
    }

    if (typeof initialWeather !== "undefined") {
      this.setWeather(initialWeather);
    } else {
      this.clearWeather();
    }
    if (typeof initialLighting !== "undefined") {
      this.setLighting(initialLighting);
    } else {
      this.clearLighting();
    }

    await lastValueFrom(this.hooks.callHooks("server-map-onBeforeUpdate", map, this))

    this._scenarioEventTemplates = [];
    this._eventModeById.clear();
    this._eventOwnerById.clear();
    this._scenarioEventIdsByPlayer.clear();
    this.spatialVisibleEventIds.clear();
    this.spatialVisiblePlayerIds.clear();

    for (const eventId of Object.keys(this.events())) {
      this.removeEvent(eventId);
    }

    this.loadPhysic()

    for (let event of map.events ?? []) {
      const normalizedEvent = this.normalizeEventObject(event);
      const mode = this.resolveEventMode(normalizedEvent);
      if (mode === EventMode.Scenario) {
        this._scenarioEventTemplates.push(this.cloneEventTemplate(normalizedEvent));
        continue;
      }
      await this.createDynamicEvent(normalizedEvent, { mode: EventMode.Shared });
    }

    for (const player of this.getPlayers()) {
      const graphics = [...player.graphics()];
      if (graphics.length > 0) {
        // A client reloads its Tiled scene when map data changes. Re-emit the
        // current graphic so its player sprite is restored in that new scene.
        player.setGraphic(graphics);
      }
      await this.spawnScenarioEventsForPlayer(player);
    }

    this.dataIsReady$.complete()

    // Execute global map hooks (from RpgServer.map)
    await lastValueFrom(this.hooks.callHooks("server-map-onLoad", this))

    // Execute map-specific hooks (from @MapData or MapOptions)
    if (typeof (this as any)._onLoad === 'function') {
      await (this as any)._onLoad();
    }

    if (!this.hasActiveConnections()) {
      this.setAutoTick(false);
    }

    // TODO: Update map
  }

  /**
   * Update (or create) a world configuration and propagate to all maps in that world
   * 
   * This endpoint receives world map configuration data (typically from Tiled world import)
   * and creates or updates the world manager. The world ID is extracted from the URL path.
   * 
   * ## Architecture
   * 
   * 1. Authenticates the administrative update request
   * 2. Extracts the world ID from the `/world/:id/update` path segment
   * 3. Normalizes input to array of WorldMapConfig
   * 4. Persists the topology so it survives Durable Object hibernation
   * 5. Creates or updates the world manager
   * 
   * Expected payload examples:
   * - `{ id: string, maps: WorldMapConfig[] }`
   * - `WorldMapConfig[]`
   * 
   * @param request - HTTP request containing world configuration
   * @returns Promise resolving to `{ ok: true }` when complete
   * 
   * @example
   * ```ts
   * // POST /world/my-world/update
   * // Body: [{ id: 'map1', worldX: 0, worldY: 0, width: 800, height: 600 }]
   * 
   * // Or with nested structure
   * // Body: { id: 'my-world', maps: [{ id: 'map1', ... }] }
   * ```
   */
  @Request({
    path: "/world/:id/update",
    method: "POST",
  })
  async updateWorld(request: Request) {
    if (!isMapUpdateAuthorized(request.headers, this.getRuntimeMapUpdateToken())) {
      return new Response(JSON.stringify({
        error: "Unauthorized world update",
        message: `Provide ${MAP_UPDATE_TOKEN_HEADER} or Authorization: Bearer <token> to call /world/:id/update when ${MAP_UPDATE_TOKEN_ENV} is set.`,
      }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // The request URL can be either the room-local path or the complete
    // `/parties/<namespace>/<room>/world/:id/update` transport path.
    let worldId = '';
    try {
      const reqUrl = (request as any).url as string;
      const urlObj = new URL(reqUrl, 'http://localhost');
      const match = urlObj.pathname.match(/\/world\/([^/]+)\/update\/?$/);
      worldId = match?.[1] ? decodeURIComponent(match[1]) : '';
    } catch { }
    const payload = await request.json();

    // Normalize input to array of WorldMapConfig
    const mapsConfig: WorldMapConfig[] = Array.isArray(payload)
      ? payload
      : payload?.maps ?? [];

    // Ensure map sizes are present; fallback to current map data when ID matches
    const normalized: WorldMapConfig[] = mapsConfig.map((m: any) => {
      return {
        id: m.id,
        worldX: m.worldX ?? m.x ?? 0,
        worldY: m.worldY ?? m.y ?? 0,
        width: m.width ?? m.widthPx ?? this.data()?.width ?? 0,
        height: m.height ?? m.heightPx ?? this.data()?.height ?? 0,
        tileWidth: m.tileWidth ?? this.tileWidth ?? 32,
        tileHeight: m.tileHeight ?? this.tileHeight ?? 32,
      } as WorldMapConfig;
    });

    const storedWorld: StoredWorldMaps = { id: worldId, maps: normalized };
    await this.partyRoom.storage.put(WORLD_MAPS_STORAGE_KEY, storedWorld);
    await this.updateWorldMaps(worldId, normalized);
    return { ok: true } as any;
  }

  /**
   * Process pending inputs for a player with anti-cheat validation
   * 
   * This method processes pending inputs for a player while performing
   * anti-cheat validation to prevent time manipulation and frame skipping.
   * It validates the time deltas between inputs and ensures they are within
   * acceptable ranges. To preserve movement itinerary under network bursts,
   * the number of inputs processed per call is capped.
   * 
   * ## Architecture
   * 
   * **Important**: This method only updates entity velocities - it does NOT step
   * the physics engine. Physics simulation is handled centrally by the game loop
   * (`tick$` -> `runFixedTicks`). This ensures:
   * - Consistent physics timing (60fps fixed timestep)
   * - No double-stepping when multiple inputs are processed
   * - Deterministic physics regardless of input frequency
   * 
   * @param playerId - The ID of the player to process inputs for
   * @param controls - Optional anti-cheat configuration
   * @returns Promise containing the player and processed movement inputs
   * 
   * @example
   * ```ts
   * // Process inputs with default anti-cheat settings
   * const result = await map.processInput('player1');
   * console.log('Processed inputs:', result.inputs);
   * 
   * // Process inputs with custom anti-cheat configuration
   * const result = await map.processInput('player1', {
   *   maxTimeDelta: 100,
   *   maxFrameDelta: 5,
   *   minTimeBetweenInputs: 16,
   *   enableAntiCheat: true
   * });
   * ```
   */
  async processInput(playerId: string, controls?: Controls): Promise<{
    player: RpgPlayer,
    inputs: any[]
  }> {
    const player = this.getPlayer(playerId);
    if (!player) {
      throw new Error(`Player ${playerId} not found`);
    }

    if (!player.isConnected()) {
      player.pendingInputs = [];
      return {
        player,
        inputs: []
      }
    }

    if ((player as any).canMove === false) {
      player.pendingInputs = [];
      player.lastProcessedInputTs = 0;
      (this as any).stopMovement(player);
      return {
        player,
        inputs: []
      }
    }

    const processedInputs: any[] = [];
    const defaultControls: Required<Controls> = {
      maxTimeDelta: 1000, // 1 second max between inputs
      maxFrameDelta: 10,  // Max 10 frames skipped
      minTimeBetweenInputs: 16, // ~60fps minimum
      enableAntiCheat: false,
      maxInputsPerTick: 1,
    };

    const config = { ...defaultControls, ...controls };
    let lastProcessedTime = player.lastProcessedInputTs || 0;
    let lastProcessedFrame = player._lastFramePositions?.frame ?? 0;

    // Sort inputs by frame number to ensure proper order
    player.pendingInputs.sort((a, b) => (a.frame || 0) - (b.frame || 0));

    let hasProcessedInputs = false;
    let processedThisTick = 0;

    // Process pending inputs progressively to preserve itinerary under latency.
    while (player.pendingInputs.length > 0 && processedThisTick < config.maxInputsPerTick) {
      const input = player.pendingInputs.shift();

      if (!input || typeof input.frame !== 'number') {
        continue;
      }

      // Anti-cheat validation
      if (config.enableAntiCheat) {
        // Check frame delta
        if (input.frame > lastProcessedFrame + config.maxFrameDelta) {
          // Reset to last valid frame
          input.frame = lastProcessedFrame + 1;
        }

        // Check time delta if timestamp is available
        if (input.timestamp && lastProcessedTime > 0) {
          const timeDelta = input.timestamp - lastProcessedTime;
          if (timeDelta > config.maxTimeDelta) {
            input.timestamp = lastProcessedTime + config.minTimeBetweenInputs;
          }
        }

        // Check minimum time between inputs
        if (input.timestamp && lastProcessedTime > 0) {
          const timeDelta = input.timestamp - lastProcessedTime;
          if (timeDelta < config.minTimeBetweenInputs) {
            continue;
          }
        }
      }

      // Skip if frame is too old (more than 10 frames behind)
      if (input.frame < lastProcessedFrame - 10) {
        continue;
      }

      const movementInput = normalizeServerMovementInput(input.input);

      // Process the input - update velocity based on the latest input
      if (movementInput) {
        let idleHoldMs = 0;
        if (isDashMovementInput(movementInput)) {
          const now = Date.now();
          const lockedUntil = (player as any).__rpgDashLockedUntil;
          if (!(typeof lockedUntil === "number" && now < lockedUntil)) {
            (player as any).__rpgDashLockedUntil =
              now + (movementInput.cooldown ?? DEFAULT_DASH_COOLDOWN_MS);
            player.changeDirection(vectorToDirection(movementInput.direction));
            (this as any).dashBody(player, movementInput);
            idleHoldMs = movementInput.duration ?? 0;
          }
        } else {
          await this.movePlayer(player, movementInput);
        }
        processedInputs.push(input.input);
        hasProcessedInputs = true;
        lastProcessedTime = (input.timestamp || Date.now()) + idleHoldMs;
        processedThisTick += 1;

        const bodyPos = this.getBodyPosition(player.id, "top-left");
        const ackX =
          typeof input.clientState?.x === "number"
            ? input.clientState.x
            : bodyPos?.x ?? player.x();
        const ackY =
          typeof input.clientState?.y === "number"
            ? input.clientState.y
            : bodyPos?.y ?? player.y();
        player._lastFramePositions = {
          frame: input.frame,
          position: {
            x: Math.round(ackX),
            y: Math.round(ackY),
            direction: input.clientState?.direction ?? player.direction(),
          },
          serverTick: this.getTick(),
        };
      }

      // Update tracking variables
      lastProcessedFrame = input.frame;
    }

    // Physics is now handled by the main game loop (tick$ -> runFixedTicks)
    // We only update timestamps and handle idle timeout here
    // The physics step will be executed in the next tick cycle
    if (hasProcessedInputs) {
      player.lastProcessedInputTs = lastProcessedTime;
    } else {
      const idleTimeout = Math.max(config.minTimeBetweenInputs * 4, 50);
      const lastTs = player.lastProcessedInputTs || 0;
      if (lastTs > 0 && Date.now() - lastTs > idleTimeout) {
        (this as any).stopMovement(player);
        player.lastProcessedInputTs = 0;
      }
    }

    return {
      player,
      inputs: processedInputs
    };
  }

  /**
   * Main server game loop.
   *
   * A single tick subscription drives input processing, fixed physics steps,
   * projectiles, and sync side effects in a deterministic order.
   */
  private startServerTickLoop() {
    this.stopServerTickLoop();
    const loopVersion = ++this._serverTickLoopVersion;
    this.tickSubscription = this.tick$.subscribe(({ delta }) => {
      void this.runQueuedServerTick(delta, loopVersion);
    });
  }

  private stopServerTickLoop() {
    this._serverTickLoopVersion += 1;
    if (this.tickSubscription) {
      this.tickSubscription.unsubscribe();
      this.tickSubscription = null;
    }
    this._queuedServerTickDelta = 0;
  }

  private async runQueuedServerTick(deltaMs: number, loopVersion = this._serverTickLoopVersion): Promise<void> {
    if (loopVersion !== this._serverTickLoopVersion) {
      return;
    }
    this._queuedServerTickDelta += deltaMs;
    if (this._serverTickInProgress) {
      return;
    }

    this._serverTickInProgress = true;
    try {
      while (this._queuedServerTickDelta > 0 && loopVersion === this._serverTickLoopVersion) {
        const nextDelta = this._queuedServerTickDelta;
        this._queuedServerTickDelta = 0;
        await this.runServerTick(nextDelta);
      }
    }
    finally {
      this._serverTickInProgress = false;
    }
  }

  private async runServerTick(deltaMs: number): Promise<number> {
    return this.runFixedTicksAsync(deltaMs, {
      beforeStep: () => this.processPendingInputsForTick(),
    });
  }

  private async processPendingInputsForTick(): Promise<void> {
    for (const player of this.getPlayers()) {
      const anyPlayer = player as any;
      const shouldProcess = player.pendingInputs.length > 0 || (player.lastProcessedInputTs || 0) > 0;
      if (!shouldProcess || anyPlayer._isProcessingInputs) {
        continue;
      }
      anyPlayer._isProcessingInputs = true;
      try {
        await this.processInput(player.id);
      }
      finally {
        anyPlayer._isProcessingInputs = false;
      }
    }
  }

  async nextTickAsync(deltaMs?: number): Promise<number> {
    const fixedStepMs = this.physic.getWorld().getTimeStep() * 1000;
    return this.runServerTick(deltaMs ?? fixedStepMs);
  }

  /**
   * Enable or disable automatic server tick processing
   * 
   * When disabled, the unified input/physics/projectile loop will not run
   * automatically. This is useful for unit tests where you want manual control
   * over server ticks.
   * 
   * @param enabled - Whether to enable automatic tick processing (default: true)
   * 
   * @example
   * ```ts
   * // Disable auto tick for testing
   * map.setAutoTick(false);
   * 
   * // Manually trigger tick processing
   * await map.nextTickAsync();
   * ```
   */
  setAutoTick(enabled: boolean): void {
    this._autoTickEnabled = enabled;
    this.autoTickEnabled = enabled;
    if (enabled && !this.tickSubscription && this.data()) {
      this.startServerTickLoop();
    } else if (!enabled) {
      this.stopServerTickLoop();
    }
  }

  /**
   * Get a world manager by id
   * 
   * Returns the world maps manager for the given world ID. Currently, only
   * one world manager is supported per map instance.
   * 
   * @param id - The world ID (currently unused, returns the single manager)
   * @returns The WorldMapsManager instance, or null if not initialized
   * 
   * @example
   * ```ts
   * const worldManager = map.getWorldMaps('my-world');
   * if (worldManager) {
   *   const mapInfo = worldManager.getMapInfo('map1');
   * }
   * ```
   */
  getWorldMaps(id: string): WorldMapsManager | null {
    if (!this.worldMapsManager) return null;
    return this.worldMapsManager;
  }

  /**
   * Delete a world manager by id
   * 
   * Removes the world maps manager from this map instance. Currently, only
   * one world manager is supported, so this clears the single manager.
   * 
   * @param id - The world ID (currently unused)
   * @returns true if the manager was deleted, false if it didn't exist
   * 
   * @example
   * ```ts
   * const deleted = map.deleteWorldMaps('my-world');
   * if (deleted) {
   *   console.log('World manager removed');
   * }
   * ```
   */
  deleteWorldMaps(id: string): boolean {
    if (!this.worldMapsManager) return false;
    // For now, clear the single manager
    this.worldMapsManager = undefined;
    return true;
  }

  /**
   * Create a world manager dynamically
   * 
   * Creates a new WorldMapsManager instance and configures it with the provided
   * map configurations. This is used when loading world data from Tiled or
   * other map editors.
   * 
   * @param world - World configuration object
   * @param world.id - Optional world identifier
   * @param world.maps - Array of map configurations for the world
   * @returns The newly created WorldMapsManager instance
   * 
   * @example
   * ```ts
   * const manager = map.createDynamicWorldMaps({
   *   id: 'my-world',
   *   maps: [
   *     { id: 'map1', worldX: 0, worldY: 0, width: 800, height: 600 },
   *     { id: 'map2', worldX: 800, worldY: 0, width: 800, height: 600 }
   *   ]
   * });
   * ```
   */
  createDynamicWorldMaps(world: { id?: string; maps: WorldMapConfig[] }): WorldMapsManager {
    const manager = new WorldMapsManager();
    manager.configure(world.maps);
    this.worldMapsManager = manager;
    return manager;
  }

  /**
   * Update world maps by id. Auto-create when missing.
   * 
   * Updates the world maps configuration. If the world manager doesn't exist,
   * it is automatically created. This is useful for dynamically loading world
   * data or updating map positions.
   * 
   * @param id - The world ID
   * @param maps - Array of map configurations to update
   * @returns Promise that resolves when the update is complete
   * 
   * @example
   * ```ts
   * await map.updateWorldMaps('my-world', [
   *   { id: 'map1', worldX: 0, worldY: 0, width: 800, height: 600 },
   *   { id: 'map2', worldX: 800, worldY: 0, width: 800, height: 600 }
   * ]);
   * ```
   */
  async updateWorldMaps(id: string, maps: WorldMapConfig[]) {
    let world = this.getWorldMaps(id);
    if (!world) {
      world = this.createDynamicWorldMaps({ id, maps });
    } else {
      world.configure(maps);
    }
  }

  /**
   * Add data to the map's database
   * 
   * This method delegates to BaseRoom's implementation to avoid code duplication.
   * 
   * @param id - Unique identifier for the data
   * @param data - The data to store (can be a class, object, or any value)
   * @param options - Optional configuration
   * @param options.force - If true, overwrites existing data even if ID already exists (default: false)
   * @returns true if data was added, false if ignored (ID already exists)
   * 
   * @example
   * ```ts
   * // Add an item class to the database
   * map.addInDatabase('Potion', PotionClass);
   * 
   * // Add an item object to the database
   * map.addInDatabase('custom-item', {
   *   name: 'Custom Item',
   *   price: 100
   * });
   * 
   * // Force overwrite existing data
   * map.addInDatabase('Potion', UpdatedPotionClass, { force: true });
   * ```
   */
  addInDatabase(id: string, data: any, options?: { force?: boolean }): boolean {
    return BaseRoom.prototype.addInDatabase.call(this, id, data, options);
  }

  /**
   * Remove data from the map's database
   * 
   * This method delegates to BaseRoom's implementation to avoid code duplication.
   * 
   * @param id - Unique identifier of the data to remove
   * @returns true if data was removed, false if ID didn't exist
   * 
   * @example
   * ```ts
   * // Remove an item from the database
   * map.removeInDatabase('Potion');
   * 
   * // Check if removal was successful
   * const removed = map.removeInDatabase('custom-item');
   * if (removed) {
   *   console.log('Item removed successfully');
   * }
   * ```
   */
  removeInDatabase(id: string): boolean {
    return BaseRoom.prototype.removeInDatabase.call(this, id);
  }

  /**
   * Creates a dynamic event on the map
   * 
   * This method handles both class-based events and object-based events with hooks.
   * For class-based events, it creates a new instance of the class.
   * For object-based events, it creates a dynamic class that extends RpgEvent and 
   * implements the hook methods from the object.
   * 
   * @param eventObj - The event position and definition
   * 
   * @example
   * // Using a class-based event
   * class MyEvent extends RpgEvent {
   *   onInit() {
   *     console.log('Event initialized');
   *   }
   * }
   * 
   * map.createDynamicEvent({
   *   x: 100,
   *   y: 200,
   *   event: MyEvent
   * });
   * 
   * // Using an object-based event
   * map.createDynamicEvent({
   *   x: 100,
   *   y: 200,
   *   event: {
   *     onInit() {
   *       console.log('Event initialized');
   *     },
   *     onPlayerTouch(player) {
   *       console.log('Player touched event');
   *     }
   *   }
   * });
   */
  async createDynamicEvent(eventObj: EventPosOption, options: CreateDynamicEventOptions = {}): Promise<string | undefined> {
    eventObj = this.normalizeEventObject(eventObj);

    const value = await lastValueFrom(this.hooks.callHooks("server-event-onBeforeCreated", eventObj, this));
    value.filter(v => v).forEach(v => {
      eventObj = v;
    });

    const event = eventObj.event;
    const x = typeof eventObj.x === "number" ? eventObj.x : 0;
    const y = typeof eventObj.y === "number" ? eventObj.y : 0;
    const mass = this.resolveEventMass(eventObj);
    const pushable = this.resolveEventPushable(eventObj);
    const hitbox = this.resolveEventHitbox(eventObj);

    const requestedMode = options.mode ?? this.resolveEventMode(eventObj);
    const mode = this.normalizeEventMode(requestedMode);
    const ownerFromData = options.scenarioOwnerId ?? this.resolveScenarioOwnerId(eventObj);
    const scenarioOwnerId = mode === EventMode.Scenario ? ownerFromData : undefined;
    const effectiveMode = mode === EventMode.Scenario && scenarioOwnerId
      ? EventMode.Scenario
      : EventMode.Shared;

    if (mode === EventMode.Scenario && !scenarioOwnerId) {
      console.warn("Scenario event created without owner id. Falling back to shared mode.");
    }

    const id = this.buildRuntimeEventId(eventObj.id, effectiveMode, scenarioOwnerId);
    let eventInstance: RpgEvent;

    if (this.events()[id]) {
      console.warn(`Event ${id} already exists on map`);
      return undefined;
    }

    // Check if event is a constructor function (class)
    if (typeof event === 'function') {
      eventInstance = new event();
      const eventName = (event as any).prototype?._name ?? (event as any)._name;
      if (typeof eventName === "string" && eventName.length > 0) {
        eventInstance.name = eventName;
      }
    }
    // Handle event as an object with hooks
    else {
      // Create a new instance extending RpgPlayer with the hooks from the event object
      class DynamicEvent extends RpgEvent {
        onInit?: (this: RpgEvent) => void;
        onChanges?: (this: RpgEvent, player: RpgPlayer) => void;
        onAction?: (this: RpgEvent, player: RpgPlayer, input: RpgActionInput<unknown>) => void | Promise<void>;
        onPlayerTouch?: (this: RpgEvent, player: RpgPlayer) => void;
        onTouch?: (this: RpgEvent, other: RpgPlayer | RpgEvent, context: RpgTouchContext) => void | Promise<void>;
        onTouchEnd?: (this: RpgEvent, other: RpgPlayer | RpgEvent, context: RpgTouchContext) => void | Promise<void>;
        onInShape?: (this: RpgEvent, zone: RpgShape, player: RpgPlayer) => void;
        onOutShape?: (this: RpgEvent, zone: RpgShape, player: RpgPlayer) => void;
        onDetectInShape?: (this: RpgEvent, player: RpgPlayer, shape: RpgShape) => void;
        onDetectOutShape?: (this: RpgEvent, player: RpgPlayer, shape: RpgShape) => void;

        constructor() {
          super();

          // Copy hooks from the event object
          const hookObj = event as EventHooks;
          if (hookObj.onInit) this.onInit = hookObj.onInit.bind(this);
          if (hookObj.onChanges) this.onChanges = hookObj.onChanges.bind(this);
          if (hookObj.onAction) this.onAction = hookObj.onAction.bind(this);
          if (hookObj.onPlayerTouch) this.onPlayerTouch = hookObj.onPlayerTouch.bind(this);
          if (hookObj.onTouch) this.onTouch = hookObj.onTouch.bind(this);
          if (hookObj.onTouchEnd) this.onTouchEnd = hookObj.onTouchEnd.bind(this);
          if (hookObj.onInShape) this.onInShape = hookObj.onInShape.bind(this);
          if (hookObj.onOutShape) this.onOutShape = hookObj.onOutShape.bind(this);
          if (hookObj.onDetectInShape) this.onDetectInShape = hookObj.onDetectInShape.bind(this);
          if (hookObj.onDetectOutShape) this.onDetectOutShape = hookObj.onDetectOutShape.bind(this);
        }
      }

      eventInstance = new DynamicEvent();
      if ((event as any).name) eventInstance.name = (event as any).name;
    }

    eventInstance.id = id;
    eventInstance.setMass(mass ?? 100);
    eventInstance.pushable = pushable;
    (eventInstance as any).mode = effectiveMode;
    if (effectiveMode === EventMode.Scenario && scenarioOwnerId) {
      (eventInstance as any)._scenarioOwnerId = scenarioOwnerId;
      (eventInstance as any).scenarioOwnerId = scenarioOwnerId;
    }
    else {
      delete (eventInstance as any)._scenarioOwnerId;
      delete (eventInstance as any).scenarioOwnerId;
    }

    eventInstance.map = this;
    eventInstance.context = context;
    if (hitbox) {
      eventInstance.setHitbox(hitbox.width, hitbox.height);
    }

    await eventInstance.teleport({ x, y });
    this.events()[id] = eventInstance;
    try {
      // Register the event before onInit so changes to nested synchronized
      // values (notably graphics) are observed by every transport runtime.
      await eventInstance.execMethod('onInit');
    }
    catch (error) {
      this.removeEvent(id);
      throw error;
    }
    if (hitbox) {
      eventInstance.setHitbox(hitbox.width, hitbox.height);
    }

    this.setEventRuntimeMetadata(id, effectiveMode, scenarioOwnerId);
    return id;
  }

  /**
   * Get an event by its ID
   * 
   * Returns the event with the specified ID, or undefined if not found.
   * The return type can be narrowed using TypeScript generics.
   * 
   * @param eventId - The unique identifier of the event
   * @returns The event instance, or undefined if not found
   * 
   * @example
   * ```ts
   * // Get any event
   * const event = map.getEvent('npc-1');
   * 
   * // Get event with type narrowing
   * const npc = map.getEvent<MyNPC>('npc-1');
   * if (npc) {
   *   npc.speak('Hello!');
   * }
   * ```
   */
  getEvent<T extends RpgEvent = RpgEvent>(eventId: string): T | undefined {
    return this.events()[eventId] as unknown as T
  }

  /**
   * Get a player by their ID
   * 
   * Returns the player with the specified ID, or undefined if not found.
   * 
   * @param playerId - The unique identifier of the player
   * @returns The player instance, or undefined if not found
   * 
   * @example
   * ```ts
   * const player = map.getPlayer('player-123');
   * if (player) {
   *   console.log(`Player ${player.name} is on the map`);
   * }
   * ```
   */
  getPlayer(playerId: string): RpgPlayer | undefined {
    return this.players()[playerId]
  }

  /**
   * Get all players currently on the map
   * 
   * Returns an array of all players that are currently connected to this map.
   * 
   * @returns Array of all RpgPlayer instances on the map
   * 
   * @example
   * ```ts
   * const players = map.getPlayers();
   * console.log(`There are ${players.length} players on the map`);
   * 
   * players.forEach(player => {
   *   console.log(`- ${player.name}`);
   * });
   * ```
   */
  getPlayers(): RpgPlayer[] {
    return Object.values(this.players())
  }

  /**
   * Get all events on the map
   * 
   * Returns an array of all events (NPCs, objects, etc.) that are currently
   * on this map.
   * 
   * @returns Array of all RpgEvent instances on the map
   * 
   * @example
   * ```ts
   * const events = map.getEvents();
   * console.log(`There are ${events.length} events on the map`);
   * 
   * events.forEach(event => {
   *   console.log(`- ${event.name} at (${event.x}, ${event.y})`);
   * });
   * ```
   */
  getEvents(): RpgEvent[] {
    return Object.values(this.events())
  }

  getEventsForPlayer(playerOrId: string | RpgPlayer): RpgEvent[] {
    return this.getEvents().filter(event => this.isEventVisibleForPlayer(event, playerOrId));
  }

  /**
   * Get the first event that matches a condition
   * 
   * Searches through all events on the map and returns the first one that
   * matches the provided callback function.
   * 
   * @param cb - Callback function that returns true for the desired event
   * @returns The first matching event, or undefined if none found
   * 
   * @example
   * ```ts
   * // Find an event by name
   * const npc = map.getEventBy(event => event.name === 'Merchant');
   * 
   * // Find an event at a specific position
   * const chest = map.getEventBy(event => 
   *   event.x === 100 && event.y === 200
   * );
   * ```
   */
  getEventBy(cb: (event: RpgEvent) => boolean): RpgEvent | undefined {
    return this.getEventsBy(cb)[0]
  }

  /**
   * Get all events that match a condition
   * 
   * Searches through all events on the map and returns all events that
   * match the provided callback function.
   * 
   * @param cb - Callback function that returns true for desired events
   * @returns Array of all matching events
   * 
   * @example
   * ```ts
   * // Find all NPCs
   * const npcs = map.getEventsBy(event => event.name.startsWith('NPC-'));
   * 
   * // Find all events in a specific area
   * const nearbyEvents = map.getEventsBy(event => 
   *   event.x >= 0 && event.x <= 100 &&
   *   event.y >= 0 && event.y <= 100
   * );
   * ```
   */
  getEventsBy(cb: (event: RpgEvent) => boolean): RpgEvent[] {
    return this.getEvents().filter(cb)
  }

  /**
   * Remove an event from the map
   * 
   * Removes the event with the specified ID from the map. The event will
   * be removed from the synchronized events signal, causing it to disappear
   * on all clients.
   * 
   * @param eventId - The unique identifier of the event to remove
   * 
   * @example
   * ```ts
   * // Remove an event
   * map.removeEvent('npc-1');
   * 
   * // Remove event after interaction
   * const chest = map.getEvent('chest-1');
   * if (chest) {
   *   // ... do something with chest ...
   *   map.removeEvent('chest-1');
   * }
   * ```
   */
  removeEvent(eventId: string) {
    const event = this.getEvent(eventId) as any;
    if (event) {
      try {
        event.stopMoveTo?.();
      }
      catch {
        // Ignore teardown race: the physics entity may already be gone.
      }
      try {
        event.breakRoutes?.(true);
      }
      catch {
        // Ignore teardown race in route manager.
      }
    }
    this.clearEventRuntimeMetadata(eventId);
    delete this.events()[eventId]
  }

  /**
   * Display a component animation at a specific position on the map
   * 
   * This method broadcasts a component animation to all clients connected to the map,
   * allowing temporary visual effects to be displayed at any location on the map.
   * Component animations are custom Canvas Engine components that can display
   * complex effects with custom logic and parameters.
   * 
   * @param id - The ID of the component animation to display
   * @param position - The x, y coordinates where to display the animation
   * @param params - Parameters to pass to the component animation
   * 
   * @example
   * ```ts
   * // Show explosion at specific coordinates
   * map.showComponentAnimation("explosion", { x: 300, y: 400 }, {
   *   intensity: 2.5,
   *   duration: 1500
   * });
   * 
   * // Show area damage effect
   * map.showComponentAnimation("area-damage", { x: player.x, y: player.y }, {
   *   radius: 100,
   *   color: "red",
   *   damage: 50
   * });
   * 
   * // Show treasure spawn effect
   * map.showComponentAnimation("treasure-spawn", { x: 150, y: 200 }, {
   *   sparkle: true,
   *   sound: "treasure-appear"
   * });
   * ```
   */
  showComponentAnimation(id: string, position: { x: number, y: number }, params: any) {
    this.$broadcast({
      type: "showComponentAnimation",
      value: {
        id,
        params,
        position,
      },
    });
  }

  /**
   * Display a spritesheet animation at a specific position on the map
   * 
   * This method displays a temporary visual animation using a spritesheet at any
   * location on the map. It's a convenience method that internally uses showComponentAnimation
   * with the built-in 'animation' component. This is useful for spell effects, environmental
   * animations, or any visual feedback that uses predefined spritesheets.
   * 
   * @param position - The x, y coordinates where to display the animation
   * @param graphic - The ID of the spritesheet to use for the animation
   * @param animationName - The name of the animation within the spritesheet (default: 'default')
   * 
   * @example
   * ```ts
   * // Show explosion at specific coordinates
   * map.showAnimation({ x: 100, y: 200 }, "explosion");
   * 
   * // Show spell effect at player position
   * const playerPos = { x: player.x, y: player.y };
   * map.showAnimation(playerPos, "spell-effects", "lightning");
   * 
   * // Show environmental effect
   * map.showAnimation({ x: 300, y: 150 }, "nature-effects", "wind-gust");
   * 
   * // Show portal opening animation
   * map.showAnimation({ x: 500, y: 400 }, "portals", "opening");
   * ```
   */
  showAnimation(position: { x: number, y: number }, graphic: string, animationName: string = 'default') {
    this.showComponentAnimation('animation', position, {
      graphic,
      animationName,
    })
  }

  private cloneWeatherState(weather: WeatherState | null): WeatherState | null {
    if (!weather) {
      return null;
    }
    return {
      ...weather,
      params: weather.params ? { ...weather.params } : undefined,
    };
  }

  /**
   * Get the current map weather state.
   */
  getWeather(): WeatherState | null {
    return this.cloneWeatherState(this._weatherState);
  }

  /**
   * Set the full weather state for this map.
   *
   * When `sync` is true (default), all connected clients receive the new weather.
   */
  setWeather(next: WeatherState | null, options: WeatherSetOptions = {}): WeatherState | null {
    const sync = options.sync !== false;
    if (next && !next.effect) {
      throw new Error("setWeather: 'effect' is required when weather is not null.");
    }
    this._weatherState = this.cloneWeatherState(next);
    if (sync) {
      this.$broadcast({
        type: "weatherState",
        value: this._weatherState,
      });
    }
    return this.getWeather();
  }

  /**
   * Patch the current weather state.
   *
   * Nested `params` values are merged.
   */
  patchWeather(patch: Partial<WeatherState>, options: WeatherSetOptions = {}): WeatherState | null {
    const current = this._weatherState ?? null;
    if (!current && !patch.effect) {
      throw new Error("patchWeather: 'effect' is required when no weather is currently set.");
    }
    const next: WeatherState = {
      ...(current ?? {}),
      ...patch,
      params: {
        ...(current?.params ?? {}),
        ...(patch.params ?? {}),
      },
    } as WeatherState;
    return this.setWeather(next, options);
  }

  /**
   * Clear weather for this map.
   */
  clearWeather(options: WeatherSetOptions = {}): void {
    this.setWeather(null, options);
  }

  private clearLightingTransition(): void {
    if (this._lightingTransitionTimer) {
      clearInterval(this._lightingTransitionTimer);
      this._lightingTransitionTimer = undefined;
    }
  }

  private interpolateNumber(from: number | undefined, to: number | undefined, progress: number): number | undefined {
    if (typeof from !== "number" && typeof to !== "number") {
      return undefined;
    }
    const start = typeof from === "number" ? from : 0;
    const end = typeof to === "number" ? to : start;
    return start + (end - start) * progress;
  }

  private easeLightingProgress(progress: number, easing: LightingTransitionOptions["easing"]): number {
    const value = Math.max(0, Math.min(1, progress));
    if (easing === "easeInOut") {
      return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
    }
    return value;
  }

  private interpolateLighting(from: LightingState, to: LightingState, progress: number): LightingState {
    return {
      ...to,
      ambient: {
        ...(to.ambient ?? {}),
        darkness: this.interpolateNumber(from.ambient?.darkness, to.ambient?.darkness, progress),
        fogRadius: this.interpolateNumber(from.ambient?.fogRadius, to.ambient?.fogRadius, progress),
        fogSoftness: this.interpolateNumber(from.ambient?.fogSoftness, to.ambient?.fogSoftness, progress),
        fogOpacity: this.interpolateNumber(from.ambient?.fogOpacity, to.ambient?.fogOpacity, progress),
      },
      sun: {
        ...(to.sun ?? {}),
        x: this.interpolateNumber(from.sun?.x, to.sun?.x, progress),
        y: this.interpolateNumber(from.sun?.y, to.sun?.y, progress),
        z: this.interpolateNumber(from.sun?.z, to.sun?.z, progress),
        radius: this.interpolateNumber(from.sun?.radius, to.sun?.radius, progress),
        intensity: this.interpolateNumber(from.sun?.intensity, to.sun?.intensity, progress),
        shadowWeight: this.interpolateNumber(from.sun?.shadowWeight, to.sun?.shadowWeight, progress),
      },
    };
  }

  /**
   * Get the current map lighting state.
   */
  getLighting(): LightingState | null {
    return cloneLightingState(this._lightingState);
  }

  /**
   * Set the full lighting state for this map.
   *
   * When `sync` is true (default), all connected clients receive the new lighting.
   */
  setLighting(next: LightingState | null, options: LightingSetOptions = {}): LightingState | null {
    const sync = options.sync !== false;
    if (options.cancelTransition !== false) {
      this.clearLightingTransition();
    }
    this._lightingState = cloneLightingState(normalizeLightingState(next));
    if (sync) {
      this.$broadcast({
        type: "lightingState",
        value: this._lightingState,
      });
    }
    return this.getLighting();
  }

  /**
   * Patch the current lighting state.
   *
   * Nested `ambient`, `sun`, and `shadows` values are merged.
   */
  patchLighting(patch: Partial<LightingState>, options: LightingSetOptions = {}): LightingState | null {
    const next = mergeLightingState(this._lightingState, patch);
    return this.setLighting(next, options);
  }

  /**
   * Clear lighting for this map.
   */
  clearLighting(options: LightingSetOptions = {}): void {
    this.setLighting(null, options);
  }

  /**
   * Apply the default daytime lighting preset.
   */
  setDay(options: LightingSetOptions = {}): LightingState | null {
    return this.setLighting(DEFAULT_DAY_LIGHTING, options);
  }

  /**
   * Apply the default nighttime lighting preset.
   */
  setNight(options: LightingSetOptions = {}): LightingState | null {
    return this.setLighting(DEFAULT_NIGHT_LIGHTING, options);
  }

  /**
   * Transition lighting over time by broadcasting intermediate lighting states.
   */
  transitionLighting(toLighting: Partial<LightingState>, options: LightingTransitionOptions & LightingSetOptions = {}): LightingState | null {
    this.clearLightingTransition();

    const duration = Math.max(0, options.duration ?? 1000);
    const from = cloneLightingState(this._lightingState) ?? cloneLightingState(DEFAULT_DAY_LIGHTING)!;
    const to = mergeLightingState(from, toLighting);

    if (duration <= 0) {
      return this.setLighting(to, options);
    }

    const startedAt = Date.now();
    const intervalMs = 50;

    this._lightingTransitionTimer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const progress = this.easeLightingProgress(elapsed / duration, options.easing);
      const next = this.interpolateLighting(from, to, progress);
      this.setLighting(next, { ...options, cancelTransition: false });

      if (elapsed >= duration) {
        this.clearLightingTransition();
        this.setLighting(to, { ...options, cancelTransition: false });
      }
    }, intervalMs);

    const first = this.interpolateLighting(from, to, 0);
    this.setLighting(first, { ...options, cancelTransition: false });
    return this.getLighting();
  }

  /**
   * Configure runtime synchronized properties on the map
   * 
   * This method allows you to dynamically add synchronized properties to the map
   * that will be automatically synced with clients. The schema follows the same
   * structure as module properties with `$initial`, `$syncWithClient`, and `$permanent` options.
   * 
   * ## Architecture
   * 
   * - Reads a schema object shaped like module props
   * - Creates typed synchronized signals through the RPGJS gameplay contract
   * - Properties are accessible as `map.propertyName`
   * 
   * @param schema - Schema object defining the properties to sync
   * @param schema[key].$initial - Initial value for the property
   * @param schema[key].$syncWithClient - Whether to sync this property to clients
   * @param schema[key].$permanent - Whether to persist this property
   * 
   * @example
   * ```ts
   * // Add synchronized properties to the map
   * map.setSync({
   *   weather: {
   *     $initial: 'sunny',
   *     $syncWithClient: true,
   *     $permanent: false
   *   },
   *   timeOfDay: {
   *     $initial: 12,
   *     $syncWithClient: true,
   *     $permanent: false
   *   }
   * });
   * 
   * // Use the properties
   * map.weather.set('rainy');
   * const currentWeather = map.weather();
   * ```
   */
  setSync(schema: Record<string, any>) {
    for (let key in schema) {
      const initial = typeof schema[key]?.$initial !== 'undefined' ? schema[key].$initial : null;
      // Use type() directly with a plain object holder to avoid signal type mismatch
      const holder: any = {};
      this[key] = type(signal(initial) as any, key, {
        syncToClient: schema[key]?.$syncWithClient,
        persist: schema[key]?.$permanent,
      }, holder);
    }
  }

  /**
   * Apply sync to the client
   * 
   * This method applies sync to the client by calling the `$applySync()` method.
   * 
   * @example
   * ```ts
   * map.applySyncToClient();
   * ```
   */
  applySyncToClient() {
    this.$applySync();
  }

  /**
   * Create a shape dynamically on the map
   * 
   * This method creates a static hitbox on the map that can be used for
   * collision detection, area triggers, or visual boundaries. The shape is
   * backed by the physics engine's static entity system for accurate collision detection.
   * 
   * ## Architecture
   * 
   * Creates a static entity (hitbox) in the physics engine at the specified position and size.
   * The shape is stored internally and can be retrieved by name. When players or events
   * collide with this hitbox, the `onInShape` and `onOutShape` hooks are automatically
   * triggered on both the player and the event.
   * 
   * @param obj - Shape configuration object
   * @param obj.x - X position of the shape (top-left corner) (required)
   * @param obj.y - Y position of the shape (top-left corner) (required)
   * @param obj.width - Width of the shape in pixels (required)
   * @param obj.height - Height of the shape in pixels (required)
   * @param obj.name - Name of the shape (optional, auto-generated if not provided)
   * @param obj.z - Z position/depth for rendering (optional)
   * @param obj.color - Color in hexadecimal format, shared with client (optional)
   * @param obj.collision - Whether the shape has collision (optional)
   * @param obj.properties - Additional custom properties (optional)
   * @returns The created RpgShape instance
   * 
   * @example
   * ```ts
   * // Create a simple rectangular shape
   * const shape = map.createShape({
   *   x: 100,
   *   y: 200,
   *   width: 50,
   *   height: 50,
   *   name: "spawn-zone"
   * });
   * 
   * // Create a shape with visual properties
   * const triggerZone = map.createShape({
   *   x: 300,
   *   y: 400,
   *   width: 100,
   *   height: 100,
   *   name: "treasure-area",
   *   color: "#FFD700",
   *   z: 1,
   *   collision: false,
   *   properties: {
   *     type: "treasure",
   *     value: 100
   *   }
   * });
   * 
   * // Player hooks will be triggered automatically
   * const player: RpgPlayerHooks = {
   *   onInShape(player: RpgPlayer, shape: RpgShape) {
   *     console.log('in', player.name, shape.name);
   *   },
   *   onOutShape(player: RpgPlayer, shape: RpgShape) {
   *     console.log('out', player.name, shape.name);
   *   }
   * };
   * ```
   */
  createShape(obj: {
    x: number;
    y: number;
    width: number;
    height: number;
    name?: string;
    z?: number;
    color?: string;
    collision?: boolean;
    properties?: Record<string, any>;
  }): RpgShape {
    const { x, y, width, height } = obj;

    // Validate required parameters
    if (typeof x !== 'number' || typeof y !== 'number') {
      throw new Error('Shape x and y must be numbers');
    }
    if (typeof width !== 'number' || width <= 0) {
      throw new Error('Shape width must be a positive number');
    }
    if (typeof height !== 'number' || height <= 0) {
      throw new Error('Shape height must be a positive number');
    }

    // Generate name if not provided
    const name = obj.name || generateShortUUID();

    // Check if shape with this name already exists
    if (this._shapes.has(name)) {
      throw new Error(`Shape with name "${name}" already exists`);
    }

    // Calculate center position for the static hitbox
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    // Create static obstacle in physics engine
    const entityId = `shape-${name}`;
    this.physic.createStaticObstacle(entityId, {
      x: centerX,
      y: centerY,
      width,
      height,
      restitution: 0,
    });

    // Build properties object
    const properties: Record<string, any> = {
      ...(obj.properties || {}),
    };
    if (obj.z !== undefined) properties.z = obj.z;
    if (obj.color !== undefined) properties.color = obj.color;
    if (obj.collision !== undefined) properties.collision = obj.collision;

    // Create RpgShape instance
    // Note: We use entityId as physicZoneId for compatibility, but it's actually an entity UUID
    const shape = new RpgShape({
      name: name,
      positioning: 'default',
      width: width,
      height: height,
      x: centerX,
      y: centerY,
      properties: properties,
      playerOwner: undefined, // Static shapes are not attached to players
      physicZoneId: entityId, // Store entity UUID for reference
      map: this,
    });

    // Store the shape
    this._shapes.set(name, shape);
    this._shapeEntities.set(entityId, shape);

    return shape;
  }

  /**
   * Delete a shape from the map
   * 
   * Removes a shape by its name and cleans up the associated static hitbox entity.
   * If the shape doesn't exist, the method does nothing.
   * 
   * @param name - Name of the shape to remove
   * @returns void
   * 
   * @example
   * ```ts
   * // Create and then remove a shape
   * const shape = map.createShape({
   *   x: 100,
   *   y: 200,
   *   width: 50,
   *   height: 50,
   *   name: "temp-zone"
   * });
   * 
   * // Later, remove it
   * map.removeShape("temp-zone");
   * ```
   */
  removeShape(name: string): void {
    const shape = this._shapes.get(name);
    if (!shape) {
      return;
    }

    // Remove entity from physics engine
    const entityId = (shape as any)._physicZoneId;
    const entity = this.physic.getEntityByUUID(entityId);
    if (entity) {
      this.physic.removeEntity(entity);
    }

    // Remove from internal storage
    this._shapes.delete(name);
    this._shapeEntities.delete(entityId);
  }

  /**
   * Get all shapes on the map
   * 
   * Returns an array of all shapes that have been created on this map,
   * regardless of whether they are static shapes or player-attached shapes.
   * 
   * @returns Array of RpgShape instances
   * 
   * @example
   * ```ts
   * // Create multiple shapes
   * map.createShape({ x: 0, y: 0, width: 50, height: 50, name: "zone1" });
   * map.createShape({ x: 100, y: 100, width: 50, height: 50, name: "zone2" });
   * 
   * // Get all shapes
   * const allShapes = map.getShapes();
   * console.log(allShapes.length); // 2
   * ```
   */
  getShapes(): RpgShape[] {
    return Array.from(this._shapes.values());
  }

  /**
   * Get a shape by its name
   * 
   * Returns a shape with the specified name, or undefined if no shape
   * with that name exists on the map.
   * 
   * @param name - Name of the shape to retrieve
   * @returns The RpgShape instance, or undefined if not found
   * 
   * @example
   * ```ts
   * // Create a shape with a specific name
   * map.createShape({
   *   x: 100,
   *   y: 200,
   *   width: 50,
   *   height: 50,
   *   name: "spawn-point"
   * });
   * 
   * // Retrieve it later
   * const spawnZone = map.getShape("spawn-point");
   * if (spawnZone) {
   *   console.log(`Spawn zone at (${spawnZone.x}, ${spawnZone.y})`);
   * }
   * ```
   */
  getShape(name: string): RpgShape | undefined {
    return this._shapes.get(name);
  }

  /**
   * Play a sound for all players on the map
   * 
   * This method plays a sound for all players currently on the map by iterating
   * over each player and calling `player.playSound()`. The sound must be defined
   * on the client side (in the client module configuration).
   * This is ideal for environmental sounds, battle music, or map-wide events that
   * all players should hear simultaneously.
   * 
   * ## Design
   * 
   * Iterates over all players on the map and calls `player.playSound()` for each one.
   * This avoids code duplication and reuses the existing player sound logic.
   * For player-specific sounds, use `player.playSound()` directly.
   * 
   * @param soundId - Sound identifier, defined on the client side
   * @param options - Optional sound configuration
   * @param options.volume - Volume level (0.0 to 1.0, default: 1.0)
   * @param options.loop - Whether the sound should loop (default: false)
   * 
   * @example
   * ```ts
   * // Play a sound for all players on the map
   * map.playSound("explosion");
   * 
   * // Play background music for everyone with volume and loop
   * map.playSound("battle-theme", {
   *   volume: 0.7,
   *   loop: true
   * });
   * 
   * // Play a door opening sound at low volume
   * map.playSound("door-open", { volume: 0.4 });
   * ```
   */
  playSound(soundId: string, options?: { volume?: number; loop?: boolean }): void {
    const players = this.getPlayers();
    players.forEach((player) => {
      player.playSound(soundId, options);
    });
  }

  /**
   * Trigger a named client visual for all players on the map.
   *
   * Client visuals are registered in the client module with `clientVisuals`.
   * They are client-side macros for grouping existing visual primitives such as
   * flash, sound, component animations, sprite animations, or camera shake.
   * The map broadcasts one compact packet containing the visual name and a
   * serializable payload; each client resolves and renders the visual locally.
   *
   * Prefer direct APIs such as `playSound()`, `showComponentAnimation()`, or
   * `flash()` for a single visual operation. Use `clientVisual()` when one
   * gameplay moment should trigger several client-side visuals together.
   *
   * @param name - Visual name registered on the client
   * @param data - Serializable payload passed to the client visual handler
   *
   * @example
   * ```ts
   * map.clientVisual("explosion", {
   *   position: { x: 320, y: 180 },
   *   power: 2,
   * });
   * ```
   */
  clientVisual<TData extends Record<string, unknown> = Record<string, unknown>>(
    name: string,
    data: TData = {} as TData
  ): void {
    this.$broadcast({
      type: "clientVisual",
      value: {
        name,
        data,
      },
    });
  }

  /**
   * Stop a sound for all players on the map
   * 
   * This method stops a sound that was previously started with `map.playSound()`
   * for all players on the map by iterating over each player and calling `player.stopSound()`.
   * 
   * @param soundId - Sound identifier to stop
   * 
   * @example
   * ```ts
   * // Start background music for everyone
   * map.playSound("battle-theme", { loop: true });
   * 
   * // Later, stop it for everyone
   * map.stopSound("battle-theme");
   * ```
   */
  stopSound(soundId: string): void {
    const players = this.getPlayers();
    players.forEach((player) => {
      player.stopSound(soundId);
    });
  }

  /**
   * Shake the map for all players
   * 
   * This method triggers a shake animation on the map for all players currently on the map.
   * The shake effect creates a visual feedback that can be used for earthquakes, explosions,
   * impacts, or any dramatic event that should affect the entire map visually.
   * 
   * ## Architecture
   * 
   * Broadcasts a shake event to all clients connected to the map. Each client receives
   * the shake configuration and triggers the shake animation on the map container using
   * Canvas Engine's shake directive.
   * 
   * @param options - Optional shake configuration
   * @param options.intensity - Shake intensity in pixels (default: 10)
   * @param options.duration - Duration of the shake animation in milliseconds (default: 500)
   * @param options.frequency - Number of shake oscillations during the animation (default: 10)
   * @param options.direction - Direction of the shake - 'x', 'y', or 'both' (default: 'both')
   * 
   * @example
   * ```ts
   * // Basic shake with default settings
   * map.shakeMap();
   * 
   * // Intense earthquake effect
   * map.shakeMap({
   *   intensity: 25,
   *   duration: 1000,
   *   frequency: 15,
   *   direction: 'both'
   * });
   * 
   * // Horizontal shake for side impact
   * map.shakeMap({
   *   intensity: 15,
   *   duration: 400,
   *   direction: 'x'
   * });
   * 
   * // Vertical shake for ground impact
   * map.shakeMap({
   *   intensity: 20,
   *   duration: 600,
   *   direction: 'y'
   * });
   * ```
   */
  shakeMap(options?: {
    intensity?: number;
    duration?: number;
    frequency?: number;
    direction?: 'x' | 'y' | 'both';
  }): void {
    this.$broadcast({
      type: "shakeMap",
      value: {
        intensity: options?.intensity ?? 10,
        duration: options?.duration ?? 500,
        frequency: options?.frequency ?? 10,
        direction: options?.direction ?? 'both',
      },
    });
  }

  /**
   * Clear all server resources and reset state
   * 
   * This method should be called to clean up all server-side resources when
   * shutting down or resetting the map. It stops the input processing loop
   * and ensures that all subscriptions are properly cleaned up.
   * 
   * ## Design
   * 
   * This method is used primarily in testing environments to ensure clean
   * state between tests. It stops the tick subscription to prevent memory leaks.
   * 
   * @example
   * ```ts
   * // In test cleanup
   * afterEach(() => {
   *   map.clear();
   * });
   * ```
   */
  clear(): void {
    try {
      this.clearLightingTransition();
      this.stopServerTickLoop();
    } catch (error) {
      console.warn('Error during map cleanup:', error);
    }
  }
}

export interface RpgMap {
  $send(connection: RpgRoomConnection, packet: unknown): void;
  $broadcast(packet: unknown, without?: string[]): void;
  $applySync(): void;
  $sessionTransfer(connection: RpgRoomConnection, roomId: string): Promise<unknown>;
}
