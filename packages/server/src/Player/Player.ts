import {
  combineMixins,
  Hooks,
  ModulesToken,
  RpgCommonPlayer,
  ShowAnimationParams,
  Constructor,
  Direction,
  type WorldMapInfo,
  AttachShapeOptions,
  RpgShape,
  ShapePositioning,
  getOrCreateI18nService,
  type I18nParams,
  type RpgContext,
  type RpgReadableSignal,
  type RpgWritableSignal,
  type RpgRoomDescriptor,
  type RpgRoomTarget,
} from "@rpgjs/common";
import { Entity, Vector2 } from "@rpgjs/physic";
import { IComponentManager, WithComponentManager } from "./ComponentManager";
import { RpgMap, type EventPosOption } from "../rooms/map";
import { IGuiManager, WithGuiManager } from "./GuiManager";
import { IMoveManager, WithMoveManager } from "./MoveManager";
import { IGoldManager, WithGoldManager } from "./GoldManager";
import { WithVariableManager, type IVariableManager } from "./VariableManager";
import { createStatesSnapshotDeep, load, sync, type } from "@signe/sync";
import { computed, signal } from "@signe/reactive";
import {
  IParameterManager,
  WithParameterManager,
} from "./ParameterManager";
import { WithItemFixture } from "./ItemFixture";
import { IItemManager, WithItemManager } from "./ItemManager";
import { bufferTime, combineLatest, debounceTime, distinctUntilChanged, filter, lastValueFrom, map, Observable, pairwise, sample, throttleTime } from "rxjs";
import { IEffectManager, WithEffectManager } from "./EffectManager";
import { AGI, DEX, INT, MAXHP, MAXSP, STR } from "@rpgjs/common";
import { AGI_CURVE, DEX_CURVE, INT_CURVE, MAXHP_CURVE, MAXSP_CURVE, STR_CURVE } from "../presets";
import { IElementManager, WithElementManager } from "./ElementManager";
import { ISkillManager, WithSkillManager } from "./SkillManager";
import { IBattleManager, WithBattleManager } from "./BattleManager";
import { IClassManager, WithClassManager } from "./ClassManager";
import { IStateManager, WithStateManager } from "./StateManager";
import { IHotbarManager, WithHotbarManager } from "./HotbarManager";
import {
  buildSaveSlotMeta,
  resolveAutoSaveStrategy,
  resolveSaveSlot,
  resolveSaveStorageStrategy,
  shouldAutoSave,
  type SaveRequestContext,
  type SaveSlotIndex,
} from "../services/save";
import type { SaveSlotMeta } from "@rpgjs/common";
import { RpgPlayerProjectiles } from "../projectiles";
import type {
  RpgPlayerSaveResult,
  RpgPlayerSlotLoadResult,
  RpgPlayerSnapshot,
  RpgPlayerSnapshotLoadResult,
} from "./types";
import { RpgRoomRegistry } from "../rooms/registry";
import type { RpgSyncSchema } from "./types";
import { inject } from "../core/inject";

export interface RpgTiledTile {
  [key: string]: unknown;
}

/**
 * Combines multiple RpgCommonPlayer mixins into one
 * 
 * @param mixins - Array of mixin functions that extend RpgCommonPlayer
 * @returns A single mixin function that applies all mixins
 */
function combinePlayerMixins<T extends Constructor<RpgCommonPlayer>>(
  mixins: Array<(Base: T) => any>
) {
  return (Base: T) =>
    mixins.reduce((ExtendedClass, mixin) => mixin(ExtendedClass), Base);
}

// Start with basic mixins that work
const BasicPlayerMixins = combinePlayerMixins([
  WithComponentManager,
  WithEffectManager,
  WithGuiManager,
  WithMoveManager,
  WithGoldManager,
  WithParameterManager,
  WithItemFixture,
  WithItemManager,
  WithElementManager,
  WithVariableManager,
  WithStateManager,
  WithClassManager,
  WithSkillManager,
  WithHotbarManager,
  WithBattleManager,
]);

type CameraFollowEase =
  | "linear"
  | "easeInQuad"
  | "easeOutQuad"
  | "easeInOutQuad"
  | "easeInCubic"
  | "easeOutCubic"
  | "easeInOutCubic"
  | "easeInQuart"
  | "easeOutQuart"
  | "easeInOutQuart"
  | "easeInQuint"
  | "easeOutQuint"
  | "easeInOutQuint"
  | "easeInSine"
  | "easeOutSine"
  | "easeInOutSine"
  | "easeInExpo"
  | "easeOutExpo"
  | "easeInOutExpo"
  | "easeInCirc"
  | "easeOutCirc"
  | "easeInOutCirc"
  | "easeInElastic"
  | "easeOutElastic"
  | "easeInOutElastic"
  | "easeInBack"
  | "easeOutBack"
  | "easeInOutBack"
  | "easeInBounce"
  | "easeOutBounce"
  | "easeInOutBounce";

/**
 * RPG Player class with component management capabilities
 * 
 * Combines all player mixins to provide a complete player implementation
 * with graphics, movement, inventory, skills, and battle capabilities.
 * 
 * @example
 * ```ts
 * // Create a new player
 * const player = new RpgPlayer();
 * 
 * // Set player graphics
 * player.setGraphic("hero");
 * 
 * // Add parameters and items
 * player.addParameter("strength", { start: 10, end: 100 });
 * player.addItem(sword);
 * ```
 */
/** Structural contract shared by lobby, map, and custom gameplay rooms. */
export interface RpgPlayerRoom {
  $send(connection: Parameters<RpgMap["$send"]>[0], packet: unknown): void;
  $sessionTransfer(connection: Parameters<RpgMap["$send"]>[0], roomId: string): Promise<unknown>;
}

export class RpgPlayer extends BasicPlayerMixins(RpgCommonPlayer) {
  map: RpgMap | null = null;
  /** Active RPGJS room. Unlike `map`, this also covers non-spatial gameplay rooms. */
  room: RpgPlayerRoom | null = null;
  context?: RpgContext;
  conn: Parameters<RpgMap["$send"]>[0] | null = null;
  touchSide: boolean = false; // Protection against map change loops
  private continueMovementOnNextMapChange = false;
  private _clientListeners = new Map<string, Set<(data: unknown) => void | Promise<void>>>();
  private _projectiles?: RpgPlayerProjectiles;
  private locale?: string;
  private _syncChangesDepth = 0;

  /**
   * Computed signal for world X position
   * 
   * Calculates the absolute world X position from the map's world position
   * plus the player's local X position. Returns 0 if no map is assigned.
   * 
   * @example
   * ```ts
   * const worldX = player.worldX();
   * console.log(`Player is at world X: ${worldX}`);
   * ```
   */
  get worldPositionX() {
    return this._getComputedWorldPosition('x');
  }

  /**
   * Computed signal for world Y position
   * 
   * Calculates the absolute world Y position from the map's world position
   * plus the player's local Y position. Returns 0 if no map is assigned.
   * 
   * @example
   * ```ts
   * const worldY = player.worldY();
   * console.log(`Player is at world Y: ${worldY}`);
   * ```
   */
  get worldPositionY() {
    return this._getComputedWorldPosition('y');
  }

  private _worldPositionSignals = new WeakMap<object, Partial<Record<'x' | 'y', RpgReadableSignal<number>>>>();

  private _getComputedWorldPosition(axis: 'x' | 'y'): RpgReadableSignal<number> {
    // We use a WeakMap to cache the computed signal per instance
    // This ensures that if the player object is copied (e.g. in tests),
    // the new instance gets its own signal bound to itself.
    if (!this._worldPositionSignals) {
      this._worldPositionSignals = new WeakMap();
    }

    const key = axis;
    let signals = this._worldPositionSignals.get(this);
    if (!signals) {
      signals = {};
      this._worldPositionSignals.set(this, signals);
    }

    if (!signals[key]) {
      signals[key] = computed(() => {
        const map = this.map as RpgMap | null;
        const mapWorldPos = map ? (map[axis === 'x' ? 'worldX' : 'worldY'] ?? 0) : 0;
        return mapWorldPos + (this[axis] as any)();
      });
    }
    return signals[key];
  }

  /** Internal: Shapes attached to this player */
  private _attachedShapes: Map<string, RpgShape> = new Map();

  /** Internal: Shapes where this player is currently located */
  private _inShapes: Set<RpgShape> = new Set();
  /** Server-clock deadline used to stop idle movement. */
  lastProcessedInputTs: number = 0;
  /** Last client-authored timestamp, kept separately for anti-cheat validation. */
  lastProcessedClientInputTs: number = 0;
  /** Client physics tick attached to the last processed movement input. */
  lastProcessedInputTick: number | null = null;
  /** Server physics tick at which that client tick was applied. */
  lastProcessedInputServerTick: number | null = null;
  /** Last processed client input frame for reconciliation with server tick */
  _lastFramePositions: {
    frame: number;
    position: {
      x: number;
      y: number;
      direction: Direction;
    };
    serverTick?: number; // Server tick at which this position was computed
  } | null = null;

  frames: { x: number; y: number; ts: number }[] = [];

  @sync(RpgPlayer) events = signal<RpgEvent[]>([]) as unknown as RpgWritableSignal<RpgEvent[]>;

  /** Internal: named map position to resolve after the target map data is ready */
  @sync() pendingMapPosition = signal<string | null>(null) as unknown as RpgWritableSignal<string | null>;

  constructor() {
    super();

    const initialX = typeof this.x === "function" ? Number(this.x()) || 0 : 0;
    const initialY = typeof this.y === "function" ? Number(this.y()) || 0 : 0;
    let lastEmitted: { x: number; y: number } | null = { x: initialX, y: initialY };
    let pendingUpdate: { x: number; y: number } | null = null;
    let updateScheduled = false;

    combineLatest([
      (this.x as any).observable as Observable<number>,
      (this.y as any).observable as Observable<number>,
    ])
      .subscribe(([x, y]) => {
        pendingUpdate = { x, y };

        // Schedule a synchronous update using queueMicrotask
        // This groups multiple rapid changes (x and y in the same tick) into a single frame
        if (!updateScheduled) {
          updateScheduled = true;
          queueMicrotask(() => {
            if (pendingUpdate) {
              const { x, y } = pendingUpdate;
              // Only emit if the values are different from the last emitted frame
              if (!lastEmitted || lastEmitted.x !== x || lastEmitted.y !== y) {
                this.frames = [...this.frames, {
                  x: x,
                  y: y,
                  ts: Date.now(),
                }];
                lastEmitted = { x, y };
              }
              pendingUpdate = null;
            }
            updateScheduled = false;
          });
        }
      })
  }

  private _getClientListenerBucket(key: string): Set<(data: unknown) => void | Promise<void>> {
    let listeners = this._clientListeners.get(key);
    if (!listeners) {
      listeners = new Set();
      this._clientListeners.set(key, listeners);
    }
    return listeners;
  }

  async _dispatchClientEvent(key: string, data: unknown): Promise<void> {
    const listeners = [...(this._clientListeners.get(key) ?? [])];
    for (const callback of listeners) {
      await callback(data);
    }
  }

  async _onInit(): Promise<void> {
    await lastValueFrom(this.hooks.callHooks("server-playerProps-load", this));
  }

  /**
   * Apply the built-in default parameter curves to this player.
   *
   * Use this when you want RPGJS to provide the initial parameter setup
   * instead of restoring values from your own database or a saved snapshot.
   *
   * This method only defines the parameter curves and related defaults.
   * It does not restore custom persisted data for you.
   *
   * @method player.applyDefaultParameters()
   * @returns {void}
   */
  applyDefaultParameters() {
    // Use type assertion to access mixin properties
    (this as any).expCurve = {
      basis: 30,
      extra: 20,
      accelerationA: 30,
      accelerationB: 30
    };

    ;(this as any).addParameter(MAXHP, MAXHP_CURVE);
    (this as any).addParameter(MAXSP, MAXSP_CURVE);
    (this as any).addParameter(STR, STR_CURVE);
    (this as any).addParameter(INT, INT_CURVE);
    (this as any).addParameter(DEX, DEX_CURVE);
    (this as any).addParameter(AGI, AGI_CURVE);
  }

  /**
   * Initialize the built-in default player stats.
   *
   * This applies the default parameter curves and then restores HP/SP to their
   * current maximum values so the client receives coherent bars on first load.
   *
   * Call this manually in `onConnected()` or `onStart()` when your game relies
   * on the built-in defaults. Do not call it after loading a snapshot or
   * hydrating player data from your own database unless you explicitly want to
   * overwrite those values.
   *
   * @method player.initializeDefaultStats()
   * @returns {void}
   */
  initializeDefaultStats() {
    this.applyDefaultParameters();
    (this as any).allRecovery();
  }

  get hooks() {
    return inject<Hooks>(ModulesToken, this.context);
  }

  // compatibility with v4
  get server() {
    return this.map
  }

  get projectiles() {
    if (!this._projectiles) {
      this._projectiles = new RpgPlayerProjectiles(this);
    }
    return this._projectiles;
  }

  setLocale(locale: string) {
    this.locale = locale;
  }

  getLocale(): string {
    return this.locale || getOrCreateI18nService(this.context).defaultLocale;
  }

  t(key: string, params?: I18nParams): string {
    return getOrCreateI18nService(this.context).t(key, params, this.getLocale());
  }

  i18n() {
    return {
      locale: this.getLocale(),
      t: (key: string, params?: I18nParams) => this.t(key, params),
    };
  }

  setMap(map: RpgMap) {
    this.map = map;
    this.room = map;
    // Prevent immediate ping-pong map transfers when spawning near a border.
    this.touchSide = true;
  }

  applyFrames() {
    this._frames.set(this.frames)
    this.frames = []
  }

  async execMethod<TResult = unknown>(method: string, methodData: unknown[] = [], target?: object): Promise<TResult | undefined> {
    let ret: unknown;
    if (target) {
      const callback = (target as Record<string, unknown>)[method];
      if (typeof callback === 'function') {
        ret = await callback.apply(target, methodData);
      }
    }
    else {
      ret = await lastValueFrom(this.hooks
        .callHooks(`server-player-${method}`, target ?? this, ...methodData));
    }
    this.syncChanges()
    return ret as TResult | undefined;
  }

  /**
   * Change the map for this player
   *
   * @param mapId - The ID of the map to change to
   * @param positions - Optional positions to place the player at
   * @returns A promise that resolves when the map change is complete
   *
   * @example
   * ```ts
   * // Change player to map "town" at position {x: 10, y: 20}
   * await player.changeMap("town", {x: 10, y: 20});
   *
   * // Change player to map "dungeon" at a named position
   * await player.changeMap("dungeon", "entrance");
   *
   * // Change player to map "town" at the Tiled "start" position, if present
   * await player.changeMap("town");
   * ```
   */
  async changeMap(
    mapId: string,
    positions?: { x: number; y: number; z?: number } | string
  ): Promise<boolean> {
    const descriptor: RpgRoomDescriptor = {
      id: `map-${mapId}`,
      kind: "map",
      name: mapId,
    };
    const canChange: boolean[] = await lastValueFrom(this.hooks.callHooks("server-player-canChangeMap", this, {
      id: mapId,
    }));
    if (canChange.some(v => v === false)) return false;
    const canChangeRoom: boolean[] = await lastValueFrom(
      this.hooks.callHooks("server-player-canChangeRoom", this, descriptor),
    );
    if (canChangeRoom.some((value) => value === false)) return false;

    if (positions && typeof positions === 'object') {
      this.pendingMapPosition.set(null);
      if (this.getCurrentMap()) {
        await this.teleport(positions)
      }
      else {
        this.x.set(positions.x);
        this.y.set(positions.y);
        if (typeof positions.z === "number") this.z.set(positions.z);
      }
    }
    else {
      this.pendingMapPosition.set(positions ?? "start");
    }
    const transferToken = this.conn
      ? await this.getCurrentRoom()?.$sessionTransfer(this.conn, descriptor.id)
      : undefined;
    this.emit("changeMap", {
      ...descriptor,
      mapId: descriptor.id,
      positions,
      continueMovement: this.continueMovementOnNextMapChange,
      transferToken: typeof transferToken === "string" ? transferToken : undefined,
    });
    return true;
  }

  /**
   * Transfer this player to a registered custom gameplay room.
   *
   * The server resolves the destination, runs authorization hooks, creates a
   * Signe session-transfer token, and tells the client which scene kind to
   * mount. Clients cannot select a destination on their own.
   *
   * @method player.changeRoom(target)
   * @param target - Registered room kind and values for its path placeholders.
   * @returns `false` when a hook rejects the transfer; otherwise `true`.
   *
   * @example
   * ```ts
   * await player.changeRoom({
   *   kind: "battle",
   *   params: { id: "encounter-42" },
   * })
   * ```
   */
  async changeRoom(target: RpgRoomTarget): Promise<boolean> {
    if (target.kind === "map" || target.kind === "lobby") {
      throw new Error(`Use changeMap() for RPGJS built-in room kind: ${target.kind}`);
    }
    return this.transferRoom(target);
  }

  /** Return the active map-independent RPGJS room. */
  getCurrentRoom<T extends RpgPlayerRoom = RpgPlayerRoom>(): T | null {
    return this.room as T | null;
  }

  private async transferRoom(
    target: RpgRoomTarget,
  ): Promise<boolean> {
    const registry = inject<RpgRoomRegistry>(RpgRoomRegistry, this.context);
    const descriptor = registry.describe(target);
    const canChange: boolean[] = await lastValueFrom(
      this.hooks.callHooks("server-player-canChangeRoom", this, descriptor),
    );
    if (canChange.some((value) => value === false)) return false;

    const currentRoom = this.getCurrentRoom();
    const transferToken = this.conn
      ? await currentRoom?.$sessionTransfer(this.conn, descriptor.id)
      : undefined;

    const payload: RpgRoomDescriptor & Record<string, unknown> = {
      ...descriptor,
      transferToken: typeof transferToken === "string" ? transferToken : undefined,
    };
    this.emit("changeRoom", payload);
    return true;
  }

  async autoChangeMap(nextPosition: Vector2): Promise<boolean> {
    const map = this.getCurrentMap()
    const worldMaps = map?.getInWorldMaps()
    let ret: boolean = false
    if (worldMaps && map) {
        const direction = this.getDirection()
        const marginLeftRight = map.tileWidth / 2
        const marginTopDown = map.tileHeight / 2
        const hitbox = this.hitbox()
        const currentX = this.x()
        const currentY = this.y()
        const nearBorder =
          currentX < marginLeftRight ||
          currentX > map.widthPx - hitbox.w - marginLeftRight ||
          currentY < marginTopDown ||
          currentY > map.heightPx - hitbox.h - marginTopDown

        if (this.touchSide) {
            if (nearBorder) {
                return false
            }
            this.touchSide = false
        }

        const changeMap = async (
            adjacent: Direction,
            to: (nextMapInfo: WorldMapInfo) => { x: number; y: number; z?: number }
        ) => {
            const [nextMap] = worldMaps.getAdjacentMaps(map, adjacent)
            if (!nextMap) {
                return false
            }
            const id = nextMap.id as string
            const nextMapInfo = worldMaps.getMapInfo(id)
            if (!nextMapInfo) {
                return false
            }
            this.continueMovementOnNextMapChange = true
            let changed = false
            try {
                changed = !!(await this.changeMap(id, to(nextMapInfo)))
            }
            finally {
                this.continueMovementOnNextMapChange = false
            }
            if (changed) {
                this.touchSide = true
            }
            return changed
        }

        if (nextPosition.x < marginLeftRight && direction == Direction.Left) {
            ret = await changeMap(Direction.Left, nextMapInfo => ({
                x: (nextMapInfo.width) - this.hitbox().w - marginLeftRight,
                y: map.worldY - nextMapInfo.worldY + nextPosition.y
            }))
        }
        else if (nextPosition.x > map.widthPx - this.hitbox().w - marginLeftRight && direction == Direction.Right) {
            ret = await changeMap(Direction.Right, nextMapInfo => ({
                x: marginLeftRight,
                y: map.worldY - nextMapInfo.worldY + nextPosition.y
            }))
        }
        else if (nextPosition.y < marginTopDown && direction == Direction.Up) {
            ret = await changeMap(Direction.Up, nextMapInfo => ({
                x: map.worldX - nextMapInfo.worldX + nextPosition.x,
                y: (nextMapInfo.height) - this.hitbox().h - marginTopDown,
            }))
        }
        else if (nextPosition.y > map.heightPx - this.hitbox().h - marginTopDown && direction == Direction.Down) {
            ret = await changeMap(Direction.Down, nextMapInfo => ({
                x: map.worldX - nextMapInfo.worldX + nextPosition.x,
                y: marginTopDown,
            }))
        }
        else {
            this.touchSide = false
        }
    }
    return ret
}

  async teleport(positions: { x: number; y: number }) {
    if (!this.map) return false;
    if (this.map && this.map.physic) {
      // Skip collision check for teleportation (allow teleporting through walls)
      const entity = this.map.physic.getEntityByUUID(this.id);
      if (entity) {
        const hitbox = typeof this.hitbox === "function" ? this.hitbox() : this.hitbox;
        const width = hitbox?.w ?? 32;
        const height = hitbox?.h ?? 32;
        
        // Convert top-left position to center position for physics engine
        // positions.x/y are TOP-LEFT coordinates, but physic.teleport expects CENTER coordinates
        const centerX = positions.x + width / 2;
        const centerY = positions.y + height / 2;
        
        this.map.physic.teleportEntity(entity, { x: centerX, y: centerY });
      }
    }
    this.x.set(positions.x)
    this.y.set(positions.y)
    // Wait for the frame to be added before applying frames
    // This ensures the frame is added before applyFrames() is called
    queueMicrotask(() => {
      this.applyFrames()
    })
  }

  getCurrentMap<T extends RpgMap = RpgMap>(): T | null {
    return this.map as T | null;
  }

  /**
   * Legacy v4 position object.
   *
   * Prefer the reactive `x`, `y`, and `z` signals in new code.
   *
   * @deprecated Use `player.x()`, `player.y()`, `player.z()` and `player.teleport()` instead.
   * @returns Current top-left player position.
   */
  get position(): { x: number; y: number; z: number } {
    return {
      x: this.x(),
      y: this.y(),
      z: this.z(),
    };
  }

  /**
   * Set the legacy v4 position object.
   *
   * This updates the player's top-left coordinates and keeps the physics body in sync
   * when the player is currently attached to a map.
   *
   * @deprecated Use `player.teleport({ x, y })` and `player.z.set(z)` instead.
   */
  set position(position: { x: number; y: number; z?: number }) {
    if (!position || typeof position.x !== "number" || typeof position.y !== "number") {
      return;
    }
    if (typeof position.z === "number") {
      this.z.set(position.z);
    }
    if (this.map) {
      void this.teleport({ x: position.x, y: position.y });
      return;
    }
    this.x.set(position.x);
    this.y.set(position.y);
  }

  /**
   * Legacy v4 helper to create a dynamic event from the player's current map.
   *
   * Prefer `player.getCurrentMap()?.createDynamicEvent(...)` in new code.
   *
   * @deprecated Use `map.createDynamicEvent(...)` instead.
   * @param eventObj - Event definition and position.
   * @returns The created event id, or `undefined` if the player is not on a map.
   */
  createDynamicEvent(eventObj: EventPosOption): Promise<string | undefined> | undefined {
    return this.getCurrentMap()?.createDynamicEvent(eventObj);
  }

  /**
   * Legacy v4 list of shapes attached to this player.
   *
   * Prefer `player.getShapes()` in new code.
   *
   * @deprecated Use `player.getShapes()` instead.
   * @returns Shapes created with `player.attachShape(...)`.
   */
  get shapes(): RpgShape[] {
    return this.getShapes();
  }

  /**
   * Legacy v4 list of Tiled tiles currently covered by the player's hitbox.
   *
   * This helper is available only when the current map was loaded through
   * `@rpgjs/tiledmap` / `@canvasengine/tiled`. For non-Tiled maps, it returns `[]`.
   *
   * @deprecated Use Tiled map APIs from `player.getCurrentMap()?.tiled` instead.
   * @returns Tile information for each Tiled cell touched by the player.
   */
  get tiles(): RpgTiledTile[] {
    const map = this.getCurrentMap() as any;
    const tiled = map?.tiled;
    if (!tiled || typeof tiled.getTileByPosition !== "function") {
      return [];
    }

    const tileWidth = Number(tiled.tilewidth ?? map.tileWidth ?? 32) || 32;
    const tileHeight = Number(tiled.tileheight ?? map.tileHeight ?? 32) || 32;
    const hitbox = this.hitbox();
    const minTileX = Math.floor(this.x() / tileWidth);
    const minTileY = Math.floor(this.y() / tileHeight);
    const maxTileX = Math.floor((this.x() + Math.max(hitbox.w, 1) - 1) / tileWidth);
    const maxTileY = Math.floor((this.y() + Math.max(hitbox.h, 1) - 1) / tileHeight);
    const tiles: RpgTiledTile[] = [];

    for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
        const tile = this.getTile(tileX * tileWidth, tileY * tileHeight);
        if (tile) {
          tiles.push(tile);
        }
      }
    }

    return tiles;
  }

  /**
   * Legacy v4 list of other players or events currently colliding with this player.
   *
   * @deprecated Prefer explicit physics queries on `player.getCurrentMap()`.
   * @returns Runtime players and events whose physics bodies overlap this player.
   */
  get otherPlayersCollision(): Array<RpgPlayer | RpgEvent> {
    const map = this.getCurrentMap() as any;
    if (!map || typeof map.getCollisions !== "function") {
      return [];
    }
    return map
      .getCollisions(this.id)
      .map((id: string) => map.getPlayer?.(id) ?? map.getEvent?.(id))
      .filter(Boolean);
  }

  /**
   * Legacy v4 size setter.
   *
   * In v5, collision size is represented by the hitbox. This bridge maps the
   * legacy object to `setHitbox(...)`.
   *
   * @deprecated Use `player.setHitbox(width, height)` instead.
   * @param obj - Legacy size object.
   * @param key - Legacy size key (`width`, `height`, or `hitbox`).
   * @param value - Legacy size value.
   */
  setSizes(obj: { width: number; height: number; hitbox?: { width: number; height: number } }): void;
  setSizes(key: "width" | "height" | "hitbox", value: number | { width?: number; height?: number }): void;
  setSizes(
    keyOrObj: { width: number; height: number; hitbox?: { width: number; height: number } } | "width" | "height" | "hitbox",
    value?: number | { width?: number; height?: number }
  ): void {
    if (!keyOrObj) {
      return;
    }

    if (typeof keyOrObj === "string") {
      const current = this.hitbox();
      if (keyOrObj === "width" && typeof value === "number") {
        this.setHitbox(value, current.h);
        return;
      }
      if (keyOrObj === "height" && typeof value === "number") {
        this.setHitbox(current.w, value);
        return;
      }
      if (keyOrObj === "hitbox" && value && typeof value === "object") {
        this.setHitbox(value.width ?? current.w, value.height ?? current.h);
      }
      return;
    }

    const width = keyOrObj.hitbox?.width ?? keyOrObj.width;
    const height = keyOrObj.hitbox?.height ?? keyOrObj.height;
    this.setHitbox(width, height);
  }

  /**
   * Legacy v4 Tiled tile lookup.
   *
   * This helper is available only when the current map was loaded through
   * `@rpgjs/tiledmap` / `@canvasengine/tiled`. Coordinates are pixel positions,
   * matching CanvasEngine Tiled's `getTileByPosition(...)` API.
   *
   * @deprecated Use `player.getCurrentMap()?.tiled.getTileByPosition(...)` instead.
   * @param x - X position in pixels.
   * @param y - Y position in pixels.
   * @param z - Optional layer index.
   * @returns Tiled tile information, or `undefined` when unavailable.
   */
  getTile(x: number, y: number, z?: number): RpgTiledTile | undefined {
    const tiled = (this.getCurrentMap() as any)?.tiled;
    if (!tiled || typeof tiled.getTileByPosition !== "function") {
      return undefined;
    }
    const layers = typeof z === "number" ? [z, z] : undefined;
    return tiled.getTileByPosition(x, y, layers, { populateTiles: true }) as RpgTiledTile | undefined;
  }

  /**
   * Send a custom event to the current player's client.
   *
   * Use this to push arbitrary websocket payloads to one client only.
   * On the client side, receive the event by injecting `WebSocketToken`
   * and subscribing with `socket.on(...)`.
   *
   * @method player.emit(type, value)
   * @param type - Custom event name sent to the client
   * @param value - Payload sent with the event
   * @returns {void}
   *
   * @example
   * ```ts
   * player.emit("inventory:updated", {
   *   slots: player.items().length,
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
   * socket.on("inventory:updated", (payload) => {
   *   console.log(payload.slots);
   * });
   * ```
   */
  emit<T = unknown>(type: string, value?: T): void {
    const room = this.getCurrentRoom() ?? this.getCurrentMap();
    if (!room || !this.conn) return;
    room.$send(this.conn, {
      type,
      value,
    });
  }

  /**
   * Trigger a named client visual for this player only.
   *
   * Client visuals are registered in the client module with `clientVisuals`.
   * They group existing client-side visual primitives such as flash, sound,
   * component animations, sprite animations, or camera shake. The server sends
   * only the visual name and a serializable payload, which keeps rendering
   * details on the client and avoids sending several visual packets for one
   * gameplay moment.
   *
   * Use direct APIs like `playSound()`, `flash()`, or
   * `showComponentAnimation()` for one-off visuals. Use `clientVisual()` when
   * several visuals should be orchestrated together by the client.
   *
   * @param name - Visual name registered on the client
   * @param data - Serializable payload passed to the client visual handler
   *
   * @example
   * ```ts
   * player.clientVisual("hit", {
   *   targetId: enemy.id,
   *   damage: 25,
   * });
   * ```
   */
  clientVisual<TData extends Record<string, unknown> = Record<string, unknown>>(
    name: string,
    data: TData = {} as TData
  ): void {
    this.emit("clientVisual", {
      name,
      data,
    });
  }

  prepareSnapshotForObjectLoad(snapshot: RpgPlayerSnapshot): RpgPlayerSnapshot {
    if (!snapshot || typeof snapshot !== "object") {
      return snapshot;
    }

    const hitbox = this.normalizeSnapshotHitbox(snapshot.hitbox);
    if (!hitbox) {
      return snapshot;
    }

    this.hitbox.set(hitbox);
    const rest = { ...snapshot };
    delete rest.hitbox;
    return rest;
  }

  private normalizeSnapshotHitbox(hitbox: unknown): { w: number; h: number } | null {
    if (!hitbox || typeof hitbox !== "object") {
      return null;
    }

    const value = hitbox as Record<string, unknown>;
    const width = this.normalizeSnapshotHitboxDimension(value.w ?? value.width);
    const height = this.normalizeSnapshotHitboxDimension(value.h ?? value.height);
    return width && height ? { w: width, h: height } : null;
  }

  private normalizeSnapshotHitboxDimension(value: unknown): number | null {
    const numberValue = typeof value === "string" ? Number(value) : value;
    return typeof numberValue === "number" && Number.isFinite(numberValue) && numberValue > 0
      ? numberValue
      : null;
  }

  snapshot(): RpgPlayerSnapshot {
    const snapshot = createStatesSnapshotDeep(this) as RpgPlayerSnapshot;
    delete (snapshot as any).pendingMapPosition;
    if ((snapshot as any)._name !== undefined && (snapshot as any).name === undefined) {
      (snapshot as any).name = (snapshot as any)._name;
    }
    if ((snapshot as any)._speed !== undefined && (snapshot as any).speed === undefined) {
      (snapshot as any).speed = (snapshot as any)._speed;
    }
    if ((snapshot as any)._canMove !== undefined && (snapshot as any).canMove === undefined) {
      (snapshot as any).canMove = (snapshot as any)._canMove;
    }
    if ((snapshot as any).canMove === undefined) {
      (snapshot as any).canMove = this.canMove;
    }
    const expCurve = (this as any).expCurve;
    if (expCurve) {
      snapshot.expCurve = { ...expCurve };
    }
    snapshot.locale = this.getLocale();
    return snapshot;
  }

  async applySnapshot(snapshot: string | RpgPlayerSnapshot): Promise<RpgPlayerSnapshot> {
    const data = (typeof snapshot === "string" ? JSON.parse(snapshot) : snapshot) as RpgPlayerSnapshot;
    if (data && typeof data === "object" && typeof (data as any).locale === "string") {
      this.setLocale((data as any).locale);
    }
    if (data && typeof data === "object" && (data as any).name !== undefined && (data as any)._name === undefined) {
      (data as any)._name = (data as any).name;
    }
    if (data && typeof data === "object" && (data as any).speed !== undefined && (data as any)._speed === undefined) {
      (data as any)._speed = (data as any).speed;
    }
    if (data && typeof data === "object" && (data as any).canMove !== undefined && (data as any)._canMove === undefined) {
      (data as any)._canMove = (data as any).canMove;
    }
    const withItems = (this as any).resolveItemsSnapshot?.(data) ?? data;
    const withSkills = (this as any).resolveSkillsSnapshot?.(withItems) ?? withItems;
    const withStates = (this as any).resolveStatesSnapshot?.(withSkills) ?? withSkills;
    const withClass = (this as any).resolveClassSnapshot?.(withStates) ?? withStates;
    const resolvedSnapshot = ((this as any).resolveEquipmentsSnapshot?.(withClass) ?? withClass) as RpgPlayerSnapshot;
    load(this, resolvedSnapshot);
    if (resolvedSnapshot.expCurve) {
      (this as any).expCurve = resolvedSnapshot.expCurve;
    }
    if (Array.isArray(resolvedSnapshot.items)) {
      this.items.set(resolvedSnapshot.items as never);
    }
    if (Array.isArray(resolvedSnapshot.skills)) {
      this.skills.set(resolvedSnapshot.skills as never);
    }
    if (Array.isArray(resolvedSnapshot.states)) {
      this.states.set(resolvedSnapshot.states);
    }
    if (resolvedSnapshot._class != null && this._class?.set) {
      this._class.set(resolvedSnapshot._class);
    }
    if (Array.isArray(resolvedSnapshot.equipments)) {
      this.equipments.set(resolvedSnapshot.equipments as never);
    }
    if (this.context) {
      await lastValueFrom(this.hooks.callHooks("server-player-onLoad", this, resolvedSnapshot));
    }
    return resolvedSnapshot;
  }

  private _isSnapshotInput(input: unknown): input is string | RpgPlayerSnapshot {
    if (input && typeof input === "object" && !Array.isArray(input)) {
      return true;
    }
    if (typeof input !== "string") {
      return false;
    }
    const trimmed = input.trim();
    return trimmed.startsWith("{") || trimmed.startsWith("[");
  }

  /**
   * Save the player state.
   *
   * For v4 compatibility, calling `save()` without arguments returns a JSON
   * snapshot string. Pass a slot (`"auto"` or a number) to use the v5 storage
   * strategy.
   */
  async save(): Promise<string>;
  async save(slot: SaveSlotIndex, meta?: SaveSlotMeta, context?: SaveRequestContext): Promise<RpgPlayerSaveResult | null>;
  async save(slot?: SaveSlotIndex, meta: SaveSlotMeta = {}, context: SaveRequestContext = {}): Promise<string | RpgPlayerSaveResult | null> {
    if (arguments.length === 0) {
      return JSON.stringify(this.snapshot());
    }

    const policy = resolveAutoSaveStrategy();
    if (policy.canSave && !policy.canSave(this, context)) {
      return null;
    }
    const resolvedSlot = resolveSaveSlot(slot ?? "auto", policy, this, context);
    if (resolvedSlot === null) {
      return null;
    }
    const snapshot = this.snapshot();
    await lastValueFrom(this.hooks.callHooks("server-player-onSave", this, snapshot));
    const storage = resolveSaveStorageStrategy();
    const finalMeta = buildSaveSlotMeta(this, meta);
    await storage.save(this, resolvedSlot, JSON.stringify(snapshot), finalMeta);
    return { index: resolvedSlot, meta: finalMeta };
  }

  /**
   * Load player state.
   *
   * For v4 compatibility, pass a JSON string or plain snapshot object to apply
   * it directly. Pass a slot (`"auto"` or a number) to use the v5 storage
   * strategy.
   */
  async load(slot: SaveSlotIndex, context?: SaveRequestContext, options?: { changeMap?: boolean }): Promise<RpgPlayerSlotLoadResult>;
  async load(snapshot: string | RpgPlayerSnapshot, context?: SaveRequestContext, options?: { changeMap?: boolean }): Promise<RpgPlayerSnapshotLoadResult>;
  async load(
    slot: SaveSlotIndex | string | RpgPlayerSnapshot = "auto",
    context: SaveRequestContext = {},
    options: { changeMap?: boolean } = {}
  ): Promise<RpgPlayerSlotLoadResult | RpgPlayerSnapshotLoadResult> {
    if (this._isSnapshotInput(slot)) {
      const resolvedSnapshot = await this.applySnapshot(slot);
      return { ok: true, snapshot: resolvedSnapshot };
    }

    const policy = resolveAutoSaveStrategy();
    if (policy.canLoad && !policy.canLoad(this, context)) {
      return { ok: false };
    }
    const resolvedSlot = resolveSaveSlot(slot as SaveSlotIndex, policy, this, context);
    if (resolvedSlot === null) {
      return { ok: false };
    }
    const storage = resolveSaveStorageStrategy();
    const slotData = await storage.get(this, resolvedSlot);
    if (!slotData?.snapshot) {
      return { ok: false };
    }
    await this.applySnapshot(slotData.snapshot);
    const { snapshot, ...meta } = slotData;
    if (options.changeMap !== false && meta.map) {
      await this.changeMap(meta.map, { x: this.x(), y: this.y(), z: this.z() });
    }
    return { ok: true, slot: meta, index: resolvedSlot };
  }

 
  /**
   * @deprecated Use setGraphicAnimation instead.
   * @param animationName - The name of the animation to play (e.g., 'attack', 'skill', 'walk')
   * @param nbTimes - Number of times to repeat the animation (default: Infinity for continuous)
   */
  setAnimation(animationName: string, nbTimes: number = Infinity) {
    console.warn('setAnimation is deprecated. Use setGraphicAnimation instead.');
    this.setGraphicAnimation(animationName, nbTimes);
  }

  /**
   * @deprecated Use setGraphicAnimation instead.
   * @param graphic - The graphic to use for the animation (e.g., 'attack', 'skill', 'walk')
   * @param animationName - The name of the animation to play (e.g., 'attack', 'skill', 'walk')
   * @param replaceGraphic - Whether to replace the player's graphic (default: false)
   */
  showAnimation(graphic: string, animationName: string, replaceGraphic: boolean = false) {
    if (replaceGraphic) {
      console.warn('showAnimation is deprecated. Use player.setGraphicAnimation instead.');
      this.setGraphicAnimation(animationName, graphic);
    }
    else {
      console.warn('showAnimation is deprecated. Use map.showAnimation instead.');
      const map = this.getCurrentMap();
      map?.showAnimation({ x: this.x(), y: this.y() }, graphic, animationName);
    }
  }

  /**
   * Listen to custom data sent by the current player's client.
   *
   * This listens to websocket actions emitted from the client with
   * `socket.emit(key, data)`. It is intended for custom client events
   * that are not already handled by built-in server actions such as
   * `move`, `action`, or GUI interactions.
   *
   * @title Listen to data from the client
   * @method player.on(key, cb)
   * @param key - Event name emitted by the client
   * @param cb - Callback invoked with the payload sent by the client
   * @returns {void}
   * @since 3.0.0-beta.5
   *
   * @example
   * ```ts
   * player.on("chat:message", ({ text }) => {
   *   console.log("Client says:", text);
   * });
   * ```
   *
   * @example
   * ```ts
   * import { inject } from "@rpgjs/client";
   * import { WebSocketToken, type AbstractWebsocket } from "@rpgjs/client";
   *
   * const socket = inject<AbstractWebsocket>(WebSocketToken);
   * socket.emit("chat:message", { text: "Hello server" });
   * ```
   */
  on<T = unknown>(key: string, cb: (data: T) => void | Promise<void>): void {
    this._getClientListenerBucket(key).add(cb as (data: unknown) => void | Promise<void>);
  }

  /**
   * Listen one time to custom data sent by the current player's client.
   *
   * After the first matching event is received, the listener is removed
   * automatically.
   *
   * @title Listen one-time to data from the client
   * @method player.once(key, cb)
   * @param key - Event name emitted by the client
   * @param cb - Callback invoked only once with the payload sent by the client
   * @returns {void}
   * @since 3.0.0-beta.5
   *
   * @example
   * ```ts
   * player.once("tutorial:ready", (payload) => {
   *   console.log("Ready once:", payload.step);
   * });
   * ```
   */
  once<T = unknown>(key: string, cb: (data: T) => void | Promise<void>): void {
    const onceCallback = async (data: unknown) => {
      this._clientListeners.get(key)?.delete(onceCallback);
      await cb(data as T);
    };
    this.on(key, onceCallback);
  }

  /**
   * Remove all listeners for a custom client event on this player.
   *
   * @title Remove listeners of the client event
   * @method player.off(key)
   * @param key - Event name to clear
   * @returns {void}
   * @since 3.0.0-beta.5
   *
   * @example
   * ```ts
   * player.off("chat:message");
   * ```
   */
  off(key: string) {
    this._clientListeners.delete(key);
  }

   /**
   * Set the current animation of the player's sprite
   *
   * This method changes the animation state of the player's current sprite.
   * It's used to trigger character animations like attack, skill, or custom movements.
   * When `nbTimes` is set to a finite number, the animation will play that many times
   * before returning to the previous animation state.
   *
   * If `animationFixed` is true, this method will not change the animation.
   *
   * @param animationName - The name of the animation to play (e.g., 'attack', 'skill', 'walk')
   * @param nbTimes - Number of times to repeat the animation (default: Infinity for continuous)
   */
  setGraphicAnimation(animationName: string, nbTimes: number): void;
  setGraphicAnimation(animationName: string): void;
  /**
   * Set the current animation of the player's sprite with a temporary graphic change
   *
   * This method changes the animation state of the player's current sprite and temporarily
   * changes the player's graphic (sprite sheet) during the animation. The graphic is
   * automatically reset when the animation finishes.
   *
   * When `nbTimes` is set to a finite number, the animation will play that many times
   * before returning to the previous animation state and graphic.
   *
   * If `animationFixed` is true, this method will not change the animation.
   *
   * @param animationName - The name of the animation to play (e.g., 'attack', 'skill', 'walk')
   * @param graphic - The graphic(s) to temporarily use during the animation
   * @param nbTimes - Number of times to repeat the animation (default: Infinity for continuous)
   */
  setGraphicAnimation(animationName: string, graphic: string | string[], nbTimes: number): void;
  setGraphicAnimation(animationName: string, graphic: string | string[]): void;
  setGraphicAnimation(animationName: string, graphicOrNbTimes?: string | string[] | number, nbTimes: number = 1): void {
    // Don't change animation if it's locked
    if (this.animationFixed) {
      return;
    }

    let graphic: string | string[] | undefined;
    let finalNbTimes: number = Infinity;

    // Handle overloads
    if (typeof graphicOrNbTimes === 'number') {
      // setGraphicAnimation(animationName, nbTimes)
      finalNbTimes = graphicOrNbTimes;
    } else if (graphicOrNbTimes !== undefined) {
      // setGraphicAnimation(animationName, graphic, nbTimes)
      graphic = graphicOrNbTimes;
      finalNbTimes = nbTimes ?? Infinity;
    } else {
      // setGraphicAnimation(animationName) - nbTimes remains Infinity
      finalNbTimes = Infinity;
    }

    const map = this.getCurrentMap();
    if (!map) return;

    if (finalNbTimes === Infinity) {
      if (graphic) this.setGraphic(graphic);
      this.animationName.set(animationName);
    }
    else {
      map.$broadcast({
        type: "setAnimation",
        value: {
          animationName,
          graphic,
          nbTimes: finalNbTimes,
          object: this.id,
          restoreAnimationName: this.animationName(),
          restoreGraphics: [...this.graphics()],
        },
      });
    }
  }


  /**
   * Run the change detection cycle. Normally, as soon as a hook is called in a class, the cycle is started. But you can start it manually
   * The method calls the `onChanges` method on events and synchronizes all map data with the client.

  * @title Run Sync Changes
  * @method player.syncChanges()
  * @returns {void}
  * @memberof Player
  */
  syncChanges() {
    if (this._syncChangesDepth > 0) {
      return;
    }
    this._syncChangesDepth += 1;
    try {
      this._eventChanges();
      if (shouldAutoSave(this, { reason: "auto", source: "syncChanges" })) {
        void this.save("auto", {}, { reason: "auto", source: "syncChanges" });
      }
    }
    finally {
      this._syncChangesDepth -= 1;
    }
  }

  databaseById<T = unknown>(id: string): T | undefined {
    // Use this.map directly to support both RpgMap and LobbyRoom
    const map = this.map as any;
    if (!map || !map.database) return;
    const data = map.database()[id];
    if (!data)
      throw new Error(
        `The ID=${id} data is not found in the database. Add the data in the property "database"`
      );
    return data as T;
  }

  private _eventChanges() {
    const map = this.getCurrentMap();
    if (!map) return;
    const { events } = map;
    const visibleMapEvents = Object.values(events?.() ?? {}).filter((event: any) =>
      map.isEventVisibleForPlayer?.(event, this) ?? true
    );
    const arrayEvents: any[] = [
      ...Object.values(this.events()),
      ...visibleMapEvents,
    ];
    for (let event of arrayEvents) {
      if (event.onChanges) event.onChanges(this);
    }
  }

  /**
   * Attach a zone shape to this player using the physic zone system
   * 
   * This method creates a zone attached to the player's entity in the physics engine.
   * The zone can be circular or cone-shaped and will detect other entities (players/events)
   * entering or exiting the zone.
   * 
   * @param id - Optional zone identifier. If not provided, a unique ID will be generated
   * @param options - Zone configuration options
   * 
   * @example
   * ```ts
   * // Create a circular detection zone
   * player.attachShape("vision", {
   *   radius: 150,
   *   angle: 360,
   * });
   * 
   * // Create a cone-shaped vision zone
   * player.attachShape("vision", {
   *   radius: 200,
   *   angle: 120,
   *   direction: Direction.Right,
   *   limitedByWalls: true,
   * });
   * 
   * // Create a zone with width/height (radius calculated automatically)
   * player.attachShape({
   *   width: 100,
   *   height: 100,
   *   positioning: "center",
   * });
   * ```
   */
  attachShape(idOrOptions: string | AttachShapeOptions, options?: AttachShapeOptions): RpgShape | undefined {
    const map = this.getCurrentMap();
    if (!map) return undefined;

    // Handle overloaded signature: attachShape(options) or attachShape(id, options)
    let zoneId: string;
    let shapeOptions: AttachShapeOptions;

    if (typeof idOrOptions === 'string') {
      zoneId = idOrOptions;
      if (!options) {
        console.warn('attachShape: options must be provided when id is specified');
        return undefined;
      }
      shapeOptions = options;
    } else {
      zoneId = `zone-${this.id}-${Date.now()}`;
      shapeOptions = idOrOptions;
    }

    // Get player entity from physic engine
    const playerEntity = map.physic.getEntityByUUID(this.id);
    if (!playerEntity) {
      console.warn(`Player entity not found in physic engine for player ${this.id}`);
      return undefined;
    }

    // Calculate radius from width/height if not provided
    let radius: number;
    if (shapeOptions.radius !== undefined) {
      radius = shapeOptions.radius;
    } else if (shapeOptions.width && shapeOptions.height) {
      // Use the larger dimension as radius, or calculate from area
      radius = Math.max(shapeOptions.width, shapeOptions.height) / 2;
    } else {
      console.warn('attachShape: radius or width/height must be provided');
      return undefined;
    }

    // Calculate offset based on positioning
    let offset: Vector2 = new Vector2(0, 0);
    const positioning: ShapePositioning = shapeOptions.positioning || "default";
    if (shapeOptions.positioning) {
      const playerWidth = playerEntity.width || playerEntity.radius * 2 || 32;
      const playerHeight = playerEntity.height || playerEntity.radius * 2 || 32;

      switch (shapeOptions.positioning) {
        case 'top':
          offset = new Vector2(0, -playerHeight / 2);
          break;
        case 'bottom':
          offset = new Vector2(0, playerHeight / 2);
          break;
        case 'left':
          offset = new Vector2(-playerWidth / 2, 0);
          break;
        case 'right':
          offset = new Vector2(playerWidth / 2, 0);
          break;
        case 'center':
        default:
          offset = new Vector2(0, 0);
          break;
      }
    }

    // Get zone manager and create attached zone
    const zoneManager = map.physic.getZoneManager();

    // Convert direction from Direction enum to string if needed
    // Direction enum values are already strings ("up", "down", "left", "right")
    let direction: 'up' | 'down' | 'left' | 'right' = 'down';
    if (shapeOptions.direction !== undefined) {
      if (typeof shapeOptions.direction === 'string') {
        direction = shapeOptions.direction as 'up' | 'down' | 'left' | 'right';
      } else {
        // Direction enum value is already a string, just cast it
        direction = String(shapeOptions.direction) as 'up' | 'down' | 'left' | 'right';
      }
    }

    // Create zone with metadata for name and properties
    const metadata: Record<string, any> = {};
    if (shapeOptions.name) {
      metadata.name = shapeOptions.name;
    }
    if (shapeOptions.properties) {
      metadata.properties = shapeOptions.properties;
    }

    // Get initial position
    const initialX = playerEntity.position.x + offset.x;
    const initialY = playerEntity.position.y + offset.y;

    const physicZoneId = zoneManager.createAttachedZone(
      playerEntity,
      {
        radius,
        angle: shapeOptions.angle ?? 360,
        direction,
        limitedByWalls: shapeOptions.limitedByWalls ?? false,
        offset,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      },
      {
        onEnter: (entities: Entity[]) => {
          entities.forEach((entity) => {
            const event = map.getEvent<RpgEvent>(entity.uuid);
            const player = map.getPlayer(entity.uuid);

            if (event && (!map.isEventVisibleForPlayer || map.isEventVisibleForPlayer(event, this))) {
              event.execMethod("onInShape", [shape, this]);
              // Track that this event is in the shape
              if ((event as any)._inShapes) {
                (event as any)._inShapes.add(shape);
              }
            }
            if (player) {
              this.execMethod("onDetectInShape", [player, shape]);
              // Track that this player is in the shape
              if (player._inShapes) {
                player._inShapes.add(shape);
              }
            }
          });
        },
        onExit: (entities: Entity[]) => {
          entities.forEach((entity) => {
            const event = map.getEvent<RpgEvent>(entity.uuid);
            const player = map.getPlayer(entity.uuid);

            if (event && (!map.isEventVisibleForPlayer || map.isEventVisibleForPlayer(event, this))) {
              event.execMethod("onOutShape", [shape, this]);
              // Remove from tracking
              if ((event as any)._inShapes) {
                (event as any)._inShapes.delete(shape);
              }
            }
            if (player) {
              this.execMethod("onDetectOutShape", [player, shape]);
              // Remove from tracking
              if (player._inShapes) {
                player._inShapes.delete(shape);
              }
            }
          });
        },
      }
    );

    // Create RpgShape instance
    const shape = new RpgShape({
      name: shapeOptions.name || zoneId,
      positioning,
      width: shapeOptions.width || radius * 2,
      height: shapeOptions.height || radius * 2,
      x: initialX,
      y: initialY,
      properties: shapeOptions.properties || {},
      playerOwner: this,
      physicZoneId: physicZoneId,
      map: map,
    });

    // Store mapping from zoneId to physicZoneId for future reference
    (this as any)._zoneIdMap = (this as any)._zoneIdMap || new Map();
    (this as any)._zoneIdMap.set(zoneId, physicZoneId);

    // Store the shape
    this._attachedShapes.set(zoneId, shape);

    // Update shape position when player moves
    const updateShapePosition = () => {
      const currentEntity = map.physic.getEntityByUUID(this.id);
      if (currentEntity) {
        const zoneInfo = zoneManager.getZone(physicZoneId);
        if (zoneInfo) {
          (shape as unknown as { _updatePosition(x: number, y: number): void })._updatePosition(zoneInfo.position.x, zoneInfo.position.y);
        }
      }
    };

    // Listen to position changes to update shape position
    playerEntity.onPositionChange(() => {
      updateShapePosition();
    });

    return shape;
  }

  /**
   * Get all shapes attached to this player
   * 
   * Returns all shapes that were created using `attachShape()` on this player.
   * 
   * @returns Array of RpgShape instances attached to this player
   * 
   * @example
   * ```ts
   * player.attachShape("vision", { radius: 150 });
   * player.attachShape("detection", { radius: 100 });
   * 
   * const shapes = player.getShapes();
   * console.log(shapes.length); // 2
   * ```
   */
  getShapes(): RpgShape[] {
    return Array.from(this._attachedShapes.values());
  }

  /**
   * Get all shapes where this player is currently located
   * 
   * Returns all shapes (from any player/event) where this player is currently inside.
   * This is updated automatically when the player enters or exits shapes.
   * 
   * @returns Array of RpgShape instances where this player is located
   * 
   * @example
   * ```ts
   * // Another player has a detection zone
   * otherPlayer.attachShape("detection", { radius: 200 });
   * 
   * // Check if this player is in any shape
   * const inShapes = player.getInShapes();
   * if (inShapes.length > 0) {
   *   console.log("Player is being detected!");
   * }
   * ```
   */
  getInShapes(): RpgShape[] {
    return Array.from(this._inShapes);
  }

  /**
   * Show a temporary component animation on this player
   * 
   * This method broadcasts a component animation to all clients, allowing
   * temporary visual effects like hit indicators, spell effects, or status animations
   * to be displayed on the player.
   * 
   * @param id - The ID of the component animation to display
   * @param params - Parameters to pass to the component animation
   * 
   * @example
   * ```ts
   * // Show a hit animation with damage text
   * player.showComponentAnimation("hit", {
   *   text: "150",
   *   color: "red"
   * });
   * 
   * // Show a heal animation
   * player.showComponentAnimation("heal", {
   *   amount: 50
   * });
   * ```
   */
  showComponentAnimation<TParams extends Record<string, unknown> = Record<string, unknown>>(
    id: string,
    params: TParams = {} as TParams
  ): void {
    const map = this.getCurrentMap();
    if (!map) return;
    map.$broadcast({
      type: "showComponentAnimation",
      value: {
        id,
        params,
        object: this.id,
      },
    });
  }

  showHit(text: string) {
    this.showComponentAnimation("hit", {
      text,
      direction: this.direction(),
    });
  }

  /**
   * Play a sound on the client side for this player only
   * 
   * This method emits an event to play a sound only for this specific player.
   * The sound must be defined on the client side (in the client module configuration).
   * 
   * ## Design
   * 
   * The sound is sent only to this player's client connection, making it ideal
   * for personal feedback sounds like UI interactions, notifications, or personal
   * achievements. For map-wide sounds that all players should hear, use `map.playSound()` instead.
   * 
   * @param soundId - Sound identifier, defined on the client side
   * @param options - Optional sound configuration, or `true` to play the sound for every player on the map (v4 compatibility)
   * @param options.volume - Volume level (0.0 to 1.0, default: 1.0)
   * @param options.loop - Whether the sound should loop (default: false)
   * 
   * @example
   * ```ts
   * // Play a sound for this player only (default behavior)
   * player.playSound("item-pickup");
   * 
   * // Play a sound with volume and loop
   * player.playSound("background-music", {
   *   volume: 0.5,
   *   loop: true
   * });
   * 
   * // Play a notification sound at low volume
   * player.playSound("notification", { volume: 0.3 });
   * ```
   */
  playSound(soundId: string, options?: { volume?: number; loop?: boolean } | boolean): void {
    const map = this.getCurrentMap();
    if (!map) return;

    if (options === true) {
      map.playSound(soundId);
      return;
    }

    const data: any = {
      soundId,
    };

    if (options && typeof options === "object") {
      if (options.volume !== undefined) {
        data.volume = Math.max(0, Math.min(1, options.volume));
      }
      if (options.loop !== undefined) {
        data.loop = options.loop;
      }
    }

    // Send only to this player
    this.emit("playSound", data);
  }

  /**
   * Stop a sound that is currently playing for this player
   * 
   * This method stops a sound that was previously started with `playSound()`.
   * The sound must be defined on the client side.
   * 
   * @param soundId - Sound identifier to stop
   * 
   * @example
   * ```ts
   * // Start a looping background music
   * player.playSound("background-music", { loop: true });
   * 
   * // Later, stop it
   * player.stopSound("background-music");
   * ```
   */
  stopSound(soundId: string): void {
    const map = this.getCurrentMap();
    if (!map) return;

    const data = {
      soundId,
    };

    // Send stop command only to this player
    this.emit("stopSound", data);
  }

  /**
   * Stop all currently playing sounds for this player
   * 
   * This method stops all sounds that are currently playing for the player.
   * Useful when changing maps to prevent sound overlap.
   * 
   * @example
   * ```ts
   * // Stop all sounds before changing map
   * player.stopAllSounds();
   * await player.changeMap("new-map");
   * ```
   */
  stopAllSounds(): void {
    const map = this.getCurrentMap();
    if (!map) return;

    // Send stop all command only to this player
    this.emit("stopAllSounds", {});
  }

  /**
   * Make the camera follow another player or event
   * 
   * This method sends an instruction to the client to fix the viewport on another sprite.
   * The camera will follow the specified player or event, with optional smooth animation.
   * 
   * ## Design
   * 
   * The camera follow instruction is sent only to this player's client connection.
   * This allows each player to have their own camera target, useful for cutscenes,
   * following NPCs, or focusing on specific events.
   * 
   * @param otherPlayer - The player or event that the camera should follow
   * @param options - Camera follow options
   * @param options.smoothMove - Enable smooth animation. Can be a boolean (default: true) or an object with animation parameters
   * @param options.smoothMove.time - Time duration for the animation in milliseconds (optional)
   * @param options.smoothMove.ease - Easing function name. Visit https://easings.net for available functions (optional)
   * @param options.smoothMove.speed - Continuous follow speed after the transition (optional)
   * @param options.smoothMove.acceleration - Continuous follow acceleration after the transition (optional)
   * @param options.smoothMove.radius - Center radius where the target can move without moving the viewport (optional)
   * 
   * @example
   * ```ts
   * // Follow another player with default smooth animation
   * player.cameraFollow(otherPlayer, { smoothMove: true });
   * 
   * // Follow an event with custom smooth animation
   * player.cameraFollow(npcEvent, {
   *   smoothMove: {
   *     time: 1000,
   *     ease: "easeInOutQuad"
   *   }
   * });
   * 
   * // Follow without animation (instant)
   * player.cameraFollow(targetPlayer, { smoothMove: false });
   * ```
   */
  cameraFollow(
    otherPlayer: RpgPlayer | RpgEvent,
    options?: {
      smoothMove?: boolean | {
        enabled?: boolean;
        time?: number;
        ease?: CameraFollowEase;
        speed?: number;
        acceleration?: number | null;
        radius?: number | null;
      };
    }
  ): void {
    const map = this.getCurrentMap();
    if (!map) return;

    const data: any = {
      targetId: otherPlayer.id,
    };

    // Handle smoothMove option
    if (options?.smoothMove !== undefined) {
      if (typeof options.smoothMove === "boolean") {
        data.smoothMove = options.smoothMove;
      } else {
        // smoothMove is an object
        data.smoothMove = {
          enabled: true,
          ...options.smoothMove,
        };
      }
    } else {
      // Default to true if not specified
      data.smoothMove = true;
    }

    // Send camera follow instruction only to this player
    this.emit("cameraFollow", data);
  }


  /**
   * Trigger a flash animation on this player
   * 
   * This method sends a flash animation event to the client, creating a visual
   * feedback effect on the player's sprite. The flash can be configured with
   * various options including type (alpha, tint, or both), duration, cycles, and color.
   * 
   * ## Design
   * 
   * The flash is sent as a broadcast event to all clients viewing this player.
   * This is useful for visual feedback when the player takes damage, receives
   * a buff, or when an important event occurs.
   * 
   * @param options - Flash configuration options
   * @param options.type - Type of flash effect: 'alpha' (opacity), 'tint' (color), or 'both' (default: 'alpha')
   * @param options.duration - Duration of the flash animation in milliseconds (default: 300)
   * @param options.cycles - Number of flash cycles (flash on/off) (default: 1)
   * @param options.alpha - Alpha value when flashing, from 0 to 1 (default: 0.3)
   * @param options.tint - Tint color when flashing as hex value or color name (default: 0xffffff - white)
   * 
   * @example
   * ```ts
   * // Simple flash with default settings (alpha flash)
   * player.flash();
   * 
   * // Flash with red tint when taking damage
   * player.flash({ type: 'tint', tint: 0xff0000 });
   * 
   * // Flash with both alpha and tint for dramatic effect
   * player.flash({ 
   *   type: 'both', 
   *   alpha: 0.5, 
   *   tint: 0xff0000,
   *   duration: 200,
   *   cycles: 2
   * });
   * 
   * // Quick damage flash
   * player.flash({ 
   *   type: 'tint', 
   *   tint: 'red', 
   *   duration: 150,
   *   cycles: 1
   * });
   * ```
   */
  flash(options?: {
    type?: 'alpha' | 'tint' | 'both';
    duration?: number;
    cycles?: number;
    alpha?: number;
    tint?: number | string;
  }): void {
    const map = this.getCurrentMap();
    if (!map) return;

    const flashOptions = {
      type: options?.type || 'alpha',
      duration: options?.duration ?? 300,
      cycles: options?.cycles ?? 1,
      alpha: options?.alpha ?? 0.3,
      tint: options?.tint ?? 0xffffff,
    };

    map.$broadcast({
      type: "flash",
      value: {
        object: this.id,
        ...flashOptions,
      },
    });
  }

  /**
   * Set the hitbox of the player for collision detection
   * 
   * This method defines the hitbox used for collision detection in the physics engine.
   * The hitbox can be smaller or larger than the visual representation of the player,
   * allowing for precise collision detection.
   * 
   * ## Design
   * 
   * The hitbox is used by the physics engine to detect collisions with other entities,
   * static obstacles, and shapes. Changing the hitbox will immediately update the
   * collision detection without affecting the visual appearance of the player.
   * 
   * @param width - Width of the hitbox in pixels
   * @param height - Height of the hitbox in pixels
   * 
   * @example
   * ```ts
   * // Set a 20x20 hitbox for precise collision detection
   * player.setHitbox(20, 20);
   * 
   * // Set a larger hitbox for easier collision detection
   * player.setHitbox(40, 40);
   * ```
   */
  setHitbox(width: number, height: number): void {
    // Validate inputs
    if (typeof width !== 'number' || width <= 0) {
      throw new Error('setHitbox: width must be a positive number');
    }
    if (typeof height !== 'number' || height <= 0) {
      throw new Error('setHitbox: height must be a positive number');
    }

    // Update hitbox signal
    this.hitbox.set({
      w: width,
      h: height,
    });

    // Update physics entity if map exists
    const map = this.getCurrentMap();
    if (map && map.physic) {
      const topLeftX = this.x();
      const topLeftY = this.y();
      map.updateHitbox(this.id, topLeftX, topLeftY, width, height);
    }
  }

  /**
   * Set the physical mass for this player or event.
   *
   * A mass of `0` or `Infinity` makes the physics body immovable.
   *
   * @param mass - New mass value
   */
  setMass(mass: number): void {
    if (typeof mass !== 'number' || Number.isNaN(mass) || mass < 0) {
      throw new Error('setMass: mass must be a non-negative number');
    }

    this._mass.set(mass);

    const map = this.getCurrentMap() as any;
    const body = map?.getBody?.(this.id);
    if (!body) {
      return;
    }

    body.setMass(mass);
    map?.physic?.updateEntity?.(body);
  }

  /**
   * Set the sync schema for the map
   * @param schema - The schema to set
   */
  setSync(schema: RpgSyncSchema): void {
    for (let key in schema) {
      const options = schema[key] && typeof schema[key] === 'object' && !Array.isArray(schema[key])
        ? schema[key] as { $default?: unknown; $syncWithClient?: boolean; $permanent?: boolean }
        : {};
      const currentProperty = this[key];
      if (
        typeof currentProperty === 'function'
        && typeof (currentProperty as { set?: unknown }).set === 'function'
      ) {
        continue;
      }
      const initialValue = currentProperty !== undefined
        ? currentProperty
        : options.$default ?? null;
      this[key] = type(signal<unknown>(initialValue) as never, key, {
        syncToClient: options.$syncWithClient,
        persist: options.$permanent,
      }, this as never)
    }
  }

  isEvent(): boolean {
    return false;
  }
}

export class RpgEvent extends RpgPlayer {

  constructor() {
    super();
    this.initializeDefaultStats()
  }

  override async execMethod<TResult = unknown>(methodName: string, methodData: unknown[] = [], instance: object = this): Promise<TResult | undefined> {
    await lastValueFrom(this.hooks
      .callHooks(`server-event-${methodName}`, instance, ...methodData));
    const callback = (instance as Record<string, unknown>)[methodName];
    if (typeof callback !== 'function') {
      return;
    }
    return callback.apply(instance, methodData) as TResult;
  }

  /**
   * Remove this event from the map
   * 
   * Stops all movements before removing to prevent "unable to resolve entity" errors
   * from the MovementManager when the entity is destroyed while moving.
   *
   * Pass options to keep the sprite visible briefly on clients while
   * `sprite.onBeforeRemove` runs a visual transition. Gameplay collision is
   * removed immediately; the event is deleted from the map after `timeoutMs`.
   *
   * The server only sends the removal context. The client decides how to render
   * `transition` in `sprite.onBeforeRemove`, so the payload can describe an
   * animation, sound, particle effect, GUI transition, or project-specific data.
   *
   * @example
   * ```ts
   * event.remove({
   *   reason: 'defeated',
   *   transition: {
   *     type: 'enemy-death',
   *     animation: 'die',
   *     graphic: 'slime_die',
   *     sound: 'slime-death',
   *     duration: 700
   *   },
   *   timeoutMs: 700
   * })
   * ```
   */
  remove(options?: {
    reason?: string;
    data?: unknown;
    transition?: {
      animation?: string;
      graphic?: string | string[];
      duration?: number;
      effect?: string;
    };
    timeoutMs?: number;
  }) {
    const map = this.getCurrentMap();
    if (!map) return;
    
    // Stop all movements before removing to prevent MovementManager errors
    this.stopMoveTo();

    const timeoutMs = Math.max(0, options?.timeoutMs ?? options?.transition?.duration ?? 0);
    if (!options || timeoutMs <= 0) {
      map.removeEvent(this.id);
      return;
    }

    this._removeTransition.set(JSON.stringify({
      active: true,
      reason: options.reason,
      data: options.data,
      transition: options.transition,
      timeoutMs,
    }));
    (map as any).removeHitbox?.(this.id, this, "npc");
    setTimeout(() => {
      map.removeEvent(this.id);
    }, timeoutMs);
  }

  override isEvent(): boolean {
    return true;
  }
}


/**
 * Interface extension for RpgPlayer
 * 
 * Extends the RpgPlayer class with additional interfaces from mixins.
 * This provides proper TypeScript support for all mixin methods and properties.
 */
export interface RpgPlayer extends
  IVariableManager,
  IMoveManager,
  IGoldManager,
  IComponentManager,
  IGuiManager,
  IItemManager,
  IEffectManager,
  IParameterManager,
  IElementManager,
  ISkillManager,
  IBattleManager,
  IClassManager,
  IStateManager,
  IHotbarManager { }
