import type { BattleEvent, BattleState, ItemDef, SkillDef } from "./types";
import { skillFor } from "./skills";

/**
 * How long the actions of a battle play. The client times its effects on it and the server waits for it before the next order, so both
 * stay in step whatever the length of a Visual Effect.
 */

/** When the Visual Effect from the caster to the target starts, in seconds of the event clock. */
export const EFFECT_START = 0.08;
/** How long an action plays at least, in seconds (the server paces its actions on it). */
export const ACTION_LENGTH = 1.5;

/**
 * When the parts of an attack or a skill play, in seconds of the event clock: `release` is when the strike leaves the caster, `impact`
 * when the hits land, `end` when the action is over. The Visual Effects of the skill set them (their `hitAt` and `duration`), else
 * the timing of the plain visuals.
 */
export function actionTiming(skill?: SkillDef): { release: number; impact: number; end: number } {
  if (!skill) return { release: 0.5, impact: 0.5, end: ACTION_LENGTH };
  if (skill.effect) {
    const impact = EFFECT_START + skill.effect.hitAt / 1000;
    return { release: EFFECT_START, impact, end: Math.max(ACTION_LENGTH, impact + 0.6, EFFECT_START + skill.effect.duration / 1000) };
  }
  // The effect of the impact starts once the one of the cast is over: the animation is seen, then the impact, not both at once
  const release = skill.castEffect ? Math.max(skill.castEffect.hitAt, skill.castEffect.duration) / 1000 : 0.5;
  const impact = release + (skill.impactEffect ? skill.impactEffect.hitAt / 1000 : 0.05);
  return {
    release,
    impact,
    end: Math.max(ACTION_LENGTH, impact + 0.6, (skill.castEffect?.duration ?? 0) / 1000, skill.impactEffect ? release + skill.impactEffect.duration / 1000 : 0),
  };
}

/**
 * When an item plays, in seconds of the event clock: `impact` is when the heal lands, `end` when the action is over. Its Visual Effect
 * sets them (it starts like the one of a skill), else the green burst of the plain look.
 */
export function itemTiming(item?: Pick<ItemDef, "effect">): { release: number; impact: number; end: number } {
  if (!item?.effect) return { release: 0.15, impact: 0.35, end: ACTION_LENGTH };
  const impact = EFFECT_START + item.effect.hitAt / 1000;
  return { release: EFFECT_START, impact, end: Math.max(ACTION_LENGTH, impact + 0.6, EFFECT_START + item.effect.duration / 1000) };
}

/** How long a move is walked, in seconds. */
export const MOVE_LENGTH = 0.9;

/** How long an event plays on the screens, in milliseconds at normal speed (0 for what shows nothing: a wait, a phase). */
export function eventDuration(state: BattleState, event: BattleEvent): number {
  if (event.kind === "move") return MOVE_LENGTH * 1000;
  if (event.kind === "guard") return 600;
  if (event.kind === "item") return itemTiming(event.itemId ? state.items?.[event.itemId] : undefined).end * 1000;
  if (event.kind !== "attack" && event.kind !== "skill") return 0;
  const unit = state.units.find((u) => u.id === event.unitId);
  return actionTiming(event.kind === "skill" && unit ? skillFor(state, unit, event.skillId) : undefined).end * 1000;
}
