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

  describe('lookup by UUID', () => {
    it('finds an entity, and no longer after it is removed or the world is cleared', () => {
      const a = world.createEntity({ uuid: 'a', position: { x: 0, y: 0 }, radius: 10 });
      const b = world.createEntity({ uuid: 'b', position: { x: 50, y: 0 }, radius: 10 });
      expect(world.getEntityByUUID('a')).toBe(a);
      expect(world.getEntityByUUID('b')).toBe(b);

      world.removeEntity(a);
      expect(world.getEntityByUUID('a')).toBeUndefined();

      world.clear();
      expect(world.getEntityByUUID('b')).toBeUndefined();
    });

    it('returns the first entity added when two share a UUID, then the other one', () => {
      const first = world.createEntity({ uuid: 'same', position: { x: 0, y: 0 }, radius: 10 });
      const second = world.createEntity({ uuid: 'same', position: { x: 50, y: 0 }, radius: 10 });
      expect(world.getEntityByUUID('same')).toBe(first);

      world.removeEntity(first);
      expect(world.getEntityByUUID('same')).toBe(second);
    });
  });

  describe('position notifications', () => {
    it('notifies a moving entity once per step', () => {
      const entity = world.createEntity({ position: { x: 0, y: 0 }, radius: 10, mass: 1, linearDamping: 0 });
      entity.setVelocity({ x: 60, y: 0 });
      const handler = vi.fn();
      entity.onPositionChange(handler);

      world.step();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].x).toBe(entity.position.x);
    });

    it('notifies once, with the resolved position, an entity pushed back by a collision', () => {
      world.createEntity({ position: { x: 25, y: 0 }, width: 20, height: 100, mass: Infinity, state: EntityState.Static });
      const entity = world.createEntity({ position: { x: 0, y: 0 }, width: 20, height: 20, mass: 1, linearDamping: 0 });
      entity.setVelocity({ x: 600, y: 0 });
      const handler = vi.fn();
      entity.onPositionChange(handler);

      world.step();

      // Without the collision, the entity would be at x = 10
      expect(entity.position.x).toBeLessThan(10);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].x).toBe(entity.position.x);
      expect(handler.mock.calls[0][0].y).toBe(entity.position.y);
    });

    it('notifies immediately outside of a step', () => {
      const entity = world.createEntity({ position: { x: 0, y: 0 }, radius: 10 });
      const handler = vi.fn();
      entity.onPositionChange(handler);

      entity.teleport({ x: 50, y: 60 });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0]).toMatchObject({ x: 50, y: 60 });
    });

    it('notifies immediately once the entity is removed from the world', () => {
      const entity = world.createEntity({ position: { x: 0, y: 0 }, radius: 10 });
      const handler = vi.fn();
      entity.onPositionChange(handler);
      world.removeEntity(entity);

      entity.teleport({ x: 5, y: 5 });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('sleeping entities', () => {
    beforeEach(() => {
      world = new World({ timeStep: 1 / 60, enableSleep: false });
    });

    it('keeps the collision of a sleeping entity while nothing moves, and ends it when the entity is removed', () => {
      const zone = world.createEntity({ uuid: 'zone', position: { x: 0, y: 0 }, width: 100, height: 100, mass: Infinity, state: EntityState.Static });
      const npc = world.createEntity({ uuid: 'npc', position: { x: 10, y: 0 }, width: 20, height: 20, mass: 1 });
      npc.shouldResolveCollisionWith = () => false;
      zone.shouldResolveCollisionWith = () => false;
      const enter = vi.fn();
      const exit = vi.fn();
      world.getEvents().onCollisionEnter(enter);
      world.getEvents().onCollisionExit(exit);

      world.step();
      expect(enter).toHaveBeenCalledTimes(1);

      npc.sleep();
      for (let i = 0; i < 5; i++) world.step();
      expect(enter).toHaveBeenCalledTimes(1);
      expect(exit).not.toHaveBeenCalled();

      world.removeEntity(npc);
      world.step();
      expect(exit).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['a', 'z'],
      ['z', 'a'],
    ])('detects a moving entity "%s" that reaches a sleeping entity "%s"', (movingId, sleepingId) => {
      const sleeping = world.createEntity({ uuid: sleepingId, position: { x: 40, y: 0 }, width: 20, height: 20, mass: 1 });
      const moving = world.createEntity({ uuid: movingId, position: { x: 0, y: 0 }, width: 20, height: 20, mass: 1, linearDamping: 0 });
      const enter = vi.fn();
      world.getEvents().onCollisionEnter(enter);
      sleeping.sleep();
      world.step();
      world.step();
      expect(enter).not.toHaveBeenCalled();

      moving.setVelocity({ x: 300, y: 0 });
      for (let i = 0; i < 10; i++) world.step();

      expect(enter).toHaveBeenCalledTimes(1);
      // The moving entity did not walk through the sleeping one
      expect(moving.position.x).toBeLessThan(sleeping.position.x);
    });

    it('detects a static entity added on a sleeping entity', () => {
      const npc = world.createEntity({ uuid: 'npc', position: { x: 0, y: 0 }, width: 20, height: 20, mass: 1 });
      npc.sleep();
      world.step();
      world.step();
      const enter = vi.fn();
      world.getEvents().onCollisionEnter(enter);

      const zone = world.createEntity({ uuid: 'zone', position: { x: 5, y: 0 }, width: 50, height: 50, mass: Infinity, state: EntityState.Static });
      zone.shouldResolveCollisionWith = () => false;
      world.step();

      expect(enter).toHaveBeenCalledTimes(1);
    });

    it('detects a sleeping entity that was moved directly', () => {
      const zone = world.createEntity({ uuid: 'zone', position: { x: 500, y: 0 }, width: 50, height: 50, mass: Infinity, state: EntityState.Static });
      zone.shouldResolveCollisionWith = () => false;
      const npc = world.createEntity({ uuid: 'npc', position: { x: 0, y: 0 }, width: 20, height: 20, mass: 1 });
      npc.shouldResolveCollisionWith = () => false;
      npc.sleep();
      world.step();
      world.step();
      const enter = vi.fn();
      const exit = vi.fn();
      world.getEvents().onCollisionEnter(enter);
      world.getEvents().onCollisionExit(exit);

      npc.position.set(500, 0);
      world.step();
      expect(enter).toHaveBeenCalledTimes(1);

      npc.position.set(0, 0);
      world.step();
      expect(exit).toHaveBeenCalledTimes(1);
    });
  });
});
