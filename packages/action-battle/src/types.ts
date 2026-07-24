import type {
  ClientVisualContext,
  ClientVisualHelpers,
} from "@rpgjs/client";
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

export type ActionBattleActionBarMode = "items" | "skills" | "both";

export type ActionBattleTargetingAffects = "events" | "players" | "both";

export type ActionBattleAnimationKey =
  | "attack"
  | "hurt"
  | "die"
  | "castSkill"
  | "castSpell";

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
}

export interface NormalizedActionBattleAttackProfile
  extends Required<Omit<ActionBattleAttackProfile, "hitboxes" | "reaction">> {
  reaction: NormalizedActionBattleHitReactionProfile;
  hitboxes?: ActionBattleAttackHitboxMap;
  totalDurationMs: number;
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
  damage?: ActionBattleCombatSystem["resolveDamage"];
  knockback?: ActionBattleCombatSystem["resolveKnockback"];
  hooks?: ActionBattleHitHooks;
  targets?: ActionBattleTargetOptions;
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
  | "castSkill"
  | "hit"
  | "hurt"
  | "defeat"
  | "preview"
  | "ai";

export interface ActionBattleVisualContext {
  moment: ActionBattleVisualMoment;
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
}

export type ActionBattleVisualPart = (
  context: ActionBattleVisualContext,
  helpers: ActionBattleVisualHelpers
) => void;

export type ActionBattleVisualComposer = (
  context: ActionBattleVisualContext
) => void;

export type ActionBattleVisualPreset = "classic" | "fx" | "none";

export type ActionBattleVisualInput =
  | ActionBattleVisualPreset
  | ActionBattleVisualComposer
  | Partial<Record<ActionBattleVisualMoment, ActionBattleVisualPart>>;

export interface ActionBattleUiActionBarOptions {
  enabled?: boolean;
  autoOpen?: boolean;
  mode?: ActionBattleActionBarMode;
  component?: any;
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
  actionBar?: boolean | ActionBattleUiActionBarOptions;
  targeting?: boolean | ActionBattleUiTargetingOptions;
  attackPreview?: boolean | ActionBattleUiAttackPreviewOptions;
  gui?: ActionBattleUiGuiEntry[];
  spriteComponents?: {
    front?: any[];
    back?: any[];
  } | any[];
}

export interface ActionBattleOptions {
  combat?: ActionBattleCombatOptions;
  visual?: ActionBattleVisualInput;
  ui?: ActionBattleUiOptions;
  ai?: ActionBattleAiOptions;
  skills?: ActionBattleSkillOptions;
  targeting?: ActionBattleTargetingOptions;
  attack?: ActionBattleAttackOptions;
  animations?: ActionBattleAnimationOptions;
  systems?: ActionBattleSystemOptions;
}

export interface ActionBattleActionBarItem {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  quantity?: number;
  usable?: boolean;
}

export interface ActionBattleActionBarSkill {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  spCost?: number;
  usable?: boolean;
  range?: number;
  aoeMask?: string[];
  key?: string;
}

export interface ActionBattleActionBarData {
  items: ActionBattleActionBarItem[];
  skills: ActionBattleActionBarSkill[];
}
