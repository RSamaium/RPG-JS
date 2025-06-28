import * as Matter from 'matter-js';
import { Direction, RpgCommonPlayer } from './Player';

interface Collision {
  id: string;
  timestamp: number;
}

interface HitboxData {
  id: string;
  type: 'static' | 'movable';
  body: Matter.Body;
  isMoving?: boolean; // Track movement state
  previousPosition?: Matter.Vector; // Track previous position for movement detection
  // Add sliding option
  enableSliding?: boolean; // Enable collision sliding for this hitbox
  slidingOptions?: SlidingOptions; // Sliding configuration
}

// Nouvelles interfaces pour les zones
export interface ZoneOptions {
  /** World x‑coordinate (ignored if linkedTo) */
  x?: number;
  /** World y‑coordinate (ignored if linkedTo) */
  y?: number;
  /** Circle radius (px) */
  radius: number;
  /** Vision aperture. 360 = full circle, <360 = cone */
  angle?: number;
  /** Facing direction used when angle < 360 */
  direction?: Direction;
  /** If supplied, zone tracks this hitbox id */
  linkedTo?: string;
  /** If true, walls (static hitboxes) stop vision */
  limitedByWalls?: boolean;
}

// Add sliding options interface
export interface SlidingOptions {
  /** Enable collision sliding */
  enabled?: boolean;
  /** Sliding friction factor (0-1, where 0 = no sliding, 1 = perfect sliding) */
  friction?: number;
  /** Minimum velocity threshold for sliding to occur */
  minVelocity?: number;
}

export interface ZoneData {
  id: string;
  /** 'static' if x/y provided, otherwise 'linked' */
  type: 'static' | 'linked';
  /** Underlying Matter sensor body */
  body: Matter.Body;
  /** Host hitbox id when type === 'linked' */
  linkedTo?: string;
  /** Aperture in radians (π*2 for full circle) */
  aperture: number;
  /** limitedByWalls flag */
  limitedByWalls: boolean;
}

/**
 * Class to manage physics in a 2D RPG world without gravity using MatterJS
 * 
 * Provides management for:
 * - Static hitboxes (map elements, obstacles)
 * - Movable hitboxes (players, events)
 * - Collision detection and tracking
 * - Collision events (enter/exit)
 * - Zones (sensor areas that detect entities without physical collision)
 */
export class RpgCommonPhysic {
  private engine: Matter.Engine;
  private world: Matter.World;
  private hitboxes: Map<string, HitboxData> = new Map();
  private collisions: Map<string, Set<string>> = new Map();
  private collisionEvents: Map<string, { 
    onCollisionEnter?: (collidedWith: string[]) => void;
    onCollisionExit?: (collidedWith: string[]) => void;
  }> = new Map();
  
  // Add movement events map
  private movementEvents: Map<string, { 
    onStartMoving?: () => void;
    onStopMoving?: () => void;
  }> = new Map();
  
  // Nouvelles propriétés pour les zones
  private zones: Map<string, ZoneData> = new Map();
  private zoneCollisions: Map<string, Set<string>> = new Map();
  private zoneEvents: Map<string, {
    onEnter?: (hitIds: string[]) => void;
    onExit?: (hitIds: string[]) => void;
  }> = new Map();

  // Add sliding-related properties
  private collisionNormals: Map<string, Matter.Vector[]> = new Map(); // Store collision normals for sliding
  private lastVelocities: Map<string, Matter.Vector> = new Map(); // Store last frame velocities
  private intendedMovements: Map<string, Matter.Vector> = new Map(); // Store intended movements for sliding
  private collisionData: Map<string, { body: Matter.Body; otherBody: Matter.Body; analysis: any }[]> = new Map(); // Store collision analysis data

  /**
   * Initialize the physics engine with no gravity
   * 
   * @example
   * ```ts
   * const physic = new RpgCommonPhysic();
   * ```
   */
  constructor() {
    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: 0 }
    });
    this.world = this.engine.world;

    // Setup collision detection
    Matter.Events.on(this.engine, 'collisionStart', (event) => this.handleCollisionStart(event));
    Matter.Events.on(this.engine, 'collisionEnd', (event) => this.handleCollisionEnd(event));
  }

  /**
   * Updates the physics simulation
   * 
   * @param delta - Time delta in milliseconds
   * 
   * @example
   * ```ts
   * // Update physics in game loop
   * physic.update(16); // 16ms = ~60fps
   * ```
   */
  update(delta: number): void {
    // 1. Update the physics engine (will apply translations requested by moveBody)
    Matter.Engine.update(this.engine, delta);

    // 2. Apply sliding corrections after physics update (using collision data from this frame)
    this.applySlidingCorrections();

    // 3. Resolve movable-to-movable collisions to prevent pushing
    this.resolveMovableCollisions();

    // 4. Resolve sensor collisions with static bodies (for events that shouldn't pass through walls)
    this.resolveSensorWallCollisions();

    // 5. Sync bodies positions to player objects
    this.syncBodies();
    
    // 6. Sync linked zones -> host hitboxes
    this.syncLinkedZones();
    
    // 7. Check for movement state changes
    this.checkMovementChanges();
    
    // 8. Clear intended movements for next frame (collision normals are cleared in collision end events)
    this.intendedMovements.clear();
  }

  /**
   * Synchronize all physics bodies with their associated players
   * 
   * Updates player positions based on their physics bodies after physics calculations
   * 
   * @example
   * ```ts
   * // Called automatically in update()
   * physic.syncBodies();
   * ```
   */
  private syncBodies(): void {
    for (const [id, hitboxData] of this.hitboxes.entries()) {
      const body = hitboxData.body;
      const player = body.label;

      // Only sync if the label is a player object (not just a string ID)
      if (player && typeof player === 'object' && 'applyPhysic' in player) {
        player.applyPhysic(body);
      }
    }
  }

  /**
   * Synchronize linked zones to follow their host hitboxes
   * 
   * Updates zones that are linked to players or other movable hitboxes
   * 
   * @example
   * ```ts
   * // Called automatically in update()
   * physic.syncLinkedZones();
   * ```
   */
  private syncLinkedZones(): void {
    for (const [, zone] of this.zones) {
      if (zone.type === 'linked' && zone.linkedTo) {
        const host = this.hitboxes.get(zone.linkedTo);
        if (!host) continue;
        
        // Ensure direct position setting to avoid physics interpolation issues
        Matter.Body.setPosition(zone.body, {
          x: host.body.position.x,
          y: host.body.position.y
        });
        
        // Rotate directional cone with host facing (optional)
        if (zone.aperture < Math.PI * 2) {
          const dir = (host.body.label as any).direction ?? Direction.Down;
          const angle = this.directionToAngle(typeof dir === 'function' ? dir() : dir);
          Matter.Body.setAngle(zone.body, angle);
        }
      }
    }
  }
  
  /**
   * Convert a Direction enum value to radians
   * 
   * @param dir - Direction enum value
   * @returns Angle in radians
   */
  private directionToAngle(dir: Direction): number {
    switch (dir) {
      case Direction.Up:
        return -Math.PI / 2;
      case Direction.Down:
        return Math.PI / 2;
      case Direction.Left:
        return Math.PI;
      case Direction.Right:
      default:
        return 0;
    }
  }

  /**
   * Convert a movement vector to a Direction enum value
   * 
   * Determines the primary direction based on the larger component
   * of the movement vector. Returns null if no significant movement.
   * 
   * @param dx - X displacement
   * @param dy - Y displacement
   * @returns Direction enum value or null if no movement
   */
  private vectorToDirection(dx: number, dy: number): Direction | null {
    const threshold = 0.1; // Minimum movement to consider
    
    // No significant movement
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
      return null;
    }
    
    // Determine primary direction based on larger component
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? Direction.Right : Direction.Left;
    } else {
      return dy > 0 ? Direction.Down : Direction.Up;
    }
  }

  /**
   * Add a static hitbox (immovable objects like walls, obstacles)
   * 
   * @param id - Unique identifier for the hitbox
   * @param x - X position
   * @param y - Y position
   * @param width - Width of hitbox
   * @param height - Height of hitbox
   * @returns The id of the created hitbox
   * 
   * @example
   * ```ts
   * // Add a wall
   * physic.addStaticHitbox('wall1', 100, 50, 32, 128);
   * ```
   */
  addStaticHitbox(id: string, x: number, y: number, width: number, height: number): string {
    if (this.hitboxes.has(id)) {
      throw new Error(`Hitbox with id ${id} already exists`);
    }

    // Create body with center position to match movable hitboxes
    const centerX = x + width/2;
    const centerY = y + height/2;
    const body = Matter.Bodies.rectangle(centerX, centerY, width, height, {
      isStatic: true,
      label: id
    });
    
    Matter.Composite.add(this.world, body);
    
    this.hitboxes.set(id, {
      id,
      type: 'static',
      body
    });
    
    return id;
  }

  /**
   * Add a movable hitbox (players, NPCs, dynamic objects)
   * 
   * @param player - Player object that owns this hitbox
   * @param x - X position
   * @param y - Y position
   * @param width - Width of hitbox
   * @param height - Height of hitbox
   * @param options - Additional body options
   * @param slidingOptions - Collision sliding configuration
   * @returns The id of the created hitbox
   * 
   * @example
   * ```ts
   * // Add a player with sliding enabled (only against walls)
   * const player = new RpgCommonPlayer();
   * player.id = 'player1';
   * physic.addMovableHitbox(player, 200, 300, 24, 32, {}, {
   *   enabled: true,
   *   friction: 0.8,
   *   minVelocity: 0.5
   * });
   * ```
   */
  addMovableHitbox(player: RpgCommonPlayer, x: number, y: number, width: number, height: number, options = {}, slidingOptions?: SlidingOptions): string {
    // Create body with center position (MatterJS expects center coordinates)
    const centerX = x + width/2;
    const centerY = y + height/2;
    const body = Matter.Bodies.rectangle(centerX, centerY, width, height, {
      inertia: Infinity, // No rotation
      inverseInertia: 0,
      friction: 0,
      frictionAir: 0.1,
      restitution: 0,
      isStatic: false,
      ...options,
      label: player // Store reference to the player object
    });

    Matter.Composite.add(this.world, body);

    this.hitboxes.set(player.id, {
      id: player.id,
      type: 'movable',
      body,
      previousPosition: { ...body.position }, // Initialize previousPosition
      enableSliding: slidingOptions?.enabled ?? false,
      slidingOptions: slidingOptions
    });
    
    // Initialize player position to top-left corner (consistent with visual system)
    player.x.set(x);
    player.y.set(y);
    
    // Initialize movement tracking for sliding
    if (slidingOptions?.enabled) {
      this.intendedMovements.set(player.id, { x: 0, y: 0 });
    }
    
    return player.id;
  }

  /**
   * Update a hitbox's position and size
   * 
   * @param id - ID of the hitbox to update
   * @param x - New X position
   * @param y - New Y position
   * @param width - New width (optional)
   * @param height - New height (optional)
   * @returns Boolean indicating success
   * 
   * @example
   * ```ts
   * // Update player position
   * physic.updateHitbox('player1', newX, newY);
   * 
   * // Update both position and size
   * physic.updateHitbox('player1', newX, newY, newWidth, newHeight);
   * ```
   */
  updateHitbox(id: string, x: number, y: number, width?: number, height?: number): boolean {
    const hitbox = this.hitboxes.get(id);

    if (!hitbox) return false;

    const body = hitbox.body;
    const player = body.label;

    if (width !== undefined && height !== undefined) {
      // Need to recreate the body if size changes
      Matter.Composite.remove(this.world, body);
      
      const newBody = Matter.Bodies.rectangle(
        x + width/2, 
        y + height/2, 
        width, 
        height, 
        {
          isStatic: hitbox.type === 'static',
          inertia: Infinity,
          friction: 0,
          frictionAir: 0,
          restitution: 0,
          label: player // Preserve the player reference
        }
      );
      
      Matter.Composite.add(this.world, newBody);
      hitbox.body = newBody;
    } else {
      // Just update position - x,y always represent top-left corner
      const width = body.bounds.max.x - body.bounds.min.x;
      const height = body.bounds.max.y - body.bounds.min.y;
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      Matter.Body.setPosition(body, { x: centerX, y: centerY });
    }
    
    // Update player position if it's a player object
    if (player && typeof player === 'object' && 'x' in player && 'y' in player) {
      // Convert body center position back to top-left corner for consistency
      const width = body.bounds.max.x - body.bounds.min.x;
      const height = body.bounds.max.y - body.bounds.min.y;
      const topLeftX = body.position.x - width / 2;
      const topLeftY = body.position.y - height / 2;
      player.x.set(topLeftX);
      player.y.set(topLeftY);
    }
    
    return true;
  }

  /**
   * Remove a hitbox from the world
   * 
   * @param id - ID of the hitbox to remove
   * @returns Boolean indicating success
   * 
   * @example
   * ```ts
   * // Remove an enemy
   * physic.removeHitbox('enemy1');
   * ```
   */
  removeHitbox(id: string): boolean {
    const hitbox = this.hitboxes.get(id);
    if (!hitbox) return false;
    
    Matter.Composite.remove(this.world, hitbox.body);
    this.hitboxes.delete(id);
    
    // Clean up collision records
    this.collisions.delete(id);
    this.collisionEvents.delete(id);
    
    // Clean up movement events
    this.movementEvents.delete(id);
    
    // Clean up sliding data
    this.collisionNormals.delete(id);
    this.lastVelocities.delete(id);
    this.intendedMovements.delete(id);
    this.collisionData.delete(id);
    
    // Remove this hitbox from other hitboxes' collision records
    for (const [otherId, collisions] of this.collisions.entries()) {
      collisions.delete(id);
    }
    
    return true;
  }

  /**
   * Register collision event callbacks for a hitbox
   * 
   * @param id - ID of the hitbox
   * @param onCollisionEnter - Callback when entering collision
   * @param onCollisionExit - Callback when exiting collision
   * 
   * @example
   * ```ts
   * // Register collision events for player
   * physic.registerCollisionEvents('player1', 
   *   (hitboxIds) => console.log('Player hit:', hitboxIds),
   *   (hitboxIds) => console.log('Player no longer hitting:', hitboxIds)
   * );
   * ```
   */
  registerCollisionEvents(
    id: string, 
    onCollisionEnter?: (collidedWith: string[]) => void,
    onCollisionExit?: (collidedWith: string[]) => void
  ): void {
    this.collisionEvents.set(id, { onCollisionEnter, onCollisionExit });
  }

  /**
   * Get all hitbox IDs currently colliding with the specified hitbox
   * 
   * @param id - ID of the hitbox to check collisions for
   * @returns Array of hitbox IDs or empty array if none found
   * 
   * @example
   * ```ts
   * // Get all enemies colliding with player
   * const collidingEnemies = physic.getCollisions('player1');
   * ```
   */
  getCollisions(id: string): string[] {
    const collisions = this.collisions.get(id);
    return collisions ? Array.from(collisions) : [];
  }

  /**
   * Check if two hitboxes are colliding
   * 
   * @param id1 - First hitbox ID
   * @param id2 - Second hitbox ID
   * @returns Boolean indicating if they are colliding
   * 
   * @example
   * ```ts
   * // Check if player is touching the door
   * if (physic.areColliding('player1', 'door')) {
   *   // Open the door
   * }
   * ```
   */
  areColliding(id1: string, id2: string): boolean {
    const collisions = this.collisions.get(id1);
    return collisions ? collisions.has(id2) : false;
  }

  /**
   * Handle collision start events from MatterJS
   */
  private handleCollisionStart(event: Matter.IEventCollision<Matter.Engine>): void {
    const pairs = event.pairs;
 
    for (const pair of pairs) {
      const bodyA = pair.bodyA;
      const bodyB = pair.bodyB;

      // Extraire les IDs et vérifier si ce sont des zones
      const a = this.extractId(bodyA);
      const b = this.extractId(bodyB);

      // Zone ↔ Hitbox interaction
      if (a.isZone !== b.isZone) {
        const zoneId = a.isZone ? a.id : b.id;
        const targetId = a.isZone ? b.id : a.id;
        this.processZoneEnter(zoneId, targetId);
        continue; // ne pas traiter comme collision physique
      }
      
      // Normal hitbox ↔ hitbox collision
      if (!a.isZone && !b.isZone) {
        // Get proper IDs whether the label is a player object or string
        const idA = a.id;
        const idB = b.id;
        
        // Check if both are movable - if so, skip automatic handling (we handle it manually)
        const hitboxA = this.hitboxes.get(idA);
        const hitboxB = this.hitboxes.get(idB);
        
        if (hitboxA?.type === 'movable' && hitboxB?.type === 'movable') {
          // Skip automatic collision handling for movable-to-movable collisions
          // These are handled manually in resolveMovableCollisions()
          continue;
        }
        
        // Store collision data for sliding analysis (only for movable vs static)
        this.storeCollisionNormals(pair, idA, idB);
        
        // Record collision for both objects
        this.recordCollision(idA, idB);
        this.recordCollision(idB, idA);
        
        // Trigger onCollisionEnter callbacks
        const eventsA = this.collisionEvents.get(idA);
        const eventsB = this.collisionEvents.get(idB);

        if (eventsA?.onCollisionEnter) {
          eventsA.onCollisionEnter([idB]);
        }
        
        if (eventsB?.onCollisionEnter) {
          eventsB.onCollisionEnter([idA]);
        }
      }
    }
  }

  /**
   * Handle collision end events from MatterJS
   */
  private handleCollisionEnd(event: Matter.IEventCollision<Matter.Engine>): void {
    const pairs = event.pairs;
    
    for (const pair of pairs) {
      const bodyA = pair.bodyA;
      const bodyB = pair.bodyB;
      
      // Extraire les IDs et vérifier si ce sont des zones
      const a = this.extractId(bodyA);
      const b = this.extractId(bodyB);
      
      // Zone ↔ Hitbox end
      if (a.isZone !== b.isZone) {
        const zoneId = a.isZone ? a.id : b.id;
        const targetId = a.isZone ? b.id : a.id;
        this.processZoneExit(zoneId, targetId);
        continue;
      }
      
      // Normal hitbox ↔ hitbox end
      if (!a.isZone && !b.isZone) {
        // Get proper IDs
        const idA = a.id;
        const idB = b.id;

        // Check if both are movable - if so, skip automatic handling
        const hitboxA = this.hitboxes.get(idA);
        const hitboxB = this.hitboxes.get(idB);
        
        if (hitboxA?.type === 'movable' && hitboxB?.type === 'movable') {
          // Skip automatic collision end handling for movable-to-movable collisions
          // These are handled manually in resolveMovableCollisions()
          continue;
        }

        // Remove collision records
        this.removeCollision(idA, idB);
        this.removeCollision(idB, idA);
        
        // Clear collision data for these entities
        this.collisionData.delete(idA);
        this.collisionData.delete(idB);
        
        // Trigger onCollisionExit callbacks
        const eventsA = this.collisionEvents.get(idA);
        const eventsB = this.collisionEvents.get(idB);
        
        if (eventsA?.onCollisionExit) {
          eventsA.onCollisionExit([idB]);
        }
        
        if (eventsB?.onCollisionExit) {
          eventsB.onCollisionExit([idA]);
        }
      }
    }
  }
  
  /**
   * Extract entity ID and zone status from a physics body
   * 
   * @param body - Matter.js body
   * @returns Object containing ID and isZone flag
   */
  private extractId(body: Matter.Body): { id: string; isZone: boolean } {
    const label = body.label as any;
    if (typeof label === 'string' && label.startsWith('zone:')) {
      return { id: label.slice(5), isZone: true };
    }
    const id = typeof label === 'object' && 'id' in label ? label.id : label;
    return { id, isZone: false };
  }
  
  /**
   * Process a zone enter event
   * 
   * @param zoneId - ID of the zone
   * @param hitId - ID of the hitbox entering the zone
   */
  private processZoneEnter(zoneId: string, hitId: string): void {
    // Line‑of‑sight check
    const zone = this.zones.get(zoneId);
    const hitbox = this.hitboxes.get(hitId);

    if (!zone || !hitbox) return;

    if (zone.limitedByWalls && !this.hasLineOfSight(zone.body.position, hitbox.body.position)) {
      return; // blocked by wall → ignore
    }

    if (!this.zoneCollisions.has(zoneId)) this.zoneCollisions.set(zoneId, new Set());
    const set = this.zoneCollisions.get(zoneId)!;
    if (set.has(hitId)) return; // already inside
    set.add(hitId);
    this.zoneEvents.get(zoneId)?.onEnter?.([hitId]);
  }

  /**
   * Process a zone exit event
   * 
   * @param zoneId - ID of the zone
   * @param hitId - ID of the hitbox exiting the zone
   */
  private processZoneExit(zoneId: string, hitId: string): void {
    const set = this.zoneCollisions.get(zoneId);
    if (!set || !set.has(hitId)) return;
    set.delete(hitId);
    this.zoneEvents.get(zoneId)?.onExit?.([hitId]);
  }

  /**
   * Check if there is a clear line of sight between two points
   * 
   * @param start - Starting point
   * @param end - Ending point
   * @returns True if no static hitbox blocks the line
   */
  private hasLineOfSight(start: Matter.Vector, end: Matter.Vector): boolean {
    // Only query bodies that are static (walls)
    const staticBodies = Array.from(this.hitboxes.values())
      .filter((h) => h.type === 'static')
      .map((h) => h.body);
    
    // If there are no static bodies, there's nothing to block vision
    if (staticBodies.length === 0) return true;
    
    // Check if any static body intersects the ray
    const collisions = Matter.Query.ray(
      staticBodies,
      start,
      end,
      1 // Use width of 1 to make detection more reliable
    );
    
    return collisions.length === 0;
  }

  /**
   * Record a collision between two hitboxes
   */
  private recordCollision(id1: string, id2: string): void {
    if (!this.collisions.has(id1)) {
      this.collisions.set(id1, new Set());
    }
    
    this.collisions.get(id1)!.add(id2);
  }

  /**
   * Remove a collision record between two hitboxes
   */
  private removeCollision(id1: string, id2: string): void {
    const collisions = this.collisions.get(id1);
    if (collisions) {
      collisions.delete(id2);
    }
  }

  /**
   * Move a body based on player movement data
   * 
   * Applies velocity to a physics body based on the player's current speed
   * and automatically updates the player's position and intended direction
   * 
   * @param player - The player object containing movement data
   * @param direction - The intended movement direction
   * @returns Boolean indicating success
   * 
   * @example
   * ```ts
   * // Move a player's physics body
   * physic.moveBody(player, Direction.Right);
   * ```
   */
  moveBody(player: RpgCommonPlayer, direction: Direction): boolean {
    const hitbox = this.hitboxes.get(player.id);
    if (!hitbox) return false;
    
    const body = hitbox.body;
    const speedValue = player.speed(); // Assume this is pixels per step
    
    // Set the intended direction on the player
    // This ensures the player faces the direction they intend to move
    if (typeof player.setIntendedDirection === 'function') {
      player.setIntendedDirection(direction);
    }
    
    // Calculate translation vector based on direction and speed
    let dx = 0;
    let dy = 0;
    
    // Direction: 0=down, 1=left, 2=right, 3=up
    switch (direction) {
      case Direction.Down: // down
        dy = speedValue;
        break;
      case Direction.Left: // left
        dx = -speedValue;
        break;
      case Direction.Right: // right
        dx = speedValue;
        break;
      case Direction.Up: // up
        dy = -speedValue;
        break;
    }
    
    // Store intended movement for sliding calculations
    if (hitbox.enableSliding) {
      this.intendedMovements.set(player.id, { x: dx, y: dy });
    }
    
    // Apply movement (this will be potentially modified by sliding in the next frame)
    Matter.Body.translate(body, { x: dx, y: dy });
    
    return true;
  }

  /**
   * Stop movement for a player
   * 
   * Clears the intended direction and stops any ongoing movement.
   * This should be called when the player releases movement keys.
   * 
   * @param player - The player object to stop
   * @returns Boolean indicating success
   * 
   * @example
   * ```ts
   * // Player releases all movement keys
   * physic.stopMovement(player);
   * ```
   */
  stopMovement(player: RpgCommonPlayer): boolean {
    const hitbox = this.hitboxes.get(player.id);
    if (!hitbox) return false;
    
    // Clear intended direction
    if (typeof player.setIntendedDirection === 'function') {
      player.setIntendedDirection(null);
    }
    
    // Clear intended movement for sliding calculations
    this.intendedMovements.delete(player.id);
    
    // Stop the physics body
    const body = hitbox.body;
    Matter.Body.setVelocity(body, { x: 0, y: 0 });
    
    return true;
  }

  /**
   * Synchronize a player's position to its physics body
   * 
   * Updates the physics body position based on the player's current position
   * Useful when player position is changed outside of physics system
   * 
   * @param playerId - ID of the player to synchronize
   * @returns Boolean indicating success
   * 
   * @example
   * ```ts
   * // After teleporting a player
   * player.x.set(newX);
   * player.y.set(newY);
   * physic.syncPlayerToBody(player.id);
   * ```
   */
  syncPlayerToBody(playerId: string): boolean {
    const hitbox = this.hitboxes.get(playerId);
    if (!hitbox) return false;
    
    const body = hitbox.body;
    const player = body.label;
    
    if (player && typeof player === 'object' && 'x' in player && 'y' in player) {
      Matter.Body.setPosition(body, {
        x: player.x(),
        y: player.y()
      });
      return true;
    }
    
    return false;
  }

  /**
   * Get a physics body by entity ID
   * 
   * Used by the MovementManager to apply movement strategies
   * 
   * @param id - Entity ID
   * @returns The Matter.js body or undefined if not found
   * 
   * @example
   * ```ts
   * // Get a body to apply movement
   * const body = physic.getBody('player1');
   * if (body) Matter.Body.setVelocity(body, { x: 5, y: 0 });
   * ```
   */
  getBody(id: string): Matter.Body | undefined {
    return this.hitboxes.get(id)?.body;
  }

  /**
   * Apply a translation to a body directly
   * 
   * Used as a clean interface for the movement system.
   * Automatically determines and sets the intended direction for players.
   * 
   * @param id - Entity ID
   * @param dx - X displacement in pixels
   * @param dy - Y displacement in pixels
   * @returns Boolean indicating success
   * 
   * @example
   * ```ts
   * // Move entity 5px right, 2px down
   * physic.applyTranslation('player1', 5, 2);
   * ```
   */
  applyTranslation(id: string, dx: number, dy: number): boolean {
    const body = this.getBody(id);
    if (!body) return false;
    
    const hitbox = this.hitboxes.get(id);
    
    // Store intended movement for sliding calculations
    if (hitbox?.enableSliding) {
      this.intendedMovements.set(id, { x: dx, y: dy });
    }
    
    // Set intended direction for players based on movement vector
    const player = body.label;
    if (player && typeof player === 'object' && 'setIntendedDirection' in player) {
      const direction = this.vectorToDirection(dx, dy);
      if (direction !== null && typeof player.setIntendedDirection === 'function') {
        player.setIntendedDirection(direction);
      }
    }
    
    Matter.Body.translate(body, { x: dx, y: dy });
    return true;
  }

  /**
   * Set the velocity of a body directly
   * 
   * Used as a clean interface for the movement system
   * 
   * @param id - Entity ID
   * @param vx - X velocity component
   * @param vy - Y velocity component
   * @returns Boolean indicating success
   * 
   * @example
   * ```ts
   * // Set entity velocity to 5px/s right
   * physic.setVelocity('player1', 5, 0);
   * ```
   */
  setVelocity(id: string, vx: number, vy: number): boolean {
    const body = this.getBody(id);
    if (!body) return false;
    
    Matter.Body.setVelocity(body, { x: vx, y: vy });
    return true;
  }

  /**
   * Apply a force to a body
   * 
   * Used as a clean interface for the movement system
   * 
   * @param id - Entity ID
   * @param forceX - X force component
   * @param forceY - Y force component
   * @param position - Application point (optional, default is body center)
   * @returns Boolean indicating success
   * 
   * @example
   * ```ts
   * // Apply force to push entity
   * physic.applyForce('player1', 0.05, 0);
   * ```
   */
  applyForce(id: string, forceX: number, forceY: number, position?: Matter.Vector): boolean {
    const body = this.getBody(id);
    if (!body) return false;
    
    Matter.Body.applyForce(body, position || body.position, { x: forceX, y: forceY });
    return true;
  }

  /**
   * Get the Matter.js world object
   * 
   * Useful for advanced manipulation and querying of the physics world
   * 
   * @returns Matter.js World object
   * 
   * @example
   * ```ts
   * // Query for all bodies in an area
   * const world = physic.getWorld();
   * const bodies = Matter.Query.region(world.bodies, area);
   * ```
   */
  getWorld(): Matter.World {
    return this.world;
  }

  /* ----------------------------------------------------------------------- */
  /*                               ZONES                                    */
  /* ----------------------------------------------------------------------- */

  /**
   * Create a new Zone sensor. Never collides physically but triggers events.
   * 
   * @param id - Unique identifier for the zone
   * @param opts - Zone options
   * @returns The id of the created zone
   * 
   * @example
   * ```ts
   * // 90° cone vision in front of guard1 (120px range)
   * physic.addZone('guardVision', {
   *   linkedTo: 'guard1',
   *   radius: 120,
   *   angle: 90,
   *   direction: Direction.Right,
   *   limitedByWalls: true
   * });
   * ```
   */
  addZone(id: string, opts: ZoneOptions): string {
    if (this.zones.has(id)) throw new Error(`Zone with id ${id} already exists`);

    // Determine geometry ---------------------------------------------------
    const radius = opts.radius;
    const fullCircle = !opts.angle || opts.angle >= 360;
    const aperture = (opts.angle ?? 360) * (Math.PI / 180);

    // Helper to build wedge vertices when angle < 360 ---------------------
    const createWedge = (angleRad: number, r: number): Matter.Body => {
      const step = Math.max(4, Math.ceil(angleRad / (Math.PI / 8))); // ≤22.5° per segment
      const verts: Matter.Vector[] = [{ x: 0, y: 0 }];
      for (let i = 0; i <= step; i++) {
        const a = -angleRad / 2 + (i / step) * angleRad;
        verts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
      }
      return Matter.Bodies.fromVertices(0, 0, [verts], { 
        isSensor: true, 
        label: `zone:${id}`
      }, true) as Matter.Body;
    };

    let body: Matter.Body;
    if (fullCircle) {
      body = Matter.Bodies.circle(0, 0, radius, { 
        isSensor: true, 
        label: `zone:${id}` 
      });
    } else {
      body = createWedge(aperture, radius);
    }

    // Position -------------------------------------------------------------
    if (!opts.linkedTo) {
      // Static zone
      const x = opts.x ?? 0;
      const y = opts.y ?? 0;
      Matter.Body.setPosition(body, { x, y });
    }

    Matter.Composite.add(this.world, body);

    this.zones.set(id, {
      id,
      type: opts.linkedTo ? 'linked' : 'static',
      body,
      linkedTo: opts.linkedTo,
      aperture,
      limitedByWalls: !!opts.limitedByWalls,
    });

    return id;
  }

  getZone(id: string): ZoneData | undefined {
    return this.zones.get(id);
  }

  /**
   * Remove a zone from the world
   * 
   * @param id - ID of the zone to remove
   * @returns Boolean indicating success
   * 
   * @example
   * ```ts
   * // Remove a detection zone
   * physic.removeZone('guardVision');
   * ```
   */
  removeZone(id: string): boolean {
    const zone = this.zones.get(id);
    if (!zone) return false;

    Matter.Composite.remove(this.world, zone.body);
    this.zones.delete(id);
    this.zoneEvents.delete(id);
    this.zoneCollisions.delete(id);
    return true;
  }

  /**
   * Register zone enter/exit callbacks
   * 
   * @param id - ID of the zone
   * @param onEnter - Callback when an entity enters the zone
   * @param onExit - Callback when an entity exits the zone
   * 
   * @example
   * ```ts
   * // Register zone events
   * physic.registerZoneEvents('guardVision', 
   *   (hitIds) => console.log('Entities spotted:', hitIds),
   *   (hitIds) => console.log('Entities lost:', hitIds)
   * );
   * ```
   */
  registerZoneEvents(
    id: string,
    onEnter?: (hitIds: string[]) => void,
    onExit?: (hitIds: string[]) => void
  ): void {
    this.zoneEvents.set(id, { onEnter, onExit });
  }

  /**
   * Get all entity IDs currently inside a zone
   * 
   * @param id - ID of the zone to check
   * @returns Array of entity IDs or empty array if none found
   * 
   * @example
   * ```ts
   * // Check which entities are in guard's vision
   * const spotted = physic.getEntitiesInZone('guardVision');
   * if (spotted.includes('player1')) {
   *   // Guard saw the player!
   * }
   * ```
   */
  getEntitiesInZone(id: string): string[] {
    return this.zoneCollisions.get(id) ? Array.from(this.zoneCollisions.get(id)!) : [];
  }

  /**
   * Check for movement state changes on all movable hitboxes
   * 
   * Detects when objects start or stop moving and triggers appropriate events
   * 
   * @example
   * ```ts
   * // Called automatically in update()
   * physic.checkMovementChanges();
   * ```
   */
  private checkMovementChanges(): void {
    const movementThreshold = 0.1; // Minimum speed to consider an object moving
    const positionChangeThreshold = 0.01; // Minimum position change to consider an object moving
    
    for (const [id, hitboxData] of this.hitboxes.entries()) {
      // Skip static objects or objects without previous position tracking
      if (hitboxData.type === 'static' || !hitboxData.previousPosition) continue;
      
      const body = hitboxData.body;
      const currentPosition = body.position;
      
      // Check velocity
      const velocity = Math.sqrt(body.velocity.x * body.velocity.x + body.velocity.y * body.velocity.y);
      
      // Check position change
      const dx = currentPosition.x - hitboxData.previousPosition.x;
      const dy = currentPosition.y - hitboxData.previousPosition.y;
      const positionChanged = Math.sqrt(dx*dx + dy*dy) > positionChangeThreshold;
      
      const wasMoving = hitboxData.isMoving ?? false;
      const isCurrentlyMoving = velocity > movementThreshold || positionChanged;
      
      // Only trigger events if state changed
      if (isCurrentlyMoving !== wasMoving) {
        hitboxData.isMoving = isCurrentlyMoving;
        
        const events = this.movementEvents.get(id);
        if (!events) continue;
        
        if (isCurrentlyMoving && events.onStartMoving) {
          events.onStartMoving();
        } else if (!isCurrentlyMoving && events.onStopMoving) {
          events.onStopMoving();
        }
      }
      
      // Update previous position for the next frame
      hitboxData.previousPosition = { ...currentPosition };
    }
  }

  /**
   * Register movement event callbacks for a hitbox
   * 
   * @param id - ID of the hitbox
   * @param onStartMoving - Callback when object starts moving
   * @param onStopMoving - Callback when object stops moving
   * 
   * @example
   * ```ts
   * // Register movement events for player
   * physic.registerMovementEvents('player1', 
   *   () => console.log('Player started moving'),
   *   () => console.log('Player stopped moving')
   * );
   * ```
   */
  registerMovementEvents(
    id: string, 
    onStartMoving?: () => void,
    onStopMoving?: () => void
  ): void {
    this.movementEvents.set(id, { onStartMoving, onStopMoving });
  }

  /**
   * Check if a hitbox is currently moving
   * 
   * @param id - ID of the hitbox to check
   * @returns Boolean indicating if the object is in motion
   * 
   * @example
   * ```ts
   * // Check if player is moving
   * if (physic.isMoving('player1')) {
   *   // Player is in motion
   * }
   * ```
   */
  isMoving(id: string): boolean {
    const hitbox = this.hitboxes.get(id);
    return hitbox?.isMoving ?? false;
  }

  /**
   * Unregister movement events for a hitbox
   * 
   * @param id - ID of the hitbox
   * @returns Boolean indicating success
   * 
   * @example
   * ```ts
   * // Remove movement event listeners
   * physic.unregisterMovementEvents('player1');
   * ```
   */
  unregisterMovementEvents(id: string): boolean {
    return this.movementEvents.delete(id);
  }

  /**
   * Enable or disable collision sliding for a hitbox
   * 
   * @param id - ID of the hitbox
   * @param enabled - Whether to enable sliding
   * @param options - Sliding configuration options
   * @returns Boolean indicating success
   * 
   * @example
   * ```ts
   * // Enable sliding for an existing player
   * physic.setSliding('player1', true, {
   *   friction: 0.9,
   *   minVelocity: 1.0
   * });
   * ```
   */
  setSliding(id: string, enabled: boolean, options?: SlidingOptions): boolean {
    const hitbox = this.hitboxes.get(id);
    if (!hitbox || hitbox.type !== 'movable') return false;
    
    hitbox.enableSliding = enabled;
    if (enabled && options) {
      hitbox.slidingOptions = options;
    }
    
    // Initialize movement tracking if enabling sliding
    if (enabled && !this.intendedMovements.has(id)) {
      this.intendedMovements.set(id, { x: 0, y: 0 });
    }
    
    return true;
  }

  /**
   * Check if sliding is enabled for a hitbox
   * 
   * @param id - ID of the hitbox
   * @returns Boolean indicating if sliding is enabled
   * 
   * @example
   * ```ts
   * // Check if player has sliding enabled
   * if (physic.isSlidingEnabled('player1')) {
   *   // Player can slide along walls
   * }
   * ```
   */
  isSlidingEnabled(id: string): boolean {
    const hitbox = this.hitboxes.get(id);
    return hitbox?.enableSliding ?? false;
  }

  /**
   * Get sliding options for a hitbox
   * 
   * @param id - ID of the hitbox
   * @returns Sliding options or undefined if not found
   * 
   * @example
   * ```ts
   * // Get current sliding configuration
   * const options = physic.getSlidingOptions('player1');
   * console.log('Friction:', options?.friction);
   * ```
   */
  getSlidingOptions(id: string): SlidingOptions | undefined {
    const hitbox = this.hitboxes.get(id);
    return hitbox?.slidingOptions;
  }

  // Add new methods for sliding calculations and store velocities
  private applySlidingCorrections(): void {
    for (const [id, hitboxData] of this.hitboxes.entries()) {
      if (hitboxData.type === 'movable' && hitboxData.enableSliding) {
        const body = hitboxData.body;
        const intendedMovement = this.intendedMovements.get(id);
        const collisionData = this.collisionData.get(id);
        const slidingOptions = hitboxData.slidingOptions;

        if (!intendedMovement || !collisionData || collisionData.length === 0 || !slidingOptions) {
          continue;
        }

        const friction = slidingOptions.friction ?? 0.8;
        const minVelocity = slidingOptions.minVelocity ?? 0.5;
        
        // Check if intended movement is above minimum threshold
        const movementMagnitude = Math.sqrt(intendedMovement.x * intendedMovement.x + intendedMovement.y * intendedMovement.y);
           
        if (movementMagnitude < minVelocity) {
          continue;
        }

        // Analyze all collisions to determine if any are partial
        let hasPartialCollision = false;
        let bestSlidingDirection = { x: 0, y: 0 };
        let totalOverlapRatio = 0;
        
        for (const collision of collisionData) {
          const analysis = collision.analysis;
          totalOverlapRatio += analysis.overlapRatio;
          
          if (analysis.isPartial) {
            hasPartialCollision = true;
            // Use the best sliding direction from the analysis
            bestSlidingDirection.x += analysis.bestSlidingDirection.x;
            bestSlidingDirection.y += analysis.bestSlidingDirection.y;
          }
        }
        
        // Only apply sliding if there's at least one partial collision
        if (!hasPartialCollision) {
          continue;
        }
        
        // Average the sliding directions if multiple partial collisions
        if (collisionData.length > 1) {
          bestSlidingDirection.x /= collisionData.length;
          bestSlidingDirection.y /= collisionData.length;
        }
        
        // Apply friction to the sliding movement
        const slidingMovement = Matter.Vector.mult(bestSlidingDirection, friction);
         
        // Apply the sliding movement as an additional translation
        // This happens before the physics engine update, so it will be the actual movement
        Matter.Body.translate(body, slidingMovement);
      }
    }
  }

  private storeCollisionNormals(pair: Matter.IPair, idA: string, idB: string): void {
    // Store collision data for sliding analysis
    const hitboxA = this.hitboxes.get(idA);
    const hitboxB = this.hitboxes.get(idB);
    
    // Check if sliding should be applied for hitbox A (only against static hitboxes)
    if (hitboxA?.enableSliding && hitboxA.type === 'movable' && hitboxB?.type === 'static') {
      const intendedMovement = this.intendedMovements.get(idA);
      if (intendedMovement) {
        const analysis = this.analyzeCollision(pair.bodyA, pair.bodyB, intendedMovement);
        
        if (!this.collisionData.has(idA)) {
          this.collisionData.set(idA, []);
        }
        this.collisionData.get(idA)!.push({
          body: pair.bodyA,
          otherBody: pair.bodyB,
          analysis
        });
      }
    }
    
    // Check if sliding should be applied for hitbox B (only against static hitboxes)
    if (hitboxB?.enableSliding && hitboxB.type === 'movable' && hitboxA?.type === 'static') {
      const intendedMovement = this.intendedMovements.get(idB);
      if (intendedMovement) {
        const analysis = this.analyzeCollision(pair.bodyB, pair.bodyA, intendedMovement);
        
        if (!this.collisionData.has(idB)) {
          this.collisionData.set(idB, []);
        }
        this.collisionData.get(idB)!.push({
          body: pair.bodyB,
          otherBody: pair.bodyA,
          analysis
        });
      }
    }
  }

  /**
   * Determine if a collision is partial (corner/edge) or full frontal
   * 
   * @param bodyA - First collision body
   * @param bodyB - Second collision body
   * @param intendedMovement - The intended movement vector
   * @returns Object with collision analysis
   */
  private analyzeCollision(bodyA: Matter.Body, bodyB: Matter.Body, intendedMovement: Matter.Vector): {
    isPartial: boolean;
    overlapRatio: number;
    bestSlidingDirection: Matter.Vector;
  } {
    // Get body bounds
    const boundsA = bodyA.bounds;
    const boundsB = bodyB.bounds;
    
    // Calculate overlap area
    const overlapLeft = Math.max(boundsA.min.x, boundsB.min.x);
    const overlapRight = Math.min(boundsA.max.x, boundsB.max.x);
    const overlapTop = Math.max(boundsA.min.y, boundsB.min.y);
    const overlapBottom = Math.min(boundsA.max.y, boundsB.max.y);
    
    const overlapWidth = Math.max(0, overlapRight - overlapLeft);
    const overlapHeight = Math.max(0, overlapBottom - overlapTop);
    const overlapArea = overlapWidth * overlapHeight;
    
    // Calculate body A area
    const bodyAWidth = boundsA.max.x - boundsA.min.x;
    const bodyAHeight = boundsA.max.y - boundsA.min.y;
    const bodyAArea = bodyAWidth * bodyAHeight;
    
    // Calculate overlap ratio (how much of body A is overlapping)
    const overlapRatio = overlapArea / bodyAArea;
    
    // Consider collision partial if overlap is less than 30% of the body
    const isPartial = overlapRatio < 0.3;
    
    // Determine best sliding direction based on intended movement and collision geometry
    let bestSlidingDirection = { x: 0, y: 0 };
    
    if (isPartial) {
      // For partial collisions, try to slide around the obstacle
      const centerA = { x: (boundsA.min.x + boundsA.max.x) / 2, y: (boundsA.min.y + boundsA.max.y) / 2 };
      const centerB = { x: (boundsB.min.x + boundsB.max.x) / 2, y: (boundsB.min.y + boundsB.max.y) / 2 };
      
      // Vector from obstacle center to player center
      const toPlayer = Matter.Vector.sub(centerA, centerB);
      
      // Determine if we should slide horizontally or vertically
      if (Math.abs(intendedMovement.x) > Math.abs(intendedMovement.y)) {
        // Primarily horizontal movement - slide vertically
        bestSlidingDirection.y = toPlayer.y > 0 ? Math.abs(intendedMovement.x) : -Math.abs(intendedMovement.x);
        bestSlidingDirection.x = 0;
      } else {
        // Primarily vertical movement - slide horizontally  
        bestSlidingDirection.x = toPlayer.x > 0 ? Math.abs(intendedMovement.y) : -Math.abs(intendedMovement.y);
        bestSlidingDirection.y = 0;
      }
      
      // Normalize the sliding direction
      const magnitude = Math.sqrt(bestSlidingDirection.x * bestSlidingDirection.x + bestSlidingDirection.y * bestSlidingDirection.y);
      if (magnitude > 0) {
        bestSlidingDirection.x /= magnitude;
        bestSlidingDirection.y /= magnitude;
        
        // Scale by intended movement magnitude
        const intendedMagnitude = Math.sqrt(intendedMovement.x * intendedMovement.x + intendedMovement.y * intendedMovement.y);
        bestSlidingDirection.x *= intendedMagnitude;
        bestSlidingDirection.y *= intendedMagnitude;
      }
    }
    
    return {
      isPartial,
      overlapRatio,
      bestSlidingDirection
    };
  }

  private resolveMovableCollisions(): void {
    const processedPairs = new Set<string>();
    
    // First, check for actual overlaps between all movable bodies to maintain collision state
    const movableHitboxes = Array.from(this.hitboxes.values()).filter(h => h.type === 'movable');
    
    for (let i = 0; i < movableHitboxes.length; i++) {
      for (let j = i + 1; j < movableHitboxes.length; j++) {
        const hitboxA = movableHitboxes[i];
        const hitboxB = movableHitboxes[j];
        
        const bodyA = hitboxA.body;
        const bodyB = hitboxB.body;
        
        // Check if bodies are actually overlapping
        const isOverlapping = this.areBodiesTouching(bodyA, bodyB);
        const wasColliding = this.areColliding(hitboxA.id, hitboxB.id);

        if (isOverlapping && !wasColliding) {
          // New collision detected - record it and trigger enter events
          this.recordCollision(hitboxA.id, hitboxB.id);
          this.recordCollision(hitboxB.id, hitboxA.id);
          // Trigger collision enter events
          const eventsA = this.collisionEvents.get(hitboxA.id);
          const eventsB = this.collisionEvents.get(hitboxB.id);
          
          if (eventsA?.onCollisionEnter) {
            eventsA.onCollisionEnter([hitboxB.id]);
          }
          
          if (eventsB?.onCollisionEnter) {
            eventsB.onCollisionEnter([hitboxA.id]);
          }

        } else if (!isOverlapping && wasColliding) {

          // Check if bodies are still touching with a tolerance. real collision 
          const isOverlapping = this.areBodiesTouching(bodyA, bodyB, 10);
          if (isOverlapping) continue

          // Collision ended - remove it and trigger exit events
          this.removeCollision(hitboxA.id, hitboxB.id);
          this.removeCollision(hitboxB.id, hitboxA.id);

          // Trigger collision exit events
          const eventsA = this.collisionEvents.get(hitboxA.id);
          const eventsB = this.collisionEvents.get(hitboxB.id);
          
          if (eventsA?.onCollisionExit) {
            eventsA.onCollisionExit([hitboxB.id]);
          }
          
          if (eventsB?.onCollisionExit) {
            eventsB.onCollisionExit([hitboxA.id]);
          }
        }
      }
    }
    
    // Now resolve collisions between movable entities
    for (const [id, collisions] of this.collisions.entries()) {
      const hitbox = this.hitboxes.get(id);
      if (!hitbox || hitbox.type !== 'movable') continue;

      for (const otherId of collisions) {
        const otherHitbox = this.hitboxes.get(otherId);
        if (!otherHitbox || otherHitbox.type !== 'movable') continue;
        
        // Create a unique pair identifier to avoid processing the same collision twice
        const pairId = id < otherId ? `${id}-${otherId}` : `${otherId}-${id}`;
        if (processedPairs.has(pairId)) continue;
        processedPairs.add(pairId);
        
        // Both are movable entities
        const body = hitbox.body;
        const otherBody = otherHitbox.body;
        
        // Get the intended movement for this frame
        const intendedMovement = this.intendedMovements.get(id);
        const otherIntendedMovement = this.intendedMovements.get(otherId);
        
        // Only revert movement if the body is moving towards the other
        const shouldRevertA = intendedMovement && this.isMovingTowards(body, otherBody, intendedMovement);
        const shouldRevertB = otherIntendedMovement && this.isMovingTowards(otherBody, body, otherIntendedMovement);

        // If this hitbox was moving towards the other, revert its movement
        if (shouldRevertA) {
          Matter.Body.translate(body, { x: -intendedMovement.x, y: -intendedMovement.y });
          Matter.Body.setVelocity(body, { x: 0, y: 0 });
        }
        
        // If the other hitbox was moving towards this one, revert its movement
        if (shouldRevertB) {
          Matter.Body.translate(otherBody, { x: -otherIntendedMovement.x, y: -otherIntendedMovement.y });
          Matter.Body.setVelocity(otherBody, { x: 0, y: 0 });
        }
      }
    }
  }

  /**
   * Check if two bodies are actually touching/overlapping
   */
  private areBodiesTouching(bodyA: Matter.Body, bodyB: Matter.Body, tolerance: number = 0): boolean {
    const boundsA = bodyA.bounds;
    const boundsB = bodyB.bounds;

    return !(boundsA.max.x < boundsB.min.x - tolerance || 
             boundsA.min.x > boundsB.max.x + tolerance || 
             boundsA.max.y < boundsB.min.y - tolerance || 
             boundsA.min.y > boundsB.max.y + tolerance);
  }


  /**
   * Check if a body is moving towards another body
   */
  private isMovingTowards(bodyA: Matter.Body, bodyB: Matter.Body, movement: Matter.Vector): boolean {
    const directionToB = {
      x: bodyB.position.x - bodyA.position.x,
      y: bodyB.position.y - bodyA.position.y
    };
    
    // Dot product to check if movement is in the same direction as the vector to the other body
    const dotProduct = movement.x * directionToB.x + movement.y * directionToB.y;
    return dotProduct > 0;
  }

  /**
   * Check if a sensor body would collide with walls and adjust movement accordingly
   * 
   * @param body - The sensor body to check
   * @param dx - Intended X movement
   * @param dy - Intended Y movement
   * @returns Adjusted movement vector that avoids wall collisions
   */
  private checkSensorWallCollision(body: Matter.Body, dx: number, dy: number): Matter.Vector {
    // Get all static bodies (walls)
    const staticBodies = Array.from(this.hitboxes.values())
      .filter(h => h.type === 'static')
      .map(h => h.body);
    
    // If no walls, allow full movement
    if (staticBodies.length === 0) {
      return { x: dx, y: dy };
    }
    
    const currentPos = body.position;
    const bodyWidth = body.bounds.max.x - body.bounds.min.x;
    const bodyHeight = body.bounds.max.y - body.bounds.min.y;
    
    // Test each direction independently
    let adjustedDx = dx;
    let adjustedDy = dy;
    
    // Test X movement only
    if (dx !== 0) {
      const testXOnly = Matter.Bodies.rectangle(
        currentPos.x + dx, 
        currentPos.y, 
        bodyWidth,
        bodyHeight,
        { isSensor: true }
      );
      
      for (const staticBody of staticBodies) {
        if (this.areBodiesTouching(testXOnly, staticBody)) {
          adjustedDx = 0;
          break;
        }
      }
      
      // Clean up test body
      Matter.World.remove(this.world, testXOnly);
    }
    
    // Test Y movement only
    if (dy !== 0) {
      const testYOnly = Matter.Bodies.rectangle(
        currentPos.x, 
        currentPos.y + dy, 
        bodyWidth,
        bodyHeight,
        { isSensor: true }
      );
      
      for (const staticBody of staticBodies) {
        if (this.areBodiesTouching(testYOnly, staticBody)) {
          adjustedDy = 0;
          break;
        }
      }
      
      // Clean up test body
      Matter.World.remove(this.world, testYOnly);
    }
    
    return { x: adjustedDx, y: adjustedDy };
  }

  /**
   * Resolve collisions between sensor bodies and static walls
   * 
   * Sensor bodies (like events with isSensor: true) normally pass through
   * static bodies, but we want them to be blocked by walls during knockback
   * and other movement effects.
   */
  private resolveSensorWallCollisions(): void {
    // Get all sensor bodies (movable hitboxes with isSensor: true)
    const sensorBodies: { id: string; body: Matter.Body }[] = [];
    
    for (const [id, hitboxData] of this.hitboxes.entries()) {
      if (hitboxData.type === 'movable' && hitboxData.body.isSensor) {
        sensorBodies.push({ id, body: hitboxData.body });
      }
    }
    
    // Get all static bodies (walls)
    const staticBodies = Array.from(this.hitboxes.values())
      .filter(h => h.type === 'static')
      .map(h => h.body);
    
    // Check each sensor body against all static bodies
    for (const { id, body: sensorBody } of sensorBodies) {
      for (const staticBody of staticBodies) {
        // Check if sensor body overlaps with static body
        if (this.areBodiesTouching(sensorBody, staticBody)) {
          // Calculate separation vector to push sensor body out of static body
          const separation = this.calculateSeparation(sensorBody, staticBody);
          
          if (separation.x !== 0 || separation.y !== 0) {
            // Apply separation to move sensor body out of static body
            Matter.Body.translate(sensorBody, separation);
          }
        }
      }
    }
  }

  /**
   * Calculate the minimum separation vector to separate two overlapping bodies
   * 
   * @param bodyA - First body (the one to move)
   * @param bodyB - Second body (static reference)
   * @returns Vector to separate bodyA from bodyB
   */
  private calculateSeparation(bodyA: Matter.Body, bodyB: Matter.Body): Matter.Vector {
    const boundsA = bodyA.bounds;
    const boundsB = bodyB.bounds;
    
    // Calculate overlap on each axis
    const overlapX = Math.min(boundsA.max.x, boundsB.max.x) - Math.max(boundsA.min.x, boundsB.min.x);
    const overlapY = Math.min(boundsA.max.y, boundsB.max.y) - Math.max(boundsA.min.y, boundsB.min.y);
    
    // If no overlap, no separation needed
    if (overlapX <= 0 || overlapY <= 0) {
      return { x: 0, y: 0 };
    }
    
    // Choose the axis with minimum overlap for separation
    if (overlapX < overlapY) {
      // Separate horizontally
      const centerA = (boundsA.min.x + boundsA.max.x) / 2;
      const centerB = (boundsB.min.x + boundsB.max.x) / 2;
      const direction = centerA < centerB ? -1 : 1;
      return { x: direction * overlapX, y: 0 };
    } else {
      // Separate vertically
      const centerA = (boundsA.min.y + boundsA.max.y) / 2;
      const centerB = (boundsB.min.y + boundsB.max.y) / 2;
      const direction = centerA < centerB ? -1 : 1;
      return { x: 0, y: direction * overlapY };
    }
  }
}