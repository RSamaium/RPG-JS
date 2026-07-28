import {
  isArray,
  isInstanceOf,
  isString,
  PlayerCtor,
  Skill,
} from "@rpgjs/common";
import { SkillLog } from "../logs";
import { RpgPlayer } from "./Player";
import { Effect } from "./EffectManager";

/**
 * Type for skill class constructor
 */
export type SkillClass = { new (): SkillObject; readonly name: string; readonly id?: string };

export type SkillChangeAction = "learn" | "forget";

export interface SkillChangeOptions {
  source?: "manual" | "level" | "class" | "studio" | string;
  level?: number;
}

export interface SkillChangePayload extends SkillChangeOptions {
  action: SkillChangeAction;
  skill: SkillClass | SkillObject | string;
  skillId: string;
}

/**
 * Interface defining the hooks that can be implemented on skill classes or objects
 * 
 * These hooks are called at specific moments during the skill lifecycle:
 * - `onLearn`: When the skill is learned by the player
 * - `onUse`: When the skill is successfully used
 * - `onUseFailed`: When the skill usage fails (e.g., chance roll failed)
 * - `onForget`: When the skill is forgotten
 * 
 * @example
 * ```ts
 * const skillHooks: SkillHooks = {
 *   onLearn(player) {
 *     console.log('Skill learned!');
 *   },
 *   onUse(player, target) {
 *     console.log('Skill used on target');
 *   }
 * };
 * ```
 */
export interface SkillHooks {
  /**
   * Called when the skill is learned by the player
   * 
   * @param player - The player learning the skill
   */
  onLearn?: (player: RpgPlayer) => void | Promise<void>;

  /**
   * Called when the skill is successfully used
   * 
   * @param player - The player using the skill
   * @param target - The target player(s) if any
   */
  onUse?: (player: RpgPlayer, target?: RpgPlayer | RpgPlayer[]) => void | Promise<void>;

  /**
   * Called when the skill usage fails (e.g., chance roll failed)
   * 
   * @param player - The player attempting to use the skill
   * @param target - The intended target player(s) if any
   */
  onUseFailed?: (player: RpgPlayer, target?: RpgPlayer | RpgPlayer[]) => void | Promise<void>;

  /**
   * Called when the skill is forgotten
   * 
   * @param player - The player forgetting the skill
   */
  onForget?: (player: RpgPlayer) => void | Promise<void>;
}

/**
 * Interface for skill object definition
 * 
 * Defines the properties that a skill can have when defined as an object.
 * Skills can be defined as objects, classes, or string IDs referencing the database.
 * 
 * @example
 * ```ts
 * const fireSkill: SkillObject = {
 *   id: 'fire',
 *   name: 'Fire',
 *   description: 'A basic fire spell',
 *   spCost: 10,
 *   hitRate: 0.9,
 *   power: 50,
 *   onUse(player) {
 *     console.log('Fire spell cast!');
 *   }
 * };
 * 
 * player.learnSkill(fireSkill);
 * ```
 */
export interface SkillObject extends SkillHooks {
  /**
   * Unique identifier for the skill
   * If not provided, one will be auto-generated
   */
  id?: string;

  /**
   * Display name of the skill
   */
  name?: string;

  /**
   * Description of the skill
   */
  description?: string;

  /**
   * SP (Skill Points) cost to use the skill
   * @default 0
   */
  spCost?: number;

  /**
   * Hit rate (0-1) - probability of successful skill usage
   * @default 1
   */
  hitRate?: number;

  /**
   * Base power of the skill for damage calculation
   */
  power?: number;

  /**
   * Coefficient multipliers for damage calculation
   */
  coefficient?: Record<string, number>;

  /**
   * Type marker for database
   */
  _type?: 'skill';

  /**
   * Allow additional properties
   */
  [key: string]: unknown;
}

export type SkillData = Skill | SkillObject;

/**
 * Skill Manager Mixin
 * 
 * Provides skill management capabilities to any class. This mixin handles
 * learning, forgetting, and using skills, including SP cost management,
 * hit rate calculations, and skill effects application.
 * 
 * Supports three input formats for skills:
 * - **String ID**: References a skill in the database
 * - **Class**: A skill class that will be instantiated
 * - **Object**: A skill object with properties and hooks
 * 
 * @param Base - The base class to extend with skill management
 * @returns Extended class with skill management methods
 * 
 * @example
 * ```ts
 * // Using string ID (from database)
 * player.learnSkill('fire');
 * 
 * // Using skill class
 * player.learnSkill(FireSkill);
 * 
 * // Using skill object
 * player.learnSkill({
 *   id: 'ice',
 *   name: 'Ice',
 *   spCost: 15,
 *   onUse(player) {
 *     console.log('Ice spell cast!');
 *   }
 * });
 * ```
 */
export function WithSkillManager<TBase extends PlayerCtor>(Base: TBase): TBase {
  return class extends (Base as any) {
    private _getSkillSnapshot(skillData: any) {
      if (!skillData) return null;

      const snapshot = {
        ...((skillData as any)._skillData || skillData),
      };

      const reactiveKeys = [
        "id",
        "name",
        "description",
        "spCost",
        "icon",
        "hitRate",
        "power",
        "coefficient",
      ];

      for (const key of reactiveKeys) {
        const value = (skillData as any)[key];
        if (typeof value === "function") {
          if (key === "hitRate" && !(key in snapshot)) {
            continue;
          }
          snapshot[key] = value();
        } else if (value !== undefined) {
          snapshot[key] = value;
        }
      }

      if ((skillData as any)._skillInstance) {
        snapshot._skillInstance = (skillData as any)._skillInstance;
      }

      return snapshot;
    }

    private _getLearnedSkillEntry(skillInput: SkillClass | SkillObject | string): Skill | null {
      const index = this._getSkillIndex(skillInput);
      return index >= 0 ? ((this as any).skills()[index] as Skill) : null;
    }

    private _getSkillMap(required: boolean = true) {
      // Use this.map directly to support both RpgMap and LobbyRoom
      const map = (this as any).getCurrentMap?.() || (this as any).map;
      if (required && (!map || !map.database)) {
        throw new Error('Player must be on a map to learn skills');
      }
      return map;
    }

    private _resolveSkillInput(
      skillInput: SkillClass | SkillObject | string,
      map: any,
      databaseByIdOverride?: (id: string) => any
    ) {
      let skillId = '';
      let skillData: any;
      let skillInstance: any = null;

      if (isString(skillInput)) {
        skillId = skillInput as string;
        skillData = databaseByIdOverride
          ? databaseByIdOverride(skillId)
          : (this as any).databaseById(skillId);
      } else if (typeof skillInput === 'function') {
        const SkillClassCtor = skillInput as SkillClass;
        skillId = (SkillClassCtor as any).id || SkillClassCtor.name;

        const existingData = map?.database()?.[skillId];
        if (existingData) {
          skillData = existingData;
        } else if (map) {
          map.addInDatabase(skillId, SkillClassCtor);
          skillData = SkillClassCtor;
        } else {
          skillData = SkillClassCtor;
        }

        skillInstance = new SkillClassCtor();
        skillData = { ...skillData, ...skillInstance, id: skillId };
      } else {
        const skillObj = skillInput as SkillObject;
        skillId = skillObj.id || `skill-${Date.now()}`;
        skillObj.id = skillId;

        const existingData = map?.database()?.[skillId];
        if (existingData) {
          skillData = { ...existingData, ...skillObj };
          if (map) {
            map.addInDatabase(skillId, skillData, { force: true });
          }
        } else if (map) {
          map.addInDatabase(skillId, skillObj);
          skillData = skillObj;
        } else {
          skillData = skillObj;
        }

        skillInstance = skillObj;
      }

      return { skillId, skillData, skillInstance };
    }

    private _createSkillInstance(
      skillId: string,
      skillData: any,
      skillInstance: any
    ) {
      const instance = new Skill(skillData);
      instance.id.set(skillId);
      (instance as any)._skillData = {
        ...skillData,
        id: skillId,
      };

      if (skillInstance) {
        (instance as any)._skillInstance = skillInstance;
      }

      return instance;
    }

    /**
     * Create a skill instance without learning side effects.
     */
    createSkillInstance(skillInput: SkillClass | SkillObject | string) {
      const map = this._getSkillMap();
      const { skillId, skillData, skillInstance } = this._resolveSkillInput(skillInput, map);
      const instance = this._createSkillInstance(skillId, skillData, skillInstance);
      return { skillId, skillData, skillInstance, instance };
    }

    /**
     * Resolve skill snapshot entries into Skill instances without side effects.
     */
    resolveSkillsSnapshot(snapshot: { skills?: any[] }, mapOverride?: any) {
      if (!snapshot || !Array.isArray(snapshot.skills)) {
        return snapshot;
      }

      const map = mapOverride ?? this._getSkillMap(false);
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

      const skills = snapshot.skills.map((entry: any) => {
        const skillId = isString(entry) ? entry : entry?.id;
        if (!skillId) {
          return entry;
        }

        const { skillData, skillInstance } = this._resolveSkillInput(
          skillId,
          map,
          databaseByIdOverride
        );
        return this._createSkillInstance(skillId, skillData, skillInstance);
      });

      return { ...snapshot, skills };
    }

    /**
     * Find the index of a skill in the skills array
     * 
     * Searches by ID for both string inputs and object/class inputs.
     * 
     * @param skillInput - Skill ID, class, or object to find
     * @returns Index of the skill or -1 if not found
     */
    _getSkillIndex(skillInput: SkillClass | SkillObject | string): number {
      // Get the ID to search for
      let searchId = '';
      
      if (isString(skillInput)) {
        searchId = skillInput as string;
      } else if (typeof skillInput === 'function') {
        // It's a class - use the class name as ID
        searchId = (skillInput as any).id || skillInput.name;
      } else {
        // It's an object - use its id property
        searchId = (skillInput as SkillObject).id || '';
      }

      return (this as any).skills().findIndex((skill: any) => {
        const skillId = skill.id() || skill.name() || '';
        return skillId === searchId;
      });
    }

    /**
     * Retrieves a learned skill
     * 
     * Searches the player's learned skills by ID, class, or object.
     * 
     * @param skillInput - Skill ID, class, or object to find
     * @returns The skill data if found, null otherwise
     * 
     * @example
     * ```ts
     * const skill = player.getSkill('fire');
     * if (skill) {
     *   console.log(`Fire skill costs ${skill.spCost} SP`);
     * }
     * ```
     */
    getSkill(skillInput: SkillClass | SkillObject | string): Skill | null {
      const skill = this._getLearnedSkillEntry(skillInput);
      return this._getSkillSnapshot(skill) as Skill | null;
    }

    /**
     * Learn a new skill
     * 
     * Adds a skill to the player's skill list. Supports three input formats:
     * - **String ID**: Retrieves the skill from the database
     * - **Class**: Creates an instance and adds to database if needed
     * - **Object**: Uses directly and adds to database if needed
     * 
     * @param skillInput - Skill ID, class, or object to learn
     * @returns The learned skill data
     * @throws SkillLog.alreadyLearned if the skill is already known
     * 
     * @example
     * ```ts
     * // From database
     * player.learnSkill('fire');
     * 
     * // From class
     * player.learnSkill(FireSkill);
     * 
     * // From object
     * player.learnSkill({
     *   id: 'custom-skill',
     *   name: 'Custom Skill',
     *   spCost: 20,
     *   onLearn(player) {
     *     console.log('Learned custom skill!');
     *   }
     * });
     * ```
     */
    learnSkill(
      skillInput: SkillClass | SkillObject | string,
      options: SkillChangeOptions = {},
    ): SkillObject {
      const map = this._getSkillMap();
      const { skillId, skillData, skillInstance } = this._resolveSkillInput(skillInput, map);

      // Check if already learned
      if (this._getLearnedSkillEntry(skillId)) {
        throw SkillLog.alreadyLearned(skillData);
      }

      const instance = this._createSkillInstance(skillId, skillData, skillInstance);

      (this as any).skills().push(instance);
      
      // Call onLearn hook
      const hookTarget = (instance as any)._skillInstance || instance;
      this["execMethod"]("onLearn", [this], hookTarget);
      this["execMethod"]("onSkillChange", [
        {
          action: "learn",
          skill: skillData,
          skillId,
          source: options.source ?? "manual",
          level: options.level,
        },
      ]);
      this["refreshHotbar"]?.();
      
      return skillData as SkillObject;
    }

    /**
     * Forget a learned skill
     * 
     * Removes a skill from the player's skill list.
     * 
     * @param skillInput - Skill ID, class, or object to forget
     * @returns The forgotten skill data
     * @throws SkillLog.notLearned if the skill is not known
     * 
     * @example
     * ```ts
     * player.forgetSkill('fire');
     * // or
     * player.forgetSkill(FireSkill);
     * ```
     */
    forgetSkill(
      skillInput: SkillClass | SkillObject | string,
      options: SkillChangeOptions = {},
    ): SkillData {
      const index = this._getSkillIndex(skillInput);
      
      if (index === -1) {
        // Get skill data for error message
        let skillData: any = skillInput;
        if (isString(skillInput)) {
          try {
            skillData = (this as any).databaseById(skillInput);
          } catch {
            skillData = { name: skillInput, id: skillInput };
          }
        } else if (typeof skillInput === 'function') {
          skillData = { name: (skillInput as SkillClass).name, id: (skillInput as any).id || (skillInput as SkillClass).name };
        }
        throw SkillLog.notLearned(skillData);
      }
      
      const skillEntry = (this as any).skills()[index];
      const skillData = this._getSkillSnapshot(skillEntry);
      (this as any).skills().splice(index, 1);
      
      // Call onForget hook
      const hookTarget =
        (skillEntry as any)?._skillInstance ||
        (skillEntry as any)?._skillData ||
        skillData;
      this["execMethod"]("onForget", [this], hookTarget);
      this["execMethod"]("onSkillChange", [
        {
          action: "forget",
          skill: skillData,
          skillId: skillData?.id ?? String(skillInput),
          source: options.source ?? "manual",
          level: options.level,
        },
      ]);
      this["refreshHotbar"]?.();
      
      return skillData as SkillData;
    }

    /**
     * Use a learned skill
     * 
     * Executes a skill, consuming SP and applying effects to targets.
     * The skill must be learned and the player must have enough SP.
     * 
     * @param skillInput - Skill ID, class, or object to use
     * @param otherPlayer - Optional target player(s) to apply skill effects to
     * @returns The used skill data
     * @throws SkillLog.restriction if player has CAN_NOT_SKILL effect
     * @throws SkillLog.notLearned if skill is not known
     * @throws SkillLog.notEnoughSp if not enough SP
     * @throws SkillLog.chanceToUseFailed if hit rate check fails
     * 
     * @example
     * ```ts
     * // Use skill without target
     * player.useSkill('fire');
     * 
     * // Use skill on a target
     * player.useSkill('fire', enemy);
     * 
     * // Use skill on multiple targets
     * player.useSkill('fire', [enemy1, enemy2]);
     * ```
     */
    useSkill(skillInput: SkillClass | SkillObject | string, otherPlayer?: RpgPlayer | RpgPlayer[]): SkillData {
      const skillEntry = this._getLearnedSkillEntry(skillInput);
      const skill = this._getSkillSnapshot(skillEntry);
      
      // Check for skill restriction effect
      if ((this as any).hasEffect(Effect.CAN_NOT_SKILL)) {
        throw SkillLog.restriction(skill || skillInput);
      }
      
      // Check if skill is learned
      if (!skill) {
        throw SkillLog.notLearned(skillInput);
      }
      
      // Check SP cost
      const spCost = typeof skill.spCost === "number" ? skill.spCost : 0;
      if (spCost > (this as any).sp) {
        throw SkillLog.notEnoughSp(skill, spCost, (this as any).sp);
      }
      
      // Consume SP (halved if HALF_SP_COST effect is active)
      const costMultiplier = (this as any).hasEffect(Effect.HALF_SP_COST) ? 2 : 1;
      (this as any).sp -= spCost / costMultiplier;
      
      // Check hit rate
      const hitRate = typeof skill.hitRate === "number" ? skill.hitRate : 1;
      if (Math.random() > hitRate) {
        const hookTarget =
          (skillEntry as any)?._skillInstance ||
          (skillEntry as any)?._skillData ||
          skill;
        this["execMethod"]("onUseFailed", [this, otherPlayer], hookTarget);
        throw SkillLog.chanceToUseFailed(skill);
      }
      
      // Apply effects to targets
      if (otherPlayer) {
        const players: RpgPlayer[] = isArray(otherPlayer) ? otherPlayer as RpgPlayer[] : [otherPlayer as RpgPlayer];
        for (const player of players) {
          (this as any).applyStates(player, skill);
          (player as any).applyDamage(this, skill);
        }
      }
      
      // Call onUse hook
      const hookTarget =
        (skillEntry as any)?._skillInstance ||
        (skillEntry as any)?._skillData ||
        skill;
      this["execMethod"]("onUse", [this, otherPlayer], hookTarget);
      
      return skill;
    }
  } as unknown as TBase;
}

/**
 * Interface for Skill Manager functionality
 * 
 * Provides skill management capabilities including learning, forgetting, and using skills.
 * This interface defines the public API of the SkillManager mixin.
 */
export interface ISkillManager {
  /**
   * Retrieves a learned skill. Returns null if not found
   * 
   * @param skillInput - Skill class, object, or data id
   * @returns The skill data or null
   */
  getSkill(skillInput: SkillClass | SkillObject | string): Skill | null;

  /**
   * Learn a skill
   * 
   * Supports three input formats:
   * - String ID: Retrieves from database
   * - Class: Creates instance and adds to database
   * - Object: Uses directly and adds to database
   * 
   * @param skillInput - Skill class, object, or data id
   * @returns The learned skill data
   * @throws SkillLog.alreadyLearned if the player already knows the skill
   */
  learnSkill(skillInput: SkillClass | SkillObject | string, options?: SkillChangeOptions): SkillObject;

  /**
   * Forget a skill
   * 
   * @param skillInput - Skill class, object, or data id
   * @returns The forgotten skill data
   * @throws SkillLog.notLearned if trying to forget a skill not learned
   */
  forgetSkill(skillInput: SkillClass | SkillObject | string, options?: SkillChangeOptions): SkillData;

  /**
   * Use a skill
   * 
   * @param skillInput - Skill class, object, or data id
   * @param otherPlayer - Optional target player(s) to apply skill to
   * @returns The used skill data
   * @throws SkillLog.restriction if player has Effect.CAN_NOT_SKILL
   * @throws SkillLog.notLearned if player tries to use an unlearned skill
   * @throws SkillLog.notEnoughSp if player does not have enough SP
   * @throws SkillLog.chanceToUseFailed if the chance to use the skill has failed
   */
  useSkill(skillInput: SkillClass | SkillObject | string, otherPlayer?: RpgPlayer | RpgPlayer[]): SkillData;
}
