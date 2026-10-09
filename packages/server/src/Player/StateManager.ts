import { isInstanceOf, isString, PlayerCtor, type RpgWritableSignal } from "@rpgjs/common";
import { signal } from "@signe/reactive";
import { ItemLog, StateLog } from "../logs";
import { persist } from "@signe/sync";
import { RpgPlayer } from "./Player";

interface StateManagerDependencies {
  equipments(): any[];
  databaseById(id: string | StateClass): any;
  addState(stateClass: StateClass | string, chance?: number): object | null;
  removeState(stateClass: StateClass | string, chance?: number): void;
}



export interface StateData {
  id?: string;
  name?: string;
  addStates?: StateApplication[];
  removeStates?: StateApplication[];
  [key: string]: unknown;
}

export type StateClass = { new (): StateData };
export type StateInput = StateClass | StateData | string;
export interface StateApplication { state: StateClass | string; rate: number }
export interface StateEfficiency { state: StateInput; rate: number }

/**
 * State Manager Mixin
 * 
 * Provides state management capabilities to any class. This mixin handles
 * player states (buffs/debuffs), state defense from equipment, and state
 * efficiency modifiers. It manages the complete state system including
 * application, removal, and resistance mechanics.
 * 
 * @param Base - The base class to extend with state management
 * @returns Extended class with state management methods
 * 
 * @example
 * ```ts
 * class MyPlayer extends WithStateManager(BasePlayer) {
 *   constructor() {
 *     super();
 *     // State system is automatically initialized
 *   }
 * }
 * 
 * const player = new MyPlayer();
 * player.addState(Paralyze);
 * console.log(player.getState(Paralyze));
 * ```
 */
export function WithStateManager<TBase extends PlayerCtor>(Base: TBase) {
  return class extends Base {
    _statesEfficiency = signal<StateEfficiency[]>([]) as unknown as RpgWritableSignal<StateEfficiency[]>;

    private _getStateMap(required: boolean = true) {
      // Use this.map directly to support both RpgMap and LobbyRoom
      const map = (this as any).getCurrentMap?.() || (this as any).map;
      if (required && (!map || !map.database)) {
        throw new Error('Player must be on a map to resolve states');
      }
      return map;
    }

    private _resolveStateInput(
      stateInput: StateClass | string,
      databaseByIdOverride?: (id: string) => any
    ) {
      if (typeof stateInput === "string") {
        if (databaseByIdOverride) {
          return databaseByIdOverride(stateInput);
        }
        return (this as any).databaseById(stateInput);
      }
      return stateInput;
    }

    private _createStateInstance(stateClass: StateClass) {
      return new (stateClass as StateClass)();
    }

    /**
     * Create a state instance without side effects.
     */
    createStateInstance(stateInput: StateClass | string) {
      const stateClass = this._resolveStateInput(stateInput);
      const instance = this._createStateInstance(stateClass as StateClass);
      return { stateClass, instance };
    }

    /**
     * Resolve state snapshot entries into state instances without side effects.
     */
    resolveStatesSnapshot(snapshot: { states?: any[] }, mapOverride?: any) {
      if (!snapshot || !Array.isArray(snapshot.states)) {
        return snapshot;
      }

      const map = mapOverride ?? this._getStateMap(false);
      if (!map || !map.database) {
        return snapshot;
      }

      const databaseByIdOverride = (id: string) => {
        const data = map.database()[id];
        if (!data) {
          throw new Error(
            `The ID=${id} data is not found in the database. Add the data in the property "database"`
          );
        }
        return data;
      };

      const states = snapshot.states.map((entry: any) => {
        const stateId = isString(entry) ? entry : entry?.id;
        if (!stateId) {
          return entry;
        }
        const stateClass = this._resolveStateInput(stateId, databaseByIdOverride);
        return this._createStateInstance(stateClass as StateClass);
      });

      return { ...snapshot, states };
    }

    get statesDefense(): StateEfficiency[] {
      return (this as any).getFeature("statesDefense", "state");
    }

    get statesEfficiency() {
      return this._statesEfficiency;
    }

    set statesEfficiency(val) {
      this._statesEfficiency = val;
    }

    applyStates(
      player: RpgPlayer,
      { addStates, removeStates }: { addStates?: StateApplication[]; removeStates?: StateApplication[] }
    ): void {
      if (addStates) {
        for (let { state, rate } of addStates) {
          (player as any).addState(state, rate);
        }
      }
      if (removeStates) {
        for (let { state, rate } of removeStates) {
          (player as any).removeState(state, rate);
        }
      }
    }

    getState(stateClass: StateClass | string): StateData | undefined {
      if (isString(stateClass)) stateClass = (this as any).databaseById(stateClass);
      return this.states().find((state) => {
        if (isString(stateClass)) {
          return state.id == stateClass;
        }
        return isInstanceOf(state, stateClass);
      });
    }

    addState(stateClass: StateClass | string, chance = 1): object | null {
      const state = this.getState(stateClass);
      if (isString(stateClass)) {
        stateClass = (this as any).databaseById(stateClass);
      }
      if (!state) {
        if (Math.random() > chance) {
          throw StateLog.addFailed(stateClass);
        }
        //const efficiency = this.findStateEfficiency(stateClass)
        const instance = this._createStateInstance(stateClass as StateClass);
        this.states().push(instance);
        this.applyStates(<any>this, instance);
        return instance;
      }
      return null;
    }

    removeState(stateClass: StateClass | string, chance = 1) {
      const index = this.states().findIndex((state) => {
        if (isString(stateClass)) {
          return state.id == stateClass;
        }
        return isInstanceOf(state, stateClass);
      });
      if (index != -1) {
        if (Math.random() > chance) {
          throw StateLog.removeFailed(stateClass);
        }
        this.states().splice(index, 1);
      } else {
        throw StateLog.notApplied(stateClass);
      }
    }

    findStateEfficiency(stateClass: StateClass): StateEfficiency | undefined {
      return this.statesEfficiency().find((state) =>
        isInstanceOf(state.state, stateClass)
      );
    }
  } as unknown as TBase;
}

/**
 * Interface for State Manager functionality
 * 
 * Provides state management capabilities including state defense, efficiency modifiers,
 * and state application/removal. This interface defines the public API of the StateManager mixin.
 */
export interface IStateManager {
  /**
   * Gets the defensive capabilities against various states from equipped items
   * 
   * @returns Array of state defense objects with rate and state properties
   */
  statesDefense: StateEfficiency[];

  /**
   * Manages the player's state efficiency modifiers
   * 
   * @returns Signal containing array of state efficiency objects
   */
  statesEfficiency: RpgWritableSignal<StateEfficiency[]>;

  /**
   * Apply states to a player from skill or item effects
   * 
   * @param player - The target player to apply states to
   * @param states - Object containing arrays of states to add or remove
   */
  applyStates(player: RpgPlayer, states: { addStates?: StateApplication[]; removeStates?: StateApplication[] }): void;

  /**
   * Get a state to the player. Returns null if the state is not present
   * 
   * @param stateClass - The state class constructor or state ID to search for
   * @returns The state instance if found, null otherwise
   */
  getState(stateClass: StateClass | string): StateData | undefined;

  /**
   * Adds a state to the player
   * 
   * @param stateClass - The state class constructor or state ID to apply
   * @param chance - Probability of successful application (0-1, default 1)
   * @returns The state instance if successfully applied, null if already present
   * @throws StateLog.addFailed if the chance roll fails
   */
  addState(stateClass: StateClass | string, chance?: number): object | null;

  /**
   * Remove a state to the player
   * 
   * @param stateClass - The state class constructor or state ID to remove
   * @param chance - Probability of successful removal (0-1, default 1)
   * @throws StateLog.removeFailed if the chance roll fails
   * @throws StateLog.notApplied if the state is not currently active
   */
  removeState(stateClass: StateClass | string, chance?: number): void;

  /**
   * Find state efficiency modifier for a specific state class
   * 
   * @param stateClass - The state class to find efficiency for
   * @returns The efficiency object if found, undefined otherwise
   */
  findStateEfficiency(stateClass: StateClass): StateEfficiency | undefined;
}
