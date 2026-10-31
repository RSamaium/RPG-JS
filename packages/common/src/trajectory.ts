/**
 * Projectile trajectories shared by the server simulation and the client
 * renderer.
 *
 * A trajectory is a pure function of the elapsed time. The server samples it
 * to move and collide a projectile, the client samples it with the same
 * parameters to draw it, so only the trajectory name and its parameters travel
 * over the network.
 */

export interface TrajectoryPoint {
  x: number;
  y: number;
}

/** Inputs of a trajectory sample. */
export interface TrajectoryContext {
  /** Start point of the projectile. */
  origin: TrajectoryPoint;
  /** Normalized launch direction. */
  direction: TrajectoryPoint;
  /** Trajectory parameters (`speed`, `range`, `height`...). */
  params: Record<string, any>;
  /** Current center of the launcher, used by trajectories that come back. */
  owner?: () => TrajectoryPoint | undefined;
}

/** Position of a projectile at a given time. */
export interface TrajectorySample {
  x: number;
  y: number;
  /** Height above the ground, in pixels. `0` for flat trajectories. */
  z: number;
  /** Free label of the current part of the path, such as `out` or `back`. */
  phase: string;
  /** `true` once the path is over. */
  done: boolean;
}

/**
 * Sample a trajectory at `elapsed` seconds.
 */
export type TrajectoryFunction = (elapsed: number, context: TrajectoryContext) => TrajectorySample;

const registry = new Map<string, TrajectoryFunction>();

/**
 * Register a projectile trajectory by name, on both the server and the client.
 *
 * The function must be pure: the same elapsed time and context give the same
 * point, so the client can draw what the server simulates.
 *
 * @param name - Name used in `trajectory: { type: name }`
 * @param fn - Sample function
 *
 * @example
 * ```ts
 * defineTrajectory("sine", (t, { origin, direction, params }) => {
 *   const distance = Math.min(params.speed * t, params.range);
 *   const wave = Math.sin(distance / 20) * (params.amplitude ?? 16);
 *   return {
 *     x: origin.x + direction.x * distance - direction.y * wave,
 *     y: origin.y + direction.y * distance + direction.x * wave,
 *     z: 0,
 *     phase: "out",
 *     done: distance >= params.range,
 *   };
 * });
 * ```
 */
export const defineTrajectory = (name: string, fn: TrajectoryFunction): TrajectoryFunction => {
  registry.set(name, fn);
  return fn;
};

/** Get a registered trajectory, or `undefined` when the name is unknown. */
export const getTrajectory = (name: string): TrajectoryFunction | undefined => registry.get(name);

const along = (origin: TrajectoryPoint, direction: TrajectoryPoint, distance: number) => ({
  x: origin.x + direction.x * distance,
  y: origin.y + direction.y * distance,
});

/** Straight line at `speed` until `range`. */
export const linearTrajectory = defineTrajectory("linear", (t, { origin, direction, params }) => {
  const range = Number(params.range) || 0;
  const distance = Math.min(Math.max(0, t) * (Number(params.speed) || 0), range);
  return { ...along(origin, direction, distance), z: 0, phase: "out", done: distance >= range };
});

/**
 * Lob that lands at `range` after `duration` seconds, peaking at `height`.
 * Without `duration`, it is derived from `speed`.
 */
export const arcTrajectory = defineTrajectory("arc", (t, { origin, direction, params }) => {
  const range = Number(params.range) || 0;
  const duration = Number(params.duration) || (params.speed ? range / Number(params.speed) : 0.6);
  const progress = Math.min(1, Math.max(0, t) / Math.max(0.001, duration));
  const height = Number(params.height ?? 40);
  return {
    ...along(origin, direction, range * progress),
    z: 4 * height * progress * (1 - progress),
    phase: "out",
    done: progress >= 1,
  };
});

/**
 * Goes straight out to `range`, then flies back to the launcher at the same
 * speed. The way back aims at the current position of the launcher.
 */
export const returnTrajectory = defineTrajectory("return", (t, { origin, direction, params, owner }) => {
  const speed = Number(params.speed) || 0;
  const range = Number(params.range) || 0;
  const outTime = speed > 0 ? range / speed : 0;
  const elapsed = Math.max(0, t);
  if (elapsed < outTime) {
    return { ...along(origin, direction, speed * elapsed), z: 0, phase: "out", done: false };
  }
  const turn = along(origin, direction, range);
  const target = owner?.() ?? origin;
  const dx = target.x - turn.x;
  const dy = target.y - turn.y;
  const length = Math.hypot(dx, dy);
  const travelled = speed * (elapsed - outTime);
  if (length <= 0 || travelled >= length) {
    return { x: target.x, y: target.y, z: 0, phase: "back", done: true };
  }
  return {
    x: turn.x + (dx / length) * travelled,
    y: turn.y + (dy / length) * travelled,
    z: 0,
    phase: "back",
    done: false,
  };
});

/**
 * Sample a trajectory by name. Unknown names fall back to `linear`.
 */
export const sampleTrajectory = (
  name: string | undefined,
  elapsed: number,
  context: TrajectoryContext
): TrajectorySample => (getTrajectory(name ?? "linear") ?? linearTrajectory)(elapsed, context);

/** Reflect a direction on a surface normal, for bouncing projectiles. */
export const reflectDirection = (direction: TrajectoryPoint, normal: TrajectoryPoint): TrajectoryPoint => {
  const dot = direction.x * normal.x + direction.y * normal.y;
  const x = direction.x - 2 * dot * normal.x;
  const y = direction.y - 2 * dot * normal.y;
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
};
