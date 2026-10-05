/** A rectangle in world pixels. */
export interface WorldRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface TerrainFrame extends WorldRect {
  /** RGBA, `width * height * 4`. */
  readonly pixels: Uint8ClampedArray;
}

export interface SchedulerOptions {
  /** World size, in pixels. */
  readonly size: readonly [width: number, height: number];
  /** Side of the squares the map is rendered in. Defaults to 512. */
  readonly chunk?: number;
  /** How many renders may be in flight at once. Defaults to 1. */
  readonly concurrency?: number;
  /** Renders a rectangle. May resolve in any order relative to other renders. */
  readonly render: (rect: WorldRect) => Promise<TerrainFrame>;
  /** Puts a frame where it belongs. Called in the order the renders were started, never concurrently. */
  readonly apply: (frame: TerrainFrame) => void;
  readonly onError?: (error: unknown, rect: WorldRect) => void;
}

export interface TerrainScheduler {
  /** Something changed in this rectangle (or everywhere): it will be rendered again. */
  invalidate(rect: WorldRect | "all"): void;
  /** What is looked at, so that it is rendered first. `null` means no preference. */
  setViewport(viewport: WorldRect | null): void;
  /** Renders in flight or waiting. */
  readonly pending: number;
  /** Resolves when nothing is waiting or in flight. */
  whenIdle(): Promise<void>;
  destroy(): void;
}

const intersects = (a: WorldRect, b: WorldRect): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/**
 * Decides what to render, in what order, and applies it safely.
 *
 * - The map is cut into chunks; a change marks the chunks it touches with the smallest rectangle that covers it.
 * - Dirty chunks are rendered in the viewport first, then by distance to its centre.
 * - Several renders run at once (a pool of workers), and finish in any order, but a frame is applied only
 *   after every frame started before it: a slow, older frame can never put stale pixels over a newer one.
 * - A chunk invalidated again while it renders is rendered again afterwards.
 */
export function createTerrainScheduler(options: SchedulerOptions): TerrainScheduler {
  const chunk = options.chunk ?? 512;
  const concurrency = Math.max(1, options.concurrency ?? 1);
  const cols = Math.ceil(options.size[0] / chunk);
  const rows = Math.ceil(options.size[1] / chunk);
  const dirty = new Map<number, WorldRect>();
  let viewport: WorldRect | null = null;
  let started = 0;
  let applied = 0;
  let inFlight = 0;
  let destroyed = false;
  const finished = new Map<number, { frame?: TerrainFrame; rect: WorldRect; error?: unknown }>();
  const idleWaiters: Array<() => void> = [];

  const chunkRect = (index: number): WorldRect => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return { x: col * chunk, y: row * chunk, width: Math.min(chunk, options.size[0] - col * chunk), height: Math.min(chunk, options.size[1] - row * chunk) };
  };

  const union = (a: WorldRect, b: WorldRect): WorldRect => {
    const x0 = Math.min(a.x, b.x);
    const y0 = Math.min(a.y, b.y);
    return { x: x0, y: y0, width: Math.max(a.x + a.width, b.x + b.width) - x0, height: Math.max(a.y + a.height, b.y + b.height) - y0 };
  };

  const settleIdle = (): void => {
    if (dirty.size === 0 && inFlight === 0 && finished.size === 0) for (const resolve of idleWaiters.splice(0)) resolve();
  };

  const nextChunk = (): number | undefined => {
    let best: number | undefined;
    let bestScore = Infinity;
    for (const [index, rect] of dirty) {
      const area = chunkRect(index);
      const cx = viewport ? viewport.x + viewport.width / 2 : (options.size[0] / 2);
      const cy = viewport ? viewport.y + viewport.height / 2 : (options.size[1] / 2);
      const distance = Math.hypot(area.x + area.width / 2 - cx, area.y + area.height / 2 - cy);
      // What is on screen comes first, whatever its distance; then the nearest.
      const score = (viewport && intersects(rect, viewport) ? 0 : 1e9) + distance;
      if (score < bestScore) {
        bestScore = score;
        best = index;
      }
    }
    return best;
  };

  const flush = (): void => {
    while (finished.has(applied)) {
      const done = finished.get(applied)!;
      finished.delete(applied);
      applied += 1;
      if (destroyed) continue;
      if (done.frame) options.apply(done.frame);
      else options.onError?.(done.error, done.rect);
    }
  };

  const pump = (): void => {
    while (!destroyed && inFlight < concurrency) {
      const index = nextChunk();
      if (index === undefined) break;
      const rect = dirty.get(index)!;
      dirty.delete(index);
      const seq = started;
      started += 1;
      inFlight += 1;
      options.render(rect).then(
        (frame) => finished.set(seq, { frame, rect }),
        (error: unknown) => finished.set(seq, { error, rect }),
      ).then(() => {
        inFlight -= 1;
        flush();
        pump();
        settleIdle();
      });
    }
    settleIdle();
  };

  return {
    invalidate(target) {
      if (destroyed) return;
      if (target === "all") {
        for (let index = 0; index < cols * rows; index += 1) dirty.set(index, chunkRect(index));
      } else {
        const x0 = Math.max(0, target.x);
        const y0 = Math.max(0, target.y);
        const x1 = Math.min(options.size[0], target.x + target.width);
        const y1 = Math.min(options.size[1], target.y + target.height);
        if (x1 <= x0 || y1 <= y0) return;
        for (let row = Math.floor(y0 / chunk); row <= Math.floor((y1 - 1) / chunk); row += 1) {
          for (let col = Math.floor(x0 / chunk); col <= Math.floor((x1 - 1) / chunk); col += 1) {
            const area = chunkRect(row * cols + col);
            const part: WorldRect = {
              x: Math.max(x0, area.x),
              y: Math.max(y0, area.y),
              width: Math.min(x1, area.x + area.width) - Math.max(x0, area.x),
              height: Math.min(y1, area.y + area.height) - Math.max(y0, area.y),
            };
            const index = row * cols + col;
            const known = dirty.get(index);
            dirty.set(index, known ? union(known, part) : part);
          }
        }
      }
      pump();
    },
    setViewport(next) {
      viewport = next;
    },
    get pending() {
      return dirty.size + inFlight + finished.size;
    },
    whenIdle() {
      if (dirty.size === 0 && inFlight === 0 && finished.size === 0) return Promise.resolve();
      return new Promise<void>((resolve) => idleWaiters.push(resolve));
    },
    destroy() {
      destroyed = true;
      dirty.clear();
      finished.clear();
      for (const resolve of idleWaiters.splice(0)) resolve();
    },
  };
}
