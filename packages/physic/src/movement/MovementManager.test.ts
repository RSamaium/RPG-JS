import { describe, expect, it, vi } from 'vitest';
import { PhysicsEngine } from '../api/PhysicsEngine';
import { Entity } from '../physics/Entity';
import { MovementManager } from './MovementManager';
import { LinearMove } from './strategies/LinearMove';

describe('MovementManager helpers', () => {
  it('creates a dash handle and tracks active movement', () => {
    const engine = new PhysicsEngine({ timeStep: 1 / 60 });
    const player = engine.createCharacter('player', {
      x: 0,
      y: 0,
      hitbox: 12,
      speed: 120,
    });
    const movement = engine.getMovementManager();

    const handle = movement.dash(player, {
      speed: 240,
      direction: { x: 1, y: 0 },
      duration: 0.2,
    });

    expect(handle.targetId).toBe('player');
    expect(handle.isActive()).toBe(true);
    expect(movement.isMoving(player)).toBe(true);
    expect(movement.count(player)).toBe(1);
  });

  it('replaces existing strategies by default', () => {
    const engine = new PhysicsEngine({ timeStep: 1 / 60 });
    const player = engine.createEntity({
      uuid: 'player',
      position: { x: 0, y: 0 },
      mass: 1,
    });
    const movement = engine.getMovementManager();

    const first = movement.linearMove(player, {
      velocity: { x: 40, y: 0 },
    });
    const second = movement.dash(player, {
      speed: 120,
      direction: { x: 1, y: 0 },
      duration: 0.1,
    });

    expect(first.isActive()).toBe(false);
    expect(second.isActive()).toBe(true);
    expect(movement.count(player)).toBe(1);
  });

  it('can stack strategies when replace is false', () => {
    const engine = new PhysicsEngine({ timeStep: 1 / 60 });
    const player = engine.createEntity({
      uuid: 'player',
      position: { x: 0, y: 0 },
      mass: 1,
    });
    const movement = engine.getMovementManager();

    movement.linearMove(player, {
      velocity: { x: 40, y: 0 },
    });
    movement.dash(player, {
      speed: 120,
      direction: { x: 1, y: 0 },
      duration: 0.1,
      replace: false,
    });

    expect(movement.count(player)).toBe(2);
  });

  it('cancels a handle and resolves its finished promise', async () => {
    const engine = new PhysicsEngine({ timeStep: 1 / 60 });
    const player = engine.createEntity({
      uuid: 'player',
      position: { x: 0, y: 0 },
      mass: 1,
    });
    const movement = engine.getMovementManager();
    const handle = movement.linearMove(player, {
      velocity: { x: 40, y: 0 },
    });

    expect(handle.cancel()).toBe(true);
    await handle.finished;

    expect(handle.isActive()).toBe(false);
    expect(movement.count(player)).toBe(0);
  });

  it('resolves finished and stops velocity when a helper completes naturally', async () => {
    const engine = new PhysicsEngine({ timeStep: 1 / 60 });
    const player = engine.createEntity({
      uuid: 'player',
      position: { x: 0, y: 0 },
      mass: 1,
    });
    const movement = engine.getMovementManager();
    const onComplete = vi.fn();

    const handle = movement.linearMove(player, {
      velocity: { x: 80, y: 0 },
      duration: 0.1,
      stopOnComplete: true,
      onComplete,
    });

    movement.update(0.12);
    await handle.finished;

    expect(handle.isActive()).toBe(false);
    expect(onComplete).toHaveBeenCalledOnce();
    expect(player.velocity.x).toBe(0);
    expect(player.velocity.y).toBe(0);
  });

  it('supports aliases with string identifiers from an engine-bound manager', () => {
    const engine = new PhysicsEngine({ timeStep: 1 / 60 });
    engine.createCharacter('player', {
      x: 0,
      y: 0,
      hitbox: 12,
      speed: 120,
    });
    const movement = engine.getMovementManager();

    movement.dash('player', {
      speed: 120,
      direction: { x: 1, y: 0 },
      duration: 0.1,
    });

    expect(movement.isMoving('player')).toBe(true);
    expect(movement.count('player')).toBe(1);

    movement.stop('player');

    expect(movement.isMoving('player')).toBe(false);
    expect(movement.count('player')).toBe(0);
  });

  it('passes initial velocity to ice helper movements', () => {
    const engine = new PhysicsEngine({ timeStep: 1 / 60 });
    const player = engine.createEntity({
      uuid: 'player',
      position: { x: 0, y: 0 },
      mass: 1,
    });
    const movement = engine.getMovementManager();

    movement.ice(player, {
      direction: { x: 1, y: 0 },
      maxSpeed: 100,
      acceleration: 0,
      friction: 0.5,
      initialVelocity: { x: 36, y: 0 },
    });
    movement.update(1 / 60);

    expect(player.velocity.x).toBe(36);
    expect(player.velocity.y).toBe(0);
  });

  it('keeps low-level add compatible', async () => {
    const manager = new MovementManager();
    const entity = new Entity({
      uuid: 'entity',
      position: { x: 0, y: 0 },
      mass: 1,
    });

    const done = manager.add(entity, new LinearMove({ x: 10, y: 0 }, 0.1));

    manager.update(0.12);
    await done;

    expect(manager.hasActiveStrategies(entity)).toBe(false);
  });

  it('supports seekAvoid with a string target on engine-bound managers', () => {
    const engine = new PhysicsEngine({ timeStep: 1 / 60 });
    const follower = engine.createEntity({
      uuid: 'follower',
      position: { x: 0, y: 0 },
      mass: 1,
    });
    engine.createEntity({
      uuid: 'target',
      position: { x: 100, y: 0 },
      mass: 1,
    });
    const movement = engine.getMovementManager();

    movement.seekAvoid(follower, {
      target: 'target',
      maxSpeed: 4,
      repulseRadius: 6,
      repulseWeight: 4,
    });
    movement.update(1 / 60);

    expect(follower.velocity.x).toBeGreaterThan(0);
  });
});

describe('MovementManager pause', () => {
  it('does not update the strategies of a paused entity, and goes on after resume', () => {
    const engine = new PhysicsEngine({ timeStep: 1 / 60, enableSleep: false });
    const npc = engine.createEntity({ uuid: 'npc', position: { x: 0, y: 0 }, radius: 10, mass: 1, linearDamping: 0 });
    const movement = engine.getMovementManager();
    const handle = movement.linearMove(npc, { velocity: { x: 60, y: 0 }, duration: 0.1 });

    engine.stepWithMovements();
    const xBeforePause = npc.position.x;
    expect(xBeforePause).toBeGreaterThan(0);

    movement.pause(npc);
    expect(movement.isPaused('npc')).toBe(true);
    expect(npc.isSleeping()).toBe(true);
    for (let i = 0; i < 30; i++) engine.stepWithMovements();

    // Neither the entity nor the time of the movement advanced
    expect(npc.position.x).toBe(xBeforePause);
    expect(handle.isActive()).toBe(true);

    expect(movement.resume(npc)).toBe(true);
    expect(movement.isPaused(npc)).toBe(false);
    expect(npc.isSleeping()).toBe(false);
    engine.stepWithMovements();
    expect(npc.position.x).toBeGreaterThan(xBeforePause);

    for (let i = 0; i < 10; i++) engine.stepWithMovements();
    expect(handle.isActive()).toBe(false);
  });

  it('pauses the strategies added after the pause, and an unknown identifier is allowed', () => {
    const engine = new PhysicsEngine({ timeStep: 1 / 60, enableSleep: false });
    const movement = engine.getMovementManager();
    expect(() => movement.pause('later')).not.toThrow();

    const npc = engine.createEntity({ uuid: 'later', position: { x: 0, y: 0 }, radius: 10, mass: 1 });
    const update = vi.fn();
    movement.add(npc, { update });
    movement.update(1 / 60);
    expect(update).not.toHaveBeenCalled();

    expect(movement.resume('later')).toBe(true);
    expect(movement.resume('later')).toBe(false);
    movement.update(1 / 60);
    expect(update).toHaveBeenCalledTimes(1);
  });
});
