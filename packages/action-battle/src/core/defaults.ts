import type { RpgPlayer } from "@rpgjs/server";
import type {
  ActionBattleAiBehavior,
  ActionBattleAiPreset,
  ActionBattleAttackContext,
  ActionBattleCombatSystem,
  ActionBattleDamageContext,
  ActionBattleKnockbackContext,
  ActionBattleKnockbackResult,
  ActionBattleSystems,
} from "./contracts";

const DEFAULT_CORE_KNOCKBACK = {
  force: 50,
  duration: 300,
};

const CoreAttackPattern = {
  Melee: "melee",
  Combo: "combo",
  Charged: "charged",
  Zone: "zone",
  DashAttack: "dashAttack",
} as const;

const CoreEnemyType = {
  Aggressive: "aggressive",
  Defensive: "defensive",
  Ranged: "ranged",
  Tank: "tank",
  Berserker: "berserker",
} as const;

export const DEFAULT_ZELDA_PLAYER_HITBOXES = {
  up: { offsetX: -16, offsetY: -48, width: 32, height: 32 },
  down: { offsetX: -16, offsetY: 16, width: 32, height: 32 },
  left: { offsetX: -48, offsetY: -16, width: 32, height: 32 },
  right: { offsetX: 16, offsetY: -16, width: 32, height: 32 },
  default: { offsetX: 0, offsetY: -32, width: 32, height: 32 },
};

const resolveEquippedWeapon = (entity: any) => {
  const equipments = entity?.equipments?.() || [];
  for (const item of equipments) {
    const itemId = item?.id?.() ?? item?.id;
    const itemData = entity?.databaseById?.(itemId);
    if (itemData?._type === "weapon") return itemData;
  }
  return null;
};

const resolveDirection = (attacker: any, target: any) => {
  const dx = target.x() - attacker.x();
  const dy = target.y() - attacker.y();
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance <= 0) return undefined;
  return {
    x: dx / distance,
    y: dy / distance,
  };
};

/**
 * `Skill` instances expose their gameplay fields as reactive signals. RPGJS
 * damage formulas, on the other hand, expect a plain `SkillData` object. Keep
 * the instance for the rest of the Action Battle flow, but unwrap it at the
 * engine boundary where `applyDamage()` evaluates the formula.
 */
const createDamageSkillSnapshot = (skill: any) => {
  if (!skill) return skill;

  const snapshot = {
    ...(skill?._skillData ?? skill),
  } as Record<string, any>;
  const reactiveFields = [
    "id",
    "name",
    "description",
    "spCost",
    "icon",
    "hitRate",
    "power",
    "coefficient",
  ];

  for (const field of reactiveFields) {
    const value = skill[field];
    if (typeof value === "function") {
      snapshot[field] = value.call(skill);
    } else if (value !== undefined) {
      snapshot[field] = value;
    }
  }

  return snapshot;
};

export const createDefaultPlayerHitboxResolver =
  (hitboxes = DEFAULT_ZELDA_PLAYER_HITBOXES) =>
  (context: ActionBattleAttackContext) => {
    const attacker = context.attacker as any;
    const direction =
      context.direction ??
      (typeof attacker.getDirection === "function"
        ? attacker.getDirection()
        : "default");
    const config =
      hitboxes[direction as keyof typeof hitboxes] || hitboxes.default;
    return [
      {
        x: attacker.x() + config.offsetX,
        y: attacker.y() + config.offsetY,
        width: config.width,
        height: config.height,
      },
    ];
  };

export const defaultRpgjsDamageResolver = (
  context: ActionBattleDamageContext
) => {
  const target = context.target as any;
  const previousHp =
    typeof target.hp === "number" && Number.isFinite(target.hp)
      ? target.hp
      : undefined;
  const raw = target.applyDamage(
    context.attacker as any,
    createDamageSkillSnapshot(context.skill)
  );
  const resolvedDamage = Number(raw?.damage ?? 0);
  if (!Number.isFinite(resolvedDamage)) {
    if (previousHp !== undefined) {
      target.hp = previousHp;
    }
    return {
      damage: 0,
      defeated: false,
      raw,
    };
  }
  const multiplier =
    typeof context.multiplier === "number" && Number.isFinite(context.multiplier)
      ? Math.max(0, context.multiplier)
      : 1;
  const scaledDamage = Math.max(0, Math.round(resolvedDamage * multiplier));
  if (previousHp !== undefined && scaledDamage !== resolvedDamage) {
    target.hp = Math.max(0, previousHp - scaledDamage);
  }
  return {
    damage: scaledDamage,
    defeated: target.hp <= 0,
    raw,
  };
};

export const defaultKnockbackResolver = (
  context: ActionBattleKnockbackContext
): ActionBattleKnockbackResult => {
  const weapon = context.weapon ?? resolveEquippedWeapon(context.attacker);
  return {
    force:
      (weapon?.knockbackForce ?? DEFAULT_CORE_KNOCKBACK.force) *
      (context.multiplier ?? 1),
    duration: weapon?.knockbackDuration ?? DEFAULT_CORE_KNOCKBACK.duration,
    direction: resolveDirection(context.attacker as any, context.target as any),
  };
};

export const defaultCombatSystem: ActionBattleCombatSystem = {
  resolveHitboxes: createDefaultPlayerHitboxResolver(),
  resolveDamage: defaultRpgjsDamageResolver,
  resolveKnockback: defaultKnockbackResolver,
};

export const defaultEnemyBehaviors: Record<string, ActionBattleAiBehavior> = {
  [CoreEnemyType.Aggressive]: ({ hpPercent }) => ({
    mode: hpPercent !== null && hpPercent < 0.15 ? "retreat" : "assault",
    attackPatterns: [
      CoreAttackPattern.Melee as any,
      CoreAttackPattern.Combo as any,
      CoreAttackPattern.DashAttack as any,
    ],
  }),
  [CoreEnemyType.Defensive]: ({ hpPercent }) => ({
    mode: hpPercent !== null && hpPercent < 0.3 ? "retreat" : "tactical",
    attackPatterns: [CoreAttackPattern.Melee as any, CoreAttackPattern.Charged as any],
  }),
  [CoreEnemyType.Ranged]: ({ distance }) => ({
    mode: distance !== null && distance < 80 ? "retreat" : "tactical",
    attackPatterns: [CoreAttackPattern.Melee as any, CoreAttackPattern.Zone as any],
  }),
  [CoreEnemyType.Tank]: () => ({
    mode: "assault",
    attackPatterns: [
      CoreAttackPattern.Melee as any,
      CoreAttackPattern.Charged as any,
      CoreAttackPattern.Zone as any,
    ],
  }),
  [CoreEnemyType.Berserker]: ({ hpPercent }) => ({
    mode: "assault",
    attackCooldown:
      hpPercent === null ? undefined : Math.max(250, 800 * Math.max(0.3, hpPercent)),
    attackPatterns: [
      CoreAttackPattern.Melee as any,
      CoreAttackPattern.Combo as any,
      CoreAttackPattern.DashAttack as any,
    ],
  }),
};

export const defaultEnemyPresets: Record<string, ActionBattleAiPreset> = {
  [CoreEnemyType.Aggressive]: {
    enemyType: CoreEnemyType.Aggressive as any,
    attackCooldown: 600,
    visionRange: 150,
    attackRange: 50,
    dodgeChance: 0.1,
    dodgeCooldown: 3000,
    fleeThreshold: 0.15,
    behaviorKey: CoreEnemyType.Aggressive,
  },
  [CoreEnemyType.Defensive]: {
    enemyType: CoreEnemyType.Defensive as any,
    attackCooldown: 1500,
    visionRange: 120,
    attackRange: 60,
    dodgeChance: 0.5,
    dodgeCooldown: 1500,
    fleeThreshold: 0.3,
    behaviorKey: CoreEnemyType.Defensive,
  },
  [CoreEnemyType.Ranged]: {
    enemyType: CoreEnemyType.Ranged as any,
    attackCooldown: 1200,
    visionRange: 200,
    attackRange: 120,
    dodgeChance: 0.4,
    dodgeCooldown: 2000,
    fleeThreshold: 0.25,
    behaviorKey: CoreEnemyType.Ranged,
  },
  [CoreEnemyType.Tank]: {
    enemyType: CoreEnemyType.Tank as any,
    attackCooldown: 2000,
    visionRange: 100,
    attackRange: 50,
    dodgeChance: 0,
    dodgeCooldown: 5000,
    fleeThreshold: 0.1,
    poise: 2,
    behaviorKey: CoreEnemyType.Tank,
  },
  [CoreEnemyType.Berserker]: {
    enemyType: CoreEnemyType.Berserker as any,
    attackCooldown: 800,
    visionRange: 180,
    attackRange: 55,
    dodgeChance: 0.15,
    dodgeCooldown: 2500,
    fleeThreshold: 0.05,
    behaviorKey: CoreEnemyType.Berserker,
  },
};

export const defaultActionBattleSystems: ActionBattleSystems = {
  combat: defaultCombatSystem,
  ai: {
    actions: {},
    behaviors: defaultEnemyBehaviors,
    presets: defaultEnemyPresets,
  },
};

export const getEntityWeaponKnockbackForce = (entity: RpgPlayer): number => {
  return defaultKnockbackResolver({
    attacker: entity,
    target: entity,
    damage: { damage: 0, defeated: false },
  }).force;
};
