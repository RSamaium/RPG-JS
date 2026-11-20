import type { ProjectileEmitOptions, RpgEvent, RpgPlayer } from "@rpgjs/server";
import type { AttackPattern, EnemyType, AiState } from "../ai.server";
import type { NormalizedActionBattleHitReactionProfile } from "../types";
import type {
  ActionBattleAiTreeContext,
  ActionBattleAiIntent,
  ActionBattleAiSimpleBehavior,
  ActionBattleAiTreeInput,
} from "./ai-behavior-tree";

export type ActionBattleEntity = RpgPlayer | RpgEvent;

export type ActionBattleTargetSelector =
  | "players"
  | "events"
  | "all"
  | "hostile"
  | string[]
  | ((context: ActionBattleTargetContext) => boolean);

export interface ActionBattleTargetContext {
  attacker: ActionBattleEntity;
  target: ActionBattleEntity;
  attackerFaction?: string;
  targetFaction?: string;
}

export interface ActionBattleTargetOptions {
  faction?: string;
  targets?: ActionBattleTargetSelector;
  getFaction?: (entity: ActionBattleEntity) => string | undefined;
  canTarget?: (context: ActionBattleTargetContext) => boolean;
}

export type ActionBattleActionMode = "instant" | "melee" | "projectile";

export type ActionBattleActionTarget = "enemy" | "ally" | "self" | "any";

export interface ActionBattleProjectileOptions
  extends Pick<
    ProjectileEmitOptions,
    "delay" | "landing"
  > {
  /**
   * Client renderer identifier. Without a component registered for it, the
   * standard RPGJS projectile component draws it from `params`.
   */
  type?: string;
  /** Serializable Studio media/spritesheet identifier rendered by the standard component. */
  graphic?: string;
  /** Visual scale used by the standard projectile component. */
  scale?: number;
  /** Rotate the projectile graphic toward its travel direction. */
  rotateToDirection?: boolean;
  speed?: number;
  range?: number;
  /**
   * Random direction offset in degrees, applied as +/- half this value.
   * Useful for less accurate ranged attacks.
   */
  spreadDegrees?: number;
  /**
   * Convenience precision value from 0 to 1. Ignored when `spreadDegrees` is set.
   * `1` is perfectly accurate, `0` can deviate up to 30 degrees.
   */
  accuracy?: number;
  trajectory?: any;
  direction?: { x: number; y: number };
  origin?: { x: number; y: number };
  collision?: any;
  repeat?: any;
  pattern?: any;
  payload?: Record<string, unknown>;
  params?: Record<string, unknown>;
  /** What the projectile collides with in flight: `always`, `walls` or `none`. */
  collide?: "always" | "walls" | "none";
  /** Fly through targets: `true`, or the maximum number of targets. */
  pierce?: boolean | number;
  /** Behavior against walls: `stop`, `bounce`, `return` or `stick`. */
  wall?: "stop" | "bounce" | "return" | "stick";
  /** Keep the projectile visible where it ended, such as a bomb fuse. */
  linger?: { ms: number };
  onImpact?: (
    context: ActionBattleProjectileImpactContext,
    action: ActionBattleUseContext
  ) => void;
}

/**
 * Area effect of an action, such as a bomb explosion. The targets are found
 * with `map.queryArea()` and hit through the Action Battle combat flow, with
 * less damage toward the edge.
 */
export interface ActionBattleAreaOptions {
  /** Radius of the circle, in pixels. */
  radius: number;
  /** Scale damage and knockback by the distance to the center. Defaults to `true`. */
  falloff?: boolean;
  /** Animation id shown at the center with `map.showAnimation()`. */
  animation?: string;
  /** Spritesheet id of the animation, when it is not the animation id. */
  graphic?: string;
  /** Hit the user too, like a bomb that catches its thrower. Defaults to `false`. */
  hitsUser?: boolean;
}

export interface ActionBattleActionConfig {
  target?: ActionBattleActionTarget;
  range?: number;
  cooldownMs?: number;
  mode?: ActionBattleActionMode;
  projectile?: Omit<ActionBattleProjectileOptions, "onImpact">;
  /**
   * Area effect. With `mode: "projectile"`, it is applied where the projectile
   * ends (after `linger`) instead of on the target it touches.
   */
  area?: ActionBattleAreaOptions;
  /**
   * Serializable client presentation hints for this action.
   * Gameplay remains authoritative on the server.
   */
  visual?: {
    /**
     * Legacy impact FX alias. Prefer `impactFx` for new integrations.
     * CanvasEngine built-in and custom preset names are supported.
     */
    fx?: string;
    /**
     * Particle preset displayed on the caster. Use `auto` for the default
     * `magicBurst` effect or `none` to disable it.
     */
    castFx?: string;
    /**
     * Continuous particle preset attached to a moving projectile.
     * Use `none` or `auto` to keep the projectile trail disabled.
     */
    trailFx?: string;
    /**
     * Particle preset displayed on impact. Use `auto` to infer the preset
     * from the result or `none` to disable impact particles.
     */
    impactFx?: string;
    /** Main damage-popup text color. */
    color?: string | number;
    /** Damage-popup outline color. */
    accentColor?: string | number;
    /** Scale applied to the impact particle effect. */
    scale?: number;
    /**
     * Id of an effect of the game, played from the caster to the target by
     * `skills.playEffect` (for example a Studio Visual Effect).
     */
    effect?: string;
    /** With `split`, `castEffect` plays on the caster and `impactEffect` on the target. */
    split?: boolean;
    castEffect?: string;
    impactEffect?: string;
  };
}

/**
 * Context given to `skills.playEffect` when a skill or a combat item is cast.
 * For an instant or melee action, the effect goes from the caster to the
 * target; for a projectile, the effect plays the launch and may give the
 * projectile its path and its look.
 */
export interface ActionBattleSkillEffectContext {
  /** `melee`, `instant` or `projectile` (the `mode` of the action). */
  mode?: ActionBattleActionMode;
  attacker: ActionBattleEntity;
  /** The first target, when there is one. */
  target?: ActionBattleEntity;
  /** The skill, when a skill is used. */
  skill?: any;
  /** The skill or item used. */
  usable?: any;
  /** The `action` of the skill or item. */
  action: ActionBattleActionConfig;
  visual: NonNullable<ActionBattleActionConfig["visual"]>;
}

/** What `skills.playEffect` played. */
export interface ActionBattleSkillEffectResult {
  /**
   * Wait before the hit of an instant or melee action without `onUse`, in ms,
   * so the damage lands when the effect reaches the target.
   */
  hitDelayMs?: number;
  /**
   * Projectile only: options merged into the projectile of the action (`type`,
   * `trajectory`, `pattern`, `pierce`, `wall`, `payload`, `params`...), so the
   * effect can give its path and its look.
   */
  projectile?: Partial<ActionBattleProjectileOptions>;
  /** An area that replaces the `area` of the action (a bomb exploding where it ends). */
  area?: ActionBattleAreaOptions;
}

/**
 * Serializable targeting metadata stored on a skill.
 *
 * `range` is expressed in map tiles. Projectile travel remains expressed in
 * world pixels through `ActionBattleProjectileOptions.range`.
 */
export interface ActionBattleSkillTargetingConfig {
  range?: number;
  aoeMask?: string[] | string;
}

export interface ActionBattleProjectileImpactContext {
  attacker: ActionBattleEntity;
  target?: ActionBattleEntity;
  projectile: any;
  hit: any;
  map: any;
}

export interface ActionBattleUseContext {
  attacker: ActionBattleEntity;
  user: ActionBattleEntity;
  target?: ActionBattleEntity | ActionBattleEntity[] | null;
  usable: any;
  skill?: any;
  weapon?: any;
  action?: ActionBattleActionConfig;
  pattern?: AttackPattern | string;
  defaultEffect(target?: ActionBattleEntity | ActionBattleEntity[] | null): any;
  damage(target?: ActionBattleEntity | null): any;
  heal(
    target: ActionBattleEntity | ActionBattleEntity[] | null | undefined,
    amount: number
  ): number;
  projectile(options?: ActionBattleProjectileOptions): any[];
  /** Hit every target in an area around `center` through the combat flow. */
  area(center: { x: number; y: number }, options: ActionBattleAreaOptions): any[];
}

export interface ActionBattleUsable {
  id?: string;
  _type?: string;
  action?: ActionBattleActionConfig;
  actionBattle?: ActionBattleActionConfig;
  key?: string;
  casterAnimation?: string;
  animation?: string;
  sound?: string;
  impactSound?: string;
  targeting?: ActionBattleSkillTargetingConfig;
  onUse?: (
    user: ActionBattleEntity,
    target: ActionBattleEntity | ActionBattleEntity[] | null | undefined,
    action: ActionBattleUseContext
  ) => any;
}

export interface ActionBattleHitbox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ActionBattleDirection {
  x: number;
  y: number;
}

export interface ActionBattleAttackContext {
  attacker: ActionBattleEntity;
  target?: ActionBattleEntity | null;
  direction?: string;
  skill?: any;
  pattern?: AttackPattern | string;
  map?: any;
  now: number;
}

export interface ActionBattleDamageContext {
  attacker: ActionBattleEntity;
  target: ActionBattleEntity;
  skill?: any;
  pattern?: AttackPattern | string;
  multiplier?: number;
}

export interface ActionBattleDamageResult {
  damage: number;
  defeated: boolean;
  raw?: any;
}

export interface ActionBattleKnockbackContext {
  attacker: ActionBattleEntity;
  target: ActionBattleEntity;
  damage: ActionBattleDamageResult;
  weapon?: any;
  multiplier?: number;
}

export interface ActionBattleKnockbackResult {
  force: number;
  duration: number;
  direction?: ActionBattleDirection;
}

export interface ActionBattleHitContext {
  attacker: ActionBattleEntity;
  target: ActionBattleEntity;
  skill?: any;
  pattern?: AttackPattern | string;
  damage?: ActionBattleDamageResult;
  knockback?: ActionBattleKnockbackResult;
  reaction?: NormalizedActionBattleHitReactionProfile;
  cancelled?: boolean;
  metadata?: Record<string, any>;
}

export interface ActionBattleHitResult {
  damage: number;
  knockbackForce: number;
  knockbackDuration: number;
  defeated: boolean;
  attacker: ActionBattleEntity;
  target: ActionBattleEntity;
  rawDamage?: any;
  reaction?: NormalizedActionBattleHitReactionProfile;
  cancelled?: boolean;
  metadata?: Record<string, any>;
  defense?: {
    kind: "guard" | "parry";
    staggerMs: number;
  };
}

export interface ActionBattleHitHooks {
  beforeHit?: (
    context: ActionBattleHitContext
  ) => ActionBattleHitContext | false | void;
  afterDamage?: (
    context: ActionBattleHitContext
  ) => ActionBattleHitContext | void;
  afterHit?: (result: ActionBattleHitResult) => void;
}

export interface ActionBattleCombatSystem {
  resolveHitboxes(context: ActionBattleAttackContext): ActionBattleHitbox[];
  resolveDamage(context: ActionBattleDamageContext): ActionBattleDamageResult;
  resolveKnockback(
    context: ActionBattleKnockbackContext
  ): ActionBattleKnockbackResult;
  hooks?: ActionBattleHitHooks;
}

export interface ActionBattleAiContext {
  event: RpgEvent;
  target: ActionBattleEntity | null;
  state: AiState;
  enemyType: EnemyType;
  distance: number | null;
  hpPercent: number | null;
  now: number;
}

export interface ActionBattleAiDecision {
  mode?: "assault" | "tactical" | "retreat";
  attackPatterns?: AttackPattern[];
  attackCooldown?: number;
  moveToCooldown?: number;
  intent?: ActionBattleAiIntent | ActionBattleAiIntent[];
  metadata?: Record<string, any>;
}

export type ActionBattleAiBehavior = (
  context: ActionBattleAiContext
) => ActionBattleAiDecision | void;

/**
 * Reusable authoritative action registered through `provideActionBattle()`.
 *
 * Returning `false` lets the AI continue to another fallback behavior.
 */
export type ActionBattleAiAction = (
  context: ActionBattleAiTreeContext,
  payload?: Readonly<Record<string, unknown>>
) => void | boolean;

export interface ActionBattleAiPreset {
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
  attackProfiles?: any;
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
  animations?: any;
  rewards?: any;
  autoAwardRewards?: boolean;
  onDefeated?: any;
}

export interface ActionBattleSystems {
  combat: ActionBattleCombatSystem;
  ai: {
    actions: Record<string, ActionBattleAiAction>;
    behaviors: Record<string, ActionBattleAiBehavior>;
    presets: Record<string, ActionBattleAiPreset>;
  };
}
