import type {
  ActionBattleAttackHitboxMap,
  ActionBattleAttackHitPolicy,
  ActionBattleAttackProfile,
  ActionBattleAnimationKey,
  NormalizedActionBattleAttackProfile,
} from "../types";
import {
  DEFAULT_ACTION_BATTLE_HIT_REACTION,
  normalizeActionBattleHitReaction,
} from "./hit-reaction";

export const DEFAULT_ACTION_BATTLE_ATTACK_PROFILE:
  NormalizedActionBattleAttackProfile = {
  id: "basic",
  startupMs: 0,
  activeMs: 120,
  recoveryMs: 230,
  cooldownMs: 350,
  movementLock: true,
  directionLock: true,
  animationKey: "attack",
  hitPolicy: "oncePerTarget",
  damageMultiplier: 1,
  knockbackMultiplier: 1,
  reaction: DEFAULT_ACTION_BATTLE_HIT_REACTION,
  totalDurationMs: 350,
};

export interface ActionBattleAttackProfileFallbacks {
  id?: string;
  lockMovement?: boolean;
  lockDurationMs?: number;
  hitboxes?: ActionBattleAttackHitboxMap;
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const nonNegativeMs = (value: unknown, fallback: number) =>
  isFiniteNumber(value) ? Math.max(0, value) : fallback;

const positiveMs = (value: unknown, fallback: number) =>
  isFiniteNumber(value) ? Math.max(1, value) : fallback;

const nonNegativeMultiplier = (value: unknown, fallback: number) =>
  isFiniteNumber(value) ? Math.max(0, value) : fallback;

const resolveHitPolicy = (
  value: ActionBattleAttackHitPolicy | undefined
): ActionBattleAttackHitPolicy =>
  value === "allowRepeatHits" ? "allowRepeatHits" : "oncePerTarget";

const resolveAnimationKey = (
  value: ActionBattleAnimationKey | undefined
): ActionBattleAnimationKey =>
  value ?? DEFAULT_ACTION_BATTLE_ATTACK_PROFILE.animationKey;

export function normalizeActionBattleAttackProfile(
  profile: ActionBattleAttackProfile | undefined = {},
  fallbacks: ActionBattleAttackProfileFallbacks = {}
): NormalizedActionBattleAttackProfile {
  const startupMs = nonNegativeMs(
    profile.startupMs,
    DEFAULT_ACTION_BATTLE_ATTACK_PROFILE.startupMs
  );
  const activeMs = positiveMs(
    profile.activeMs,
    DEFAULT_ACTION_BATTLE_ATTACK_PROFILE.activeMs
  );
  const legacyDuration = nonNegativeMs(
    fallbacks.lockDurationMs,
    DEFAULT_ACTION_BATTLE_ATTACK_PROFILE.totalDurationMs
  );
  const fallbackRecoveryMs = Math.max(0, legacyDuration - startupMs - activeMs);
  const recoveryMs = nonNegativeMs(profile.recoveryMs, fallbackRecoveryMs);
  const totalDurationMs = startupMs + activeMs + recoveryMs;
  const cooldownMs = nonNegativeMs(profile.cooldownMs, totalDurationMs);
  const hitboxes = profile.hitboxes ?? fallbacks.hitboxes;

  const normalized: NormalizedActionBattleAttackProfile = {
    id: profile.id || fallbacks.id || DEFAULT_ACTION_BATTLE_ATTACK_PROFILE.id,
    startupMs,
    activeMs,
    recoveryMs,
    cooldownMs,
    movementLock:
      profile.movementLock ??
      fallbacks.lockMovement ??
      DEFAULT_ACTION_BATTLE_ATTACK_PROFILE.movementLock,
    directionLock:
      profile.directionLock ??
      DEFAULT_ACTION_BATTLE_ATTACK_PROFILE.directionLock,
    animationKey: resolveAnimationKey(profile.animationKey),
    hitPolicy: resolveHitPolicy(profile.hitPolicy),
    damageMultiplier: nonNegativeMultiplier(
      profile.damageMultiplier,
      DEFAULT_ACTION_BATTLE_ATTACK_PROFILE.damageMultiplier
    ),
    knockbackMultiplier: nonNegativeMultiplier(
      profile.knockbackMultiplier,
      DEFAULT_ACTION_BATTLE_ATTACK_PROFILE.knockbackMultiplier
    ),
    reaction: normalizeActionBattleHitReaction(profile.reaction),
    totalDurationMs,
  };

  if (hitboxes) {
    normalized.hitboxes = hitboxes;
  }

  return normalized;
}
