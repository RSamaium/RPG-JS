import type {
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
  if (typeof id === "string") return { id };
  if (typeof id === "function") {
    const value = id.call(skill);
    if (typeof value === "string") return { id: value };
  }
  return undefined;
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
  };
};

const serializeActionBattleVisualContext = (
  context: ActionBattleVisualContext
) => ({
  moment: context.moment,
  objectId: entityId(context.entity),
  sourceId: entityId(context.attacker ?? context.entity),
  targetId: entityId(context.target),
  damage: context.damage,
  defeated: context.defeated,
  result: serializeResult(context.result),
  skill: serializeSkill(context.skill),
  pattern: context.pattern,
  visual: context.visual,
  animations: context.animations,
  animationDefaults: context.animationDefaults,
});

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

      playActionBattleVisual(options.visual, visualContext);
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

const createHelpers = (context: ActionBattleVisualContext): ActionBattleVisualHelpers => ({
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

const resolveParts = (
  input: ActionBattleVisualInput | undefined
): Partial<Record<ActionBattleVisualContext["moment"], ActionBattleVisualPart>> | null => {
  const visual = input ?? "classic";
  if (visual === "none") return null;
  if (visual === "classic") return classicParts;
  if (visual === "fx") return fxParts;
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
  (composer as any).__actionBattleUsesFx = input === "fx";
  return composer;
}

export const createClassicActionBattleVisual = () =>
  createActionBattleVisual("classic");

export const createFxActionBattleVisual = () =>
  createActionBattleVisual("fx");

export function playActionBattleVisual(
  visual: ActionBattleVisualInput | ActionBattleVisualComposer | undefined,
  context: ActionBattleVisualContext
) {
  const composer =
    typeof visual === "function" ? visual : createActionBattleVisual(visual);
  composer(context);
}

export function usesActionBattleFxVisual(visual: ActionBattleVisualInput | undefined): boolean {
  return visual === "fx" || Boolean((visual as any)?.__actionBattleUsesFx);
}
