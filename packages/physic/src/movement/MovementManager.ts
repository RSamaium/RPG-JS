import { PhysicsEngine } from '../api/PhysicsEngine';
import { Entity } from '../physics/Entity';
import { EntityMovementBody } from './adapters/EntityMovementBody';
import { MovementBody, MovementStrategy, MovementOptions } from './MovementStrategy';
import { Dash } from './strategies/Dash';
import { IceMovement } from './strategies/IceMovement';
import { Knockback } from './strategies/Knockback';
import { LinearMove } from './strategies/LinearMove';
import { LinearRepulsion } from './strategies/LinearRepulsion';
import { Oscillate } from './strategies/Oscillate';
import { PathFollow } from './strategies/PathFollow';
import { ProjectileMovement, ProjectileOptions, ProjectileType } from './strategies/ProjectileMovement';
import { SeekAvoid } from './strategies/SeekAvoid';

/**
 * Resolves an entity from an identifier.
 *
 * When provided to the movement manager, the resolver enables ergonomic calls
 * that pass a string identifier instead of the `Entity` instance.
 *
 * @example
 * ```typescript
 * const manager = new MovementManager((id) => engine.getEntityByUUID(id));
 * manager.add(player.uuid, new Dash(6, { x: 1, y: 0 }, 0.2));
 * ```
 */
export type EntityResolver = (id: string) => MovementBody | undefined;

/**
 * Internal entry for tracking a strategy with its options and Promise resolver
 */
interface StrategyEntry {
  strategy: MovementStrategy;
  options?: MovementOptions;
  resolve?: () => void;
  handleState?: MovementHandleState;
  started: boolean;
  stopOnComplete: boolean;
}

interface MovementEntry {
  body: MovementBody;
  strategies: StrategyEntry[];
}

interface MovementHandleState {
  active: boolean;
  resolve: () => void;
}

export interface MovementHandle {
  /** Identifier of the body controlled by this movement. */
  readonly targetId: string;
  /** Strategy instance registered by the helper. */
  readonly strategy: MovementStrategy;
  /** Resolves when the movement finishes naturally or is cancelled. */
  readonly finished: Promise<void>;
  /** Removes the strategy without firing onComplete. */
  cancel(): boolean;
  /** Returns true while the strategy is still registered. */
  isActive(): boolean;
}

export interface MovementHelperOptions extends MovementOptions {
  /** Remove existing strategies for the target before adding this movement (default: true). */
  replace?: boolean;
  /** Set velocity to zero when the strategy finishes naturally. */
  stopOnComplete?: boolean;
}

export interface DashOptions extends MovementHelperOptions {
  speed: number;
  direction: { x: number; y: number };
  duration: number;
}

export interface KnockbackOptions extends MovementHelperOptions {
  direction: { x: number; y: number };
  speed: number;
  duration: number;
  decayFactor?: number;
}

export interface LinearMoveOptions extends MovementHelperOptions {
  velocity: { x: number; y: number };
  duration?: number;
}

export interface PathFollowOptions extends MovementHelperOptions {
  waypoints: Array<{ x: number; y: number }>;
  speed: number;
  loop?: boolean;
  pauseAtWaypoints?: number;
  tolerance?: number;
}

export interface OscillateOptions extends MovementHelperOptions {
  direction: { x: number; y: number };
  amplitude: number;
  period: number;
  type?: 'linear' | 'sine' | 'circular';
  duration?: number;
}

export interface IceOptions extends MovementHelperOptions {
  direction: { x: number; y: number };
  maxSpeed?: number;
  acceleration?: number;
  friction?: number;
  duration?: number;
  initialVelocity?: { x: number; y: number };
}

export interface SeekAvoidOptions extends MovementHelperOptions {
  target: Entity | string | (() => Entity | null | undefined);
  maxSpeed?: number;
  repulseRadius?: number;
  repulseWeight?: number;
  arriveRadius?: number;
}

export interface LinearRepulsionOptions extends MovementHelperOptions {
  target: { x: number; y: number } | (() => { x: number; y: number });
  maxSpeed?: number;
  repulseRadius?: number;
  repulseWeight?: number;
  ignoredEntity?: Entity | string | (() => Entity | undefined);
}

export interface ProjectileMovementHelperOptions extends MovementHelperOptions, ProjectileOptions {
  type: ProjectileType;
}

/**
 * Manages movement strategies assigned to entities.
 *
 * The manager executes strategies before each physics step, removes completed
 * behaviours and exposes utilities to inspect and maintain assignments.
 *
 * @example
 * ```typescript
 * const manager = new MovementManager((id) => engine.getEntityByUUID(id));
 * manager.dash(playerEntity, {
 *   speed: 240,
 *   direction: { x: 1, y: 0 },
 *   duration: 0.15,
 * });
 *
 * // Game loop
 * manager.update(deltaSeconds);
 * engine.step();
 * ```
 */
export class MovementManager {
  private readonly entries: Map<string, MovementEntry> = new Map();
  private readonly entityWrappers = new WeakMap<Entity, EntityMovementBody>();
  /** Identifiers of the bodies whose strategies are not updated (see {@link pause}) */
  private readonly paused: Set<string> = new Set();

  constructor(
    private readonly resolveEntity?: EntityResolver,
    private readonly engine?: PhysicsEngine,
  ) {}

  /**
   * Convenience factory that binds the manager to a physics engine.
   *
   * @param engine - Physics engine whose entities will be controlled
   * @returns A movement manager configured with an entity resolver
   */
  static forEngine(engine: PhysicsEngine): MovementManager {
    let manager: MovementManager;
    manager = new MovementManager((id) => {
      const entity = engine.getEntityByUUID(id);
      return entity ? manager.wrapEntity(entity) : undefined;
    }, engine);
    return manager;
  }

  /**
   * Adds a movement strategy to an entity.
   * 
   * Returns a Promise that resolves when the movement completes (when `isFinished()` returns true).
   * If the strategy doesn't implement `isFinished()`, the Promise resolves immediately after adding.
   *
   * @param target - Entity instance or entity UUID when a resolver is configured
   * @param strategy - Strategy to execute
   * @param options - Optional callbacks for movement lifecycle events
   * @returns Promise that resolves when the movement completes
   * 
   * @example
   * ```typescript
   * // Simple usage - fire and forget
   * manager.add(player, new Dash(240, { x: 1, y: 0 }, 0.15));
   * 
   * // React to completion after the tick loop has advanced the strategy
   * manager.add(player, new Dash(240, { x: 1, y: 0 }, 0.15))
   *   .then(() => console.log('Dash finished!'));
   * 
   * // With callbacks
   * manager.add(player, new Knockback({ x: -1, y: 0 }, 180, 0.25), {
   *   onStart: () => {
   *     player.directionFixed = true;
   *     player.animationFixed = true;
   *   },
   *   onComplete: () => {
   *     player.directionFixed = false;
   *     player.animationFixed = false;
   *   }
   * });
   * ```
   */
  add(target: Entity | MovementBody | string, strategy: MovementStrategy, options?: MovementOptions): Promise<void> {
    const body = this.resolveTarget(target);
    const entry = this.addEntry(body, strategy, options, false);

    return new Promise<void>((resolve) => {
      entry.resolve = resolve;
      if (!strategy.isFinished) {
        resolve();
      }
    });
  }

  dash(target: Entity | MovementBody | string, options: DashOptions): MovementHandle {
    return this.addWithHandle(
      target,
      new Dash(options.speed, options.direction, options.duration),
      options,
      options.stopOnComplete ?? true,
    );
  }

  knockback(target: Entity | MovementBody | string, options: KnockbackOptions): MovementHandle {
    return this.addWithHandle(
      target,
      new Knockback(options.direction, options.speed, options.duration, options.decayFactor),
      options,
      options.stopOnComplete ?? true,
    );
  }

  linearMove(target: Entity | MovementBody | string, options: LinearMoveOptions): MovementHandle {
    return this.addWithHandle(
      target,
      new LinearMove(options.velocity, options.duration),
      options,
      options.stopOnComplete ?? false,
    );
  }

  followPath(target: Entity | MovementBody | string, options: PathFollowOptions): MovementHandle {
    return this.addWithHandle(
      target,
      new PathFollow(
        options.waypoints,
        options.speed,
        options.loop ?? false,
        options.pauseAtWaypoints ?? 0,
        options.tolerance ?? 0.1,
      ),
      options,
      options.stopOnComplete ?? false,
    );
  }

  oscillate(target: Entity | MovementBody | string, options: OscillateOptions): MovementHandle {
    return this.addWithHandle(
      target,
      new Oscillate(
        options.direction,
        options.amplitude,
        options.period,
        options.type ?? 'sine',
        options.duration,
      ),
      options,
      options.stopOnComplete ?? false,
    );
  }

  ice(target: Entity | MovementBody | string, options: IceOptions): MovementHandle {
    return this.addWithHandle(
      target,
      new IceMovement(
        options.direction,
        options.maxSpeed,
        options.acceleration,
        options.friction,
        options.duration,
        options.initialVelocity,
      ),
      options,
      options.stopOnComplete ?? false,
    );
  }

  seekAvoid(target: Entity | MovementBody | string, options: SeekAvoidOptions): MovementHandle {
    return this.addWithHandle(
      target,
      new SeekAvoid(
        this.requireEngine(),
        () => this.resolveEntityProvider(options.target),
        options.maxSpeed,
        options.repulseRadius,
        options.repulseWeight,
        options.arriveRadius,
      ),
      options,
      options.stopOnComplete ?? false,
    );
  }

  linearRepulsion(target: Entity | MovementBody | string, options: LinearRepulsionOptions): MovementHandle {
    const ignoredEntity = options.ignoredEntity;
    return this.addWithHandle(
      target,
      new LinearRepulsion(
        this.requireEngine(),
        typeof options.target === 'function' ? options.target : () => options.target as { x: number; y: number },
        options.maxSpeed,
        options.repulseRadius,
        options.repulseWeight,
        ignoredEntity ? () => this.resolveOptionalEntity(ignoredEntity) : undefined,
      ),
      options,
      options.stopOnComplete ?? false,
    );
  }

  projectile(target: Entity | MovementBody | string, options: ProjectileMovementHelperOptions): MovementHandle {
    const { type, replace, stopOnComplete, onStart, onComplete, ...projectileOptions } = options;
    const helperOptions: MovementHelperOptions = {};
    if (replace !== undefined) helperOptions.replace = replace;
    if (stopOnComplete !== undefined) helperOptions.stopOnComplete = stopOnComplete;
    if (onStart !== undefined) helperOptions.onStart = onStart;
    if (onComplete !== undefined) helperOptions.onComplete = onComplete;
    return this.addWithHandle(
      target,
      new ProjectileMovement(type, projectileOptions),
      helperOptions,
      stopOnComplete ?? true,
    );
  }

  isMoving(target: Entity | MovementBody | string): boolean {
    return this.hasActiveStrategies(target);
  }

  count(target: Entity | MovementBody | string): number {
    const body = this.resolveTarget(target);
    return this.entries.get(body.id)?.strategies.length ?? 0;
  }

  stop(target: Entity | MovementBody | string): void {
    this.stopMovement(target);
  }

  private addWithHandle(
    target: Entity | MovementBody | string,
    strategy: MovementStrategy,
    options: MovementHelperOptions,
    defaultStopOnComplete: boolean,
  ): MovementHandle {
    const body = this.resolveTarget(target);
    if (options.replace ?? true) {
      this.clear(body);
    }

    return this.addHandleEntry(body, strategy, options, defaultStopOnComplete);
  }

  private createHandle(
    body: MovementBody,
    strategy: MovementStrategy,
    finished: Promise<void>,
  ): MovementHandle {
    return {
      targetId: body.id,
      strategy,
      finished,
      cancel: () => this.remove(body, strategy),
      isActive: () => this.entries.get(body.id)?.strategies.some((entry) => entry.strategy === strategy) ?? false,
    };
  }

  private addEntry(
    body: MovementBody,
    strategy: MovementStrategy,
    options: MovementOptions | undefined,
    stopOnComplete: boolean,
    handleState?: MovementHandleState,
  ): StrategyEntry {
    const key = body.id;

    if (!this.entries.has(key)) {
      this.entries.set(key, { body, strategies: [] });
    }

    const entry: StrategyEntry = {
      strategy,
      started: false,
      stopOnComplete,
    };
    if (options) {
      entry.options = options;
    }
    if (handleState) {
      entry.handleState = handleState;
    }
    this.entries.get(key)!.strategies.push(entry);
    return entry;
  }

  private addHandleEntry(
    body: MovementBody,
    strategy: MovementStrategy,
    options: MovementHelperOptions,
    stopOnComplete: boolean,
  ): MovementHandle {
    let resolveFinished: () => void = () => {};
    const finished = new Promise<void>((resolve) => {
      resolveFinished = resolve;
    });
    const handleState: MovementHandleState = {
      active: true,
      resolve: resolveFinished,
    };
    this.addEntry(body, strategy, options, stopOnComplete, handleState);
    return this.createHandle(body, strategy, finished);
  }

  /**
   * Removes a specific strategy from an entity.
   * 
   * Note: This will NOT trigger the onComplete callback or resolve the Promise.
   * Use this when you want to cancel a movement without completion.
   *
   * @param target - Entity instance or identifier
   * @param strategy - Strategy instance to remove
   * @returns True when the strategy has been removed
   */
  remove(target: Entity | MovementBody | string, strategy: MovementStrategy): boolean {
    const body = this.resolveTarget(target);
    const entry = this.entries.get(body.id);
    if (!entry) {
      return false;
    }

    const index = entry.strategies.findIndex(e => e.strategy === strategy);
    if (index === -1) {
      return false;
    }

    const [removed] = entry.strategies.splice(index, 1);
    if (removed) {
      this.finishHandle(removed);
    }
    if (entry.strategies.length === 0) {
      this.entries.delete(body.id);
    }
    return true;
  }

  /**
   * Removes all strategies from an entity.
   *
   * @param target - Entity or identifier
   */
  clear(target: Entity | MovementBody | string): void {
    const body = this.resolveTarget(target);
    const entry = this.entries.get(body.id);
    if (!entry) {
      return;
    }
    for (const strategyEntry of entry.strategies) {
      this.finishHandle(strategyEntry);
    }
    this.entries.delete(body.id);
  }

  /**
   * Stops all movement for an entity immediately
   * 
   * This method completely stops an entity's movement by:
   * - Removing all active movement strategies (dash, linear moves, etc.)
   * - Stopping the entity's velocity and angular velocity
   * - Clearing accumulated forces
   * - Waking up the entity if it was sleeping
   * 
   * This is useful when changing maps, teleporting, or when you need
   * to halt an entity's movement completely without making it static.
   * 
   * @param target - Entity, MovementBody, or identifier
   * 
   * @example
   * ```ts
   * // Stop movement when changing maps
   * if (mapChanged) {
   *   movement.stopMovement(playerEntity);
   * }
   * 
   * // Stop movement after teleporting
   * entity.position.set(100, 200);
   * movement.stopMovement(entity);
   * 
   * // Stop movement when player dies
   * if (player.isDead()) {
   *   movement.stopMovement(playerEntity);
   * }
   * ```
   */
  stopMovement(target: Entity | MovementBody | string): void {
    const body = this.resolveTarget(target);
    
    // Remove all movement strategies
    this.clear(target);
    
    // If the body wraps an Entity, stop its movement directly
    if ('getEntity' in body && typeof (body as any).getEntity === 'function') {
      const entity = (body as any).getEntity();
      if (entity && typeof entity.stopMovement === 'function') {
        entity.stopMovement();
      }
    }
  }

  /**
   * Pauses the strategies of an entity: they stay registered, keep their state, and are no longer updated.
   *
   * Use it for an entity that nothing observes (an NPC far from every player): its route costs nothing while it is
   * paused, and it goes on from where it stopped after {@link resume}. No time passes for a paused strategy, so a
   * timed movement (a dash, a knockback) does not expire. When the entity is known, it is put to sleep so that the
   * velocity set by the last update does not keep moving it.
   *
   * Pausing an identifier with no entity or no strategy is allowed: strategies added later are paused too.
   *
   * @param target - Entity, movement body, or identifier
   *
   * @example
   * ```ts
   * manager.pause(npc);
   * manager.update(1 / 60); // the route of the NPC is not advanced
   * manager.resume(npc);
   * ```
   */
  pause(target: Entity | MovementBody | string): void {
    this.paused.add(this.resolveKey(target));
    this.resolveKnownEntity(target)?.sleep();
  }

  /**
   * Resumes the strategies of an entity paused with {@link pause}, and wakes the entity up.
   *
   * @param target - Entity, movement body, or identifier
   * @returns True when the entity was paused
   */
  resume(target: Entity | MovementBody | string): boolean {
    const wasPaused = this.paused.delete(this.resolveKey(target));
    if (wasPaused) {
      this.resolveKnownEntity(target)?.wakeUp();
    }
    return wasPaused;
  }

  /**
   * Checks if the strategies of an entity are paused.
   *
   * @param target - Entity, movement body, or identifier
   * @returns True when the entity was paused with {@link pause}
   */
  isPaused(target: Entity | MovementBody | string): boolean {
    return this.paused.has(this.resolveKey(target));
  }

  /**
   * Checks if an entity has active strategies.
   *
  * @param target - Entity or identifier
  * @returns True when strategies are registered
   */
  hasActiveStrategies(target: Entity | MovementBody | string): boolean {
    const body = this.resolveTarget(target);
    return (this.entries.get(body.id)?.strategies.length ?? 0) > 0;
  }

  /**
   * Returns a snapshot of the strategies assigned to an entity.
   *
   * @param target - Entity or identifier
   * @returns Copy of the strategies array (empty array when none)
   */
  getStrategies(target: Entity | MovementBody | string): MovementStrategy[] {
    const body = this.resolveTarget(target);
    const entry = this.entries.get(body.id);
    return entry ? entry.strategies.map(e => e.strategy) : [];
  }

  /**
   * Updates all registered strategies.
   *
   * Call this method once per frame before `PhysicsEngine.step()` so that the
   * physics simulation integrates the velocities that strategies configure.
   * 
   * This method handles the movement lifecycle:
   * - Triggers `onStart` callback on first update
   * - Calls `strategy.update()` each frame
   * - When `isFinished()` returns true:
   *   - Calls `strategy.onFinished()` if defined
   *   - Triggers `onComplete` callback
   *   - Resolves the Promise returned by `add()`
   *
   * @param dt - Time delta in seconds
   */
  update(dt: number): void {
    for (const [key, entry] of this.entries) {
      const { body, strategies } = entry;

      if (strategies.length === 0) {
        this.entries.delete(key);
        continue;
      }

      if (this.paused.has(key)) {
        continue;
      }

      for (let i = strategies.length - 1; i >= 0; i -= 1) {
        const strategyEntry = strategies[i];
        if (!strategyEntry) {
          continue;
        }

        const { strategy, options, resolve } = strategyEntry;

        // Trigger onStart on first update
        if (!strategyEntry.started) {
          strategyEntry.started = true;
          options?.onStart?.();
        }

        strategy.update(body, dt);

        const isFinished = strategy.isFinished?.();

        if (isFinished) {
          strategies.splice(i, 1);
          
          // Call strategy's own onFinished callback
          strategy.onFinished?.();

          if (strategyEntry.stopOnComplete) {
            body.setVelocity({ x: 0, y: 0 });
          }
          
          // Call options onComplete callback
          options?.onComplete?.();
          
          // Resolve the Promise
          resolve?.();
          this.finishHandle(strategyEntry);
        }
      }

      if (strategies.length === 0) {
        this.entries.delete(key);
      }
    }
  }

  /**
   * Removes all strategies from all entities.
   */
  clearAll(): void {
    for (const entry of this.entries.values()) {
      for (const strategyEntry of entry.strategies) {
        this.finishHandle(strategyEntry);
      }
    }
    this.entries.clear();
  }

  private finishHandle(entry: StrategyEntry): void {
    const state = entry.handleState;
    if (!state || !state.active) {
      return;
    }
    state.active = false;
    state.resolve();
  }

  private requireEngine(): PhysicsEngine {
    if (!this.engine) {
      throw new Error('MovementManager: this helper requires a manager created with MovementManager.forEngine(engine).');
    }
    return this.engine;
  }

  private resolveEntityProvider(target: Entity | string | (() => Entity | null | undefined)): Entity | null | undefined {
    if (typeof target === 'function') {
      return target();
    }
    if (target instanceof Entity) {
      return target;
    }
    return this.resolveOptionalEntity(target);
  }

  private resolveOptionalEntity(target: Entity | string | (() => Entity | undefined)): Entity | undefined {
    if (typeof target === 'function') {
      return target();
    }
    if (target instanceof Entity) {
      return target;
    }
    const body = this.resolveEntity?.(target);
    return body?.getEntity?.() ?? undefined;
  }

  /** Identifier of a target, without requiring the entity to exist. */
  private resolveKey(target: Entity | MovementBody | string): string {
    if (typeof target === 'string') {
      return target;
    }
    return target instanceof Entity ? target.uuid : target.id;
  }

  /** Entity of a target when there is one; never throws. */
  private resolveKnownEntity(target: Entity | MovementBody | string): Entity | undefined {
    if (target instanceof Entity) {
      return target;
    }
    const body = typeof target === 'string' ? this.resolveEntity?.(target) : target;
    const entity = (body as { getEntity?: () => Entity | undefined } | undefined)?.getEntity?.();
    return entity ?? undefined;
  }

  private resolveTarget(target: Entity | MovementBody | string): MovementBody {
    if (this.isMovementBody(target)) {
      return target;
    }

    if (target instanceof Entity) {
      return this.wrapEntity(target);
    }

    if (!this.resolveEntity) {
      throw new Error('MovementManager: cannot resolve entity from identifier without a resolver.');
    }

    const entity = this.resolveEntity(target);
    if (!entity) {
      throw new Error(`MovementManager: unable to resolve entity for identifier ${target}.`);
    }
    return entity;
  }

  private wrapEntity(entity: Entity): EntityMovementBody {
    let wrapper = this.entityWrappers.get(entity);
    if (!wrapper) {
      wrapper = new EntityMovementBody(entity);
      this.entityWrappers.set(entity, wrapper);
    }
    return wrapper;
  }

  private isMovementBody(value: unknown): value is MovementBody {
    return Boolean(
      value &&
      typeof value === 'object' &&
      'id' in value &&
      'setVelocity' in value &&
      typeof (value as MovementBody).setVelocity === 'function',
    );
  }
}
