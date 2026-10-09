import { PlayerCtor, ProjectileType } from "@rpgjs/common";
import { RpgCommonPlayer, Direction, Entity } from "@rpgjs/common";
import {
  MovementStrategy,
  MovementOptions,
  LinearMove,
  Dash,
  Knockback,
  PathFollow,
  Oscillate,
  CompositeMovement,
  SeekAvoid,
  LinearRepulsion,
  IceMovement,
  ProjectileMovement,
  random,
  isFunction,
  capitalize,
  PerlinNoise2D
} from "@rpgjs/common";
import type { MovementBody } from "@rpgjs/physic";
import { RpgMap } from "../rooms/map";
import { Observable, Subscription, takeUntil, Subject, tap, switchMap, of, from, take } from 'rxjs';
import { RpgPlayer } from "./Player";

const MOVEMENT_ANIMATION_NAMES = ['stand', 'walk'];
const MOVEMENT_RESOLUTION_ERROR = "unable to resolve entity";

const isMovementResolutionError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return message.includes(MOVEMENT_RESOLUTION_ERROR);
};

const hasMovementBody = (map: any, id: string): boolean => {
  return typeof map?.getBody !== 'function' || Boolean(map.getBody(id));
};

const runMovementOperation = <T>(fallback: T, operation: () => T): T => {
  try {
    return operation();
  }
  catch (error) {
    if (isMovementResolutionError(error)) {
      return fallback;
    }
    throw error;
  }
};

interface PlayerWithMixins extends RpgCommonPlayer {
  getCurrentMap(): RpgMap;
  id: string;
  server: any;
  _destroy$: Subject<void>;
  frequency: number;
  nbPixelInTile: number;
  moveByDirection: (direction: Direction, deltaTimeInt: number) => Promise<boolean>;
  changeDirection: (direction: Direction) => boolean;
}


function wait(sec: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, sec * 1000)
  })
}

export type CallbackTileMove = (player: RpgPlayer, map: RpgMap) => Direction[]
export type CallbackTurnMove = (player: RpgPlayer, map: RpgMap) => string
export type MoveRouteCallback = (player: RpgPlayer, map: RpgMap) => string | Direction | Direction[] | Promise<void> | undefined
export type MoveRoute = string | Promise<void> | Direction | Direction[] | MoveRouteCallback
export type Routes = MoveRoute[]

// Re-export MovementOptions from @rpgjs/common for convenience
export type { MovementOptions };

/**
 * Options for moveRoutes method
 */
export interface MoveRoutesOptions {
  /**
   * Callback function called when the player gets stuck (cannot move towards target)
   * 
   * This callback is triggered when the player is trying to move but cannot make progress
   * towards the target position, typically due to obstacles or collisions.
   * 
   * @param player - The player instance that is stuck
   * @param target - The target position the player was trying to reach
   * @param currentPosition - The current position of the player
   * @returns If true, the route will continue; if false, the route will be cancelled
   * 
   * @example
   * ```ts
   * await player.moveRoutes([Move.right()], {
   *   onStuck: (player, target, currentPos) => {
   *     console.log('Player is stuck!');
   *     return false; // Cancel the route
   *   }
   * });
   * ```
   */
  onStuck?: (player: RpgPlayer, target: { x: number; y: number }, currentPosition: { x: number; y: number }) => boolean | void;

  /**
   * Time in milliseconds to wait before considering the player stuck (default: 500ms)
   * 
   * The player must be unable to make progress for this duration before onStuck is called.
   */
  stuckTimeout?: number;

  /**
   * Minimum distance change in pixels to consider movement progress (default: 1 pixel)
   * 
   * If the player moves less than this distance over the stuckTimeout period, they are considered stuck.
   */
  stuckThreshold?: number;

  /**
   * Multiplier applied to the player's frequency delay between route segments.
   *
   * The default keeps legacy route timing. Lower values are useful for generated
   * routes that need smoother visual motion, such as Studio random movement.
   */
  frequencyRatio?: number;
}

export enum Frequency {
  Lowest = 600,
  Lower = 400,
  Low = 200,
  High = 100,
  Higher = 50,
  Highest = 25,
  None = 0
}

export enum Speed {
  Slowest = 0.2,
  Slower = 0.5,
  Slow = 1,
  Normal = 3,
  Fast = 5,
  Faster = 7,
  Fastest = 10
}

/** 
* @title Move
* @enum {Object}
* 
* Move.right(repeat=1) | Movement of a number of pixels on the right
* Move.left(repeat=1) | Movement of a number of pixels on the left 
* Move.up(repeat=1) | Movement of a number of pixels on the up
* Move.down(repeat=1) | Movement of a number of pixels on the down
* Move.random(repeat=1) | Movement of a number of pixels in a random direction
* Move.towardPlayer(player, repeat=1) | Moves a number of pixels in the direction of the designated player
* Move.awayFromPlayer(player, repeat=1) | Moves a number of pixels in the opposite direction of the designated player
* Move.tileRight(repeat=1) | Movement of a number of tiles on the right
* Move.tileLeft(repeat=1) | Movement of a number of tiles on the left
* Move.tileUp(repeat=1) | Movement of a number of tiles on the up
* Move.tileDown(repeat=1) | Movement of a number of tiles on the down
* Move.tileRandom(repeat=1) | Movement of a number of tiles in a random direction
* Move.tileTowardPlayer(player, repeat=1) | Moves a number of tiles in the direction of the designated player
* Move.tileAwayFromPlayer(player, repeat=1) | Moves a number of tiles in the opposite direction of the designated player
* Move.turnRight() | Turn to the right
* Move.turnLeft() | Turn to the left
* Move.turnUp() | Turn to the up
* Move.turnDown() | Turn to the down
* Move.turnRandom() | Turn to random direction
* Move.turnAwayFromPlayer(player) | Turns in the opposite direction of the designated player
* Move.turnTowardPlayer(player) | Turns in the direction of the designated player
* @memberof Move
* */
/**
 * Tracks player state for stuck detection in random movement
 * 
 * Stores the last known position and direction for each player to detect
 * when they are stuck (position hasn't changed) and need a different direction.
 */
interface PlayerMoveState {
  lastX: number;
  lastY: number;
  lastDirection: number;
  stuckCount: number;
}

class MoveList {
  // Shared Perlin noise instance for smooth random movement
  private static perlinNoise: PerlinNoise2D = new PerlinNoise2D();
  private static randomCounter: number = 0;
  // Instance counter for each call to ensure variation
  private static callCounter: number = 0;
  // Track player positions and directions to detect stuck state
  private static playerMoveStates: Map<string, PlayerMoveState> = new Map();
  // Threshold for considering a player as "stuck" (in pixels)
  private static readonly STUCK_THRESHOLD = 2;

  private getRandomDirectionIndex(): number {
    MoveList.callCounter += 1;
    MoveList.randomCounter += 1;
    const noise = MoveList.perlinNoise.get(MoveList.callCounter, MoveList.randomCounter, 0.2);
    return Math.abs(Math.floor(((noise + 1) / 2) * 4)) % 4;
  }

  /**
   * Clears the movement state for a specific player
   * 
   * Should be called when a player changes map or is destroyed to prevent
   * memory leaks and stale stuck detection data.
   * 
   * @param playerId - The ID of the player to clear state for
   * 
   * @example
   * ```ts
   * // Clear state when player leaves map
   * Move.clearPlayerState(player.id);
   * ```
   */
  static clearPlayerState(playerId: string): void {
    MoveList.playerMoveStates.delete(playerId);
  }

  /**
   * Clears all player movement states
   * 
   * Useful for cleanup during server shutdown or when resetting game state.
   * 
   * @example
   * ```ts
   * // Clear all states on server shutdown
   * Move.clearAllPlayerStates();
   * ```
   */
  static clearAllPlayerStates(): void {
    MoveList.playerMoveStates.clear();
  }

  repeatMove(direction: Direction, repeat: number): Direction[] {
    // Safety check for valid repeat value
    if (!Number.isFinite(repeat) || repeat < 0 || repeat > 10000) {
      console.warn('Invalid repeat value:', repeat, 'using default value 1');
      repeat = 1;
    }

    // Ensure repeat is an integer
    repeat = Math.floor(repeat);

    // Additional safety check - ensure repeat is a safe integer
    if (repeat < 0 || repeat > Number.MAX_SAFE_INTEGER || !Number.isSafeInteger(repeat)) {
      console.warn('Unsafe repeat value:', repeat, 'using default value 1');
      repeat = 1;
    }

    try {
      return new Array(repeat).fill(direction);
    } catch (error) {
      console.error('Error creating array with repeat:', repeat, error);
      return [direction]; // Return single direction as fallback
    }
  }

  private repeatTileMove(direction: string, repeat: number, propMap: string): CallbackTileMove {
    return (player: RpgPlayer, map): Direction[] => {
      const playerSpeed = (player as any).speed;

      // Safety checks
      if (!playerSpeed || playerSpeed <= 0) {
        console.warn('Invalid player speed:', playerSpeed, 'using default speed 3');
        return this[direction](repeat);
      }

      const repeatTile = Math.floor((map[propMap] || 32) / playerSpeed) * repeat;

      // Additional safety check for the calculated repeat value
      if (!Number.isFinite(repeatTile) || repeatTile < 0 || repeatTile > 10000) {
        console.warn('Calculated repeatTile is invalid:', repeatTile, 'using original repeat:', repeat);
        return this[direction](repeat);
      }

      // Final safety check before calling the method
      if (!Number.isSafeInteger(repeatTile)) {
        console.warn('repeatTile is not a safe integer:', repeatTile, 'using original repeat:', repeat);
        return this[direction](repeat);
      }

      try {
        return this[direction](repeatTile);
      } catch (error) {
        console.error('Error calling direction method with repeatTile:', repeatTile, error);
        return this[direction](repeat); // Fallback to original repeat
      }
    }
  }

  right(repeat: number = 1): Direction[] {
    return this.repeatMove(Direction.Right, repeat)
  }

  left(repeat: number = 1): Direction[] {
    return this.repeatMove(Direction.Left, repeat)
  }

  up(repeat: number = 1): Direction[] {
    return this.repeatMove(Direction.Up, repeat)
  }

  down(repeat: number = 1): Direction[] {
    return this.repeatMove(Direction.Down, repeat)
  }

  wait(sec: number): Promise<void> {
    return wait(sec)
  }

  random(repeat: number = 1): Direction[] {
    return new Array(repeat).fill(null).map(() => [
        Direction.Right,
        Direction.Left,
        Direction.Up,
        Direction.Down
    ][random(0, 3)])
}

  tileRight(repeat: number = 1): CallbackTileMove {
    return this.repeatTileMove('right', repeat, 'tileWidth')
  }

  tileLeft(repeat: number = 1): CallbackTileMove {
    return this.repeatTileMove('left', repeat, 'tileWidth')
  }

  tileUp(repeat: number = 1): CallbackTileMove {
    return this.repeatTileMove('up', repeat, 'tileHeight')
  }

  tileDown(repeat: number = 1): CallbackTileMove {
    return this.repeatTileMove('down', repeat, 'tileHeight')
  }

  tileRandom(repeat: number = 1): CallbackTileMove {
    return (player: RpgPlayer, map): Direction[] => {
        let directions: Direction[] = []
        for (let i = 0; i < repeat; i++) {
            const randFn: CallbackTileMove = [
                this.tileRight(),
                this.tileLeft(),
                this.tileUp(),
                this.tileDown()
            ][random(0, 3)]
            directions = [
                ...directions,
                ...randFn(player, map)
            ]
        }
        return directions
    }
}

  private _awayFromPlayerDirection(player: RpgPlayer, otherPlayer: RpgPlayer): Direction {
    const directionOtherPlayer = otherPlayer.getDirection()
    let newDirection: Direction = Direction.Down

    switch (directionOtherPlayer) {
      case Direction.Left:
      case Direction.Right:
        if (otherPlayer.x() > player.x()) {
          newDirection = Direction.Left
        }
        else {
          newDirection = Direction.Right
        }
        break
      case Direction.Up:
      case Direction.Down:
        if (otherPlayer.y() > player.y()) {
          newDirection = Direction.Up
        }
        else {
          newDirection = Direction.Down
        }
        break
    }
    return newDirection
  }

  private _towardPlayerDirection(player: RpgPlayer, otherPlayer: RpgPlayer): Direction {
    const directionOtherPlayer = otherPlayer.getDirection()
    let newDirection: Direction = Direction.Down

    switch (directionOtherPlayer) {
      case Direction.Left:
      case Direction.Right:
        if (otherPlayer.x() > player.x()) {
          newDirection = Direction.Right
        }
        else {
          newDirection = Direction.Left
        }
        break
      case Direction.Up:
      case Direction.Down:
        if (otherPlayer.y() > player.y()) {
          newDirection = Direction.Down
        }
        else {
          newDirection = Direction.Up
        }
        break
    }
    return newDirection
  }

  private _awayFromPlayer({ isTile, typeMov }: { isTile: boolean, typeMov: string }, otherPlayer: RpgPlayer, repeat: number = 1): CallbackTileMove {
    const method = (dir: Direction) => {
      const direction: string = DirectionNames[dir as any] || 'down'
      return this[isTile ? 'tile' + capitalize(direction) : direction](repeat)
    }
    return (player: RpgPlayer, map) => {
      let newDirection: Direction = Direction.Down
      switch (typeMov) {
        case 'away':
          newDirection = this._awayFromPlayerDirection(player, otherPlayer)
          break;
        case 'toward':
          newDirection = this._towardPlayerDirection(player, otherPlayer)
          break
      }
      let direction: any = method(newDirection)
      if (isFunction(direction)) {
        direction = direction(player, map)
      }
      return direction
    }
  }

  towardPlayer(player: RpgPlayer, repeat: number = 1): CallbackTileMove {
    return this._awayFromPlayer({ isTile: false, typeMov: 'toward' }, player, repeat)
  }

  tileTowardPlayer(player: RpgPlayer, repeat: number = 1): CallbackTileMove {
    return this._awayFromPlayer({ isTile: true, typeMov: 'toward' }, player, repeat)
  }

  awayFromPlayer(player: RpgPlayer, repeat: number = 1): CallbackTileMove {
    return this._awayFromPlayer({ isTile: false, typeMov: 'away' }, player, repeat)
  }

  tileAwayFromPlayer(player: RpgPlayer, repeat: number = 1): CallbackTileMove {
    return this._awayFromPlayer({ isTile: true, typeMov: 'away' }, player, repeat)
  }

  turnLeft(): string {
    return 'turn-' + Direction.Left
  }

  turnRight(): string {
    return 'turn-' + Direction.Right
  }

  turnUp(): string {
    return 'turn-' + Direction.Up
  }

  turnDown(): string {
    return 'turn-' + Direction.Down
  }

  turnRandom(): string {
    // Use Perlin noise for smooth random turn direction with guaranteed variation
    const directionIndex = this.getRandomDirectionIndex();
    return [
      this.turnRight(),
      this.turnLeft(),
      this.turnUp(),
      this.turnDown()
    ][directionIndex]
  }

  turnAwayFromPlayer(otherPlayer: RpgPlayer): CallbackTurnMove {
    return (player: RpgPlayer) => {
      const direction = this._awayFromPlayerDirection(player, otherPlayer)
      return 'turn-' + direction
    }
  }

  turnTowardPlayer(otherPlayer: RpgPlayer): CallbackTurnMove {
    return (player: RpgPlayer) => {
      const direction = this._towardPlayerDirection(player, otherPlayer)
      return 'turn-' + direction
    }
  }
}

// Direction mapping for string conversion
const DirectionNames: { [key: string]: string } = {
  [Direction.Up]: 'up',
  [Direction.Down]: 'down',
  [Direction.Left]: 'left',
  [Direction.Right]: 'right'
};

export const Move = new MoveList();

/**
 * Move Manager mixin
 * 
 * Adds comprehensive movement management capabilities to a player class.
 * Provides access to all available movement strategies and utility methods
 * for common movement patterns.
 * 
 * ## Features
 * - **Strategy Management**: Add, remove, and query movement strategies
 * - **Predefined Movements**: Quick access to common movement patterns
 * - **Composite Movements**: Combine multiple strategies
 * - **Physics Integration**: Seamless integration with the deterministic @rpgjs/physic engine
 * 
 * ## Available Movement Strategies
 * - `LinearMove`: Constant velocity movement
 * - `Dash`: Quick burst movement
 * - `Knockback`: Push effect with decay
 * - `PathFollow`: Follow waypoint sequences
 * - `Oscillate`: Back-and-forth patterns
 * - `SeekAvoid`: AI target seeking with local obstacle avoidance
 * - `LinearRepulsion`: Smoother obstacle avoidance
 * - `IceMovement`: Slippery surface physics
 * - `ProjectileMovement`: Ballistic trajectories
 * - `CompositeMovement`: Combine multiple strategies
 * 
 * @param Base - The base class to extend
 * @returns A new class with comprehensive movement management capabilities
 * 
 * @example
 * ```ts
 * // Basic usage
 * class MyPlayer extends WithMoveManager(RpgCommonPlayer) {
 *   onInput(direction: { x: number, y: number }) {
 *     // Apply dash movement on input
 *     this.dash(direction, 8, 200);
 *   }
 * 
 *   onIceTerrain() {
 *     // Switch to ice physics
 *     this.clearMovements();
 *     this.applyIceMovement({ x: 1, y: 0 }, 4);
 *   }
 * 
 *   createPatrol() {
 *     // Create patrol path
 *     const waypoints = [
 *       { x: 100, y: 100 },
 *       { x: 300, y: 100 },
 *       { x: 300, y: 300 }
 *     ];
 *     this.followPath(waypoints, 2, true);
 *   }
 * }
 * ```
 */
/**
 * Move Manager Mixin
 * 
 * Provides comprehensive movement management capabilities to any class. This mixin handles
 * various types of movement including target seeking, physics-based movement, route following,
 * and advanced movement strategies like dashing, knockback, and projectile movement.
 * 
 * @param Base - The base class to extend with movement management
 * @returns Extended class with movement management methods
 * 
 * @example
 * ```ts
 * class MyPlayer extends WithMoveManager(BasePlayer) {
 *   constructor() {
 *     super();
 *     this.frequency = Frequency.High;
 *   }
 * }
 * 
 * const player = new MyPlayer();
 * player.moveTo({ x: 100, y: 100 });
 * player.dash({ x: 1, y: 0 }, 8, 200);
 * ```
 */
export function WithMoveManager<TBase extends PlayerCtor>(Base: TBase) {
  const baseProto = Base.prototype as any;
  class WithMoveManagerClass extends Base {
    setAnimation(animationName: string, nbTimes: number): void {
      if (typeof baseProto.setAnimation === 'function') {
        baseProto.setAnimation.call(this, animationName, nbTimes);
      }
    }

    showComponentAnimation(id: string, params: any): void {
      if (typeof baseProto.showComponentAnimation === 'function') {
        baseProto.showComponentAnimation.call(this, id, params);
      }
    }

    // Properties for infinite route management
    _infiniteRoutes: Routes | null = null;
    _finishRoute: ((value: boolean) => void) | null = null;
    _isInfiniteRouteActive: boolean = false;

    set throughOtherPlayer(value: boolean) {
      this._throughOtherPlayer.set(value);
    }

    get throughOtherPlayer(): boolean {
      return this._throughOtherPlayer();
    }

    set through(value: boolean) {
      this._through.set(value);
    }

    get through(): boolean {
      return this._through();
    }

    set throughEvent(value: boolean) {
      this._throughEvent.set(value);
    }

    get throughEvent(): boolean {
      return this._throughEvent();
    }

    set frequency(value: number) {
      this._frequency.set(value);
    }

    get frequency(): number {
      return this._frequency();
    }

    set directionFixed(value: boolean) {
      (this as any)._directionFixed.set(value);
    }

    get directionFixed(): boolean {
      return (this as any)._directionFixed();
    }

    set animationFixed(value: boolean) {
      (this as any)._animationFixed.set(value);
    }

    get animationFixed(): boolean {
      return (this as any)._animationFixed();
    }

    /**
     * Add a movement strategy to this entity
     * 
     * Returns a Promise that resolves when the movement completes (when `isFinished()` returns true).
     * If the strategy doesn't implement `isFinished()`, the Promise resolves immediately.
     * 
     * @param strategy - The movement strategy to add
     * @param options - Optional callbacks for start and completion events
     * @returns Promise that resolves when the movement completes
     * 
     * @example
     * ```ts
     * // Fire and forget
     * player.addMovement(new LinearMove({ x: 1, y: 0 }, 200));
     * 
     * // Wait for completion
     * await player.addMovement(new Dash(10, { x: 1, y: 0 }, 200));
     * console.log('Dash completed!');
     * 
     * // With callbacks
     * await player.addMovement(new Knockback({ x: -1, y: 0 }, 5, 300), {
     *   onStart: () => console.log('Knockback started'),
     *   onComplete: () => console.log('Knockback completed')
     * });
     * ```
     */
    addMovement(strategy: MovementStrategy, options?: MovementOptions): Promise<void> {
      const map = (this as unknown as PlayerWithMixins).getCurrentMap() as any;
      if (!map) return Promise.resolve();

      const playerId = (this as unknown as PlayerWithMixins).id;
      if (!hasMovementBody(map, playerId)) {
        return Promise.resolve();
      }

      return runMovementOperation(
        Promise.resolve(),
        () => map.moveManager.add(playerId, strategy, options)
      );
    }

    removeMovement(strategy: MovementStrategy): boolean {
      const map = (this as unknown as PlayerWithMixins).getCurrentMap() as any;
      if (!map) return false;

      const playerId = (this as unknown as PlayerWithMixins).id;
      if (!hasMovementBody(map, playerId)) return false;
      return runMovementOperation(false, () => map.moveManager.remove(playerId, strategy));
    }

    clearMovements(): void {
      const map = (this as unknown as PlayerWithMixins).getCurrentMap() as any;
      delete (this as any).__routeMovementClamp;
      const body = map?.getBody?.((this as unknown as PlayerWithMixins).id) as any;
      if (body) {
        delete body.__routeMovementClamp;
      }
      if (!map) return;

      const playerId = (this as unknown as PlayerWithMixins).id;
      if (!hasMovementBody(map, playerId)) return;
      runMovementOperation(undefined, () => map.moveManager.clear(playerId));
    }

    hasActiveMovements(): boolean {
      const map = (this as unknown as PlayerWithMixins).getCurrentMap() as any;
      if (!map) return false;

      const playerId = (this as unknown as PlayerWithMixins).id;
      if (!hasMovementBody(map, playerId)) return false;
      return runMovementOperation(false, () => map.moveManager.hasActiveStrategies(playerId));
    }

    getActiveMovements(): MovementStrategy[] {
      const map = (this as unknown as PlayerWithMixins).getCurrentMap() as any;
      if (!map) return [];

      const playerId = (this as unknown as PlayerWithMixins).id;
      if (!hasMovementBody(map, playerId)) return [];
      return runMovementOperation([], () => map.moveManager.getStrategies(playerId));
    }

    /**
     * Move toward a target player or position using local obstacle avoidance
     * 
     * Uses the `SeekAvoid` strategy to navigate toward the target while avoiding blocking
     * hitboxes and events locally. It does not compute a full path.
     * The movement speed is based on the player's current `speed` and `frequency` settings,
     * scaled appropriately.
     * 
     * @param target - Target player or position `{ x, y }` to move toward
     * 
     * @example
     * ```ts
     * // Move toward another player
     * player.moveTo(otherPlayer);
     * 
     * // Move toward a specific position
     * player.moveTo({ x: 200, y: 150 });
     * ```
     */
    moveTo(target: RpgCommonPlayer | { x: number, y: number }): void {
      const map = (this as unknown as PlayerWithMixins).getCurrentMap() as any;
      if (!map) return;

      const playerId = (this as unknown as PlayerWithMixins).id;
      const engine = map.physic;
      if (!hasMovementBody(map, playerId)) return;

      // Calculate maxSpeed based on player's speed and frequency
      // Original values: 180 for player target, 80 for position target (with default speed=4)
      // Factor: 45 for player (180/4), 20 for position (80/4)
      const playerSpeed = (this as any).speed;
      const rawFrequency = (this as any).frequency;
      const playerFrequency = typeof rawFrequency === 'function' ? rawFrequency() : rawFrequency;
      const frequencyScale = playerFrequency > 0 ? Frequency.High / playerFrequency : 1;
      const normalizedFrequencyScale = Number.isFinite(frequencyScale) && frequencyScale > 0 ? frequencyScale : 1;

      // Remove ALL movement strategies that could interfere with SeekAvoid
      // This includes SeekAvoid, Dash, Knockback, and LinearRepulsion
      const existingStrategies = this.getActiveMovements();
      const conflictingStrategies = existingStrategies.filter(s => 
        s instanceof SeekAvoid || 
        s instanceof Dash || 
        s instanceof Knockback || 
        s instanceof LinearRepulsion
      );
      
      if (conflictingStrategies.length > 0) {
        conflictingStrategies.forEach(s => this.removeMovement(s));
      }

      if ('id' in target) {
        const targetProvider = () => {
          const body = (map as any).getBody(target.id) ?? null;
          return body;
        };
        // Factor 45: with speed=4 gives 180 (original value)
        const maxSpeed = playerSpeed * 45 * normalizedFrequencyScale;
        runMovementOperation(
          undefined,
          () => map.moveManager.add(
            playerId,
            new SeekAvoid(engine, targetProvider, maxSpeed, 140, 80, 48)
          )
        );
        return;
      }

      const staticTarget = new Entity({
        position: { x: target.x, y: target.y },
        mass: Infinity,
      });
      staticTarget.freeze();

      // Factor 20: with speed=4 gives 80 (original value)
      const maxSpeed = playerSpeed * 20 * normalizedFrequencyScale;
      runMovementOperation(
        undefined,
        () => map.moveManager.add(
          playerId,
          new SeekAvoid(engine, () => staticTarget, maxSpeed, 140, 80, 48)
        )
      );
    }

    stopMoveTo(): void {
      const map = (this as unknown as PlayerWithMixins).getCurrentMap() as any;
      if (!map) return;

      let strategies: MovementStrategy[] = [];
      try {
        strategies = this.getActiveMovements();
      }
      catch (error) {
        // Teardown race: entity can be removed while AI still clears movements.
        const message = (error as Error | undefined)?.message ?? "";
        if (message.includes("unable to resolve entity")) {
          return;
        }
        throw error;
      }
      const toRemove = strategies.filter(s => s instanceof SeekAvoid || s instanceof LinearRepulsion);
      
      if (toRemove.length > 0) {
        toRemove.forEach(strategy => {
          this.removeMovement(strategy);
        });
      }
    }

    /**
     * Perform a dash movement in the specified direction
     * 
     * Creates a burst of velocity for a fixed duration. The total speed is calculated
   * by adding the player's base speed (`this.speed`) to the additional dash speed.
     * This ensures faster players also dash faster proportionally.
     * 
     * With default speed=4 and additionalSpeed=4: total = 8 (same as original default)
     * 
     * @param direction - Normalized direction vector `{ x, y }` for the dash
     * @param additionalSpeed - Extra speed added on top of base speed (default: 4)
     * @param duration - Duration in milliseconds (default: 200)
     * @param options - Optional callbacks for movement events
     * @returns Promise that resolves when the dash completes
     * 
     * @example
     * ```ts
     * // Dash to the right and wait for completion
     * await player.dash({ x: 1, y: 0 });
     * 
     * // Powerful dash with callbacks
     * await player.dash({ x: 0, y: -1 }, 12, 300, {
     *   onStart: () => console.log('Dash started!'),
     *   onComplete: () => console.log('Dash finished!')
     * });
     * ```
     */
    dash(direction: { x: number, y: number }, additionalSpeed: number = 4, duration: number = 200, options?: MovementOptions): Promise<void> {
      const playerSpeed = (this as any).speed;
      // Total dash speed = base speed + additional speed
      // With speed=4, additionalSpeed=4: gives 8 (original default value)
      const totalSpeed = playerSpeed + additionalSpeed;
      // Physic strategies expect seconds (dt is in seconds), while the server API exposes milliseconds
      const durationSeconds = duration / 1000;
      return this.addMovement(new Dash(totalSpeed, direction, durationSeconds), options);
    }

    /**
     * Apply knockback effect in the specified direction
     * 
     * Pushes the entity with an initial force that decays over time.
     * Returns a Promise that resolves when the knockback completes **or is cancelled**.
     * 
     * ## Design notes
     * - The underlying physics `MovementManager` can cancel strategies via `remove()`, `clear()`,
     *   or `stopMovement()` **without resolving the Promise** returned by `add()`.
     * - For this reason, this method considers the knockback finished when either:
     *   - the `add()` promise resolves (normal completion), or
     *   - the strategy is no longer present in the active movements list (cancellation).
     * - When multiple knockbacks overlap, `directionFixed` and `animationFixed` are restored
     *   only after **all** knockbacks have finished (including cancellations).
     * 
     * @param direction - Normalized direction vector `{ x, y }` for the knockback
     * @param force - Initial knockback force (default: 5)
     * @param duration - Duration in milliseconds (default: 300)
     * @param options - Optional callbacks for movement events
     * @returns Promise that resolves when the knockback completes or is cancelled
     * 
     * @example
     * ```ts
     * // Simple knockback (await is optional)
     * await player.knockback({ x: 1, y: 0 }, 5, 300);
     *
     * // Overlapping knockbacks: flags are restored only after the last one ends
     * player.knockback({ x: -1, y: 0 }, 5, 300);
     * player.knockback({ x: 0, y: 1 }, 3, 200);
     *
     * // Cancellation (e.g. map change) will still restore fixed flags
     * // even if the underlying movement strategy promise is never resolved.
     * ```
     */
    async knockback(direction: { x: number, y: number }, force: number = 5, duration: number = 300, options?: MovementOptions): Promise<void> {
      const durationSeconds = duration / 1000;
      const selfAny = this as any;
      const lockKey = '__rpg_knockback_lock__';

      type KnockbackLockState = {
        prevDirectionFixed: boolean;
        prevAnimationFixed: boolean;
        prevAnimationName?: string;
      };

      const getLock = (): KnockbackLockState | undefined => selfAny[lockKey];
      const setLock = (lock: KnockbackLockState): void => {
        selfAny[lockKey] = lock;
      };
      const clearLock = (): void => {
        delete selfAny[lockKey];
      };

      const hasActiveKnockback = (): boolean =>
        this.getActiveMovements().some(s => s instanceof Knockback);

      const setAnimationName = (name: string): void => {
        if (typeof selfAny.setGraphicAnimation === 'function') {
          selfAny.setGraphicAnimation(name);
          return;
        }
        const animSignal = selfAny.animationName;
        if (animSignal && typeof animSignal === 'object' && typeof animSignal.set === 'function') {
          animSignal.set(name);
        }
      };

      const getAnimationName = (): string | undefined => {
        const animSignal = selfAny.animationName;
        if (typeof animSignal === 'function') {
          try {
            return animSignal();
          } catch {
            return undefined;
          }
        }
        return undefined;
      };

      const resolveRestoredAnimationName = (name: string | undefined): string | undefined => {
        if (!name) return undefined;
        if (!MOVEMENT_ANIMATION_NAMES.includes(name)) return name;

        const map = typeof selfAny.getCurrentMap === 'function' ? selfAny.getCurrentMap() : undefined;
        const isMoving = typeof map?.isMoving === 'function' ? map.isMoving(this.id) : false;
        return isMoving ? 'walk' : 'stand';
      };

      const restore = (): void => {
        const lock = getLock();
        if (!lock) return;

        this.knockbackActive.set(false);
        // A movement ACK captured before impact must never restore the pre-hit position.
        selfAny._lastFramePositions = null;
        const map = (this as unknown as PlayerWithMixins).getCurrentMap();
        if (!this.getActiveMovements().length) {
          map?.getBody(this.id)?.setVelocity({ x: 0, y: 0 });
        }
        this.directionFixed = lock.prevDirectionFixed;

        const prevAnimFixed = lock.prevAnimationFixed && this.animationFixed;
        const actionFinishedDuringRecoil = lock.prevAnimationFixed && !this.animationFixed;
        const restoredAnimationName = resolveRestoredAnimationName(
          actionFinishedDuringRecoil ? 'stand' : lock.prevAnimationName,
        );
        this.animationFixed = false; // temporarily unlock so we can restore animation
        if (!prevAnimFixed && restoredAnimationName) {
          setAnimationName(restoredAnimationName);
        }
        this.animationFixed = prevAnimFixed;

        clearLock();
      };

      const ensureLockInitialized = (): void => {
        if (getLock()) return;

        setLock({
          prevDirectionFixed: this.directionFixed,
          prevAnimationFixed: this.animationFixed,
          prevAnimationName: getAnimationName(),
        });

        this.knockbackActive.set(true);
        selfAny._lastFramePositions = null;
        selfAny.pendingInputs = [];
        this.directionFixed = true;
        setAnimationName('stand');
        this.animationFixed = true;
      };

      const waitUntilRemovedOrTimeout = (strategy: MovementStrategy): Promise<void> => {
        return new Promise<void>((resolve) => {
          const start = Date.now();
          const maxMs = Math.max(0, duration + 1000);

          const intervalId = setInterval(() => {
            const active = this.getActiveMovements();
            if (!active.includes(strategy) || (Date.now() - start > maxMs)) {
              clearInterval(intervalId);
              resolve();
            }
          }, 16);
        });
      };

      // First knockback creates the lock and freezes direction/animation.
      // Next knockbacks reuse the lock and keep the fixed flags enabled.
      ensureLockInitialized();

      // Recoil owns velocity until completion; input processing preserves this strategy.
      const strategy = new Knockback(direction, force, durationSeconds);
      const addPromise = this.addMovement(strategy, options);

      try {
        await Promise.race([addPromise, waitUntilRemovedOrTimeout(strategy)]);
      } finally {
        // Restore only when ALL knockbacks are done (including cancellations).
        if (!hasActiveKnockback()) {
          restore();
        }
      }
    }

    /**
     * Follow a sequence of waypoints
     * 
     * Makes the entity move through a list of positions at a speed calculated
     * from the player's base speed. The `speedMultiplier` allows adjusting
     * the travel speed relative to the player's normal movement speed.
     * 
     * With default speed=4 and multiplier=0.5: speed = 2 (same as original default)
     * 
     * @param waypoints - Array of `{ x, y }` positions to follow in order
     * @param speedMultiplier - Multiplier applied to base speed (default: 0.5)
     * @param loop - Whether to loop back to start after reaching the end (default: false)
     * 
     * @example
     * ```ts
     * // Follow a patrol path at normal speed
     * const patrol = [
     *   { x: 100, y: 100 },
     *   { x: 200, y: 100 },
     *   { x: 200, y: 200 }
     * ];
     * player.followPath(patrol, 1, true); // Loop at full speed
     * 
     * // Slow walk through waypoints
     * player.followPath(waypoints, 0.25, false);
     * ```
     */
    followPath(waypoints: Array<{ x: number, y: number }>, speedMultiplier: number = 0.5, loop: boolean = false): void {
      const playerSpeed = (this as any).speed;
      // Path follow speed = player base speed * multiplier
      // With speed=4, multiplier=0.5: gives 2 (original default value)
      const speed = playerSpeed * speedMultiplier;
      this.addMovement(new PathFollow(waypoints, speed, loop));
    }

    /**
     * Apply oscillating movement pattern
     * 
     * Creates a back-and-forth movement along the specified axis. The movement
     * oscillates sinusoidally between -amplitude and +amplitude from the starting position.
     * 
     * @param direction - Primary oscillation axis (normalized direction vector)
     * @param amplitude - Maximum distance from center in pixels (default: 50)
     * @param period - Time for a complete cycle in milliseconds (default: 2000)
     * 
     * @example
     * ```ts
     * // Horizontal oscillation
     * player.oscillate({ x: 1, y: 0 }, 100, 3000);
     * 
     * // Diagonal bobbing motion
     * player.oscillate({ x: 1, y: 1 }, 30, 1000);
     * ```
     */
    oscillate(direction: { x: number, y: number }, amplitude: number = 50, period: number = 2000): void {
      this.addMovement(new Oscillate(direction, amplitude, period));
    }

    /**
     * Apply ice movement physics
     * 
     * Simulates slippery surface physics where the entity accelerates gradually
     * and has difficulty stopping. The maximum speed is based on the player's
     * base speed multiplied by a speed factor.
     * 
     * With default speed=4 and factor=1: maxSpeed = 4 (same as original default)
     * 
     * @param direction - Target movement direction `{ x, y }`
     * @param speedFactor - Factor multiplied with base speed for max speed (default: 1.0)
     * 
     * @example
     * ```ts
     * // Normal ice physics
     * player.applyIceMovement({ x: 1, y: 0 });
     * 
     * // Fast ice sliding
     * player.applyIceMovement({ x: 0, y: 1 }, 1.5);
     * ```
     */
    applyIceMovement(direction: { x: number, y: number }, speedFactor: number = 1): void {
      const playerSpeed = (this as any).speed;
      // Max ice speed = player base speed * factor
      // With speed=4, factor=1: gives 4 (original default value)
      const maxSpeed = playerSpeed * speedFactor;
      this.addMovement(new IceMovement(direction, maxSpeed));
    }

    /**
     * Shoot a projectile in the specified direction
     * 
     * Creates a projectile with ballistic trajectory. The speed is calculated
     * from the player's base speed multiplied by a speed factor.
     * 
     * With default speed=4 and factor=50: speed = 200 (same as original default)
     * 
     * @param type - Type of projectile trajectory (`Straight`, `Arc`, or `Bounce`)
     * @param direction - Normalized direction vector `{ x, y }`
     * @param speedFactor - Factor multiplied with base speed (default: 50)
     * 
     * @example
     * ```ts
     * // Straight projectile
     * player.shootProjectile(ProjectileType.Straight, { x: 1, y: 0 });
     * 
     * // Fast arc projectile
     * player.shootProjectile(ProjectileType.Arc, { x: 1, y: -0.5 }, 75);
     * ```
     */
    shootProjectile(type: ProjectileType, direction: { x: number, y: number }, speedFactor: number = 50): void {
      const playerSpeed = (this as any).speed;
      // Projectile speed = player base speed * factor
      // With speed=4, factor=50: gives 200 (original default value)
      const speed = playerSpeed * speedFactor;

      const config = {
        speed,
        direction,
        maxRange: type === ProjectileType.Straight ? 500 : undefined,
        maxHeight: type === ProjectileType.Arc ? 100 : undefined,
        gravity: type !== ProjectileType.Straight ? 400 : undefined,
        maxBounces: type === ProjectileType.Bounce ? 3 : undefined,
        bounciness: type === ProjectileType.Bounce ? 0.6 : undefined
      };

      this.addMovement(new ProjectileMovement(type, config));
    }

    moveRoutes(routes: Routes, options?: MoveRoutesOptions): Promise<boolean> {
      const player = this as unknown as PlayerWithMixins;
      const selfAny = this as any;
      const routeSequence = (selfAny.__moveRouteSequence__ ?? 0) + 1;
      selfAny.__moveRouteSequence__ = routeSequence;

      if (this._finishRoute) {
        this._finishRoute(false);
        this._finishRoute = null;
      }

      // Break any existing route movement
      this.clearMovements();

      return new Promise(async (resolve) => {
        // Store the resolve function for potential breaking
        this._finishRoute = resolve;

        // Process function routes first
        const processedRoutes = await Promise.all(
          routes.map(async (route: MoveRoute) => {
            if (typeof route === 'function') {
              const map = player.getCurrentMap() as any;
              if (!map) {
                return undefined;
              }
              return route.apply(route, [player as unknown as RpgPlayer, map]);
            }
            return route;
          })
        );

        // Flatten nested arrays
        // Note: We keep promises in the routes array and handle them in the strategy
        const definedRoutes = processedRoutes.filter(route => route !== undefined) as Array<string | Direction | Direction[]>;
        const finalRoutes = this.flattenRoutes(definedRoutes);

        if (selfAny.__moveRouteSequence__ !== routeSequence) {
          resolve(false);
          return;
        }

        // Create a movement strategy that handles all routes
        class RouteMovementStrategy implements MovementStrategy {
          private routeIndex = 0;
          private currentTarget: { x: number; y: number } | null = null; // Center position for physics
          private currentTargetTopLeft: { x: number; y: number } | null = null; // Top-left position for player.x() comparison
          private currentDirection: { x: number; y: number } = { x: 0, y: 0 };
          private finished = false;
          private waitingForPromise = false;
          private promiseStartTime = 0;
          private promiseDuration = 0;
          private readonly routes: Routes;
          private readonly player: PlayerWithMixins;
          private readonly onComplete: (success: boolean) => void;
          private readonly tileSize: number;
          private readonly tolerance: number;
          private readonly onStuck?: MoveRoutesOptions['onStuck'];
          private readonly stuckTimeout: number;
          private readonly stuckThreshold: number;
          private remainingDistance = 0;
          private segmentDirection: Direction | null = null;
          private segmentStep = 0;

          // Frequency wait state
          private waitingForFrequency = false;
          private frequencyWaitStartTime = 0;
          private ratioFrequency = 15;

          // Stuck detection state
          private lastPosition: { x: number; y: number } | null = null;
          private lastPositionTime: number = 0;
          private stuckCheckStartTime: number = 0;
          private lastDistanceToTarget: number | null = null;
          private isCurrentlyStuck: boolean = false;
          private stuckCheckInitialized: boolean = false;

          constructor(
            routes: Routes,
            player: PlayerWithMixins,
            onComplete: (success: boolean) => void,
            options?: MoveRoutesOptions
          ) {
            this.routes = routes;
            this.player = player;
            this.onComplete = onComplete;
            this.tileSize = player.nbPixelInTile || 32;
            this.tolerance = 0.5; // Tolerance in pixels for reaching target (reduced for precision)
            this.onStuck = options?.onStuck;
            this.stuckTimeout = options?.stuckTimeout ?? 500; // Default 500ms
            this.stuckThreshold = options?.stuckThreshold ?? 1; // Default 1 pixel
            this.ratioFrequency =
              typeof options?.frequencyRatio === 'number' && options.frequencyRatio >= 0
                ? options.frequencyRatio
                : 15;

            // Process initial route
            this.processNextRoute();
          }

          private debugLog(message: string, data?: any): void {
            // Debug logging disabled - enable if needed for troubleshooting
          }

          private setRouteClamp(entity?: any): void {
            if (!this.currentTargetTopLeft) {
              this.clearRouteClamp(entity);
              return;
            }

            const clamp = {
              targetTopLeft: this.currentTargetTopLeft,
              direction: this.currentDirection,
            };
            (this.player as any).__routeMovementClamp = clamp;
            if (entity) {
              entity.__routeMovementClamp = clamp;
            }
          }

          private clearRouteClamp(entity?: any): void {
            delete (this.player as any).__routeMovementClamp;
            if (entity) {
              delete entity.__routeMovementClamp;
            }
          }

          private processNextRoute(): void {
            this.clearRouteClamp();
            // Reset frequency wait state when processing a new route
            this.waitingForFrequency = false;
            this.frequencyWaitStartTime = 0;
            this.remainingDistance = 0;
            this.segmentDirection = null;
            this.segmentStep = 0;

            // Check if we've completed all routes
            if (this.routeIndex >= this.routes.length) {
              this.debugLog('COMPLETE all routes finished');
              this.finished = true;
              this.clearRouteClamp();
              this.onComplete(true);
              return;
            }

            const currentRoute = this.routes[this.routeIndex];
            this.routeIndex++;

            if (currentRoute === undefined) {
              this.processNextRoute();
              return;
            }

            try {
              // Handle different route types
              if (typeof currentRoute === 'object' && 'then' in currentRoute) {
                // Handle Promise (like Move.wait())
                this.debugLog(`WAIT for promise (route ${this.routeIndex}/${this.routes.length})`);
                this.waitingForPromise = true;
                this.promiseStartTime = Date.now();

                // Try to get duration from promise if possible (for Move.wait())
                // Move.wait() creates a promise that resolves after a delay
                // We'll use a default duration and let the promise resolve naturally
                this.promiseDuration = 1000; // Default 1 second, will be updated when promise resolves

                // Set up promise resolution handler
                (currentRoute as Promise<void>).then(() => {
                  this.debugLog('WAIT promise resolved');
                  this.waitingForPromise = false;
                  this.processNextRoute();
                }).catch(() => {
                  this.debugLog('WAIT promise rejected');
                  this.waitingForPromise = false;
                  this.processNextRoute();
                });
              } else if (typeof currentRoute === 'string' && currentRoute.startsWith('turn-')) {
                // Handle turn commands - just change direction, no movement
                const directionStr = currentRoute.replace('turn-', '');
                let direction: Direction = Direction.Down;

                switch (directionStr) {
                  case 'up':
                  case Direction.Up:
                    direction = Direction.Up;
                    break;
                  case 'down':
                  case Direction.Down:
                    direction = Direction.Down;
                    break;
                  case 'left':
                  case Direction.Left:
                    direction = Direction.Left;
                    break;
                  case 'right':
                  case Direction.Right:
                    direction = Direction.Right;
                    break;
                }

                this.debugLog(`TURN to ${directionStr}`);
                if (this.player.changeDirection) {
                  this.player.changeDirection(direction);
                }
                // Turn is instant, continue immediately
                this.processNextRoute();
              } else if (typeof currentRoute === 'number' || typeof currentRoute === 'string') {
                // Handle Direction enum values (number or string) - calculate target position
                const moveDirection = currentRoute as unknown as Direction;
                const map = this.player.getCurrentMap() as any;
                if (!map) {
                  this.finished = true;
                  this.clearRouteClamp();
                  this.onComplete(false);
                  return;
                }

                // Get current position (top-left from player, which is what player.x() returns)
                // We calculate target based on top-left position to match player.x() expectations
                const currentTopLeftX = typeof this.player.x === 'function' ? this.player.x() : this.player.x;
                const currentTopLeftY = typeof this.player.y === 'function' ? this.player.y() : this.player.y;

                // Get player speed
                let playerSpeed = (this.player as any).speed

                // Use player speed as distance, not tile size
                let distance = playerSpeed;

                // Merge consecutive routes of same direction
                const initialDistance = distance;
                const initialRouteIndex = this.routeIndex;
                while (this.routeIndex < this.routes.length) {
                  const nextRoute = this.routes[this.routeIndex];
                  if (nextRoute === currentRoute) {
                    distance += playerSpeed;
                    this.routeIndex++;
                  } else {
                    break;
                  }
                }

                // Prepare segmented movement (per tile)
                this.remainingDistance = distance;
                this.segmentDirection = moveDirection;
                this.segmentStep = this.getTileStepDistance(playerSpeed);
                this.setNextSegmentTarget(currentTopLeftX, currentTopLeftY);
                
                if (this.currentTargetTopLeft) {
                  this.debugLog(`MOVE direction=${moveDirection} from=(${currentTopLeftX.toFixed(1)}, ${currentTopLeftY.toFixed(1)}) to=(${this.currentTargetTopLeft.x.toFixed(1)}, ${this.currentTargetTopLeft.y.toFixed(1)}) dist=${distance.toFixed(1)}`);
                }
                
                // Reset stuck detection when starting a new movement
                this.lastPosition = null;
                this.isCurrentlyStuck = false;
                this.stuckCheckStartTime = 0;
                this.lastDistanceToTarget = null;
                this.stuckCheckInitialized = false;
                // Reset frequency wait state when starting a new movement
                this.waitingForFrequency = false;
                this.frequencyWaitStartTime = 0;
              } else if (Array.isArray(currentRoute)) {
                // Handle array of directions - insert them into routes
                for (let i = currentRoute.length - 1; i >= 0; i--) {
                  this.routes.splice(this.routeIndex, 0, currentRoute[i]);
                }
                this.processNextRoute();
              } else {
                // Unknown route type, skip
                this.processNextRoute();
              }
            } catch (error) {
              console.warn('Error processing route:', error);
              this.processNextRoute();
            }
          }

          update(body: MovementBody, dt: number): void {
            // Don't process if waiting for promise
            if (this.waitingForPromise) {
              body.setVelocity({ x: 0, y: 0 });
              // Check if promise wait time has elapsed (fallback)
              if (Date.now() - this.promiseStartTime > this.promiseDuration) {
                this.waitingForPromise = false;
                this.processNextRoute();
              }
              return;
            }

            // Don't process if waiting for frequency delay
            if (this.waitingForFrequency) {
              body.setVelocity({ x: 0, y: 0 });
              const playerFrequency = this.player.frequency;
              const frequencyMs = playerFrequency || 0;

              if (frequencyMs > 0 && Date.now() - this.frequencyWaitStartTime >= frequencyMs * this.ratioFrequency) {
                this.waitingForFrequency = false;
                if (this.remainingDistance > 0) {
                  const currentTopLeftX = this.player.x();
                  const currentTopLeftY = this.player.y();
                  this.setNextSegmentTarget(currentTopLeftX, currentTopLeftY);
                } else {
                  this.processNextRoute();
                }
              }
              return;
            }

            // If no target, try to process next route
            if (!this.currentTarget) {
              if (!this.finished) {
                this.processNextRoute();
              }
              if (!this.currentTarget) {
                body.setVelocity({ x: 0, y: 0 });
                // Reset stuck detection when no target
                this.lastPosition = null;
                this.isCurrentlyStuck = false;
                this.lastDistanceToTarget = null;
                this.stuckCheckInitialized = false;
                this.currentTargetTopLeft = null;
                this.clearRouteClamp();
                return;
              }
            }

            const entity = body.getEntity?.();
            if (!entity) {
              this.finished = true;
              this.clearRouteClamp(entity);
              this.onComplete(false);
              return;
            }

            const currentPosition = { x: entity.position.x, y: entity.position.y };
            const currentTime = Date.now();

            // Check distance using player's top-left position (what player.x() returns)
            // This ensures we match the test expectations which compare player.x()
            const currentTopLeftX = this.player.x();
            const currentTopLeftY = this.player.y()
            const currentMap = this.player.getCurrentMap() as any;

            // Calculate direction and distance using top-left position if available
            let dx: number, dy: number, distance: number;
            if (this.currentTargetTopLeft) {
              dx = this.currentTargetTopLeft.x - currentTopLeftX;
              dy = this.currentTargetTopLeft.y - currentTopLeftY;
              distance = Math.hypot(dx, dy);
              const arrivalThreshold = this.getArrivalThreshold(
                currentMap,
                (this.player as any).speed
              );

              // Snap to the target when the physics step overshoots the discrete route distance.
              if (distance <= arrivalThreshold) {
                currentMap?.setBodyPosition?.(this.player.id, this.currentTargetTopLeft.x, this.currentTargetTopLeft.y, "top-left");

                // Target reached, wait for frequency before processing next route
                this.debugLog(`TARGET reached at (${currentTopLeftX.toFixed(1)}, ${currentTopLeftY.toFixed(1)})`);
                this.currentTarget = null;
                this.currentTargetTopLeft = null;
                this.currentDirection = { x: 0, y: 0 };
                this.clearRouteClamp(entity);
                body.setVelocity({ x: 0, y: 0 });
                // Reset stuck detection
                this.lastPosition = null;
                this.isCurrentlyStuck = false;
                this.lastDistanceToTarget = null;
                this.stuckCheckInitialized = false;

                // Wait for frequency before processing next route or segment
                if (!this.finished) {
                  const playerFrequency = this.player.frequency;
                  if (playerFrequency && playerFrequency > 0) {
                    this.waitingForFrequency = true;
                    this.frequencyWaitStartTime = Date.now();
                  } else if (this.remainingDistance > 0) {
                    const nextTopLeftX = this.player.x();
                    const nextTopLeftY = this.player.y();
                    this.setNextSegmentTarget(nextTopLeftX, nextTopLeftY);
                  } else {
                    // No frequency delay, process immediately
                    this.processNextRoute();
                  }
                }
                return;
              }
            } else {
              // Fallback: use center position distance if top-left target not available
              dx = this.currentTarget.x - currentPosition.x;
              dy = this.currentTarget.y - currentPosition.y;
              distance = Math.hypot(dx, dy);
              const arrivalThreshold = this.getArrivalThreshold(
                currentMap,
                (this.player as any).speed
              );

              // Check if we've reached the target (using center position as fallback)
              if (distance <= arrivalThreshold) {
                entity.position.set(this.currentTarget.x, this.currentTarget.y);
                entity.notifyPositionChange?.();

                // Target reached, wait for frequency before processing next route
                this.currentTarget = null;
                this.currentTargetTopLeft = null;
                this.currentDirection = { x: 0, y: 0 };
                this.clearRouteClamp(entity);
                body.setVelocity({ x: 0, y: 0 });
                // Reset stuck detection
                this.lastPosition = null;
                this.isCurrentlyStuck = false;
                this.lastDistanceToTarget = null;
                this.stuckCheckInitialized = false;

                // Wait for frequency before processing next route or segment
                if (!this.finished) {
                  const playerFrequency = player.frequency;
                  if (playerFrequency && playerFrequency > 0) {
                    this.waitingForFrequency = true;
                    this.frequencyWaitStartTime = Date.now();
                  } else if (this.remainingDistance > 0) {
                    const nextTopLeftX = this.player.x();
                    const nextTopLeftY = this.player.y();
                    this.setNextSegmentTarget(nextTopLeftX, nextTopLeftY);
                  } else {
                    // No frequency delay, process immediately
                    this.processNextRoute();
                  }
                }
                return;
              }
            }

            // Stuck detection: check if player is making progress
            if (this.onStuck && this.currentTarget) {
              // Initialize tracking on first update
              if (!this.stuckCheckInitialized) {
                this.lastPosition = { ...currentPosition };
                this.lastDistanceToTarget = distance;
                this.stuckCheckInitialized = true;
                // Update tracking and continue (don't return early)
                this.lastPositionTime = currentTime;
              } else if (this.lastPosition && this.lastDistanceToTarget !== null) {
                // We have a target, so we're trying to move (regardless of current velocity,
                // which may be zero due to physics engine collision handling)
                const positionChanged = Math.hypot(
                  currentPosition.x - this.lastPosition.x,
                  currentPosition.y - this.lastPosition.y
                ) > this.stuckThreshold;

                const distanceImproved = distance < (this.lastDistanceToTarget - this.stuckThreshold);

                // Player is stuck if: not moving AND not getting closer to target
                if (!positionChanged && !distanceImproved) {
                  // Player is not making progress
                  if (!this.isCurrentlyStuck) {
                    // Start stuck timer
                    this.stuckCheckStartTime = currentTime;
                    this.isCurrentlyStuck = true;
                  } else {
                    // Check if stuck timeout has elapsed
                    if (currentTime - this.stuckCheckStartTime >= this.stuckTimeout) {
                      // Player is stuck, call onStuck callback
                      this.debugLog(`STUCK detected at (${currentPosition.x.toFixed(1)}, ${currentPosition.y.toFixed(1)}) target=(${this.currentTarget.x.toFixed(1)}, ${this.currentTarget.y.toFixed(1)})`);
                      const shouldContinue = this.onStuck(
                        this.player as any,
                        this.currentTarget,
                        currentPosition
                      );

                      if (shouldContinue === false) {
                        // Cancel the route
                        this.debugLog('STUCK cancelled route');
                        this.finished = true;
                        this.clearRouteClamp(entity);
                        this.onComplete(false);
                        body.setVelocity({ x: 0, y: 0 });
                        return;
                      }

                      // Continue route: abandon the current target and move on.
                      //
                      // ## Why?
                      // When random movement hits an obstacle, the physics engine can keep the entity
                      // at the same position while this strategy keeps trying to reach the same target,
                      // resulting in an infinite "stuck loop". By dropping the current target here,
                      // we allow the route to advance and (in the common case of `infiniteMoveRoute`)
                      // re-evaluate `Move.tileRandom()` on the next cycle, producing a new direction.
                      this.currentTarget = null;
                      this.currentTargetTopLeft = null;
                      this.currentDirection = { x: 0, y: 0 };
                      this.clearRouteClamp(entity);
                      body.setVelocity({ x: 0, y: 0 });

                      // Reset stuck detection to start fresh on the next target
                      this.isCurrentlyStuck = false;
                      this.stuckCheckStartTime = 0;
                      this.lastPosition = null;
                      this.lastDistanceToTarget = null;
                      this.stuckCheckInitialized = false;

                      // Advance to next route instruction immediately
                      this.processNextRoute();
                      return;
                    }
                  }
                } else {
                  // Player is making progress, reset stuck detection
                  this.isCurrentlyStuck = false;
                  this.stuckCheckStartTime = 0;
                }

                // Update tracking variables
                this.lastPosition = { ...currentPosition };
                this.lastPositionTime = currentTime;
                this.lastDistanceToTarget = distance;
              }
            }

            // Get speed scalar from map (default 50 if not found)
            const map = currentMap;
            const speedScalar = map?.speedScalar ?? 50;

            // Calculate direction and speed
            // Use the distance calculated above (from top-left if available, center otherwise)
            if (distance > 0) {
              this.currentDirection = { x: dx / distance, y: dy / distance };
            } else {
              // If distance is 0 or negative, we've reached or passed the target
              this.currentTarget = null;
              this.currentTargetTopLeft = null;
              this.currentDirection = { x: 0, y: 0 };
              this.clearRouteClamp(entity);
              body.setVelocity({ x: 0, y: 0 });
              if (!this.finished) {
                const playerFrequency = this.player.frequency;
                if (playerFrequency && playerFrequency > 0) {
                  this.waitingForFrequency = true;
                  this.frequencyWaitStartTime = Date.now();
                } else if (this.remainingDistance > 0) {
                  const nextTopLeftX = this.player.x();
                  const nextTopLeftY = this.player.y();
                  this.setNextSegmentTarget(nextTopLeftX, nextTopLeftY);
                } else {
                  // No frequency delay, process immediately
                  this.processNextRoute();
                }
              }
              return;
            }

            // Convert vector direction to cardinal direction (like moveBody does)
            const absX = Math.abs(this.currentDirection.x);
            const absY = Math.abs(this.currentDirection.y);
            let cardinalDirection: Direction;

            if (absX >= absY) {
              cardinalDirection = this.currentDirection.x >= 0 ? Direction.Right : Direction.Left;
            } else {
              cardinalDirection = this.currentDirection.y >= 0 ? Direction.Down : Direction.Up;
            }

            this.setRouteClamp(entity);
            map.movePlayer(this.player as any, cardinalDirection)
          }

          isFinished(): boolean {
            return this.finished;
          }

          onFinished(): void {
            this.clearRouteClamp();
            this.onComplete(true);
          }

          private getTileStepDistance(playerSpeed: number): number {
            if (!Number.isFinite(playerSpeed) || playerSpeed <= 0) {
              return this.tileSize;
            }
            const stepsPerTile = Math.max(1, Math.floor(this.tileSize / playerSpeed));
            return stepsPerTile * playerSpeed;
          }

          private getArrivalThreshold(map: any, playerSpeed: number): number {
            const speed = Number(playerSpeed);
            if (!Number.isFinite(speed) || speed <= 0) {
              return this.tolerance;
            }
            const speedScalar = Number(map?.speedScalar ?? 50);
            const timeStep = Number(map?.physic?.getWorld?.().getTimeStep?.() ?? 1 / 60);
            const physicsStepDistance =
              Number.isFinite(speedScalar) && speedScalar > 0 &&
              Number.isFinite(timeStep) && timeStep > 0
                ? speed * speedScalar * timeStep
                : speed;
            return Math.max(this.tolerance, speed, physicsStepDistance + 2);
          }

          private setNextSegmentTarget(currentTopLeftX: number, currentTopLeftY: number): void {
            if (!this.segmentDirection || this.remainingDistance <= 0) {
              return;
            }

            const map = this.player.getCurrentMap() as any;
            if (!map) {
              this.finished = true;
              this.clearRouteClamp();
              this.onComplete(false);
              return;
            }

            const entity = map.physic.getEntityByUUID(this.player.id);
            if (!entity) {
              this.finished = true;
              this.clearRouteClamp();
              this.onComplete(false);
              return;
            }

            const segmentDistance = Math.min(this.segmentStep || this.remainingDistance, this.remainingDistance);
            let targetTopLeftX = currentTopLeftX;
            let targetTopLeftY = currentTopLeftY;

            switch (this.segmentDirection) {
              case Direction.Right:
              case 'right' as any:
                targetTopLeftX = currentTopLeftX + segmentDistance;
                break;
              case Direction.Left:
              case 'left' as any:
                targetTopLeftX = currentTopLeftX - segmentDistance;
                break;
              case Direction.Down:
              case 'down' as any:
                targetTopLeftY = currentTopLeftY + segmentDistance;
                break;
              case Direction.Up:
              case 'up' as any:
                targetTopLeftY = currentTopLeftY - segmentDistance;
                break;
            }

            const hitbox = this.player.hitbox();
            const hitboxWidth = hitbox?.w ?? 32;
            const hitboxHeight = hitbox?.h ?? 32;

            const targetX = targetTopLeftX + hitboxWidth / 2;
            const targetY = targetTopLeftY + hitboxHeight / 2;

            this.currentTarget = { x: targetX, y: targetY };
            this.currentTargetTopLeft = { x: targetTopLeftX, y: targetTopLeftY };
            this.currentDirection = { x: 0, y: 0 };
            this.remainingDistance -= segmentDistance;
          }
        }

        // Create and add the route movement strategy
        const routeStrategy = new RouteMovementStrategy(
          finalRoutes,
          player,
          (success: boolean) => {
            this._finishRoute = null;
            resolve(success);
          },
          options
        );

        this.addMovement(routeStrategy);
      });
    }

    private flattenRoutes(routes: Routes): Routes {
      return routes.reduce((acc: Routes, item) => {
        if (Array.isArray(item)) {
          return acc.concat(this.flattenRoutes(item));
        }
        return acc.concat(item);
      }, []);
    }

    infiniteMoveRoute(routes: Routes, options?: MoveRoutesOptions): void {
      this._infiniteRoutes = routes;
      this._isInfiniteRouteActive = true;

      const executeInfiniteRoute = (isBreaking: boolean = false) => {
        if (isBreaking || !this._isInfiniteRouteActive) return;

        this.moveRoutes(routes, options).then((completed) => {
          // Only continue if the route completed successfully and we're still active
          if (completed && this._isInfiniteRouteActive) {
            executeInfiniteRoute();
          }
        }).catch((error) => {
          console.warn('Error in infinite route execution:', error);
          // Try to continue even if there was an error
          if (this._isInfiniteRouteActive) {
            setTimeout(() => executeInfiniteRoute(), 100);
          }
        });
      };

      executeInfiniteRoute();
    }

    breakRoutes(force: boolean = false): void {
      this._isInfiniteRouteActive = false;
      delete (this as any).__routeMovementClamp;
      const map = (this as unknown as PlayerWithMixins).getCurrentMap() as any;
      const body = map?.getBody?.((this as unknown as PlayerWithMixins).id) as any;
      if (body) {
        delete body.__routeMovementClamp;
      }

      if (force) {
        // Force stop by clearing all movements immediately
        this.clearMovements();
      }

      // If there's an active route promise, resolve it
      if (this._finishRoute) {
        this._finishRoute(force);
        this._finishRoute = null;
      }
    }

    replayRoutes(): void {
      if (this._infiniteRoutes && !this._isInfiniteRouteActive) {
        this.infiniteMoveRoute(this._infiniteRoutes);
      }
    }
  }

  return WithMoveManagerClass as unknown as PlayerCtor;
}
/**
 * Interface for Move Manager functionality
 * 
 * Provides comprehensive movement management capabilities including target seeking,
 * physics-based movement, route following, and advanced movement strategies.
 * This interface defines the public API of the MoveManager mixin.
 */
export interface IMoveManager {
  /** 
   * Whether the player passes through other players
   * 
   * When `true`, the player can walk through other player entities without collision.
   * This is useful for busy areas where players shouldn't block each other.
   * 
   * @default true
   * 
   * @example
   * ```ts
   * // Disable player-to-player collision
   * player.throughOtherPlayer = true;
   * 
   * // Enable player-to-player collision
   * player.throughOtherPlayer = false;
   * ```
   */
  throughOtherPlayer: boolean;

  /** 
   * Whether the player goes through all characters (players and events)
   * 
   * When `true`, the player can walk through all character entities (both players and events)
   * without collision. Walls and obstacles still block movement.
   * This takes precedence over `throughOtherPlayer` and `throughEvent`.
   * 
   * @default false
   * 
   * @example
   * ```ts
   * // Enable ghost mode - pass through all characters
   * player.through = true;
   * 
   * // Disable ghost mode
   * player.through = false;
   * ```
   */
  through: boolean;

  /** 
   * Whether the player passes through events (NPCs, objects)
   * 
   * When `true`, the player can walk through event entities without collision.
   * This is useful for NPCs that shouldn't block player movement.
   * 
   * @default false
   * 
   * @example
   * ```ts
   * // Allow passing through events
   * player.throughEvent = true;
   * 
   * // Block passage through events
   * player.throughEvent = false;
   * ```
   */
  throughEvent: boolean;

  /** Frequency for movement timing (milliseconds between movements) */
  frequency: number;

  /** Whether direction changes are locked (prevents automatic direction changes) */
  directionFixed: boolean;

  /** Whether animation changes are locked (prevents automatic animation changes) */
  animationFixed: boolean;

  /**
   * Add a custom movement strategy to this entity
   * 
   * Returns a Promise that resolves when the movement completes.
   * 
   * @param strategy - The movement strategy to add
   * @param options - Optional callbacks for movement lifecycle events
   * @returns Promise that resolves when the movement completes
   */
  addMovement(strategy: MovementStrategy, options?: MovementOptions): Promise<void>;

  /**
   * Remove a specific movement strategy from this entity
   * 
   * @param strategy - The strategy instance to remove
   * @returns True if the strategy was found and removed
   */
  removeMovement(strategy: MovementStrategy): boolean;

  /**
   * Remove all active movement strategies from this entity
   */
  clearMovements(): void;

  /**
   * Check if this entity has any active movement strategies
   * 
   * @returns True if entity has active movements
   */
  hasActiveMovements(): boolean;

  /**
   * Get all active movement strategies for this entity
   * 
   * @returns Array of active movement strategies
   */
  getActiveMovements(): MovementStrategy[];

  /**
   * Move toward a target player or position using local obstacle avoidance
   * 
   * @param target - Target player or position to move toward
   */
  moveTo(target: RpgCommonPlayer | { x: number, y: number }): void;

  /**
   * Stop the current moveTo behavior
   */
  stopMoveTo(): void;

  /**
   * Perform a dash movement in the specified direction
   * 
   * The total speed is calculated by adding the player's base speed to the additional speed.
   * Returns a Promise that resolves when the dash completes.
   * 
   * @param direction - Normalized direction vector
   * @param additionalSpeed - Extra speed added on top of base speed (default: 4)
   * @param duration - Duration in milliseconds (default: 200)
   * @param options - Optional callbacks for movement lifecycle events
   * @returns Promise that resolves when the dash completes
   */
  dash(direction: { x: number, y: number }, additionalSpeed?: number, duration?: number, options?: MovementOptions): Promise<void>;

  /**
   * Apply knockback effect in the specified direction
   * 
   * The force is scaled by the player's base speed for consistent behavior.
   * Returns a Promise that resolves when the knockback completes.
   * 
   * @param direction - Normalized direction vector
   * @param force - Force multiplier applied to base speed (default: 5)
   * @param duration - Duration in milliseconds (default: 300)
   * @param options - Optional callbacks for movement lifecycle events
   * @returns Promise that resolves when the knockback completes
   */
  knockback(direction: { x: number, y: number }, force?: number, duration?: number, options?: MovementOptions): Promise<void>;

  /**
   * Follow a sequence of waypoints
   * 
   * Speed is calculated from the player's base speed multiplied by the speedMultiplier.
   * 
   * @param waypoints - Array of x,y positions to follow
   * @param speedMultiplier - Multiplier applied to base speed (default: 0.5)
   * @param loop - Whether to loop back to start (default: false)
   */
  followPath(waypoints: Array<{ x: number, y: number }>, speedMultiplier?: number, loop?: boolean): void;

  /**
   * Apply oscillating movement pattern
   * 
   * @param direction - Primary oscillation axis (normalized)
   * @param amplitude - Maximum distance from center (default: 50)
   * @param period - Time for complete cycle in ms (default: 2000)
   */
  oscillate(direction: { x: number, y: number }, amplitude?: number, period?: number): void;

  /**
   * Apply ice movement physics
   * 
   * Max speed is calculated from the player's base speed multiplied by the speedFactor.
   * 
   * @param direction - Target movement direction
   * @param speedFactor - Factor multiplied with base speed for max speed (default: 1.0)
   */
  applyIceMovement(direction: { x: number, y: number }, speedFactor?: number): void;

  /**
   * Shoot a projectile in the specified direction
   * 
   * Speed is calculated from the player's base speed multiplied by the speedFactor.
   * 
   * @param type - Type of projectile trajectory
   * @param direction - Normalized direction vector
   * @param speedFactor - Factor multiplied with base speed (default: 50)
   */
  shootProjectile(type: ProjectileType, direction: { x: number, y: number }, speedFactor?: number): void;

  /**
   * Give an itinerary to follow using movement strategies
   * 
   * @param routes - Array of movement instructions to execute
   * @param options - Optional configuration including onStuck callback
   * @returns Promise that resolves when all routes are completed
   */
  moveRoutes(routes: Routes, options?: MoveRoutesOptions): Promise<boolean>;

  /**
   * Give a path that repeats itself in a loop to a character
   * 
   * @param routes - Array of movement instructions to repeat infinitely
   */
  infiniteMoveRoute(routes: Routes, options?: MoveRoutesOptions): void;

  /**
   * Stop an infinite movement
   * 
   * @param force - Forces the stop of the infinite movement immediately
   */
  breakRoutes(force?: boolean): void;

  /**
   * Replay an infinite movement
   */
  replayRoutes(): void;
}
