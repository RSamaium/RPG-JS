import { computed, signal, type WritableSignal } from "canvasengine";
import { Hooks, sampleTrajectory } from "@rpgjs/common";
import { normalizeRoomMapId } from "../utils/mapId";

export interface ClientProjectileSpawn {
  id: string;
  type: string;
  ownerId?: string;
  origin: { x: number; y: number };
  direction: { x: number; y: number };
  speed: number;
  range: number;
  ttl: number;
  spawnTick: number;
  delay?: number;
  index?: number;
  count?: number;
  params?: Record<string, unknown>;
  collisionMask?: number;
  ignoreOwner?: boolean;
  predictImpact?: boolean;
  /** Trajectory name and parameters, sampled like the server does. */
  trajectory?: { type: string; [param: string]: unknown };
}

/** Change of a flying projectile sent by the server (bounce, return, planted). */
export interface ClientProjectileUpdate {
  id: string;
  origin?: { x: number; y: number };
  direction?: { x: number; y: number };
  trajectory?: { type: string; [param: string]: unknown };
  /** Restart the trajectory clock from now. */
  restart?: boolean;
  /** Freeze the projectile at this point. */
  stopAt?: { x: number; y: number };
}

/** Resolve the current center of a projectile launcher. */
export type ProjectileOwnerResolver = (ownerId: string) => { x: number; y: number } | undefined;

export interface ClientProjectileImpact {
  id: string;
  targetId?: string;
  x: number;
  y: number;
  distance?: number;
}

export interface ClientProjectileDestroy {
  id: string;
  reason?: string;
  targetId?: string;
  x?: number;
  y?: number;
  distance?: number;
}

export interface RenderedProjectileProps extends ClientProjectileSpawn {
  x: number;
  y: number;
  angle: number;
  distance: number;
  elapsed: number;
  progress: number;
  impact?: ClientProjectileImpact;
  impactElapsed?: number;
  impactProgress?: number;
  destroyed?: boolean;
  /** Height above the ground: draw the sprite at `y - z` and a shadow at `y`. */
  z: number;
  /** Part of the path: `out`, `back`, `stuck`... */
  phase: string;
}

export interface RenderedProjectile {
  id: string;
  type: string;
  component: any;
  props: RenderedProjectileProps;
}

export type ProjectilePredictionResolver = (
  projectile: ClientProjectileSpawn,
) => ClientProjectileImpact | null | undefined;

export interface ProjectileSpawnClock {
  now?: number;
  currentServerTick?: number;
  tickDurationMs?: number;
  mapId?: string;
}

interface RuntimeProjectile {
  spawn: ClientProjectileSpawn;
  component: any;
  createdAt: number;
  impact?: ClientProjectileImpact;
  visualImpact?: ClientProjectileImpact;
  predictedImpact?: ClientProjectileImpact;
  impactStartedAt?: number;
  destroyAt?: number;
  destroyReason?: string;
  /** Start of the current trajectory clock, after a restart. */
  restartedAt?: number;
  stopAt?: { x: number; y: number };
  /** Reactive props handed to the rendered component, updated every step. */
  renderProps?: ProjectileRenderProps;
}

/** Props that change while a projectile is rendered. */
type ProjectileDynamicProp = typeof PROJECTILE_DYNAMIC_PROPS[number];

/**
 * Props of a rendered projectile component: spawn data as plain values and the
 * props that change over time as signals updated every step.
 */
export type ProjectileRenderProps = Omit<RenderedProjectileProps, ProjectileDynamicProp> & {
  [K in ProjectileDynamicProp]-?: WritableSignal<RenderedProjectileProps[K] | null>;
};

/** Item of `ProjectileManager.renderList`. */
export interface ProjectileRenderItem {
  id: string;
  type: string;
  component: any;
  props: ProjectileRenderProps;
}

const PROJECTILE_DYNAMIC_PROPS = [
  "x", "y", "z", "phase", "angle", "distance", "elapsed", "progress",
  "impact", "impactElapsed", "impactProgress", "destroyed",
] as const;

// Components validate signal values, so dynamic props never hold `undefined`:
// before an impact, `impact` is null and its progress values are 0.
const PROJECTILE_DYNAMIC_DEFAULTS: Partial<Record<ProjectileDynamicProp, unknown>> = {
  impact: null,
  impactElapsed: 0,
  impactProgress: 0,
  destroyed: false,
};

const dynamicPropValue = (props: RenderedProjectileProps, key: ProjectileDynamicProp): unknown =>
  props[key] ?? PROJECTILE_DYNAMIC_DEFAULTS[key];

export class ProjectileManager {
  private readonly components = new Map<string, any>();
  private readonly projectiles = new Map<string, RuntimeProjectile>();
  private readonly version = signal(0);
  /** Changes only when projectiles appear or disappear, not on every step. */
  private readonly structureVersion = signal(0);
  private readonly impactDurationMs = 350;
  private mapId?: string;

  constructor(
    private readonly hooks: Hooks,
    private readonly predictionResolver?: ProjectilePredictionResolver,
    private readonly ownerResolver?: ProjectileOwnerResolver,
  ) {}

  current = computed<RenderedProjectile[]>(() => {
    this.version();
    const now = Date.now();
    const rendered: RenderedProjectile[] = [];
    for (const projectile of this.projectiles.values()) {
      const props = this.toProps(projectile, now);
      if (!props) {
        continue;
      }
      rendered.push({
        id: projectile.spawn.id,
        type: projectile.spawn.type,
        component: projectile.component,
        props,
      });
    }
    return rendered;
  });

  /**
   * Projectiles to render, with reactive props.
   *
   * Unlike `current`, this list only changes when a projectile appears or
   * disappears; positions and progress are pushed into each item's signals by
   * `step()`, so rendered components are not rebuilt on every frame.
   */
  renderList = computed<ProjectileRenderItem[]>(() => {
    this.structureVersion();
    const now = Date.now();
    const items: ProjectileRenderItem[] = [];
    for (const projectile of this.projectiles.values()) {
      const props = this.toProps(projectile, now);
      if (!props) {
        continue;
      }
      items.push({
        id: projectile.spawn.id,
        type: projectile.spawn.type,
        component: projectile.component,
        props: this.syncRenderProps(projectile, props),
      });
    }
    return items;
  });

  register(type: string, component: any): any {
    this.components.set(type, component);
    return component;
  }

  get(type: string): any {
    return this.components.get(type);
  }

  setMapId(mapId: string | undefined): void {
    const normalizedMapId = normalizeRoomMapId(mapId);
    if (this.mapId === normalizedMapId) return;
    this.mapId = normalizedMapId;
    this.clear();
  }

  getMapId(): string | undefined {
    return this.mapId;
  }

  spawnBatch(projectiles: ClientProjectileSpawn[], clock: ProjectileSpawnClock = {}): void {
    if (!this.acceptsMap(clock.mapId)) return;
    const now = clock.now ?? Date.now();
    for (const projectile of projectiles) {
      const component = this.components.get(projectile.type);
      if (!component) {
        continue;
      }
      const runtime: RuntimeProjectile = {
        spawn: {
          ...projectile,
          delay: projectile.delay ?? 0,
          index: projectile.index ?? 0,
          count: projectile.count ?? 1,
        },
        component,
        createdAt: now,
      };
      this.setPredictedImpact(runtime);
      this.projectiles.set(projectile.id, runtime);
      this.hooks.callHooks("client-projectiles-onSpawn", runtime.spawn).subscribe();
    }
    this.touch();
  }

  impactBatch(impacts: ClientProjectileImpact[], context: { mapId?: string } = {}): void {
    if (!this.acceptsMap(context.mapId)) return;
    const now = Date.now();
    for (const impact of impacts) {
      const projectile = this.projectiles.get(impact.id);
      if (!projectile) {
        continue;
      }
      this.setImpact(projectile, impact, now);
      this.hooks.callHooks("client-projectiles-onImpact", this.toProps(projectile, now)).subscribe();
    }
    this.touch();
  }

  destroyBatch(projectiles: ClientProjectileDestroy[], context: { mapId?: string } = {}): void {
    if (!this.acceptsMap(context.mapId)) return;
    const now = Date.now();
    for (const destroyed of projectiles) {
      const projectile = this.projectiles.get(destroyed.id);
      if (!projectile) {
        continue;
      }
      if (destroyed.reason === "hit") {
        const current = this.toProps(projectile, now);
        this.setImpact(projectile, {
          id: destroyed.id,
          targetId: destroyed.targetId ?? projectile.impact?.targetId,
          x: destroyed.x ?? projectile.impact?.x ?? current?.x ?? projectile.spawn.origin.x,
          y: destroyed.y ?? projectile.impact?.y ?? current?.y ?? projectile.spawn.origin.y,
          distance: destroyed.distance ?? projectile.impact?.distance ?? current?.distance,
        }, now);
      }
      projectile.destroyReason = destroyed.reason;
      projectile.destroyAt = projectile.destroyAt ?? (
        projectile.impact && projectile.impactStartedAt !== undefined
          ? projectile.impactStartedAt + this.impactDurationMs
          : now
      );
      this.hooks.callHooks("client-projectiles-onDestroy", this.toProps(projectile, now)).subscribe();
    }
    this.touch();
  }

  /**
   * Apply server changes to flying projectiles: a bounce or an early return
   * changes the trajectory, a planted projectile freezes where it stopped.
   */
  updateBatch(updates: ClientProjectileUpdate[], context: { mapId?: string } = {}): void {
    if (!this.acceptsMap(context.mapId)) return;
    const now = Date.now();
    for (const update of updates) {
      const projectile = this.projectiles.get(update.id);
      if (!projectile) continue;
      const spawn = projectile.spawn;
      if (update.origin) spawn.origin = update.origin;
      if (update.direction) spawn.direction = update.direction;
      if (update.trajectory) spawn.trajectory = update.trajectory;
      if (update.restart) projectile.restartedAt = now;
      if (update.stopAt) projectile.stopAt = update.stopAt;
      // The local prediction was made for the previous path.
      projectile.predictedImpact = undefined;
    }
    this.touch();
  }

  clear(): void {
    this.projectiles.clear();
    this.touch();
  }

  step(): void {
    const now = Date.now();
    let changed = false;
    let structureChanged = false;
    for (const [id, projectile] of this.projectiles) {
      const props = this.toProps(projectile, now);
      if (
        (!props && !this.isWaitingForDelay(projectile, now)) ||
        (projectile.destroyAt !== undefined && now >= projectile.destroyAt)
      ) {
        this.projectiles.delete(id);
        changed = true;
        structureChanged = true;
        continue;
      }
      // A projectile becomes visible once its delay has elapsed
      if (props && !projectile.renderProps) {
        structureChanged = true;
      }
      if (props && projectile.renderProps) {
        this.syncRenderProps(projectile, props);
      }
    }
    this.touch(changed || this.projectiles.size > 0, structureChanged);
  }

  private toProps(projectile: RuntimeProjectile, now: number): RenderedProjectileProps | null {
    const spawn = projectile.spawn;
    const delayMs = (spawn.delay ?? 0) * 1000;
    const elapsedMs = now - projectile.createdAt - delayMs;
    if (elapsedMs < 0) {
      return null;
    }
    const elapsed = elapsedMs / 1000;
    const ttl = Math.max(0.001, spawn.ttl);
    const impactElapsedMs = projectile.impactStartedAt !== undefined
      ? Math.max(0, now - projectile.impactStartedAt)
      : undefined;
    const base = {
      ...spawn,
      elapsed,
      impact: projectile.impact,
      impactElapsed: impactElapsedMs === undefined ? undefined : impactElapsedMs / 1000,
      impactProgress: impactElapsedMs === undefined
        ? undefined
        : Math.min(1, impactElapsedMs / this.impactDurationMs),
      destroyed: projectile.destroyAt !== undefined,
      ttl,
    };

    const trajectoryType = spawn.trajectory?.type ?? "linear";
    if (trajectoryType !== "linear" || projectile.restartedAt !== undefined || projectile.stopAt) {
      return this.toTrajectoryProps(projectile, base, now);
    }

    const rawDistance = Math.min(spawn.speed * elapsed, spawn.range);
    const predictedImpact = this.getActivePredictedImpact(projectile, now, rawDistance);
    const visualImpact = projectile.visualImpact ?? projectile.impact;
    const distance = visualImpact?.distance ?? predictedImpact?.distance ?? rawDistance;
    const progress = Math.min(1, distance / spawn.range);
    const x = visualImpact?.x ?? predictedImpact?.x ?? spawn.origin.x + spawn.direction.x * distance;
    const y = visualImpact?.y ?? predictedImpact?.y ?? spawn.origin.y + spawn.direction.y * distance;
    return {
      ...base,
      x,
      y,
      z: 0,
      phase: "out",
      angle: Math.atan2(spawn.direction.y, spawn.direction.x),
      distance,
      progress,
    };
  }

  /** Sample a named trajectory with the same parameters as the server. */
  private toTrajectoryProps(
    projectile: RuntimeProjectile,
    base: Omit<RenderedProjectileProps, "x" | "y" | "z" | "phase" | "angle" | "distance" | "progress">,
    now: number,
  ): RenderedProjectileProps {
    const spawn = projectile.spawn;
    if (projectile.stopAt) {
      return {
        ...base,
        x: projectile.stopAt.x,
        y: projectile.stopAt.y,
        z: 0,
        phase: "stuck",
        angle: Math.atan2(spawn.direction.y, spawn.direction.x),
        distance: Math.hypot(projectile.stopAt.x - spawn.origin.x, projectile.stopAt.y - spawn.origin.y),
        progress: 1,
      };
    }
    const delayMs = (spawn.delay ?? 0) * 1000;
    const startedAt = projectile.restartedAt ?? projectile.createdAt + delayMs;
    const elapsed = Math.max(0, now - startedAt) / 1000;
    const { type, ...params } = spawn.trajectory ?? { type: "linear" };
    const context = {
      origin: spawn.origin,
      direction: spawn.direction,
      params: { speed: spawn.speed, range: spawn.range, ...params },
      owner: () => (spawn.ownerId ? this.ownerResolver?.(spawn.ownerId) : undefined),
    };
    const point = sampleTrajectory(type, elapsed, context);
    const ahead = sampleTrajectory(type, elapsed + 1 / 60, context);
    const heading = Math.hypot(ahead.x - point.x, ahead.y - point.y) > 0.01
      ? Math.atan2(ahead.y - point.y, ahead.x - point.x)
      : Math.atan2(spawn.direction.y, spawn.direction.x);
    const visualImpact = projectile.visualImpact ?? projectile.impact;
    const distance = Math.hypot(point.x - spawn.origin.x, point.y - spawn.origin.y);
    return {
      ...base,
      x: visualImpact?.x ?? point.x,
      y: visualImpact?.y ?? point.y,
      z: visualImpact ? 0 : point.z,
      phase: point.phase,
      angle: heading,
      distance,
      progress: Math.min(1, elapsed / Math.max(0.001, spawn.ttl)),
    };
  }

  private acceptsMap(mapId: string | undefined): boolean {
    const normalizedMapId = normalizeRoomMapId(mapId);
    return !normalizedMapId || !this.mapId || normalizedMapId === this.mapId;
  }

  private isWaitingForDelay(projectile: RuntimeProjectile, now: number): boolean {
    const delayMs = (projectile.spawn.delay ?? 0) * 1000;
    return now - projectile.createdAt - delayMs < 0;
  }

  private setPredictedImpact(projectile: RuntimeProjectile): void {
    if (projectile.spawn.predictImpact === false) {
      return;
    }
    const impact = this.predictionResolver?.(projectile.spawn);
    if (!impact || !Number.isFinite(impact.x) || !Number.isFinite(impact.y)) {
      return;
    }
    const distance = typeof impact.distance === "number" && Number.isFinite(impact.distance)
      ? impact.distance
      : Math.hypot(impact.x - projectile.spawn.origin.x, impact.y - projectile.spawn.origin.y);
    if (!Number.isFinite(distance) || distance < 0 || distance > projectile.spawn.range) {
      return;
    }
    projectile.predictedImpact = {
      ...impact,
      distance,
    };
  }

  private getActivePredictedImpact(
    projectile: RuntimeProjectile,
    now: number,
    rawDistance: number,
  ): ClientProjectileImpact | undefined {
    if (!projectile.predictedImpact || projectile.impact) {
      return undefined;
    }
    const distance = projectile.predictedImpact.distance;
    if (distance === undefined || rawDistance < distance) {
      return undefined;
    }
    return projectile.predictedImpact;
  }

  private setImpact(projectile: RuntimeProjectile, impact: ClientProjectileImpact, now: number): void {
    projectile.visualImpact = this.resolveVisualImpact(projectile, impact, now);
    projectile.impact = impact;
    projectile.predictedImpact = undefined;
    projectile.impactStartedAt = projectile.impactStartedAt ?? now;
    const impactDestroyAt = projectile.impactStartedAt + this.impactDurationMs;
    projectile.destroyAt = Math.max(projectile.destroyAt ?? 0, impactDestroyAt);
  }

  private resolveVisualImpact(
    projectile: RuntimeProjectile,
    impact: ClientProjectileImpact,
    now: number,
  ): ClientProjectileImpact {
    const predicted = projectile.predictedImpact;
    if (!predicted || !this.isSameTarget(predicted, impact)) {
      return impact;
    }
    const distance = predicted.distance;
    if (distance === undefined) {
      return impact;
    }
    const delayMs = (projectile.spawn.delay ?? 0) * 1000;
    const elapsedMs = now - projectile.createdAt - delayMs;
    if (elapsedMs < 0) {
      return impact;
    }
    const rawDistance = Math.min(projectile.spawn.speed * (elapsedMs / 1000), projectile.spawn.range);
    return rawDistance >= distance ? predicted : impact;
  }

  private isSameTarget(a: ClientProjectileImpact, b: ClientProjectileImpact): boolean {
    return a.targetId !== undefined && a.targetId === b.targetId;
  }

  private touch(force = true, structure = force): void {
    if (force) {
      this.version.update((value) => value + 1);
    }
    if (structure) {
      this.structureVersion.update((value) => value + 1);
    }
  }

  private syncRenderProps(projectile: RuntimeProjectile, props: RenderedProjectileProps): ProjectileRenderProps {
    if (!projectile.renderProps) {
      const created: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(props)) {
        // Omit undefined spawn fields so component defaults apply
        if (value !== undefined && !(PROJECTILE_DYNAMIC_PROPS as readonly string[]).includes(key)) {
          created[key] = value;
        }
      }
      for (const key of PROJECTILE_DYNAMIC_PROPS) {
        created[key] = signal(dynamicPropValue(props, key));
      }
      projectile.renderProps = created as ProjectileRenderProps;
      return projectile.renderProps;
    }
    const current = projectile.renderProps as unknown as Record<string, { (): unknown; set(value: unknown): void }>;
    for (const key of PROJECTILE_DYNAMIC_PROPS) {
      const value = dynamicPropValue(props, key);
      if (current[key]() !== value) {
        current[key].set(value);
      }
    }
    return projectile.renderProps;
  }

}
