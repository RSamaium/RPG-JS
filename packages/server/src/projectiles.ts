import {
  Direction,
  ProjectileSystem,
  Vector2,
  reflectDirection,
  sampleTrajectory,
  type Entity,
  type ProjectileHitResolution,
  type ProjectileState,
  type RaycastHit,
  type TrajectoryContext,
} from "@rpgjs/common";
import { lastValueFrom } from "rxjs";
import type { RpgPlayer } from "./Player/Player";
import type { RpgMap } from "./rooms/map";

export type ProjectileTrajectory =
  | {
      type?: "linear";
      speed: number;
      range: number;
      ttl?: number;
    }
  | {
      type: "instant";
      range: number;
    }
  | {
      /** Lob landing at `range`, peaking at `height`. Flies over entities by default. */
      type: "arc";
      range: number;
      /** Flight time in seconds. Derived from `speed` when omitted. */
      duration?: number;
      speed?: number;
      height?: number;
      ttl?: number;
    }
  | {
      /** Goes out to `range`, then flies back to the launcher. */
      type: "return";
      speed: number;
      range: number;
      ttl?: number;
    }
  | {
      /** A trajectory registered with `defineTrajectory()`. */
      type: string;
      ttl?: number;
      [param: string]: unknown;
    };

/**
 * What a projectile collides with while it flies.
 * - `always`: entities and walls (default, except for `arc`);
 * - `walls`: only static obstacles;
 * - `none`: nothing until it ends (default for `arc`).
 */
export type ProjectileCollideMode = "always" | "walls" | "none";

/**
 * What a projectile does when it hits a wall (a static obstacle):
 * `stop` (default), `bounce`, `return` (flies back to the launcher) or
 * `stick` (stays planted, see `linger`).
 */
export type ProjectileWallBehavior = "stop" | "bounce" | "return" | "stick";

export interface ProjectileEndHookContext extends ProjectileHookContext {
  /** `range`, `land`, `return`, `end`, `hit`, `ttl`... */
  reason: string;
  x: number;
  y: number;
}

export interface ProjectileRepeatOptions {
  count: number;
  interval?: number;
  spread?: number;
  seed?: number | true;
}

export type ProjectilePatternOptions =
  | {
      type: "cone";
      count: number;
      angle: number;
    }
  | {
      type: "circle";
      count: number;
    };

export interface ProjectileCollisionOptions {
  collisionMask?: number;
  ignoreOwner?: boolean;
  predictImpact?: boolean;
}

export interface ProjectileEmitOptions {
  id?: string;
  type: string;
  origin?: { x: number; y: number };
  direction?: Direction | { x: number; y: number };
  /**
   * Random direction offset in degrees, applied as +/- half this value.
   * Use it for inaccurate shots, arrows, spells, or bullets.
   */
  spreadDegrees?: number;
  /**
   * Convenience precision value from 0 to 1. Ignored when `spreadDegrees` is set.
   * `1` is perfectly accurate, `0` can deviate up to 30 degrees.
   */
  accuracy?: number;
  trajectory: ProjectileTrajectory;
  collision?: ProjectileCollisionOptions;
  repeat?: ProjectileRepeatOptions;
  pattern?: ProjectilePatternOptions;
  payload?: Record<string, unknown>;
  params?: Record<string, unknown>;
  canHit?: (context: ProjectileCanHitContext) => boolean;
  /** What the projectile collides with in flight. */
  collide?: ProjectileCollideMode;
  /** Fly through targets: `true` for all of them, or a maximum number of hits. */
  pierce?: boolean | number;
  /** Behavior against walls. */
  wall?: ProjectileWallBehavior;
  /** Keep the projectile visible where it ended (a fuse, a planted arrow). */
  linger?: { ms: number };
  /** Called on the server when the projectile hits an entity. */
  onHit?: (context: ProjectileImpactHookContext) => void;
  /** Called on the server when the projectile hits a wall. */
  onWall?: (context: ProjectileImpactHookContext) => void;
  /** Called when an `arc` projectile lands. */
  onLand?: (context: ProjectileEndHookContext) => void;
  /** Called once when the projectile is gone, after `linger`. */
  onEnd?: (context: ProjectileEndHookContext) => void;
}

export interface ProjectileCanHitContext {
  projectile: ProjectileServerState;
  owner?: RpgPlayer;
  target?: RpgPlayer | any;
  entity: Entity;
  map: RpgMap;
}

export interface ProjectileServerState {
  id: string;
  type: string;
  ownerId?: string;
  origin: { x: number; y: number };
  direction: { x: number; y: number };
  speed: number;
  range: number;
  ttl: number;
  spawnTick: number;
  delay: number;
  index: number;
  count: number;
  payload?: Record<string, unknown>;
  params?: Record<string, unknown>;
  /** Trajectory name and parameters, sampled the same way by the client. */
  trajectory: { type: string; [param: string]: unknown };
}

export interface ProjectileHookContext {
  projectile: ProjectileServerState;
  owner?: RpgPlayer;
  map: RpgMap;
}

export interface ProjectileImpactHookContext extends ProjectileHookContext {
  target?: RpgPlayer | any;
  hit: RaycastHit;
}

export interface ProjectileDestroyHookContext extends ProjectileHookContext {
  reason: string;
  hit?: RaycastHit;
}

interface PendingProjectile {
  state: ProjectileServerState;
  config: {
    collisionMask?: number;
    ignoreOwner?: boolean;
    predictImpact?: boolean;
    canHit?: (context: ProjectileCanHitContext) => boolean;
  };
  options: ProjectileEmitOptions;
  remainingDelay: number;
}

/** Server-side bookkeeping of a flying projectile. */
interface ActiveProjectile {
  state: ProjectileServerState;
  options: ProjectileEmitOptions;
  context: TrajectoryContext;
  /** Age at which the current trajectory started (after a bounce). */
  ageOffset: number;
  hits: number;
  stuckAt?: { x: number; y: number };
  /** Remaining linger time in seconds, and the reason to report at the end. */
  linger?: { remaining: number; reason: string; x: number; y: number };
}

export type NetworkProjectile = Omit<ProjectileServerState, "payload"> & ProjectileCollisionOptions;

interface NetworkProjectileImpact {
  id: string;
  targetId?: string;
  x: number;
  y: number;
  distance: number;
}

interface NetworkProjectileUpdate {
  id: string;
  origin?: { x: number; y: number };
  direction?: { x: number; y: number };
  trajectory?: { type: string; [param: string]: unknown };
  /** Restart the trajectory clock from now. */
  restart?: boolean;
  /** Freeze the projectile at this point (a planted arrow). */
  stopAt?: { x: number; y: number };
}

interface NetworkProjectileDestroy {
  id: string;
  reason: string;
  targetId?: string;
  x?: number;
  y?: number;
  distance?: number;
}

function toPlainVector(vector: Vector2 | { x: number; y: number }): { x: number; y: number } {
  return { x: vector.x, y: vector.y };
}

function directionToVector(direction: Direction | { x: number; y: number } | undefined): { x: number; y: number } {
  if (!direction) {
    return { x: 0, y: 1 };
  }
  if (typeof direction === "object") {
    return direction;
  }
  switch (direction) {
    case Direction.Up:
      return { x: 0, y: -1 };
    case Direction.Down:
      return { x: 0, y: 1 };
    case Direction.Left:
      return { x: -1, y: 0 };
    case Direction.Right:
      return { x: 1, y: 0 };
    default:
      return { x: 0, y: 1 };
  }
}

function normalizeDirection(direction: { x: number; y: number }): { x: number; y: number } {
  const length = Math.hypot(direction.x, direction.y);
  if (!Number.isFinite(length) || length <= 0) {
    return { x: 0, y: 1 };
  }
  return { x: direction.x / length, y: direction.y / length };
}

function rotateDirection(direction: { x: number; y: number }, degrees: number): { x: number; y: number } {
  if (!Number.isFinite(degrees) || degrees === 0) {
    return direction;
  }
  const radians = degrees * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return normalizeDirection({
    x: direction.x * cos - direction.y * sin,
    y: direction.x * sin + direction.y * cos,
  });
}

function resolvePrecisionSpread(options: ProjectileEmitOptions): number {
  if (typeof options.spreadDegrees === "number") {
    return Math.max(0, options.spreadDegrees);
  }
  if (typeof options.accuracy === "number") {
    return (1 - Math.max(0, Math.min(1, options.accuracy))) * 30;
  }
  return 0;
}

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function resolveOwnerOrigin(owner?: RpgPlayer): { x: number; y: number } {
  if (!owner) {
    return { x: 0, y: 0 };
  }
  const hitbox = typeof (owner as any).hitbox === "function" ? (owner as any).hitbox() : undefined;
  return {
    x: owner.x() + (hitbox?.w ?? 0) / 2,
    y: owner.y() + (hitbox?.h ?? 0) / 2,
  };
}

function getOwnerDirection(owner?: RpgPlayer): Direction | undefined {
  if (!owner) {
    return undefined;
  }
  return typeof (owner as any).getDirection === "function"
    ? (owner as any).getDirection()
    : owner.direction?.();
}

function toNetworkProjectile(projectile: ProjectileServerState, config?: PendingProjectile["config"]): NetworkProjectile & {
  collisionMask?: number;
  ignoreOwner?: boolean;
  predictImpact?: boolean;
} {
  const network: NetworkProjectile & {
    collisionMask?: number;
    ignoreOwner?: boolean;
    predictImpact?: boolean;
  } = {
    id: projectile.id,
    type: projectile.type,
    origin: projectile.origin,
    direction: projectile.direction,
    speed: projectile.speed,
    range: projectile.range,
    ttl: projectile.ttl,
    spawnTick: projectile.spawnTick,
    delay: projectile.delay,
    index: projectile.index,
    count: projectile.count,
    trajectory: projectile.trajectory,
  };
  if (projectile.ownerId !== undefined) network.ownerId = projectile.ownerId;
  if (projectile.params !== undefined) network.params = projectile.params;
  if (config?.collisionMask !== undefined) network.collisionMask = config.collisionMask;
  if (config?.ignoreOwner !== undefined) network.ignoreOwner = config.ignoreOwner;
  if (config?.predictImpact !== undefined) {
    network.predictImpact = config.predictImpact;
  } else if (config?.canHit) {
    network.predictImpact = false;
  }
  return network;
}

function isWall(entity: Entity): boolean {
  return typeof (entity as any).isStatic === "function" && (entity as any).isStatic();
}

/** Speed, range and ttl used by the physics simulation of a trajectory. */
function resolveTrajectoryLimits(trajectory: ProjectileTrajectory): { speed: number; range: number; ttl: number } {
  const t = trajectory as Record<string, any>;
  const type = t.type ?? "linear";
  if (type === "instant") {
    return { speed: Number.MAX_SAFE_INTEGER, range: t.range, ttl: 0.1 };
  }
  const range = Number(t.range) || 0;
  const speed = Number(t.speed) || 0;
  if (type === "linear") {
    return { speed, range, ttl: t.ttl ?? range / speed };
  }
  if (type === "arc") {
    const duration = Number(t.duration) || (speed ? range / speed : 0.6);
    return { speed: speed || range / duration || 1, range: range || 1, ttl: t.ttl ?? duration + 0.5 };
  }
  if (type === "return") {
    return { speed, range, ttl: t.ttl ?? (speed ? (range * 4) / speed + 2 : 10) };
  }
  return { speed: speed || 1, range: range || Number.MAX_SAFE_INTEGER, ttl: t.ttl ?? 10 };
}

function toNetworkImpact(projectileId: string, hit: RaycastHit): NetworkProjectileImpact {
  return {
    id: projectileId,
    targetId: hit.entity.uuid,
    x: hit.point.x,
    y: hit.point.y,
    distance: hit.distance,
  };
}

export class RpgMapProjectiles {
  private readonly system: ProjectileSystem;
  private readonly pending: PendingProjectile[] = [];
  private readonly runtime = new Map<string, ProjectileServerState>();
  private readonly networkRuntime = new Map<string, NetworkProjectile>();
  private readonly spawnQueue: NetworkProjectile[] = [];
  private readonly impactQueue: NetworkProjectileImpact[] = [];
  private readonly destroyQueue: NetworkProjectileDestroy[] = [];
  private readonly updateQueue: NetworkProjectileUpdate[] = [];
  private readonly active = new Map<string, ActiveProjectile>();

  constructor(private readonly map: RpgMap) {
    this.system = new ProjectileSystem((map as any).physic);
    this.system.onHit(({ projectile, hit }) => this.handleHit(projectile, hit));
    this.system.onDestroy(({ projectile, reason, hit }) => this.handleDestroy(projectile, reason, hit));
  }

  emit(options: ProjectileEmitOptions, owner?: RpgPlayer): ProjectileServerState[] {
    const states = this.createStates(options, owner);
    for (const state of states) {
      const pending: PendingProjectile = {
        state,
        config: {
          collisionMask: options.collision?.collisionMask,
          ignoreOwner: options.collision?.ignoreOwner,
          predictImpact: options.collision?.predictImpact,
          canHit: options.canHit,
        },
        options,
        remainingDelay: state.delay,
      };
      this.runtime.set(state.id, state);
      const networkProjectile = toNetworkProjectile(state, pending.config);
      this.networkRuntime.set(state.id, networkProjectile);
      this.spawnQueue.push(networkProjectile);
      this.callHook("server-projectiles-onEmit", {
        projectile: state,
        owner,
        map: this.map,
      });

      if (state.delay <= 0) {
        this.spawnNow(pending);
      } else {
        this.pending.push(pending);
      }
    }
    this.flush();
    return states;
  }

  step(dt = 1 / 60): void {
    if (!Number.isFinite(dt) || dt <= 0) {
      return;
    }
    for (let i = this.pending.length - 1; i >= 0; i -= 1) {
      const pending = this.pending[i];
      pending.remainingDelay -= dt;
      if (pending.remainingDelay <= 0) {
        this.pending.splice(i, 1);
        this.spawnNow(pending);
      }
    }
    this.system.step(dt);
    this.stepLinger(dt);
    this.flush();
  }

  clear(): void {
    this.pending.length = 0;
    this.runtime.clear();
    this.networkRuntime.clear();
    this.spawnQueue.length = 0;
    this.impactQueue.length = 0;
    this.destroyQueue.length = 0;
    this.updateQueue.length = 0;
    this.active.clear();
    this.system.clear();
    this.map.$broadcast({
      type: "projectile:clear",
      value: {
        mapId: this.map.id,
      },
    });
  }

  /** Return client-safe descriptors for projectiles that are still authoritative. */
  getActiveNetworkProjectiles(): NetworkProjectile[] {
    return [...this.networkRuntime.values()];
  }

  private createStates(options: ProjectileEmitOptions, owner?: RpgPlayer): ProjectileServerState[] {
    const trajectory = options.trajectory;
    const origin = options.origin ?? resolveOwnerOrigin(owner);
    const baseDirection = normalizeDirection(directionToVector(options.direction ?? getOwnerDirection(owner)));
    const count = options.pattern?.count ?? options.repeat?.count ?? 1;
    const interval = Math.max(0, options.repeat?.interval ?? 0) / 1000;
    const seed = options.repeat?.seed === true
      ? Math.floor(Math.random() * 0xffffffff)
      : typeof options.repeat?.seed === "number"
        ? options.repeat.seed
        : undefined;
    const random = seed === undefined ? Math.random : createRandom(seed);

    return Array.from({ length: count }, (_, index) => {
      const direction = this.resolveIndexedDirection(baseDirection, options, index, count, random);
      const id = options.id && count === 1
        ? options.id
        : `${options.id ?? options.type}-${(this.map as any).getTick()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
      const { speed, range, ttl } = resolveTrajectoryLimits(trajectory);
      const { type: trajectoryType, ...trajectoryParams } = trajectory as { type?: string; [param: string]: unknown };
      return {
        id,
        type: options.type,
        ownerId: owner?.id,
        origin,
        direction,
        speed,
        range,
        ttl,
        spawnTick: (this.map as any).getTick(),
        delay: interval * index,
        index,
        count,
        payload: options.payload,
        params: options.params,
        trajectory: { ...trajectoryParams, type: trajectoryType ?? "linear" },
      };
    });
  }

  private resolveIndexedDirection(
    baseDirection: { x: number; y: number },
    options: ProjectileEmitOptions,
    index: number,
    count: number,
    random: () => number,
  ): { x: number; y: number } {
    let direction = baseDirection;
    if (options.pattern?.type === "circle") {
      direction = rotateDirection(baseDirection, (360 / count) * index);
    } else if (options.pattern?.type === "cone") {
      const total = options.pattern.angle;
      const step = count <= 1 ? 0 : total / (count - 1);
      direction = rotateDirection(baseDirection, -total / 2 + step * index);
    } else {
      const spread = options.repeat?.spread ?? 0;
      if (spread > 0) {
        direction = rotateDirection(baseDirection, (random() - 0.5) * spread);
      }
    }

    const precisionSpread = resolvePrecisionSpread(options);
    if (precisionSpread > 0) {
      direction = rotateDirection(direction, (random() - 0.5) * precisionSpread);
    }
    return direction;
  }

  private spawnNow(pending: PendingProjectile): void {
    const projectile = pending.state;
    if (projectile.speed === Number.MAX_SAFE_INTEGER) {
      this.spawnInstant(pending);
      return;
    }
    const { type, ...params } = projectile.trajectory;
    const active: ActiveProjectile = {
      state: projectile,
      options: pending.options,
      context: {
        origin: projectile.origin,
        direction: projectile.direction,
        params,
        owner: () => this.ownerCenter(projectile.ownerId),
      },
      ageOffset: 0,
      hits: 0,
    };
    this.active.set(projectile.id, active);
    const collide = pending.options.collide ?? (type === "arc" ? "none" : "always");
    this.system.spawn({
      id: projectile.id,
      ownerId: projectile.ownerId,
      origin: projectile.origin,
      direction: projectile.direction,
      speed: projectile.speed,
      range: projectile.range,
      ttl: projectile.ttl,
      spawnTick: projectile.spawnTick,
      collisionMask: pending.config.collisionMask,
      ignoreOwner: pending.config.ignoreOwner ?? true,
      metadata: {
        type: projectile.type,
      },
      path: this.pathOf(active),
      filter: (entity) => {
        if (collide === "none") return false;
        if (collide === "walls" && !isWall(entity)) return false;
        return this.canHit(entity, projectile, pending);
      },
      resolveHit: (hit, state) => this.resolveHit(active, hit, state),
    });
  }

  private pathOf(active: ActiveProjectile) {
    return (age: number) =>
      sampleTrajectory(active.state.trajectory.type, age - active.ageOffset, active.context);
  }

  private ownerCenter(ownerId?: string): { x: number; y: number } | undefined {
    if (!ownerId) return undefined;
    const owner = (this.map as any).getObjectById?.(ownerId) ?? (this.map as any).getPlayer?.(ownerId);
    if (!owner) return undefined;
    return resolveOwnerOrigin(owner);
  }

  /**
   * Decide what a projectile does after a hit: fly through a target, bounce,
   * come back or stay planted on a wall, or stop.
   */
  private resolveHit(active: ActiveProjectile, hit: RaycastHit, state: ProjectileState): ProjectileHitResolution {
    const { options } = active;
    if (!isWall(hit.entity)) {
      active.hits += 1;
      const pierce = options.pierce;
      if (pierce === true || (typeof pierce === "number" && active.hits < pierce)) {
        return "continue";
      }
      return "stop";
    }

    const point = { x: hit.point.x, y: hit.point.y };
    switch (options.wall ?? "stop") {
      case "bounce": {
        const direction = reflectDirection(state.direction, hit.normal);
        const params = { ...active.context.params };
        if (typeof params.range === "number") {
          const travelled = Math.hypot(point.x - active.context.origin.x, point.y - active.context.origin.y);
          params.range = Math.max(0, params.range - travelled);
        }
        this.rebase(active, state.age, { origin: point, direction, params, restart: true });
        return "redirect";
      }
      case "return": {
        if (active.state.trajectory.type === "return") {
          const range = Math.hypot(point.x - active.context.origin.x, point.y - active.context.origin.y);
          this.rebase(active, state.age, { params: { ...active.context.params, range } });
        } else {
          const direction = { x: -state.direction.x, y: -state.direction.y };
          this.rebase(active, state.age, { origin: point, direction, restart: true });
        }
        return "redirect";
      }
      case "stick":
        active.stuckAt = point;
        this.updateQueue.push({ id: active.state.id, stopAt: point });
        return "stop";
      default:
        return "stop";
    }
  }

  private rebase(
    active: ActiveProjectile,
    age: number,
    patch: { origin?: { x: number; y: number }; direction?: { x: number; y: number }; params?: Record<string, any>; restart?: boolean },
  ): void {
    if (patch.origin) active.context.origin = patch.origin;
    if (patch.direction) active.context.direction = patch.direction;
    if (patch.params) active.context.params = patch.params;
    if (patch.restart) active.ageOffset = age;
    active.state.trajectory = { ...active.context.params, type: active.state.trajectory.type };
    this.system.update(active.state.id, { path: this.pathOf(active) });
    const update: NetworkProjectileUpdate = { id: active.state.id, trajectory: active.state.trajectory };
    if (patch.origin) update.origin = patch.origin;
    if (patch.direction) update.direction = patch.direction;
    if (patch.restart) update.restart = true;
    this.updateQueue.push(update);
    const network = this.networkRuntime.get(active.state.id);
    if (network) {
      network.trajectory = active.state.trajectory;
      network.origin = active.context.origin;
      network.direction = active.context.direction;
    }
  }

  private stepLinger(dt: number): void {
    for (const active of this.active.values()) {
      if (!active.linger) continue;
      active.linger.remaining -= dt;
      if (active.linger.remaining <= 0) {
        const { reason, x, y } = active.linger;
        this.finish(active, reason, x, y);
      }
    }
  }

  private spawnInstant(pending: PendingProjectile): void {
    const projectile = pending.state;
    const hit = (this.map as any).physic.raycast(
      new Vector2(projectile.origin.x, projectile.origin.y),
      new Vector2(projectile.direction.x, projectile.direction.y),
      projectile.range,
      pending.config.collisionMask,
      (entity) => this.canHit(entity, projectile, pending),
    );
    if (hit) {
      this.handleHitState(projectile, hit);
    }
    this.handleDestroyState(projectile, hit ? "hit" : "range", hit ?? undefined);
  }

  private canHit(entity: Entity, projectile: ProjectileServerState, pending: PendingProjectile): boolean {
    if (projectile.ownerId && pending.config.ignoreOwner !== false && entity.uuid === projectile.ownerId) {
      return false;
    }
    if (!pending.config.canHit) {
      return true;
    }
    const target = (this.map as any).getObjectById(entity.uuid);
    return pending.config.canHit({
      projectile,
      owner: projectile.ownerId ? (this.map as any).getPlayer(projectile.ownerId) : undefined,
      target,
      entity,
      map: this.map,
    });
  }

  private handleHit(projectile: ProjectileState, hit: RaycastHit): void {
    const state = this.runtime.get(projectile.id);
    if (!state) {
      return;
    }
    this.handleHitState(state, hit);
  }

  private handleHitState(projectile: ProjectileServerState, hit: RaycastHit): void {
    const target = (this.map as any).getObjectById(hit.entity.uuid);
    const active = this.active.get(projectile.id);
    const context: ProjectileImpactHookContext = {
      projectile,
      owner: projectile.ownerId ? (this.map as any).getPlayer(projectile.ownerId) : undefined,
      target,
      hit,
      map: this.map,
    };
    // A planted projectile stays visible instead of playing its impact.
    if (!active?.stuckAt) {
      this.impactQueue.push(toNetworkImpact(projectile.id, hit));
    }
    if (isWall(hit.entity)) {
      active?.options.onWall?.(context);
    } else {
      active?.options.onHit?.(context);
    }
    this.callHook("server-projectiles-onImpact", context);
  }

  private handleDestroy(projectile: ProjectileState, reason: string, hit?: RaycastHit): void {
    const state = this.runtime.get(projectile.id);
    if (!state) {
      return;
    }
    const active = this.active.get(projectile.id);
    if (!active) {
      this.handleDestroyState(state, reason, hit);
      return;
    }
    const finalReason = reason === "end" ? this.naturalEndReason(active, projectile) : reason;
    const point = active.stuckAt ?? { x: projectile.position.x, y: projectile.position.y };
    if (finalReason === "land") {
      active.options.onLand?.({ projectile: state, owner: this.ownerOf(state), map: this.map, reason: finalReason, ...point });
    }
    const lingerMs = active.options.linger?.ms ?? 0;
    const lingers = lingerMs > 0 && (finalReason === "land" || finalReason === "range" || finalReason === "end" || !!active.stuckAt);
    if (lingers) {
      if (finalReason !== "hit" || active.stuckAt) {
        this.updateQueue.push({ id: state.id, stopAt: point });
      }
      active.linger = { remaining: lingerMs / 1000, reason: finalReason, ...point };
      return;
    }
    this.finish(active, finalReason, point.x, point.y, hit);
  }

  private naturalEndReason(active: ActiveProjectile, projectile: ProjectileState): string {
    const type = active.state.trajectory.type;
    if (type === "linear") return "range";
    if (type === "arc") return "land";
    const last = sampleTrajectory(type, projectile.age - active.ageOffset, active.context);
    return last.phase === "back" ? "return" : "end";
  }

  private ownerOf(state: ProjectileServerState): RpgPlayer | undefined {
    return state.ownerId ? (this.map as any).getPlayer(state.ownerId) : undefined;
  }

  private finish(active: ActiveProjectile, reason: string, x: number, y: number, hit?: RaycastHit): void {
    this.active.delete(active.state.id);
    this.handleDestroyState(active.state, reason, hit);
    active.options.onEnd?.({ projectile: active.state, owner: this.ownerOf(active.state), map: this.map, reason, x, y });
  }

  private handleDestroyState(projectile: ProjectileServerState, reason: string, hit?: RaycastHit): void {
    this.runtime.delete(projectile.id);
    this.networkRuntime.delete(projectile.id);
    const destroyed: NetworkProjectileDestroy = {
      id: projectile.id,
      reason,
    };
    if (hit) {
      Object.assign(destroyed, toNetworkImpact(projectile.id, hit));
    }
    this.destroyQueue.push(destroyed);
    this.callHook("server-projectiles-onDestroy", {
      projectile,
      owner: projectile.ownerId ? (this.map as any).getPlayer(projectile.ownerId) : undefined,
      reason,
      hit,
      map: this.map,
    });
  }

  private flush(): void {
    if (this.spawnQueue.length > 0) {
      this.map.$broadcast({
        type: "projectile:spawnBatch",
        value: {
          mapId: this.map.id,
          projectiles: this.spawnQueue.splice(0),
        },
      });
    }
    if (this.impactQueue.length > 0) {
      this.map.$broadcast({
        type: "projectile:impactBatch",
        value: {
          mapId: this.map.id,
          impacts: this.impactQueue.splice(0),
        },
      });
    }
    if (this.updateQueue.length > 0) {
      this.map.$broadcast({
        type: "projectile:updateBatch",
        value: {
          mapId: this.map.id,
          projectiles: this.updateQueue.splice(0),
        },
      });
    }
    if (this.destroyQueue.length > 0) {
      this.map.$broadcast({
        type: "projectile:destroyBatch",
        value: {
          mapId: this.map.id,
          projectiles: this.destroyQueue.splice(0),
        },
      });
    }
  }

  private callHook(hookId: string, context: any): void {
    void lastValueFrom(this.map.hooks.callHooks(hookId, context)).catch((error) => {
      console.error(`[RPGJS] Error during ${hookId}:`, error);
    });
  }
}

export class RpgPlayerProjectiles {
  constructor(private readonly player: RpgPlayer) {}

  emit(options: ProjectileEmitOptions): ProjectileServerState[] {
    const map = this.player.getCurrentMap();
    if (!map) {
      return [];
    }
    return map.projectiles.emit(options, this.player);
  }
}
