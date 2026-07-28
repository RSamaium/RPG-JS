import { Constructor, isString, PlayerCtor, RpgCommonPlayer } from "@rpgjs/common";

export interface ClassData {
  id?: string;
  name?: string;
  [key: string]: unknown;
}

export interface ActorData {
  id?: string;
  name?: string;
  initialLevel?: number;
  finalLevel?: number;
  expCurve?: Record<string, number>;
  parameters?: Record<string, { start: number; end: number }>;
  startingEquipment?: unknown[];
  class?: ClassConstructor | string;
  [key: string]: unknown;
}

export type ClassConstructor = new () => ClassData;
export type ActorConstructor = new () => ActorData;
type ClassClass = ClassConstructor;
type ActorClass = ActorConstructor;

interface PlayerWithMixins extends RpgCommonPlayer {
  databaseById(id: string): any;
  addParameter(name: string, { start, end }: { start: number, end: number }): void;
  addItem(item: any): any;
  equip(itemId: string, equip?: boolean | 'auto'): void;
}

/**
 * Class Manager Mixin
 * 
 * Provides class and actor management capabilities to any class. This mixin handles
 * character class assignment and actor setup, including automatic parameter configuration,
 * starting equipment, and skill progression based on class definitions.
 * 
 * @param Base - The base class to extend with class management
 * @returns Extended class with class management methods
 * 
 * @example
 * ```ts
 * class MyPlayer extends WithClassManager(BasePlayer) {
 *   constructor() {
 *     super();
 *     // Class system is automatically initialized
 *   }
 * }
 * 
 * const player = new MyPlayer();
 * player.setClass(Fighter);
 * player.setActor(Hero);
 * ```
 */
export function WithClassManager<TBase extends PlayerCtor>(Base: TBase) {
  return class extends Base {
    private _resolveClassInput(classInput: ClassClass | string, databaseByIdOverride?: (id: string) => any) {
      if (isString(classInput)) {
        return databaseByIdOverride
          ? databaseByIdOverride(classInput as string)
          : (this as any).databaseById(classInput as string);
      }
      return classInput;
    }

    private _createClassInstance(classInput: ClassClass | string) {
      const classClass = this._resolveClassInput(classInput);
      const instance = new (classClass as ClassClass)();
      return { classClass, instance };
    }

    /**
     * Create a class instance without side effects.
     */
    createClassInstance(classInput: ClassClass | string) {
      return this._createClassInstance(classInput);
    }

    /**
     * Resolve class snapshot entry into a class instance without side effects.
     */
    resolveClassSnapshot(snapshot: { _class?: any }, mapOverride?: any) {
      if (!snapshot || snapshot._class == null) {
        return snapshot;
      }

      const map = mapOverride ?? ((this as any).getCurrentMap?.() || (this as any).map);
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

      const classId = isString(snapshot._class) ? snapshot._class : snapshot._class?.id;
      if (!classId) {
        return snapshot;
      }

      const classClass = this._resolveClassInput(classId, databaseByIdOverride);
      const { instance } = this._createClassInstance(classClass as ClassClass);
      return { ...snapshot, _class: instance };
    }

    setClass(_class: ClassClass | string): ClassData {
      const { instance } = this._createClassInstance(_class);
      const classInstance = instance;
      (this as any)["execMethod"]("onSet", [this], classInstance);
      (this as any).refreshHotbar?.();
      return classInstance;
    }

    setActor(actorClass: ActorClass | string): ActorData {
      if (isString(actorClass)) actorClass = (this as any).databaseById(actorClass);
      const actor = new (actorClass as ActorClass)();
      ["name", "initialLevel", "finalLevel", "expCurve"].forEach((key) => {
        if (actor[key]) (this as any)[key] = actor[key];
      });
      for (let param in actor.parameters ?? {}) {
        (this as any).addParameter(param, actor.parameters![param]);
      }
      for (let item of actor.startingEquipment ?? []) {
        const inventory = (this as any).addItem(item);
        const itemId = inventory?.id?.();
        if (itemId) {
          (this as any).equip(itemId, true);
        }
      }
      if (actor.class) this.setClass(actor.class);
      (this as any)["execMethod"]("onSet", [this], actor);
      return actor;
    }
  } as unknown as TBase;
}

/**
 * Interface for Class Manager functionality
 * 
 * Provides class and actor management capabilities including character class assignment
 * and actor setup. This interface defines the public API of the ClassManager mixin.
 */
export interface IClassManager {
  /**
   * Assign a class to the player
   * 
   * @param _class - The class constructor or class ID to assign to the player
   * @returns The instantiated class object
   */
  setClass(_class: ClassConstructor | string): ClassData;

  /**
   * Set up the player as a specific actor archetype
   * 
   * @param actorClass - The actor constructor or actor ID to assign to the player
   * @returns The instantiated actor object
   */
  setActor(actorClass: ActorConstructor | string): ActorData;
}
