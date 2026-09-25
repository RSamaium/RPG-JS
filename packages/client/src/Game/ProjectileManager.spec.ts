import { afterEach, describe, expect, test, vi } from "vitest";
import { Hooks } from "@rpgjs/common";
import { ProjectileManager } from "./ProjectileManager";

describe("ProjectileManager", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("renders registered projectile components from compact spawn data", () => {
    const onSpawn = vi.fn();
    const hooks = new Hooks([{ projectiles: { onSpawn } }], "client");
    const manager = new ProjectileManager(hooks);
    const component = () => null;

    manager.register("fireball", component);
    manager.spawnBatch([
      {
        id: "p1",
        type: "fireball",
        origin: { x: 10, y: 20 },
        direction: { x: 1, y: 0 },
        speed: 100,
        range: 500,
        ttl: 5,
        spawnTick: 1,
      },
    ]);

    const current = manager.current();
    expect(current).toHaveLength(1);
    expect(current[0].component).toBe(component);
    expect(current[0].props.x).toBeGreaterThanOrEqual(10);
    expect(current[0].props.angle).toBe(0);
    expect(onSpawn).toHaveBeenCalledWith(expect.objectContaining({ id: "p1", type: "fireball" }));
  });

  test("ignores projectile packets from another map", () => {
    const hooks = new Hooks([], "client");
    const manager = new ProjectileManager(hooks);
    const component = () => null;

    manager.register("fireball", component);
    manager.setMapId("map-town");
    manager.spawnBatch([
      {
        id: "old-map-projectile",
        type: "fireball",
        origin: { x: 10, y: 20 },
        direction: { x: 1, y: 0 },
        speed: 100,
        range: 500,
        ttl: 5,
        spawnTick: 1,
      },
    ], { mapId: "map-dungeon" });

    expect(manager.current()).toHaveLength(0);

    manager.spawnBatch([
      {
        id: "current-map-projectile",
        type: "fireball",
        origin: { x: 10, y: 20 },
        direction: { x: 1, y: 0 },
        speed: 100,
        range: 500,
        ttl: 5,
        spawnTick: 1,
      },
    ], { mapId: "map-town" });

    expect(manager.current()).toHaveLength(1);
  });

  test("accepts server map ids without the client room prefix", () => {
    const hooks = new Hooks([], "client");
    const manager = new ProjectileManager(hooks);
    const component = () => null;

    manager.register("fireball", component);
    manager.setMapId("map-town");
    manager.spawnBatch([
      {
        id: "server-map-projectile",
        type: "fireball",
        origin: { x: 10, y: 20 },
        direction: { x: 1, y: 0 },
        speed: 100,
        range: 500,
        ttl: 5,
        spawnTick: 1,
      },
    ], { mapId: "town" });

    expect(manager.getMapId()).toBe("town");
    expect(manager.current()).toHaveLength(1);
  });

  test("accepts prefixed map ids when the manager stores the logical map id", () => {
    const hooks = new Hooks([], "client");
    const manager = new ProjectileManager(hooks);
    const component = () => null;

    manager.register("fireball", component);
    manager.setMapId("town");
    manager.spawnBatch([
      {
        id: "prefixed-map-projectile",
        type: "fireball",
        origin: { x: 10, y: 20 },
        direction: { x: 1, y: 0 },
        speed: 100,
        range: 500,
        ttl: 5,
        spawnTick: 1,
      },
    ], { mapId: "map-town" });

    expect(manager.current()).toHaveLength(1);
  });

  test("clears projectiles when switching map ids", () => {
    const hooks = new Hooks([], "client");
    const manager = new ProjectileManager(hooks);

    manager.register("fireball", () => null);
    manager.setMapId("map-town");
    manager.spawnBatch([
      {
        id: "p1",
        type: "fireball",
        origin: { x: 10, y: 20 },
        direction: { x: 1, y: 0 },
        speed: 100,
        range: 500,
        ttl: 5,
        spawnTick: 1,
      },
    ], { mapId: "map-town" });

    expect(manager.current()).toHaveLength(1);

    manager.setMapId("map-dungeon");

    expect(manager.current()).toHaveLength(0);
  });

  test("starts visuals at the spawn origin even when a server tick estimate exists", () => {
    vi.useFakeTimers();
    vi.setSystemTime(2000);

    const hooks = new Hooks([], "client");
    const manager = new ProjectileManager(hooks);
    manager.register("arrow", () => null);
    manager.spawnBatch([
      {
        id: "p-latency",
        type: "arrow",
        origin: { x: 0, y: 0 },
        direction: { x: 1, y: 0 },
        speed: 120,
        range: 500,
        ttl: 5,
        spawnTick: 10,
      },
    ], {
      currentServerTick: 16,
      tickDurationMs: 1000 / 60,
    });

    const current = manager.current();
    expect(current).toHaveLength(1);
    expect(current[0].props.elapsed).toBeCloseTo(0, 3);
    expect(current[0].props.x).toBeCloseTo(0, 3);
  });

  test("keeps delayed projectiles until their visual delay has elapsed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);

    const hooks = new Hooks([], "client");
    const manager = new ProjectileManager(hooks);
    manager.register("spark", () => null);
    manager.spawnBatch([
      {
        id: "p-delayed",
        type: "spark",
        origin: { x: 0, y: 0 },
        direction: { x: 1, y: 0 },
        speed: 100,
        range: 500,
        ttl: 5,
        spawnTick: 1,
        delay: 0.1,
      },
    ]);

    vi.setSystemTime(1050);
    manager.step();
    expect(manager.current()).toHaveLength(0);

    vi.setSystemTime(1110);
    manager.step();
    const current = manager.current();
    expect(current).toHaveLength(1);
    expect(current[0].props.elapsed).toBeCloseTo(0.01, 3);
  });

  test("keeps impacted projectiles briefly so components can react", () => {
    const hooks = new Hooks([], "client");
    const manager = new ProjectileManager(hooks);
    manager.register("arrow", () => null);
    manager.spawnBatch([
      {
        id: "p2",
        type: "arrow",
        origin: { x: 0, y: 0 },
        direction: { x: 1, y: 0 },
        speed: 100,
        range: 500,
        ttl: 5,
        spawnTick: 1,
      },
    ]);

    manager.impactBatch([{ id: "p2", x: 42, y: 0, distance: 42 }]);

    const current = manager.current();
    expect(current).toHaveLength(1);
    expect(current[0].props.impact?.x).toBe(42);
    expect(current[0].props.destroyed).toBe(true);
  });

  test("keeps hit destroys briefly even if the destroy packet arrives before impact", () => {
    const hooks = new Hooks([], "client");
    const manager = new ProjectileManager(hooks);
    manager.register("arrow", () => null);
    manager.spawnBatch([
      {
        id: "p3",
        type: "arrow",
        origin: { x: 0, y: 0 },
        direction: { x: 1, y: 0 },
        speed: 100,
        range: 500,
        ttl: 5,
        spawnTick: 1,
      },
    ]);

    manager.destroyBatch([{ id: "p3", reason: "hit", x: 48, y: 0, distance: 48 }]);

    const current = manager.current();
    expect(current).toHaveLength(1);
    expect(current[0].props.impact?.x).toBe(48);
    expect(current[0].props.destroyed).toBe(true);
  });

  test("freezes hit destroys at the authoritative impact position until the impact completes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);

    const hooks = new Hooks([], "client");
    const manager = new ProjectileManager(hooks);
    manager.register("arrow", () => null);
    manager.spawnBatch([
      {
        id: "p4",
        type: "arrow",
        origin: { x: 0, y: 0 },
        direction: { x: 1, y: 0 },
        speed: 100,
        range: 500,
        ttl: 5,
        spawnTick: 1,
      },
    ]);

    vi.setSystemTime(1200);
    manager.destroyBatch([{ id: "p4", reason: "hit", x: 48, y: 0, distance: 48 }]);

    vi.setSystemTime(1300);
    manager.step();
    let current = manager.current();
    expect(current).toHaveLength(1);
    expect(current[0].props.x).toBe(48);
    expect(current[0].props.distance).toBe(48);
    expect(current[0].props.impactProgress).toBeCloseTo(100 / 350, 3);

    vi.setSystemTime(1600);
    manager.step();
    current = manager.current();
    expect(current).toHaveLength(0);
  });

  test("clamps visual movement at the predicted impact without starting the impact animation", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);

    const hooks = new Hooks([], "client");
    const manager = new ProjectileManager(hooks, () => ({
      id: "p5",
      targetId: "target",
      x: 30,
      y: 0,
      distance: 30,
    }));
    manager.register("arrow", () => null);
    manager.spawnBatch([
      {
        id: "p5",
        type: "arrow",
        origin: { x: 0, y: 0 },
        direction: { x: 1, y: 0 },
        speed: 100,
        range: 500,
        ttl: 5,
        spawnTick: 1,
      },
    ]);

    vi.setSystemTime(1200);
    manager.step();
    let current = manager.current();
    expect(current).toHaveLength(1);
    expect(current[0].props.x).toBe(20);
    expect(current[0].props.impact).toBeUndefined();
    expect(current[0].props.destroyed).toBe(false);

    vi.setSystemTime(1400);
    manager.step();
    current = manager.current();
    expect(current).toHaveLength(1);
    expect(current[0].props.x).toBe(30);
    expect(current[0].props.distance).toBe(30);
    expect(current[0].props.impact).toBeUndefined();
    expect(current[0].props.destroyed).toBe(false);

    manager.impactBatch([{ id: "p5", targetId: "target", x: 32, y: 0, distance: 32 }]);
    current = manager.current();
    expect(current[0].props.x).toBe(30);
    expect(current[0].props.distance).toBe(30);
    expect(current[0].props.impact?.x).toBe(32);
    expect(current[0].props.destroyed).toBe(true);
  });

  test("uses the authoritative impact position when the predicted target differs", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);

    const hooks = new Hooks([], "client");
    const manager = new ProjectileManager(hooks, () => ({
      id: "p7",
      targetId: "wall",
      x: 30,
      y: 0,
      distance: 30,
    }));
    manager.register("arrow", () => null);
    manager.spawnBatch([
      {
        id: "p7",
        type: "arrow",
        origin: { x: 0, y: 0 },
        direction: { x: 1, y: 0 },
        speed: 100,
        range: 500,
        ttl: 5,
        spawnTick: 1,
      },
    ]);

    vi.setSystemTime(1400);
    manager.step();
    manager.impactBatch([{ id: "p7", targetId: "target", x: 45, y: 0, distance: 45 }]);

    const current = manager.current();
    expect(current[0].props.x).toBe(45);
    expect(current[0].props.distance).toBe(45);
    expect(current[0].props.impact?.x).toBe(45);
  });

  test("keeps an unconfirmed predicted impact clamped until the server resolves it", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);

    const hooks = new Hooks([], "client");
    const manager = new ProjectileManager(hooks, () => ({
      id: "p6",
      targetId: "ignored",
      x: 30,
      y: 0,
      distance: 30,
    }));
    manager.register("arrow", () => null);
    manager.spawnBatch([
      {
        id: "p6",
        type: "arrow",
        origin: { x: 0, y: 0 },
        direction: { x: 1, y: 0 },
        speed: 100,
        range: 500,
        ttl: 5,
        spawnTick: 1,
      },
    ]);

    vi.setSystemTime(1400);
    manager.step();
    expect(manager.current()[0].props.x).toBe(30);

    vi.setSystemTime(1900);
    manager.step();
    const current = manager.current();
    expect(current).toHaveLength(1);
    expect(current[0].props.x).toBe(30);
    expect(current[0].props.impact).toBeUndefined();
    expect(current[0].props.destroyed).toBe(false);

    manager.destroyBatch([{ id: "p6", reason: "range" }]);
    expect(manager.current()[0].props.x).toBe(30);
    expect(manager.current()[0].props.destroyed).toBe(true);
  });

  test("skips local impact prediction when the server marks the projectile as non-predictable", () => {
    const hooks = new Hooks([], "client");
    const predictionResolver = vi.fn();
    const manager = new ProjectileManager(hooks, predictionResolver);
    manager.register("arrow", () => null);

    manager.spawnBatch([
      {
        id: "p-no-predict",
        type: "arrow",
        origin: { x: 0, y: 0 },
        direction: { x: 1, y: 0 },
        speed: 100,
        range: 500,
        ttl: 5,
        spawnTick: 1,
        predictImpact: false,
      },
    ]);

    expect(predictionResolver).not.toHaveBeenCalled();
  });
});

describe("ProjectileManager renderList", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const spawn = (id: string, delay = 0) => ({
    id,
    type: "arrow",
    origin: { x: 0, y: 0 },
    direction: { x: 1, y: 0 },
    speed: 100,
    range: 500,
    ttl: 5,
    spawnTick: 1,
    delay,
  });

  test("keeps the same items across steps and pushes positions into their signals", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    const manager = new ProjectileManager(new Hooks([], "client"));
    manager.register("arrow", () => null);
    manager.spawnBatch([spawn("p1")]);

    const first = manager.renderList();
    expect(first).toHaveLength(1);
    expect(first[0].props.x()).toBe(0);

    vi.setSystemTime(1200);
    manager.step();
    const second = manager.renderList();
    expect(second).toBe(first);
    expect(second[0].props.x()).toBe(20);
    expect(second[0].props.progress()).toBeCloseTo(20 / 500, 5);
    // The public list still exposes plain values
    expect(manager.current()[0].props.x).toBe(20);
  });

  test("changes when projectiles appear after their delay or are destroyed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    const manager = new ProjectileManager(new Hooks([], "client"));
    manager.register("arrow", () => null);
    manager.spawnBatch([spawn("delayed", 0.1)]);
    expect(manager.renderList()).toHaveLength(0);

    vi.setSystemTime(1150);
    manager.step();
    const visible = manager.renderList();
    expect(visible.map((item) => item.id)).toEqual(["delayed"]);

    manager.destroyBatch([{ id: "delayed" }]);
    vi.setSystemTime(1160);
    manager.step();
    expect(manager.renderList()).toHaveLength(0);
  });
});
