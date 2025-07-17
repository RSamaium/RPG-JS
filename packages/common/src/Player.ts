import { signal } from "@signe/reactive";
import { id, sync, users } from "@signe/sync";
import * as Matter from "matter-js";
import { MovementManager } from "./movement";
import { Item } from "./database";
import { Observable } from "rxjs";
import { Constructor } from "./Utils";

export enum Direction {
  Up = "up",
  Down = "down",
  Left = "left",
  Right = "right",
}

export enum Animation {
  Stand = "stand",
  Walk = "walk",
  Attack = "attack",
  Defense = "defense",
  Skill = "skill",
}

export interface Hitbox {
  w: number;
  h: number;
}

export interface ShowAnimationParams {
  graphic?: string | string[];
  animationName: string;
  loop?: boolean;
}

export interface AttachShapeOptions {
  /** Width of the shape in pixels */
  width: number;
  /** Height of the shape in pixels */
  height: number;
  /** Circle radius in pixels (for zone shapes) */
  radius?: number;
  /** Vision aperture in degrees. 360 = full circle, <360 = cone */
  angle?: number;
  /** Facing direction used when angle < 360 */
  direction?: Direction;
  /** If true, walls (static hitboxes) stop vision */
  limitedByWalls?: boolean;
  /** Indicate where the shape is placed relative to the player */
  positioning?: "center" | "top" | "bottom" | "left" | "right";
  /** The name of the shape */
  name?: string;
  /** An object to retrieve information when interacting with the shape */
  properties?: object;
}

export abstract class RpgCommonPlayer {
  @id() id: string;
  @sync() name = signal("");
  @sync() type = signal("");
  @sync() x = signal(0);
  @sync() y = signal(0);
  @sync() z = signal(0);
  @sync() tint = signal("white");
  @sync() direction = signal(Direction.Down);
  @sync() speed = signal(4);
  @sync() graphics = signal<any>([]);
  @sync() canMove = signal(true);
  @sync() hitbox = signal<Hitbox>({
    w: 32,
    h: 32,
  });
  @sync() _gold = signal(0);
  @sync() animationName = signal("stand");
  @sync() hpSignal = signal(0);
  @sync() spSignal = signal(0);
  @sync() _exp = signal(0);
  @sync() _level = signal(1);
  @sync() _class = signal({});
  @sync(Item) items = signal<Item[]>([]);
  @sync() equipments = signal<any[]>([]);
  @sync() states = signal<any[]>([]);
  @sync() skills = signal<any[]>([]);
  @sync() _effects = signal<any[]>([]);
  @sync() _through = signal(false);
  @sync() _throughOtherPlayer = signal(true);
  @sync() _throughEvent = signal(false);
  @sync() _frequency = signal(0);

  // Store intended movement direction (not synced, only used locally)
  private _intendedDirection: Direction | null = null;

  /**
   * Change the player's facing direction
   *
   * Updates the direction the player is facing, which affects animations
   * and directional abilities. This should be called when the player
   * intends to move in a specific direction, not when they are pushed
   * by physics or sliding.
   *
   * @param direction - The new direction to face
   *
   * @example
   * ```ts
   * // Player presses right arrow key
   * player.changeDirection(Direction.Right);
   * ```
   */
  changeDirection(direction: Direction) {
    this.direction.set(direction);
  }

  /**
   * Get the current facing direction
   *
   * @returns Current direction the player is facing
   *
   * @example
   * ```ts
   * const currentDirection = player.getDirection();
   * if (currentDirection === Direction.Up) {
   *   // Player is facing up
   * }
   * ```
   */
  getDirection() {
    return this.direction();
  }

  /**
   * Set the intended movement direction
   *
   * This should be called when the player intends to move in a direction,
   * typically from input handling. This direction will be used to update
   * the player's facing direction regardless of physics interactions.
   *
   * @param direction - The intended movement direction, or null if not moving
   *
   * @example
   * ```ts
   * // Player presses down arrow key
   * player.setIntendedDirection(Direction.Down);
   *
   * // Player releases all movement keys
   * player.setIntendedDirection(null);
   * ```
   */
  setIntendedDirection(direction: Direction | null) {
    this._intendedDirection = direction;
    // Update facing direction immediately when player intends to move
    if (direction !== null) {
      this.changeDirection(direction);
    }
  }

  /**
   * Get the intended movement direction
   *
   * @returns The direction the player intends to move, or null if not moving
   *
   * @example
   * ```ts
   * const intended = player.getIntendedDirection();
   * if (intended === Direction.Left) {
   *   // Player is trying to move left
   * }
   * ```
   */
  getIntendedDirection(): Direction | null {
    return this._intendedDirection;
  }

  /**
   * Apply physics body position to player coordinates
   *
   * Synchronizes the player's position with their physics body after
   * physics calculations. This method no longer automatically changes
   * the player's direction based on position changes, as direction
   * should be controlled by intended movement instead.
   *
   * @param body - The Matter.js physics body
   *
   * @example
   * ```ts
   * // Called automatically by physics system
   * player.applyPhysic(body);
   * ```
   */
  applyPhysic(body: Matter.Body) {
    // Convert body center position to top-left corner for consistency
    const width = body.bounds.max.x - body.bounds.min.x;
    const height = body.bounds.max.y - body.bounds.min.y;
    const topLeftX = body.position.x - width / 2;
    const topLeftY = body.position.y - height / 2;

    const posChanged =
      Math.round(this.x()) !== Math.round(topLeftX) ||
      Math.round(this.y()) !== Math.round(topLeftY);
    if (posChanged) {
      // Only update position, do not change direction based on physics movement
      // Direction should be controlled by intended movement via setIntendedDirection()
      this.x.set(topLeftX);
      this.y.set(topLeftY);
    }
  }

  abstract setAnimation(animationName: string, nbTimes: number): void;
  abstract showComponentAnimation(id: string, params: any): void;

  /**
   * Display a spritesheet animation on the player
   * 
   * This method displays a temporary visual animation using a spritesheet.
   * The animation can either be displayed as an overlay on the player or replace
   * the player's current graphic temporarily. This is useful for spell effects,
   * transformations, or other visual feedback that uses predefined spritesheets.
   * 
   * @param graphic - The ID of the spritesheet to use for the animation
   * @param animationName - The name of the animation within the spritesheet (default: 'default')
   * @param replaceGraphic - Whether to replace the player's sprite with the animation (default: false)
   * 
   * @example
   * ```ts
   * // Show explosion animation as overlay on player
   * player.showAnimation("explosion");
   * 
   * // Show specific spell effect animation
   * player.showAnimation("spell-effects", "fireball");
   * 
   * // Transform player graphic temporarily with animation
   * player.showAnimation("transformation", "werewolf", true);
   * 
   * // Show healing effect on player
   * player.showAnimation("healing-effects", "holy-light");
   * ```
   */
  showAnimation(graphic: string, animationName: string = 'default', replaceGraphic: boolean = false) {
    if (replaceGraphic) {
      this.setAnimation(animationName, 1);
      return
    }
    this.showComponentAnimation("animation", {
      graphic,
      animationName,
    });
  }

  _showAnimation(params: ShowAnimationParams) {
    const { graphic, animationName, loop } = params;
    if (graphic) {
      if (Array.isArray(graphic)) {
        this.graphics.set(graphic);
      } else {
        this.graphics.set([graphic]);
      }
    }
  }

  /**
   * Create a temporary and moving hitbox relative to the player's position
   *
   * Creates a temporary hitbox that moves through multiple positions sequentially,
   * with all coordinates being relative to the player's current position.
   * For example, you can use it for player attacks, spells, or area effects
   * that should follow the player's position.
   *
   * The method creates a zone sensor that moves through the specified hitbox positions
   * at the given speed, detecting collisions with other players and events at each step.
   *
   * @param hitboxes - Array of hitbox positions relative to player position
   * @param options - Configuration options for the movement
   * @param map - Reference to the map instance for physics access
   * @returns Observable that emits arrays of hit entities and completes when movement is finished
   *
   * @example
   * ```ts
   * // Create a forward attack relative to player position
   * player.createMovingHitbox([
   *   { x: 0, y: -32, width: 32, height: 32 },    // In front of player
   *   { x: 0, y: -64, width: 32, height: 32 }     // Further in front
   * ], { speed: 2 }, map).subscribe({
   *   next(hits) {
   *     // hits contains other RpgPlayer or RpgEvent objects that were hit
   *     console.log('Hit entities:', hits);
   *   },
   *   complete() {
   *     console.log('Attack finished');
   *   }
   * });
   * ```
   */
  createMovingHitbox(
    hitboxes: Array<{ x: number; y: number; width: number; height: number }>,
    options: { speed?: number } = {}
  ): Observable<any[]> {
    // Convert relative positions to absolute positions based on player's current position
    const absoluteHitboxes = hitboxes.map((hitbox) => ({
      x: this.x() + hitbox.x,
      y: this.y() + hitbox.y,
      width: hitbox.width,
      height: hitbox.height,
    }));

    // Delegate to the map's createMovingHitbox method with absolute positions
    return this.getCurrentMap().createMovingHitbox(absoluteHitboxes, options);
  }

  getCurrentMap() {
    return this["map"];
  }

  get hp(): number {
    return this.hpSignal();
  }

  get sp(): number {
    return this.spSignal();
  }
}

export type PlayerCtor<T extends RpgCommonPlayer = RpgCommonPlayer> =
  Constructor<T>;
