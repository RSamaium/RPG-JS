import server, { createActionBattleServer } from "./server";
import client, { createActionBattleClient } from "./client";
import { createModule, type RpgProvider } from "@rpgjs/common";
import type { ActionBattleOptions } from "./types";

// AI exports
export { BattleAi, AiState, EnemyType, AttackPattern, AiDebug, DEFAULT_KNOCKBACK } from "./ai.server";

// Types exports
export type {
  HitResult,
  ApplyHitHooks,
  BattleAiOptions,
  BattleAiDefeatedCallback,
  BattleAiDefeatedContext,
  BattleAiDefeatReward,
  BattleAiLegacyDefeatedCallback,
  BattleAiLegacyOptions,
  BattleAiRewardItem,
  BattleAiRewards,
} from "./ai.server";
export type {
  ActionBattleAnimationContext,
  ActionBattleAnimationEntity,
  ActionBattleAnimationKey,
  ActionBattleAnimationOptions,
  ActionBattleAnimationResolver,
  ActionBattleAnimationResult,
  ActionBattleAiOptions,
  ActionBattleAiVisualClientContext,
  ActionBattleAiVisualHandler,
  ActionBattleOptions,
  ActionBattleActionBarData,
  ActionBattleActionBarItem,
  ActionBattleActionBarSkill,
  ActionBattleSkillTargeting,
  ActionBattleSkillTargetingResolver,
  ActionBattleAttackOptions,
  ActionBattleUiOptions,
  ActionBattleUiActionBarOptions,
  ActionBattleUiAttackPreviewOptions,
  ActionBattleUiGuiEntry,
  ActionBattleUiTargetingOptions,
  ActionBattleAttackDirection,
  ActionBattleAttackHitboxConfig,
  ActionBattleAttackHitboxMap,
  ActionBattleAttackHitPolicy,
  ActionBattleAttackProfile,
  ActionBattleHitReactionProfile,
  NormalizedActionBattleHitReactionProfile,
  NormalizedActionBattleAttackProfile,
  ActionBattleCombatOptions,
  ActionBattleSystemOptions,
  ActionBattleAiSystemOptions,
  ActionBattleVisualComposer,
  ActionBattleVisualContext,
  ActionBattleVisualHelpers,
  ActionBattleVisualInput,
  ActionBattleVisualMoment,
  ActionBattleVisualPart,
  ActionBattleVisualPreset,
} from "./types";
export type {
  ActionBattleAiAction,
  ActionBattleAiBehavior,
  ActionBattleAiContext,
  ActionBattleAiDecision,
  ActionBattleAiPreset,
  ActionBattleAttackContext,
  ActionBattleCombatSystem,
  ActionBattleDamageContext,
  ActionBattleDamageResult,
  ActionBattleDirection,
  ActionBattleEntity,
  ActionBattleActionConfig,
  ActionBattleActionMode,
  ActionBattleActionTarget,
  ActionBattleTargetContext,
  ActionBattleTargetOptions,
  ActionBattleTargetSelector,
  ActionBattleProjectileImpactContext,
  ActionBattleProjectileOptions,
  ActionBattleUsable,
  ActionBattleUseContext,
  ActionBattleHitContext,
  ActionBattleHitHooks,
  ActionBattleHitResult,
  ActionBattleHitbox,
  ActionBattleKnockbackContext,
  ActionBattleKnockbackResult,
  ActionBattleSystems,
} from "./core/contracts";
export {
  action,
  callAction,
  chase,
  condition,
  cooldown,
  decision,
  defineAiBehavior,
  defineAiTree,
  distanceLessThan,
  faceTarget,
  flee,
  fleeFromTarget,
  hpBelow,
  idle,
  ifDistanceLessThan,
  ifHpBelow,
  ifTargetInRange,
  ifTargetVisible,
  inState,
  isEnemyType,
  keepDistance,
  moveToTarget,
  moveToPoint,
  once,
  patrol,
  phase,
  rule,
  run,
  selector,
  sequence,
  sequenceWithDelay,
  setSpeed,
  setMode,
  targetInRange,
  targetVisible,
  useAttack,
  useSkill,
  visual,
  wait,
  holdPosition,
  teleportNearTarget,
  teleportTo,
  type ActionBattleAiCondition,
  type ActionBattleAiIntent,
  type ActionBattleAiIntentInput,
  type ActionBattleAiMemory,
  type ActionBattleAiPosition,
  type ActionBattleAiRule,
  type ActionBattleAiRunCallback,
  type ActionBattleAiSerializable,
  type ActionBattleAiSimpleBehavior,
  type ActionBattleAiSnapshotSelf,
  type ActionBattleAiSnapshotTarget,
  type ActionBattleAiTreeContext,
  type ActionBattleAiTreeInput,
  type ActionBattleAiTreeNode,
  type ActionBattleAiTreeResult,
  type ActionBattleAiTreeStatus,
  type ActionBattleAiTeleportNearTargetOptions,
  type ActionBattleAiVisual,
} from "./core/ai-behavior-tree";
export {
  DEFAULT_ACTION_BATTLE_ATTACK_PROFILE,
  normalizeActionBattleAttackProfile,
  type ActionBattleAttackProfileFallbacks,
} from "./core/attack-profile";
export {
  ACTION_BATTLE_HITBOX_FRAME_MS,
  ActionBattleHitTracker,
  createActionBattleAttackId,
  getNormalizedActionBattleAttackProfile,
  resolveActionBattleHitboxSpeed,
  runActionBattleActiveHitbox,
  scheduleActionBattleStartup,
} from "./core/attack-runtime";
export {
  canActionBattleUseTarget,
  executeActionBattleUse,
  getActionBattleActionConfig,
  getActionBattleActionRange,
  handleActionBattleProjectileDestroy,
  handleActionBattleProjectileImpact,
  shouldUseActionBattleUsable,
} from "./core/action-use";
export {
  DEFAULT_ACTION_BATTLE_HIT_REACTION,
  isActionBattleEntityInvincible,
  normalizeActionBattleHitReaction,
  setActionBattleInvincibility,
} from "./core/hit-reaction";
export {
  DEFAULT_ACTION_BATTLE_ENEMY_ATTACK_PROFILES,
  normalizeActionBattleEnemyAttackProfiles,
  type ActionBattleEnemyAttackProfileKey,
  type ActionBattleEnemyAttackProfileMap,
  type NormalizedActionBattleEnemyAttackProfileMap,
} from "./core/enemy-attack-profiles";
export {
  resolveActionBattleWeapon,
  resolveActionBattleWeaponAttackProfile,
} from "./core/equipment";
export {
  DEFAULT_ZELDA_PLAYER_HITBOXES,
  createDefaultPlayerHitboxResolver,
  defaultCombatSystem,
  defaultEnemyBehaviors,
  defaultEnemyPresets,
  defaultKnockbackResolver,
  defaultRpgjsDamageResolver,
} from "./core/defaults";
export {
  ACTION_BATTLE_ENEMY_FACTION,
  ACTION_BATTLE_PLAYER_FACTION,
  canActionBattleTarget,
  getActionBattleFaction,
  getActionBattleTargets,
  isActionBattleCombatEntity,
  isActionBattleEvent,
  isActionBattlePlayer,
  matchesActionBattleTargetSelector,
} from "./core/targets";
export {
  createActionBattleSystems,
  getActionBattleSystems,
} from "./core/context";
export { applyActionBattleHit } from "./core/hit";
export {
  ACTION_BATTLE_CLIENT_VISUAL_ID,
  ACTION_BATTLE_HIT_FX_COMPONENT_ID,
  createActionBattleClientVisuals,
  createActionBattleVisual,
  createClassicActionBattleVisual,
  createFxActionBattleVisual,
  emitActionBattleClientVisual,
  playActionBattleVisual,
  setActionBattlePreviewStarter,
} from "./visual";
export {
  ActionBattleUi,
  createActionBattleUi,
  resolveActionBattleUi,
  type ResolvedActionBattleUi,
} from "./ui";
export {
  createActionEnemy,
  defineActionBattleAiPreset,
  defineActionBattleEnemy,
  type ActionBattleEnemyPreset,
  type ActionBattleEnemyPresetMap,
} from "./enemies/factory";

// Server exports
export {
  DEFAULT_PLAYER_ATTACK_HITBOXES,
  getPlayerWeaponKnockbackForce,
  applyActionBattleEntityHit,
  applyPlayerHitToEvent,
  ACTION_BATTLE_ACTION_BAR_GUI_ID,
  openActionBattleActionBar,
  updateActionBattleActionBar,
  createActionBattleServer,
} from "./server";

export function provideActionBattle(options: ActionBattleOptions = {}): RpgProvider[] {
  return createModule("ActionBattle", [
    {
      server: createActionBattleServer?.(options),
      client: createActionBattleClient?.(options),
    },
  ]);
}

export default {
  server,
  client,
};
