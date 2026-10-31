import { describe, expect, test, vi } from "vitest";
import { Hooks, PhysicsEngine } from "@rpgjs/common";
import { RpgMapProjectiles } from "../src/projectiles";

function createMap(objects: Record<string, any> = {}) {
  const broadcasts: any[] = [];
  const physic = new PhysicsEngine();
  const owner = { id: "owner", x: () => 0, y: () => 0, hitbox: () => ({ w: 0, h: 0 }) };
  const map = {
    physic,
    hooks: new Hooks([], "server"),
    getTick: () => physic.getTick(),
    getObjectById: (id: string) => (id === "owner" ? owner : objects[id] ?? { id }),
    getPlayer: (id: string) => (id === "owner" ? owner : undefined),
    $broadcast: (message: any) => broadcasts.push(message),
  };
  const projectiles = new RpgMapProjectiles(map as any);
  const messages = (type: string) => broadcasts.filter((message) => message.type === type);
  return { physic, projectiles, broadcasts, messages, owner };
}

const enemy = (physic: PhysicsEngine, id: string, x: number) =>
  physic.createEntity({ uuid: id, position: { x, y: 0 }, width: 10, height: 10, mass: 1 } as any);

const run = (projectiles: RpgMapProjectiles, seconds: number) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) projectiles.step(1 / 60);
};

describe("projectile trajectories", () => {
  test("an arc flies over entities, lands, lingers, then ends", () => {
    const { physic, projectiles, messages } = createMap();
    enemy(physic, "slime", 50);
    const onHit = vi.fn();
    const onLand = vi.fn();
    const onEnd = vi.fn();

    projectiles.emit({
      type: "bomb",
      origin: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      trajectory: { type: "arc", range: 100, duration: 0.5, height: 40 },
      linger: { ms: 300 },
      onHit,
      onLand,
      onEnd,
    });

    expect(messages("projectile:spawnBatch")[0].value.projectiles[0].trajectory).toEqual({
      type: "arc",
      range: 100,
      duration: 0.5,
      height: 40,
    });
    run(projectiles, 0.55);
    expect(onHit).not.toHaveBeenCalled();
    expect(onLand).toHaveBeenCalledWith(expect.objectContaining({ reason: "land" }));
    expect(onLand.mock.calls[0][0].x).toBeCloseTo(100, 0);
    expect(messages("projectile:updateBatch")[0].value.projectiles[0].stopAt.x).toBeCloseTo(100, 0);
    expect(onEnd).not.toHaveBeenCalled();

    run(projectiles, 0.4);
    expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ reason: "land" }));
    expect(messages("projectile:destroyBatch")).toHaveLength(1);
  });

  test("a return trajectory flies through targets and comes back to the launcher", () => {
    const { physic, projectiles } = createMap();
    enemy(physic, "a", 40);
    enemy(physic, "b", 80);
    const onHit = vi.fn();
    const onEnd = vi.fn();

    projectiles.emit({
      type: "boomerang",
      origin: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      trajectory: { type: "return", speed: 300, range: 120 },
      pierce: true,
      collision: { ignoreOwner: true },
      onHit,
      onEnd,
    }, { id: "owner", x: () => 0, y: () => 0, hitbox: () => ({ w: 0, h: 0 }) } as any);

    run(projectiles, 1.2);
    expect(onHit.mock.calls.map(([context]) => context.hit.entity.uuid)).toEqual(["a", "b"]);
    expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ reason: "return" }));
  });

  test("pierce stops after the given number of targets", () => {
    const { physic, projectiles } = createMap();
    enemy(physic, "a", 40);
    enemy(physic, "b", 80);
    const onHit = vi.fn();

    projectiles.emit({
      type: "arrow",
      origin: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      trajectory: { type: "linear", speed: 400, range: 200 },
      pierce: 1,
      onHit,
    });
    run(projectiles, 1);
    expect(onHit).toHaveBeenCalledTimes(1);
  });

  test("a projectile bounces on a wall and tells the clients its new path", () => {
    const { physic, projectiles, messages } = createMap();
    physic.createStaticObstacle("wall", { x: 60, y: 0, width: 10, height: 40 });
    const onWall = vi.fn();
    const onEnd = vi.fn();

    projectiles.emit({
      type: "disc",
      origin: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      trajectory: { type: "linear", speed: 200, range: 150 },
      wall: "bounce",
      onWall,
      onEnd,
    });
    run(projectiles, 1);

    expect(onWall).toHaveBeenCalledTimes(1);
    const update = messages("projectile:updateBatch")[0].value.projectiles[0];
    expect(update).toMatchObject({ restart: true });
    expect(update.direction.x).toBeCloseTo(-1);
    expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ reason: "range" }));
    expect(onEnd.mock.calls[0][0].x).toBeLessThan(55);
  });

  test("a projectile sticks in a wall instead of playing its impact", () => {
    const { physic, projectiles, messages } = createMap();
    physic.createStaticObstacle("wall", { x: 60, y: 0, width: 10, height: 40 });
    const onEnd = vi.fn();

    projectiles.emit({
      type: "arrow",
      origin: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      trajectory: { type: "linear", speed: 300, range: 200 },
      wall: "stick",
      linger: { ms: 500 },
      onEnd,
    });
    run(projectiles, 0.4);
    expect(messages("projectile:impactBatch")).toHaveLength(0);
    expect(messages("projectile:updateBatch")[0].value.projectiles[0].stopAt.x).toBeCloseTo(55, 0);
    expect(onEnd).not.toHaveBeenCalled();
    run(projectiles, 0.6);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  describe("targets reacting to impacts", () => {
    const emitArrow = (projectiles: RpgMapProjectiles, extra: Record<string, unknown> = {}) =>
      projectiles.emit({
        type: "arrow",
        origin: { x: 0, y: 0 },
        direction: { x: 1, y: 0 },
        trajectory: { type: "linear", speed: 400, range: 200 },
        ...extra,
      });

    test("the target's onProjectileHit runs before the projectile onHit", () => {
      const calls: string[] = [];
      const lever = {
        id: "lever",
        isEvent: () => true,
        onProjectileHit(projectile: any, context: any) {
          calls.push(`lever:${projectile.type}:${Math.round(context.x)}`);
        },
      };
      const { physic, projectiles } = createMap({ lever });
      enemy(physic, "lever", 40);
      emitArrow(projectiles, { onHit: () => calls.push("arrow") });
      run(projectiles, 1);
      expect(calls).toEqual(["lever:arrow:35", "arrow"]);
    });

    test("pass lets the projectile fly through, stop overrides pierce", () => {
      const onHit = vi.fn();
      const bush = { id: "bush", onProjectileHit: () => "pass" };
      const shield = { id: "shield", onProjectileHit: () => "stop" };
      const { physic, projectiles } = createMap({ bush, shield });
      enemy(physic, "bush", 40);
      enemy(physic, "shield", 80);
      enemy(physic, "behind", 120);
      emitArrow(projectiles, { pierce: true, onHit });
      run(projectiles, 1);
      expect(onHit.mock.calls.map(([context]) => context.hit.entity.uuid)).toEqual(["bush", "shield"]);
    });

    test("stick keeps the projectile planted in the target", () => {
      const target = { id: "target", onProjectileHit: () => "stick" };
      const { physic, projectiles, messages } = createMap({ target });
      enemy(physic, "target", 60);
      emitArrow(projectiles, { linger: { ms: 300 } });
      run(projectiles, 0.3);
      expect(messages("projectile:impactBatch")).toHaveLength(0);
      expect(messages("projectile:updateBatch")[0].value.projectiles[0].stopAt.x).toBeCloseTo(55, 0);
    });

    test("projectiles fly over loot pickups", () => {
      const onHit = vi.fn();
      const pickup = { id: "pickup", __rpgLoot: "magnet" };
      const { physic, projectiles } = createMap({ pickup });
      enemy(physic, "pickup", 40);
      emitArrow(projectiles, { onHit });
      run(projectiles, 1);
      expect(onHit).not.toHaveBeenCalled();
    });
  });
});
