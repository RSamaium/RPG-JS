import { PlayerCtor, type Constructor } from "@rpgjs/common";
import { RpgCommonPlayer, Matter, Direction } from "@rpgjs/common";
import { 
  MovementManager, 
  MovementStrategy,
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
  ProjectileType,
  random,
  isFunction,
  capitalize
} from "@rpgjs/common";
import { RpgMap } from "../rooms/map";
import { Observable, Subscription, takeUntil, Subject, tap, switchMap, of, from } from 'rxjs';
import { RpgPlayer } from "./Player";


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




function wait(sec: number) {
  return new Promise((resolve) => {
      setTimeout(resolve, sec * 1000)
  })
}

type CallbackTileMove = (player: RpgPlayer, map) => Direction[]
type CallbackTurnMove = (player: RpgPlayer, map) => string
type Routes = (string | Promise<any> | Direction | Direction[] | Function)[]

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
class MoveList {

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
          const playerSpeed = typeof player.speed === 'function' ? player.speed() : player.speed;
          
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

  wait(sec: number): Promise<unknown> {
      return wait(sec)
  }

  random(repeat: number = 1): Direction[] {
      // Safety check for valid repeat value
      if (!Number.isFinite(repeat) || repeat < 0 || repeat > 10000) {
          console.warn('Invalid repeat value in random:', repeat, 'using default value 1');
          repeat = 1;
      }
      
      // Ensure repeat is an integer
      repeat = Math.floor(repeat);
      
      // Additional safety check - ensure repeat is a safe integer
      if (repeat < 0 || repeat > Number.MAX_SAFE_INTEGER || !Number.isSafeInteger(repeat)) {
          console.warn('Unsafe repeat value in random:', repeat, 'using default value 1');
          repeat = 1;
      }
      
      try {
          return new Array(repeat).fill(null).map(() => [
              Direction.Right,
              Direction.Left,
              Direction.Up,
              Direction.Down
          ][random(0, 3)]);
      } catch (error) {
          console.error('Error creating random array with repeat:', repeat, error);
          return [Direction.Down]; // Return single direction as fallback
      }
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
          // Safety check for valid repeat value
          if (!Number.isFinite(repeat) || repeat < 0 || repeat > 1000) {
              console.warn('Invalid repeat value in tileRandom:', repeat, 'using default value 1');
              repeat = 1;
          }
          
          // Ensure repeat is an integer
          repeat = Math.floor(repeat);
          
          let directions: Direction[] = []
          for (let i = 0; i < repeat; i++) {
              const randFn: CallbackTileMove = [
                  this.tileRight(),
                  this.tileLeft(),
                  this.tileUp(),
                  this.tileDown()
              ][random(0, 3)]
              
              try {
                  const newDirections = randFn(player, map);
                  if (Array.isArray(newDirections)) {
                      directions = [...directions, ...newDirections];
                  }
              } catch (error) {
                  console.warn('Error in tileRandom iteration:', error);
                  // Continue with next iteration instead of breaking
              }
              
              // Safety check to prevent excessive array growth
              if (directions.length > 10000) {
                  console.warn('tileRandom generated too many directions, truncating');
                  break;
              }
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

  private _awayFromPlayer({ isTile, typeMov }: { isTile: boolean, typeMov: string }, otherPlayer: RpgPlayer, repeat: number = 1) {
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

  towardPlayer(player: RpgPlayer, repeat: number = 1) {
      return this._awayFromPlayer({ isTile: false, typeMov: 'toward' }, player, repeat)
  }

  tileTowardPlayer(player: RpgPlayer, repeat: number = 1) {
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
      return [
          this.turnRight(),
          this.turnLeft(),
          this.turnUp(),
          this.turnDown()
      ][random(0, 3)]
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

export interface IMoveManager {
  /** 
  * The player passes through the other players (or vice versa). But the player does not go through the events.
  * 
  * ```ts
  * player.throughOtherPlayer = true
  * ```
  * 
  * @title Go through to other player
  * @prop {boolean} player.throughOtherPlayer
  * @default true
  * @memberof MoveManager
  * */
  throughOtherPlayer: boolean;

  /** 
   * The player goes through the event or the other players (or vice versa)
   * 
   * ```ts
   * player.through = true
   * ```
   * 
   * @title Go through the player
   * @prop {boolean} player.through
   * @default false
   * @memberof MoveManager
   * */
  through: boolean;

  /** 
   * The frequency allows to put a stop time between each movement in the array of the moveRoutes() method.
   * The value represents a dwell time in milliseconds. The higher the value, the slower the frequency.
   * 
   * ```ts
   * player.frequency = 400
   * ```
   * 
   * You can use Frequency enum
   * 
   * ```ts
   * import { Frequency } from '@rpgjs/server'
   * player.frequency = Frequency.Low
   * ```
   * 
   * @title Change Frequency
   * @prop {number} player.frequency
   * @enum {number}
   * 
   * Frequency.Lowest | 600
   * Frequency.Lower | 400
   * Frequency.Low | 200
   * Frequency.High | 100
   * Frequency.Higher | 50
   * Frequency.Highest | 25
   * Frequency.None | 0
   * @default 0
   * @memberof MoveManager
   * */
  frequency: number;

  /**
   * Add a custom movement strategy to this entity
   * 
   * Allows adding any custom MovementStrategy implementation.
   * Multiple strategies can be active simultaneously.
   * 
   * @param strategy - The movement strategy to add
   * 
   * @example
   * ```ts
   * // Add custom movement
   * const customMove = new LinearMove(5, 0, 1000);
   * player.addMovement(customMove);
   * 
   * // Add multiple movements
   * player.addMovement(new Dash(8, { x: 1, y: 0 }, 200));
   * player.addMovement(new Oscillate({ x: 0, y: 1 }, 10, 1000));
   * ```
   */
  addMovement(strategy: MovementStrategy): void;

  /**
   * Remove a specific movement strategy from this entity
   * 
   * @param strategy - The strategy instance to remove
   * @returns True if the strategy was found and removed
   * 
   * @example
   * ```ts
   * const dashMove = new Dash(8, { x: 1, y: 0 }, 200);
   * player.addMovement(dashMove);
   * 
   * // Later, remove the specific movement
   * const removed = player.removeMovement(dashMove);
   * console.log('Movement removed:', removed);
   * ```
   */
  removeMovement(strategy: MovementStrategy): boolean;

  /**
   * Remove all active movement strategies from this entity
   * 
   * Stops all current movements immediately.
   * 
   * @example
   * ```ts
   * // Stop all movements when player dies
   * player.clearMovements();
   * 
   * // Clear movements before applying new ones
   * player.clearMovements();
   * player.dash({ x: 1, y: 0 });
   * ```
   */
  clearMovements(): void;

  /**
   * Check if this entity has any active movement strategies
   * 
   * @returns True if entity has active movements
   * 
   * @example
   * ```ts
   * // Don't accept input while movements are active
   * if (!player.hasActiveMovements()) {
   *   player.dash(inputDirection);
   * }
   * 
   * // Check before adding new movement
   * if (player.hasActiveMovements()) {
   *   player.clearMovements();
   * }
   * ```
   */
  hasActiveMovements(): boolean;

  /**
   * Get all active movement strategies for this entity
   * 
   * @returns Array of active movement strategies
   * 
   * @example
   * ```ts
   * // Check what movements are currently active
   * const movements = player.getActiveMovements();
   * console.log(`Player has ${movements.length} active movements`);
   * 
   * // Find specific movement type
   * const hasDash = movements.some(m => m instanceof Dash);
   * ```
   */
  getActiveMovements(): MovementStrategy[];

  /**
   * Move toward a target player or position using AI pathfinding
   * 
   * Uses SeekAvoid strategy for intelligent pathfinding with obstacle avoidance.
   * The entity will seek toward the target while avoiding obstacles.
   * 
   * @param target - Target player or position to move toward
   * 
   * @example
   * ```ts
   * // Move toward another player
   * const targetPlayer = game.getPlayer('player2');
   * player.moveTo(targetPlayer);
   * 
   * // Move toward a specific position
   * player.moveTo({ x: 300, y: 200 });
   * 
   * // Stop the movement later
   * player.stopMoveTo();
   * ```
   */
  moveTo(target: RpgCommonPlayer | { x: number, y: number }): void;

  /**
   * Stop the current moveTo behavior
   * 
   * Removes any active SeekAvoid strategies.
   * 
   * @example
   * ```ts
   * // Start following a target
   * player.moveTo(targetPlayer);
   * 
   * // Stop following when target is reached
   * if (distanceToTarget < 10) {
   *   player.stopMoveTo();
   * }
   * ```
   */
  stopMoveTo(): void;

  /**
   * Perform a dash movement in the specified direction
   * 
   * Applies high-speed movement for a short duration.
   * 
   * @param direction - Normalized direction vector
   * @param speed - Movement speed (default: 8)
   * @param duration - Duration in milliseconds (default: 200)
   * 
   * @example
   * ```ts
   * // Dash right
   * player.dash({ x: 1, y: 0 });
   * 
   * // Dash diagonally with custom speed and duration
   * player.dash({ x: 0.7, y: 0.7 }, 12, 300);
   * 
   * // Dash in input direction
   * player.dash(inputDirection, 10, 150);
   * ```
   */
  dash(direction: { x: number, y: number }, speed?: number, duration?: number): void;

  /**
   * Apply knockback effect in the specified direction
   * 
   * Creates a push effect that gradually decreases over time.
   * 
   * @param direction - Normalized direction vector
   * @param force - Initial knockback force (default: 5)
   * @param duration - Duration in milliseconds (default: 300)
   * 
   * @example
   * ```ts
   * // Knockback from explosion
   * const explosionDir = { x: -1, y: 0 };
   * player.knockback(explosionDir, 8, 400);
   * 
   * // Light knockback from attack
   * player.knockback(attackDirection, 3, 200);
   * ```
   */
  knockback(direction: { x: number, y: number }, force?: number, duration?: number): void;

  /**
   * Follow a sequence of waypoints
   * 
   * Entity will move through each waypoint in order.
   * 
   * @param waypoints - Array of x,y positions to follow
   * @param speed - Movement speed (default: 2)
   * @param loop - Whether to loop back to start (default: false)
   * 
   * @example
   * ```ts
   * // Create a patrol route
   * const patrolPoints = [
   *   { x: 100, y: 100 },
   *   { x: 300, y: 100 },
   *   { x: 300, y: 300 },
   *   { x: 100, y: 300 }
   * ];
   * player.followPath(patrolPoints, 3, true);
   * 
   * // One-time path to destination
   * player.followPath([{ x: 500, y: 200 }], 4);
   * ```
   */
  followPath(waypoints: Array<{ x: number, y: number }>, speed?: number, loop?: boolean): void;

  /**
   * Apply oscillating movement pattern
   * 
   * Entity moves back and forth along the specified axis.
   * 
   * @param direction - Primary oscillation axis (normalized)
   * @param amplitude - Maximum distance from center (default: 50)
   * @param period - Time for complete cycle in ms (default: 2000)
   * 
   * @example
   * ```ts
   * // Horizontal oscillation
   * player.oscillate({ x: 1, y: 0 }, 100, 3000);
   * 
   * // Vertical oscillation
   * player.oscillate({ x: 0, y: 1 }, 30, 1500);
   * 
   * // Diagonal oscillation
   * player.oscillate({ x: 0.7, y: 0.7 }, 75, 2500);
   * ```
   */
  oscillate(direction: { x: number, y: number }, amplitude?: number, period?: number): void;

  /**
   * Apply ice movement physics
   * 
   * Creates slippery movement with gradual acceleration and inertia.
   * Perfect for ice terrains or slippery surfaces.
   * 
   * @param direction - Target movement direction
   * @param maxSpeed - Maximum speed when fully accelerated (default: 4)
   * 
   * @example
   * ```ts
   * // Apply ice physics when on ice terrain
   * if (onIceTerrain) {
   *   player.applyIceMovement(inputDirection, 5);
   * }
   * 
   * // Update direction when input changes
   * iceMovement.setTargetDirection(newDirection);
   * ```
   */
  applyIceMovement(direction: { x: number, y: number }, maxSpeed?: number): void;

  /**
   * Shoot a projectile in the specified direction
   * 
   * Creates projectile movement with various trajectory types.
   * 
   * @param type - Type of projectile trajectory
   * @param direction - Normalized direction vector
   * @param speed - Projectile speed (default: 200)
   * 
   * @example
   * ```ts
   * // Shoot arrow
   * player.shootProjectile(ProjectileType.Straight, { x: 1, y: 0 }, 300);
   * 
   * // Throw grenade with arc
   * player.shootProjectile(ProjectileType.Arc, { x: 0.7, y: 0.7 }, 150);
   * 
   * // Bouncing projectile
   * player.shootProjectile(ProjectileType.Bounce, { x: 1, y: 0 }, 100);
   * ```
   */
  shootProjectile(type: ProjectileType, direction: { x: number, y: number }, speed?: number): void;

  /**
   * Give an itinerary to follow using movement strategies
   * 
   * Executes a sequence of movements and actions in order. Each route can be:
   * - A Direction enum value for basic movement
   * - A string starting with "turn-" for direction changes
   * - A function that returns directions or actions
   * - A Promise for async operations
   * 
   * The method processes routes sequentially, respecting the entity's frequency
   * setting for timing between movements.
   * 
   * @param routes - Array of movement instructions to execute
   * @returns Promise that resolves when all routes are completed
   * 
   * @example
   * ```ts
   * // Basic directional movements
   * await player.moveRoutes([
   *   Direction.Right,
   *   Direction.Up,
   *   Direction.Left
   * ]);
   * 
   * // Mix of movements and turns
   * await player.moveRoutes([
   *   Direction.Right,
   *   'turn-' + Direction.Up,
   *   Direction.Up
   * ]);
   * 
   * // Using functions for dynamic behavior
   * const customMove = (player, map) => [Direction.Right, Direction.Down];
   * await player.moveRoutes([customMove]);
   * 
   * // With async operations
   * await player.moveRoutes([
   *   Direction.Right,
   *   new Promise(resolve => setTimeout(resolve, 1000)), // Wait 1 second
   *   Direction.Left
   * ]);
   * ```
   */
  moveRoutes(routes: Routes): Promise<boolean>;

  /**
   * Give a path that repeats itself in a loop to a character
   * 
   * Creates an infinite movement pattern that continues until manually stopped.
   * The routes will repeat in a continuous loop, making it perfect for patrol
   * patterns, ambient movements, or any repetitive behavior.
   * 
   * You can stop the movement at any time with `breakRoutes()` and replay it 
   * with `replayRoutes()`.
   * 
   * @param routes - Array of movement instructions to repeat infinitely
   * 
   * @example
   * ```ts
   * // Create an infinite random movement pattern
   * player.infiniteMoveRoute([Move.random()]);
   * 
   * // Create a patrol route
   * player.infiniteMoveRoute([
   *   Direction.Right,
   *   Direction.Right,
   *   Direction.Down,
   *   Direction.Left,
   *   Direction.Left,
   *   Direction.Up
   * ]);
   * 
   * // Mix movements and rotations
   * player.infiniteMoveRoute([
   *   Move.turnRight(),
   *   Direction.Right,
   *   Move.wait(1),
   *   Move.turnLeft(),
   *   Direction.Left
   * ]);
   * ```
   */
  infiniteMoveRoute(routes: Routes): void;

  /**
   * Stop an infinite movement
   * 
   * Works only for infinite movements created with `infiniteMoveRoute()`.
   * This method stops the current route execution and prevents the next
   * iteration from starting.
   * 
   * @param force - Forces the stop of the infinite movement immediately
   * 
   * @example
   * ```ts
   * // Start infinite movement
   * player.infiniteMoveRoute([Move.random()]);
   * 
   * // Stop it when player enters combat
   * if (inCombat) {
   *   player.breakRoutes(true);
   * }
   * 
   * // Gentle stop (completes current route first)
   * player.breakRoutes();
   * ```
   */
  breakRoutes(force?: boolean): void;

  /**
   * Replay an infinite movement
   * 
   * Works only for infinite movements that were previously created with 
   * `infiniteMoveRoute()`. If the route was stopped with `breakRoutes()`, 
   * you can restart it with this method using the same route configuration.
   * 
   * @example
   * ```ts
   * // Create infinite movement
   * player.infiniteMoveRoute([Move.random()]);
   * 
   * // Stop it temporarily
   * player.breakRoutes(true);
   * 
   * // Resume the same movement pattern
   * player.replayRoutes();
   * 
   * // Stop and start with different conditions
   * if (playerNearby) {
   *   player.breakRoutes();
   * } else {
   *   player.replayRoutes();
   * }
   * ```
   */
  replayRoutes(): void;

  // Deprecated methods kept for backward compatibility
  infiniteRoute(routes: Routes): void;
  finishRoute(finish: boolean): void;
  isInfiniteRouteActive(): boolean;
}

export function WithMoveManager<TBase extends PlayerCtor>(Base: TBase): new (...args: ConstructorParameters<TBase>) => InstanceType<TBase> & IMoveManager {
  return class extends Base {
    
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

    set frequency(value: number) {
      this._frequency.set(value);
    }

    get frequency(): number {
      return this._frequency();
    }
    
    addMovement(strategy: MovementStrategy): void {
      const map = (this as unknown as PlayerWithMixins).getCurrentMap();
      if (!map) return;
      
      map.moveManager.add((this as unknown as PlayerWithMixins).id, strategy);
    }

    removeMovement(strategy: MovementStrategy): boolean {
      const map = (this as unknown as PlayerWithMixins).getCurrentMap();
      if (!map) return false;
      
      return map.moveManager.remove((this as unknown as PlayerWithMixins).id, strategy);
    }

    clearMovements(): void {
      const map = (this as unknown as PlayerWithMixins).getCurrentMap();
      if (!map) return;
      
      map.moveManager.clear((this as unknown as PlayerWithMixins).id);
    }

    hasActiveMovements(): boolean {
      const map = (this as unknown as PlayerWithMixins).getCurrentMap();
      if (!map) return false;
      
      return map.moveManager.hasActiveStrategies((this as unknown as PlayerWithMixins).id);
    }

    getActiveMovements(): MovementStrategy[] {
      const map = (this as unknown as PlayerWithMixins).getCurrentMap();
      if (!map) return [];
      
      return map.moveManager.getStrategies((this as unknown as PlayerWithMixins).id);
    }

    moveTo(target: RpgCommonPlayer | { x: number, y: number }): void {
      const map = (this as unknown as PlayerWithMixins).getCurrentMap();
      if (!map) return;
      
      let targetBody: Matter.Body | null = null;
      
      if ('id' in target) {
        // Target is a player
        targetBody = map.physic.getBody(target.id);
      } else {
        // Target is a position - create a temporary target function
        const getTargetPos = () => Matter.Vector.create(target.x, target.y);
        map.moveManager.add(
          (this as unknown as PlayerWithMixins).id, 
          new SeekAvoid(map.physic, getTargetPos, 3, 50, 5)
        );
        return;
      }
      
      if (targetBody) {
        map.moveManager.add(
          (this as unknown as PlayerWithMixins).id, 
          new SeekAvoid(map.physic, targetBody, 3, 50, 5)
        );
      }
    }

    stopMoveTo(): void {
      const map = (this as unknown as PlayerWithMixins).getCurrentMap();
      if (!map) return;
      
      const strategies = this.getActiveMovements();
      strategies.forEach(strategy => {
        if (strategy instanceof SeekAvoid || strategy instanceof LinearRepulsion) {
          this.removeMovement(strategy);
        }
      });
    }

    dash(direction: { x: number, y: number }, speed: number = 8, duration: number = 200): void {
      this.addMovement(new Dash(speed, direction, duration));
    }

    knockback(direction: { x: number, y: number }, force: number = 5, duration: number = 300): void {
      this.addMovement(new Knockback(direction, force, duration));
    }

    followPath(waypoints: Array<{ x: number, y: number }>, speed: number = 2, loop: boolean = false): void {
      this.addMovement(new PathFollow(waypoints, speed, loop));
    }

    oscillate(direction: { x: number, y: number }, amplitude: number = 50, period: number = 2000): void {
      this.addMovement(new Oscillate(direction, amplitude, period));
    }

    applyIceMovement(direction: { x: number, y: number }, maxSpeed: number = 4): void {
      this.addMovement(new IceMovement(direction, maxSpeed));
    }

    shootProjectile(type: ProjectileType, direction: { x: number, y: number }, speed: number = 200): void {
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

    moveRoutes(routes: Routes): Promise<boolean> {
      let count = 0;
      let frequence = 0;
      const player = this as unknown as PlayerWithMixins;
      
      // Break any existing route movement
      this.clearMovements();
      
      return new Promise(async (resolve) => {
        // Store the resolve function for potential breaking
        this._finishRoute = resolve;
        
        // Process function routes first
        const processedRoutes = routes.map((route: any) => {
          if (typeof route === 'function') {
            const map = player.getCurrentMap();
            if (!map) {
              return undefined;
            }
            return route.apply(route, [player, map]);
          }
          return route;
        });
        
        // Flatten nested arrays
        const flatRoutes = this.flattenRoutes(processedRoutes);
        let routeIndex = 0;
        
        const executeNextRoute = async (): Promise<void> => {
          // Check if player still exists and is on a map
          if (!player || !player.getCurrentMap()) {
            this._finishRoute = null;
            resolve(false);
            return;
          }
          
          // Handle frequency timing
          if (count >= (player.nbPixelInTile || 32)) {
            if (frequence < (player.frequency || 0)) {
              frequence++;
              setTimeout(executeNextRoute, 16); // ~60fps timing
              return;
            }
          }
          
          frequence = 0;
          count++;
          
          // Check if we've completed all routes
          if (routeIndex >= flatRoutes.length) {
            this._finishRoute = null;
            resolve(true);
            return;
          }
          
          const currentRoute = flatRoutes[routeIndex];
          routeIndex++;
          
          if (currentRoute === undefined) {
            executeNextRoute();
            return;
          }
          
          try {
            // Handle different route types
            if (typeof currentRoute === 'object' && 'then' in currentRoute) {
              // Handle Promise
              await currentRoute;
              executeNextRoute();
            } else if (typeof currentRoute === 'string' && currentRoute.startsWith('turn-')) {
              // Handle turn commands
              const directionStr = currentRoute.replace('turn-', '');
              let direction: Direction = Direction.Down;
              
              // Convert string direction to Direction enum
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
              
              if (player.changeDirection) {
                player.changeDirection(direction);
              }
              executeNextRoute();
            } else if (typeof currentRoute === 'number') {
              // Handle Direction enum values
              if (player.moveByDirection) {
                await player.moveByDirection(currentRoute as unknown as Direction, 1);
              } else {
                // Fallback to movement strategy - use direction as velocity components
                let vx = 0, vy = 0;
                const direction = currentRoute as unknown as Direction;
                switch (direction) {
                  case Direction.Right: vx = 1; break;
                  case Direction.Left: vx = -1; break;
                  case Direction.Down: vy = 1; break;
                  case Direction.Up: vy = -1; break;
                }
                this.addMovement(new LinearMove(vx * (player.speed?.() || 3), vy * (player.speed?.() || 3), 100));
                setTimeout(executeNextRoute, 100);
                return;
              }
              executeNextRoute();
            } else {
              // Unknown route type, skip
              executeNextRoute();
            }
          } catch (error) {
            console.warn('Error executing route:', error);
            executeNextRoute();
          }
        };
        
        executeNextRoute();
      });
    }
    
    flattenRoutes(routes: any[]): any[] {
      const result: any[] = [];
      
      for (const route of routes) {
        if (Array.isArray(route)) {
          result.push(...this.flattenRoutes(route));
        } else {
          result.push(route);
        }
      }
      
      return result;
    }

    infiniteMoveRoute(routes: Routes): void {
      this._infiniteRoutes = routes;
      this._isInfiniteRouteActive = true;

      const executeInfiniteRoute = (isBreaking: boolean = false) => {
        if (isBreaking || !this._isInfiniteRouteActive) return;
        
        this.moveRoutes(routes).then((completed) => {
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
  } as unknown as any;
}