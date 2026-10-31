import { Vector2 } from '../core/math/Vector2';
import type { Entity } from '../physics/Entity';
import type { RaycastHit } from '../collision/raycast';
import type { PhysicsEngine } from '../api/PhysicsEngine';

export type ProjectileDestroyReason = 'hit' | 'range' | 'ttl' | 'manual' | 'end';

/**
 * Position of a projectile following a custom path, at a given age.
 * `done` ends the projectile with the `end` reason.
 */
export interface ProjectilePathPoint {
  x: number;
  y: number;
  done?: boolean;
}

/**
 * What a projectile does after hitting an entity:
 * - `stop` destroys it;
 * - `continue` keeps it flying and ignores that entity from now on (pierce);
 * - `redirect` keeps it flying on the path set by `update()` during the hit,
 *   for a bounce or an early return. The entity can be hit again later.
 */
export type ProjectileHitResolution = 'stop' | 'continue' | 'redirect';

export interface ProjectileSpawnConfig {
  id: string;
  ownerId?: string;
  origin: Vector2 | { x: number; y: number };
  direction: Vector2 | { x: number; y: number };
  speed: number;
  range?: number;
  ttl?: number;
  spawnTick?: number;
  collisionMask?: number;
  ignoreOwner?: boolean;
  filter?: (entity: Entity, projectile: ProjectileState) => boolean;
  metadata?: Record<string, unknown>;
  /**
   * Custom path sampled by age in seconds. When set, `speed` and `range` are
   * not used to move the projectile; collisions are tested on each segment.
   */
  path?: (age: number) => ProjectilePathPoint;
  /** Decide whether the projectile stops or keeps flying after a hit. */
  resolveHit?: (hit: RaycastHit, projectile: ProjectileState) => ProjectileHitResolution;
}

export interface ProjectileState {
  id: string;
  ownerId?: string;
  origin: Vector2;
  position: Vector2;
  direction: Vector2;
  speed: number;
  range: number;
  ttl: number;
  spawnTick: number;
  age: number;
  distanceTraveled: number;
  collisionMask?: number;
  ignoreOwner: boolean;
  metadata?: Record<string, unknown>;
}

export interface ProjectileSpawnEvent {
  projectile: ProjectileState;
}

export interface ProjectileHitEvent {
  projectile: ProjectileState;
  hit: RaycastHit;
}

export interface ProjectileDestroyEvent {
  projectile: ProjectileState;
  reason: ProjectileDestroyReason;
  hit?: RaycastHit;
}

export interface ProjectileSystemOptions {
  defaultTtl?: number;
  defaultRange?: number;
}

export type ProjectileHandler<T> = (event: T) => void;

interface ProjectileRecord {
  state: ProjectileState;
  filter?: (entity: Entity, projectile: ProjectileState) => boolean;
  path?: (age: number) => ProjectilePathPoint;
  resolveHit?: ProjectileSpawnConfig['resolveHit'];
  /** Entities already hit by a projectile that keeps flying. */
  hitEntities: Set<string>;
}

/** Maximum entities a projectile can pass through in one step. */
const MAX_HITS_PER_STEP = 8;

/**
 * Lightweight deterministic projectile simulation for server-authoritative RPGs.
 *
 * Projectiles are not registered as physics entities. Each step raycasts the
 * segment traveled by each projectile and emits spawn, hit, and destroy events.
 */
export class ProjectileSystem {
  private readonly projectiles = new Map<string, ProjectileRecord>();
  private readonly spawnHandlers = new Set<ProjectileHandler<ProjectileSpawnEvent>>();
  private readonly hitHandlers = new Set<ProjectileHandler<ProjectileHitEvent>>();
  private readonly destroyHandlers = new Set<ProjectileHandler<ProjectileDestroyEvent>>();

  constructor(
    private readonly engine: PhysicsEngine,
    private readonly options: ProjectileSystemOptions = {},
  ) {}

  public spawn(config: ProjectileSpawnConfig): ProjectileState {
    if (this.projectiles.has(config.id)) {
      throw new Error(`Projectile "${config.id}" already exists`);
    }

    const direction = this.toVector(config.direction).normalizeInPlace();
    if (direction.lengthSquared() === 0) {
      throw new Error('Projectile direction must be non-zero');
    }

    const speed = config.path ? config.speed || 1 : config.speed;
    if (!Number.isFinite(speed) || speed <= 0) {
      throw new Error('Projectile speed must be a positive number');
    }

    const rangeOption = config.range ?? this.options.defaultRange ?? (config.path ? Number.MAX_SAFE_INTEGER : undefined);
    if (rangeOption === undefined || !Number.isFinite(rangeOption) || rangeOption <= 0) {
      throw new Error('Projectile range must be a positive number');
    }

    const ttlOption = config.ttl ?? this.options.defaultTtl;
    if (ttlOption === undefined || !Number.isFinite(ttlOption) || ttlOption <= 0) {
      throw new Error('Projectile ttl must be a positive number');
    }

    const origin = this.toVector(config.origin);
    const state: ProjectileState = {
      id: config.id,
      origin: origin.clone(),
      position: origin.clone(),
      direction,
      speed,
      range: rangeOption,
      ttl: ttlOption,
      spawnTick: config.spawnTick ?? this.engine.getTick(),
      age: 0,
      distanceTraveled: 0,
      ignoreOwner: config.ignoreOwner ?? true,
    };

    if (config.ownerId !== undefined) state.ownerId = config.ownerId;
    if (config.collisionMask !== undefined) state.collisionMask = config.collisionMask;
    if (config.metadata !== undefined) state.metadata = config.metadata;

    const record: ProjectileRecord = { state, hitEntities: new Set() };
    if (config.filter !== undefined) record.filter = config.filter;
    if (config.path !== undefined) record.path = config.path;
    if (config.resolveHit !== undefined) record.resolveHit = config.resolveHit;
    this.projectiles.set(config.id, record);
    this.emit(this.spawnHandlers, { projectile: this.cloneState(state) });
    return this.cloneState(state);
  }

  public step(dt = 1 / 60): void {
    if (!Number.isFinite(dt) || dt <= 0) {
      return;
    }

    const records = Array.from(this.projectiles.values());
    for (const record of records) {
      if (!this.projectiles.has(record.state.id)) {
        continue;
      }
      this.stepProjectile(record, dt);
    }
  }

  public destroy(id: string, reason: ProjectileDestroyReason = 'manual'): boolean {
    const record = this.projectiles.get(id);
    if (!record) {
      return false;
    }
    this.destroyRecord(record, reason);
    return true;
  }

  /**
   * Change a flying projectile: a new path (a bounce, an early return) or a new
   * position. The age is kept, so a new path is sampled from the current age.
   */
  public update(id: string, patch: { path?: (age: number) => ProjectilePathPoint; position?: { x: number; y: number } }): boolean {
    const record = this.projectiles.get(id);
    if (!record) {
      return false;
    }
    if (patch.path) record.path = patch.path;
    if (patch.position) record.state.position = this.toVector(patch.position);
    return true;
  }

  public getProjectile(id: string): ProjectileState | undefined {
    const record = this.projectiles.get(id);
    return record ? this.cloneState(record.state) : undefined;
  }

  public getProjectiles(): ProjectileState[] {
    return Array.from(this.projectiles.values(), (record) => this.cloneState(record.state));
  }

  public clear(): void {
    this.projectiles.clear();
  }

  public onSpawn(handler: ProjectileHandler<ProjectileSpawnEvent>): () => void {
    this.spawnHandlers.add(handler);
    return () => this.spawnHandlers.delete(handler);
  }

  public onHit(handler: ProjectileHandler<ProjectileHitEvent>): () => void {
    this.hitHandlers.add(handler);
    return () => this.hitHandlers.delete(handler);
  }

  public onDestroy(handler: ProjectileHandler<ProjectileDestroyEvent>): () => void {
    this.destroyHandlers.add(handler);
    return () => this.destroyHandlers.delete(handler);
  }

  private stepProjectile(record: ProjectileRecord, dt: number): void {
    const projectile = record.state;
    const remainingTtl = projectile.ttl - projectile.age;
    const stepTime = Math.min(dt, remainingTtl);

    if (stepTime <= 0) {
      this.destroyRecord(record, 'ttl');
      return;
    }

    let target: Vector2;
    let pathDone = false;
    if (record.path) {
      const point = record.path(projectile.age + stepTime);
      target = new Vector2(point.x, point.y);
      pathDone = point.done === true;
    } else {
      const remainingRange = projectile.range - projectile.distanceTraveled;
      const stepDistance = Math.min(projectile.speed * stepTime, remainingRange);
      if (stepDistance <= 0) {
        this.destroyRecord(record, 'range');
        return;
      }
      target = projectile.position.add(projectile.direction.mul(stepDistance));
    }

    // Test the segment, and keep testing after each hit the projectile flies through.
    let start = projectile.position.clone();
    for (let hits = 0; hits < MAX_HITS_PER_STEP; hits += 1) {
      const delta = target.sub(start);
      const length = delta.length();
      if (length <= 0) break;
      const direction = delta.mul(1 / length);
      const hit = this.engine.raycast(
        start,
        direction,
        length,
        projectile.collisionMask,
        (entity) => this.shouldHit(entity, record),
      );
      if (!hit) break;

      projectile.distanceTraveled += hit.distance;
      projectile.position = hit.point.clone();
      projectile.direction = direction;
      const resolution = record.resolveHit?.(hit, this.cloneState(projectile)) ?? 'stop';
      this.emit(this.hitHandlers, {
        projectile: this.cloneState(projectile),
        hit,
      });
      if (resolution === 'stop' || !this.projectiles.has(projectile.id)) {
        this.destroyRecord(record, 'hit', hit);
        return;
      }
      if (resolution === 'continue') {
        record.hitEntities.add(hit.entity.uuid);
        start = hit.point.clone();
      } else {
        // Step off the surface so the next segment does not hit it again at once.
        start = hit.point.add(hit.normal.mul(0.5));
        projectile.position = start.clone();
      }
      // A hit handler may have changed the path (bounce, early return).
      if (record.path) {
        const point = record.path(projectile.age + stepTime);
        target = new Vector2(point.x, point.y);
        pathDone = point.done === true;
      }
    }

    projectile.distanceTraveled += target.sub(start).length();
    projectile.position = target;
    projectile.age += stepTime;

    if (pathDone) {
      this.destroyRecord(record, 'end');
      return;
    }

    if (!record.path && projectile.distanceTraveled >= projectile.range) {
      this.destroyRecord(record, 'range');
      return;
    }

    if (projectile.age >= projectile.ttl) {
      this.destroyRecord(record, 'ttl');
    }
  }

  private shouldHit(entity: Entity, record: ProjectileRecord): boolean {
    const projectile = record.state;
    if (projectile.ignoreOwner && projectile.ownerId !== undefined && entity.uuid === projectile.ownerId) {
      return false;
    }
    if (record.hitEntities.has(entity.uuid)) {
      return false;
    }
    return record.filter ? record.filter(entity, this.cloneState(projectile)) : true;
  }

  private destroyRecord(record: ProjectileRecord, reason: ProjectileDestroyReason, hit?: RaycastHit): void {
    if (!this.projectiles.delete(record.state.id)) {
      return;
    }
    const event: ProjectileDestroyEvent = {
      projectile: this.cloneState(record.state),
      reason,
    };
    if (hit !== undefined) event.hit = hit;
    this.emit(this.destroyHandlers, event);
  }

  private cloneState(state: ProjectileState): ProjectileState {
    const clone: ProjectileState = {
      id: state.id,
      origin: state.origin.clone(),
      position: state.position.clone(),
      direction: state.direction.clone(),
      speed: state.speed,
      range: state.range,
      ttl: state.ttl,
      spawnTick: state.spawnTick,
      age: state.age,
      distanceTraveled: state.distanceTraveled,
      ignoreOwner: state.ignoreOwner,
    };
    if (state.ownerId !== undefined) clone.ownerId = state.ownerId;
    if (state.collisionMask !== undefined) clone.collisionMask = state.collisionMask;
    if (state.metadata !== undefined) clone.metadata = state.metadata;
    return clone;
  }

  private toVector(value: Vector2 | { x: number; y: number }): Vector2 {
    return value instanceof Vector2 ? value.clone() : new Vector2(value.x, value.y);
  }

  private emit<T>(handlers: Set<ProjectileHandler<T>>, event: T): void {
    for (const handler of handlers) {
      handler(event);
    }
  }
}
