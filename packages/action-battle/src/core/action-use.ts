import { MAXHP } from "@rpgjs/server";
import { getActionBattleOptions } from "../config";
import { emitActionBattleClientVisual } from "../visual";
import { applyActionBattleHit } from "./hit";
import { getActionBattleSystems } from "./context";
import {
  canActionBattleTarget,
  getActionBattleFaction,
  getActionBattleTargets,
  isActionBattleCombatEntity,
  isActionBattleTargetDefeated,
} from "./targets";
import type {
  ActionBattleActionConfig,
  ActionBattleActionTarget,
  ActionBattleEntity,
  ActionBattleTargetOptions,
  ActionBattleProjectileImpactContext,
  ActionBattleProjectileOptions,
  ActionBattleUseContext,
} from "./contracts";
import type { NormalizedActionBattleAttackProfile } from "../types";

const projectileHandlers = new Map<
  string,
  {
    action: ActionBattleUseContext;
    onImpact?: ActionBattleProjectileOptions["onImpact"];
  }
>();

const normalizeDirection = (direction: { x: number; y: number }) => {
  const distance = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
  if (distance <= 0) return { x: 0, y: 1 };
  return {
    x: direction.x / distance,
    y: direction.y / distance,
  };
};

const directionToTarget = (
  attacker: ActionBattleEntity,
  target?: ActionBattleEntity | ActionBattleEntity[] | null
) => {
  const first = firstTarget(target);
  if (!first) return undefined;
  return normalizeDirection({
    x: (first as any).x() - (attacker as any).x(),
    y: (first as any).y() - (attacker as any).y(),
  });
};

const asArray = <T>(value: T | T[] | null | undefined): T[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const firstTarget = (
  target: ActionBattleEntity | ActionBattleEntity[] | null | undefined
) => asArray(target)[0];

const resolveActionConfig = (usable: any): ActionBattleActionConfig | undefined =>
  usable?.action ??
  usable?.actionBattle ??
  usable?._skillInstance?.action ??
  usable?._skillInstance?.actionBattle ??
  usable?._skillData?.action ??
  usable?._skillData?.actionBattle;

const getUseHookTarget = (usable: any) =>
  usable?._skillInstance ?? usable?._skillData ?? usable;

const getUseHook = (usable: any) => {
  const target = getUseHookTarget(usable);
  return typeof target?.onUse === "function"
    ? { hook: target.onUse, target }
    : undefined;
};

const isSkill = (usable: any, explicitSkill?: any) =>
  !!explicitSkill || usable?._type === "skill" || usable?.spCost !== undefined;

const consumeSkillUse = (attacker: ActionBattleEntity, skill: any) => {
  const spCost = typeof skill?.spCost === "number" ? skill.spCost : 0;
  if (spCost > 0) {
    if (spCost > ((attacker as any).sp ?? 0)) {
      throw new Error(`Not enough SP to use ${skill?.id ?? skill?.name ?? "skill"}`);
    }
    const halfCost =
      (attacker as any).hasEffect?.("HALF_SP_COST") ||
      (attacker as any).hasEffect?.("half_sp_cost");
    (attacker as any).sp -= spCost / (halfCost ? 2 : 1);
  }

  const hitRate = typeof skill?.hitRate === "number" ? skill.hitRate : 1;
  return Math.random() <= Math.max(0, Math.min(1, hitRate));
};

const applyDamageEffect = (
  attacker: ActionBattleEntity,
  target: ActionBattleEntity,
  skill: any,
  reaction?: NormalizedActionBattleAttackProfile["reaction"],
  metadata?: Record<string, any>
) => {
  const systems = getActionBattleSystems();
  const result = applyActionBattleHit(systems.combat, {
    attacker,
    target,
    skill,
    reaction,
    metadata,
  });

  if (result.defense?.kind === "parry") {
    emitActionBattleClientVisual({
      moment: "parry",
      entity: attacker,
      target,
      attacker,
      result,
      skill,
    });
    (attacker as any).battleAi?.stagger?.(
      result.defense.staggerMs,
      target
    );
    return result;
  }

  if (!result.cancelled) {
    (attacker as any).applyStates?.(target, skill);
    const targetAi = (target as any).battleAi;
    if (result.defense?.kind === "guard") {
      emitActionBattleClientVisual({
        moment: "block",
        entity: attacker,
        target,
        attacker,
        damage: result.damage,
        result,
        skill,
      });
    } else if (!targetAi?.handleDamage) {
      emitActionBattleClientVisual({
        moment: "hurt",
        entity: attacker,
        target,
        attacker,
        damage: result.damage,
        result,
        skill,
      });
    }
    targetAi?.handleDamage?.(attacker, {
      damage: result.damage,
      defeated: result.defeated,
      raw: result.rawDamage,
      reaction: result.reaction,
    });
  }

  return result;
};

const buildActionContext = (input: {
  attacker: ActionBattleEntity;
  target?: ActionBattleEntity | ActionBattleEntity[] | null;
  usable: any;
  skill?: any;
  weapon?: any;
  action?: ActionBattleActionConfig;
  pattern?: string;
  profile?: NormalizedActionBattleAttackProfile;
}): ActionBattleUseContext => {
  const action = {} as ActionBattleUseContext;
  Object.assign(action, {
    attacker: input.attacker,
    user: input.attacker,
    target: input.target,
    usable: input.usable,
    skill: input.skill,
    weapon: input.weapon,
    action: input.action,
    pattern: input.pattern,
    defaultEffect(target = input.target) {
      return asArray(target).map((entry) =>
        applyDamageEffect(
          input.attacker,
          entry,
          input.skill,
          input.profile?.reaction,
          {
            actionId: input.usable?.id,
            actionType: input.usable?._type,
            pattern: input.pattern,
            damageMultiplier: input.profile?.damageMultiplier,
            knockbackMultiplier: input.profile?.knockbackMultiplier,
            visual: input.action?.visual,
          }
        )
      );
    },
    damage(target = input.target) {
      const entry = firstTarget(target);
      if (!entry) return undefined;
      return applyDamageEffect(
        input.attacker,
        entry,
        input.skill,
        input.profile?.reaction,
        {
          actionId: input.usable?.id,
          actionType: input.usable?._type,
          pattern: input.pattern,
          damageMultiplier: input.profile?.damageMultiplier,
          knockbackMultiplier: input.profile?.knockbackMultiplier,
          visual: input.action?.visual,
        }
      );
    },
    heal(
      target: ActionBattleEntity | ActionBattleEntity[] | null | undefined,
      amount: number
    ) {
      if (!target || !Number.isFinite(amount) || amount <= 0) return 0;
      return asArray(target).reduce((total, entry) => {
        const currentHp = Number((entry as any).hp ?? 0);
        const rawParams =
          typeof (entry as any).param === "function"
            ? (entry as any).param()
            : (entry as any).param;
        const maxHp = rawParams?.[MAXHP] ?? Number.POSITIVE_INFINITY;
        const nextHp = Math.min(maxHp, currentHp + amount);
        (entry as any).hp = nextHp;
        emitActionBattleClientVisual({
          moment: "heal",
          entity: entry,
          target: entry,
          damage: Math.max(0, nextHp - currentHp),
          skill: input.skill,
          result: {
            damage: Math.max(0, nextHp - currentHp),
            metadata: {
              healing: true,
              visual: input.action?.visual,
            },
          },
        });
        return total + nextHp - currentHp;
      }, 0);
    },
    projectile(options: ActionBattleProjectileOptions = { type: "action" }) {
      const map = (input.attacker as any).getCurrentMap?.();
      if (!map?.projectiles?.emit) return [];

      const configured = input.action?.projectile ?? {};
      const projectile = {
        ...configured,
        ...options,
      };
      const range = projectile.range ?? input.action?.range ?? 160;
      const speed = projectile.speed ?? 180;
      const emitted = map.projectiles.emit(
        {
          type: projectile.type,
          origin: projectile.origin,
          direction:
            projectile.direction ?? directionToTarget(input.attacker, input.target),
          spreadDegrees: projectile.spreadDegrees,
          accuracy: projectile.accuracy,
          trajectory: projectile.trajectory ?? {
            type: "linear",
            speed,
            range,
          },
          collision: projectile.collision,
          repeat: projectile.repeat,
          pattern: projectile.pattern,
          payload: {
            ...projectile.payload,
            actionBattle: true,
            attackerId: input.attacker.id,
            actionId: input.usable?.id,
          },
          params: projectile.params,
          canHit: ({ target }: { target?: ActionBattleEntity }) => {
            if (!target) return false;
            return canActionBattleUseTarget(
              input.attacker,
              target,
              input.action?.target ?? "enemy",
              getActionBattleOptions().combat?.targets
            );
          },
        },
        input.attacker as any
      );

      for (const state of emitted) {
        projectileHandlers.set(state.id, {
          action,
          onImpact: projectile.onImpact,
        });
      }

      return emitted;
    },
  });
  return action;
};

export const getActionBattleActionConfig = (usable: any) =>
  resolveActionConfig(usable);

export const getActionBattleActionRange = (usable: any): number | undefined =>
  resolveActionConfig(usable)?.range;

export const canActionBattleUseTarget = (
  attacker: ActionBattleEntity,
  target: ActionBattleEntity,
  actionTarget: ActionBattleActionTarget = "enemy",
  options: ActionBattleTargetOptions = {}
): boolean => {
  if (isActionBattleTargetDefeated(target)) return false;

  if (actionTarget === "self") {
    return attacker === target;
  }

  if (actionTarget === "any") {
    return attacker === target || isActionBattleCombatEntity(target);
  }

  if (attacker === target || !isActionBattleCombatEntity(target)) {
    return false;
  }

  if (actionTarget === "ally") {
    const attackerFaction = getActionBattleFaction(attacker, options);
    const targetFaction = getActionBattleFaction(target, options);
    return !!attackerFaction && attackerFaction === targetFaction;
  }

  return canActionBattleTarget(
    attacker,
    target,
    getActionBattleTargets(attacker, "hostile"),
    options
  );
};

export const shouldUseActionBattleUsable = (
  usable: any,
  explicitSkill?: any
): boolean => {
  if (!usable) return false;
  return (
    isSkill(usable, explicitSkill) ||
    !!getUseHook(usable) ||
    !!resolveActionConfig(usable)
  );
};

export const executeActionBattleUse = (input: {
  attacker: ActionBattleEntity;
  target?: ActionBattleEntity | ActionBattleEntity[] | null;
  usable: any;
  skill?: any;
  weapon?: any;
  pattern?: string;
  profile?: NormalizedActionBattleAttackProfile;
  playVisual?: boolean;
}): boolean => {
  if (!shouldUseActionBattleUsable(input.usable, input.skill)) return false;

  const actionConfig = resolveActionConfig(input.usable);
  let skillSucceeded = true;
  if (isSkill(input.usable, input.skill)) {
    skillSucceeded = consumeSkillUse(
      input.attacker,
      input.skill ?? input.usable
    );
  }

  const action = buildActionContext({
    ...input,
    action: actionConfig,
  });
  const hook = getUseHook(input.usable);

  if (input.playVisual !== false) {
    emitActionBattleClientVisual({
      moment: input.skill ? "castSkill" : "attack",
      entity: input.attacker,
      skill: input.skill,
      target: firstTarget(input.target),
    });
  }

  if (!skillSucceeded) {
    emitActionBattleClientVisual({
      moment: "miss",
      entity: input.attacker,
      target: firstTarget(input.target),
      skill: input.skill,
      result: {
        damage: 0,
        cancelled: true,
        metadata: { miss: true },
      },
    });
    return true;
  }

  if (hook) {
    hook.hook.call(hook.target, input.attacker, input.target, action);
    return true;
  }

  if (actionConfig?.mode === "projectile") {
    action.projectile(actionConfig.projectile as ActionBattleProjectileOptions);
    return true;
  }

  action.defaultEffect(input.target);
  return true;
};

export const handleActionBattleProjectileImpact = (
  context: ActionBattleProjectileImpactContext
) => {
  const handler = projectileHandlers.get(context.projectile.id);
  if (!handler) return;
  const target = context.target;
  handler.action.target = target ?? handler.action.target;
  if (handler.onImpact) {
    handler.onImpact(context, handler.action);
  } else {
    handler.action.defaultEffect(target ?? undefined);
  }
};

export const handleActionBattleProjectileDestroy = (projectileId: string) => {
  projectileHandlers.delete(projectileId);
};
