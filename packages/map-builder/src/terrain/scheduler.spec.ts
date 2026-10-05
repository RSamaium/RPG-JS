// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createTerrainScheduler, type TerrainFrame, type WorldRect } from "./scheduler";

/** A renderer whose answers are released by hand, in any order. */
function manualRender() {
  const waiting: Array<{ rect: WorldRect; release: () => void; fail: (error: unknown) => void }> = [];
  const render = (rect: WorldRect) =>
    new Promise<TerrainFrame>((resolve, reject) => {
      waiting.push({ rect, release: () => resolve({ ...rect, pixels: new Uint8ClampedArray(0) }), fail: reject });
    });
  return { render, waiting };
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("terrain scheduler", () => {
  it("renders every chunk once for 'all', each with its own size, edges included", async () => {
    const seen: WorldRect[] = [];
    const scheduler = createTerrainScheduler({
      size: [1100, 600], concurrency: 2,
      render: async (rect) => ({ ...rect, pixels: new Uint8ClampedArray(0) }),
      apply: (frame) => void seen.push({ x: frame.x, y: frame.y, width: frame.width, height: frame.height }),
    });
    scheduler.invalidate("all");
    await scheduler.whenIdle();
    expect(seen).toHaveLength(6); // 3 columns x 2 rows
    expect(seen.find((r) => r.x === 1024 && r.y === 512)).toEqual({ x: 1024, y: 512, width: 76, height: 88 });
    expect(scheduler.pending).toBe(0);
  });

  it("renders only the chunks a change touches, with the smallest rectangle, merging changes to one chunk", async () => {
    const started: WorldRect[] = [];
    const { render, waiting } = manualRender();
    const scheduler = createTerrainScheduler({ size: [2048, 2048], render: (r) => (started.push(r), render(r)), apply: () => undefined });
    scheduler.invalidate({ x: 500, y: 100, width: 30, height: 30 }); // crosses the border between chunk 0 and 1
    expect(started).toHaveLength(1); // one render at a time here: the other half waits
    expect([{ x: 500, y: 100, width: 12, height: 30 }, { x: 512, y: 100, width: 18, height: 30 }]).toContainEqual(started[0]);
    scheduler.invalidate({ x: 100, y: 100, width: 10, height: 10 });
    scheduler.invalidate({ x: 120, y: 130, width: 10, height: 10 });
    waiting[0]!.release();
    await tick();
    // the other half of the first change and the two small changes were all in chunk 0: one render, the box that covers them
    expect(started.slice(1)).toEqual([{ x: 100, y: 100, width: 412, height: 40 }]);
  });

  it("limits the renders in flight to the concurrency, and starts the next as soon as one ends", async () => {
    const { render, waiting } = manualRender();
    const scheduler = createTerrainScheduler({ size: [2048, 512], concurrency: 2, render, apply: () => undefined });
    scheduler.invalidate("all");
    expect(waiting).toHaveLength(2);
    waiting[0]!.release();
    await tick();
    expect(waiting).toHaveLength(3);
  });

  it("applies frames in the order the renders started, even when they finish out of order", async () => {
    const { render, waiting } = manualRender();
    const applied: number[] = [];
    const scheduler = createTerrainScheduler({ size: [2048, 512], concurrency: 3, render, apply: (f) => void applied.push(f.x) });
    scheduler.invalidate("all"); // chunks at x = 0, 512, 1024 (the centre first), 1536 waits
    const order = waiting.map((w) => w.rect.x);
    waiting[2]!.release();
    waiting[1]!.release();
    await tick();
    expect(applied).toEqual([]); // the first one is not done: nothing may be applied
    waiting[0]!.release();
    await tick();
    expect(applied).toEqual(order);
  });

  it("renders again a chunk that changed while it was rendering, after the first render, and applies them in order", async () => {
    const { render, waiting } = manualRender();
    const applied: string[] = [];
    const scheduler = createTerrainScheduler({ size: [512, 512], concurrency: 4, render, apply: (f) => void applied.push(`${f.x},${f.width}`) });
    scheduler.invalidate({ x: 0, y: 0, width: 100, height: 100 });
    scheduler.invalidate({ x: 50, y: 50, width: 100, height: 100 });
    expect(waiting).toHaveLength(2); // the second one does not wait for the first: both are in flight
    waiting[1]!.release();
    await tick();
    expect(applied).toEqual([]);
    waiting[0]!.release();
    await tick();
    expect(applied).toEqual(["0,100", "50,100"]);
  });

  it("renders what is in the viewport first, then the nearest", async () => {
    const started: number[] = [];
    const { render, waiting } = manualRender();
    const scheduler = createTerrainScheduler({ size: [4096, 512], concurrency: 1, render: (r) => (started.push(r.x), render(r)), apply: () => undefined });
    scheduler.setViewport({ x: 3000, y: 0, width: 400, height: 300 });
    scheduler.invalidate("all");
    expect(started).toEqual([3072]); // the chunk that shows the most central part of the viewport
    waiting[0]!.release();
    await tick();
    expect(started[1]).toBe(2560); // the other one that is on screen, before anything that is not
    waiting[1]!.release();
    await tick();
    expect(started[2]).toBe(3584); // then the nearest of the rest
  });

  it("puts a change that is on screen before one that is nearer to the centre of the screen", async () => {
    const started: number[] = [];
    const { render, waiting } = manualRender();
    const scheduler = createTerrainScheduler({ size: [1024, 512], concurrency: 1, render: (r) => (started.push(r.x), render(r)), apply: () => undefined });
    scheduler.setViewport({ x: 480, y: 0, width: 100, height: 100 });
    // chunk 1 is the nearer one to the middle of the viewport, but its change is out of it; chunk 0's change is in it
    scheduler.invalidate({ x: 900, y: 0, width: 10, height: 10 });
    scheduler.invalidate({ x: 490, y: 0, width: 10, height: 10 });
    expect(started).toEqual([900]); // the first call started right away, before the second change was known
    waiting[0]!.release();
    await tick();
    expect(started).toEqual([900, 490]);
    scheduler.destroy();
  });

  it("chooses between several waiting changes by what is on screen first", async () => {
    const started: number[] = [];
    const { render, waiting } = manualRender();
    const scheduler = createTerrainScheduler({ size: [2048, 512], concurrency: 1, render: (r) => (started.push(r.x), render(r)), apply: () => undefined });
    scheduler.invalidate({ x: 1600, y: 0, width: 10, height: 10 }); // starts now, and keeps the only slot busy
    scheduler.setViewport({ x: 480, y: 0, width: 100, height: 100 });
    scheduler.invalidate({ x: 900, y: 0, width: 10, height: 10 });
    scheduler.invalidate({ x: 490, y: 0, width: 10, height: 10 });
    waiting[0]!.release();
    await tick();
    expect(started).toEqual([1600, 490]); // not 900, which is nearer to the centre of the viewport but out of it
    scheduler.destroy();
  });

  it("reports a failed render, applies the others, and does not get stuck", async () => {
    const { render, waiting } = manualRender();
    const errors: unknown[] = [];
    const applied: number[] = [];
    const scheduler = createTerrainScheduler({ size: [1024, 512], concurrency: 2, render, apply: (f) => void applied.push(f.x), onError: (e, r) => void errors.push([String(e), r.x]) });
    scheduler.invalidate("all");
    waiting[0]!.fail("boom");
    waiting[1]!.release();
    await scheduler.whenIdle();
    expect(errors).toEqual([["boom", waiting[0]!.rect.x]]);
    expect(applied).toEqual([waiting[1]!.rect.x]);
  });

  it("ignores changes outside the map, and stops when destroyed", async () => {
    const { render, waiting } = manualRender();
    const applied: number[] = [];
    const scheduler = createTerrainScheduler({ size: [512, 512], render, apply: (f) => void applied.push(f.x) });
    scheduler.invalidate({ x: 600, y: 0, width: 10, height: 10 });
    scheduler.invalidate({ x: -50, y: 0, width: 10, height: 10 });
    expect(waiting).toHaveLength(0);
    scheduler.invalidate("all");
    const idle = scheduler.whenIdle();
    scheduler.destroy();
    await idle;
    waiting[0]!.release();
    await tick();
    expect(applied).toEqual([]);
    scheduler.invalidate("all");
    expect(waiting).toHaveLength(1);
  });
});
