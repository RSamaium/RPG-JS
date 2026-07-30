import {
  Components,
  MAXHP,
  RpgEvent,
  RpgPlayer,
  type BarComponentOptions,
  type ComponentLayout,
} from "@rpgjs/server";
import {
  getActionBattleAnimationRemovalDelay,
  resolveActionBattleAnimation,
} from "./animations";
import { emitActionBattleClientVisual } from "./visual";
import { getActionBattleOptions } from "./config";
import { getActionBattleSystems } from "./core/context";
import { applyActionBattleHit } from "./core/hit";
import {
  isActionBattleEntityInvincible,
  setActionBattleInvincibility,
} from "./core/hit-reaction";
import {
  normalizeActionBattleEnemyAttackProfiles,
  type ActionBattleEnemyAttackProfileMap,
  type NormalizedActionBattleEnemyAttackProfileMap,
} from "./core/enemy-attack-profiles";
import {
  ActionBattleHitTracker,
  runActionBattleActiveHitbox,
  scheduleActionBattleStartup,
} from "./core/attack-runtime";
import { applyActionBattleAttackDirection } from "./attack-input";
import {
  executeActionBattleUse,
  getActionBattleActionConfig,
  getActionBattleActionRange,
} from "./core/action-use";
import { resolveActionBattleWeapon } from "./core/equipment";
import { withActionBattleAnimationUnlocked } from "./locomotion";
import { safeActionBattleDash } from "./movement";
import {
  acquireActionBattleAttackSlot,
  releaseActionBattleAttackSlot,
} from "./core/combat-director";
import {
  defineAiBehavior,
  defineAiTree,
  type ActionBattleAiIntent,
  type ActionBattleAiMemory,
  type ActionBattleAiSimpleBehavior,
  type ActionBattleAiTreeInput,
  type ActionBattleAiTreeNode,
} from "./core/ai-behavior-tree";
import type {
  ActionBattleAiBehavior,
  ActionBattleAiDecision,
  ActionBattleAiPreset,
  ActionBattleDamageResult,
  ActionBattleEntity,
  ActionBattleHitbox,
  ActionBattleTargetSelector,
} from "./core/contracts";
import {
  canActionBattleTarget,
  isActionBattlePlayer,
} from "./core/targets";
import type {
  NormalizedActionBattleAttackProfile,
  NormalizedActionBattleHitReactionProfile,
} from "./types";
import type { ActionBattleAnimationOptions } from "./types";
import { updateActionBattleThreat } from "./audio";

type RpgEventWithBattleAi = RpgEvent & {
  battleAi?: BattleAi;
};

type ResolvedMoveTarget =
  | {
      kind: "entity";
      target: ActionBattleEntity;
      id?: string;
      x?: number;
      y?: number;
      signature: string;
    }
  | {
      kind: "position";
      target: { x: number; y: number };
      x: number;
      y: number;
      signature: string;
    };

const resolveMoveCoordinate = (value: unknown): number | undefined => {
  const raw = typeof value === "function" ? (value as () => unknown)() : value;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : undefined;
};

const createMoveSignature = (x: number, y: number): string =>
  `position:${Math.round(x)}:${Math.round(y)}`;

export interface BattleAiRewardItem {
  item?: any;
  itemId?: string;
  amount?: number;
  chance?: number;
}

export interface BattleAiRewards {
  exp?: number;
  gold?: number;
  items?: Array<BattleAiRewardItem | string>;
  showNotification?: boolean;
}

export interface BattleAiDefeatReward {
  readonly awarded: boolean;
  giveTo(player?: RpgPlayer | null): void;
}

export interface BattleAiDefeatedContext {
  event: RpgEvent;
  attacker?: ActionBattleEntity;
  reward: BattleAiDefeatReward;
  remove: () => void;
}

export type BattleAiDefeatedCallback = (
  context: BattleAiDefeatedContext
) => void;

export type BattleAiLegacyDefeatedCallback = (
  event: RpgEvent,
  attacker?: ActionBattleEntity
) => void;

export interface BattleAiHealthBarOptions {
  /** Style forwarded to the standard RPGJS `Components.hpBar()` factory. */
  style?: BarComponentOptions;
  /** Optional label template. Use `null` to render only the bar. */
  text?: string | null;
  /** Layout forwarded to the entity's `componentsTop` block. */
  layout?: ComponentLayout;
}

export interface BattleAiDeathPresentationOptions {
  /** CanvasEngine FX preset emitted once when defeat starts. */
  effect?: string;
  /** Time the non-colliding sprite remains available to client visuals. */
  durationMs?: number;
  /** Particle scale forwarded to the visual preset. */
  scale?: number;
  /** Whether the impact preset should shake the local camera. */
  shake?: boolean;
}

const hasTopComponent = (event: RpgEventWithBattleAi, id: string) => {
  const raw = (event as any).componentsTop?.();
  if (!raw) return false;
  let data = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return false;
    }
  }
  const contains = (value: any): boolean => {
    if (Array.isArray(value)) return value.some(contains);
    if (!value || typeof value !== "object") return false;
    if (value.id === id) return true;
    return Object.values(value).some(contains);
  };
  return contains(data?.components ?? data);
};

export interface BattleAiBaseOptions {
  preset?: string | ActionBattleAiPreset;
  faction?: string;
  targets?: ActionBattleTargetSelector;
  enemyType?: EnemyType;
  attackCooldown?: number;
  visionRange?: number;
  attackRange?: number;
  dodgeChance?: number;
  dodgeCooldown?: number;
  fleeThreshold?: number;
  attackSkill?: any;
  attackPatterns?: AttackPattern[];
  attackProfiles?: ActionBattleEnemyAttackProfileMap;
  patrolWaypoints?: Array<{ x: number; y: number }>;
  groupBehavior?: boolean;
  moveToCooldown?: number;
  retreatCooldown?: number;
  poise?: number;
  hitstunMs?: number;
  invincibilityMs?: number;
  behavior?: {
    baseScore?: number;
    updateInterval?: number;
    minStateDuration?: number;
    assaultThreshold?: number;
    retreatThreshold?: number;
  };
  behaviorKey?: string;
  tree?: ActionBattleAiTreeInput;
  behaviorTree?: ActionBattleAiTreeInput;
  simpleBehavior?: ActionBattleAiSimpleBehavior;
  animations?: ActionBattleAnimationOptions;
  rewards?: BattleAiRewards;
  autoAwardRewards?: boolean;
  presentation?: {
    role?: "enemy" | "boss" | "hidden";
    name?: string;
    /**
     * Adds the standard RPGJS HP component above the rendered graphic.
     * Enabled by default for visible battle AI entities.
     */
    healthBar?: boolean | BattleAiHealthBarOptions;
    /**
     * Client-only defeat presentation. Gameplay collision and AI are disabled
     * immediately by the authoritative server.
     */
    death?: false | BattleAiDeathPresentationOptions;
    /** Optional battle track used while this enemy threatens a player. */
    music?: {
      battle?: string;
      priority?: number;
    };
  };
}

export interface BattleAiOptions extends BattleAiBaseOptions {
  /** Callback called when the AI is defeated */
  onDefeated?: BattleAiDefeatedCallback;
}

export interface BattleAiLegacyOptions extends BattleAiBaseOptions {
  /** @deprecated Use the context callback signature instead. */
  onDefeated?: BattleAiLegacyDefeatedCallback;
}

/**
 * Hit result data returned after applying damage
 * 
 * Contains information about the hit including damage dealt,
 * knockback parameters, and whether the target was defeated.
 * Used by hooks to customize hit behavior.
 * 
 * @example
 * ```ts
 * const hitResult: HitResult = {
 *   damage: 25,
 *   knockbackForce: 50,
 *   knockbackDuration: 300,
 *   defeated: false,
 *   attacker: this.event,
 *   target: player
 * };
 * ```
 */
export interface HitResult {
  /** Damage dealt to the target */
  damage: number;
  /** Knockback force applied (from weapon or default) */
  knockbackForce: number;
  /** Knockback duration in milliseconds */
  knockbackDuration: number;
  /** Whether the target was defeated */
  defeated: boolean;
  /** The entity that attacked */
  attacker: RpgEvent | RpgPlayer;
  /** The entity that was hit */
  target: RpgPlayer | RpgEvent;
  defense?: {
    kind: "guard" | "parry";
    staggerMs: number;
  };
}

const normalizeRewardItem = (
  item: BattleAiRewardItem | string
): BattleAiRewardItem => {
  if (typeof item === "string") {
    return { itemId: item, amount: 1, chance: 100 };
  }
  return {
    ...item,
    amount: item.amount ?? 1,
    chance: item.chance ?? 100,
  };
};

const getRewardItemRef = (item: BattleAiRewardItem) => item.item ?? item.itemId;

const getPlayerMap = (player: RpgPlayer) => {
  return typeof (player as any).getCurrentMap === "function"
    ? (player as any).getCurrentMap()
    : undefined;
};

const getRewardItemName = (inventoryItem: any, itemRef: any): string => {
  if (inventoryItem && typeof inventoryItem.name === "function") {
    return inventoryItem.name();
  }
  if (inventoryItem?.name) return inventoryItem.name;
  if (typeof itemRef === "string") return itemRef;
  if (itemRef?.name) return itemRef.name;
  if (itemRef?.id) return itemRef.id;
  return "item";
};

const createDefeatReward = (
  rewards: BattleAiRewards | undefined
): BattleAiDefeatReward => {
  let awarded = false;
  return {
    get awarded() {
      return awarded;
    },
    giveTo(player?: RpgPlayer | null) {
      if (!player || awarded || !rewards) return;
      awarded = true;

      const exp = rewards.exp ?? 0;
      const gold = rewards.gold ?? 0;
      if (exp > 0) player.exp += exp;
      if (gold > 0) player.gold += gold;

      if (rewards.showNotification && (exp > 0 || gold > 0)) {
        player.showNotification(`You won ${exp} experience and ${gold} gold`);
      }

      for (const rawItem of rewards.items ?? []) {
        const item = normalizeRewardItem(rawItem);
        const itemRef = getRewardItemRef(item);
        if (!itemRef) continue;
        if (Math.random() * 100 >= (item.chance ?? 100)) continue;

        const amount = item.amount ?? 1;
        const inventoryItem = player.addItem(itemRef, amount);
        if (rewards.showNotification) {
          const itemData =
            typeof itemRef === "string"
              ? getPlayerMap(player)?.database?.()?.[itemRef]
              : undefined;
          player.showNotification(
            `You won ${amount} ${getRewardItemName(inventoryItem, itemRef)}`,
            {
              icon: itemData?.icon,
            }
          );
        }
      }
    },
  };
};

/**
 * Hook options for customizing hit behavior
 * 
 * Allows overriding knockback parameters and adding custom effects
 * when a hit is applied.
 * 
 * @example
 * ```ts
 * const hooks: ApplyHitHooks = {
 *   onBeforeHit(result) {
 *     // Reduce knockback for armored enemies
 *     if (result.target.hasState('armored')) {
 *       result.knockbackForce *= 0.5;
 *     }
 *     return result;
 *   },
 *   onAfterHit(result) {
 *     // Add poison effect on hit
 *     if (Math.random() < 0.3) {
 *       result.target.addState('poison');
 *     }
 *   }
 * };
 * ```
 */
export interface ApplyHitHooks {
  /**
   * Called before the hit is applied
   * Can modify the hit result before damage and knockback
   * 
   * @param result - The hit result data
   * @returns Modified hit result or void to use original
   */
  onBeforeHit?: (result: HitResult) => HitResult | void;
  
  /**
   * Called after the hit is applied
   * Used for side effects like adding states, playing sounds, etc.
   * 
   * @param result - The final hit result data
   */
  onAfterHit?: (result: HitResult) => void;
}

/**
 * AI Debug Logger
 * 
 * Conditional logging utility for AI behavior debugging.
 * Enable by setting `AiDebug.enabled = true` or via environment variable `RPGJS_DEBUG_AI=1`
 * 
 * @example
 * ```ts
 * // Enable debug logging
 * AiDebug.enabled = true;
 * 
 * // Or filter by event ID
 * AiDebug.filterEventId = 'goblin-1';
 * ```
 */
export const AiDebug = {
  /** Enable/disable all AI debug logs */
  enabled:
    ((globalThis as { process?: { env?: Record<string, string> } }).process
      ?.env?.RPGJS_DEBUG_AI === "1") || false,
  
  /** Filter logs to a specific event ID (null = all events) */
  filterEventId: null as string | null,
  
  /** Log categories to enable (empty = all) */
  categories: [] as string[],
  
  /**
   * Log an AI debug message
   * 
   * @param category - Log category (e.g., 'state', 'attack', 'movement', 'damage')
   * @param eventId - Event ID for filtering
   * @param message - Log message
   * @param data - Optional additional data
   */
  log(category: string, eventId: string | undefined, message: string, data?: any): void {
    void category;
    void eventId;
    void message;
    void data;
  }
};

/**
 * AI State enumeration
 * 
 * Defines the different states an AI can be in, each with its own behavior.
 */
export enum AiState {
  Idle = "idle",
  Alert = "alert",
  Combat = "combat",
  Flee = "flee",
  Stunned = "stunned"
}

/**
 * Enemy Type enumeration
 * 
 * Defines different enemy archetypes with unique behaviors.
 * Stats (HP, ATK, etc.) should be set on the event itself via onInit.
 */
export enum EnemyType {
  Aggressive = "aggressive",
  Defensive = "defensive",
  Ranged = "ranged",
  Tank = "tank",
  Berserker = "berserker"
}

/**
 * Attack Pattern enumeration
 * 
 * Different attack patterns the AI can use.
 */
export enum AttackPattern {
  Melee = "melee",
  Combo = "combo",
  Charged = "charged",
  Zone = "zone",
  DashAttack = "dashAttack"
}

/**
 * Default knockback configuration
 * 
 * Used when no weapon is equipped or weapon doesn't specify knockback.
 */
export const DEFAULT_KNOCKBACK = {
  /** Default knockback force */
  force: 50,
  /** Default knockback duration in milliseconds */
  duration: 300
};

const mergeBattleAiPresetOptions = (
  options: BattleAiOptions | BattleAiLegacyOptions,
  seen: Set<string> = new Set()
): BattleAiOptions | BattleAiLegacyOptions => {
  if (!options.preset) return options;

  if (typeof options.preset === "string") {
    if (seen.has(options.preset)) {
      throw new Error(`Circular action battle AI preset: ${options.preset}`);
    }
    seen.add(options.preset);
  }

  const preset =
    typeof options.preset === "string"
      ? getActionBattleSystems().ai.presets[options.preset]
      : options.preset;

  if (!preset) {
    throw new Error(`Action battle AI preset not found: ${options.preset}`);
  }

  const resolvedPreset = mergeBattleAiPresetOptions(preset, seen);
  const { preset: _preset, ...overrides } = options;

  return {
    ...resolvedPreset,
    ...overrides,
    behavior: {
      ...resolvedPreset.behavior,
      ...overrides.behavior,
    },
    animations: {
      ...resolvedPreset.animations,
      ...overrides.animations,
    },
    rewards: {
      ...resolvedPreset.rewards,
      ...overrides.rewards,
    },
  } as BattleAiOptions | BattleAiLegacyOptions;
};

/**
 * Advanced Battle AI Controller for events
 *
 * This class provides intelligent combat behavior control for events.
 * It uses the existing RPGJS API for stats, skills, items, etc.
 * The AI only manages behavior - the event's stats should be configured
 * in onInit using standard RPGJS methods.
 *
 * ## Usage with RPGJS API
 * 
 * Configure the event stats using standard RPGJS methods:
 * - `this.hp = 100` - Set health
 * - `this.learnSkill(FireBall)` - Learn a skill
 * - `this.addItem(Potion, 3)` - Add items
 * - `this.equip(Sword)` - Equip items
 * - `this.setClass(WarriorClass)` - Set class
 * - `this.param[ATK] = 20` - Set parameters
 *
 * @example
 * ```ts
 * function GoblinEnemy() {
 *   return {
 *     name: "Goblin",
 *     onInit() {
 *       this.setGraphic("goblin");
 *       
 *       // Configure stats using RPGJS API
 *       this.hp = 80;
 *       this.param[ATK] = 15;
 *       this.param[PDEF] = 5;
 *       this.learnSkill(Slash);
 *       
 *       // Apply AI behavior
 *       new BattleAi(this, {
 *         enemyType: EnemyType.Aggressive,
 *         attackSkill: Slash
 *       });
 *     }
 *   };
 * }
 * ```
 */
export class BattleAi {
  private event: RpgEvent;
  private target: ActionBattleEntity | null = null;
  private lastAttackTime: number = 0;
  private updateInterval?: any;

  /**
   * Log AI debug message for this event
   */
  private debugLog(category: string, message: string, data?: any): void {
    AiDebug.log(category, this.event.id, message, data);
  }

  private traceLog(category: string, message: string, data?: any): void {
    void category;
    void message;
    void data;
  }

  private lockActionUntil(until: number, reason: string, data?: any): void {
    if (until <= this.actionLockedUntil) return;
    this.actionLockedUntil = until;
    this.traceLog("state", "action locked", {
      reason,
      lockedMs: Math.max(0, until - Date.now()),
      ...data,
    });
  }

  private lockForAttack(
    profile: NormalizedActionBattleAttackProfile,
    pattern: AttackPattern
  ): void {
    this.isMovingToTarget = false;
    this.event.stopMoveTo();
    this.lockActionUntil(Date.now() + profile.totalDurationMs, "attack", {
      pattern,
      totalDurationMs: profile.totalDurationMs,
      startupMs: profile.startupMs,
      activeMs: profile.activeMs,
      recoveryMs: profile.recoveryMs,
    });
  }

  // State machine
  private state: AiState = AiState.Idle;
  private stateStartTime: number = 0;
  private stunnedUntil: number = 0;

  // Enemy type and behavior
  private enemyType: EnemyType;
  private faction?: string;
  private targets: ActionBattleTargetSelector = "players";
  private attackCooldown: number = 1000;
  private visionRange: number = 150;
  private attackRange: number = 60;

  // Dodge system
  private dodgeChance: number = 0.2;
  private dodgeCooldown: number = 2000;
  private lastDodgeTime: number = 0;

  // Flee threshold (HP percentage)
  private fleeThreshold: number = 0.2;

  // Attack configuration
  private attackSkill: any | null; // Skill to use for attacks
  private attackPatterns: AttackPattern[];
  private attackProfiles: NormalizedActionBattleEnemyAttackProfileMap;
  private animations?: ActionBattleAnimationOptions;
  private lastAttackPattern: AttackPattern | null = null;
  private skillCooldowns = new Map<any, number>();
  private comboCount: number = 0;
  private comboMax: number = 3;
  private chargingAttack: boolean = false;

  // Group behavior
  private groupBehavior: boolean;
  private nearbyEnemies: BattleAi[] = [];
  private groupUpdateInterval: number = 0;

  // Patrol
  private patrolWaypoints: Array<{ x: number; y: number }> = [];
  private currentPatrolIndex: number = 0;

  // Damage tracking for retreat
  private lastHpCheck: number = 0;
  private recentDamageTaken: number = 0;
  private damageCheckInterval: number = 2000;

  // Movement state tracking to avoid redundant moveTo calls
  private isMovingToTarget: boolean = false;

  // Callback when AI is defeated
  private onDefeatedCallback?:
    | BattleAiDefeatedCallback
    | BattleAiLegacyDefeatedCallback;
  private rewards?: BattleAiRewards;
  private autoAwardRewards: boolean = true;
  private presentation: {
    role: "enemy" | "boss" | "hidden";
    name?: string;
    death: false | Required<BattleAiDeathPresentationOptions>;
    music?: { battle?: string; priority?: number };
  } = {
    role: "enemy",
    death: {
      effect: "explosionSmall",
      durationMs: 450,
      scale: 1.4,
      shake: true,
    },
  };
  private defeated: boolean = false;

  // Direction hysteresis to prevent animation flickering
  private lastFacingDirection: string | null = null;

  // Behavior gauge (0-100)
  private behaviorScore: number = 50;
  private behaviorMode: 'assault' | 'tactical' | 'retreat' = 'tactical';
  private behaviorLastUpdate: number = 0;
  private behaviorUpdateInterval: number = 400;
  private behaviorAssaultThreshold: number = 65;
  private behaviorRetreatThreshold: number = 35;
  private behaviorMinStateDuration: number = 600;
  private behaviorEnabled: boolean = false;

  // Movement throttling
  private moveToCooldown: number = 400;
  private lastMoveToTime: number = 0;
  private retreatCooldown: number = 600;
  private lastRetreatTime: number = 0;
  private actionLockedUntil: number = 0;
  private lastActionLockTraceTime: number = 0;
  private lastMoveToCooldownTraceTime: number = 0;
  private lastMoveToCooldownTraceSignature: string | null = null;
  private lastTargetMovementSkipTraceTime: number = 0;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private behaviorKey?: string;
  private behaviorTree?: ActionBattleAiTreeNode;
  private aiMemory: ActionBattleAiMemory = {};
  private poise: number = 0;
  private hitstunMs: number = 150;
  private invincibilityMs: number = 250;
  private visionShape?: any;
  private visionSetupRetries: number = 0;
  private maxVisionSetupRetries: number = 20;
  private destroyed: boolean = false;
  private lastNoTargetTraceTime: number = 0;

  /**
   * Create a new Battle AI Controller
   *
   * The AI controls behavior only. Stats should be set on the event
   * using standard RPGJS methods (hp, param, learnSkill, etc.)
   *
   * @param event - The event to control
   * @param options - AI behavior configuration
   *
   * @example
   * ```ts
   * // In your event's onInit
   * this.hp = 100;
   * this.param[ATK] = 20;
   * this.learnSkill(FireBall);
   * 
   * new BattleAi(this, {
   *   enemyType: EnemyType.Ranged,
   *   attackSkill: FireBall,
   *   visionRange: 200,
   *   fleeThreshold: 0.2
   * });
   * ```
   */
  constructor(event: RpgEventWithBattleAi, options?: BattleAiOptions);
  constructor(event: RpgEventWithBattleAi, options?: BattleAiLegacyOptions);
  constructor(
    event: RpgEventWithBattleAi,
    options: BattleAiOptions | BattleAiLegacyOptions = {}
  ) {
    options = mergeBattleAiPresetOptions(options);
    event.battleAi = this;
    this.event = event;

    // Set enemy type and apply behavior modifiers
    this.enemyType = options.enemyType || EnemyType.Aggressive;
    this.faction = options.faction;
    this.targets = options.targets ?? "players";
    this.behaviorKey = options.behaviorKey ?? this.enemyType;
    this.applyEnemyTypeBehavior(options);

    // Store attack skill reference
    this.attackSkill = options.attackSkill || null;
    this.animations = {
      ...getActionBattleOptions().animations,
      ...options.animations,
    };

    // Initialize attack patterns
    this.attackPatterns = options.attackPatterns || [
      AttackPattern.Melee,
      AttackPattern.Combo,
      AttackPattern.DashAttack
    ];
    this.attackProfiles = normalizeActionBattleEnemyAttackProfiles(
      options.attackProfiles
    );

    // Initialize group behavior
    this.groupBehavior = options.groupBehavior || false;

    // Initialize patrol
    this.patrolWaypoints = options.patrolWaypoints || [];
    this.currentPatrolIndex = 0;

    // Initialize defeat callback
    this.onDefeatedCallback = options.onDefeated;
    this.rewards = options.rewards;
    this.autoAwardRewards = options.autoAwardRewards ?? true;
    this.presentation = {
      role: options.presentation?.role ?? "enemy",
      name: options.presentation?.name,
      death:
        options.presentation?.death === false
          ? false
          : {
              effect: options.presentation?.death?.effect ?? "explosionSmall",
              durationMs: Math.max(
                0,
                options.presentation?.death?.durationMs ?? 450
              ),
              scale: Math.max(
                0,
                options.presentation?.death?.scale ?? 1.4
              ),
              shake: options.presentation?.death?.shake ?? true,
            },
      music: options.presentation?.music,
    };
    const healthBar = options.presentation?.healthBar;
    if (
      this.presentation.role !== "hidden" &&
      healthBar !== false &&
      !hasTopComponent(event, "rpg:hpBar")
    ) {
      const healthOptions =
        healthBar && typeof healthBar === "object" ? healthBar : {};
      const boss = this.presentation.role === "boss";
      const style: BarComponentOptions = {
        width: boss ? 104 : 68,
        height: boss ? 9 : 7,
        bgColor: "#17131b",
        fillColor: boss ? "#ff355d" : "#ef476f",
        borderColor: boss ? "#f8d57e" : "#ffffff",
        borderWidth: 1,
        borderRadius: 4,
        ...healthOptions.style,
      };
      event.mergeComponents?.(
        "top",
        [Components.hpBar(style, healthOptions.text ?? null)],
        {
          width: style.width,
          // Keep a small, scale-independent gap above the visible graphic.
          marginBottom: 4,
          ...healthOptions.layout,
        }
      );
    }

    // Behavior gauge settings
    if (options.behavior) {
      this.behaviorEnabled = true;
      if (options.behavior.baseScore !== undefined) {
        this.behaviorScore = options.behavior.baseScore;
      }
      if (options.behavior.updateInterval !== undefined) {
        this.behaviorUpdateInterval = options.behavior.updateInterval;
      }
      if (options.behavior.minStateDuration !== undefined) {
        this.behaviorMinStateDuration = options.behavior.minStateDuration;
      }
      if (options.behavior.assaultThreshold !== undefined) {
        this.behaviorAssaultThreshold = options.behavior.assaultThreshold;
      }
      if (options.behavior.retreatThreshold !== undefined) {
        this.behaviorRetreatThreshold = options.behavior.retreatThreshold;
      }
    }

    if (options.moveToCooldown !== undefined) {
      this.moveToCooldown = options.moveToCooldown;
    }
    if (options.retreatCooldown !== undefined) {
      this.retreatCooldown = options.retreatCooldown;
    }
    if (options.poise !== undefined) {
      this.poise = Math.max(0, options.poise);
    }
    if (options.hitstunMs !== undefined) {
      this.hitstunMs = Math.max(0, options.hitstunMs);
    }
    if (options.invincibilityMs !== undefined) {
      this.invincibilityMs = Math.max(0, options.invincibilityMs);
    }
    if (options.tree || options.behaviorTree) {
      this.behaviorTree = defineAiTree(options.tree ?? options.behaviorTree!);
    } else if (options.simpleBehavior) {
      this.behaviorTree = defineAiBehavior(options.simpleBehavior);
    }

    if (options.attackRange === undefined) {
      const actionRange = this.getCurrentActionRange();
      if (actionRange !== undefined) {
        this.attackRange = actionRange;
      }
    }

    // Setup AI systems
    this.scheduleVisionSetup();
    this.startAiBehaviorLoop();
    if (this.patrolWaypoints.length > 0) {
      this.startPatrol();
    }

    this.debugLog('init', `AI created (type=${this.enemyType}, visionRange=${this.visionRange}, attackRange=${this.attackRange})`);
  }

  getPresentation() {
    return { ...this.presentation };
  }

  /**
   * Apply enemy type-specific behavior modifiers
   * 
   * This only affects AI behavior (cooldowns, ranges, dodge).
   * Stats should be set on the event itself.
   */
  private applyEnemyTypeBehavior(options: {
    attackCooldown?: number;
    visionRange?: number;
    attackRange?: number;
    dodgeChance?: number;
    dodgeCooldown?: number;
    fleeThreshold?: number;
  }) {
    switch (this.enemyType) {
      case EnemyType.Aggressive:
        this.attackCooldown = options.attackCooldown ?? 600;
        this.visionRange = options.visionRange ?? 150;
        this.attackRange = options.attackRange ?? 50;
        this.dodgeChance = options.dodgeChance ?? 0.1;
        this.dodgeCooldown = options.dodgeCooldown ?? 3000;
        this.fleeThreshold = options.fleeThreshold ?? 0.15;
        break;

      case EnemyType.Defensive:
        this.attackCooldown = options.attackCooldown ?? 1500;
        this.visionRange = options.visionRange ?? 120;
        this.attackRange = options.attackRange ?? 60;
        this.dodgeChance = options.dodgeChance ?? 0.5;
        this.dodgeCooldown = options.dodgeCooldown ?? 1500;
        this.fleeThreshold = options.fleeThreshold ?? 0.3;
        break;

      case EnemyType.Ranged:
        this.attackCooldown = options.attackCooldown ?? 1200;
        this.visionRange = options.visionRange ?? 200;
        this.attackRange = options.attackRange ?? 120;
        this.dodgeChance = options.dodgeChance ?? 0.4;
        this.dodgeCooldown = options.dodgeCooldown ?? 2000;
        this.fleeThreshold = options.fleeThreshold ?? 0.25;
        break;

      case EnemyType.Tank:
        this.attackCooldown = options.attackCooldown ?? 2000;
        this.visionRange = options.visionRange ?? 100;
        this.attackRange = options.attackRange ?? 50;
        this.dodgeChance = 0;
        this.dodgeCooldown = options.dodgeCooldown ?? 5000;
        this.fleeThreshold = options.fleeThreshold ?? 0.1;
        break;

      case EnemyType.Berserker:
        this.attackCooldown = options.attackCooldown ?? 800;
        this.visionRange = options.visionRange ?? 180;
        this.attackRange = options.attackRange ?? 55;
        this.dodgeChance = options.dodgeChance ?? 0.15;
        this.dodgeCooldown = options.dodgeCooldown ?? 2500;
        this.fleeThreshold = options.fleeThreshold ?? 0.05;
        break;

      default:
        this.attackCooldown = options.attackCooldown ?? 1000;
        this.visionRange = options.visionRange ?? 150;
        this.attackRange = options.attackRange ?? 60;
        this.dodgeChance = options.dodgeChance ?? 0.2;
        this.dodgeCooldown = options.dodgeCooldown ?? 2000;
        this.fleeThreshold = options.fleeThreshold ?? 0.2;
    }
  }

  /**
   * Setup vision detection
   */
  private setupVision(): boolean {
    if (this.visionShape) return true;
    const map = this.event.getCurrentMap?.();
    if (
      map?.physic?.getEntityByUUID &&
      !map.physic.getEntityByUUID(this.event.id)
    ) {
      this.traceLog("vision", "physics body not ready", {
        retries: this.visionSetupRetries,
        hasMap: !!map,
      });
      return false;
    }

    const diameter = this.visionRange * 2;
    const shape = this.event.attachShape(`vision_${this.event.id}`, {
      radius: this.visionRange,
      width: diameter,
      height: diameter,
      angle: 360,
    });
    if (!shape) {
      this.traceLog("vision", "attachShape returned no shape", {
        retries: this.visionSetupRetries,
        visionRange: this.visionRange,
      });
      return false;
    }
    this.visionShape = shape;
    this.traceLog("vision", "vision attached", {
      shapeId: (shape as any)?.id,
      visionRange: this.visionRange,
    });
    return true;
  }

  private scheduleVisionSetup() {
    if (this.destroyed || this.setupVision()) return;
    if (this.visionSetupRetries >= this.maxVisionSetupRetries) {
      this.traceLog("vision", "vision setup gave up", {
        retries: this.visionSetupRetries,
      });
      return;
    }

    this.visionSetupRetries++;
    this.schedule(() => {
      if (this.destroyed || !this.event.getCurrentMap()) return;
      this.scheduleVisionSetup();
    }, 50);
  }

  /**
   * Start the AI behavior loop
   */
  private startAiBehaviorLoop() {
    const updateInterval = setInterval(() => {
      if (!this.event.getCurrentMap()) {
        this.destroy();
        return;
      }
      this.updateAiBehavior();
    }, 100);

    this.updateInterval = updateInterval;
  }

  /**
   * Change AI state with validated transitions
   */
  private changeState(newState: AiState) {
    if (newState === this.state) {
      return;
    }
    const validTransitions: Record<AiState, AiState[]> = {
      [AiState.Idle]: [AiState.Alert, AiState.Combat],
      [AiState.Alert]: [AiState.Idle, AiState.Combat],
      [AiState.Combat]: [AiState.Idle, AiState.Flee, AiState.Stunned],
      [AiState.Flee]: [AiState.Idle, AiState.Combat],
      [AiState.Stunned]: [AiState.Combat, AiState.Idle]
    };

    if (!validTransitions[this.state].includes(newState)) {
      this.debugLog('state', `INVALID transition ${this.state} -> ${newState}`);
      this.traceLog("state", "invalid transition", {
        from: this.state,
        to: newState,
      });
      return;
    }

    this.debugLog('state', `STATE change: ${this.state} -> ${newState}`);
    this.traceLog("state", "state change", {
      from: this.state,
      to: newState,
      targetId: this.target?.id,
    });
    this.state = newState;
    this.stateStartTime = Date.now();
    this.syncThreat();

    switch (newState) {
      case AiState.Idle:
        if (this.patrolWaypoints.length > 0) {
          this.startPatrol();
        }
        break;
      case AiState.Alert:
        this.event.stopMoveTo();
        break;
      case AiState.Combat:
        this.comboCount = 0;
        break;
      case AiState.Flee:
        if (this.target) {
          this.fleeFromTarget();
        }
        break;
      case AiState.Stunned:
        this.event.stopMoveTo();
        break;
    }
  }

  /**
   * Main AI behavior update loop
   */
  private updateAiBehavior() {
    const currentTime = Date.now();

    if (this.target && this.isTargetDefeated(this.target)) {
      this.debugLog('combat', `Target ${this.target.id} is defeated, returning to idle`);
      this.clearTarget();
      this.changeState(AiState.Idle);
      this.checkDamageTaken();
      return;
    }

    // Update group behavior
    if (this.groupBehavior) {
      this.updateGroupBehavior();
    }

    // Check if stunned
    if (this.state === AiState.Stunned) {
      if (currentTime >= this.stunnedUntil) {
        this.changeState(AiState.Combat);
      }
      return;
    }

    if (currentTime < this.actionLockedUntil) {
      if (this.target) this.faceTarget();
      if (currentTime - this.lastActionLockTraceTime > 250) {
        this.lastActionLockTraceTime = currentTime;
        this.traceLog("state", "waiting action recovery", {
          remainingMs: this.actionLockedUntil - currentTime,
          state: this.state,
          targetId: this.target?.id,
        });
      }
      this.checkDamageTaken();
      return;
    }

    // Berserker: faster attacks when HP is low
    if (this.enemyType === EnemyType.Berserker && this.event.param[MAXHP]) {
      const hpPercent = this.event.hp / this.event.param[MAXHP];
      const berserkerModifier = Math.max(0.3, hpPercent);
      this.attackCooldown = 800 * berserkerModifier;
    }

    // Update behavior gauge and state decision
    if (this.behaviorEnabled) {
      this.updateBehavior(currentTime);
    }

    if (!this.target && this.state === AiState.Idle) {
      const target = this.findNearestTarget();
      if (target) {
        this.engageTarget(target);
      }
    }

    const customBehaviorHandled = this.applyCustomBehavior(currentTime);
    if (customBehaviorHandled) {
      this.checkDamageTaken();
      return;
    }

    // State-specific behavior
    switch (this.state) {
      case AiState.Idle:
        this.updateIdleBehavior();
        break;
      case AiState.Alert:
        this.updateAlertBehavior();
        break;
      case AiState.Combat:
        this.updateCombatBehavior(currentTime);
        break;
      case AiState.Flee:
        this.updateFleeBehavior();
        break;
    }

    // Track damage for retreat decision
    this.checkDamageTaken();
  }

  /**
   * Update idle behavior (patrolling)
   */
  private updateIdleBehavior() {
    const target = this.findNearestTarget();
    if (target) {
      this.engageTarget(target);
      return;
    }

    if (this.patrolWaypoints.length > 0) {
      const waypoint = this.patrolWaypoints[this.currentPatrolIndex];
      const distance = this.getDistance(this.event, {
        x: () => waypoint.x,
        y: () => waypoint.y
      });

      if (distance < 10) {
        this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolWaypoints.length;
        this.startPatrol();
      }
    }
  }

  /**
   * Update alert behavior
   */
  private updateAlertBehavior() {
    if (this.target) {
      this.faceTarget();
      
      const distance = this.getDistance(this.event, this.target);
      this.traceLog("movement", "alert update", {
        targetId: this.target.id,
        distance,
        attackRange: this.attackRange,
        visionRange: this.visionRange,
        isMovingToTarget: this.isMovingToTarget,
      });
      if (distance <= this.attackRange * 1.5) {
        if (this.isMovingToTarget) {
          this.isMovingToTarget = false;
          this.event.stopMoveTo();
        }
        this.changeState(AiState.Combat);
      } else if (distance <= this.visionRange * 1.5) {
        if (!this.isMovingToTarget) {
          this.debugLog('movement', `Alert approach (dist=${distance.toFixed(1)}, attackRange=${this.attackRange})`);
          this.requestTargetMovement();
        }
      } else {
        this.debugLog('combat', `Alert target out of range (dist=${distance.toFixed(1)})`);
        this.clearTarget();
        this.changeState(AiState.Idle);
      }
    } else {
      this.changeState(AiState.Idle);
    }
  }

  /**
   * Update combat behavior
   */
  private updateCombatBehavior(currentTime: number) {
    if (!this.target) {
      this.debugLog('combat', 'No target, returning to idle');
      this.changeState(AiState.Idle);
      return;
    }

    const distance = this.getDistance(this.event, this.target);
    this.traceLog("combat", "combat update", {
      targetId: this.target.id,
      distance,
      attackRange: this.attackRange,
      visionRange: this.visionRange,
      isMovingToTarget: this.isMovingToTarget,
      behaviorEnabled: this.behaviorEnabled,
      behaviorMode: this.behaviorMode,
    });

    // Check if target is still in range
    if (distance > this.visionRange * 1.5) {
      this.debugLog('combat', `Target out of range (dist=${distance.toFixed(1)}, maxRange=${(this.visionRange * 1.5).toFixed(1)})`);
      this.clearTarget();
      this.changeState(AiState.Idle);
      return;
    }

    // Check flee threshold
    if (this.event.param[MAXHP]) {
      const hpPercent = this.event.hp / this.event.param[MAXHP];
      if (hpPercent <= this.fleeThreshold) {
        this.debugLog('combat', `HP low (${(hpPercent * 100).toFixed(0)}%), fleeing`);
        this.isMovingToTarget = false;
        this.changeState(AiState.Flee);
        return;
      }
    }

    // Try dodge
    if (this.canDodge() && this.shouldDodge()) {
      this.debugLog('combat', 'Attempting dodge');
      if (this.tryDodge()) {
        this.isMovingToTarget = false;
        return;
      }
    }

    if (this.behaviorEnabled) {
      if (this.behaviorMode === 'tactical') {
        this.handleTacticalMovement(distance);
      } else if (this.behaviorMode === 'assault') {
        this.handleAssaultMovement(distance);
      } else if (this.behaviorMode === 'retreat') {
        this.isMovingToTarget = false;
        this.fleeFromTarget();
        return;
      }
    }

    // Movement based on enemy type
    if (this.behaviorEnabled && this.behaviorMode === 'assault') {
      // Assault mode already handled movement
    } else if (this.behaviorEnabled && this.behaviorMode === 'tactical') {
      // Tactical mode already handled movement
    } else if (this.enemyType === EnemyType.Ranged) {
      if (distance < this.attackRange * 0.6) {
        this.debugLog('movement', `Retreating (dist=${distance.toFixed(1)}, minRange=${(this.attackRange * 0.6).toFixed(1)})`);
        this.isMovingToTarget = false;
        this.retreatFromTarget();
      } else if (distance > this.attackRange) {
        if (!this.isMovingToTarget) {
          this.debugLog('movement', `Moving to target (dist=${distance.toFixed(1)}, attackRange=${this.attackRange})`);
          this.requestTargetMovement();
        }
      } else {
        if (this.isMovingToTarget) {
          this.debugLog('movement', `In range, stopping (dist=${distance.toFixed(1)})`);
          this.isMovingToTarget = false;
          this.event.stopMoveTo();
        }
      }
    } else {
      if (distance > this.attackRange) {
        if (!this.isMovingToTarget) {
          this.debugLog('movement', `Moving to target (dist=${distance.toFixed(1)}, attackRange=${this.attackRange})`);
          this.requestTargetMovement();
        }
      } else {
        if (this.isMovingToTarget) {
          this.debugLog('movement', `In range, stopping (dist=${distance.toFixed(1)})`);
          this.isMovingToTarget = false;
          this.event.stopMoveTo();
        }
      }
    }

    // Attack if ready
    if (distance <= this.attackRange && this.isAttackReady(currentTime)) {
      if (!this.chargingAttack) {
        const director = getActionBattleOptions().ai?.director;
        if (
          director !== false &&
          !acquireActionBattleAttackSlot(
            this.event,
            this.target,
            director,
            currentTime
          )
        ) {
          this.faceTarget();
          this.handleTacticalMovement(distance);
          return;
        }
        this.debugLog('attack', `Attacking (dist=${distance.toFixed(1)}, cooldown=${this.attackCooldown}ms)`);
        this.selectAndPerformAttack();
        this.lastAttackTime = currentTime;
        const releaseTarget = this.target;
        this.schedule(
          () => releaseActionBattleAttackSlot(this.event, releaseTarget),
          typeof director === "object"
            ? director.slotDurationMs ?? 1200
            : 1200
        );
      }
    }
  }

  /**
   * Update flee behavior
   */
  private updateFleeBehavior() {
    if (!this.target) {
      this.changeState(AiState.Idle);
      return;
    }

    const distance = this.getDistance(this.event, this.target);

    // Check if HP recovered or target is far
    if (this.event.param[MAXHP]) {
      const hpPercent = this.event.hp / this.event.param[MAXHP];
      if (hpPercent > this.fleeThreshold * 1.5 || distance > this.visionRange * 2) {
        this.changeState(AiState.Combat);
        return;
      }
    }

    this.fleeFromTarget();
  }

  /**
   * Select and perform an attack pattern
   */
  private selectAndPerformAttack() {
    if (!this.target) return;

    // Continue combo if active
    if (this.comboCount > 0 && this.comboCount < this.comboMax) {
      this.debugLog('attack', `Continuing combo (${this.comboCount}/${this.comboMax})`);
      this.performComboAttack();
      return;
    }

    // Select pattern based on weights
    const pattern = this.selectAttackPattern();
    this.lastAttackPattern = pattern;
    this.debugLog('attack', `Selected pattern: ${pattern}`);
    this.performAttackPattern(pattern);
  }

  /**
   * Select attack pattern with weighted probability
   */
  private selectAttackPattern(): AttackPattern {
    const weights: Record<AttackPattern, number> = {
      [AttackPattern.Melee]: 40,
      [AttackPattern.Combo]: 25,
      [AttackPattern.Charged]: 15,
      [AttackPattern.Zone]: 10,
      [AttackPattern.DashAttack]: 10
    };

    // Adjust based on enemy type
    switch (this.enemyType) {
      case EnemyType.Aggressive:
        weights[AttackPattern.Combo] += 20;
        weights[AttackPattern.DashAttack] += 15;
        break;
      case EnemyType.Defensive:
        weights[AttackPattern.Charged] += 25;
        break;
      case EnemyType.Ranged:
        weights[AttackPattern.Zone] += 20;
        break;
      case EnemyType.Tank:
        weights[AttackPattern.Charged] += 30;
        weights[AttackPattern.Zone] += 15;
        break;
      case EnemyType.Berserker:
        weights[AttackPattern.Combo] += 35;
        break;
    }

    const distance = this.target
      ? this.getDistance(this.event, this.target)
      : this.attackRange;
    const candidates = this.selectAttackCandidates(distance);

    // Calculate selection
    let total = 0;
    const available: Array<{ pattern: AttackPattern; weight: number }> = [];
    
    candidates.forEach(p => {
      const weight = weights[p] || 10;
      total += weight;
      available.push({ pattern: p, weight });
    });

    let random = Math.random() * total;
    for (const item of available) {
      random -= item.weight;
      if (random <= 0) return item.pattern;
    }

    return candidates[0] || AttackPattern.Melee;
  }

  /**
   * Keep special attacks appropriate for the current distance and avoid
   * immediately repeating one when another pattern is available.
   */
  private selectAttackCandidates(distance: number): AttackPattern[] {
    const configured = Array.from(new Set(this.attackPatterns));
    if (configured.length <= 1) return configured;

    const closeRange = Math.min(this.attackRange * 0.8, 70);
    const dashRange = this.attackRange * 0.45;
    const distanceAware = configured.filter((pattern) => {
      if (pattern === AttackPattern.Zone) return distance <= closeRange;
      if (pattern === AttackPattern.DashAttack) return distance >= dashRange;
      return true;
    });
    const suitable = distanceAware.length > 0 ? distanceAware : configured;
    const varied = suitable.filter(
      (pattern) => pattern !== this.lastAttackPattern
    );
    return varied.length > 0 ? varied : suitable;
  }

  /**
   * Perform attack pattern
   */
  private performAttackPattern(pattern: AttackPattern) {
    switch (pattern) {
      case AttackPattern.Melee:
        this.performMeleeAttack();
        break;
      case AttackPattern.Combo:
        this.performComboAttack();
        break;
      case AttackPattern.Charged:
        this.performChargedAttack();
        break;
      case AttackPattern.Zone:
        this.performZoneAttack();
        break;
      case AttackPattern.DashAttack:
        this.performDashAttack();
        break;
    }
  }

  /**
   * Perform melee attack
   * Uses skill if configured, otherwise creates hitbox
   */
  private performMeleeAttack() {
    if (!this.target) return;
    const profile = this.getAttackProfile(AttackPattern.Melee);

    this.faceTarget({ force: true });
    this.lockForAttack(profile, AttackPattern.Melee);
    this.telegraphAttack(profile, AttackPattern.Melee);
    this.playAttackVisual(profile, AttackPattern.Melee);

    this.scheduleAttackStartup(profile, () => {
      this.executeMeleeAttack(profile, AttackPattern.Melee);
    });
  }

  private executeMeleeAttack(
    profile: NormalizedActionBattleAttackProfile,
    pattern: AttackPattern
  ) {
    if (!this.target || this.isTargetDefeated(this.target)) return;
    this.debugLog('attack', `Applying ${pattern} hit`);

    if (this.attackSkill) {
      const resolvedSkill = this.resolveUsable(this.attackSkill);
      const currentTime = Date.now();
      if (!this.isSkillReady(resolvedSkill, currentTime)) {
        this.performBasicHitbox(profile, pattern);
        return;
      }
      try {
        const handled = executeActionBattleUse({
          attacker: this.event,
          target: this.target,
          usable: resolvedSkill,
          skill: resolvedSkill,
          pattern,
          profile,
          playVisual: false,
        });
        if (handled) {
          this.markSkillUsed(resolvedSkill, currentTime);
        } else {
          this.performBasicHitbox(profile, pattern);
        }
      } catch (e) {
        // Skill failed (no SP, etc.) - fall back to basic attack
        this.performBasicHitbox(profile, pattern);
      }
      return;
    }

    const weapon = resolveActionBattleWeapon(this.event);
    if (
      weapon &&
      executeActionBattleUse({
        attacker: this.event,
        target: this.target,
        usable: weapon,
        weapon,
        pattern,
        profile,
        playVisual: false,
      })
    ) {
      return;
    }

    this.performBasicHitbox(profile, pattern);
  }

  /**
   * Perform basic hitbox attack when no skill is set
   */
  private performBasicHitbox(
    profile: NormalizedActionBattleAttackProfile = this.getAttackProfile(
      AttackPattern.Melee
    ),
    pattern: AttackPattern = AttackPattern.Melee
  ) {
    if (!this.target || this.isTargetDefeated(this.target)) return;

    const hitTracker = new ActionBattleHitTracker(profile.hitPolicy);
    runActionBattleActiveHitbox(
      { ...profile, startupMs: 0 },
      () => this.resolveBasicHitboxes(),
      (hitboxes) => {
        this.processHitboxHits(hitboxes, hitTracker, profile, pattern);
      },
      (scheduled, delay) => this.schedule(scheduled, delay)
    );
  }

  private resolveBasicHitboxes(): ActionBattleHitbox[] {
    if (!this.target || this.isTargetDefeated(this.target)) return [];

    const eventX = this.event.x();
    const eventY = this.event.y();
    const dx = this.target.x() - eventX;
    const dy = this.target.y() - eventY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) return [];

    const dirX = dx / dist;
    const dirY = dy / dist;

    return [{
      x: eventX + dirX * 30,
      y: eventY + dirY * 30,
      width: 40,
      height: 40,
    }];
  }

  private queryHitboxCandidates(hitboxes: ActionBattleHitbox[]) {
    const map = this.event.getCurrentMap();
    if (!map || typeof (map as any).queryHitbox !== "function") return [];

    const candidates = new Map<string, ActionBattleEntity>();
    for (const hitbox of hitboxes) {
      for (const hit of (map as any).queryHitbox(hitbox, {
        excludeIds: [this.event.id],
        kinds: ["players", "events"],
      })) {
        if (hit?.id) candidates.set(hit.id, hit);
      }
    }
    return Array.from(candidates.values());
  }

  private processHitboxHits(
    hitboxes: ActionBattleHitbox[],
    hitTracker: ActionBattleHitTracker,
    profile: NormalizedActionBattleAttackProfile,
    pattern: AttackPattern
  ) {
    for (const hit of this.queryHitboxCandidates(hitboxes)) {
      if (
        hit !== this.event &&
        this.canTarget(hit) &&
        !this.isTargetDefeated(hit) &&
        hitTracker.tryHit(hit)
      ) {
        this.applyHit(hit, undefined, profile, pattern);
      }
    }
  }

  /**
   * Apply hit to target using RPGJS damage system with knockback
   * 
   * Calculates damage using RPGJS formula, applies knockback based on
   * equipped weapon's knockbackForce property, and triggers visual effects.
   * Supports hooks for customizing behavior.
   * 
   * @param target - The player or entity being hit
   * @param hooks - Optional hooks for customizing hit behavior
   * @returns The hit result containing damage and knockback info
   * 
   * @example
   * ```ts
   * // Basic hit
   * this.applyHit(player);
   * 
   * // With custom hooks
   * this.applyHit(player, {
   *   onBeforeHit(result) {
   *     result.knockbackForce *= 1.5; // Increase knockback
   *     return result;
   *   },
   *   onAfterHit(result) {
   *     console.log(`Dealt ${result.damage} damage!`);
   *   }
   * });
   * ```
   */
  private applyHit(
    target: ActionBattleEntity,
    hooks?: ApplyHitHooks,
    profile: NormalizedActionBattleAttackProfile = this.getAttackProfile(
      AttackPattern.Melee
    ),
    pattern: AttackPattern = AttackPattern.Melee
  ): HitResult {
    if (this.isTargetDefeated(target)) {
      return {
        damage: 0,
        knockbackForce: 0,
        knockbackDuration: 0,
        defeated: true,
        attacker: this.event,
        target
      };
    }

    const resolved = applyActionBattleHit(getActionBattleSystems().combat, {
      attacker: this.event,
      target,
      pattern,
      reaction: profile.reaction,
      metadata: {
        damageMultiplier: profile.damageMultiplier,
        knockbackMultiplier: profile.knockbackMultiplier,
      },
    });
    let hitResult: HitResult = resolved;

    // Call onBeforeHit hook
    if (hooks?.onBeforeHit) {
      const modified = hooks.onBeforeHit(hitResult);
      if (modified) {
        hitResult = modified;
      }
    }

    if (hitResult.defense?.kind === "parry") {
      this.stagger(hitResult.defense.staggerMs, target);
    }

    // Visual feedback
    withActionBattleAnimationUnlocked(target, () => {
      emitActionBattleClientVisual({
        moment:
          hitResult.defense?.kind === "parry"
            ? "parry"
            : hitResult.defense?.kind === "guard"
              ? "block"
              : "hurt",
        entity: this.event,
        target,
        attacker: this.event,
        damage: hitResult.damage,
        result: hitResult,
      });
    });

    // Call onAfterHit hook
    if (hooks?.onAfterHit) {
      hooks.onAfterHit(hitResult);
    }

    const targetAi = (target as any).battleAi as BattleAi | undefined;
    if (targetAi && !resolved.cancelled) {
      targetAi.handleDamage(this.event, {
        damage: hitResult.damage,
        defeated: hitResult.defeated,
        raw: undefined,
        reaction: profile.reaction,
      });
    }

    return hitResult;
  }

  /**
   * Get knockback force from equipped weapon
   * 
   * Retrieves the knockbackForce property from the event's equipped weapon.
   * Falls back to DEFAULT_KNOCKBACK.force if no weapon or property is set.
   * 
   * @returns Knockback force value
   * 
   * @example
   * ```ts
   * // Weapon with knockbackForce: 80
   * const force = this.getWeaponKnockbackForce(); // 80
   * 
   * // No weapon equipped
   * const force = this.getWeaponKnockbackForce(); // 50 (default)
   * ```
   */
  private getWeaponKnockbackForce(): number {
    try {
      const equipments = (this.event as any).equipments?.() || [];
      for (const item of equipments) {
        const itemData = (this.event as any).databaseById?.(item.id());
        if (itemData?._type === 'weapon' && itemData.knockbackForce !== undefined) {
          return itemData.knockbackForce;
        }
      }
    } catch {
      // If error, return default
    }
    return DEFAULT_KNOCKBACK.force;
  }

  /**
   * Perform combo attack
   */
  private performComboAttack() {
    if (!this.target) return;

    this.comboCount++;
    const profile = this.getAttackProfile(AttackPattern.Combo);
    this.faceTarget({ force: true });
    this.lockForAttack(profile, AttackPattern.Combo);
    this.telegraphAttack(profile, AttackPattern.Combo);
    this.playAttackVisual(profile, AttackPattern.Combo);
    this.scheduleAttackStartup(profile, () => {
      this.executeMeleeAttack(profile, AttackPattern.Combo);
    });

    if (this.comboCount < this.comboMax) {
      this.schedule(() => {
        if (this.target && this.state === AiState.Combat) {
          this.performComboAttack();
        } else {
          this.comboCount = 0;
        }
      }, 300);
    } else {
      this.comboCount = 0;
    }
  }

  /**
   * Perform charged attack
   */
  private performChargedAttack() {
    if (!this.target) return;
    const profile = this.getAttackProfile(AttackPattern.Charged);

    this.chargingAttack = true;
    this.faceTarget({ force: true });
    this.lockForAttack(profile, AttackPattern.Charged);
    this.telegraphAttack(profile, AttackPattern.Charged);
    this.playAttackVisual(profile, AttackPattern.Charged, { repeat: 2 });

    this.scheduleAttackStartup(profile, () => {
      if (!this.target || this.state !== AiState.Combat) {
        this.chargingAttack = false;
        return;
      }
      this.executeMeleeAttack(profile, AttackPattern.Charged);
    });
    this.schedule(() => {
      this.chargingAttack = false;
    }, profile.totalDurationMs);
  }

  /**
   * Perform zone attack (360 degrees)
   */
  private performZoneAttack() {
    const profile = this.getAttackProfile(AttackPattern.Zone);
    this.lockForAttack(profile, AttackPattern.Zone);
    this.telegraphAttack(profile, AttackPattern.Zone);
    this.playAttackVisual(profile, AttackPattern.Zone);

    const eventX = this.event.x();
    const eventY = this.event.y();
    const radius = 50;

    const hitboxes: Array<{ x: number; y: number; width: number; height: number }> = [];
    const angles = [0, 90, 180, 270];

    angles.forEach(angle => {
      const rad = (angle * Math.PI) / 180;
      hitboxes.push({
        x: eventX + Math.cos(rad) * radius,
        y: eventY + Math.sin(rad) * radius,
        width: 40,
        height: 40,
      });
    });

    this.scheduleAttackStartup(profile, () => {
      const hitTracker = new ActionBattleHitTracker(profile.hitPolicy);
      runActionBattleActiveHitbox(
        { ...profile, startupMs: 0 },
        () => hitboxes,
        (activeHitboxes) => {
          this.processHitboxHits(
            activeHitboxes,
            hitTracker,
            profile,
            AttackPattern.Zone
          );
        },
        (scheduled, delay) => this.schedule(scheduled, delay)
      );
    });
  }

  /**
   * Perform dash attack
   */
  private performDashAttack() {
    if (!this.target || this.isTargetDefeated(this.target)) return;
    const profile = this.getAttackProfile(AttackPattern.DashAttack);

    const dx = this.target.x() - this.event.x();
    const dy = this.target.y() - this.event.y();
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) return;

    const dirX = dx / dist;
    const dirY = dy / dist;

    this.faceTarget({ force: true });
    this.lockForAttack(profile, AttackPattern.DashAttack);
    this.telegraphAttack(profile, AttackPattern.DashAttack);
    this.playAttackVisual(profile, AttackPattern.DashAttack);

    this.scheduleAttackStartup(profile, () => {
      if (!this.target || this.state !== AiState.Combat) return;
      safeActionBattleDash(this.event, { x: dirX, y: dirY }, 10, 200);
      this.schedule(() => {
        if (!this.target || this.state !== AiState.Combat) return;
        this.executeMeleeAttack(profile, AttackPattern.DashAttack);
      }, 200);
    });
  }

  private getAttackProfile(
    pattern: AttackPattern
  ): NormalizedActionBattleAttackProfile {
    return this.attackProfiles[
      pattern as keyof NormalizedActionBattleEnemyAttackProfileMap
    ] ?? this.attackProfiles.melee;
  }

  private playAttackVisual(
    profile: NormalizedActionBattleAttackProfile,
    pattern: AttackPattern,
    animationDefaults?: { animationName?: string; repeat?: number }
  ): void {
    const resolvedSkill = this.attackSkill
      ? this.resolveUsable(this.attackSkill)
      : undefined;
    const skillType = resolvedSkill?.skillType;
    const moment =
      profile.animationKey === "castSkill" ||
      profile.animationKey === "castSpell" ||
      skillType === "magical" ||
      skillType === "support" ||
      skillType === "healing"
        ? "castSkill"
        : "attack";

    withActionBattleAnimationUnlocked(this.event, () => {
      emitActionBattleClientVisual({
        moment,
        entity: this.event,
        target: this.target ?? undefined,
        pattern,
        skill: resolvedSkill,
        animations: this.animations,
        animationDefaults,
      });
    });
  }

  private telegraphAttack(
    profile: NormalizedActionBattleAttackProfile,
    pattern?: AttackPattern
  ) {
    if (profile.startupMs <= 0) return;
    emitActionBattleClientVisual({
      moment: "telegraph",
      entity: this.event,
      target: this.target ?? undefined,
      result: {
        durationMs: profile.startupMs,
        telegraphScale: profile.id.includes("zone")
          ? 1.6
          : profile.id.includes("charged")
            ? 1.3
            : 1,
        pattern,
      },
    });
    this.event.flash({
      type: 'tint',
      tint: 'white',
      duration: Math.min(profile.startupMs, 300),
      cycles: 1
    });
  }

  private scheduleAttackStartup(
    profile: NormalizedActionBattleAttackProfile,
    callback: () => void
  ) {
    return scheduleActionBattleStartup(profile, callback, (scheduled, delay) =>
      this.schedule(scheduled, delay)
    );
  }

  /**
   * Face the current target with hysteresis to prevent animation flickering
   * 
   * Uses multiple strategies to prevent flickering:
   * 1. When very close to target (collision), keep current direction
   * 2. When near diagonal, require significant difference to change
   * 3. Only change if direction is clearly wrong (opposite)
   */
  private faceTarget(options: { force?: boolean } = {}) {
    if (!this.target) return;

    const dx = this.target.x() - this.event.x();
    const dy = this.target.y() - this.event.y();
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Avoid undefined facing only when both entities are effectively stacked.
    // A larger dead-zone makes close melee targets keep stale directions after
    // knockback, so keep this threshold intentionally tiny.
    const minDistanceForDirectionChange = 4;
    if (this.lastFacingDirection && distance < minDistanceForDirectionChange) {
      return;
    }

    // Calculate the "ideal" direction
    let newDirection: string;
    if (absX >= absY) {
      newDirection = dx >= 0 ? 'right' : 'left';
    } else {
      newDirection = dy >= 0 ? 'down' : 'up';
    }

    // Hysteresis: only change direction if the difference is significant (> 20%)
    // This prevents flickering when the target is near diagonal
    const hysteresisThreshold = 0.2; // 20% difference required to change
    const ratio = absX > 0 || absY > 0 ? Math.min(absX, absY) / Math.max(absX, absY) : 0;
    
    // If ratio is close to 1 (diagonal), keep the current direction
    if (this.lastFacingDirection && ratio > (1 - hysteresisThreshold)) {
      // Near diagonal - keep current direction unless it's completely wrong
      // Only change if moving in the opposite direction
      const isOpposite = 
        (this.lastFacingDirection === 'left' && dx > 20) ||
        (this.lastFacingDirection === 'right' && dx < -20) ||
        (this.lastFacingDirection === 'up' && dy > 20) ||
        (this.lastFacingDirection === 'down' && dy < -20);
      
      if (!isOpposite) {
        return; // Keep current direction
      }
    }

    this.lastFacingDirection = newDirection;
    if (options.force) {
      applyActionBattleAttackDirection(this.event, newDirection as any);
    } else {
      this.event.changeDirection(newDirection as any);
    }
  }

  /**
   * Try to dodge
   */
  private tryDodge(): boolean {
    const currentTime = Date.now();

    if (currentTime - this.lastDodgeTime < this.dodgeCooldown) {
      this.debugLog('dodge', `Dodge on cooldown (${this.dodgeCooldown - (currentTime - this.lastDodgeTime)}ms remaining)`);
      return false;
    }
    if (Math.random() > this.dodgeChance) {
      this.debugLog('dodge', `Dodge roll failed (chance=${(this.dodgeChance * 100).toFixed(0)}%)`);
      return false;
    }
    if (!this.target) return false;

    const dx = this.target.x() - this.event.x();
    const dy = this.target.y() - this.event.y();
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) return false;

    // Perpendicular direction
    const dodgeDirX = -dy / dist;
    const dodgeDirY = dx / dist;
    const side = Math.random() > 0.5 ? 1 : -1;

    this.debugLog('dodge', `Dodging (dir=${side > 0 ? 'right' : 'left'})`);
    if (!safeActionBattleDash(this.event, { x: dodgeDirX * side, y: dodgeDirY * side }, 12, 300)) {
      return false;
    }
    this.lastDodgeTime = currentTime;

    // Counter-attack for defensive types
    if (this.enemyType === EnemyType.Defensive && Math.random() < 0.5) {
      this.debugLog('dodge', 'Counter-attack after dodge');
      this.schedule(() => {
        if (this.target && this.state === AiState.Combat) {
          this.selectAndPerformAttack();
        }
      }, 400);
    }
    return true;
  }

  private canDodge(): boolean {
    if (this.dodgeChance === 0) return false;
    return Date.now() - this.lastDodgeTime >= this.dodgeCooldown;
  }

  private shouldDodge(): boolean {
    if (!this.target) return false;
    const distance = this.getDistance(this.event, this.target);
    return distance < this.attackRange * 0.8;
  }

  /**
   * Flee from target
   */
  private fleeFromTarget() {
    if (!this.target) return;

    const dx = this.event.x() - this.target.x();
    const dy = this.event.y() - this.target.y();
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) return;

    const fleeTarget = {
      x: this.event.x() + (dx / dist) * 200,
      y: this.event.y() + (dy / dist) * 200
    };

    this.requestMoveTo(fleeTarget as any);
  }

  /**
   * Retreat from target (temporary)
   */
  private retreatFromTarget() {
    if (!this.target) return;
    const currentTime = Date.now();
    if (currentTime - this.lastRetreatTime < this.retreatCooldown) {
      return;
    }

    const dx = this.event.x() - this.target.x();
    const dy = this.event.y() - this.target.y();
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) return;

    if (!safeActionBattleDash(this.event, { x: dx / dist, y: dy / dist }, 8, 200)) {
      return;
    }
    this.lastRetreatTime = currentTime;
  }

  /**
   * Check damage taken for retreat decision
   */
  private checkDamageTaken() {
    const currentTime = Date.now();
    
    if (currentTime - this.lastHpCheck >= this.damageCheckInterval) {
      this.recentDamageTaken = 0;
      this.lastHpCheck = currentTime;
    }
  }

  /**
   * Start patrol
   */
  private startPatrol() {
    if (this.patrolWaypoints.length === 0) return;

    const waypoint = this.patrolWaypoints[this.currentPatrolIndex];
    this.requestMoveTo({ x: waypoint.x, y: waypoint.y } as any);
  }

  /**
   * Update group behavior
   */
  private updateGroupBehavior() {
    if (!this.groupBehavior) return;

    this.groupUpdateInterval++;
    if (this.groupUpdateInterval >= 20) {
      this.groupUpdateInterval = 0;
      this.findNearbyEnemies();
    }

    if (this.nearbyEnemies.length > 0 && this.target && this.state === AiState.Combat) {
      this.applyFormation();
    }
  }

  /**
   * Find nearby enemies
   */
  private findNearbyEnemies() {
    this.nearbyEnemies = [];
    const map = this.event.getCurrentMap();
    if (!map) return;

    const allEvents = Object.values(map.events());
    const groupRadius = 150;

    allEvents.forEach(event => {
      if (event === this.event) return;

      const ai = (event as any).battleAi as BattleAi;
      if (ai && ai.groupBehavior) {
        const distance = this.getDistance(this.event, event);
        if (distance <= groupRadius) {
          this.nearbyEnemies.push(ai);
        }
      }
    });
  }

  /**
   * Apply formation around target
   */
  private applyFormation() {
    if (!this.target || this.nearbyEnemies.length === 0) return;

    const totalEnemies = this.nearbyEnemies.length + 1;
    const angleStep = (2 * Math.PI) / totalEnemies;

    let ourIndex = 0;
    for (let i = 0; i < this.nearbyEnemies.length; i++) {
      if (this.nearbyEnemies[i].event.id < this.event.id) {
        ourIndex++;
      }
    }

    const angle = angleStep * ourIndex;
    const formationRadius = this.attackRange * 1.2;

    const formationX = this.target.x() + Math.cos(angle) * formationRadius;
    const formationY = this.target.y() + Math.sin(angle) * formationRadius;

    const distanceToFormation = Math.sqrt(
      Math.pow(this.event.x() - formationX, 2) +
      Math.pow(this.event.y() - formationY, 2)
    );

    if (distanceToFormation > 20) {
      this.requestMoveTo({ x: formationX, y: formationY } as any);
    }
  }

  /**
   * Handle player entering vision
   */
  onDetectInShape(target: ActionBattleEntity, shape: any) {
    const canTarget = this.canTarget(target);
    const defeated = this.isTargetDefeated(target);
    this.traceLog("vision", "detect in shape", {
      targetId: target?.id,
      shapeId: shape?.id,
      canTarget,
      defeated,
      state: this.state,
      targetHp: (target as any)?.hp,
    });
    if (!canTarget || defeated) return;
    this.debugLog('vision', `Target ${target.id} entered vision (state=${this.state})`);
    this.engageTarget(target);
  }

  private engageTarget(target: ActionBattleEntity) {
    this.traceLog("target", "engage target", {
      targetId: target.id,
      previousTargetId: this.target?.id,
      state: this.state,
      distance: this.getDistance(this.event, target),
    });
    const previousTarget = this.target;
    if (previousTarget && previousTarget !== target) {
      this.removeThreat(previousTarget);
    }
    this.target = target;

    if (this.state === AiState.Idle) {
      this.changeState(AiState.Alert);
    } else if (this.state === AiState.Alert) {
      this.changeState(AiState.Combat);
    }
    this.syncThreat();
  }

  /**
   * Handle player leaving vision
   */
  onDetectOutShape(target: ActionBattleEntity, shape: any) {
    this.debugLog('vision', `Target ${target.id} left vision (wasTarget=${this.target === target})`);
    this.traceLog("vision", "detect out shape", {
      targetId: target?.id,
      shapeId: shape?.id,
      wasTarget: this.target === target,
      state: this.state,
    });
    if (this.target === target) {
      this.clearTarget();
      this.changeState(AiState.Idle);
    }
  }

  /**
   * Handle taking damage (called from server.ts)
   * 
   * This triggers state changes like stun and flee check.
   * The actual damage is applied externally via RPGJS API.
   */
  takeDamage(attacker: ActionBattleEntity): boolean {
    if (this.defeated) return true;
    // Apply damage using RPGJS system
    const raw = this.event.applyDamage(attacker);
    return this.handleDamage(attacker, {
      damage: raw.damage ?? 0,
      defeated: this.event.hp <= 0,
      raw,
    });
  }

  /**
   * Interrupt this enemy with an authoritative stagger.
   *
   * Used by parries and heavy reactions. The visual is emitted separately so
   * games can replace the default presentation without changing AI ownership.
   */
  stagger(durationMs = 650, source?: ActionBattleEntity): void {
    if (this.defeated || this.destroyed) return;
    const duration = Math.max(0, durationMs);
    this.isMovingToTarget = false;
    this.event.stopMoveTo();
    this.stunnedUntil = Date.now() + duration;
    this.lockActionUntil(this.stunnedUntil, "stagger", {
      sourceId: source?.id,
      durationMs: duration,
    });
    this.changeState(AiState.Stunned);
    withActionBattleAnimationUnlocked(this.event, () => {
      emitActionBattleClientVisual({
        moment: "stagger",
        entity: this.event,
        target: this.event,
        attacker: source,
        pattern: "stagger",
        animations: this.animations,
      });
    });
  }

  handleDamage(
    attacker: ActionBattleEntity,
    damageResult: ActionBattleDamageResult & {
      reaction?: NormalizedActionBattleHitReactionProfile;
      skill?: any;
      metadata?: Record<string, any>;
    }
  ): boolean {
    if (this.defeated) return true;
    const damage = Number.isFinite(damageResult.damage) ? damageResult.damage : 0;
    this.debugLog('damage', `Took ${damage} damage from ${attacker.id} (HP: ${this.event.hp}/${this.event.param[MAXHP] || '?'})`);
    const canRetaliate = attacker ? this.canTarget(attacker) : false;
    const attackerDefeated = this.isTargetDefeated(attacker);
    this.traceLog("damage", "handle damage", {
      attackerId: attacker?.id,
      damage,
      defeated: damageResult.defeated,
      eventHp: this.event.hp,
      maxHp: this.event.param[MAXHP],
      state: this.state,
      canRetaliate,
      attackerDefeated,
      currentTargetId: this.target?.id,
    });

    // Visual feedback
    withActionBattleAnimationUnlocked(this.event, () => {
      emitActionBattleClientVisual({
        moment: "hurt",
        entity: this.event,
        target: this.event,
        attacker,
        damage,
        defeated: damageResult.defeated,
        result: damageResult,
        skill: damageResult.skill,
        animations: this.animations,
      });
    });

    // Track damage
    this.recentDamageTaken += damage;

    if (
      attacker &&
      this.canTarget(attacker) &&
      !this.isTargetDefeated(attacker) &&
      this.state !== AiState.Flee
    ) {
      this.traceLog("target", "retaliate against attacker", {
        attackerId: attacker.id,
        previousTargetId: this.target?.id,
        state: this.state,
      });
      this.target = attacker;
      if (this.state === AiState.Idle || this.state === AiState.Alert) {
        this.isMovingToTarget = false;
        this.changeState(AiState.Combat);
      }
    }

    const reaction = damageResult.reaction;
    const staggerPower = reaction?.staggerPower ?? damage;
    const hitstunMs = reaction?.hitstunMs ?? this.hitstunMs;
    const shouldStun =
      (damage > 0 || (reaction?.staggerPower ?? 0) > 0) &&
      staggerPower >= this.poise &&
      hitstunMs > 0;
    this.lockActionUntil(Date.now() + Math.max(220, hitstunMs + 120), "damage recovery", {
      attackerId: attacker?.id,
      damage,
      hitstunMs,
    });
    setActionBattleInvincibility(
      this.event,
      reaction?.invincibilityMs ?? this.invincibilityMs
    );

    // Brief stun
    if (shouldStun && this.state !== AiState.Stunned && this.state !== AiState.Flee) {
      this.debugLog('damage', 'Stunned from damage');
      this.isMovingToTarget = false;
      this.stunnedUntil = Date.now() + hitstunMs;
      this.changeState(AiState.Stunned);
    }

    // Check death
    if (damageResult.defeated || this.event.hp <= 0) {
      this.debugLog('damage', 'Defeated!');
      this.kill(attacker);
      return true;
    }

    return false;
  }

  /**
   * Kill this AI
   * 
   * Stops all movements, cleans up resources, calls the onDefeated hook,
   * and removes the event from the map.
   */
  private kill(attacker?: ActionBattleEntity) {
    if (this.defeated) return;
    this.defeated = true;
    this.removeThreat(this.target);
    releaseActionBattleAttackSlot(this.event);

    const dieAnimation = resolveActionBattleAnimation(
      "die",
      this.event,
      this.animations,
      {
        attacker,
      }
    );
    const deathPresentation = this.presentation.death;
    const animationDelay = getActionBattleAnimationRemovalDelay(dieAnimation);
    const removeDelay = Math.max(
      animationDelay,
      deathPresentation === false ? 0 : deathPresentation.durationMs
    );
    const reward = createDefeatReward(this.rewards);
    let removed = false;
    const remove = () => {
      if (removed) return;
      removed = true;
      this.event.remove({
        reason: "defeated",
        data: {
          animation: dieAnimation,
          deathPresentation,
        },
        transition: dieAnimation || deathPresentation !== false
          ? {
              animation: dieAnimation?.animationName,
              graphic: dieAnimation?.graphic,
              effect:
                deathPresentation === false
                  ? undefined
                  : deathPresentation.effect,
              duration: removeDelay,
            }
          : undefined,
        timeoutMs: removeDelay,
      });
    };

    if (this.autoAwardRewards && attacker && isActionBattlePlayer(attacker)) {
      reward.giveTo(attacker);
    }

    const context: BattleAiDefeatedContext = {
      event: this.event,
      attacker,
      reward,
      remove,
    };

    if (deathPresentation !== false) {
      const visualDelay = Math.max(0, animationDelay - 300);
      setTimeout(() => {
        emitActionBattleClientVisual({
          moment: "defeat",
          entity: this.event,
          target: this.event,
          attacker,
          result: {
            durationMs: deathPresentation.durationMs,
            metadata: {
              deathEffect: deathPresentation.effect,
              deathScale: deathPresentation.scale,
              deathShake: deathPresentation.shake,
            },
          },
          animations: this.animations,
        });
      }, visualDelay);
    }

    // Call onDefeated hook before cleanup. One-argument callbacks receive the
    // newer context object; two-argument callbacks keep the legacy signature.
    if (this.onDefeatedCallback) {
      if (this.onDefeatedCallback.length >= 2) {
        (
          this.onDefeatedCallback as (
            event: RpgEvent,
          attacker?: ActionBattleEntity
          ) => void
        )(this.event, attacker);
      } else {
        (this.onDefeatedCallback as (context: BattleAiDefeatedContext) => void)(
          context
        );
      }
    }

    this.destroy();
    remove();
  }

  /**
   * Get distance between entities
   */
  private getDistance(entity1: any, entity2: any): number {
    const dx = entity1.x() - entity2.x();
    const dy = entity1.y() - entity2.y();
    return Math.sqrt(dx * dx + dy * dy);
  }

  private resolveUsable(usable: any) {
    if (!usable) return usable;
    const id = typeof usable === "string" ? usable : usable.id;
    const learned = id ? (this.event as any).getSkill?.(id) : undefined;
    if (learned) return learned;
    try {
      return id ? (this.event as any).databaseById?.(id) ?? usable : usable;
    } catch {
      return usable;
    }
  }

  private getSkillCooldownKey(skill: any): any {
    const rawId =
      typeof skill?.id === "function" ? skill.id.call(skill) : skill?.id;
    return rawId ?? skill;
  }

  private getSkillCooldown(skill: any): number {
    const cooldown = getActionBattleActionConfig(skill)?.cooldownMs;
    return typeof cooldown === "number" && Number.isFinite(cooldown)
      ? Math.max(0, cooldown)
      : 0;
  }

  private isSkillReady(skill: any, currentTime: number): boolean {
    return currentTime >= (
      this.skillCooldowns.get(this.getSkillCooldownKey(skill)) ?? 0
    );
  }

  private markSkillUsed(skill: any, currentTime: number): void {
    const cooldown = this.getSkillCooldown(skill);
    if (cooldown <= 0) return;
    this.skillCooldowns.set(
      this.getSkillCooldownKey(skill),
      currentTime + cooldown
    );
  }

  private isAttackReady(currentTime: number): boolean {
    if (currentTime - this.lastAttackTime < this.attackCooldown) return false;
    if (!this.attackSkill) return true;
    return this.isSkillReady(this.resolveUsable(this.attackSkill), currentTime);
  }

  private getCurrentActionRange(): number | undefined {
    const skillRange = this.attackSkill
      ? getActionBattleActionRange(this.resolveUsable(this.attackSkill))
      : undefined;
    if (skillRange !== undefined) return skillRange;
    return getActionBattleActionRange(resolveActionBattleWeapon(this.event));
  }

  private canTarget(target: ActionBattleEntity): boolean {
    return canActionBattleTarget(
      this.event,
      target,
      this.targets,
      getActionBattleOptions().combat?.targets
    );
  }

  private findNearestTarget(): ActionBattleEntity | null {
    const map = this.event.getCurrentMap();
    if (!map) {
      this.traceLog("target", "find nearest skipped: no map");
      return null;
    }

    const candidates: ActionBattleEntity[] = [];
    map.getPlayers?.().forEach((player: RpgPlayer) => candidates.push(player));
    map.getEvents?.().forEach((event: RpgEvent) => candidates.push(event));

    let nearest: ActionBattleEntity | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const candidate of candidates) {
      if (!this.canTarget(candidate)) continue;
      const distance = this.getDistance(this.event, candidate);
      if (distance > this.visionRange) continue;
      if (distance < nearestDistance) {
        nearest = candidate;
        nearestDistance = distance;
      }
    }

    const now = Date.now();
    if (nearest) {
      this.traceLog("target", "nearest target found", {
        targetId: nearest.id,
        distance: nearestDistance,
        visionRange: this.visionRange,
        candidates: candidates.length,
      });
    } else if (now - this.lastNoTargetTraceTime > 1000) {
      this.lastNoTargetTraceTime = now;
      this.traceLog("target", "no target found", {
        visionRange: this.visionRange,
        candidates: candidates.map((candidate) => {
          const distance = this.getDistance(this.event, candidate);
          return {
            id: candidate.id,
            hp: (candidate as any).hp,
            canTarget: this.canTarget(candidate),
            defeated: this.isTargetDefeated(candidate),
            distance,
          };
        }),
      });
    }

    return nearest;
  }

  private isTargetDefeated(target: ActionBattleEntity | null | undefined): boolean {
    return !target || target.hp <= 0;
  }

  private clearTarget() {
    this.removeThreat(this.target);
    this.target = null;
    this.isMovingToTarget = false;
    this.event.stopMoveTo();
  }

  private updateBehavior(currentTime: number) {
    if (currentTime - this.behaviorLastUpdate < this.behaviorUpdateInterval) {
      return;
    }
    this.behaviorLastUpdate = currentTime;

    let score = this.behaviorScore;
    const maxHp = this.event.param[MAXHP];
    if (maxHp) {
      const hpPercent = this.event.hp / maxHp;
      score += (hpPercent - 0.5) * 40;
    }

    if (this.recentDamageTaken > 0) {
      score -= Math.min(30, this.recentDamageTaken * 0.5);
    }

    if (this.target) {
      const distance = this.getDistance(this.event, this.target);
      if (distance <= this.attackRange) {
        score += 10;
      } else if (distance > this.visionRange) {
        score -= 10;
      }
    }

    if (this.groupBehavior && this.nearbyEnemies.length > 0) {
      score += Math.min(15, this.nearbyEnemies.length * 5);
    }

    score = Math.max(0, Math.min(100, score));
    this.behaviorScore = score;

    const previousMode = this.behaviorMode;
    if (score >= this.behaviorAssaultThreshold) {
      this.behaviorMode = 'assault';
    } else if (score <= this.behaviorRetreatThreshold) {
      this.behaviorMode = 'retreat';
    } else {
      this.behaviorMode = 'tactical';
    }

    if (previousMode !== this.behaviorMode) {
      this.debugLog('state', `Behavior mode: ${previousMode} -> ${this.behaviorMode} (score=${score.toFixed(0)})`);
    }

    if (this.behaviorMode === 'retreat' && this.state === AiState.Combat) {
      if (currentTime - this.stateStartTime >= this.behaviorMinStateDuration) {
        this.isMovingToTarget = false;
        this.changeState(AiState.Flee);
      }
    } else if (this.behaviorMode === 'assault' && this.state === AiState.Flee) {
      if (currentTime - this.stateStartTime >= this.behaviorMinStateDuration) {
        this.changeState(AiState.Combat);
      }
    }
  }

  private applyCustomBehavior(currentTime: number): boolean {
    let handled = false;

    if (this.behaviorTree) {
      const result = this.behaviorTree.tick(this.createAiTreeContext(currentTime));
      if (result.decision) {
        handled = this.applyAiDecision(result.decision, currentTime) || handled;
      }
      if (result.intent) {
        handled = this.executeAiIntents(result.intent, currentTime) || handled;
      }
      if (result.status === "running") {
        handled = true;
      }
    }

    if (!this.behaviorKey) return handled;
    const behavior = getActionBattleSystems().ai.behaviors[this.behaviorKey];
    if (!behavior) return handled;
    const maxHp = this.event.param[MAXHP];
    const decision = behavior({
      event: this.event,
      target: this.target,
      state: this.state,
      enemyType: this.enemyType,
      distance: this.target ? this.getDistance(this.event, this.target) : null,
      hpPercent: maxHp ? this.event.hp / maxHp : null,
      now: currentTime,
    });
    if (!decision) return handled;
    return this.applyAiDecision(decision, currentTime) || handled;
  }

  private applyAiDecision(
    decision: ActionBattleAiDecision | ReturnType<ActionBattleAiBehavior>,
    currentTime: number
  ): boolean {
    if (!decision) return false;
    let handled = false;
    if (decision.attackCooldown !== undefined) {
      this.attackCooldown = decision.attackCooldown;
    }
    if (decision.moveToCooldown !== undefined) {
      this.moveToCooldown = decision.moveToCooldown;
    }
    if (decision.attackPatterns?.length) {
      this.attackPatterns = decision.attackPatterns;
    }
    if (decision.mode) {
      this.behaviorMode = decision.mode;
      this.behaviorEnabled = true;
    }
    if (decision.intent) {
      handled = this.executeAiIntents(decision.intent, currentTime);
    }
    return handled;
  }

  private createAiTreeContext(currentTime: number) {
    const maxHp = this.event.param[MAXHP];
    const distance = this.target ? this.getDistance(this.event, this.target) : null;
    return {
      event: this.event,
      target: this.target,
      state: this.state,
      enemyType: this.enemyType,
      distance,
      hpPercent: maxHp ? this.event.hp / maxHp : null,
      now: currentTime,
      self: {
        event: this.event,
        state: this.state,
        enemyType: this.enemyType,
        hpPercent: maxHp ? this.event.hp / maxHp : null,
        attackRange: this.attackRange,
      },
      targetInfo:
        this.target && distance !== null
          ? {
              entity: this.target,
              distance,
              inAttackRange: distance <= this.attackRange,
              visible: true,
            }
          : null,
      memory: this.aiMemory,
    };
  }

  private executeAiIntents(
    input: ActionBattleAiIntent | ActionBattleAiIntent[],
    currentTime: number
  ): boolean {
    const intents = Array.isArray(input) ? input : [input];
    let handled = false;
    for (const intent of intents) {
      handled = this.executeAiIntent(intent, currentTime) || handled;
    }
    return handled;
  }

  private executeAiIntent(
    intent: ActionBattleAiIntent,
    currentTime: number
  ): boolean {
    const consumes = intent.consume !== false;

    switch (intent.type) {
      case "setMode":
        this.behaviorMode = intent.mode;
        this.behaviorEnabled = true;
        return consumes;
      case "run": {
        const result = intent.callback(this.createAiTreeContext(currentTime));
        return result === false ? false : consumes;
      }
      case "visual":
        emitActionBattleClientVisual({
          moment: "ai",
          entity: this.event,
          target: this.target ?? undefined,
          visual: intent.visual,
        });
        return consumes;
      case "setSpeed":
        if (!Number.isFinite(intent.value) || intent.value < 0) return false;
        this.event.speed = intent.value;
        return consumes;
      case "moveToPoint":
        return this.requestMoveTo(intent.position) ? consumes : false;
      case "holdPosition":
        this.isMovingToTarget = false;
        this.event.stopMoveTo();
        return consumes;
      case "teleportTo":
        return this.executeTeleport(intent.position, consumes);
      case "teleportNearTarget": {
        if (!this.target) return false;
        const distance = intent.options.distance;
        if (!Number.isFinite(distance) || distance < 0) return false;
        const angleDegrees =
          intent.options.angleDegrees ?? Math.random() * 360;
        if (!Number.isFinite(angleDegrees)) return false;
        const angle = (angleDegrees * Math.PI) / 180;
        return this.executeTeleport(
          {
            x: this.target.x() + Math.cos(angle) * distance,
            y: this.target.y() + Math.sin(angle) * distance,
          },
          consumes
        );
      }
      case "callAction": {
        const registeredAction =
          getActionBattleSystems().ai.actions[intent.name];
        if (!registeredAction) return false;
        const result = registeredAction(
          this.createAiTreeContext(currentTime),
          intent.payload
        );
        return result === false ? false : consumes;
      }
      case "idle":
        this.isMovingToTarget = false;
        this.event.stopMoveTo();
        return consumes;
      case "patrol":
        this.startPatrol();
        return consumes;
      case "faceTarget":
        this.faceTarget();
        return consumes;
      case "moveToTarget":
        if (!this.target) return false;
        this.requestTargetMovement();
        return consumes;
      case "fleeFromTarget":
        if (!this.target) return false;
        this.isMovingToTarget = false;
        if (this.state === AiState.Combat) {
          this.changeState(AiState.Flee);
        } else {
          this.fleeFromTarget();
        }
        return consumes;
      case "keepDistance":
        return this.executeKeepDistance(intent, consumes);
      case "useAttack":
        return this.executeRequestedAttack(intent.pattern, currentTime, consumes);
      case "useSkill":
        return this.executeRequestedSkill(intent.skill, currentTime, consumes);
    }
  }

  private executeTeleport(
    position: { x: number; y: number },
    consumes: boolean
  ): boolean {
    if (
      !Number.isFinite(position.x) ||
      !Number.isFinite(position.y) ||
      typeof this.event.teleport !== "function"
    ) {
      return false;
    }
    this.isMovingToTarget = false;
    this.event.stopMoveTo();
    void this.event.teleport(position);
    return consumes;
  }

  private executeKeepDistance(
    intent: Extract<ActionBattleAiIntent, { type: "keepDistance" }>,
    consumes: boolean
  ): boolean {
    if (!this.target) return false;
    const tolerance = intent.tolerance ?? Math.max(8, intent.distance * 0.15);
    const distance = this.getDistance(this.event, this.target);
    if (distance < intent.distance - tolerance) {
      this.isMovingToTarget = false;
      this.retreatFromTarget();
      return consumes;
    }
    if (distance > intent.distance + tolerance) {
      this.requestTargetMovement();
      return consumes;
    }
    if (this.isMovingToTarget) {
      this.isMovingToTarget = false;
      this.event.stopMoveTo();
    }
    return consumes;
  }

  private executeRequestedAttack(
    pattern: AttackPattern | string | undefined,
    currentTime: number,
    consumes: boolean
  ): boolean {
    if (!this.target || this.isTargetDefeated(this.target) || this.chargingAttack) return false;
    const distance = this.getDistance(this.event, this.target);
    if (distance > this.attackRange) return false;
    if (!this.isAttackReady(currentTime)) return false;

    if (pattern) {
      this.performAttackPattern(pattern as AttackPattern);
    } else {
      this.selectAndPerformAttack();
    }
    this.lastAttackTime = currentTime;
    return consumes;
  }

  private executeRequestedSkill(
    skill: any,
    currentTime: number,
    consumes: boolean
  ): boolean {
    if (!this.target || this.isTargetDefeated(this.target) || !skill) return false;
    const distance = this.getDistance(this.event, this.target);
    const resolvedSkill = this.resolveUsable(skill);
    const range = getActionBattleActionRange(resolvedSkill) ?? this.attackRange;
    if (distance > range) return false;
    if (currentTime - this.lastAttackTime < this.attackCooldown) return false;
    if (!this.isSkillReady(resolvedSkill, currentTime)) return false;

    const handled = executeActionBattleUse({
      attacker: this.event,
      target: this.target,
      usable: resolvedSkill,
      skill: resolvedSkill,
      profile: this.getAttackProfile(AttackPattern.Melee),
    });
    if (!handled) return false;
    this.markSkillUsed(resolvedSkill, currentTime);
    this.lastAttackTime = currentTime;
    return consumes;
  }

  private handleTacticalMovement(distance: number) {
    if (!this.target) return;
    const minRange = this.attackRange * 0.7;
    const maxRange = this.attackRange * 1.2;

    if (distance < minRange) {
      this.debugLog('movement', `Tactical retreat (dist=${distance.toFixed(1)}, minRange=${minRange.toFixed(1)})`);
      this.isMovingToTarget = false;
      this.retreatFromTarget();
      return;
    }

    if (distance > maxRange) {
      if (!this.isMovingToTarget) {
        this.debugLog('movement', `Tactical approach (dist=${distance.toFixed(1)}, maxRange=${maxRange.toFixed(1)})`);
        this.requestTargetMovement();
      }
      return;
    }

    if (this.isMovingToTarget) {
      this.debugLog('movement', `Tactical hold (dist=${distance.toFixed(1)})`);
      this.isMovingToTarget = false;
      this.event.stopMoveTo();
    }
  }

  private handleAssaultMovement(distance: number) {
    if (!this.target) return;
    if (distance > this.attackRange) {
      if (!this.isMovingToTarget) {
        this.debugLog('movement', `Assault approach (dist=${distance.toFixed(1)}, attackRange=${this.attackRange})`);
        this.requestTargetMovement();
      }
      return;
    }

    if (this.isMovingToTarget) {
      this.debugLog('movement', `Assault hold (dist=${distance.toFixed(1)})`);
      this.isMovingToTarget = false;
      this.event.stopMoveTo();
    }
  }

  private resolveMoveTarget(target: any): ResolvedMoveTarget | null {
    if (!target) return null;

    const targetId =
      target.id !== undefined && target.id !== null ? String(target.id) : undefined;
    const x = resolveMoveCoordinate(target.x);
    const y = resolveMoveCoordinate(target.y);

    if (targetId) {
      return {
        kind: "entity",
        target,
        id: targetId,
        x,
        y,
        signature: `entity:${targetId}`,
      };
    }

    if (x === undefined || y === undefined) {
      return null;
    }

    return {
      kind: "position",
      target: { x, y },
      x,
      y,
      signature: createMoveSignature(x, y),
    };
  }

  private requestMoveTo(target: any): boolean {
    const currentTime = Date.now();
    const resolvedTarget = this.resolveMoveTarget(target);
    if (!resolvedTarget) {
      this.traceLog("movement", "moveTo skipped: invalid target", {
        target,
      });
      return false;
    }

    if (currentTime - this.lastMoveToTime < this.moveToCooldown) {
      if (
        this.lastMoveToCooldownTraceSignature !== resolvedTarget.signature ||
        currentTime - this.lastMoveToCooldownTraceTime > 1000
      ) {
        this.lastMoveToCooldownTraceTime = currentTime;
        this.lastMoveToCooldownTraceSignature = resolvedTarget.signature;
        this.traceLog("movement", "moveTo skipped: cooldown", {
          targetKind: resolvedTarget.kind,
          targetId:
            resolvedTarget.kind === "entity" ? resolvedTarget.id : undefined,
          targetPosition: {
            x: resolvedTarget.x,
            y: resolvedTarget.y,
          },
          elapsed: currentTime - this.lastMoveToTime,
          moveToCooldown: this.moveToCooldown,
        });
      }
      return false;
    }
    const map = this.event.getCurrentMap?.() as any;
    const hasBody =
      !!map?.physic?.getEntityByUUID?.(this.event.id) ||
      !!map?.getBody?.(this.event.id);
    this.traceLog("movement", "moveTo requested", {
      targetKind: resolvedTarget.kind,
      targetId:
        resolvedTarget.kind === "entity" ? resolvedTarget.id : undefined,
      eventPosition: {
        x: this.event.x?.(),
        y: this.event.y?.(),
      },
      targetPosition: {
        x: resolvedTarget.x,
        y: resolvedTarget.y,
      },
      hasMap: !!map,
      hasMovementBody: hasBody,
    });
    this.event.moveTo(resolvedTarget.target as any);
    this.lastMoveToTime = currentTime;
    return true;
  }

  private requestTargetMovement(target: ActionBattleEntity | null = this.target): boolean {
    if (!target) {
      this.traceLog("movement", "target movement skipped: no target");
      return false;
    }
    const started = this.requestMoveTo(target);
    if (started) {
      this.isMovingToTarget = true;
    } else {
      const now = Date.now();
      if (now - this.lastTargetMovementSkipTraceTime > 1000) {
        this.lastTargetMovementSkipTraceTime = now;
        this.traceLog("movement", "target movement did not start", {
          targetId: target.id,
          isMovingToTarget: this.isMovingToTarget,
        });
      }
    }
    return started;
  }

  private schedule(callback: () => void, delay: number) {
    const timer = setTimeout(() => {
      this.timers = this.timers.filter((entry) => entry !== timer);
      if (this.destroyed) return;
      callback();
    }, delay);
    this.timers.push(timer);
    return timer;
  }

  // Public getters
  getHealth(): number { return this.event.hp; }
  getMaxHealth(): number { return this.event.param[MAXHP]; }
  getTarget(): ActionBattleEntity | null { return this.target; }
  getState(): AiState { return this.state; }
  getFaction(): string | undefined {
    return this.faction;
  }
  setFaction(faction: string | undefined): void {
    this.faction = faction;
  }
  getTargets(): ActionBattleTargetSelector {
    return this.targets;
  }
  setTargets(targets: ActionBattleTargetSelector): void {
    this.targets = targets;
    if (this.target && !this.canTarget(this.target)) {
      this.clearTarget();
      this.changeState(AiState.Idle);
    }
  }
  getEnemyType(): EnemyType { return this.enemyType; }

  private syncThreat() {
    if (!this.target) return;
    const active =
      !this.destroyed &&
      !this.defeated &&
      this.state !== AiState.Idle;
    updateActionBattleThreat(this.event, this.target as any, active, {
      enemyId: this.event.id,
      music: this.presentation.music?.battle,
      priority: this.presentation.music?.priority,
      boss: this.presentation.role === "boss",
    });
  }

  private removeThreat(target: ActionBattleEntity | null | undefined) {
    updateActionBattleThreat(this.event, target as any, false, {
      enemyId: this.event.id,
    });
  }

  /**
   * Clean up
   */
  destroy() {
    this.removeThreat(this.target);
    this.destroyed = true;
    releaseActionBattleAttackSlot(this.event, this.target);
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }
    this.target = null;
    this.nearbyEnemies = [];
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers = [];
  }
}
