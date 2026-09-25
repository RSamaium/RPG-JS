import { Vector2 } from "@rpgjs/common";
import type { ClientProjectileImpact, ClientProjectileSpawn } from "../Game/ProjectileManager";

/** Raycast surface of the client physics engine used for prediction. */
interface ProjectileRaycaster {
  raycast(
    origin: Vector2,
    direction: Vector2,
    range: number,
    collisionMask: ClientProjectileSpawn["collisionMask"],
    filter: (entity: { uuid: string }) => boolean,
  ): { entity: { uuid: string }; point: { x: number; y: number }; distance: number } | null | undefined;
}

/**
 * Predict where a projectile hits by raycasting the client physics world.
 *
 * The prediction is only visual: the server still decides the authoritative
 * impact. Returns `null` when prediction is disabled, the projectile data is
 * invalid, or nothing is hit within range.
 */
export function predictProjectileImpact(
  physic: ProjectileRaycaster | undefined,
  projectile: ClientProjectileSpawn,
): ClientProjectileImpact | null {
  if (projectile.predictImpact === false) {
    return null;
  }
  if (!physic || !Number.isFinite(projectile.range) || projectile.range <= 0) {
    return null;
  }
  const origin = projectile.origin;
  const direction = projectile.direction;
  if (
    !origin ||
    !direction ||
    !Number.isFinite(origin.x) ||
    !Number.isFinite(origin.y) ||
    !Number.isFinite(direction.x) ||
    !Number.isFinite(direction.y) ||
    (direction.x === 0 && direction.y === 0)
  ) {
    return null;
  }

  const hit = physic.raycast(
    new Vector2(origin.x, origin.y),
    new Vector2(direction.x, direction.y),
    projectile.range,
    projectile.collisionMask,
    (entity) => projectile.ignoreOwner === false || !projectile.ownerId || entity.uuid !== projectile.ownerId,
  );
  if (!hit) {
    return null;
  }
  return {
    id: projectile.id,
    targetId: hit.entity.uuid,
    x: hit.point.x,
    y: hit.point.y,
    distance: hit.distance,
  };
}
