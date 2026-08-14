import { Constructor, isString, PlayerCtor, RpgCommonPlayer } from "@rpgjs/common";

export interface ClassData {
  id?: string;
  name?: string;
  description?: string;
  icon?: string;
  skillsToLearn?: Array<{ level: number; skill: unknown; source?: string }>;
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
  class?: ClassInput;
  graphic?: string | number | (string | number)[];
  hitbox?: { width: number; height: number };
  [key: string]: unknown;
}

export type ClassConstructor = new () => ClassData;
export type ClassInput = ClassConstructor | ClassData | string;
export type ActorConstructor = new () => ActorData;
export type ActorInput = ActorConstructor | ActorData | string;

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
    private _resolveActorInput(actorInput: ActorInput): ActorData {
      const resolvedActor: ActorConstructor | ActorData = typeof actorInput === "string"
        ? (this as any).databaseById(actorInput) as ActorConstructor | ActorData
        : actorInput;
      return typeof resolvedActor === "function"
        ? new (resolvedActor as ActorConstructor)()
        : resolvedActor;
    }

    private _resolveClassInput(classInput: ClassInput, databaseByIdOverride?: (id: string) => any): ClassConstructor | ClassData {
      if (typeof classInput === "string") {
        return databaseByIdOverride
          ? databaseByIdOverride(classInput as string)
          : (this as any).databaseById(classInput as string);
      }
      return classInput;
    }

    private _createClassInstance(classInput: ClassInput) {
      const classClass = this._resolveClassInput(classInput);
      const instance = typeof classClass === "function"
        ? new (classClass as ClassConstructor)()
        : classClass;
      return { classClass, instance };
    }

    /**
     * Create a class instance without side effects.
     */
    createClassInstance(classInput: ClassInput) {
      return this._createClassInstance(classInput);
    }

    /**
     * Resolve class snapshot entry into a class instance without side effects.
     */
    resolveClassSnapshot(snapshot: { _class?: any }, mapOverride?: any) {
      if (!snapshot || snapshot._class == null) {
        return snapshot;
      }

      if (typeof snapshot._class === "object") {
        const { instance } = this._createClassInstance(snapshot._class);
        (this as any)._class?.set(instance);
        const rest = { ...snapshot };
        delete rest._class;
        return rest;
      }

      const map = mapOverride ?? ((this as any).getCurrentMap?.() || (this as any).map);
      if (!map || !map.database) {
        return snapshot;
      }

      const databaseByIdOverride = (id: string) => {
        return map.database()[id];
      };

      const classId = isString(snapshot._class) ? snapshot._class : snapshot._class?.id;
      if (!classId) {
        return snapshot;
      }

      const classData = this._resolveClassInput(classId, databaseByIdOverride);
      // A destination room can receive a session snapshot before its dynamic
      // database has finished loading. Clear that unresolved reference instead
      // of rejecting the whole player transfer; the destination join hook can
      // then assign its runtime class once the map data is ready.
      if (!classData) {
        (this as any)._class?.set({});
        const rest = { ...snapshot };
        delete rest._class;
        return rest;
      }
      const { instance } = this._createClassInstance(classData);
      (this as any)._class?.set(instance);
      const rest = { ...snapshot };
      delete rest._class;
      return rest;
    }

    setClass(_class: ClassInput): ClassData {
      const { instance } = this._createClassInstance(_class);
      const classInstance = instance;
      const player = this as any;
      player._class.set(classInstance);
      player["execMethod"]("onSet", [this], classInstance);
      for (const skill of classInstance.skillsToLearn ?? []) {
        if (skill.level <= player.level && !player.getSkill?.(skill.skill)) {
          player.learnSkill?.(skill.skill, {
            source: skill.source ?? "class",
            level: skill.level,
          });
        }
      }
      player.refreshHotbar?.();
      return classInstance;
    }

    setActor(actorInput: ActorInput): ActorData {
      const actor = this._resolveActorInput(actorInput);
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

    /**
     * Replace the player's active actor identity while preserving acquired
     * progression. The new actor's parameter curves are evaluated at the
     * current level and HP/SP keep their previous fill ratios. Starting
     * equipment is intentionally not granted.
     *
     * @title Change Actor
     * @method player.changeActor(actor)
     * @param actor - Actor constructor, registered database ID, or resolved actor object.
     * @returns The resolved actor object.
     * @memberof RpgPlayer
     */
    changeActor(actorInput: ActorInput): ActorData {
      const actor = this._resolveActorInput(actorInput);
      const player = this as any;
      const level = player.level;
      const experience = player.exp;
      const maxHp = Number(player.param?.maxHp ?? 0);
      const maxSp = Number(player.param?.maxSp ?? 0);
      const hpRatio = maxHp > 0 ? player.hp / maxHp : 0;
      const spRatio = maxSp > 0 ? player.sp / maxSp : 0;

      if (actor.name !== undefined) player.name = actor.name;
      if (actor.initialLevel !== undefined) player.initialLevel = Math.min(actor.initialLevel, level);
      if (actor.finalLevel !== undefined) player.finalLevel = Math.max(actor.finalLevel, level);
      if (actor.expCurve !== undefined) player.expCurve = actor.expCurve;
      if (actor.parameters !== undefined) player.parameters = actor.parameters;
      if (actor.class) this.setClass(actor.class);
      if (actor.graphic !== undefined) player.setGraphic?.(actor.graphic);
      if (actor.hitbox) player.setHitbox?.(actor.hitbox.width, actor.hitbox.height);

      player.execMethod("onSet", [this], actor);
      if (player._exp?.set) player._exp.set(experience);
      else player.exp = experience;
      if (player._level?.set) player._level.set(level);
      else player.level = level;

      const nextMaxHp = Number(player.param?.maxHp ?? 0);
      const nextMaxSp = Number(player.param?.maxSp ?? 0);
      player.hp = Math.round(nextMaxHp * hpRatio);
      player.sp = Math.round(nextMaxSp * spRatio);
      player.refreshHotbar?.();
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
  setClass(_class: ClassInput): ClassData;

  /**
   * Set up the player as a specific actor archetype
   * 
   * @param actor - The actor constructor, database ID, or resolved actor object to assign to the player
   * @returns The resolved actor object
   */
  setActor(actor: ActorInput): ActorData;

  /**
   * Change the active actor without granting starting equipment or resetting
   * the player's acquired progression.
   *
   * @param actor - The actor constructor, database ID, or resolved actor object to apply
   * @returns The resolved actor object
   */
  changeActor(actor: ActorInput): ActorData;
}
