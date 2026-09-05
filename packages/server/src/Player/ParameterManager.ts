import { isString, PlayerCtor, type RpgReadableSignal, type RpgWritableSignal } from "@rpgjs/common";
import { signal, computed } from "@signe/reactive";
import { MAXHP, MAXSP } from "@rpgjs/common";
import { type } from "@signe/sync";

export type ExpCurve = {
  basis: number;
  extra: number;
  accelerationA: number;
  accelerationB: number;
};

export type ParameterCurve = {
  start: number;
  end: number;
};

export type ParameterValue = number | ParameterCurve;
type ParameterModifierMap = Record<string, { value?: number; rate?: number }>;
type ParameterCurveMap = Record<string, ParameterCurve>;

const DEFAULT_EXP_CURVE: ExpCurve = {
  basis: 30,
  extra: 20,
  accelerationA: 30,
  accelerationB: 30
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toValidNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeExpCurve(value: unknown): ExpCurve {
  if (!isObject(value)) return DEFAULT_EXP_CURVE;

  return {
    basis: toValidNumber(value.basis, DEFAULT_EXP_CURVE.basis),
    extra: toValidNumber(value.extra, DEFAULT_EXP_CURVE.extra),
    accelerationA: toValidNumber(value.accelerationA, DEFAULT_EXP_CURVE.accelerationA),
    accelerationB: toValidNumber(value.accelerationB, DEFAULT_EXP_CURVE.accelerationB)
  };
}

function normalizeParameterCurve(value: unknown): ParameterCurve {
  if (typeof value === "number") {
    const normalized = toValidNumber(value, 0);
    return {
      start: normalized,
      end: normalized
    };
  }

  if (!isObject(value)) {
    return {
      start: 0,
      end: 0
    };
  }

  const start = toValidNumber(value.start, 0);
  const end = toValidNumber(value.end, start);

  return {
    start,
    end
  };
}

/**
 * Interface for Parameter Manager functionality
 * 
 * Provides comprehensive parameter management including health points (HP), skill points (SP),
 * experience and level progression, custom parameters, and parameter modifiers.
 */
export interface IParameterManager {
  /** 
   * ```ts
   * player.initialLevel = 5
   * ``` 
   * 
   * @title Set initial level
   * @prop {number} player.initialLevel
   * @default 1
   * @memberof ParameterManager
   * */
  initialLevel: number;

  /** 
   * ```ts
   * player.finalLevel = 50
   * ``` 
   * 
   * @title Set final level
   * @prop {number} player.finalLevel
   * @default 99
   * @memberof ParameterManager
   * */
  finalLevel: number;

  /** 
   * With Object-based syntax, you can use following options:
   * - `basis: number`
   * - `extra: number`
   * - `accelerationA: number`
   * - `accelerationB: number`
   * @title Change Experience Curve
   * @prop {object} player.expCurve
   * @default 
   *  ```ts
   * {
   *      basis: 30,
   *      extra: 20,
   *      accelerationA: 30,
   *      accelerationB: 30
   * }
   * ```
   * @memberof ParameterManager
   * */
  expCurve: ExpCurve;

  /** 
   * Changes the health points
   * - Cannot exceed the MaxHP parameter
   * - Cannot have a negative value
   * - If the value is 0, a hook named `onDead()` is called in the RpgPlayer class.
   * 
   * ```ts
   * player.hp = 100
   * ``` 
   * @title Change HP
   * @prop {number} player.hp
   * @default MaxHPValue
   * @memberof ParameterManager
   * */
  hp: number;

  /** 
   * Changes the skill points
   * - Cannot exceed the MaxSP parameter
   * - Cannot have a negative value
   * 
   * ```ts
   * player.sp = 200
   * ``` 
   * @title Change SP
   * @prop {number} player.sp
   * @default MaxSPValue
   * @memberof ParameterManager
   * */
  sp: number;

  /** 
   * Changing the player's experience. 
   * ```ts
   * player.exp += 100
   * ```
   * 
   * Levels are based on the experience curve.
   * 
   * ```ts
   * console.log(player.level) // 1
   * console.log(player.expForNextlevel) // 150
   * player.exp += 160
   * console.log(player.level) // 2
   * ```
   * 
   * @title Change Experience
   * @prop {number} player.exp
   * @default 0
   * @memberof ParameterManager
   * */
  exp: number;

  /** 
   * Changing the player's level. 
   * 
   * ```ts
   * player.level += 1
   * ``` 
   * 
   * The level will be between the initial level given by the `initialLevel` and final level given by `finalLevel`
   * 
   * ```ts
   * player.finalLevel = 50
   * player.level = 60 
   * console.log(player.level) // 50
   * ```
   * 
   * @title Change Level
   * @prop {number} player.level
   * @default 1
   * @memberof ParameterManager
   * */
  level: number;

  /** 
   * ```ts
   * console.log(player.expForNextlevel) // 150
   * ```
   * @title Experience for next level ?
   * @prop {number} player.expForNextlevel
   * @readonly
   * @memberof ParameterManager
   * */
  readonly expForNextlevel: number;

  /** 
   * Read the value of a parameter. Put the name of the parameter.
   * 
   * ```ts
   * import { Presets } from '@rpgjs/server'
   * 
   * const { MAXHP } = Presets 
   * 
   * console.log(player.param[MAXHP])
   * ```
   * 
   * > Possible to use the `player.getParamValue(name)` method instead
   * @title Get Param Value
   * @prop {object} player.param
   * @readonly
   * @memberof ParameterManager
   * */
  readonly param: { [key: string]: number };

  /** 
   * Direct parameter modifiers (reactive signal)
   * 
   * > It is important that these parameters have been created beforehand with the `addParameter()` method.
   * > By default, the following settings have been created: 
   * - maxhp
   * - maxsp
   * - str
   * - int
   * - dex
   * - agi
   * 
   * **Object Key**
   * 
   * The key of the object is the name of the parameter
   * 
   * > The good practice is to retrieve the name coming from a constant
   * 
   * **Object Value**
   * 
   * The value of the key is an object containing: 
   * ``` 
   * {
   *   value: number,
   *   rate: number
   * }
   * ```
   * 
   * - value: Adds a number to the parameter
   * - rate: Adds a rate to the parameter
   * 
   * > Note that you can put both (value and rate)
   * 
   * This property uses reactive signals - changes automatically trigger parameter recalculation.
   * The final parameter values in `param` include aggregated modifiers from equipment, states, etc.
   * 
   * @prop {Object} [paramsModifier]
   * @example
   * 
   * ```ts
   * import { Presets } from '@rpgjs/server'
   * 
   * const { MAXHP } = Presets
   * 
   * // Set direct modifiers (reactive)
   * player.paramsModifier = {
   *      [MAXHP]: {
   *          value: 100
   *      }
   * }
   * 
   * // Parameters automatically recalculate
   * console.log(player.param[MAXHP]); // Updated value
   * ```
   * 
   * @title Set Parameters Modifier
   * @prop {object} paramsModifier
   * @memberof ParameterManager
   * */
  paramsModifier: { 
    [key: string]: {
      value?: number,
      rate?: number
    }
  };

  /**
   * Get or set the parameters object
   * 
   * @prop {object} parameters
   * @memberof ParameterManager
   */
  parameters: { [key: string]: { start: number, end: number } };

  /**
   * Set a parameter with either a fixed value or a level curve
   *
   * A numeric value is stored as a fixed parameter where `start === end`.
   *
   * @param name - Parameter name
   * @param value - Fixed value or parameter curve
   */
  setParameter(name: string, value: ParameterValue): void;

  /**
   * Get the value of a specific parameter by name
   * 
   * @deprecated Use `player.param[name]` instead for better reactivity
   * @param name - The name of the parameter to get
   * @returns The calculated parameter value
   * 
   * @example
   * ```ts
   * import { Presets } from '@rpgjs/server'
   * 
   * const { MAXHP } = Presets
   * 
   * // Preferred way (reactive)
   * const maxHp = player.param[MAXHP];
   * 
   * // Legacy way (still works)
   * const maxHp = player.getParamValue(MAXHP);
   * ```
   */
  getParamValue(name: string): number;

  /** 
   * Give a new parameter. Give a start value and an end value. 
   * The start value will be set to the level set at `player.initialLevel` and the end value will be linked to the level set at `player.finalLevel`.
   * 
   * ```ts
   * const SPEED = 'speed'
   * 
   * player.addParameter(SPEED, {
   *     start: 10,
   *     end: 100
   * })
   * 
   * player.param[SPEED] // 10
   * player.level += 5
   * player.param[SPEED] // 14
   * ```
   * 
   * @title Add custom parameters
   * @method player.addParameter(name,curve)
   * @param {string} name - The name of the parameter
   * @param {object} curve - Scheme of the object: { start: number, end: number }
   * @returns {void}
   * @memberof ParameterManager
   * */
  addParameter(name: string, curve: { start: number, end: number }): void;

  /** 
   * Gives back in percentage of health points to skill points
   * 
   * ```ts
   * import { Presets } from '@rpgjs/server'
   * 
   * const { MAXHP } = Presets 
   * 
   * console.log(player.param[MAXHP]) // 800
   * player.hp = 100
   * player.recovery({ hp: 0.5 }) // = 800 * 0.5
   * console.log(player.hp) // 400
   * ```
   * 
   * @title Recovery HP and/or SP
   * @method player.recovery(params)
   * @param {object} params - Scheme of the object: { hp: number, sp: number }. The values of the numbers must be in 0 and 1
   * @returns {void}
   * @memberof ParameterManager
   * */
  recovery(params: { hp?: number, sp?: number }): void;

  /** 
   * restores all HP and SP
   * 
   * ```ts
   * import { Presets } from '@rpgjs/server'
   * 
   * const { MAXHP, MAXSP } = Presets 
   * 
   * console.log(player.param[MAXHP], player.param[MAXSP]) // 800, 230
   * player.hp = 100
   * player.sp = 0
   * player.allRecovery()
   * console.log(player.hp, player.sp) // 800, 230
   * ```
   * 
   * @title All Recovery
   * @method player.allRecovery()
   * @returns {void}
   * @memberof ParameterManager
   * */
  allRecovery(): void;
}

/**
 * Parameter Manager Mixin with Reactive Signals
 * 
 * Provides comprehensive parameter management through RPGJS reactive gameplay signals.
 * This mixin handles health points (HP), skill points (SP), experience and level progression, 
 * custom parameters, and parameter modifiers with automatic reactivity.
 * 
 * **Key Features:**
 * - ✨ **Reactive Parameters**: All parameters automatically recalculate when level or modifiers change
 * - 🚀 **Performance Optimized**: Uses computed signals to avoid unnecessary recalculations  
 * - 🔄 **Real-time Updates**: Changes propagate automatically throughout the system
 * - 🎯 **Type Safe**: Full TypeScript support with proper type inference
 * 
 * @template TBase - The base class constructor type
 * @param Base - The base class to extend with parameter management
 * @returns Extended class with reactive parameter management methods
 * 
 * @example
 * ```ts
 * class MyPlayer extends WithParameterManager(BasePlayer) {
 *   constructor() {
 *     super();
 *     
 *     // Add custom parameters
 *     this.addParameter('strength', { start: 10, end: 100 });
 *     this.addParameter('magic', { start: 5, end: 80 });
 *   }
 * }
 * 
 * const player = new MyPlayer();
 * 
 * // Reactive parameter updates
 * player.level = 5;
 * console.log(player.param.strength); // Automatically calculated for level 5
 * 
 * // Reactive modifiers
 * player.paramsModifier = {
 *   [MAXHP]: { value: 100, rate: 1.2 }
 * };
 * console.log(player.param[MAXHP]); // Automatically includes modifiers
 * ```
 */
export function WithParameterManager<TBase extends PlayerCtor>(Base: TBase) {
  return class extends Base {
    /**
     * Signal for parameter modifiers - allows reactive updates when modifiers change
     * 
     * This signal tracks temporary parameter modifications from equipment, states, etc.
     * When updated, it automatically triggers recalculation of all computed parameters.
     * 
     * @example
     * ```ts
     * // Set modifier that adds 100 to MaxHP
     * player.paramsModifier = {
     *   [MAXHP]: { value: 100 }
     * };
     * 
     * // Parameters automatically recalculate
     * console.log(player.param[MAXHP]); // Updated value
     * ```
     */
    private _paramsModifierSignal: RpgWritableSignal<ParameterModifierMap> = type(
        signal<ParameterModifierMap>({}) as never,
        '_paramsModifierSignal',
        { persist: true },
        this as never
    ) as unknown as RpgWritableSignal<ParameterModifierMap>

    /**
     * Signal for base parameters configuration
     * 
     * Stores the start and end values for each parameter's level curve.
     * Changes to this signal trigger recalculation of all parameter values.
     */
    private _parametersSignal: RpgWritableSignal<ParameterCurveMap> = type(
        signal<ParameterCurveMap>({}) as never,
        '_parametersSignal',
        { persist: true },
        this as never
    ) as unknown as RpgWritableSignal<ParameterCurveMap>

    private _initialLevelSignal = type(signal(1) as never, '_initialLevelSignal', { persist: true }, this as never) as unknown as RpgWritableSignal<number>
    private _finalLevelSignal = type(signal(99) as never, '_finalLevelSignal', { persist: true }, this as never) as unknown as RpgWritableSignal<number>

    private _paramProxy: { [key: string]: number } | null = null

    /**
     * Computed signal for all parameter values
     * 
     * Automatically recalculates all parameter values when level or modifiers change.
     * This provides reactive parameter updates throughout the system.
     * 
     * @example
     * ```ts
     * // Access reactive parameters
     * const maxHp = player.param[MAXHP]; // Always current value
     * 
     * // Parameters update automatically when level changes
     * player.level = 10;
     * console.log(player.param[MAXHP]); // New calculated value
     * ```
     */
    _param: RpgReadableSignal<Record<string, number>> = type(computed<Record<string, number>>(() => {
        const obj: Record<string, number> = {}
        const parameters = this._parametersSignal()
        const allModifiers = this._getAggregatedModifiers()
        const level = this._level()
        const initialLevel = this.initialLevel
        const finalLevel = this.finalLevel
        
        for (const [name, paramConfig] of Object.entries(parameters)) {
            let curveVal = Math.floor((paramConfig.end - paramConfig.start) * ((level - 1) / (finalLevel - initialLevel))) + paramConfig.start
            
            const modifier = allModifiers[name]
            if (modifier) {
                if (modifier.rate) curveVal *= modifier.rate
                if (modifier.value) curveVal += modifier.value
            }
            
            obj[name] = curveVal
        }
        
        return obj
    }) as never, '_param', {}, this as never) as unknown as RpgReadableSignal<Record<string, number>>

    /**
     * Aggregates parameter modifiers from all sources (direct modifiers, states, equipment)
     * 
     * This method combines modifiers from multiple sources and calculates the final
     * modifier values for each parameter. It handles both value and rate modifiers.
     * 
     * @returns Aggregated parameter modifiers
     * 
     * @example
     * ```ts
     * // Internal usage - gets modifiers from all sources
     * const modifiers = this._getAggregatedModifiers();
     * console.log(modifiers[MAXHP]); // { value: 100, rate: 1.2 }
     * ```
     */
    private _getAggregatedModifiers(): { [key: string]: { value?: number, rate?: number } } {
        const params = {}
        const paramsAvg = {}
        
        const changeParam = (paramsModifier) => {
            for (let key in paramsModifier) {
                const { rate, value } = paramsModifier[key]
                if (!params[key]) params[key] = { rate: 0, value: 0 }
                if (!paramsAvg[key]) paramsAvg[key] = 0
                if (value) params[key].value += value
                if (rate !== undefined) params[key].rate += rate
                paramsAvg[key]++
            }
        }
        
        const getModifier = (prop) => {
            if (!isString(prop)) {
                changeParam(prop)
                return
            }
            for (let el of this[prop]()) {
                if (!el.paramsModifier) continue
                changeParam(el.paramsModifier)
            }
        }
        
        // Aggregate modifiers from all sources
        getModifier(this._paramsModifierSignal())
        getModifier('states')
        getModifier('equipments')
        
        // Average the rates
        for (let key in params) {
            params[key].rate /= paramsAvg[key]
        }
        
        return params
    }

     /** 
     * ```ts
     * player.initialLevel = 5
     * ``` 
     * 
     * The server retains this curve bound in saves and room transfers in both RPG and MMORPG modes.
     * @title Set initial level
     * @prop {number} player.initialLevel
     * @default 1
     * @memberof ParameterManager
     * */
    get initialLevel(): number { return this._initialLevelSignal() }
    set initialLevel(value: number) { this._initialLevelSignal.set(value) }

    /** 
     * ```ts
     * player.finalLevel = 50
     * ``` 
     * 
     * The server retains this curve bound in saves and room transfers in both RPG and MMORPG modes.
     * @title Set final level
     * @prop {number} player.finalLevel
     * @default 99
     * @memberof ParameterManager
     * */
    get finalLevel(): number { return this._finalLevelSignal() }
    set finalLevel(value: number) { this._finalLevelSignal.set(value) }

    /** 
     * With Object-based syntax, you can use following options:
     * - `basis: number`
     * - `extra: number`
     * - `accelerationA: number`
     * - `accelerationB: number`
     * @title Change Experience Curve
     * @prop {object} player.expCurve
     * @default 
     *  ```ts
     * {
     *      basis: 30,
     *      extra: 20,
     *      accelerationA: 30,
     *      accelerationB: 30
     * }
     * ```
     * @memberof ParameterManager
     * */
    public _expCurveSignal: RpgWritableSignal<string> = type(
        signal<string>(JSON.stringify(DEFAULT_EXP_CURVE)) as never,
        '_expCurveSignal',
        { persist: true },
        this as never
    ) as unknown as RpgWritableSignal<string>

    get expCurve(): ExpCurve { 
        const raw = this._expCurveSignal()
        if (!raw) return DEFAULT_EXP_CURVE

        try {
            return normalizeExpCurve(JSON.parse(raw))
        }
        catch {
            return DEFAULT_EXP_CURVE
        }
    }

    set expCurve(val: ExpCurve) {
        this._expCurveSignal.set(JSON.stringify(val)) 
    }
    
    /** 
     * Changes the health points
     * - Cannot exceed the MaxHP parameter
     * - Cannot have a negative value
     * - If the value is 0, a hook named `onDead()` is called in the RpgPlayer class.
     * 
     * ```ts
     * player.hp = 100
     * ``` 
     * @title Change HP
     * @prop {number} player.hp
     * @default MaxHPValue
     * @memberof ParameterManager
     * */
    set hp(val: number) {
        if (val > this.param[MAXHP]) {
            val = this.param[MAXHP]
        }
        else if (val <= 0) {
            this['execMethod']('onDead') 
            val = 0
        }
        this.hpSignal.set(val)
    }

    get hp(): number {
        return this.hpSignal()
    }

    /** 
     * Changes the skill points
     * - Cannot exceed the MaxSP parameter
     * - Cannot have a negative value
     * 
     * ```ts
     * player.sp = 200
     * ``` 
     * @title Change SP
     * @prop {number} player.sp
     * @default MaxSPValue
     * @memberof ParameterManager
     * */
    set sp(val: number) {
        if (val > this.param[MAXSP]) {
            val = this.param[MAXSP]
        }
        this.spSignal.set(val)
    }

    get sp(): number {
        return this.spSignal()
    }   

    /** 
     * Changing the player's experience. 
     * ```ts
     * player.exp += 100
     * ```
     * 
     * Levels are based on the experience curve.
     * 
     * ```ts
     * console.log(player.level) // 1
     * console.log(player.expForNextlevel) // 150
     * player.exp += 160
     * console.log(player.level) // 2
     * ```
     * 
     * @title Change Experience
     * @prop {number} player.exp
     * @default 0
     * @memberof ParameterManager
     * */
    set exp(val: number) {
        this._exp.set(val)
        const lastLevel = this.level
        while (this.expForNextlevel < this._exp()) {
            this.level += 1
        }
        //const hasNewLevel = player.level - lastLevel
    }

    get exp(): number {
        return this._exp()
    }

    /** 
     * Changing the player's level. 
     * 
     * ```ts
     * player.level += 1
     * ``` 
     * 
     * The level will be between the initial level given by the `initialLevel` and final level given by `finalLevel`
     * 
     * ```ts
     * player.finalLevel = 50
     * player.level = 60 
     * console.log(player.level) // 50
     * ```
     * 
     * @title Change Level
     * @prop {number} player.level
     * @default 1
     * @memberof ParameterManager
     * */
    set level(val: number) {
        const lastLevel = this._level()
        if (this.finalLevel && val > this.finalLevel) {
            val = this.finalLevel
        }
        const currentClass = this._class && this._class()
        if (currentClass && 'skillsToLearn' in currentClass && Array.isArray(currentClass.skillsToLearn)) {
            for (let i = this._level() ; i <= val; i++) {
                for (let skill of currentClass.skillsToLearn as any[]) {
                    if (skill.level == i) {
                        this['learnSkill'](skill.skill, {
                            source: skill.source ?? 'level',
                            level: i
                        })
                    }
                }
            }
        }
        const hasNewLevel = val - lastLevel
        if (hasNewLevel > 0) {
            this['execMethod']('onLevelUp', <any>[hasNewLevel])   
        }
        this._level.set(val)
        this['refreshHotbar']?.()
    }

    get level(): number {
        return this._level()
    }
     /** 
     * ```ts
     * console.log(player.expForNextlevel) // 150
     * ```
     * @title Experience for next level ?
     * @prop {number} player.expForNextlevel
     * @readonly
     * @memberof ParameterManager
     * */
    get expForNextlevel(): number {
        return this._expForLevel(this.level + 1)
    }

    /** 
     * Read the value of a parameter. Put the name of the parameter.
     * 
     * ```ts
     * import { Presets } from '@rpgjs/server'
     * 
     * const { MAXHP } = Presets 
     * 
     * console.log(player.param[MAXHP])
     * ```
     * 
     * > Possible to use the `player.getParamValue(name)` method instead
     * @title Get Param Value
     * @prop {object} player.param
     * @readonly
     * @memberof ParameterManager
     * */
    get param() {
        if (!this._paramProxy) {
            this._paramProxy = new Proxy({}, {
                get: (_target, property) => {
                    if (typeof property !== 'string') {
                        return undefined
                    }
                    return this._param()[property]
                },
                set: (_target, property, value) => {
                    if (typeof property !== 'string') {
                        return false
                    }
                    this.setParameter(property, value as ParameterValue)
                    return true
                },
                has: (_target, property) => {
                    if (typeof property !== 'string') {
                        return false
                    }
                    return property in this._param()
                },
                ownKeys: () => Reflect.ownKeys(this._param()),
                getOwnPropertyDescriptor: (_target, property) => {
                    if (typeof property !== 'string') {
                        return undefined
                    }
                    const parameters = this._param()
                    if (!(property in parameters)) {
                        return undefined
                    }
                    return {
                        configurable: true,
                        enumerable: true,
                        writable: true,
                        value: parameters[property]
                    }
                }
            }) as { [key: string]: number }
        }
        return this._paramProxy
    }

    get paramsModifier() {
        return this._paramsModifierSignal()
    }

    /** 
     * Changes the values of some parameters
     * 
     * > It is important that these parameters have been created beforehand with the `addParameter()` method.
     * > By default, the following settings have been created: 
     * - maxhp
     * - maxsp
     * - str
     * - int
     * - dex
     * - agi
     * 
     * **Object Key**
     * 
     * The key of the object is the name of the parameter
     * 
     * > The good practice is to retrieve the name coming from a constant
     * 
     * **Object Value**
     * 
     * The value of the key is an object containing: 
     * ``` 
     * {
     *   value: number,
     *   rate: number
     * }
     * ```
     * 
     * - value: Adds a number to the parameter
     * - rate: Adds a rate to the parameter
     * 
     * > Note that you can put both (value and rate)
     * 
     * In the case of a state or the equipment of a weapon or armor, the parameters will be changed but if the state disappears or the armor/weapon is de-equipped, then the parameters will return to the initial state.
     * 
     * @prop {Object} [paramsModifier]
     * @example
     * 
     * ```ts
     * import { Presets } from '@rpgjs/server'
     * 
     * const { MAXHP } = Presets
     * 
     * player.paramsModifier = {
     *      [MAXHP]: {
     *          value: 100
     *      }
     * }
     * ```
     * 
     * 1. Player has 741 MaxHp
     * 2. After changing the parameter, he will have 841 MaxHp
     * 
     * @title Set Parameters Modifier
     * @prop {number} paramsModifier
     * @memberof ParameterManager
     * */
    set paramsModifier(val: { 
        [key: string]: {
            value?: number,
            rate?: number
        }
    }) {
        this._paramsModifierSignal.set(val)
    }

    get parameters() {
        return this._parametersSignal()
    }

    set parameters(val) {
        const normalizedParameters: Record<string, ParameterCurve> = {}
        for (const [name, parameterValue] of Object.entries(val || {})) {
            normalizedParameters[name] = normalizeParameterCurve(parameterValue)
        }
        this._parametersSignal.set(normalizedParameters)
        if (MAXHP in normalizedParameters && this.hp > this.param[MAXHP]) {
            this.hp = this.param[MAXHP]
        }
        if (MAXSP in normalizedParameters && this.sp > this.param[MAXSP]) {
            this.sp = this.param[MAXSP]
        }
    }

    private _expForLevel(level: number): number {
        const {
            basis,
            extra,
            accelerationA,
            accelerationB
        } = this.expCurve
        return Math.round(basis * (Math.pow(level - 1, 0.9 + accelerationA / 250)) * level * (level + 1) / (6 + Math.pow(level, 2) / 50 / accelerationB) + (level - 1) * extra)
    }

    getParamValue(name: string): number | never {
        return this.param[name]
    }

    /** 
     * Give a new parameter. Give a start value and an end value. 
     * The start value will be set to the level set at `player.initialLevel` and the end value will be linked to the level set at `player.finalLevel`.
     * 
     * ```ts
     * const SPEED = 'speed'
     * 
     * player.addParameter(SPEED, {
     *     start: 10,
     *     end: 100
     * })
     * 
     * player.param[SPEED] // 10
     * player.level += 5
     * player.param[SPEED] // 14
     * ```
     * 
     * @title Add custom parameters
     * @method player.addParameter(name,curve)
     * @param {string} name - The name of the parameter
     * @param {object} curve - Scheme of the object: { start: number, end: number }
     * @returns {void}
     * @memberof ParameterManager
     * */
    setParameter(name: string, value: ParameterValue): void {
        const normalizedValue = normalizeParameterCurve(value)
        this._parametersSignal.mutate(parameters => {
            parameters[name] = {
                start: normalizedValue.start,
                end: normalizedValue.end
            }
        })
        const maxHp = this.param[MAXHP]
        const maxSp = this.param[MAXSP]
        if (name == MAXHP && this.hp > maxHp) {
            this.hp = maxHp // forcing hp not to exceed maxp 
        }
        else if (name == MAXSP && this.sp > maxSp) {
            this.sp = maxSp
        }
    }

    addParameter(name: string, { start, end }: { start: number, end: number }): void {
        this.setParameter(name, { start, end })
    }

    /** 
     * Gives back in percentage of health points to skill points
     * 
     * ```ts
     * import { Presets } from '@rpgjs/server'
     * 
     * const { MAXHP } = Presets 
     * 
     * console.log(player.param[MAXHP]) // 800
     * player.hp = 100
     * player.recovery({ hp: 0.5 }) // = 800 * 0.5
     * console.log(player.hp) // 400
     * ```
     * 
     * @title Recovery HP and/or SP
     * @method player.recovery(params)
     * @param {object} params - Scheme of the object: { hp: number, sp: number }. The values of the numbers must be in 0 and 1
     * @returns {void}
     * @memberof ParameterManager
     * */
    recovery({ hp, sp }: { hp?: number, sp?: number }) {
        if (hp) this.hp = this.param[MAXHP] * hp
        if (sp) this.sp = this.param[MAXSP] * sp
    }

    /** 
     * restores all HP and SP
     * 
     * ```ts
     * import { Presets } from '@rpgjs/server'
     * 
     * const { MAXHP, MAXSP } = Presets 
     * 
     * console.log(player.param[MAXHP], player.param[MAXSP]) // 800, 230
     * player.hp = 100
     * player.sp = 0
     * player.allRecovery()
     * console.log(player.hp, player.sp) // 800, 230
     * ```
     * 
     * @title All Recovery
     * @method player.allRecovery()
     * @returns {void}
     * @memberof ParameterManager
     * */
    allRecovery(): void {
        this.recovery({ hp: 1, sp: 1 })
    }
  } as unknown as TBase;
}
