import { generateShortUUID, users } from "@signe/sync";
import { effect, signal } from "@signe/reactive";
import { Direction, RpgCommonPlayer } from "../Player";
import {
  PhysicsEngine,
  Vector2,
  Entity,
  EntityState,
  AABB,
  Dash,
  assignPolygonCollider,
  createCollider,
} from "@rpgjs/physic";
import { combineLatest, Observable, share, Subject, Subscription } from "rxjs";
import { MovementManager } from "../movement";
import { WorldMapsManager, type RpgWorldMaps } from "./WorldMaps";
import { queryArea as queryMapArea } from "./area/query";
import type { MapAreaHit, MapAreaQueryOptions } from "./area/types";
import type { MapChunkHitbox } from "../map-streaming";
import type { RpgReadableSignal, RpgWritableSignal } from "../foundation";

const gameplaySignal = signal as <T>(value: T) => RpgWritableSignal<T>;

export type PhysicsEntityKind = "hero" | "npc" | "generic";

export interface MapPhysicsInitContext {
  mapData: any;
}

export interface MapPhysicsEntityContext {
  owner: any;
  entity: Entity;
  kind: PhysicsEntityKind;
}

interface ZoneOptions {
  x?: number;
  y?: number;
  radius: number;
  angle?: number;
  direction?: "up" | "down" | "left" | "right";
  linkedTo?: string;
  limitedByWalls?: boolean;
}

export interface MapHitboxQueryRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type MapHitboxQueryKind = "players" | "events";

export interface MapHitboxQueryOptions {
  excludeIds?: string[];
  kinds?: MapHitboxQueryKind[];
}

type FixedTickHooks = {
  beforeStep?: () => void;
  afterStep?: (tick: number) => void;
};

type AsyncFixedTickHooks = {
  beforeStep?: () => void | Promise<void>;
  afterStep?: (tick: number) => void | Promise<void>;
};

const COLLISION_PROXIMITY_MARGIN = 1;
const DEFAULT_INTERACTION_RANGE = 16;
const INTERACTION_SIDE_PADDING = 4;
const DEFAULT_MAX_FIXED_STEPS_PER_TICK = 5;
const DEFAULT_MAX_TICK_DELTA_MS = 250;

export abstract class RpgCommonMap<T extends RpgCommonPlayer> {
  abstract players: RpgReadableSignal<Record<string, T>>;
  abstract events: RpgReadableSignal<Record<string, any>>;

  data = gameplaySignal<any | null>(null);
  physic = new PhysicsEngine({
    timeStep: 1 / 60,
    gravity: new Vector2(0, 0),
    enableSleep: false,
  });
  moveManager = new MovementManager(() => this.physic);

  private speedScalar = 50; // Default speed scalar for movement

  // World Maps properties
  tileWidth: number = 32;
  tileHeight: number = 32;
  worldMapsManager?: WorldMapsManager;

  // Synchronization throttling properties
  throttleSync?: number;
  throttleStorage?: number;
  sessionExpiryTime?: number;

  tickSubscription?: Subscription | null;
  playersSubscription?: Subscription | null;
  eventsSubscription?: Subscription | null;
  private physicsAccumulatorMs = 0;
  private physicsSyncDepth = 0;
  private streamedStaticHitboxIds = new Map<string, Set<string>>();
  protected maxFixedStepsPerTick = DEFAULT_MAX_FIXED_STEPS_PER_TICK;
  protected maxTickDeltaMs = DEFAULT_MAX_TICK_DELTA_MS;

  /**
   * Whether to automatically subscribe to tick$ for physics updates
   * Set to false in test environments for manual control with nextTick()
   */
  protected autoTickEnabled: boolean = true;

  get isStandalone() {
    return typeof window !== 'undefined'
  }
  

  /**
   * Get the width of the map in pixels
   * 
   * @returns The width of the map in pixels, or 0 if not loaded
   * 
   * @example
   * ```ts
   * const width = map.widthPx;
   * console.log(`Map width: ${width}px`);
   * ```
   */
  get widthPx(): number {
    return this.data()?.width ?? 0
  }

  /**
   * Get the height of the map in pixels
   * 
   * @returns The height of the map in pixels, or 0 if not loaded
   * 
   * @example
   * ```ts
   * const height = map.heightPx;
   * console.log(`Map height: ${height}px`);
   * ```
   */
  get heightPx(): number {
    return this.data()?.height ?? 0
  }

  /**
   * Get the unique identifier of the map
   * 
   * @returns The map ID, or empty string if not loaded
   * 
   * @example
   * ```ts
   * const mapId = map.id;
   * console.log(`Current map: ${mapId}`);
   * ```
   */
  get id(): string {
    return this.data()?.id ?? ''
  }

    /**
   * Get the X position of this map in the world coordinate system
   * 
   * This is used when maps are part of a larger world map. The world position
   * indicates where this map is located relative to other maps.
   * 
   * @returns The X position in world coordinates, or 0 if not in a world
   * 
   * @example
   * ```ts
   * const worldX = map.worldX;
   * console.log(`Map is at world position (${worldX}, ${map.worldY})`);
   * ```
   */
    get worldX(): number {
      const worldMaps = this.getWorldMapsManager?.();
      if (!worldMaps) return 0;
      // Extract real map ID (remove "map-" prefix if present)
      const mapId = this.id.startsWith('map-') ? this.id.slice(4) : this.id;
      return worldMaps.getMapInfo(mapId)?.worldX ?? 0
    }
    
    /**
     * Get the Y position of this map in the world coordinate system
     * 
     * This is used when maps are part of a larger world map. The world position
     * indicates where this map is located relative to other maps.
     * 
     * @returns The Y position in world coordinates, or 0 if not in a world
     * 
     * @example
     * ```ts
     * const worldY = map.worldY;
     * console.log(`Map is at world position (${map.worldX}, ${worldY})`);
     * ```
     */
    get worldY(): number {
      const worldMaps = this.getWorldMapsManager?.();
      if (!worldMaps) return 0;
      // Extract real map ID (remove "map-" prefix if present)
      const mapId = this.id.startsWith('map-') ? this.id.slice(4) : this.id;
      return worldMaps.getMapInfo(mapId)?.worldY ?? 0
    }

  /**
   * Observable representing the game loop tick
   * 
   * This observable emits elapsed time and the current epoch timestamp at roughly
   * 60fps. It is shared using the share() operator, meaning that all subscribers
   * receive events from a single timer rather than creating multiple timers.
   * 
   * ## Physics Loop Architecture
   * 
   * The physics simulation is centralized in this game loop:
   * 
   * 1. **Input Processing** (`processInput`): Only updates entity velocities, does NOT step physics
   * 2. **Game Loop** (`tick$` -> `runFixedTicks`): Executes physics simulation with fixed timestep
   * 3. **Fixed Timestep Pattern**: Accumulator-based approach ensures deterministic physics
   * 
   * ```
   * Input Events ─────────────────────────────────────────────────────────────►
   *     │                                                                       
   *     ▼ (update velocity only)                                               
   * ┌─────────────────────────────────────────────────────────────────────────┐
   * │                        Game Loop (tick$)                                │
   * │  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐       │
   * │  │ updateMovements │ → │  stepOneTick    │ → │ postTickUpdates │       │
   * │  │ (apply velocity)│   │ (physics step)  │   │ (zones, sync)   │       │
   * │  └─────────────────┘   └─────────────────┘   └─────────────────┘       │
   * └─────────────────────────────────────────────────────────────────────────┘
   * ```
   * 
   * @example
   * ```ts
   * // Subscribe to the game tick for custom updates
   * map.tick$.subscribe(({ delta, timestamp }) => {
   *   // Custom game logic runs alongside physics
   *   this.updateCustomEntities(delta);
   * });
   * ```
   */
  tick$ = new Observable<{ delta: number, timestamp: number }>(observer => {
    if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
      let lastTimestamp = this.getTickTime();
      const interval = setInterval(() => {
        const now = this.getTickTime();
        observer.next({
          delta: this.normalizeTickDelta(now - lastTimestamp),
          timestamp: Date.now()
        });
        lastTimestamp = now;
      }, 16);
      return () => clearInterval(interval);
    }

    let frameId = 0;
    let lastTimestamp = 0;
    const frame = (timestamp: number) => {
      const delta = lastTimestamp === 0
        ? 16
        : Math.max(1, Math.min(100, timestamp - lastTimestamp));
      lastTimestamp = timestamp;
      observer.next({
        delta,
        timestamp: Date.now()
      });
      frameId = window.requestAnimationFrame(frame);
    };

    frameId = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(frameId);
  }).pipe(
    share()
  );

  private getTickTime(): number {
    const performanceNow = globalThis.performance?.now?.();
    return typeof performanceNow === "number" && Number.isFinite(performanceNow)
      ? performanceNow
      : Date.now();
  }

  private normalizeTickDelta(deltaMs: number): number {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
      return 16;
    }
    return Math.max(1, Math.min(this.maxTickDeltaMs, deltaMs));
  }

  private getMaxFixedStepsPerTick(): number {
    const configured = Math.floor(Number(this.maxFixedStepsPerTick));
    return Number.isFinite(configured) && configured > 0
      ? configured
      : DEFAULT_MAX_FIXED_STEPS_PER_TICK;
  }

  /**
   * Clear all physics content and reset to initial state
   * 
   * This method completely clears the physics system by:
   * - Removing all hitboxes (static and movable)
   * - Removing all zones
   * - Clearing all collision data and events
   * - Clearing all movement events and sliding data
   * - Unsubscribing from the tick subscription
   * - Resetting the physics engine to a clean state
   * 
   * Use this method when you need to completely reset the map's physics
   * system, such as when changing maps or restarting a level.
   * 
   * @example
   * ```ts
   * // Clear all physics when changing maps
   * map.clearPhysic();
   * 
   * // Then reload physics for the new map
   * map.loadPhysic();
   * ```
   */
  clearPhysic() {
    // Unsubscribe from tick to stop physics updates
    if (this.tickSubscription) {
      this.tickSubscription.unsubscribe();
      this.tickSubscription = null;
    }

    if (this.playersSubscription) {
      this.playersSubscription.unsubscribe();
      this.playersSubscription = null;
    }

    if (this.eventsSubscription) {
      this.eventsSubscription.unsubscribe();
      this.eventsSubscription = null;
    }

    // Clear all hitboxes and zones from physics system
    this.clearAll();
    this.streamedStaticHitboxIds.clear();

    // Reset movement manager
    this.moveManager.clearAll();
    this.emitPhysicsReset();

    this.physicsAccumulatorMs = 0;
  }

  /**
   * Clear all physics entities and internal state
   * @private
   */
  private clearAll(): void {
    // Remove all entities from physics engine
    const entities = this.physic.getEntities();
    for (const entity of entities) {
      const owner = (entity as any).owner;
      if (owner) {
        this.emitPhysicsEntityRemove({
          owner,
          entity,
          kind: this.resolvePhysicsEntityKind(owner, entity.uuid),
        });
      }
      this.unbindCharacterSignalSync(entity);
      this.physic.removeEntity(entity);
    }

    // Clear movement manager and zone manager
    this.physic.getMovementManager().clearAll();
    this.physic.getZoneManager().clear();
  }

  loadPhysic() {
    this.clearPhysic();

    const mapData = this.data?.();
    const mapWidth = typeof mapData?.width === "number" ? mapData.width : 0;
    const mapHeight = typeof mapData?.height === "number" ? mapData.height : 0;
    const hitboxes: Array<
      | { id?: string; x: number; y: number; width: number; height: number }
      | { id?: string; points: number[][] }
    > = Array.isArray(mapData?.hitboxes) ? mapData.hitboxes : [];

    if (mapWidth > 0 && mapHeight > 0) {
      const gap = 100;
      this.addStaticHitbox('map-width-left', -gap, 0, gap, mapHeight);
      this.addStaticHitbox('map-width-right', mapWidth, 0, gap, mapHeight);
      this.addStaticHitbox('map-height-top', 0, -gap, mapWidth, gap);
      this.addStaticHitbox('map-height-bottom', 0, mapHeight, mapWidth, gap);
    }

    for (let staticHitbox of hitboxes) {
      if ('points' in staticHitbox) {
        this.addStaticHitbox(staticHitbox.id ?? generateShortUUID(), staticHitbox.points);
      }
      else if ('x' in staticHitbox) {
        this.addStaticHitbox(staticHitbox.id ?? generateShortUUID(), staticHitbox.x, staticHitbox.y, staticHitbox.width, staticHitbox.height);
      }
    }

    this.emitPhysicsInit({ mapData });

    this.playersSubscription = (this.players as any).observable.subscribe(
      ({ value: player, type, key }: any) => {
        if (type === "remove") {
          this.removeHitbox(key, player, "hero");
          return;
        }

        if (type == 'reset') {
          if (!player) return;
          for (let id in player) {
            const _player = player[id]
            _player.id = _player.id ?? id;
            this.createCharacterHitbox(_player, "hero");
          }
          return;
        }

        if (!player) return;
        if (type === "add") {
          player.id = key;
          this.createCharacterHitbox(player, "hero");
        } else if (type === "update") {
          player.id = player.id ?? key;
          if (!this.getBody(key)) {
            this.createCharacterHitbox(player, "hero");
            return;
          }
          if (this.isPhysicsSyncingSignals) {
            return;
          }
          this.updateCharacterHitbox(player);
        }
      },
    );

    this.eventsSubscription = (this.events as any).observable.subscribe(({ value: event, type, key }) => {
      if (type === "add") {
        event.id = key;
        this.createCharacterHitbox(event, "npc", {
          mass: this.resolveCharacterMass(event, 100),
        });
      } else if (type === "remove") {
        // Clean up movement event subscriptions
        const eventObj = this.getObjectById(key);
        if (eventObj && typeof (eventObj as any)._movementUnsubscribe === 'function') {
          (eventObj as any)._movementUnsubscribe();
        }
        this.removeHitbox(key, event, "npc");
      } else if (type === "update") {
        event.id = event.id ?? key;
        if (event._removeTransition?.()) {
          this.removeHitbox(key, event, "npc");
          return;
        }
        if (!this.getBody(key)) {
          this.createCharacterHitbox(event, "npc", {
            mass: this.resolveCharacterMass(event, 100),
          });
          return;
        }
        this.updateCharacterHitbox(event);
      } else if (type === "reset") {
        for (const id in event) {
          const _event = event[id];
          if (!_event) continue;
          _event.id = _event.id ?? id;
          this.createCharacterHitbox(_event, "npc", {
            mass: this.resolveCharacterMass(_event, 100),
          });
        }
      }
    });

    // Hydrate physics world with already-loaded scene objects.
    // This covers cases where sync state is present before subscriptions are attached.
    const players = this.players();
    for (const id in players) {
      const player = players[id];
      if (!player) continue;
      player.id = player.id ?? id;
      this.createCharacterHitbox(player, "hero");
    }

    const events = this.events();
    for (const id in events) {
      const event = events[id];
      if (!event) continue;
      event.id = event.id ?? id;
      this.createCharacterHitbox(event, "npc", {
        mass: this.resolveCharacterMass(event, 100),
      });
    }

    // S'abonner au ticker automatique seulement si autoTickEnabled est true
    if (this.autoTickEnabled) {
      this.tickSubscription = this.tick$.subscribe(({ delta }) => {
        this.runFixedTicks(delta);
      });
    }
  }

  async movePlayer(player: T, direction: Direction) {
    // Calculate next position before movement
    const currentX = player.x();
    const currentY = player.y();
    const speed = player.speed;

    let nextX = currentX;
    let nextY = currentY;
    
    switch (direction) {
      case Direction.Left:
        nextX = currentX - speed;
        break;
      case Direction.Right:
        nextX = currentX + speed;
        break;
      case Direction.Up:
        nextY = currentY - speed;
        break;
      case Direction.Down:
        nextY = currentY + speed;
        break;
    }

    player.changeDirection(direction);

     // Check for automatic map change if the method exists
    if (typeof (player as any).autoChangeMap === 'function' && !player.isEvent()) {
      const mapChanged = await (player as any).autoChangeMap({ x: nextX, y: nextY }, direction);
      if (mapChanged) {
       this.stopMovement(player);
       return
      }
    }
    
    this.moveBody(player, direction);
  }

  /**
   * Check if an entity is currently moving
   * 
   * @param id - ID of the entity to check
   * @returns Boolean indicating if the entity is in motion
   * 
   * @example
   * ```ts
   * // Check if player is moving
   * if (map.isMoving('player1')) {
   *   // Player is in motion
   * }
   * ```
   */
  isMoving(id: string): boolean {
    return this.isEntityMoving(id);
  }

  getObjectById(id: string) {
    return this.players()[id] ?? this.events()[id];
  }

  /**
   * Execute physics simulation with fixed timestep
   * 
   * This method runs the physics engine using a fixed timestep accumulator pattern.
   * It ensures deterministic physics regardless of frame rate by:
   * 1. Accumulating delta time
   * 2. Running fixed-size physics steps until the accumulator is depleted
   * 3. Calling `updateMovements()` before each step to apply velocity changes
   * 4. Running post-tick updates (zones, callbacks) after each step
   * 
   * ## Architecture
   * 
   * The physics loop is centralized here and called from `tick$` subscription.
   * Input processing (`processInput`) only updates entity velocities - it does NOT
   * step the physics. This ensures:
   * - Consistent physics timing (60fps fixed timestep)
   * - No double-stepping when inputs are processed
   * - Proper accumulator-based interpolation support
   * 
   * @param deltaMs - Time elapsed since last call in milliseconds
   * @param hooks - Optional callbacks for before/after each physics step
   * @returns Number of physics ticks executed
   * 
   * @example
   * ```ts
   * // Called automatically by tick$ subscription
   * this.tickSubscription = this.tick$.subscribe(({ delta }) => {
   *   this.runFixedTicks(delta);
   * });
   * 
   * // Or manually with hooks for debugging
   * this.runFixedTicks(16, {
   *   beforeStep: () => console.log('Before physics step'),
   *   afterStep: (tick) => console.log(`Physics tick ${tick} completed`)
   * });
   * ```
   */
  protected runFixedTicks(deltaMs: number, hooks?: FixedTickHooks): number {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
      return 0;
    }

    const fixedStepMs = this.physic.getWorld().getTimeStep() * 1000;
    this.physicsAccumulatorMs += this.normalizeTickDelta(deltaMs);
    let executed = 0;
    const maxSteps = this.getMaxFixedStepsPerTick();

    while (this.physicsAccumulatorMs >= fixedStepMs && executed < maxSteps) {
      this.physicsAccumulatorMs -= fixedStepMs;
      hooks?.beforeStep?.();
      
      // Update movement strategies before advancing a full RPG physics frame.
      this.physic.updateMovements();

      const tick = this.physic.stepFrame();
      executed += 1;

      hooks?.afterStep?.(tick);
    }

    return executed;
  }

  protected async runFixedTicksAsync(deltaMs: number, hooks?: AsyncFixedTickHooks): Promise<number> {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
      return 0;
    }

    const fixedStepMs = this.physic.getWorld().getTimeStep() * 1000;
    this.physicsAccumulatorMs += this.normalizeTickDelta(deltaMs);
    let executed = 0;
    const maxSteps = this.getMaxFixedStepsPerTick();

    while (this.physicsAccumulatorMs >= fixedStepMs && executed < maxSteps) {
      this.physicsAccumulatorMs -= fixedStepMs;
      await hooks?.beforeStep?.();

      this.physic.updateMovements();

      const tick = this.physic.stepFrame();
      executed += 1;

      await hooks?.afterStep?.(tick);
    }

    return executed;
  }

  /**
   * Manually trigger a single game tick
   * 
   * This method allows you to manually advance the game by one tick (16ms at 60fps).
   * It's primarily useful for testing where you need precise control over when
   * physics updates occur, rather than relying on the automatic tick$ subscription.
   * 
   * ## Use Cases
   * 
   * - **Testing**: Control exactly when physics steps occur in unit tests
   * - **Manual control**: Step through game state manually for debugging
   * - **Deterministic testing**: Ensure consistent timing in test scenarios
   * 
   * ## Important
   * 
   * This method should NOT be used in production code alongside the automatic `tick$`
   * subscription, as it will cause double-stepping. Use either:
   * - Automatic ticks (via `loadPhysic()` which subscribes to `tick$`)
   * - Manual ticks (via `nextTick()` without `loadPhysic()` subscription)
   * 
   * @param deltaMs - Optional delta time in milliseconds (default: 16ms for 60fps)
   * @returns Number of physics ticks executed
   * 
   * @example
   * ```ts
   * // In tests: manually advance game by one tick
   * map.nextTick(); // Advances by 16ms (one frame at 60fps)
   * 
   * // With custom delta
   * map.nextTick(32); // Advances by 32ms (two frames at 60fps)
   * 
   * // In a test loop
   * for (let i = 0; i < 60; i++) {
   *   map.nextTick(); // Simulate 1 second of game time
   * }
   * ```
   */
  nextTick(deltaMs: number = 16): number {
    return this.runFixedTicks(deltaMs);
  }

  nextTickAsync(deltaMs: number = 16): Promise<number> {
    return this.runFixedTicksAsync(deltaMs);
  }

  /**
   * Force a single physics tick outside of the normal game loop
   * 
   * This method is primarily used for **client-side prediction** where the client
   * needs to immediately simulate physics in response to local input, rather than
   * waiting for the next game loop tick.
   * 
   * ## Use Cases
   * 
   * - **Client-side prediction**: Immediately simulate player movement for responsive feel
   * - **Testing**: Force a physics step in unit tests
   * - **Special effects**: Immediate physics response for specific game events
   * 
   * ## Important
   * 
   * This method should NOT be used on the server for normal input processing.
   * Server-side physics is handled by `runFixedTicks` in the main game loop to ensure
   * deterministic simulation.
   * 
   * @param hooks - Optional callbacks for before/after the physics step
   * @returns The physics tick number
   * 
   * @example
   * ```ts
   * // Client-side: immediately simulate predicted movement
   * class RpgClientMap extends RpgCommonMap {
   *   stepPredictionTick(): void {
   *     this.forceSingleTick();
   *   }
   * }
   * ```
   */
  protected forceSingleTick(hooks?: { beforeStep?: () => void; afterStep?: (tick: number) => void }): number {
    hooks?.beforeStep?.();
    this.physic.updateMovements();
    const tick = this.physic.stepFrame();
    hooks?.afterStep?.(tick);
    const fixedMs = this.physic.getWorld().getTimeStep() * 1000;
    this.physicsAccumulatorMs = Math.max(0, this.physicsAccumulatorMs - fixedMs);
    return tick;
  }

  private createCharacterHitbox(
    owner: any,
    kind: PhysicsEntityKind,
    options?: { isStatic?: boolean; mass?: number },
  ): void {
    if (!owner?.id) {
      return;
    }
    const existingEntity = this.physic.getEntityByUUID(owner.id);
    if (existingEntity) {
      // Rebind owner when the player instance is restored/replaced (e.g. map transfer).
      // Position sync callbacks read entity.owner at runtime.
      (existingEntity as any).owner = owner;
      this.bindCharacterSignalSync(existingEntity, owner);
      this.updateCharacterHitbox(owner);
      return;
    }

    this.addCharacter({
      owner,
      kind,
      maxSpeed: owner.speed,
      collidesWithCharacters: !this.shouldDisableCharacterCollisions(owner),
      isStatic: options?.isStatic,
      mass: options?.mass,
    });
    const entity = this.getBody(owner.id);
    if (entity) {
      this.emitPhysicsEntityAdd({
        owner,
        entity,
        kind,
      });
    }
  }

  private updateCharacterHitbox(owner: any): void {
    if (!owner?.id) return;
    const entity = this.physic.getEntityByUUID(owner.id);
    if (!entity) return;

    // Rebind owner on every update to keep physics callbacks attached to the
    // current player instance after room/session transfers.
    (entity as any).owner = owner;
    this.bindCharacterSignalSync(entity, owner);

    const { width, height } = this.resolveCharacterHitboxSize(owner);
    const topLeftX = this.resolveNumeric(owner.x);
    const topLeftY = this.resolveNumeric(owner.y);
    const kind = this.resolvePhysicsEntityKind(owner, owner.id);
    entity.setMass(this.resolveCharacterMass(owner, entity.mass));
    this.configureCharacterPushability(entity, owner, kind);
    this.updateHitbox(owner.id, topLeftX, topLeftY, width, height);
    this.setCharacterCollisionEnabled(owner.id, !this.shouldDisableCharacterCollisions(owner));
  }

  private resolveNumeric(source: any, fallback = 0): number {
    if (typeof source === "function") {
      try {
        return Number(source()) ?? fallback;
      } catch {
        return fallback;
      }
    }
    if (typeof source === "number") {
      return source;
    }
    return fallback;
  }

  private resolveHitboxDimension(source: unknown, fallback: number): number {
    const value = typeof source === "string" ? Number(source) : source;
    return typeof value === "number" && Number.isFinite(value) && value > 0
      ? value
      : fallback;
  }

  private resolveCharacterHitboxSize(owner: any): { width: number; height: number } {
    const hitbox = typeof owner?.hitbox === "function" ? owner.hitbox() : owner?.hitbox;
    return {
      width: this.resolveHitboxDimension(hitbox?.w ?? hitbox?.width, 32),
      height: this.resolveHitboxDimension(hitbox?.h ?? hitbox?.height, 32),
    };
  }

  private resolveCharacterMass(owner: any, fallback = 1): number {
    const mass = typeof owner?.mass === "function"
      ? owner.mass()
      : owner?.mass;
    return typeof mass === "number" && !Number.isNaN(mass) && mass >= 0
      ? mass
      : fallback;
  }

  private isPushableCharacter(owner: any): boolean {
    if (typeof owner?._pushable === "function") {
      try {
        return !!owner._pushable();
      } catch {
        return false;
      }
    }
    return owner?.pushable === true;
  }

  private configureCharacterPushability(entity: Entity, owner: any, kind: PhysicsEntityKind): void {
    if (kind !== "npc") {
      delete entity.canBePushedBy;
      return;
    }

    entity.canBePushedBy = (other: Entity) => {
      const currentOwner = (entity as any).owner ?? owner;
      if (this.isPushableCharacter(currentOwner)) {
        return true;
      }
      return !this.players()?.[other.uuid];
    };
  }

  private bindCharacterSignalSync(entity: Entity, owner: any): void {
    const entityAny = entity as any;
    if (
      entityAny.__rpgSignalSyncOwner === owner &&
      typeof entityAny.__rpgSignalSyncUnsubscribe === "function"
    ) {
      return;
    }

    this.unbindCharacterSignalSync(entity);
    entityAny.__rpgSignalSyncOwner = owner;

    const subscriptions: Subscription[] = [];
    entityAny.__rpgSignalSyncUnsubscribe = () => {
      subscriptions.forEach((subscription) => subscription.unsubscribe());
      delete entityAny.__rpgSignalSyncUnsubscribe;
      delete entityAny.__rpgSignalSyncOwner;
    };

    const syncFromSignals = () => {
      if (this.isPhysicsSyncingSignals) {
        return;
      }
      const currentOwner = entityAny.owner;
      if (!currentOwner?.id || currentOwner.id !== entity.uuid) {
        return;
      }
      this.updateCharacterHitbox(currentOwner);
    };

    const subscribeSignal = (signalLike: any) => {
      const observable = signalLike?.observable;
      if (!observable || typeof observable.subscribe !== "function") {
        return;
      }
      subscriptions.push(observable.subscribe(() => syncFromSignals()));
    };

    subscribeSignal(owner.x);
    subscribeSignal(owner.y);
    subscribeSignal(owner.z);
    subscribeSignal(owner.hitbox);
    subscribeSignal(owner._through);
    subscribeSignal(owner._throughEvent);
    subscribeSignal(owner._pushable);
    subscribeSignal(owner._mass);
  }

  private unbindCharacterSignalSync(entity: Entity): void {
    const entityAny = entity as any;
    const unsubscribe = entityAny.__rpgSignalSyncUnsubscribe;
    if (typeof unsubscribe === "function") {
      unsubscribe();
      return;
    }
    delete entityAny.__rpgSignalSyncOwner;
  }

  private shouldDisableCharacterCollisions(owner: any): boolean {
    if (this.isAlwaysOnTopEvent(owner)) {
      return true;
    }
    if (typeof owner._through === "function") {
      try {
        return !!owner._through();
      } catch {
        return false;
      }
    }
    if (typeof owner.through === "boolean") {
      return owner.through;
    }
    return false;
  }

  private isAlwaysOnTopEvent(owner: any): boolean {
    if (!owner) {
      return false;
    }
    if (typeof owner.isEvent !== "function") {
      return false;
    }

    try {
      if (!owner.isEvent()) {
        return false;
      }
    } catch {
      return false;
    }

    if (typeof owner._alwaysOnTop === "function") {
      try {
        return !!owner._alwaysOnTop();
      } catch {
        return false;
      }
    }
    if (owner.alwaysOnTop === true) {
      return true;
    }

    return this.resolveNumeric(owner.z) >= 1000;
  }

  private resolvePhysicsEntityKind(owner: any, id?: string): PhysicsEntityKind {
    if (typeof owner?.isEvent === "function") {
      try {
        if (owner.isEvent()) {
          return "npc";
        }
      } catch {
        // Ignore owner inspection errors and fallback below
      }
    }

    const ownerId = typeof owner?.id === "string" ? owner.id : id;
    if (ownerId && this.players()?.[ownerId]) {
      return "hero";
    }
    if (ownerId && this.events()?.[ownerId]) {
      return "npc";
    }
    return "generic";
  }

  protected emitPhysicsInit(_context: MapPhysicsInitContext): void {}

  protected emitPhysicsEntityAdd(_context: MapPhysicsEntityContext): void {}

  protected emitPhysicsEntityRemove(_context: MapPhysicsEntityContext): void {}

  protected emitPhysicsReset(): void {}

  protected withPhysicsSync<T>(run: () => T): T {
    this.physicsSyncDepth += 1;
    try {
      return run();
    } finally {
      this.physicsSyncDepth -= 1;
    }
  }

  protected get isPhysicsSyncingSignals(): boolean {
    return this.physicsSyncDepth > 0;
  }

  /**
   * Get the world maps manager
   * 
   * @returns WorldMapsManager instance or null if not configured
   * 
   * @example
   * ```ts
   * const worldMaps = map.getWorldMapsManager();
   * if (worldMaps) {
   *   const adjacentMaps = worldMaps.getAdjacentMaps(currentMap, coordinates);
   * }
   * ```
   */
  getWorldMapsManager(): WorldMapsManager | null {
    return this.worldMapsManager ?? null;
  }

  /**
   * Get attached World
   * 
   * Recover the world attached to this map (undefined if no world attached)
   * 
   * @since 3.0.0-beta.8
   * @returns {RpgWorldMaps | undefined} The world maps manager instance if attached, otherwise undefined
   * 
   * @example
   * ```ts
   * const world = map.getInWorldMaps();
   * if (world) {
   *   console.log(world.getAllMaps());
   * }
   * ```
   */
  getInWorldMaps(): RpgWorldMaps | undefined {
    return this.worldMapsManager ?? undefined;
  }

  /**
   * Remove this map from the world
   * 
   * Remove this map from the world
   * 
   * @since 3.0.0-beta.8
   * @returns {boolean | undefined} True if removed, false if not found, undefined if no world attached
   * 
   * @example
   * ```ts
   * const removed = map.removeFromWorldMaps();
   * ```
   */
  removeFromWorldMaps(): boolean | undefined {
    if (!this.worldMapsManager) return undefined;
    const id = (this as any).id as string | undefined;
    if (!id) return false;
    return this.worldMapsManager.removeMap(id);
  }

  /**
   * Assign the map to a world
   * 
   * Assign the map to a world
   * 
   * @since 3.0.0-beta.8
   * @param {RpgWorldMaps} worldMap world maps
   * @returns {void}
   * 
   * @example
   * ```ts
   * const world = new WorldMapsManager();
   * world.configure([{ id: 'm1', worldX: 0, worldY: 0, width: 1024, height: 1024 }]);
   * map.setInWorldMaps(world);
   * ```
   */
  setInWorldMaps(worldMap: RpgWorldMaps): void {
    this.worldMapsManager = worldMap;
  }

  

  /**
   * Create a temporary and moving hitbox on the map
   * 
   * Allows to create a temporary hitbox that moves through multiple positions sequentially.
   * For example, you can use it to explode a bomb and find all the affected players, 
   * or for a gameplay effect that should emit when entities enter a moving area.
   * For instant melee/combat checks, prefer `queryHitbox()`.
   * 
   * The method creates a zone sensor that moves through the specified hitbox positions
   * at the given speed, detecting collisions with players and events at each step.
   * 
   * @param hitboxes - Array of hitbox positions to move through sequentially
   * @param options - Configuration options for the movement
   * @returns Observable that emits arrays of hit entities and completes when movement is finished
   * 
   * @example
   * ```ts
   * // Create a sword slash effect that moves through two positions
   * map.createMovingHitbox([
   *   { x: 100, y: 100, width: 50, height: 50 },
   *   { x: 120, y: 100, width: 50, height: 50 }
   * ], { speed: 2 }).subscribe({
   *   next(hits) {
   *     // hits contains RpgPlayer or RpgEvent objects that were hit
   *     console.log('Hit entities:', hits);
   *   },
   *   complete() {
   *     console.log('Movement finished');
   *   }
   * });
   * ```
   */
  createMovingHitbox(
    hitboxes: Array<{ x: number; y: number; width: number; height: number }>,
    options: { speed?: number } = {}
  ): Observable<(T | any)[]> {
    const { speed = 1 } = options;
    const zoneId = `moving_hitbox_${generateShortUUID()}`;

    return new Observable(observer => {
      if (hitboxes.length === 0) {
        observer.complete();
        return;
      }

      let currentIndex = 0;
      let frameCounter = 0;
      const hitEntities = new Set<string>();

      // Create initial zone at first hitbox position
      const firstHitbox = hitboxes[0];
      const radius = Math.max(firstHitbox.width, firstHitbox.height) / 2;

      this.addZone(zoneId, {
        x: firstHitbox.x + firstHitbox.width / 2,
        y: firstHitbox.y + firstHitbox.height / 2,
        radius: radius
      });

      // Register zone events to detect hits
      this.registerZoneEvents(
        zoneId,
        (hitIds: string[]) => {
          // Convert hit IDs to actual objects and emit
          const hitObjects = hitIds
            .map(id => this.getObjectById(id))
            .filter(obj => obj !== undefined);

          if (hitObjects.length > 0) {
            // Track hit entities to avoid duplicates
            hitIds.forEach(id => hitEntities.add(id));
            observer.next(hitObjects);
          }
        }
      );

      // Subscribe to tick to handle movement
      const tickSubscription = this.tick$.subscribe(() => {
        frameCounter++;

        // Move to next position based on speed
        if (frameCounter >= speed) {
          frameCounter = 0;
          currentIndex++;

          // Check if we've reached the end
          if (currentIndex >= hitboxes.length) {
            // Clean up and complete
            this.removeZone(zoneId);
            tickSubscription.unsubscribe();
            observer.complete();
            return;
          }

          // Move zone to next position
          const nextHitbox = hitboxes[currentIndex];
          const zone = this.getZone(zoneId);

          if (zone) {
            // Remove current zone and create new one at next position
            this.removeZone(zoneId);

            const newRadius = Math.max(nextHitbox.width, nextHitbox.height) / 2;
            this.addZone(zoneId, {
              x: nextHitbox.x + nextHitbox.width / 2,
              y: nextHitbox.y + nextHitbox.height / 2,
              radius: newRadius
            });

            // Re-register zone events for the new zone
            this.registerZoneEvents(
              zoneId,
              (hitIds: string[]) => {
                const hitObjects = hitIds
                  .map(id => this.getObjectById(id))
                  .filter(obj => obj !== undefined);

                if (hitObjects.length > 0) {
                  hitIds.forEach(id => hitEntities.add(id));
                  observer.next(hitObjects);
                }
              }
            );
          }
        }
      });

      // Cleanup function
      return () => {
        tickSubscription.unsubscribe();
        this.removeZone(zoneId);
      };
    });
  }

  /**
   * Query players and events whose physics bodies overlap a rectangular hitbox.
   *
   * Unlike `createMovingHitbox()`, this is an immediate deterministic query. It
   * is intended for melee attacks, AoE checks, and other server-authoritative
   * gameplay that needs to hit entities already inside the area.
   */
  queryHitbox(
    rect: MapHitboxQueryRect,
    options: MapHitboxQueryOptions = {}
  ): Array<T | any> {
    const width = Math.max(0, rect.width);
    const height = Math.max(0, rect.height);
    if (width <= 0 || height <= 0) return [];

    const bounds = new AABB(rect.x, rect.y, rect.x + width, rect.y + height);
    const excluded = new Set(options.excludeIds ?? []);
    const kinds = new Set<MapHitboxQueryKind>(
      options.kinds ?? ["players", "events"]
    );
    const players = this.players();
    const events = this.events();
    const results = new Map<string, T | any>();

    for (const entity of this.physic.queryAABB(bounds)) {
      const id = entity.uuid;
      if (!id || excluded.has(id)) continue;

      const owner = players[id] ?? events[id];
      if (!owner) continue;
      if (players[id] && !kinds.has("players")) continue;
      if (events[id] && !kinds.has("events")) continue;

      const collider = createCollider(entity);
      if (!collider?.getBounds().intersects(bounds)) continue;

      results.set(id, owner);
    }

    return Array.from(results.values());
  }

  /**
   * Query players, events, and optional custom targets inside an arbitrary area.
   *
   * `queryArea()` is a low-level selection primitive. It uses the shape bounds as
   * a broad phase, then delegates the precise inclusion logic to
   * `shape.contains()`. Built-in helpers such as `AreaShape.circle()` and
   * `AreaShape.cross()` are conveniences over the same shape contract.
   *
   * The method does not apply gameplay effects. Use the returned hits for damage,
   * healing, target selection, AI, traps, previews, or any custom gameplay.
   *
   * In a networked game, apply those gameplay effects on the server so the
   * authoritative state remains synchronized.
   *
   * Options:
   * - `center`: point or object with `x`, `y`, and optional `hitbox`; objects
   *   are resolved to their hitbox center.
   * - `shape`: area shape used for broad-phase bounds and precise inclusion.
   * - `targets`: `"players"`, `"events"`, `"custom"`, an array of them, or
   *   `"all"`. Defaults to players and events, plus custom targets when
   *   `customTargets` is provided.
   * - `customTargets`: plain objects to include in the query. They should expose
   *   `x` and `y`, and may expose `id`, `width`/`height`, or `hitbox`.
   * - `excludeIds`: target ids to ignore, typically the caster or owner.
   * - `filter`: final predicate called before `shape.contains()`.
   *
   * Built-in shape helpers:
   * - `AreaShape.circle({ radius, offset? })`
   * - `AreaShape.rect({ width, height, offset?, angle? })`
   * - `AreaShape.line({ length, thickness, direction, offset? })`
   * - `AreaShape.cross({ armLength, thickness, offset? })`
   * - `AreaShape.composite([shapeA, shapeB])`
   * - `AreaShape.custom({ bounds, contains, distance?, maxDistance? })`
   *
   * Each hit includes `target`, `id`, `kind`, `x`, `y`, `bounds`, `distance`,
   * `distanceRatio`, and `falloff`.
   *
   * `distanceRatio` is clamped between `0` and `1`. `falloff.linear()` returns
   * strong values near the center and weaker values near the edge, which is
   * useful for explosions and other radial effects.
   *
   * @example
   * ```ts
   * import { AreaShape } from "@rpgjs/server";
   *
   * const hits = map.queryArea({
   *   center: player,
   *   shape: AreaShape.circle({ radius: 120 }),
   *   targets: ["players", "events"],
   *   excludeIds: [player.id],
   * });
   *
   * for (const hit of hits) {
   *   const damage = Math.round(80 * hit.falloff.linear());
   *   hit.target.hp -= damage;
   * }
   * ```
   *
   * @example
   * ```ts
   * import { AreaShape } from "@rpgjs/server";
   *
   * function explodeBomb(map, bomb, ownerId?: string) {
   *   const hits = map.queryArea({
   *     center: bomb,
   *     shape: AreaShape.circle({ radius: 96 }),
   *     targets: ["players", "events"],
   *     excludeIds: ownerId ? [ownerId] : [],
   *     filter: (target) => target.id !== bomb.id,
   *   });
   *
   *   for (const hit of hits) {
   *     const damage = Math.round(120 * hit.falloff.linear());
   *     hit.target.hp = Math.max(0, hit.target.hp - damage);
   *   }
   * }
   * ```
   *
   * @example
   * ```ts
   * const hits = map.queryArea({
   *   center: { x: 320, y: 240 },
   *   shape: AreaShape.custom({
   *     bounds: ({ center }) => ({
   *       x: center.x - 160,
   *       y: center.y - 160,
   *       width: 320,
   *       height: 320,
   *     }),
   *     contains: (target, { center }) => {
   *       const distance = Math.hypot(target.x - center.x, target.y - center.y);
   *       return distance >= 64 && distance <= 160;
   *     },
   *     maxDistance: () => 160,
   *   }),
   *   targets: "custom",
   *   customTargets: projectiles,
   * });
   * ```
   */
  queryArea<TCustom = unknown>(
    options: MapAreaQueryOptions<TCustom>
  ): Array<MapAreaHit<TCustom | T | any>> {
    return queryMapArea(this, options);
  }

  /**
   * Replace the client-prediction collision geometry owned by one streamed map chunk.
   *
   * The authoritative server still owns collision results. This method only keeps
   * the predicting client aligned with chunks that the server has disclosed.
   *
   * @title Replace streamed static hitboxes
   * @method map.replaceStreamedStaticHitboxes
   * @param namespace - Stable chunk key or provider namespace.
   * @param hitboxes - Serializable rectangles or polygons for that chunk.
   * @returns {void}
   * @memberof RpgCommonMap
   */
  replaceStreamedStaticHitboxes(namespace: string, hitboxes: MapChunkHitbox[]): void {
    this.clearStreamedStaticHitboxes(namespace);
    const ids = new Set<string>();

    hitboxes.forEach((hitbox, index) => {
      const suffix = hitbox.id ?? String(index);
      const id = `__map_stream__:${namespace}:${index}:${suffix}`;
      if ("points" in hitbox) {
        this.addStaticHitbox(id, hitbox.points);
      }
      else {
        this.addStaticHitbox(id, hitbox.x, hitbox.y, hitbox.width, hitbox.height);
      }
      ids.add(id);
    });

    if (ids.size > 0) {
      this.streamedStaticHitboxIds.set(namespace, ids);
    }
  }

  /**
   * Remove prediction collision geometry previously registered for a map chunk.
   *
   * @title Clear streamed static hitboxes
   * @method map.clearStreamedStaticHitboxes
   * @param namespace - Stable chunk key or provider namespace.
   * @returns {void}
   * @memberof RpgCommonMap
   */
  clearStreamedStaticHitboxes(namespace: string): void {
    const ids = this.streamedStaticHitboxIds.get(namespace);
    if (!ids) return;
    ids.forEach((id) => this.removeHitbox(id));
    this.streamedStaticHitboxIds.delete(namespace);
  }

  /**
   * Add a static hitbox to the physics world
   * @private
   */
  private addStaticHitbox(
    id: string,
    xOrPoints: number | number[][],
    y?: number,
    width?: number,
    height?: number,
  ): string {
    // Check if entity already exists
    if (this.physic.getEntityByUUID(id)) {
      throw new Error(`Hitbox with id ${id} already exists`);
    }

    let entity: Entity;
    let boxWidth: number;
    let boxHeight: number;

    if (Array.isArray(xOrPoints)) {
      const points = xOrPoints;
      if (points.length < 3) {
        throw new Error(`Polygon must have at least 3 points, got ${points.length}`);
      }

      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;

      for (const point of points) {
        if (!Array.isArray(point) || point.length !== 2 || typeof point[0] !== "number" || typeof point[1] !== "number") {
          throw new Error(`Invalid point ${JSON.stringify(point)}. Expected [x, y].`);
        }
        minX = Math.min(minX, point[0]);
        maxX = Math.max(maxX, point[0]);
        minY = Math.min(minY, point[1]);
        maxY = Math.max(maxY, point[1]);
      }

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      boxWidth = Math.max(maxX - minX, 1);
      boxHeight = Math.max(maxY - minY, 1);

      entity = this.physic.createEntity({
        uuid: id,
        position: { x: centerX, y: centerY },
        width: boxWidth,
        height: boxHeight,
        mass: Infinity,
        state: EntityState.Static,
        restitution: 0
      });
      entity.freeze();

      const localVertices = points.map((point) => {
        const [px, py] = point as [number, number];
        return new Vector2(px - centerX, py - centerY);
      });
      assignPolygonCollider(entity, { vertices: localVertices });
    } else {
      if (typeof y !== "number" || typeof width !== "number" || typeof height !== "number") {
        throw new Error("Rectangle hitbox requires x, y, width and height parameters");
      }

      const centerX = xOrPoints + width / 2;
      const centerY = y + height / 2;
      boxWidth = Math.max(width, 1);
      boxHeight = Math.max(height, 1);

      entity = this.physic.createStaticObstacle(id, {
        x: centerX,
        y: centerY,
        width: boxWidth,
        height: boxHeight,
        restitution: 0,
      });
    }

    return id;
  }

  /**
   * Add a character to the physics world
   * @private
   */
  /**
   * Add a character entity to the physics world
   * 
   * Creates a physics entity for a character (player or NPC) with proper position handling.
   * The owner's x/y signals represent **top-left** coordinates, while the physics entity
   * uses **center** coordinates internally.
   * 
   * ## Position System
   * 
   * - `owner.x()` / `owner.y()` → **top-left** corner of the character's hitbox
   * - `entity.position` → **center** of the physics collider
   * - Conversion: `center = topLeft + (size / 2)`
   * 
   * @param options - Character configuration
   * @returns The character's unique ID
   * 
   * @example
   * ```ts
   * // Player at top-left position (100, 100) with 32x32 hitbox
   * // Physics entity will be at center (116, 116)
   * this.addCharacter({
   *   owner: player,
   *   x: 116,  // center X (ignored, uses owner.x())
   *   y: 116,  // center Y (ignored, uses owner.y())
   *   kind: "hero"
   * });
   * ```
   * 
   * @private
   */
  private addCharacter(options: {
    owner: any;
    kind?: PhysicsEntityKind;
    collidesWithCharacters?: boolean;
    maxSpeed?: number;
    isStatic?: boolean;
    friction?: number;
    mass?: number;
  }): string {
    if (!options || typeof options.owner?.id !== "string") {
      throw new Error("Character requires an owner object with a string id");
    }

    const owner = options.owner;
    const id = owner.id;

    const { width, height } = this.resolveCharacterHitboxSize(owner);

    // owner.x() and owner.y() are TOP-LEFT positions
    const topLeftX = owner.x();
    const topLeftY = owner.y();

    // Convert to CENTER for physics engine
    const centerX = topLeftX + width / 2;
    const centerY = topLeftY + height / 2;

    const isStatic = !!options.isStatic;

    const speed = options.maxSpeed ? options.maxSpeed * this.speedScalar : 200;
    const entity = this.physic.createCharacter(id, {
      x: centerX,
      y: centerY,
      hitbox: { width, height },
      speed,
      mass: options.mass ?? (isStatic ? Infinity : 1),
      friction: options.friction ?? 0.4,
      linearDamping: isStatic ? 1 : 0.2,
      maxLinearVelocity: speed,
      restitution: 0
    });

    if (isStatic) {
      entity.freeze();
    } else {
      entity.unfreeze();
    }

    // Store owner reference directly on entity for syncing positions
    (entity as any).owner = owner;
    this.bindCharacterSignalSync(entity, owner);

    entity.onDirectionChange(({ cardinalDirection }) => {
      // hack to prevent direction in client side
      if (!('$send' in this)) return;
      const owner = (entity as any).owner;
      if (!owner) return;
      if (cardinalDirection === 'idle') return;
      // Don't change direction if it's locked
      if (owner.directionFixed) return;
      owner.changeDirection(cardinalDirection as Direction);
    });

    entity.onMovementChange(({ isMoving, intensity }) => {
      // Prevent animation changes on client side (same as onDirectionChange)
      if (!('$send' in this)) return;
      
      // Get owner from entity (same pattern as onDirectionChange)
      const owner = (entity as any).owner;
      if (!owner) return;
      
      // Don't change animation if it's locked
      if (owner.animationFixed) return;
      
      // Only change animation if intensity is low (avoid animation flicker on micro-movements)
      // Intensity threshold: 10 pixels/second (adjust based on your game's needs)
      const LOW_INTENSITY_THRESHOLD = 10;
      
      // Try to use setAnimation method if available (preferred method)
      // Otherwise, try to access animationName signal directly
      const hasSetAnimation = typeof owner.setAnimation === 'function';
      const animationNameSignal = owner.animationName;
      const ownerHasAnimationName = animationNameSignal && typeof animationNameSignal === 'object' && typeof animationNameSignal.set === 'function';
      
      if (isMoving && intensity > LOW_INTENSITY_THRESHOLD) {
        if (hasSetAnimation) {
          owner.setGraphicAnimation("walk");
        } else if (ownerHasAnimationName) {
          animationNameSignal.set("walk");
        }
      } else if (!isMoving) {
        if (hasSetAnimation) {
          owner.setGraphicAnimation("stand");
        } else if (ownerHasAnimationName) {
          animationNameSignal.set("stand");
        }
      }
      // If moving with high intensity, keep current animation (e.g., already running)
    });

    this.configureCharacterPushability(entity, owner, options.kind ?? "generic");

    // Register position sync handler to update owner.x and owner.y.
    // Read owner dynamically from entity to avoid stale references after map transfer.
    
    entity.onPositionChange(({ x, y }) => {
      const currentOwner = (entity as any).owner;
      if (!currentOwner) {
        return;
      }

      const entityWidth = entity.width || width;
      const entityHeight = entity.height || height;
      // Calculate top-left from center using the original hitbox dimensions
      // This ensures consistency: center = topLeft + (size / 2)
      // Therefore: topLeft = center - (size / 2)
      let topLeftX = x - entityWidth / 2;
      let topLeftY = y - entityHeight / 2;
      const routeClamp =
        (currentOwner as any).__routeMovementClamp ??
        (entity as any).__routeMovementClamp;
      const targetTopLeft = routeClamp?.targetTopLeft;
      const direction = routeClamp?.direction;
      if (targetTopLeft && direction) {
        const targetX = Number(targetTopLeft.x);
        const targetY = Number(targetTopLeft.y);
        const directionX = Number(direction.x);
        const directionY = Number(direction.y);
        if (Number.isFinite(targetX) && Number.isFinite(directionX)) {
          if ((directionX > 0 && topLeftX > targetX) || (directionX < 0 && topLeftX < targetX)) {
            topLeftX = targetX;
          }
        }
        if (Number.isFinite(targetY) && Number.isFinite(directionY)) {
          if ((directionY > 0 && topLeftY > targetY) || (directionY < 0 && topLeftY < targetY)) {
            topLeftY = targetY;
          }
        }
      }
      let changed = false;

      this.withPhysicsSync(() => {
        if (typeof currentOwner.x === "function" && typeof currentOwner.x.set === "function") {
          currentOwner.x.set(Math.round(topLeftX));
          changed = true;
        }
        if (typeof currentOwner.y === "function" && typeof currentOwner.y.set === "function") {
          currentOwner.y.set(Math.round(topLeftY));
          changed = true;
        }
      });
      if (changed) {
        if (
          typeof currentOwner.execMethod === "function" &&
          !(typeof currentOwner.isEvent === "function" && currentOwner.isEvent())
        ) {
          void Promise.resolve(currentOwner.execMethod("onMove")).catch((error) => {
            console.error("[RPGJS] Error during player onMove hooks:", error);
          });
        }
        const applyFrames = currentOwner.applyFrames;
        if (typeof applyFrames === "function") {
          queueMicrotask(() => applyFrames.call(currentOwner));
        }
      }
    });

    // Add resolution filter for through/throughOtherPlayer/throughEvent
    // This filter determines if collisions should be RESOLVED (blocking) or just DETECTED.
    // When returning false, entities pass through each other but collision events still fire.
    entity.addResolutionFilter((self, other) => {
      const selfOwner = (self as any).owner;
      const otherOwner = (other as any).owner;

      if (this.isAlwaysOnTopEvent(selfOwner)) {
        return false;
      }

      // If either entity has no owner, resolve collision (e.g., walls, obstacles must block)
      if (!selfOwner || !otherOwner) {
        return true;
      }

      if (this.isAlwaysOnTopEvent(otherOwner)) {
        return false;
      }

    
      if (selfOwner.z() !== otherOwner.z()) {
        return false; // Don't resolve collision
      }

      // Check if selfOwner has _through property (passes through everything)
      // This applies to both players and events
      if (typeof selfOwner._through === "function") {
        try {
          if (selfOwner._through() === true) {
            return false; // Pass through but events still fire
          }
        } catch {
          // Ignore errors
        }
      } else if (selfOwner.through === true) {
        return false;
      }

      // Determine the type of both entities via lookup in players/events
      const playersMap = this.players();
      const eventsMap = this.events();
      const isSelfPlayer = !!playersMap[self.uuid];
      const isOtherPlayer = !!playersMap[other.uuid];
      const isSelfEvent = !!eventsMap[self.uuid];
      const isOtherEvent = !!eventsMap[other.uuid];
      const readScenarioOwnerId = (owner: any): string | undefined => {
        const scenarioOwnerId = owner?._scenarioOwnerId ?? owner?.scenarioOwnerId;
        return typeof scenarioOwnerId === "string" && scenarioOwnerId.length > 0
          ? scenarioOwnerId
          : undefined;
      };
      const selfScenarioOwnerId = readScenarioOwnerId(selfOwner);
      const otherScenarioOwnerId = readScenarioOwnerId(otherOwner);

      // Scenario events are isolated per player:
      // they only collide with their owner and scenario events of the same owner.
      if (selfScenarioOwnerId) {
        if (isOtherPlayer && other.uuid !== selfScenarioOwnerId) {
          return false;
        }
        if (isOtherEvent && otherScenarioOwnerId !== selfScenarioOwnerId) {
          return false;
        }
      }
      if (otherScenarioOwnerId) {
        if (isSelfPlayer && self.uuid !== otherScenarioOwnerId) {
          return false;
        }
        if (isSelfEvent && selfScenarioOwnerId !== otherScenarioOwnerId) {
          return false;
        }
      }

      // throughOtherPlayer only applies when SELF is a player and OTHER is also a player
      // (players passing through other players)
      if (isSelfPlayer && isOtherPlayer) {
        if (typeof selfOwner._throughOtherPlayer === "function") {
          try {
            if (selfOwner._throughOtherPlayer() === true) {
              return false; // Pass through players but events still fire
            }
          } catch {
            // Ignore errors
          }
        } else if (selfOwner.throughOtherPlayer === true) {
          return false;
        }
      }

      // throughEvent applies when SELF is a player or event and OTHER is an event.
      // Collisions are still detected, but not physically resolved.
      if ((isSelfPlayer || isSelfEvent) && isOtherEvent) {
        if (typeof selfOwner._throughEvent === "function") {
          try {
            if (selfOwner._throughEvent() === true) {
              return false; // Pass through events but touch events still fire
            }
          } catch {
            // Ignore errors
          }
        } else if (selfOwner.throughEvent === true) {
          return false;
        }
      }

      return true; // Resolve collision (block movement)
    });

    return id;
  }

  /** @internal Reconciles physics bodies with synchronized character signals. */
  refreshCharacterHitboxes(): void {
    const players = this.players?.() ?? {};
    for (const id in players) {
      const player = players[id];
      if (!player) continue;
      player.id = player.id ?? id;
      this.createCharacterHitbox(player, "hero");
    }

    const events = this.events?.() ?? {};
    for (const id in events) {
      const event = events[id];
      if (!event) continue;
      event.id = event.id ?? id;
      if (event._removeTransition?.()) {
        this.removeHitbox(id, event, "npc");
        continue;
      }
      this.createCharacterHitbox(event, "npc", {
        mass: this.resolveCharacterMass(event, 100),
      });
    }
  }

  /**
   * Update hitbox position and size
   * 
   * @param id - Entity ID
   * @param x - Top-left X coordinate
   * @param y - Top-left Y coordinate
   * @param width - Optional width
   * @param height - Optional height
   * @returns True if hitbox was updated successfully
   */
  updateHitbox(id: string, x: number, y: number, width?: number, height?: number): boolean {
    const entity = this.physic.getEntityByUUID(id);
    if (!entity) return false;

    if (typeof width === "number" && typeof height === "number") {
      entity.width = Math.max(width, 1);
      entity.height = Math.max(height, 1);
    }

    // Calculate center from top-left
    const entityWidth = entity.width || entity.radius * 2 || 32;
    const entityHeight = entity.height || entity.radius * 2 || 32;
    const centerX = x + entityWidth / 2;
    const centerY = y + entityHeight / 2;
    this.physic.teleportEntity(entity, { x: centerX, y: centerY });

    return true;
  }

  /**
   * Remove a hitbox from the physics world
   * @private
   */
  private removeHitbox(id: string, owner?: any, kind?: PhysicsEntityKind): boolean {
    const entity = this.physic.getEntityByUUID(id);
    if (!entity) {
      return false;
    }
    this.unbindCharacterSignalSync(entity);
    const resolvedOwner = owner ?? (entity as any).owner;
    if (resolvedOwner) {
      this.emitPhysicsEntityRemove({
        owner: resolvedOwner,
        entity,
        kind: kind ?? this.resolvePhysicsEntityKind(resolvedOwner, id),
      });
    }
    this.physic.removeEntity(entity);
    return true;
  }

  /**
   * Check if an entity is moving
   * @private
   */
  private isEntityMoving(id: string): boolean {
    const entity = this.physic.getEntityByUUID(id);
    if (!entity) return false;
    // Check if entity has velocity
    return entity.velocity.length() > 0.1;
  }

  /**
   * Move a body in a direction
   * @private
   */
  private moveBody(player: any, direction: Direction): boolean {
    const entity = this.physic.getEntityByUUID(player.id);
    if (!entity) return false;

    const speed = player.speed * this.speedScalar;
    this.physic.moveEntity(entity, direction, speed);
    entity.wakeUp();
    return true;
  }

  private dashBody(
    player: any,
    input: {
      direction: { x: number; y: number };
      additionalSpeed?: number;
      duration?: number;
    }
  ): boolean {
    const entity = this.physic.getEntityByUUID(player.id);
    if (!entity) return false;

    const rawX = Number(input.direction?.x ?? 0);
    const rawY = Number(input.direction?.y ?? 0);
    const magnitude = Math.hypot(rawX, rawY);
    if (!Number.isFinite(magnitude) || magnitude <= 0) return false;

    const direction = {
      x: rawX / magnitude,
      y: rawY / magnitude,
    };
    const additionalSpeed =
      typeof input.additionalSpeed === "number" && Number.isFinite(input.additionalSpeed)
        ? Math.max(0, Math.min(input.additionalSpeed, 64))
        : 4;
    const durationMs =
      typeof input.duration === "number" && Number.isFinite(input.duration)
        ? Math.max(1, Math.min(input.duration, 1000))
        : 200;
    const speed = (player.speed + additionalSpeed) * this.speedScalar;

    this.moveManager.add(
      player.id,
      new Dash(speed, direction, durationMs / 1000)
    );
    entity.wakeUp();
    return true;
  }

  /**
   * Stop movement for a player
   * 
   * Completely stops all movement for a player, including:
   * - Clearing all active movement strategies (dash, linear moves, etc.)
   * - Setting velocity to zero
   * - Resetting intended direction
   * 
   * This method is particularly useful when changing maps to ensure
   * the player doesn't carry over movement from the previous map.
   * 
   * @param player - The player to stop
   * @returns True if the player was found and movement was stopped
   * 
   * @example
   * ```ts
   * // Stop player movement when changing maps
   * if (mapChanged) {
   *   map.stopMovement(player);
   * }
   * 
   * // Stop movement when player dies
   * if (player.isDead()) {
   *   map.stopMovement(player);
   * }
   * ```
   * @protected
   */
  protected stopMovement(player: any): boolean {
    const entity = this.physic.getEntityByUUID(player.id);
    if (!entity) return false;

    // Stop all movement using the MovementManager (clears strategies and stops entity movement)
    this.moveManager.stopMovement(player.id);

    player.pendingInputs = [];
    
    return true;
  }

  /**
   * Set character collision enabled
   * @private
   */
  private setCharacterCollisionEnabled(id: string, collides: boolean): boolean {
    const entity = this.physic.getEntityByUUID(id);
    if (!entity) {
      return false;
    }
    // Collision filtering is handled by PhysicsEngine's collision system
    // This method is kept for API compatibility but doesn't need to do anything
    // as PhysicsEngine handles collisions automatically
    return true;
  }

  /**
   * Get collisions for an entity
   * 
   * Returns all entities that are colliding with the specified entity.
   * Uses the entity's actual AABB bounds to detect collisions in all directions.
   * 
   * @param id - Entity UUID to check collisions for
   * @returns Array of entity UUIDs that are colliding with the specified entity
   * 
   * @example
   * ```ts
   * // Get all entities colliding with player
   * const collisions = map.getCollisions('player1');
   * collisions.forEach(id => {
   *   console.log(`Entity ${id} is colliding with player`);
   * });
   * ```
   */
  protected getCollisions(id: string): string[] {
    const entity = this.physic.getEntityByUUID(id);
    if (!entity) return [];

    // Get the entity's actual collider and AABB bounds
    const collider = createCollider(entity);
    if (!collider) return [];

    const entityAABB = collider.getBounds();
    
    // Expand AABB slightly to ensure we catch nearby entities
    // This helps with edge cases where entities are just touching
    const expandedAABB = entityAABB.expand(1);

    // Query nearby entities using the expanded AABB
    const nearby = this.physic.queryAABB(expandedAABB);
    const collisions: string[] = [];

    // Check actual AABB intersections for each nearby entity
    for (const other of nearby) {
      if (other.uuid === id) continue;

      const otherCollider = createCollider(other);
      if (!otherCollider) continue;

      const otherAABB = otherCollider.getBounds();
      
      // Check if AABBs intersect, allowing a small physics solver gap.
      if (expandedAABB.intersects(otherAABB)) {
        collisions.push(other.uuid);
      }
    }

    return collisions;
  }

  /**
   * Get entities inside the action area directly in front of an entity.
   *
   * This is intentionally separate from physical collisions: a player often
   * presses the action key while blocked just before touching an NPC, so the
   * physics solver may leave a tiny gap even though gameplay expects an
   * interaction.
   */
  private getInteractionCollisions(
    id: string,
    direction?: Direction | string,
    range = DEFAULT_INTERACTION_RANGE,
  ): string[] {
    const entity = this.physic.getEntityByUUID(id);
    if (!entity) return [];

    const collider = createCollider(entity);
    if (!collider) return [];

    const entityAABB = collider.getBounds();
    const interactionAABB = this.getInteractionAABB(entityAABB, direction, range);
    const nearby = this.physic.queryAABB(interactionAABB);
    const collisions: string[] = [];

    for (const other of nearby) {
      if (other.uuid === id) continue;

      const otherCollider = createCollider(other);
      if (!otherCollider) continue;

      if (interactionAABB.intersects(otherCollider.getBounds())) {
        collisions.push(other.uuid);
      }
    }

    return collisions;
  }

  private getInteractionAABB(
    bounds: AABB,
    direction?: Direction | string,
    range = DEFAULT_INTERACTION_RANGE,
  ): AABB {
    const distance = Number.isFinite(range) ? Math.max(0, range) : DEFAULT_INTERACTION_RANGE;
    const sidePadding = distance > 0 ? Math.min(INTERACTION_SIDE_PADDING, distance / 2) : 0;

    switch (direction) {
      case Direction.Up:
        return new AABB(
          bounds.minX - sidePadding,
          bounds.minY - distance,
          bounds.maxX + sidePadding,
          bounds.minY + COLLISION_PROXIMITY_MARGIN,
        );
      case Direction.Down:
        return new AABB(
          bounds.minX - sidePadding,
          bounds.maxY - COLLISION_PROXIMITY_MARGIN,
          bounds.maxX + sidePadding,
          bounds.maxY + distance,
        );
      case Direction.Left:
        return new AABB(
          bounds.minX - distance,
          bounds.minY - sidePadding,
          bounds.minX + COLLISION_PROXIMITY_MARGIN,
          bounds.maxY + sidePadding,
        );
      case Direction.Right:
        return new AABB(
          bounds.maxX - COLLISION_PROXIMITY_MARGIN,
          bounds.minY - sidePadding,
          bounds.maxX + distance,
          bounds.maxY + sidePadding,
        );
      default:
        return bounds.expand(distance);
    }
  }

  /**
   * Get physics body (entity) for an id
   * @protected
   */
  public getBody(id: string): Entity | undefined {
    return this.physic.getEntityByUUID(id);
  }

  /**
   * Get the current physics tick
   * @returns Current tick number
   */
  getTick(): number {
    return this.physic.getTick();
  }

  /**
   * Get body position in different modes
   * 
   * @param id - Entity ID
   * @param mode - Position mode: "center" or "top-left"
   * @returns Position coordinates or undefined if entity not found
   */
  getBodyPosition(
    id: string,
    mode: "center" | "top-left" = "center",
  ): { x: number; y: number } | undefined {
    const entity = this.physic.getEntityByUUID(id);
    if (!entity) return undefined;

    const centerX = entity.position.x;
    const centerY = entity.position.y;
    if (mode === "center") {
      return { x: centerX, y: centerY };
    }

    // Calculate top-left from center
    const width = entity.width || (entity.radius ? entity.radius * 2 : 32);
    const height = entity.height || (entity.radius ? entity.radius * 2 : 32);
    return {
      x: centerX - width / 2,
      y: centerY - height / 2,
    };
  }

  /**
   * Set body position
   * 
   * @param id - Entity ID
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param mode - Position mode: "center" or "top-left"
   * @returns True if position was set successfully
   */
  setBodyPosition(
    id: string,
    x: number,
    y: number,
    mode: "center" | "top-left" = "center",
  ): Entity | undefined {
    const entity = this.physic.getEntityByUUID(id);
    if (!entity) return;

    const width = entity.width || (entity.radius ? entity.radius * 2 : 32);
    const height = entity.height || (entity.radius ? entity.radius * 2 : 32);

    let centerX = x;
    let centerY = y;
    if (mode === "top-left") {
      centerX = x + width / 2;
      centerY = y + height / 2;
    }

    entity.position.set(centerX, centerY);
    entity.notifyPositionChange();
    this.physic.updateEntity(entity);
    
    return entity;
  }

  /**
   * Handle collision enter
   * @private
   */
  // Collision handling is now done directly via entity hooks in addCharacter
  // These methods are no longer needed as PhysicsEngine handles collisions internally

  /**
   * Add a zone
   * @private
   */
  private addZone(id: string, options: ZoneOptions): string {
    // Check if the requested public zone id conflicts with an entity id.
    if (this.physic.getEntityByUUID(id)) {
      throw new Error(`Zone with id ${id} already exists as entity`);
    }

    const radius = options.radius;
    if (typeof radius !== "number" || radius <= 0) {
      throw new Error("Zone radius must be a positive number");
    }

    // If linkedTo is specified, get the entity
    let attachedEntity: Entity | undefined;
    if (options.linkedTo) {
      attachedEntity = this.physic.getEntityByUUID(options.linkedTo);
      if (!attachedEntity) {
        throw new Error(`Cannot link zone to unknown entity ${options.linkedTo}`);
      }
    }

    const zoneId = this.physic.createSensor(id, attachedEntity
      ? {
        entity: attachedEntity,
        radius,
        angle: options.angle ?? 360,
        direction: options.direction ?? 'down',
        limitedByWalls: options.limitedByWalls ?? false,
      }
      : {
        position: { x: options.x ?? 0, y: options.y ?? 0 },
        radius,
        angle: options.angle ?? 360,
        direction: options.direction ?? 'down',
        limitedByWalls: options.limitedByWalls ?? false,
      });

    // Store zone ID mapping
    (this as any)._zoneIdMap = (this as any)._zoneIdMap || new Map();
    (this as any)._zoneIdMap.set(id, zoneId);

    return id;
  }

  /**
   * Remove a zone
   * @private
   */
  private removeZone(id: string): boolean {
    const zoneIdMap = (this as any)._zoneIdMap;
    if (!zoneIdMap) return false;

    const zoneId = zoneIdMap.get(id);
    if (!zoneId) return false;

    const zoneManager = this.physic.getZoneManager();
    zoneManager.removeZone(zoneId);
    zoneIdMap.delete(id);
    return true;
  }

  /**
   * Get a zone
   * @private
   */
  private getZone(id: string): any {
    const zoneIdMap = (this as any)._zoneIdMap;
    if (!zoneIdMap) return undefined;

    const zoneId = zoneIdMap.get(id);
    if (!zoneId) return undefined;

    const zoneManager = this.physic.getZoneManager();
    return zoneManager.getZone(zoneId);
  }

  /**
   * Register zone events
   * @private
   */
  private registerZoneEvents(
    id: string,
    onEnter?: (hitIds: string[]) => void,
    onExit?: (hitIds: string[]) => void,
  ): boolean {
    const zoneIdMap = (this as any)._zoneIdMap;
    if (!zoneIdMap) return false;

    const zoneId = zoneIdMap.get(id);
    if (!zoneId) return false;

    const zoneManager = this.physic.getZoneManager();

    // Use registerCallbacks to update callbacks
    const callbacks: { onEnter?: (entities: Entity[]) => void; onExit?: (entities: Entity[]) => void } = {};
    if (onEnter) {
      callbacks.onEnter = (entities: Entity[]) => {
        onEnter(entities.map(e => e.uuid));
      };
    }
    if (onExit) {
      callbacks.onExit = (entities: Entity[]) => {
        onExit(entities.map(e => e.uuid));
      };
    }

    return zoneManager.registerCallbacks(zoneId, callbacks);
  }

  /**
   * Run post-tick updates (update zones)
   * @private
   */
  private runPostTickUpdates(): void {
    // Position sync is now handled automatically by entity.onPositionChange hooks
    // Movement callbacks are also handled in the onPositionChange handler

    // Update zones
    const zoneManager = this.physic.getZoneManager();
    zoneManager.update();
  }
}
