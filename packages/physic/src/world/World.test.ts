import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from './World';
import { Entity } from '../physics/Entity';
import { AABB } from '../core/math/AABB';
import { Vector2 } from '../core/math/Vector2';
import { assignPolygonCollider } from '../collision/PolygonCollider';
import { EntityState } from '../core/types';

describe('World', () => {
  let world: World;

  beforeEach(() => {
    world = new World({ timeStep: 1 / 60 });
  });

  it('should create a world', () => {
    expect(world).toBeDefined();
    expect(world.getEntities().length).toBe(0);
  });

  it('should add entity', () => {
    const entity = new Entity({ position: { x: 0, y: 0 }, radius: 10 });
    world.addEntity(entity);
    expect(world.getEntities().length).toBe(1);
  });

  it('should remove entity', () => {
    const entity = new Entity({ position: { x: 0, y: 0 }, radius: 10 });
    world.addEntity(entity);
    world.removeEntity(entity);
    expect(world.getEntities().length).toBe(0);
  });

  it('should step simulation', () => {
    const entity = world.createEntity({
      position: { x: 0, y: 0 },
      radius: 10,
      mass: 1,
      velocity: { x: 1, y: 0 },
    });

    const initialX = entity.position.x;
    world.step();
    expect(entity.position.x).toBeGreaterThan(initialX);
  });

  it('should detect collisions', () => {
    const entity1 = world.createEntity({
      position: { x: 0, y: 0 },
      radius: 5,
      mass: 1,
    });
    const entity2 = world.createEntity({
      position: { x: 8, y: 0 },
      radius: 5,
      mass: 1,
    });

    let collisionDetected = false;
    world.getEvents().onCollisionEnter(() => {
      collisionDetected = true;
    });

    world.step();
    expect(collisionDetected).toBe(true);
  });

  it('should get entity by UUID', () => {
    const entity = world.createEntity({
      position: { x: 0, y: 0 },
      radius: 10,
    });
    const found = world.getEntityByUUID(entity.uuid);
    expect(found).toBe(entity);
  });

  it('should clear all entities', () => {
    world.createEntity({ position: { x: 0, y: 0 }, radius: 10 });
    world.createEntity({ position: { x: 10, y: 10 }, radius: 10 });
    world.clear();
    expect(world.getEntities().length).toBe(0);
  });

  it('should not keep cleared dynamic entities in the simulation sets', () => {
    const entity = world.createEntity({
      position: { x: 0, y: 0 },
      radius: 10,
      mass: 1,
      velocity: { x: 10, y: 0 },
    });

    world.clear();
    world.step();

    expect(entity.position.x).toBe(0);
    expect(world.getStats()).toEqual({
      totalEntities: 0,
      dynamicEntities: 0,
      staticEntities: 0,
      sleepingEntities: 0,
    });
  });

  it('should detect collisions after a dynamic entity crosses spatial cells in one step', () => {
    const fastWorld = new World({
      timeStep: 1 / 60,
      spatialCellSize: 10,
      spatialGridWidth: 100,
      spatialGridHeight: 100,
      enableSleep: false,
      resolverIterations: 1,
    });

    fastWorld.createEntity({
      uuid: 'moving',
      position: { x: 0, y: 0 },
      radius: 1,
      mass: 1,
      velocity: { x: 600, y: 0 },
      linearDamping: 0,
    });
    fastWorld.createEntity({
      uuid: 'wall',
      position: { x: 11, y: 0 },
      radius: 1,
      mass: 0,
    });

    let collisionDetected = false;
    fastWorld.getEvents().onCollisionEnter(() => {
      collisionDetected = true;
    });

    fastWorld.step();

    expect(collisionDetected).toBe(true);
  });

  it('should update broad-phase queries after direct entity mutation is synchronized', () => {
    const entity = world.createEntity({
      position: { x: 100, y: 100 },
      radius: 5,
      mass: 0,
    });

    entity.position.set(0, 0);
    world.updateEntity(entity);

    const result = world.queryAABB(new AABB(-10, -10, 10, 10));
    expect(result).toContain(entity);
  });

  it('should update broad-phase bounds after a collider shape change is synchronized', () => {
    const entity = world.createEntity({
      position: { x: 0, y: 0 },
      width: 2,
      height: 2,
      mass: 0,
    });

    // Prime the collider cache as an AABB before switching to a polygon.
    expect(world.queryAABB(new AABB(-2, -2, 2, 2))).toContain(entity);

    assignPolygonCollider(entity, {
      vertices: [
        new Vector2(-30, -1),
        new Vector2(30, -1),
        new Vector2(30, 1),
        new Vector2(-30, 1),
      ],
      isConvex: true,
    });
    world.updateEntity(entity);

    const result = world.queryAABB(new AABB(25, -2, 35, 2));
    expect(result).toContain(entity);
  });

  describe('static entities in the broad phase', () => {
    const setup = () => {
      const statics = [0, 1, 2].map((index) => world.createEntity({
        position: { x: 100 + index * 50, y: 100 },
        width: 20,
        height: 20,
        mass: Infinity,
        state: EntityState.Static,
      }));
      const mover = world.createEntity({ position: { x: 0, y: 0 }, radius: 4, mass: 1, velocity: { x: 5, y: 0 } });
      const update = vi.spyOn((world as unknown as { spatialPartition: { update: (entity: Entity) => void } }).spatialPartition, 'update');
      const countFor = (entity: Entity) => update.mock.calls.filter(([updated]) => updated === entity).length;
      return { statics, mover, update, countFor };
    };

    it('does not rebuild the bounds of static entities at every step', () => {
      const { statics, mover, countFor } = setup();

      for (let index = 0; index < 5; index += 1) world.step();

      statics.forEach((wall) => expect(countFor(wall)).toBeLessThanOrEqual(1)); // once, to learn where they are
      expect(countFor(mover)).toBeGreaterThanOrEqual(5); // a moving entity is followed at every step
    });

    it('picks up a static entity whose position was changed directly', () => {
      const { statics, countFor } = setup();
      world.step();
      world.step();
      const before = countFor(statics[0]!);

      statics[0]!.position.x += 200;
      world.step();

      expect(countFor(statics[0]!)).toBe(before + 1);
      expect(world.queryAABB(new AABB(290, 90, 310, 110))).toContain(statics[0]);
    });

    it('picks up a static entity that was resized', () => {
      const { statics, countFor } = setup();
      world.step();
      const before = countFor(statics[1]!);

      statics[1]!.width = 400;
      world.step();
      expect(countFor(statics[1]!)).toBe(before + 1);
    });
  });
});
