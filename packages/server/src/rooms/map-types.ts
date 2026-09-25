import type { RpgActionInput, RpgShape } from "@rpgjs/common";
import type { EventMode } from "../decorators/event";
import type { RpgEvent, RpgPlayer } from "../Player/Player";
import type { RpgMap } from "./map";

/**
 * Interface for input controls configuration
 * 
 * Defines the structure for input validation and anti-cheat controls
 */
export interface Controls {
  /** Maximum allowed time delta between inputs in milliseconds */
  maxTimeDelta?: number;
  /** Maximum allowed frame delta between inputs */
  maxFrameDelta?: number;
  /** Minimum time between inputs in milliseconds */
  minTimeBetweenInputs?: number;
  /** Whether to enable anti-cheat validation */
  enableAntiCheat?: boolean;
  /** Maximum number of queued inputs processed per server tick */
  maxInputsPerTick?: number;
}

/**
 * Interface representing hook methods available for map events
 * 
 * These hooks are triggered at specific moments during the event lifecycle.
 *
 * `onInit()` is intended for base event setup when the event instance is created.
 * At this stage, the event is not reacting to a specific player yet.
 *
 * `onChanges(player)` is reactive. It is called during the change-detection cycle,
 * for example after player state changes such as variable updates or when
 * `player.syncChanges()` is executed manually.
 */
export interface EventHooks {
  /**
   * Called when the event is first initialized.
   *
   * Use this hook for default setup that does not depend on a player interaction,
   * such as setting the initial graphic, speed, or movement route.
   */
  onInit?: (this: RpgEvent) => void;
  /**
   * Called during the change-detection cycle for the current player.
   *
   * Use this hook to recompute the event state from player data, especially
   * player variables. This is useful for reactive visuals such as an opened
   * chest, a hidden door, or a conditional NPC graphic.
   */
  onChanges?: (this: RpgEvent, player: RpgPlayer) => void;
  /** Called when a player performs an action on this event */
  onAction?: (this: RpgEvent, player: RpgPlayer, input: RpgActionInput<unknown>) => void | Promise<void>;
  /** Called when a player touches this event */
  onPlayerTouch?: (this: RpgEvent, player: RpgPlayer) => void;
  /** Called when this event starts touching a player or another event */
  onTouch?: (this: RpgEvent, other: RpgPlayer | RpgEvent, context: RpgTouchContext) => void | Promise<void>;
  /** Called when this event stops touching a player or another event */
  onTouchEnd?: (this: RpgEvent, other: RpgPlayer | RpgEvent, context: RpgTouchContext) => void | Promise<void>;
  /** Called when a player enters a shape attached to the event */
  onInShape?: (this: RpgEvent, zone: RpgShape, player: RpgPlayer) => void;
  /** Called when a player exits a shape attached to the event */
  onOutShape?: (this: RpgEvent, zone: RpgShape, player: RpgPlayer) => void;
  /** Called when a player is detected entering a detection shape attached to the event */
  onDetectInShape?: (this: RpgEvent, player: RpgPlayer, shape: RpgShape) => void;
  /** Called when a player is detected exiting a detection shape attached to the event */
  onDetectOutShape?: (this: RpgEvent, player: RpgPlayer, shape: RpgShape) => void;
}

export interface RpgTouchContext {
  self: RpgEvent;
  other: RpgPlayer | RpgEvent;
  otherType: "player" | "event";
  player?: RpgPlayer;
  phase: "start" | "end";
  pairId: string;
  map: RpgMap;
}

/** Type for event class constructor */
export type EventConstructor = new () => RpgEvent;

/**
 * Object-based event definition.
 *
 * Coordinates belong to the surrounding map event wrapper, not the event definition itself.
 */
export type EventDefinition = EventHooks & {
  /** Optional display name copied to the runtime event instance */
  name?: string;
  /** Shared or scenario event mode */
  mode?: EventMode | "shared" | "scenario";
  /** Whether players can physically push this event. `false` by default. */
  pushable?: boolean;
  /** Physical mass used when the event is pushable. `0` or `Infinity` makes it immovable. */
  mass?: number;
  /** Allow custom event metadata while keeping placement fields typed separately */
  [key: string]: unknown;
  /** Disallow placement fields on the event definition itself */
  id?: never;
  event?: never;
  x?: never;
  y?: never;
  scenarioOwnerId?: never;
};

/** Public event definition type accepted by map events and dynamic event creation */
export type MapEventDefinition = EventConstructor | EventDefinition;

/** Options for positioning and defining an event on the map */
export type EventPosOption = {
  /** ID of the event */
  id?: string,

  /** X position of the event on the map */
  x?: number,
  /** Y position of the event on the map */
  y?: number,
  /** Event mode override */
  mode?: EventMode | "shared" | "scenario",
  /** Owner player id when mode is scenario */
  scenarioOwnerId?: string,
  /** Initial event hitbox in RPGJS pixels */
  hitbox?: { width?: number; height?: number; w?: number; h?: number },
  /** 
   * Event definition - can be either:
   * - A class that extends RpgEvent
   * - An object with hook methods
   */
  event: MapEventDefinition
}

/** Public placed map event type */
export type MapEventPlacement = EventPosOption;

export type CreateDynamicEventOptions = {
  mode?: EventMode | "shared" | "scenario";
  scenarioOwnerId?: string;
};

export interface WeatherSetOptions {
  sync?: boolean;
}

export interface LightingSetOptions {
  sync?: boolean;
  cancelTransition?: boolean;
}

/**
 * Stable connection surface passed to RPGJS room lifecycle methods.
 *
 * The room runtime owns the connection. Game code may send data, close the
 * socket, or replace its application state without depending on a transport
 * implementation.
 */
export interface RpgRoomConnection<TState = unknown> {
  /** Stable public connection identifier. */
  readonly id: string;
  /** Private session identifier retained by supported reconnection flows. */
  readonly sessionId?: string;
  /** Current application-owned state. Use `setState()` to replace it. */
  readonly state: Readonly<TState> | null;
  /** Replace the application-owned connection state. */
  setState(
    state: TState | ((previous: Readonly<TState> | null) => TState) | null,
  ): Readonly<TState> | null;
  /** Send data to this connection. */
  send(data: string | ArrayBuffer | ArrayBufferView): void;
  /** Close this connection. */
  close(code?: number, reason?: string): void;
}
