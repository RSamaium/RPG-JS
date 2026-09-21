import type {
  ActionBattleAttackProfile,
  NormalizedActionBattleAttackProfile,
} from "../types";
import { normalizeActionBattleAttackProfile } from "./attack-profile";

export type ActionBattleEnemyAttackProfileKey =
  | "melee"
  | "combo"
  | "charged"
  | "zone"
  | "dashAttack";

export const DEFAULT_ACTION_BATTLE_ENEMY_ATTACK_PROFILES: Record<
  ActionBattleEnemyAttackProfileKey,
  ActionBattleAttackProfile
> = {
  melee: {
    id: "enemy-melee",
    startupMs: 250,
    activeMs: 120,
    recoveryMs: 350,
    cooldownMs: 1100,
    reaction: {
      invincibilityMs: 250,
      hitstunMs: 120,
      staggerPower: 1,
    },
  },
  combo: {
    id: "enemy-combo",
    startupMs: 140,
    activeMs: 80,
    recoveryMs: 200,
    cooldownMs: 500,
    reaction: {
      invincibilityMs: 180,
      hitstunMs: 90,
      staggerPower: 0.75,
    },
  },
  charged: {
    id: "enemy-charged",
    startupMs: 800,
    activeMs: 140,
    recoveryMs: 500,
    cooldownMs: 1900,
    reaction: {
      invincibilityMs: 350,
      hitstunMs: 220,
      staggerPower: 2,
    },
  },
  zone: {
    id: "enemy-zone",
    startupMs: 450,
    activeMs: 180,
    recoveryMs: 420,
    cooldownMs: 1500,
    reaction: {
      invincibilityMs: 300,
      hitstunMs: 160,
      staggerPower: 1.25,
    },
  },
  dashAttack: {
    id: "enemy-dash",
    startupMs: 250,
    activeMs: 120,
    recoveryMs: 350,
    cooldownMs: 1200,
    reaction: {
      invincibilityMs: 280,
      hitstunMs: 150,
      staggerPower: 1.2,
    },
  },
};

export type ActionBattleEnemyAttackProfileMap = Partial<
  Record<ActionBattleEnemyAttackProfileKey, ActionBattleAttackProfile>
>;

export type NormalizedActionBattleEnemyAttackProfileMap = Record<
  ActionBattleEnemyAttackProfileKey,
  NormalizedActionBattleAttackProfile
>;

export function normalizeActionBattleEnemyAttackProfiles(
  overrides: ActionBattleEnemyAttackProfileMap = {}
): NormalizedActionBattleEnemyAttackProfileMap {
  return Object.fromEntries(
    Object.entries(DEFAULT_ACTION_BATTLE_ENEMY_ATTACK_PROFILES).map(
      ([key, defaultProfile]) => [
        key,
        normalizeActionBattleAttackProfile({
          ...defaultProfile,
          ...overrides[key as ActionBattleEnemyAttackProfileKey],
        }),
      ]
    )
  ) as NormalizedActionBattleEnemyAttackProfileMap;
}
