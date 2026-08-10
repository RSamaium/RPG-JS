import type {
  ClientVisualContext,
  ClientVisualHelpers,
} from "@rpgjs/client";
import type { RpgPlayer } from "@rpgjs/server";
import type {
  ActionBattleAiVisual,
} from "./core/ai-behavior-tree";
import type {
  ActionBattleAiAction,
  ActionBattleAiBehavior,
  ActionBattleAiPreset,
  ActionBattleTargetOptions,
  ActionBattleCombatSystem,
  ActionBattleHitHooks,
  ActionBattleHitbox,
} from "./core/contracts";

export type ActionBattleAoeMask = string[] | string;

/** Legacy Action Battle bar content filter. Prefer the generic `ui.hotbar`. */
export type ActionBattleActionBarMode = "items" | "skills" | "both";

export type ActionBattleTargetingAffects = "events" | "players" | "both";

export type ActionBattleAnimationKey =
  | "attack"
  | "hurt"
  | "die"
  | "castSkill"
  | "castSpell"
  | "guard"
  | "parry"
  | "stagger";

export type ActionBattleAnimationResult =
  | string
  | {
      animationName?: string;
      graphic?: string | string[];
      repeat?: number;
      waitEnd?: boolean;
      delayMs?: number;
    }
  | null
  | undefined;

export type ActionBattleAnimationEntity = {
  setGraphicAnimation?: (...args: any[]) => unknown;
  setAnimation?: (...args: any[]) => unknown;
  [key: string]: any;
};

export interface ActionBattleAnimationContext {
  skill?: any;
  attacker?: ActionBattleAnimationEntity;
  target?: ActionBattleAnimationEntity;
}

export type ActionBattleAnimationResolver = (
  entity: ActionBattleAnimationEntity,
  context?: ActionBattleAnimationContext
) => ActionBattleAnimationResult;

export type ActionBattleAnimationOptions = Partial<
  Record<
    ActionBattleAnimationKey,
    ActionBattleAnimationResult | ActionBattleAnimationResolver
  >
>;

export interface ActionBattleSkillTargeting {
  range: number;
  aoeMask?: ActionBattleAoeMask;
}

export type ActionBattleSkillTargetingResolver = (
  skill: any
) => ActionBattleSkillTargeting | null | undefined;

export type ActionBattleAttackDirection =
  | "up"
  | "down"
  | "left"
  | "right"
  | "default";

export interface ActionBattleAttackHitboxConfig {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

export type ActionBattleAttackHitboxMap = Partial<
  Record<ActionBattleAttackDirection, ActionBattleAttackHitboxConfig>
>;

export type ActionBattleAttackHitPolicy =
  | "oncePerTarget"
  | "allowRepeatHits";

export interface ActionBattleHitReactionProfile {
  invincibilityMs?: number;
  hitstunMs?: number;
  staggerPower?: number;
}

export interface NormalizedActionBattleHitReactionProfile {
  invincibilityMs: number;
  hitstunMs: number;
  staggerPower: number;
}

export interface ActionBattleAttackProfile {
  id?: string;
  startupMs?: number;
  activeMs?: number;
  recoveryMs?: number;
  cooldownMs?: number;
  movementLock?: boolean;
  directionLock?: boolean;
  animationKey?: ActionBattleAnimationKey;
  hitPolicy?: ActionBattleAttackHitPolicy;
  reaction?: ActionBattleHitReactionProfile;
  hitboxes?: ActionBattleAttackHitboxMap;
  damageMultiplier?: number;
  knockbackMultiplier?: number;
  /**
   * Fine-grained control locks for responsive action combat.
   *
   * The server owns gameplay locks. Clients may mirror them for prediction,
   * but must reconcile with the authoritative state.
   */
  control?: ActionBattleAttackControlOptions;
}

export interface NormalizedActionBattleAttackProfile
  extends Required<
    Omit<ActionBattleAttackProfile, "hitboxes" | "reaction" | "control">
  > {
  reaction: NormalizedActionBattleHitReactionProfile;
  control: NormalizedActionBattleAttackControlOptions;
  hitboxes?: ActionBattleAttackHitboxMap;
  totalDurationMs: number;
}

export type ActionBattleControlLock = "none" | "active" | "full";

export interface ActionBattleAttackControlOptions {
  /** Lock movement until the active frames or the complete recovery finish. */
  movementLock?: ActionBattleControlLock;
  /** Lock facing until the active frames or the complete recovery finish. */
  directionLock?: ActionBattleControlLock;
  /** Let movement cancel recovery after active frames have completed. */
  moveCancelsRecovery?: boolean;
  /** Let dodge cancel recovery after active frames have completed. */
  dodgeCancelsRecovery?: boolean;
  /** Input buffer used for follow-up attacks. */
  inputBufferMs?: number;
}

export interface NormalizedActionBattleAttackControlOptions {
  movementLock: ActionBattleControlLock;
  directionLock: ActionBattleControlLock;
  moveCancelsRecovery: boolean;
  dodgeCancelsRecovery: boolean;
  inputBufferMs: number;
}

export interface ActionBattleSkillOptions {
  targeting?: ActionBattleSkillTargetingResolver;
  getTargeting?: ActionBattleSkillTargetingResolver;
  defaultAoeMask?: ActionBattleAoeMask;
}

export interface ActionBattleTargetingOptions {
  affects?: ActionBattleTargetingAffects;
  allowEmptyTarget?: boolean;
}

export interface ActionBattleAttackOptions {
  profile?: ActionBattleAttackProfile;
  lockMovement?: boolean;
  lockDurationMs?: number;
  showPreview?: boolean;
  previewDurationMs?: number;
  previewColor?: number;
  previewAccentColor?: number;
  hitboxes?: ActionBattleAttackHitboxMap;
  resolveHitboxes?: (context: {
    player: any;
    direction: string;
    defaultHitboxes: ActionBattleHitbox[];
  }) => ActionBattleHitbox[];
}

export interface ActionBattleCombatOptions {
  attack?: ActionBattleAttackOptions;
  player?: ActionBattlePlayerCombatOptions;
  damage?: ActionBattleCombatSystem["resolveDamage"];
  knockback?: ActionBattleCombatSystem["resolveKnockback"];
  hooks?: ActionBattleHitHooks;
  targets?: ActionBattleTargetOptions;
}

export interface ActionBattleComboOptions {
  enabled?: boolean;
  bufferMs?: number;
  resetMs?: number;
  steps?: ActionBattleAttackProfile[];
}

export interface ActionBattleChargedAttackOptions {
  enabled?: boolean;
  control?: string;
  minChargeMs?: number;
  maxChargeMs?: number;
  minDamageMultiplier?: number;
  maxDamageMultiplier?: number;
  minKnockbackMultiplier?: number;
  maxKnockbackMultiplier?: number;
  profile?: ActionBattleAttackProfile;
}

export interface ActionBattleDodgeOptions {
  enabled?: boolean;
  durationMs?: number;
  cooldownMs?: number;
  invincibilityMs?: number;
  additionalSpeed?: number;
}

export interface ActionBattleGuardOptions {
  /** Enable guard and parry handling for players. */
  enabled?: boolean;
  /** Keyboard control name sent to the authoritative server. */
  control?: string;
  /** Opening guard window that cancels damage and staggers the attacker. */
  parryWindowMs?: number;
  /** Fraction of incoming damage removed by a successful frontal guard. */
  guardDamageReduction?: number;
  /** Fraction of incoming knockback removed by a successful frontal guard. */
  guardKnockbackReduction?: number;
  /** Frontal guard cone, in degrees. */
  guardArcDegrees?: number;
  /** Attacker stagger duration after a successful parry. */
  staggerMs?: number;
  /** Time available to consume the empowered counterattack. */
  counterWindowMs?: number;
  /** Counterattack damage multiplier. */
  counterDamageMultiplier?: number;
  /** Counterattack stagger multiplier. */
  counterStaggerMultiplier?: number;
}

export interface ActionBattleSoftTargetingOptions {
  /** Enable contextual melee aim assistance without moving the player. */
  enabled?: boolean;
  /** Maximum target distance in map pixels. */
  range?: number;
  /** Search cone centered on the player's manual facing direction. */
  coneDegrees?: number;
  /** Relative influence of facing alignment in target scoring. */
  directionWeight?: number;
  /** Relative influence of proximity in target scoring. */
  distanceWeight?: number;
  /** Relative influence of enemies already threatening the player. */
  threatWeight?: number;
  /** Duration of the local target marker. */
  indicatorDurationMs?: number;
}

export interface ActionBattlePlayerCombatOptions {
  combo?: boolean | ActionBattleComboOptions;
  chargedAttack?: boolean | ActionBattleChargedAttackOptions;
  dodge?: boolean | ActionBattleDodgeOptions;
  guard?: boolean | ActionBattleGuardOptions;
  softTargeting?: boolean | ActionBattleSoftTargetingOptions;
}

export interface ActionBattleAiOptions {
  /** Named server actions invoked by the `callAction()` intent. */
  actions?: Record<string, ActionBattleAiAction>;
  /** Named low-level behavior resolvers. */
  behaviors?: Record<string, ActionBattleAiBehavior>;
  /** Reusable enemy AI option presets. */
  presets?: Record<string, ActionBattleAiPreset>;
  /** Client-only renderers for cues emitted by the `visual()` intent. */
  visuals?: Record<string, ActionBattleAiVisualHandler>;
  /** Coordinates attack turns around one target without owning enemy AI. */
  director?: false | ActionBattleCombatDirectorOptions;
}

export interface ActionBattleCombatDirectorOptions {
  /** Disable the coordinator while keeping the surrounding AI configuration. */
  enabled?: boolean;
  /** Maximum enemies allowed to attack the same target at once. */
  maxConcurrentAttackers?: number;
  /** Time before an abandoned attack turn becomes available again. */
  slotDurationMs?: number;
}

export type ActionBattleAiSystemOptions = ActionBattleAiOptions;

/** Client visual context enriched with the serializable AI cue. */
export type ActionBattleAiVisualClientContext = ClientVisualContext & {
  visual: ActionBattleAiVisual;
};

/** Client-only renderer registered for one AI visual `kind`. */
export type ActionBattleAiVisualHandler = (
  context: ActionBattleAiVisualClientContext,
  helpers: ClientVisualHelpers
) => void | Promise<void>;

export interface ActionBattleSystemOptions {
  combat?: ActionBattleCombatOptions;
  ai?: ActionBattleAiOptions;
}

export type ActionBattleVisualMoment =
  | "attack"
  | "chargeStart"
  | "chargeRelease"
  | "dodge"
  | "telegraph"
  | "castSkill"
  | "hit"
  | "hurt"
  | "stagger"
  | "heal"
  | "defeat"
  | "guard"
  | "block"
  | "parry"
  | "counter"
  | "miss"
  | "target"
  | "preview"
  | "ai";

export interface ActionBattleVisualContext {
  moment: ActionBattleVisualMoment;
  /** Available only while a visual is rendered on the client. */
  engine?: any;
  entity?: any;
  target?: any;
  attacker?: any;
  damage?: number;
  defeated?: boolean;
  result?: any;
  skill?: any;
  pattern?: string;
  visual?: ActionBattleAiVisual;
  animations?: ActionBattleAnimationOptions;
  animationDefaults?: {
    animationName?: string;
    repeat?: number;
  };
}

export interface ActionBattleVisualHelpers {
  graphic(entity: any, keyOrOptions: ActionBattleAnimationKey | ActionBattleAnimationResult): void;
  flash(entity: any, options?: Record<string, any>): void;
  damageText(entity: any, damageOrText?: number | string): void;
  component(entity: any, id: string, params?: Record<string, any>): void;
  preview(entity: any, options?: Record<string, any>): void;
  sound(id: string, options?: { volume?: number; loop?: boolean }): void;
  shake(options?: {
    intensity?: number;
    duration?: number;
    frequency?: number;
    direction?: string;
  }): void;
}

export type ActionBattleVisualPart = (
  context: ActionBattleVisualContext,
  helpers: ActionBattleVisualHelpers
) => void;

export type ActionBattleVisualComposer = (
  context: ActionBattleVisualContext
) => void;

export type ActionBattleVisualPreset = "classic" | "fx" | "impact" | "none";

export type ActionBattleVisualInput =
  | ActionBattleVisualPreset
  | ActionBattleVisualComposer
  | Partial<Record<ActionBattleVisualMoment, ActionBattleVisualPart>>;

/**
 * Local-only combat feedback and accessibility controls.
 *
 * These options never affect authoritative damage, collision, or timing.
 */
export interface ActionBattleFeedbackOptions {
  /** Briefly freeze map rendering on impacts. */
  hitStop?: boolean;
  /** Duration of a regular impact freeze. */
  hitStopMs?: number;
  /** Duration used by charged attacks, finishers, and stagger. */
  heavyHitStopMs?: number;
  /** Duration of the stronger successful-parry freeze. */
  parryHitStopMs?: number;
  /** Allow tint flashes generated by Action Battle visuals. */
  flashes?: boolean;
  /** Allow camera shake generated by Action Battle visuals. */
  screenShake?: boolean;
  /** Allow floating damage, guard, parry, and miss labels. */
  damageNumbers?: boolean;
}

export interface ActionBattleUiHotbarOptions {
  /** Enable the hotbar globally or resolve availability for each player. */
  enabled?: boolean | ((player: RpgPlayer) => boolean);
  /** Open an enabled hotbar automatically on connection and map changes. */
  autoOpen?: boolean;
  /** Number of visible slots, clamped between 1 and 10. */
  capacity?: number | ((player: RpgPlayer) => number);
  /** Entry types that may be displayed, assigned, and used. */
  allowedEntryTypes?:
    | readonly string[]
    | ((player: RpgPlayer) => readonly string[]);
  /** Optional hint for slots outside the current capacity. */
  lockedSlotHint?: string | ((player: RpgPlayer, slot: number) => string | undefined);
}

/**
 * Legacy Action Battle-specific bar configuration.
 *
 * Kept for projects that still render `ActionBattleUi.ActionBar`; new projects
 * should use the persistent, server-authoritative `ui.hotbar` configuration.
 */
export interface ActionBattleUiActionBarOptions {
  enabled?: boolean;
  autoOpen?: boolean;
  mode?: ActionBattleActionBarMode;
  /** Number of visible slots, clamped between 1 and 10. */
  slotCount?: number;
  /** Ordered server-authoritative entries assigned to each visible slot. */
  slots?: Array<ActionBattleActionBarAssignment | null>;
  /** Called on the server when the player requests the main menu from the bar. */
  onOpenMenu?: () => void;
  component?: any;
}

export interface ActionBattleActionBarAssignment {
  type: "item" | "skill";
  id: string;
}

export interface ActionBattleUiTargetingOptions {
  enabled?: boolean;
  component?: any;
  showGrid?: boolean;
  tileSize?: { width: number; height: number };
  colors?: {
    area?: number;
    edge?: number;
    cursor?: number;
  };
}

export interface ActionBattleUiAttackPreviewOptions {
  enabled?: boolean;
  component?: any;
}

export interface ActionBattleUiGuiEntry {
  id: string;
  component: any;
  dependencies?: Function;
}

export interface ActionBattleUiOptions {
  hotbar?: boolean | ActionBattleUiHotbarOptions;
  /** Legacy Action Battle-specific bar. Prefer `hotbar`. */
  actionBar?: boolean | ActionBattleUiActionBarOptions;
  targeting?: boolean | ActionBattleUiTargetingOptions;
  attackPreview?: boolean | ActionBattleUiAttackPreviewOptions;
  gui?: ActionBattleUiGuiEntry[];
  spriteComponents?: {
    front?: any[];
    back?: any[];
  } | any[];
}

export interface ActionBattleAudioCue {
  id: string | string[];
  volume?: number;
  cooldownMs?: number;
}

export type ActionBattleAudioCueInput =
  | string
  | string[]
  | ActionBattleAudioCue
  | ((context: ActionBattleVisualContext) =>
      | string
      | string[]
      | ActionBattleAudioCue
      | undefined);

export interface ActionBattleMusicOptions {
  battle?: string | ((context: any) => string | undefined);
  volume?: number;
  mapVolume?: number;
  fadeInMs?: number;
  fadeOutMs?: number;
  exitDelayMs?: number;
}

export interface ActionBattleAudioOptions {
  attack?: ActionBattleAudioCueInput;
  skill?: ActionBattleAudioCueInput;
  hit?: ActionBattleAudioCueInput;
  hurt?: ActionBattleAudioCueInput;
  die?: ActionBattleAudioCueInput;
  music?: false | ActionBattleMusicOptions;
}

export interface ActionBattleOptions {
  preset?: "adventure" | "classic";
  combat?: ActionBattleCombatOptions;
  visual?: ActionBattleVisualInput;
  feedback?: ActionBattleFeedbackOptions;
  ui?: ActionBattleUiOptions;
  ai?: ActionBattleAiOptions;
  skills?: ActionBattleSkillOptions;
  targeting?: ActionBattleTargetingOptions;
  attack?: ActionBattleAttackOptions;
  animations?: ActionBattleAnimationOptions;
  systems?: ActionBattleSystemOptions;
  /** Client-side combat cues and dynamic battle music. */
  audio?: false | ActionBattleAudioOptions;
}

export interface ActionBattleHotbarSkill {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  spCost?: number;
  usable?: boolean;
  range?: number;
  aoeMask?: string[];
  key?: string;
  casterAnimation?: string;
  animation?: string;
  sound?: string;
  impactSound?: string;
  action?: {
    mode?: "instant" | "melee" | "projectile";
    target?: "enemy" | "ally" | "self" | "any";
    cooldownMs?: number;
    /** Serializable client-only particle and damage-popup presentation. */
    visual?: {
      /** Legacy impact FX alias. Prefer `impactFx`. */
      fx?: string;
      /** Caster FX preset, `auto`, or `none`. */
      castFx?: string;
      /** Continuous projectile FX preset, `auto`, or `none`. */
      trailFx?: string;
      /** Target impact FX preset, `auto`, or `none`. */
      impactFx?: string;
      /** Main damage-popup text color. */
      color?: string | number;
      /** Damage-popup outline color. */
      accentColor?: string | number;
      /** Impact particle scale. */
      scale?: number;
    };
  };
  cooldownMs?: number;
  readyAt?: number;
}

export interface ActionBattleActionBarItem {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  quantity?: number;
  usable?: boolean;
}

export type ActionBattleActionBarSkill = ActionBattleHotbarSkill;

export interface ActionBattleActionBarData {
  items: ActionBattleActionBarItem[];
  skills: ActionBattleActionBarSkill[];
  /** Server-selected content mode for this rendered action bar. */
  mode?: ActionBattleActionBarMode;
  /** Server-selected number of visible slots. */
  slotCount?: number;
  /** Resolved entries in their assigned slot order. */
  slots?: Array<{
    type: "empty" | "item" | "skill";
    item: ActionBattleActionBarItem | null;
    skill: ActionBattleActionBarSkill | null;
  }>;
}
