/**
 * RPG Physic - A deterministic 2D top-down physics library
 * 
 * @packageDocumentation
 */

// Core Math Layer
export { Vector2 } from './core/math/Vector2';
export { Matrix2 } from './core/math/Matrix2';
export { AABB } from './core/math/AABB';
export * from './core/math/utils';
export * from './core/types';

// Physics Layer
export {
  Entity,
  type EntityConfig,
  type CardinalDirection,
  type CollisionFilter,
  type ResolutionFilter,
  type EntityCollisionEvent,
  type EntityCollisionHandler,
  type EntityPositionSyncEvent,
  type EntityPositionSyncHandler,
  type EntityDirectionSyncEvent,
  type EntityDirectionSyncHandler,
  type EntityMovementChangeEvent,
  type EntityMovementChangeHandler,
  type EntityTileEvent,
  type EntityTileHandler,
  type EntityCanEnterTileHandler,
} from './physics/Entity';
export { Integrator, IntegrationMethod, type IntegratorConfig } from './physics/integrator';
export * from './physics/forces';
export * from './physics/constraints';

// Collision Layer
export type { Collider, CollisionInfo, ContactPoint } from './collision/Collider';
export { CircleCollider } from './collision/CircleCollider';
export { AABBCollider } from './collision/AABBCollider';
export { CapsuleCollider } from './collision/CapsuleCollider';
export { SpatialHash } from './collision/spatial-hash';
export { Quadtree } from './collision/quadtree';
export { BVH } from './collision/bvh';
export { CollisionResolver, type ResolverConfig } from './collision/resolver';
export * from './collision/detector';
export { PolygonCollider, assignPolygonCollider, type PolygonConfig } from './collision/PolygonCollider';
export { raycast, type RaycastHit } from './collision/raycast';
export { Ray, type RaycastHit as ColliderRaycastHit } from './collision/Ray';
export { sweepEntities, type SweepResult } from './collision/sweep';

// World Layer
export { World, type WorldConfig } from './world/World';
export {
  EventSystem,
  type CollisionEventHandler,
  type EntityEventHandler,
  type SleepEventHandler,
  type WakeEventHandler,
} from './world/events';
export type { SpatialPartition } from './world/SpatialPartition';

// Region Layer
/**
 * @experimental Region simulation is not the recommended default path for
 * RPG-JS server physics yet.
 */
export { Region, type RegionConfig } from './region/Region';
/**
 * @experimental Region simulation is not the recommended default path for
 * RPG-JS server physics yet.
 */
export { RegionManager, type RegionManagerConfig } from './region/RegionManager';
export * from './region/migration';

// API Layer
export {
  PhysicsEngine,
  type PhysicsEngineConfig,
  type PhysicsSnapshot,
  type RPGCharacterOptions,
  type RPGEntityRef,
  type RPGFrameInput,
  type RPGHitbox,
  type RPGMovementDirection,
  type RPGSensorOptions,
  type RPGStaticObstacleOptions,
} from './api/PhysicsEngine';
export {
  ZoneManager,
  type ZoneConfig,
  type StaticZoneConfig,
  type AttachedZoneConfig,
  type ZoneDirection,
  type ZoneCallbacks,
  type ZoneInfo,
} from './api/ZoneManager';

// Movement System
export * from './movement';

// Utils
export { ObjectPool } from './utils/pool';
export * from './utils/uuid';

export { ProjectileType } from './movement/strategies/ProjectileMovement';
export {
  ProjectileSystem,
  type ProjectileDestroyEvent,
  type ProjectileDestroyReason,
  type ProjectileHitEvent,
  type ProjectileHitResolution,
  type ProjectilePathPoint,
  type ProjectileSpawnConfig,
  type ProjectileSpawnEvent,
  type ProjectileState,
  type ProjectileHandler,
  type ProjectileSystemOptions,
} from './projectile/ProjectileSystem';


export {
  PredictionController,
  type PredictionControllerConfig,
  type PredictionHistoryEntry,
  type PredictionAckResult,
  type PredictionState,
} from './network/PredictionController';
export {
  DeterministicInputBuffer,
  type QueuedInput,
} from './network/DeterministicInputBuffer';
