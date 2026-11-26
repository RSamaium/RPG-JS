import { describe, expect, test, vi } from "vitest";
import { Hooks, PhysicsEngine, Vector2 } from "@rpgjs/common";
import { RpgMapProjectiles } from "../src/projectiles";

function createMapStub() {
  const broadcasts: any[] = [];
  const onImpact = vi.fn();
  const physic = new PhysicsEngine();
  const target = { id: "target", hp: 100 };
  const owner = { id: "owner" };
  const hooks = new Hooks([{ projectiles: { onImpact } }], "server");

  physic.createStaticObstacle("target", {
    position: new Vector2(100, 0),
    width: 20,
    height: 20,
  });

  const map = {
    physic,
    hooks,
    getTick: () => physic.getTick(),
    getObjectById: (id: string) => id === "target" ? target : undefined,
    getPlayer: (id: string) => id === "owner" ? owner : undefined,
    $broadcast: (message: any) => broadcasts.push(message),
  };

  return {
    map,
    broadcasts,
    onImpact,
  };
}

describe("RpgMapProjectiles", () => {
  test("broadcasts compact spawn batches and server-authoritative impacts", async () => {
    const { map, broadcasts, onImpact } = createMapStub();
    const projectiles = new RpgMapProjectiles(map as any);

    projectiles.emit({
      type: "arrow",
      origin: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      trajectory: {
        type: "linear",
        speed: 200,
        range: 300,
        ttl: 2,
      },
      payload: {
        damage: 10,
      },
      params: {
        sprite: "arrow",
      },
    } as any);

    projectiles.step(1);
    await Promise.resolve();

    expect(broadcasts[0]).toMatchObject({
      type: "projectile:spawnBatch",
      value: {
        projectiles: [
          expect.objectContaining({
            type: "arrow",
            params: { sprite: "arrow" },
          }),
        ],
      },
    });
    expect(broadcasts[0].value.projectiles[0].payload).toBeUndefined();
    const spawned = broadcasts[0].value.projectiles[0];
    // A single shot without delay, on a plain linear trajectory: the defaults of the client are left out
    expect(spawned).not.toHaveProperty("delay");
    expect(spawned).not.toHaveProperty("index");
    expect(spawned).not.toHaveProperty("count");
    expect(spawned).not.toHaveProperty("trajectory");
    // The projectile stops on its hit: the impact is sent once, in the destroy entry
    const destroyMessage = broadcasts.find((message) => message.type === "projectile:destroyBatch");
    expect(broadcasts.find((message) => message.type === "projectile:impactBatch")).toBeUndefined();
    expect(destroyMessage).toBeTruthy();
    expect(destroyMessage.value.projectiles[0]).toMatchObject({
      id: spawned.id,
      reason: "hit",
      targetId: "target",
      x: expect.any(Number),
      y: expect.any(Number),
      distance: expect.any(Number),
    });
    expect(onImpact).toHaveBeenCalledWith(expect.objectContaining({
      projectile: expect.objectContaining({
        type: "arrow",
        payload: { damage: 10 },
      }),
      target: expect.objectContaining({ id: "target" }),
    }));
  });

  test("expands repeat emissions into delayed spawn descriptors", () => {
    const { map, broadcasts } = createMapStub();
    const projectiles = new RpgMapProjectiles(map as any);

    projectiles.emit({
      type: "spark",
      origin: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      trajectory: {
        type: "linear",
        speed: 100,
        range: 200,
      },
      repeat: {
        count: 3,
        interval: 50,
        spread: 10,
        seed: 1,
      },
    });

    // Nothing is sent before the step: the shots of one sync interval share one message
    expect(broadcasts).toHaveLength(0);
    projectiles.step(1 / 60);

    expect(broadcasts[0]).toMatchObject({
      type: "projectile:spawnBatch",
      value: {
        projectiles: [
          expect.objectContaining({ count: 3 }),
          expect.objectContaining({ index: 1, count: 3, delay: 0.05 }),
          expect.objectContaining({ index: 2, count: 3, delay: 0.1 }),
        ],
      },
    });
    // `index: 0` and `delay: 0` are the defaults of the client
    expect(broadcasts[0].value.projectiles[0]).not.toHaveProperty("index");
    expect(broadcasts[0].value.projectiles[0]).not.toHaveProperty("delay");
  });

  test("applies top-level precision spread to projectile directions", () => {
    vi.spyOn(Math, "random").mockReturnValue(1);
    const { map, broadcasts } = createMapStub();
    const projectiles = new RpgMapProjectiles(map as any);

    projectiles.emit({
      type: "arrow",
      origin: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      spreadDegrees: 20,
      trajectory: {
        type: "linear",
        speed: 100,
        range: 200,
      },
    });

    projectiles.step(1 / 60);
    const direction = broadcasts[0].value.projectiles[0].direction;
    expect(direction.x).toBeCloseTo(Math.cos((10 * Math.PI) / 180), 4);
    expect(direction.y).toBeCloseTo(Math.sin((10 * Math.PI) / 180), 4);
  });

  test("serializes client-safe prediction hints and disables prediction for custom hit filters", () => {
    const { map, broadcasts } = createMapStub();
    const projectiles = new RpgMapProjectiles(map as any);

    projectiles.emit({
      type: "filtered",
      origin: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      trajectory: {
        type: "linear",
        speed: 100,
        range: 200,
      },
      collision: {
        collisionMask: 2,
        ignoreOwner: false,
      },
      canHit: () => true,
    });

    projectiles.step(1 / 60);
    expect(broadcasts[0].value.projectiles[0]).toMatchObject({
      type: "filtered",
      collisionMask: 2,
      ignoreOwner: false,
      predictImpact: false,
    });
  });

  test("allows local prediction when a custom hit filter opts in", () => {
    const { map, broadcasts } = createMapStub();
    const projectiles = new RpgMapProjectiles(map as any);

    projectiles.emit({
      type: "filtered",
      origin: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      trajectory: {
        type: "linear",
        speed: 100,
        range: 200,
      },
      collision: {
        predictImpact: true,
      },
      canHit: () => true,
    });

    projectiles.step(1 / 60);
    expect(broadcasts[0].value.projectiles[0]).toMatchObject({
      type: "filtered",
      predictImpact: true,
    });
  });

  test("sends the shots of one sync interval in one message", () => {
    vi.restoreAllMocks();
    const { map, broadcasts } = createMapStub();
    (map as any).throttleSync = 50;
    const projectiles = new RpgMapProjectiles(map as any);
    const shoot = () => projectiles.emit({
      type: "arrow",
      origin: { x: 0, y: 500 },
      direction: { x: 0, y: 1 },
      trajectory: { type: "linear", speed: 100, range: 1000 },
    });

    // 6 steps of 60 Hz are two sync intervals of 50 ms, with one shot per step
    for (let step = 0; step < 6; step++) {
      shoot();
      projectiles.step(1 / 60);
    }

    const spawns = broadcasts.filter((message) => message.type === "projectile:spawnBatch");
    expect(spawns).toHaveLength(2);
    expect(spawns.map((message) => message.value.projectiles.length)).toEqual([3, 3]);
  });
});
