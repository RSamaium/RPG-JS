import { Direction, ProjectileSystem, Vector2, type ProjectileState, type RaycastHit, type Entity } from "@rpgjs/common";
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
    };

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
  remainingDelay: number;
}

export type NetworkProjectile = Omit<ProjectileServerState, "payload"> & ProjectileCollisionOptions;

interface NetworkProjectileImpact {
  id: string;
  targetId?: string;
  x: number;
  y: number;
  distance: number;
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
    this.flush();
  }

  clear(): void {
    this.pending.length = 0;
    this.runtime.clear();
    this.networkRuntime.clear();
    this.spawnQueue.length = 0;
    this.impactQueue.length = 0;
    this.destroyQueue.length = 0;
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
      const speed = trajectory.type === "instant" ? Number.MAX_SAFE_INTEGER : trajectory.speed;
      const ttl = trajectory.type === "instant" ? 0.1 : trajectory.ttl ?? trajectory.range / trajectory.speed;
      return {
        id,
        type: options.type,
        ownerId: owner?.id,
        origin,
        direction,
        speed,
        range: trajectory.range,
        ttl,
        spawnTick: (this.map as any).getTick(),
        delay: interval * index,
        index,
        count,
        payload: options.payload,
        params: options.params,
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
      filter: (entity) => this.canHit(entity, projectile, pending),
    });
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
    this.impactQueue.push(toNetworkImpact(projectile.id, hit));
    this.callHook("server-projectiles-onImpact", {
      projectile,
      owner: projectile.ownerId ? (this.map as any).getPlayer(projectile.ownerId) : undefined,
      target,
      hit,
      map: this.map,
    });
  }

  private handleDestroy(projectile: ProjectileState, reason: string, hit?: RaycastHit): void {
    const state = this.runtime.get(projectile.id);
    if (!state) {
      return;
    }
    this.handleDestroyState(state, reason, hit);
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
