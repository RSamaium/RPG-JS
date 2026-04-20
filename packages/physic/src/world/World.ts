import { Entity } from '../physics/Entity';
import { Integrator, IntegrationMethod } from '../physics/integrator';
import { CollisionResolver } from '../collision/resolver';
import { SpatialHash } from '../collision/spatial-hash';
import { testCollision, createCollider } from '../collision/detector';
import { CollisionInfo } from '../collision/Collider';
import { EventSystem } from './events';
import { SpatialPartition } from './SpatialPartition';
import { Vector2 } from '../core/math/Vector2';
import { Ray, RaycastHit } from '../collision/Ray';
import type { EntityConfig } from '../physics/Entity';
import { sweepEntities } from '../collision/sweep';

/**
 * World configuration
 */
export interface WorldConfig {
  /** Time step for simulation (default: 1/60 for 60 FPS) */
  timeStep?: number;
  /** Integration method (default: Euler) */
  integrationMethod?: IntegrationMethod;
  /** Gravity vector (default: zero for top-down) */
  gravity?: Vector2;
  /** Spatial partition cell size (default: 100) */
  spatialCellSize?: number;
  /** Spatial partition grid width (default: 100) */
  spatialGridWidth?: number;
  /** Spatial partition grid height (default: 100) */
  spatialGridHeight?: number;
  /** Enable sleep for inactive entities (default: true) */
  enableSleep?: boolean;
  /** Tile width for grid-based logic (default: 32) */
  tileWidth?: number;
  /** Tile height for grid-based logic (default: 32) */
  tileHeight?: number;
  /** Sleep threshold in seconds (default: 0.5) */
  sleepThreshold?: number;
  /** Velocity threshold for sleep detection (default: 0.01) */
  sleepVelocityThreshold?: number;
  /** Custom spatial partition (optional) */
  spatialPartition?: SpatialPartition;
  /**
   * Optional quantization step (world units) applied to positions after every tick.
   * Set to a positive number (e.g. 1/16) to reduce floating point drift for networking.
   */
  positionQuantizationStep?: number;
  /**
   * Optional quantization step (world units / second) applied to velocities after every tick.
   * Set to a positive number (e.g. 1/256) to enforce deterministic clamps.
   */
  velocityQuantizationStep?: number;
  /**
   * Number of collision-resolution iterations per tick (default: 3).
   * Higher values further reduce interpenetration in crowded scenes.
   */
  resolverIterations?: number;
  /** Custom collision resolver factor controlling how aggressively overlaps are corrected. */
  positionCorrectionFactor?: number;
  /** Maximum positional correction applied per iteration (world units). */
  maxPositionCorrection?: number;
  /** Minimum penetration depth before a collision is resolved. */
  minPenetrationDepth?: number;
}

/**
 * Physics world
 * 
 * Manages entities, physics simulation, collisions, and events.
 * 
 * @example
 * ```typescript
 * const world = new World({ timeStep: 1/60 });
 * const entity = world.addEntity({ position: { x: 0, y: 0 }, radius: 10 });
 * world.step();
 * ```
 */
export class World {
  private entities: Set<Entity> = new Set();
  // Separate collections for performance
  private staticEntities: Set<Entity> = new Set();
  private dynamicEntities: Set<Entity> = new Set();
  private integrator: Integrator;
  private resolver: CollisionResolver;
  private spatialPartition: SpatialPartition;
  private events: EventSystem;
  private timeStep: number;
  private enableSleep: boolean;
  private tileWidth: number;
  private tileHeight: number;
  private sleepThreshold: number;
  private sleepVelocityThreshold: number;
  private previousCollisions: Map<string, CollisionInfo> = new Map();
  // Reused set for spatial queries to avoid allocation
  private queryResults: Set<Entity> = new Set();
  private readonly positionQuantizationStep: number | null;
  private readonly velocityQuantizationStep: number | null;
  private readonly resolverIterations: number;

  /**
   * Creates a new physics world
   * 
   * @param config - World configuration
   */
  constructor(config: WorldConfig = {}) {
    this.timeStep = config.timeStep ?? 1 / 60;
    this.enableSleep = config.enableSleep ?? true;
    this.tileWidth = config.tileWidth ?? 32;
    this.tileHeight = config.tileHeight ?? 32;
    this.sleepThreshold = config.sleepThreshold ?? 0.5;
    this.sleepVelocityThreshold = config.sleepVelocityThreshold ?? 0.01;
    this.positionQuantizationStep =
      typeof config.positionQuantizationStep === 'number' && config.positionQuantizationStep > 0
        ? config.positionQuantizationStep
        : null;
    this.velocityQuantizationStep =
      typeof config.velocityQuantizationStep === 'number' && config.velocityQuantizationStep > 0
        ? config.velocityQuantizationStep
        : null;

    // Create integrator
    const integratorConfig: {
      deltaTime: number;
      method?: IntegrationMethod;
      gravity?: Vector2;
    } = {
      deltaTime: this.timeStep,
      method: config.integrationMethod ?? IntegrationMethod.Euler,
    };
    if (config.gravity) {
      integratorConfig.gravity = config.gravity;
    }
    this.integrator = new Integrator(integratorConfig);

    // Create collision resolver
    this.resolverIterations = Math.max(1, Math.floor(config.resolverIterations ?? 3));
    const resolverConfig: any = {};
    if (config.positionCorrectionFactor !== undefined) resolverConfig.positionCorrectionFactor = config.positionCorrectionFactor;
    if (config.maxPositionCorrection !== undefined) resolverConfig.maxPositionCorrection = config.maxPositionCorrection;
    if (config.minPenetrationDepth !== undefined) resolverConfig.minPenetrationDepth = config.minPenetrationDepth;

    this.resolver = new CollisionResolver(resolverConfig);

    // Create spatial partition
    if (config.spatialPartition) {
      this.spatialPartition = config.spatialPartition;
    } else {
      this.spatialPartition = new SpatialHash(
        config.spatialCellSize ?? 100,
        config.spatialGridWidth ?? 100,
        config.spatialGridHeight ?? 100
      );
    }

    // Create event system
    this.events = new EventSystem();
  }

  /**
   * Gets the event system
   * 
   * @returns Event system instance
   */
  public getEvents(): EventSystem {
    return this.events;
  }

  /**
   * Returns the fixed simulation time step.
   *
   * @returns Time step in seconds
   */
  public getTimeStep(): number {
    return this.timeStep;
  }

  /**
   * Adds an entity to the world
   * 
   * @param entity - Entity to add
   * @returns The added entity
   */
  public addEntity(entity: Entity): Entity {
    this.entities.add(entity);
    if (entity.isStatic()) {
      this.staticEntities.add(entity);
    } else {
      this.dynamicEntities.add(entity);
    }
    this.spatialPartition.insert(entity);
    this.events.emitEntityAdded(entity);
    return entity;
  }

  /**
   * Performs a raycast against all entities in the world.
   * 
   * @param origin - Starting point of the ray
   * @param direction - Direction of the ray (normalized)
   * @param length - Maximum length (default: Infinity)
   * @param mask - Optional collision mask (layer)
   * @param filter - Optional filter function (return true to include entity)
   * @returns Raycast hit info if hit, null otherwise
   */
  public raycast(origin: Vector2, direction: Vector2, length: number = Infinity, mask?: number, filter?: (entity: Entity) => boolean): RaycastHit | null {
    const ray = new Ray(origin, direction, length);
    return this.spatialPartition.raycast(ray, mask, filter);
  }

  /**
   * Creates and adds a new entity
   * 
   * @param config - Entity configuration
   * @returns Created entity
   */
  public createEntity(config: EntityConfig): Entity {
    const entity = new Entity(config);
    return this.addEntity(entity);
  }

  /**
   * Removes an entity from the world
   * 
   * @param entity - Entity to remove
   */
  public removeEntity(entity: Entity): void {
    if (this.entities.delete(entity)) {
      this.staticEntities.delete(entity);
      this.dynamicEntities.delete(entity);
      this.spatialPartition.remove(entity);
      this.events.emitEntityRemoved(entity);
    }
  }

  /**
   * Gets all entities in the world
   * 
   * @returns Array of entities
   */
  public getEntities(): Entity[] {
    return Array.from(this.entities);
  }

  /**
   * Gets an entity by UUID
   * 
   * @param uuid - Entity UUID
   * @returns Entity or undefined
   */
  public getEntityByUUID(uuid: string): Entity | undefined {
    for (const entity of this.entities) {
      if (entity.uuid === uuid) {
        return entity;
      }
    }
    return undefined;
  }

  /**
   * Steps the physics simulation forward
   * 
   * Updates all entities, detects and resolves collisions.
   */
  public step(): void {
    // Update spatial partition with the latest positions
    this.refreshDynamicEntitiesInPartition();

    // Clear forces and integrate
    for (const entity of this.dynamicEntities) {
      if (!entity.isSleeping()) {
        const startPos = entity.position.clone();
        this.integrator.integrate(entity);

        // Check for tile change
        this.updateEntityTile(entity, startPos);

        // CCD: Check for tunneling if enabled
        if (entity.continuous) {
          this.performCCD(entity);
        }
      }
    }

    let firstPassCollisions: CollisionInfo[] = [];
    for (let iteration = 0; iteration < this.resolverIterations; iteration++) {
      const collisions = this.detectCollisions();
      if (iteration === 0) {
        firstPassCollisions = collisions;
      }
      if (collisions.length === 0) {
        break;
      }
      this.sortCollisionsForDeterminism(collisions);
      this.resolver.resolveAll(collisions);
      if (iteration + 1 < this.resolverIterations) {
        this.refreshDynamicEntitiesInPartition();
      }
    }

    if (this.positionQuantizationStep !== null || this.velocityQuantizationStep !== null) {
      this.quantizeEntities();
    }

    this.handleCollisionEvents(firstPassCollisions);

    if (this.enableSleep) {
      this.updateSleepState();
    }
  }

  /**
   * Detects collisions using spatial partition
   * 
   * @returns Array of collision infos
   */
  /**
   * Detects collisions using spatial partition
   * 
   * @returns Array of collision infos
   */
  private detectCollisions(): CollisionInfo[] {
    const collisions: CollisionInfo[] = [];

    // Only dynamic entities initiate collision checks
    for (const entity of this.dynamicEntities) {
      // Query nearby entities using reused set
      const nearby = this.spatialPartition.query(entity, this.queryResults);

      for (const other of nearby) {
        // Avoid duplicate checks for dynamic-dynamic pairs
        // For dynamic-dynamic: only check if entity.uuid < other.uuid
        // For dynamic-static: always check (since static won't initiate)
        if (other.isDynamic() && entity.uuid > other.uuid) {
          continue;
        }

        // Test collision
        const collision = testCollision(entity, other);
        if (collision) {
          collisions.push(collision);
        }
      }
    }

    return collisions;
  }

  private sortCollisionsForDeterminism(collisions: CollisionInfo[]): void {
    collisions.sort((a, b) => {
      const keyA = this.getCollisionKey(a);
      const keyB = this.getCollisionKey(b);
      return keyA.localeCompare(keyB);
    });
  }

  private getCollisionKey(collision: CollisionInfo): string {
    const idA = collision.entityA.uuid;
    const idB = collision.entityB.uuid;
    return idA < idB ? `${idA}-${idB}` : `${idB}-${idA}`;
  }

  /**
   * Handles collision enter/exit events
   * 
   * @param collisions - Current frame collisions
   */
  private handleCollisionEvents(collisions: CollisionInfo[]): void {
    const currentCollisions = new Map<string, CollisionInfo>();

    // Process current collisions
    for (const collision of collisions) {
      const pairKey = collision.entityA.uuid < collision.entityB.uuid
        ? `${collision.entityA.uuid}-${collision.entityB.uuid}`
        : `${collision.entityB.uuid}-${collision.entityA.uuid}`;

      currentCollisions.set(pairKey, collision);

      // Check if this is a new collision
      if (!this.previousCollisions.has(pairKey)) {
        this.events.emitCollisionEnter(collision);
        collision.entityA.notifyCollisionEnter(collision, collision.entityB);
        collision.entityB.notifyCollisionEnter(collision, collision.entityA);
      }
    }

    // Check for exit collisions
    for (const [pairKey, collision] of this.previousCollisions) {
      if (!currentCollisions.has(pairKey)) {
        this.events.emitCollisionExit(collision);
        collision.entityA.notifyCollisionExit(collision, collision.entityB);
        collision.entityB.notifyCollisionExit(collision, collision.entityA);
      }
    }

    // Update previous collisions
    this.previousCollisions = currentCollisions;
  }


  /**
   * Updates sleep state for entities
   */
  private updateSleepState(): void {
    for (const entity of this.entities) {
      if (entity.isStatic() || entity.isSleeping()) {
        continue;
      }

      const speed = entity.velocity.length();
      const angularSpeed = Math.abs(entity.angularVelocity);

      if (speed < this.sleepVelocityThreshold && angularSpeed < this.sleepVelocityThreshold) {
        entity.timeSinceMovement += this.timeStep;

        if (entity.timeSinceMovement >= this.sleepThreshold) {
          entity.sleep();
          this.events.emitEntitySleep(entity);
        }
      } else {
        entity.timeSinceMovement = 0;
        if (entity.isSleeping()) {
          entity.wakeUp();
          this.events.emitEntityWake(entity);
        }
      }
    }
  }

  /**
   * Clears all entities from the world
   */
  public clear(): void {
    for (const entity of this.entities) {
      this.events.emitEntityRemoved(entity);
    }
    this.entities.clear();
    this.spatialPartition.clear();
    this.previousCollisions.clear();
  }

  private quantizeEntities(): void {
    for (const entity of this.dynamicEntities) {
      if (this.positionQuantizationStep !== null) {
        entity.position.x = this.quantizeValue(entity.position.x, this.positionQuantizationStep);
        entity.position.y = this.quantizeValue(entity.position.y, this.positionQuantizationStep);
      }
      if (this.velocityQuantizationStep !== null) {
        entity.velocity.x = this.quantizeValue(entity.velocity.x, this.velocityQuantizationStep);
        entity.velocity.y = this.quantizeValue(entity.velocity.y, this.velocityQuantizationStep);
      }
    }
  }

  private quantizeValue(value: number, step: number): number {
    return Math.round(value / step) * step;
  }

  private refreshDynamicEntitiesInPartition(): void {
    for (const entity of this.dynamicEntities) {
      this.spatialPartition.update(entity);
    }
  }

  /**
   * Gets statistics about the world
   * 
   * @returns Statistics object
   */
  public getStats(): {
    totalEntities: number;
    dynamicEntities: number;
    staticEntities: number;
    sleepingEntities: number;
  } {
    let dynamic = 0;
    let static_ = 0;
    let sleeping = 0;

    for (const entity of this.entities) {
      if (entity.isStatic()) {
        static_++;
      } else {
        dynamic++;
      }
      if (entity.isSleeping()) {
        sleeping++;
      }
    }

    return {
      totalEntities: this.entities.size,
      dynamicEntities: dynamic,
      staticEntities: static_,
      sleepingEntities: sleeping,
    };
  }

  /**
   * Performs Continuous Collision Detection (CCD) for an entity
   * 
   * @param entity - Entity to check
   */
  /**
   * Updates entity tile position and triggers hooks
   * 
   * @param entity - Entity to update
   * @param previousPosition - Position before integration
   */
  private updateEntityTile(entity: Entity, previousPosition: Vector2): void {
    const oldTileX = Math.floor(previousPosition.x / this.tileWidth);
    const oldTileY = Math.floor(previousPosition.y / this.tileHeight);

    const newTileX = Math.floor(entity.position.x / this.tileWidth);
    const newTileY = Math.floor(entity.position.y / this.tileHeight);

    // Initialize currentTile if it's the first update (or if it was 0,0 by default)
    // We assume the entity starts in a valid tile or we sync it now
    if (entity.currentTile.x === 0 && entity.currentTile.y === 0 && (oldTileX !== 0 || oldTileY !== 0)) {
      entity.currentTile.set(oldTileX, oldTileY);
    }

    if (newTileX !== oldTileX || newTileY !== oldTileY) {
      // Check if can enter new tile
      if (!entity.checkCanEnterTile(newTileX, newTileY)) {
        // Prevent movement: revert to previous position
        // We also zero out velocity to stop momentum into the blocked tile
        entity.position.copyFrom(previousPosition);
        entity.velocity.set(0, 0);
        return;
      }

      // Trigger hooks
      entity.notifyLeaveTile(oldTileX, oldTileY);
      entity.currentTile.set(newTileX, newTileY);
      entity.notifyEnterTile(newTileX, newTileY);
    }
  }

  private performCCD(entity: Entity): void {
    // Simple CCD: Sweep against nearby static entities
    // We use the velocity * dt as the sweep vector
    // Note: This happens AFTER integration, so we are checking if the movement
    // that JUST happened caused tunneling.
    // Ideally CCD should happen BEFORE position update, or we re-integrate?
    // Standard approach:
    // 1. Integrate velocity
    // 2. Sweep from oldPos to newPos
    // 3. If hit, clamp position

    // Since we already integrated, we can reconstruct the motion:
    // delta = velocity * dt
    // But position is already updated.
    // Let's assume we want to prevent tunneling through static objects.

    // We need the previous position? Entity doesn't store it by default.
    // But we know velocity.
    // Let's approximate: sweep backwards? Or just check along the path.

    // Better: Check against potential colliders in the path.
    const dt = this.timeStep;
    const delta = entity.velocity.mul(dt);
    const dist = delta.length();

    if (dist < entity.radius) {
      // Moving slowly enough that discrete collision should catch it
      return;
    }

    // Calculate swept AABB
    const collider = createCollider(entity);
    if (!collider) return;

    const currentBounds = collider.getBounds();
    const originalBounds = currentBounds.translate(-delta.x, -delta.y);
    const sweptBounds = currentBounds.union(originalBounds);

    const nearby = this.spatialPartition.queryAABB(sweptBounds);
    let minTime = 1.0;
    let collision: SweepResult | null = null;

    for (const other of nearby) {
      if (other === entity || !other.isStatic()) continue;
      if (!entity.canCollideWith(other)) continue;

      // Sweep entity against other
      // We need to sweep from (pos - delta) to pos
      // Or equivalent: sweep other (static) against entity moving by -delta?
      // Let's use sweepEntities helper

      // We want to check if entity moving by 'delta' hits 'other'.
      // But entity is ALREADY at 'pos'.
      // So effectively we are checking if it hit something on the way.

      // Let's temporarily move entity back
      const originalPos = entity.position.clone();
      entity.position.subInPlace(delta);

      const hit = sweepEntities(entity, other, delta);

      // Restore position
      entity.position.copyFrom(originalPos);

      if (hit && hit.time < minTime) {
        minTime = hit.time;
        collision = hit;
      }
    }

    if (collision && minTime < 1.0) {
      // Clamp position to impact point
      // Move to impact point + small epsilon offset
      const correction = collision.normal.mul(0.001); // Epsilon
      entity.position.subInPlace(delta.mul(1 - minTime)).addInPlace(correction);

      // Kill velocity in normal direction
      const vn = entity.velocity.dot(collision.normal);
      if (vn < 0) {
        entity.velocity.subInPlace(collision.normal.mul(vn));
      }
    }
  }
}

