import {
  getActionBattleEntityTile,
  getActionBattleTileSize,
  resolveActionBattleAoeCells,
  resolveActionBattleAoeTarget,
} from "../targeting";
import {
  canActionBattleUseTarget,
  getActionBattleActionConfig,
  getActionBattleSkillTargetingConfig,
} from "./action-use";
import type {
  ActionBattleActionConfig,
  ActionBattleActionMode,
  ActionBattleActionTarget,
  ActionBattleEntity,
  ActionBattleSkillTargetingConfig,
  ActionBattleTargetOptions,
} from "./contracts";

export type ActionBattleAiActionRejectionReason =
  | "cooldown"
  | "insufficientSp"
  | "outOfRange"
  | "invalidTarget"
  | "maskMiss"
  | "notUseful";

export interface ActionBattleAiSkillEvaluation {
  kind: "skill";
  skill: any;
  id: string;
  mode: ActionBattleActionMode;
  targetPolicy: ActionBattleActionTarget;
  range: number;
  preferredRange: number;
  readyAt: number;
  target: ActionBattleEntity | ActionBattleEntity[];
  targetTile?: { x: number; y: number };
  rejection?: ActionBattleAiActionRejectionReason;
}

const resolveSignal = (value: any) =>
  typeof value === "function" ? value() : value;

const resolveSkillField = (skill: any, key: string) =>
  resolveSignal(
    skill?.[key] ?? skill?._skillInstance?.[key] ?? skill?._skillData?.[key]
  );

export const resolveActionBattleAiSkillId = (skill: any): string => {
  const id = resolveSkillField(skill, "id");
  if (typeof id === "string" && id) return id;
  const name = resolveSkillField(skill, "name");
  return typeof name === "string" && name ? name : "anonymous-skill";
};

const normalizeRange = (value: unknown): number | undefined => {
  const resolved = resolveSignal(value);
  const range = Number(resolved);
  return Number.isFinite(range) && range >= 0 ? range : undefined;
};

const resolveMode = (
  action: ActionBattleActionConfig | undefined,
  targeting: ActionBattleSkillTargetingConfig | undefined
): ActionBattleActionMode =>
  action?.mode ??
  ((normalizeRange(targeting?.range) ?? 0) > 0 ? "instant" : "melee");

const collectAreaTargets = (
  map: any,
  attacker: ActionBattleEntity,
  primaryTarget: ActionBattleEntity,
  targetTile: { x: number; y: number },
  mask: ActionBattleSkillTargetingConfig["aoeMask"],
  targetPolicy: ActionBattleActionTarget,
  targetOptions: ActionBattleTargetOptions
): ActionBattleEntity[] => {
  const tileSize = getActionBattleTileSize(map);
  const affected = new Set(
    resolveActionBattleAoeCells(targetTile, mask).map(
      (cell) => `${cell.x},${cell.y}`
    )
  );
  const targets = new Map<string, ActionBattleEntity>();
  const add = (candidate: ActionBattleEntity) => {
    const tile = getActionBattleEntityTile(candidate, tileSize);
    if (
      affected.has(`${tile.x},${tile.y}`) &&
      canActionBattleUseTarget(attacker, candidate, targetPolicy, targetOptions)
    ) {
      targets.set(candidate.id, candidate);
    }
  };

  add(primaryTarget);
  for (const candidate of map?.getEvents?.() ?? []) {
    if (candidate !== attacker) add(candidate);
  }
  for (const candidate of map?.getPlayers?.() ?? []) {
    if (candidate !== attacker) add(candidate);
  }
  return [...targets.values()];
};

export const evaluateActionBattleAiSkill = (input: {
  attacker: ActionBattleEntity;
  target: ActionBattleEntity;
  skill: any;
  now: number;
  readyAt: number;
  attackRange: number;
  hpPercent: number | null;
  targetOptions?: ActionBattleTargetOptions;
}): ActionBattleAiSkillEvaluation => {
  const { attacker, target, skill, now, readyAt, attackRange, hpPercent } =
    input;
  const map = (attacker as any).getCurrentMap?.();
  const action = getActionBattleActionConfig(skill);
  const targeting = getActionBattleSkillTargetingConfig(skill);
  const mode = resolveMode(action, targeting);
  const targetPolicy = action?.target ?? "enemy";
  const id = resolveActionBattleAiSkillId(skill);
  const distance = Math.hypot(
    (target as any).x() - (attacker as any).x(),
    (target as any).y() - (attacker as any).y()
  );
  const base = {
    kind: "skill" as const,
    skill,
    id,
    mode,
    targetPolicy,
    readyAt,
  };
  const applyCooldown = (
    evaluation: ActionBattleAiSkillEvaluation
  ): ActionBattleAiSkillEvaluation =>
    now < readyAt ? { ...evaluation, rejection: "cooldown" } : evaluation;

  const spCost = Number(resolveSkillField(skill, "spCost") ?? 0);
  if (spCost > Number((attacker as any).sp ?? 0)) {
    return {
      ...base,
      range: 0,
      preferredRange: 0,
      target,
      rejection: "insufficientSp",
    };
  }

  if (targetPolicy === "self") {
    const skillType = resolveSkillField(skill, "skillType");
    if (skillType !== "healing" && skillType !== "support") {
      return {
        ...base,
        range: 0,
        preferredRange: 0,
        target: attacker,
        rejection: "invalidTarget",
      };
    }
    if (hpPercent === null || hpPercent > 0.6) {
      return {
        ...base,
        range: 0,
        preferredRange: 0,
        target: attacker,
        rejection: "notUseful",
      };
    }
    return applyCooldown({
      ...base,
      range: 0,
      preferredRange: 0,
      target: attacker,
    });
  }

  if (
    targetPolicy === "ally" ||
    !canActionBattleUseTarget(
      attacker,
      target,
      targetPolicy,
      input.targetOptions
    )
  ) {
    return {
      ...base,
      range: 0,
      preferredRange: 0,
      target,
      rejection: "invalidTarget",
    };
  }

  if (mode === "projectile") {
    const tileSize = getActionBattleTileSize(map);
    const range =
      normalizeRange(action?.projectile?.range) ??
      normalizeRange(action?.range) ??
      (normalizeRange(targeting?.range) !== undefined
        ? normalizeRange(targeting?.range)! * tileSize.width
        : 160);
    return applyCooldown({
      ...base,
      range,
      preferredRange: range * 0.75,
      target,
      ...(distance <= range ? {} : { rejection: "outOfRange" as const }),
    });
  }

  const targetingRange = normalizeRange(targeting?.range);
  if (mode === "instant" && targetingRange !== undefined && map) {
    const tileSize = getActionBattleTileSize(map);
    const origin = getActionBattleEntityTile(attacker, tileSize);
    const desiredTarget = getActionBattleEntityTile(target, tileSize);
    const targetTile = resolveActionBattleAoeTarget(
      origin,
      desiredTarget,
      targetingRange,
      targeting?.aoeMask
    );
    if (!targetTile) {
      return {
        ...base,
        range: targetingRange * tileSize.width,
        preferredRange: targetingRange * tileSize.width * 0.75,
        target,
        rejection: "maskMiss",
      };
    }
    const targets = collectAreaTargets(
      map,
      attacker,
      target,
      targetTile,
      targeting?.aoeMask,
      targetPolicy,
      input.targetOptions ?? {}
    );
    if (targets.length === 0) {
      return {
        ...base,
        range: targetingRange * tileSize.width,
        preferredRange: targetingRange * tileSize.width * 0.75,
        target,
        targetTile,
        rejection: "maskMiss",
      };
    }
    return applyCooldown({
      ...base,
      range: targetingRange * tileSize.width,
      preferredRange: targetingRange * tileSize.width * 0.75,
      target: targets,
      targetTile,
    });
  }

  const range = normalizeRange(action?.range) ?? attackRange;
  return applyCooldown({
    ...base,
    range,
    preferredRange: range * 0.85,
    target,
    ...(distance <= range ? {} : { rejection: "outOfRange" as const }),
  });
};
