import type {
  ActionBattleSkillEffectContext,
  ActionBattleSkillEffectResult,
} from "@rpgjs/action-battle";
import {
  playStudioVisualEffect,
  resolveVisualEffect,
  visualEffectCastPart,
  visualEffectMapOf,
  type VisualEffectAnchor,
} from "@common/visual-effects";
import {
  isStudioProjectileRecord,
  studioProjectileEffectLook,
  studioProjectileImpactLook,
  studioProjectileOptions,
} from "@common/projectile";

/** The range of a skill in px (`targeting.range` tiles), `undefined` when it has none. */
const skillRange = (tileWidth: number, skill: any): number | undefined => {
  const tiles = Number(skill?.targeting?.range ?? skill?.range);
  return Number.isFinite(tiles) && tiles > 0 ? tiles * tileWidth : undefined;
};

const tileWidthOf = (map: { tileWidth?: number } | undefined) => {
  const width = Number(map?.tileWidth ?? 32);
  return Number.isFinite(width) && width > 0 ? width : 32;
};

/**
 * `skills.playEffect` of the Studio Action Battle preset: plays the Visual Effects of a skill or a combat item.
 *
 * - `visual.effect`: one effect from the caster to the target; the hit lands at its `hitAt`.
 * - `visual.split`: `castEffect` from the caster to the target, then `impactEffect` on the target when the cast
 *   effect hits; the hit lands at the `hitAt` of the impact effect.
 * - A projectile (`mode: "projectile"`, a skill or a thrown item) with a Projectile record (`action.projectileId`):
 *   its path, its area and its type (the id of the record, whose look the client registered) come from the record.
 *   At launch, the part of the effect that starts on the caster plays; the rest flies with the projectile and plays
 *   where it hits. An effect of the skill other than the one of the record is sent with the projectile.
 *
 * Without a target, the effect travels the way the caster faces over the range of the skill, with no impact.
 *
 * @returns `false` when the skill has no Visual Effect (or the records are missing): the `castFx` / `impactFx` stay.
 */
export const playStudioSkillVisualEffect = (
  context: ActionBattleSkillEffectContext,
): ActionBattleSkillEffectResult | false => {
  if (context.mode === "projectile") return launchProjectile(context);
  return playTowardTarget(context);
};

const playTowardTarget = ({ attacker, target, skill, visual }: ActionBattleSkillEffectContext): ActionBattleSkillEffectResult | false => {
  const map = visualEffectMapOf(attacker);
  const from = attacker as unknown as VisualEffectAnchor;
  const to = target as unknown as VisualEffectAnchor | undefined;
  const distance = to ? undefined : skillRange(tileWidthOf(map), skill);

  if (visual.split) {
    const cast = playStudioVisualEffect(map, visual.castEffect, { from, to, distance });
    const impact = to ? playStudioVisualEffect(map, visual.impactEffect, { from: to, to, delay: cast?.hitAt ?? 0 }) : undefined;
    if (!cast && !impact) return false;
    return { hitDelayMs: impact?.hitAt ?? cast?.hitAt ?? 0 };
  }

  const played = playStudioVisualEffect(map, visual.effect, { from, to, distance });
  return played ? { hitDelayMs: played.hitAt } : false;
};

const launchProjectile = (context: ActionBattleSkillEffectContext): ActionBattleSkillEffectResult | false => {
  const map = visualEffectMapOf(context.attacker);
  if (!map) return false;
  const id = (context.action as { projectileId?: unknown }).projectileId;
  const record = typeof id === "string" ? map.database?.()[id] : undefined;
  const found = isStudioProjectileRecord(record) ? { id: id as string, record } : undefined;

  const visual = context.visual;
  const ownEffect = visual.split ? visual.castEffect : visual.effect;
  const effect = resolveVisualEffect(map, ownEffect ?? found?.record.visualEffect);
  if (!found && !effect) return false;

  const cast = effect ? visualEffectCastPart(effect) : undefined;
  if (cast) {
    playStudioVisualEffect(map, cast, {
      from: context.attacker as unknown as VisualEffectAnchor,
      to: context.target as unknown as VisualEffectAnchor | undefined,
    });
  }
  // The look of the record already has the effect of the record; another effect goes with the projectile.
  const ownLook = ownEffect && ownEffect !== found?.record.visualEffect ? studioProjectileEffectLook(effect) : {};
  // A split impact effect plays whole where the projectile hits.
  const impactLook = visual.split ? studioProjectileImpactLook(resolveVisualEffect(map, visual.impactEffect)) : {};
  const options = found ? studioProjectileOptions(found.record, tileWidthOf(map)) : undefined;
  const params = { ...ownLook, ...impactLook };
  return {
    projectile: {
      ...options?.projectile,
      ...(found ? { type: found.id, payload: { projectileId: found.id } } : {}),
      ...(Object.keys(params).length ? { params } : {}),
    },
    ...(options?.area ? { area: options.area } : {}),
  };
};
