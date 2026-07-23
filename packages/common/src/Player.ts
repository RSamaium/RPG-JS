import { signal } from "@signe/reactive";
import { connected, id, persist, sync, users } from "@signe/sync";
import { Item, Skill } from "./database";
import { Constructor } from "./Utils";
import type { RpgWritableSignal } from "./foundation";

const gameplaySignal = signal as <T>(value: T) => RpgWritableSignal<T>;

const readReactiveValue = (value: any) => {
  if (typeof value === "function" && value.observable) {
    return value();
  }
  return value;
};

const toCloneableSyncValue = (value: any, seen = new WeakSet<object>()): any => {
  const resolved = readReactiveValue(value);

  if (resolved == null || typeof resolved !== "object") {
    return typeof resolved === "function" ? undefined : resolved;
  }
  if (seen.has(resolved)) {
    return undefined;
  }
  seen.add(resolved);

  if (Array.isArray(resolved)) {
    return resolved
      .map((item) => toCloneableSyncValue(item, seen))
      .filter((item) => item !== undefined);
  }

  const output: Record<string, any> = {};
  for (const [key, child] of Object.entries(resolved)) {
    if (
      key.startsWith("$") ||
      key === "_itemInstance" ||
      key === "_subject" ||
      key === "observable" ||
      key === "options"
    ) {
      continue;
    }

    const childValue = toCloneableSyncValue(child, seen);
    if (childValue !== undefined) {
      output[key.startsWith("__") ? key.slice(2) : key] = childValue;
    }
  }
  return output;
};

export enum Control {
  Action = 'action',
  Attack = 'attack',
  Defense = 'defense',
  Skill = 'skill',
  Dash = 'dash',
  Back = 'back',
  Up = 1,
  Down = 3,
  Right = 2,
  Left = 4
}

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
  width?: number;
  /** Height of the shape in pixels */
  height?: number;
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

export class RpgCommonPlayer {
  @id() id: string;
  @sync() _name = gameplaySignal("");
  @sync() type = gameplaySignal("");
  // x and y must be @sync() to ensure initial positions are sent to client
  // The positions represent TOP-LEFT coordinates of the character's hitbox
  // @persist() only persists server-side but doesn't sync to client
  @sync() x = gameplaySignal(0);
  @sync() y = gameplaySignal(0);
  @sync() z = gameplaySignal(0);
  @sync() tint = gameplaySignal("white");
  @sync() direction = gameplaySignal(Direction.Down);
  @sync() _speed = gameplaySignal(4);
  @sync() graphics = gameplaySignal<any>([]);
  @sync() _graphicScale = gameplaySignal<any>(null);
  @sync({
    persist: false
  }) _canMove = gameplaySignal(true);
  @sync() hitbox = gameplaySignal<Hitbox>({
    w: 32,
    h: 32,
  });
  @sync() _gold = gameplaySignal(0);
  @sync() animationName = gameplaySignal("stand");
  @sync() hpSignal = gameplaySignal(0);
  @sync() spSignal = gameplaySignal(0);
  @sync() _exp = gameplaySignal(0);
  @sync() _level = gameplaySignal(1);
  @sync() _class = gameplaySignal<any>({});
  @sync({ classType: Item, transform: toCloneableSyncValue }) items = gameplaySignal<Item[]>([]);
  @sync({ transform: toCloneableSyncValue }) equipments = gameplaySignal<any[]>([]);
  @sync() states = gameplaySignal<any[]>([]);
  @sync(Skill) skills = gameplaySignal<Skill[]>([]);
  @sync() _effects = gameplaySignal<any[]>([]);
  @sync() _through = gameplaySignal(false);
  @sync() _throughOtherPlayer = gameplaySignal(true);
  @sync() _throughEvent = gameplaySignal(false);
  @sync() _pushable = gameplaySignal(false);
  @sync() _frequency = gameplaySignal(0);
  @sync() _frames = gameplaySignal<{ x: number; y: number; ts: number }[]>([]);
  @sync() componentsTop = gameplaySignal<string | null>(null);
  @sync() componentsBottom = gameplaySignal<string | null>(null);
  @sync() componentsCenter = gameplaySignal<string | null>(null);
  @sync() componentsLeft = gameplaySignal<string | null>(null);
  @sync() componentsRight = gameplaySignal<string | null>(null);
  @sync({
    persist: false
  }) _removeTransition = gameplaySignal("");
  @connected() isConnected = gameplaySignal(false)

  // Store intended movement direction (not synced, only used locally)
  private _intendedDirection: Direction | null = null;

  // Direction and animation locking (server-side only, not synced)
  private _directionFixed = signal(false);
  private _animationFixed = signal(false);
  @sync() protected _mass = gameplaySignal(1);

  /**
   * Physical mass used by the server-side physics body.
   */
  get mass(): number {
    return this._mass();
  }

  /**
   * Whether this character can be physically pushed by another character.
   *
   * This is mainly intended for events. Mass controls how hard a pushable body
   * is to move; this flag controls whether gameplay allows pushing at all.
   */
  get pushable(): boolean {
    return this._pushable();
  }

  set pushable(value: boolean) {
    this._pushable.set(!!value);
  }

  get through(): boolean {
    return this._through();
  }

  set through(value: boolean) {
    this._through.set(!!value);
  }

  get throughOtherPlayer(): boolean {
    return this._throughOtherPlayer();
  }

  set throughOtherPlayer(value: boolean) {
    this._throughOtherPlayer.set(!!value);
  }

  get throughEvent(): boolean {
    return this._throughEvent();
  }

  set throughEvent(value: boolean) {
    this._throughEvent.set(!!value);
  }

  /**
   * Get whether direction changes are locked
   * 
   * @returns True if direction is locked and cannot be changed automatically
   * 
   * @example
   * ```ts
   * if (player.directionFixed) {
   *   // Direction is locked, won't change automatically
   * }
   * ```
   */
  get directionFixed(): boolean {
    return this._directionFixed();
  }

  /**
   * Set whether direction changes are locked
   * 
   * When set to true, the player's direction will not change automatically
   * during movement or from physics engine callbacks.
   * 
   * @param value - True to lock direction, false to allow automatic changes
   * 
   * @example
   * ```ts
   * // Lock direction during a special animation
   * player.directionFixed = true;
   * player.setAnimation('attack');
   * // ... later
   * player.directionFixed = false;
   * ```
   */
  set directionFixed(value: boolean) {
    this._directionFixed.set(value);
  }

  /**
   * Get whether animation changes are locked
   * 
   * @returns True if animation is locked and cannot be changed automatically
   * 
   * @example
   * ```ts
   * if (player.animationFixed) {
   *   // Animation is locked, won't change automatically
   * }
   * ```
   */
  get animationFixed(): boolean {
    return this._animationFixed();
  }

  /**
   * Set whether animation changes are locked
   * 
   * When set to true, the player's animation will not change automatically
   * during movement or from physics engine callbacks.
   * 
   * @param value - True to lock animation, false to allow automatic changes
   * 
   * @example
   * ```ts
   * // Lock animation during a special skill
   * player.animationFixed = true;
   * player.setAnimation('skill');
   * // ... later
   * player.animationFixed = false;
   * ```
   */
  set animationFixed(value: boolean) {
    this._animationFixed.set(value);
  }

  pendingInputs: any[] = [];

  /**
   * Player or event display name.
   *
   * The synchronized state is stored internally in `_name`; `name` is exposed as
   * a plain property for v4 compatibility.
   */
  get name(): string {
    return this._name?.() ?? "";
  }

  set name(value: string) {
    this._name.set(value ?? "");
  }

  /**
   * Player movement speed.
   *
   * The synchronized state is stored internally in `_speed`; `speed` is exposed
   * as a plain property for v4 compatibility.
   */
  get speed(): number {
    return this._speed?.() ?? 4;
  }

  set speed(value: number) {
    this._speed.set(value ?? 4);
  }

  /**
   * Whether this player can move.
   *
   * The synchronized state is stored internally in `_canMove`; `canMove` is
   * exposed as a plain property for v4 compatibility.
   */
  get canMove(): boolean {
    return this._canMove?.() ?? true;
  }

  set canMove(value: boolean) {
    this._canMove.set(value ?? true);
  }

  /**
   * Change the player's facing direction
   *
   * Updates the direction the player is facing, which affects animations
   * and directional abilities. This should be called when the player
   * intends to move in a specific direction, not when they are pushed
   * by physics or sliding.
   * 
   * If `directionFixed` is true, this method will not change the direction.
   *
   * @param direction - The new direction to face
   *
   * @example
   * ```ts
   * // Player presses right arrow key
   * player.changeDirection(Direction.Right);
   * 
   * // Lock direction to prevent automatic changes
   * player.directionFixed = true;
   * player.changeDirection(Direction.Up); // This will be ignored
   * ```
   */
  changeDirection(direction: Direction) {
    // Don't change direction if it's locked
    if (this._directionFixed()) {
      return;
    }
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

  isEvent(): boolean {
    return false;
  }
}

export type PlayerCtor<T = RpgCommonPlayer> = Constructor<T>
