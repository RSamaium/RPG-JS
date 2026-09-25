import { computed, signal, type WritableSignal } from "canvasengine";
import { Hooks } from "@rpgjs/common";
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
}

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
  /** Reactive props handed to the rendered component, updated every step. */
  renderProps?: ProjectileRenderProps;
}

/** Props of a rendered projectile component, as signals updated every step. */
export type ProjectileRenderProps = {
  [K in keyof RenderedProjectileProps]-?: WritableSignal<RenderedProjectileProps[K]>;
};

/** Item of `ProjectileManager.renderList`. */
export interface ProjectileRenderItem {
  id: string;
  type: string;
  component: any;
  props: ProjectileRenderProps;
}

// Optional props that may appear after the first frame (impact, destruction)
const LATE_PROJECTILE_PROPS = ["impact", "impactElapsed", "impactProgress", "destroyed"] as const;

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
    const rawDistance = Math.min(spawn.speed * elapsed, spawn.range);
    const predictedImpact = this.getActivePredictedImpact(projectile, now, rawDistance);
    const visualImpact = projectile.visualImpact ?? projectile.impact;
    const distance = visualImpact?.distance ?? predictedImpact?.distance ?? rawDistance;
    const progress = Math.min(1, distance / spawn.range);
    const x = visualImpact?.x ?? predictedImpact?.x ?? spawn.origin.x + spawn.direction.x * distance;
    const y = visualImpact?.y ?? predictedImpact?.y ?? spawn.origin.y + spawn.direction.y * distance;
    const impactElapsedMs = projectile.impactStartedAt !== undefined
      ? Math.max(0, now - projectile.impactStartedAt)
      : undefined;
    return {
      ...spawn,
      x,
      y,
      angle: Math.atan2(spawn.direction.y, spawn.direction.x),
      distance,
      elapsed,
      progress,
      impact: projectile.impact,
      impactElapsed: impactElapsedMs === undefined ? undefined : impactElapsedMs / 1000,
      impactProgress: impactElapsedMs === undefined
        ? undefined
        : Math.min(1, impactElapsedMs / this.impactDurationMs),
      destroyed: projectile.destroyAt !== undefined,
      ttl,
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
    const values = props as unknown as Record<string, unknown>;
    if (!projectile.renderProps) {
      const created: Record<string, unknown> = {};
      for (const key of [...Object.keys(values), ...LATE_PROJECTILE_PROPS]) {
        created[key] = signal(values[key]);
      }
      projectile.renderProps = created as ProjectileRenderProps;
      return projectile.renderProps;
    }
    const current = projectile.renderProps as unknown as Record<string, { (): unknown; set(value: unknown): void }>;
    for (const key of Object.keys(current)) {
      if (current[key]() !== values[key]) {
        current[key].set(values[key]);
      }
    }
    return projectile.renderProps;
  }
}
