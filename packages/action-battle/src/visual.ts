import type {
  ActionBattleAnimationOptions,
  ActionBattleAnimationKey,
  ActionBattleVisualComposer,
  ActionBattleVisualContext,
  ActionBattleVisualHelpers,
  ActionBattleVisualInput,
  ActionBattleVisualPart,
} from "./types";
import { getActionBattleOptions } from "./config";
import { playActionBattleAnimation } from "./animations";

export const ACTION_BATTLE_CLIENT_VISUAL_ID = "action-battle.visual";
export const ACTION_BATTLE_HIT_FX_COMPONENT_ID = "action-battle-hit-fx";
export const ACTION_BATTLE_DAMAGE_COMPONENT_ID = "action-battle-damage";
export const ACTION_BATTLE_TELEGRAPH_COMPONENT_ID =
  "action-battle-telegraph";

type PreviewStarter = (
  entity: any,
  options?: Record<string, any>
) => void;

let previewStarter: PreviewStarter | undefined;

export function setActionBattlePreviewStarter(starter?: PreviewStarter) {
  previewStarter = starter;
}

const entityId = (entity: any): string | undefined =>
  typeof entity?.id === "string" ? entity.id : undefined;

const serializeSkill = (skill: any) => {
  const id = skill?.id;
  const name =
    typeof skill?.name === "string"
      ? skill.name
      : typeof skill?.name === "function"
        ? skill.name.call(skill)
        : undefined;
  if (typeof id === "string") return { id, name };
  if (typeof id === "function") {
    const value = id.call(skill);
    if (typeof value === "string") return { id: value, name };
  }
  return undefined;
};

const serializePresentation = (entity: any) => {
  const presentation = entity?.battleAi?.getPresentation?.();
  if (!presentation || presentation.role === "enemy") return undefined;
  return {
    role: presentation.role,
    name: presentation.name ?? entity?.name,
    maxHp:
      typeof entity?.param?.maxHp === "number"
        ? entity.param.maxHp
        : typeof entity?.hp === "number"
          ? entity.hp
          : undefined,
  };
};

const serializeResult = (result: any) => {
  if (!result) return undefined;
  return {
    damage: result.damage,
    knockbackForce: result.knockbackForce,
    knockbackDuration: result.knockbackDuration,
    defeated: result.defeated,
    attackerId: entityId(result.attacker),
    targetId: entityId(result.target),
    rawDamage: result.rawDamage,
    reaction: result.reaction,
    cancelled: result.cancelled,
    metadata: result.metadata,
    durationMs: result.durationMs,
    telegraphScale: result.telegraphScale,
    pattern: result.pattern,
  };
};

const animationKeys: ActionBattleAnimationKey[] = [
  "attack",
  "hurt",
  "die",
  "castSkill",
  "castSpell",
];

const serializeAnimationResult = (result: any) => {
  if (typeof result === "string") return result;
  if (!result || typeof result !== "object") return undefined;

  const graphic =
    typeof result.graphic === "string"
      ? result.graphic
      : Array.isArray(result.graphic)
        ? result.graphic.filter((value: unknown) => typeof value === "string")
        : undefined;

  return {
    ...(typeof result.animationName === "string"
      ? { animationName: result.animationName }
      : {}),
    ...(graphic !== undefined ? { graphic } : {}),
    ...(typeof result.repeat === "number" ? { repeat: result.repeat } : {}),
    ...(typeof result.waitEnd === "boolean"
      ? { waitEnd: result.waitEnd }
      : {}),
    ...(typeof result.delayMs === "number"
      ? { delayMs: result.delayMs }
      : {}),
  };
};

const serializeAnimations = (
  animations: ActionBattleAnimationOptions | undefined,
  context: ActionBattleVisualContext,
) => {
  if (!animations) return undefined;
  const result: ActionBattleAnimationOptions = {};

  for (const key of animationKeys) {
    if (!Object.prototype.hasOwnProperty.call(animations, key)) continue;
    const configured = animations[key];
    const entity =
      key === "hurt" || key === "die"
        ? context.target ?? context.entity
        : context.attacker ?? context.entity;

    try {
      const resolved =
        typeof configured === "function"
          ? configured(entity, {
              attacker: context.attacker,
              target: context.target,
              skill: context.skill,
            })
          : configured;
      const serialized = serializeAnimationResult(resolved);
      if (serialized !== undefined) {
        result[key] = serialized;
      }
    } catch {
      // A game-specific resolver must not prevent the remaining client visual
      // packet from being delivered.
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
};

const serializeActionBattleVisualContext = (
  context: ActionBattleVisualContext
) => {
  const source = context.attacker ?? context.entity;
  const presentations: Record<string, any> = {};
  const sourceId = entityId(source);
  const targetId = entityId(context.target);
  if (sourceId) presentations[sourceId] = serializePresentation(source);
  if (targetId) presentations[targetId] = serializePresentation(context.target);
  return {
  moment: context.moment,
  objectId: entityId(context.entity),
  sourceId,
  targetId,
  damage: context.damage,
  defeated: context.defeated,
  result: serializeResult(context.result),
  skill: serializeSkill(context.skill),
  pattern: context.pattern,
  visual: context.visual,
  animations: serializeAnimations(context.animations, context),
  animationDefaults: context.animationDefaults,
  presentations,
  };
};

export function emitActionBattleClientVisual(
  context: ActionBattleVisualContext
) {
  if (getActionBattleOptions().visual === "none") return;
  const anchor = context.entity ?? context.target ?? context.attacker;
  const map = anchor?.getCurrentMap?.();
  if (!map?.clientVisual) return;
  map.clientVisual(
    ACTION_BATTLE_CLIENT_VISUAL_ID,
    serializeActionBattleVisualContext(context)
  );
}

export function createActionBattleClientVisuals(
  options = getActionBattleOptions()
) {
  return {
    [ACTION_BATTLE_CLIENT_VISUAL_ID]: (context: any, helpers: any) => {
      const data = context.data ?? {};
      const visualContext = {
        moment: data.moment,
        entity: context.object ?? context.source ?? context.target,
        target: context.target,
        attacker: context.source,
        damage: data.damage,
        defeated: data.defeated,
        result: data.result,
        skill: data.skill,
        pattern: data.pattern,
        visual: data.visual,
        animations: data.animations ?? options.animations,
        animationDefaults: data.animationDefaults,
      } as ActionBattleVisualContext;

      const cue = data.visual;
      if (data.moment === "ai" && cue && typeof cue.kind === "string") {
        const handler = options.ai?.visuals?.[cue.kind];
        if (!handler) return;
        return handler(
          {
            ...context,
            visual: cue,
          },
          helpers
        );
      }

      playActionBattleVisual(options.visual, visualContext, helpers);
    },
  };
}

const callGraphic = (
  entity: any,
  keyOrOptions: ActionBattleAnimationKey | any,
  context?: ActionBattleVisualContext
) => {
  if (!entity || keyOrOptions == null) return;

  if (typeof keyOrOptions === "string") {
    const animation = playActionBattleAnimation(
      keyOrOptions as ActionBattleAnimationKey,
      entity,
      context?.animations ?? getActionBattleOptions().animations,
      {
        attacker: context?.attacker,
        target: context?.target,
        skill: context?.skill,
      },
      context?.animationDefaults
    );
    return;
  }

  const animationName = keyOrOptions.animationName;
  if (!animationName) return;
  const repeat = keyOrOptions.repeat ?? 1;
  const graphic = keyOrOptions.graphic;
  if (typeof entity.setGraphicAnimation === "function") {
    if (graphic !== undefined) {
      entity.setGraphicAnimation(animationName, graphic, repeat);
    } else {
      entity.setGraphicAnimation(animationName, repeat);
    }
    return;
  }
  if (typeof entity.setAnimation === "function") {
    if (graphic !== undefined) {
      entity.setAnimation(animationName, graphic, repeat);
    } else {
      entity.setAnimation(animationName, repeat);
    }
  }
};

const createHelpers = (
  context: ActionBattleVisualContext,
  clientHelpers?: any
): ActionBattleVisualHelpers => ({
  graphic(entity, keyOrOptions) {
    callGraphic(entity, keyOrOptions, context);
  },
  flash(entity, options = {}) {
    entity?.flash?.({
      type: "tint",
      tint: "red",
      duration: 200,
      cycles: 1,
      ...options,
    });
  },
  damageText(entity, damageOrText) {
    if (typeof damageOrText === "string") {
      if (entity?.showHit) {
        entity.showHit(damageOrText);
        return;
      }
      entity?.showComponentAnimation?.("hit", {
        text: damageOrText,
        direction: entity?.direction?.() ?? entity?.direction,
      });
      return;
    }
    const damage = damageOrText ?? context.damage ?? context.result?.damage;
    if (damage === undefined) return;
    const text = `-${damage}`;
    if (entity?.showHit) {
      entity.showHit(text);
      return;
    }
    entity?.showComponentAnimation?.("hit", {
      text,
      direction: entity?.direction?.() ?? entity?.direction,
    });
  },
  component(entity, id, params = {}) {
    entity?.showComponentAnimation?.(id, params);
  },
  preview(entity, options = {}) {
    previewStarter?.(entity, options);
  },
  sound(id, options) {
    void clientHelpers?.sound?.(id, options);
  },
  shake(options = {}) {
    clientHelpers?.shake?.(options);
  },
});

const classicParts: Partial<Record<ActionBattleVisualContext["moment"], ActionBattleVisualPart>> = {
  attack({ entity }, fx) {
    fx.graphic(entity, "attack");
  },
  castSkill({ entity }, fx) {
    fx.graphic(entity, "castSkill");
  },
  preview({ entity }, fx) {
    fx.preview(entity);
  },
  hit({ target, damage }, fx) {
    fx.flash(target);
    fx.damageText(target, damage);
  },
  hurt({ entity, target }, fx) {
    const hurtTarget = target ?? entity;
    fx.flash(hurtTarget);
    fx.damageText(hurtTarget);
    fx.graphic(hurtTarget, "hurt");
  },
  defeat({ entity, target }, fx) {
    fx.graphic(target ?? entity, "die");
  },
};

const fxParts: Partial<Record<ActionBattleVisualContext["moment"], ActionBattleVisualPart>> = {
  ...classicParts,
  hit(context, fx) {
    classicParts.hit?.(context, fx);
    fx.component(context.target, ACTION_BATTLE_HIT_FX_COMPONENT_ID, {
      name: "hitSpark",
      scale: 0.8,
      zIndex: 1000,
    });
  },
  hurt(context, fx) {
    classicParts.hurt?.(context, fx);
    fx.component(context.target ?? context.entity, ACTION_BATTLE_HIT_FX_COMPONENT_ID, {
      name: "hitSpark",
      scale: 0.8,
      zIndex: 1000,
    });
  },
};

const resolveDamageKind = (context: ActionBattleVisualContext) => {
  const raw = context.result?.rawDamage ?? context.result?.raw;
  if (context.result?.metadata?.healing) return "heal";
  if (raw?.critical) return "critical";
  if (context.result?.metadata?.charged) return "charged";
  if (context.result?.metadata?.comboStep >= 2) return "finisher";
  if (context.skill) return "skill";
  return "damage";
};

const resolveImpactFx = (context: ActionBattleVisualContext) => {
  const configured = context.result?.metadata?.visual?.fx;
  if (typeof configured === "string" && configured) return configured;
  const kind = resolveDamageKind(context);
  if (kind === "heal") return "healPulse";
  if (kind === "critical" || kind === "charged") return "impactBurst";
  if (kind === "finisher") return "slashSpark";
  if (kind === "skill") return "magicBurst";
  return "hitSpark";
};

const showImpactDamage = (
  context: ActionBattleVisualContext,
  fx: ActionBattleVisualHelpers,
  entity: any
) => {
  const amount = context.damage ?? context.result?.damage;
  if (amount === undefined) return;
  const kind = resolveDamageKind(context);
  const visual = context.result?.metadata?.visual ?? {};
  fx.component(entity, ACTION_BATTLE_DAMAGE_COMPONENT_ID, {
    amount,
    kind,
    caption: kind === "skill" ? context.skill?.name : undefined,
    color: visual.color,
    accentColor: visual.accentColor,
    duration: kind === "critical" || kind === "charged" ? 1050 : 900,
    zIndex: 1200,
  });
};

const showImpactFx = (
  context: ActionBattleVisualContext,
  fx: ActionBattleVisualHelpers,
  entity: any
) => {
  const visual = context.result?.metadata?.visual ?? {};
  const kind = resolveDamageKind(context);
  fx.component(entity, ACTION_BATTLE_HIT_FX_COMPONENT_ID, {
    name: resolveImpactFx(context),
    scale:
      visual.scale ??
      (kind === "critical" || kind === "charged"
        ? 1.3
        : kind === "finisher" || kind === "skill"
          ? 1.05
          : 0.82),
    displayDuration: kind === "heal" ? 700 : 420,
    zIndex: 1000,
  });
};

const impactParts: Partial<Record<ActionBattleVisualContext["moment"], ActionBattleVisualPart>> = {
  ...fxParts,
  hit(context, fx) {
    const target = context.target;
    fx.flash(target, {
      tint: context.result?.rawDamage?.critical ? "white" : "red",
      duration: 150,
      cycles: 1,
    });
    showImpactDamage(context, fx, target);
    showImpactFx(context, fx, target);
    fx.shake({
      intensity: context.result?.metadata?.charged ? 7 : 3,
      duration: context.result?.metadata?.charged ? 260 : 130,
      frequency: 20,
    });
  },
  hurt(context, fx) {
    const target = context.target ?? context.entity;
    fx.flash(target, {
      tint: context.result?.rawDamage?.critical ? "white" : "red",
      duration: 150,
      cycles: 1,
    });
    fx.graphic(target, "hurt");
    showImpactDamage(context, fx, target);
    showImpactFx(context, fx, target);
    fx.shake({
      intensity: context.result?.metadata?.charged ? 7 : 4,
      duration: context.result?.metadata?.charged ? 260 : 160,
      frequency: 18,
    });
  },
  heal(context, fx) {
    const target = context.target ?? context.entity;
    showImpactDamage(context, fx, target);
    showImpactFx(context, fx, target);
    fx.flash(target, {
      tint: "#70f5a5",
      duration: 260,
      cycles: 2,
    });
  },
  defeat(context, fx) {
    classicParts.defeat?.(context, fx);
    fx.component(context.target ?? context.entity, ACTION_BATTLE_HIT_FX_COMPONENT_ID, {
      name: "explosionSmall",
      scale: 1.4,
      zIndex: 1000,
    });
    fx.shake({ intensity: 8, duration: 320, frequency: 16 });
  },
  dodge({ entity }, fx) {
    fx.flash(entity, { tint: "white", duration: 120, cycles: 2 });
    fx.component(entity, ACTION_BATTLE_HIT_FX_COMPONENT_ID, {
      name: "dashDust",
      scale: 0.75,
      displayDuration: 220,
      zIndex: 900,
    });
  },
  chargeStart({ entity }, fx) {
    fx.flash(entity, { tint: "gold", duration: 300, cycles: 2 });
    fx.component(entity, ACTION_BATTLE_HIT_FX_COMPONENT_ID, {
      name: "magicBurst",
      scale: 1.1,
      displayDuration: 900,
      zIndex: 900,
    });
  },
  chargeRelease({ entity }, fx) {
    fx.graphic(entity, "attack");
    fx.shake({ intensity: 5, duration: 220, frequency: 18 });
  },
  castSkill(context, fx) {
    classicParts.castSkill?.(context, fx);
    fx.component(context.entity, ACTION_BATTLE_HIT_FX_COMPONENT_ID, {
      name: "magicBurst",
      scale: 0.72,
      displayDuration: 360,
      zIndex: 900,
    });
  },
  telegraph({ entity, result }, fx) {
    fx.component(entity, ACTION_BATTLE_TELEGRAPH_COMPONENT_ID, {
      pattern: result?.pattern,
      scale: result?.telegraphScale ?? 1,
      durationMs: result?.durationMs ?? 300,
      zIndex: 800,
    });
  },
};

const resolveParts = (
  input: ActionBattleVisualInput | undefined
): Partial<Record<ActionBattleVisualContext["moment"], ActionBattleVisualPart>> | null => {
  const visual = input ?? "classic";
  if (visual === "none") return null;
  if (visual === "classic") return classicParts;
  if (visual === "fx") return fxParts;
  if (visual === "impact") return impactParts;
  if (typeof visual === "function") return null;
  return visual;
};

export function createActionBattleVisual(
  input: ActionBattleVisualInput = "classic"
): ActionBattleVisualComposer {
  if (typeof input === "function") {
    return input;
  }
  const parts = resolveParts(input);
  const composer: ActionBattleVisualComposer = (context) => {
    if (!parts) return;
    const part = parts[context.moment];
    if (!part) return;
    part(context, createHelpers(context));
  };
  (composer as any).__actionBattleUsesFx =
    input === "fx" || input === "impact";
  (composer as any).__actionBattleParts = parts;
  return composer;
}

export const createClassicActionBattleVisual = () =>
  createActionBattleVisual("classic");

export const createFxActionBattleVisual = () =>
  createActionBattleVisual("fx");

export function playActionBattleVisual(
  visual: ActionBattleVisualInput | ActionBattleVisualComposer | undefined,
  context: ActionBattleVisualContext,
  clientHelpers?: any
) {
  if (typeof visual === "function") {
    const parts = (visual as any).__actionBattleParts as
      | Partial<
          Record<ActionBattleVisualContext["moment"], ActionBattleVisualPart>
        >
      | undefined;
    if (parts) {
      parts[context.moment]?.(context, createHelpers(context, clientHelpers));
      return;
    }
    visual(context);
    return;
  }
  const parts = resolveParts(visual);
  const part = parts?.[context.moment];
  part?.(context, createHelpers(context, clientHelpers));
}

export function usesActionBattleFxVisual(visual: ActionBattleVisualInput | undefined): boolean {
  return visual === "fx" || visual === "impact" || Boolean((visual as any)?.__actionBattleUsesFx);
}
