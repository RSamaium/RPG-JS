import { describe, expect, it, vi } from 'vitest';
import { PhysicsEngine } from '../api/PhysicsEngine';
import { ProjectileSystem } from './ProjectileSystem';

describe('ProjectileSystem', () => {
  it('advances projectiles deterministically without creating physics entities', () => {
    const engine = new PhysicsEngine();
    const projectiles = new ProjectileSystem(engine);

    projectiles.spawn({
      id: 'arrow',
      origin: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      speed: 10,
      range: 100,
      ttl: 10,
      spawnTick: 7,
    });

    projectiles.step(0.5);

    const arrow = projectiles.getProjectile('arrow');
    expect(arrow?.position.x).toBeCloseTo(5);
    expect(arrow?.position.y).toBeCloseTo(0);
    expect(arrow?.distanceTraveled).toBeCloseTo(5);
    expect(arrow?.age).toBeCloseTo(0.5);
    expect(arrow?.spawnTick).toBe(7);
    expect(engine.getEntities()).toHaveLength(0);
  });

  it('emits hit and destroy events when a projectile reaches an obstacle', () => {
    const engine = new PhysicsEngine();
    engine.createStaticObstacle('wall', {
      x: 50,
      y: 0,
      width: 10,
      height: 20,
    });
    const projectiles = new ProjectileSystem(engine);
    const onHit = vi.fn();
    const onDestroy = vi.fn();
    projectiles.onHit(onHit);
    projectiles.onDestroy(onDestroy);

    projectiles.spawn({
      id: 'arrow',
      origin: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      speed: 100,
      range: 200,
      ttl: 10,
    });
    projectiles.step(1);

    expect(projectiles.getProjectile('arrow')).toBeUndefined();
    expect(onHit).toHaveBeenCalledOnce();
    expect(onHit.mock.calls[0][0].hit.entity.uuid).toBe('wall');
    expect(onDestroy).toHaveBeenCalledWith(expect.objectContaining({ reason: 'hit' }));
  });

  it('destroys projectiles when ttl expires', () => {
    const projectiles = new ProjectileSystem(new PhysicsEngine());
    const onDestroy = vi.fn();
    projectiles.onDestroy(onDestroy);

    projectiles.spawn({
      id: 'spark',
      origin: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      speed: 10,
      range: 100,
      ttl: 0.25,
    });
    projectiles.step(0.5);

    expect(projectiles.getProjectile('spark')).toBeUndefined();
    expect(onDestroy).toHaveBeenCalledWith(expect.objectContaining({ reason: 'ttl' }));
  });

  it('destroys projectiles when range is reached', () => {
    const projectiles = new ProjectileSystem(new PhysicsEngine());
    const onDestroy = vi.fn();
    projectiles.onDestroy(onDestroy);

    projectiles.spawn({
      id: 'bolt',
      origin: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      speed: 100,
      range: 10,
      ttl: 10,
    });
    projectiles.step(1);

    expect(projectiles.getProjectile('bolt')).toBeUndefined();
    expect(onDestroy).toHaveBeenCalledWith(expect.objectContaining({ reason: 'range' }));
  });

  it('ignores the owner by default', () => {
    const engine = new PhysicsEngine();
    engine.createEntity({
      uuid: 'owner',
      position: { x: 5, y: 0 },
      radius: 10,
      mass: 1,
    });
    const projectiles = new ProjectileSystem(engine);
    const onHit = vi.fn();
    projectiles.onHit(onHit);

    projectiles.spawn({
      id: 'arrow',
      ownerId: 'owner',
      origin: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      speed: 10,
      range: 100,
      ttl: 10,
    });
    projectiles.step(0.5);

    expect(onHit).not.toHaveBeenCalled();
    expect(projectiles.getProjectile('arrow')).toBeDefined();
  });

  it('can track many active projectiles without adding physics entities', () => {
    const engine = new PhysicsEngine();
    const projectiles = new ProjectileSystem(engine);

    for (let i = 0; i < 1000; i += 1) {
      projectiles.spawn({
        id: `projectile-${i}`,
        origin: { x: 0, y: i },
        direction: { x: 1, y: 0 },
        speed: 100,
        range: 1000,
        ttl: 10,
      });
    }

    projectiles.step(1 / 60);

    expect(projectiles.getProjectiles()).toHaveLength(1000);
    expect(engine.getEntities()).toHaveLength(0);
  });

  it('follows a custom path and ends with the end reason', () => {
    const engine = new PhysicsEngine();
    const projectiles = new ProjectileSystem(engine);
    const onDestroy = vi.fn();
    projectiles.onDestroy(onDestroy);

    projectiles.spawn({
      id: 'lob',
      origin: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      speed: 1,
      ttl: 10,
      path: (age) => ({ x: Math.min(age, 1) * 100, y: 0, done: age >= 1 }),
    });
    projectiles.step(0.5);
    expect(projectiles.getProjectile('lob')?.position.x).toBeCloseTo(50);
    projectiles.step(0.5);
    expect(onDestroy).toHaveBeenCalledWith(expect.objectContaining({ reason: 'end' }));
  });

  it('flies through entities with the continue resolution, once per entity', () => {
    const engine = new PhysicsEngine();
    engine.createStaticObstacle('a', { x: 20, y: -5, width: 4, height: 10 });
    engine.createStaticObstacle('b', { x: 50, y: -5, width: 4, height: 10 });
    const projectiles = new ProjectileSystem(engine);
    const onHit = vi.fn();
    projectiles.onHit(onHit);

    projectiles.spawn({
      id: 'boomerang',
      origin: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      speed: 100,
      range: 100,
      ttl: 10,
      resolveHit: () => 'continue',
    });
    projectiles.step(1);

    expect(onHit.mock.calls.map(([event]) => event.hit.entity.uuid)).toEqual(['a', 'b']);
  });

  it('keeps flying on a new path after a redirect', () => {
    const engine = new PhysicsEngine();
    engine.createStaticObstacle('wall', { x: 50, y: -10, width: 10, height: 20 });
    const projectiles = new ProjectileSystem(engine);

    projectiles.spawn({
      id: 'disc',
      origin: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      speed: 1,
      ttl: 10,
      path: (age) => ({ x: age * 100, y: 0 }),
      resolveHit: (hit) => {
        const bounceAt = hit.point.x;
        projectiles.update('disc', { path: (age) => ({ x: bounceAt - (age * 100 - bounceAt), y: 0 }) });
        return 'redirect';
      },
    });
    projectiles.step(1);

    const disc = projectiles.getProjectile('disc');
    expect(disc).toBeDefined();
    expect(disc!.position.x).toBeLessThan(50);
  });
});
