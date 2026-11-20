import { createStudioItemWorkflowHooks } from "./item-workflow";
import { createStudioSkillOnUse } from "./skill-workflow";
import { playStudioVisualEffect } from "@common/visual-effects";

const getRecordType = (record: any): string | undefined => {
  return record?._type ?? record?.itemType ?? record?.type ?? record?.resourceType;
};

const normalizeHitRate = (value: unknown): number | undefined => {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const normalized = value > 1 ? value / 100 : value;
  return Math.max(0, Math.min(1, normalized));
};

const mediaId = (value: any): any =>
  value && typeof value === "object"
    ? value._id ?? value.id ?? value.mediaId ?? value.fileName
    : value;

const effectId = (value: unknown): string | undefined =>
  typeof value === "string" && value ? value : undefined;

/**
 * `action.visual` read by Action Battle (`skills.playEffect`): the skill fields `visualEffect` /
 * `visualEffectSplit` + `casterVisualEffect` / `targetVisualEffect` come first; without them, the
 * `action.visual.effect` / `split` / `castEffect` / `impactEffect` of the record stay.
 */
const normalizeSkillVisual = (record: any): any => {
  const visual = record.action?.visual;
  const effect = effectId(record.visualEffect);
  const castEffect = effectId(record.casterVisualEffect);
  const impactEffect = effectId(record.targetVisualEffect);
  if (record.visualEffectSplit === true && (castEffect || impactEffect)) {
    return { ...visual, ...(effect ? { effect } : {}), split: true, castEffect, impactEffect };
  }
  if (effect) return { ...visual, effect, split: false };
  return visual;
};

const normalizeSkillRecord = (record: any): any => {
  const hitRate = normalizeHitRate(record.hitRate ?? record.successRate);
  const legacyTarget =
    record.target === "self"
      ? "self"
      : record.target === "ally"
        ? "ally"
        : record.target === "any"
          ? "any"
          : "enemy";
  const targeting = {
    range: Number(record.targeting?.range ?? record.range ?? 0),
    ...(record.targeting?.aoeMask
      ? { aoeMask: record.targeting.aoeMask }
      : {}),
  };
  const projectile = record.action?.projectile
    ? {
        ...record.action.projectile,
        graphic: mediaId(record.action.projectile.graphic),
      }
    : undefined;
  const visual = normalizeSkillVisual(record);
  const normalized = {
    ...record,
    spCost: record.spCost ?? record.mpCost ?? 0,
    hitRate: hitRate ?? 1,
    coefficient: record.coefficient ?? {},
    icon: mediaId(record.icon),
    animation: mediaId(record.animation),
    sound: mediaId(record.sound),
    casterAnimation: mediaId(record.casterAnimation),
    impactSound: mediaId(record.impactSound),
    targeting,
    action: {
      mode:
        record.action?.mode ??
        (targeting.range > 0 ? "instant" : "melee"),
      target: record.action?.target ?? legacyTarget,
      cooldownMs: Number(record.action?.cooldownMs ?? 0),
      ...(visual ? { visual } : {}),
      ...(projectile ? { projectile } : {}),
      // A Projectile record of the database, read when the skill is cast (`skills.playEffect`).
      ...(effectId(record.action?.projectileId) ? { projectileId: record.action.projectileId } : {}),
    },
  };
  const onUse = createStudioSkillOnUse(
    String(record._id ?? record.id ?? ""),
    record.workflowTriggers,
  );
  return onUse ? { ...normalized, onUse } : normalized;
};

const normalizeItemRecord = (record: any, type: string): any => {
  const itemId = String(record._id ?? record.id ?? "");
  const isRegularItem = type === "item";
  const allowedWorkflowPhases = type === "item"
    ? new Set(["onAdd", "onUse", "onUseFailed", "onRemove"])
    : new Set(["onAdd", "onRemove", "onEquip"]);
  const workflowTriggers = Array.isArray(record.workflowTriggers)
    ? record.workflowTriggers.filter((trigger: any) =>
        allowedWorkflowPhases.has(trigger?.phase)
      )
    : [];
  const baseRecord = { ...record };
  delete baseRecord.consumable;
  delete baseRecord.hitRate;
  delete baseRecord.hpValue;
  delete baseRecord.mpValue;
  delete baseRecord.paramsModifier;
  delete baseRecord.successRate;
  delete baseRecord.useAnimation;
  delete baseRecord.useSound;
  delete baseRecord.useParticleEffect;
  delete baseRecord.useVisualEffect;
  delete baseRecord.throwProjectile;
  delete baseRecord.throwCooldownMs;
  // An item thrown in combat (a bomb, a boomerang): Action Battle uses it through its combat flow, with the Projectile
  // record it points to. It has no use hook: the hook would replace the throw.
  const throwProjectile = isRegularItem ? effectId(record.throwProjectile) : undefined;
  const workflowHooks = createStudioItemWorkflowHooks(itemId, workflowTriggers);
  const useAnimation = isRegularItem ? mediaId(record.useAnimation) : undefined;
  const useSound = isRegularItem ? mediaId(record.useSound) : undefined;
  const useVisualEffect = isRegularItem ? effectId(record.useVisualEffect) : undefined;
  const useParticleEffect = isRegularItem
    && typeof record.useParticleEffect === "string"
    && record.useParticleEffect !== "none"
      ? record.useParticleEffect
      : undefined;
  const showUseFeedback = useVisualEffect || useAnimation || useSound || useParticleEffect
    ? (player: any) => {
        const map = player.getCurrentMap?.() ?? player.map;
        // The use Visual Effect replaces the use animation and the particles; a deleted one falls back to them.
        if (useVisualEffect && playStudioVisualEffect(map, useVisualEffect, { from: player, to: player })) {
          if (useSound) player.playSound?.(useSound);
          return;
        }
        if (useAnimation && map?.showAnimation) {
          const x = typeof player.x === "function" ? player.x() : player.x;
          const y = typeof player.y === "function" ? player.y() : player.y;
          map.showAnimation(
            { x, y },
            useAnimation,
          );
        }
        if (useParticleEffect) {
          player.showComponentAnimation?.("studio-item-use-fx", {
            name: useParticleEffect,
            displayDuration: useParticleEffect === "levelUp" ? 900 : 650,
            zIndex: 1000,
          });
        }
        if (useSound) {
          player.playSound?.(useSound);
        }
      }
    : undefined;
  const onUse = isRegularItem && !throwProjectile && (showUseFeedback || workflowHooks.onUse)
    ? async (player: any) => {
        showUseFeedback?.(player);
        await workflowHooks.onUse?.(player);
      }
    : undefined;
  const typeSpecificData = isRegularItem
    ? {
        hpValue: Number(record.hpValue ?? 0),
        mpValue: Number(record.mpValue ?? 0),
        hitRate: normalizeHitRate(record.hitRate ?? record.successRate) ?? 1,
        consumable: typeof record.consumable === "boolean"
          ? record.consumable
          : true,
        ...(useAnimation ? { useAnimation } : {}),
        ...(useVisualEffect ? { useVisualEffect } : {}),
        ...(useSound ? { useSound } : {}),
        ...(useParticleEffect ? { useParticleEffect } : {}),
        ...(throwProjectile
          ? {
              action: {
                mode: "projectile",
                target: "enemy",
                cooldownMs: Math.max(0, Number(record.throwCooldownMs ?? 0) || 0),
                projectileId: throwProjectile,
              },
            }
          : {}),
      }
    : {
        paramsModifier: record.paramsModifier ?? {},
      };
  return {
    ...baseRecord,
    icon: mediaId(record.icon),
    workflowTriggers,
    ...typeSpecificData,
    ...workflowHooks,
    ...(onUse ? { onUse } : {}),
  };
};

/** Visual Effect records: the sounds of the timeline point to media ids. */
const normalizeVisualEffectRecord = (record: any): any => ({
  ...record,
  ...(Array.isArray(record.sounds)
    ? { sounds: record.sounds.map((entry: any) => ({ ...entry, sound: mediaId(entry?.sound) })) }
    : {}),
});

export const normalizeStudioDatabaseRecord = (
  record: any,
): { id: string; data: any } | null => {
  if (!record || typeof record !== "object") return null;

  const id =
    typeof record._id === "string" && record._id
      ? record._id
      : typeof record.id === "string" && record.id
        ? record.id
        : "";
  if (!id) return null;

  const type = getRecordType(record);
  const source = type === "skill"
    ? normalizeSkillRecord(record)
    : type === "item" || type === "weapon" || type === "armor"
      ? normalizeItemRecord(record, type)
      : type === "visualEffect"
        ? normalizeVisualEffectRecord(record)
        : type === "projectile"
          ? { ...record, ...(record.graphic ? { graphic: mediaId(record.graphic) } : {}) }
          : record;
  const data = {
    ...source,
    id,
    _type: type,
  };

  delete data.itemType;
  delete data.resourceType;
  delete data.type;
  delete data._id;

  return { id, data };
};

export const normalizeStudioDatabase = (records: any[]): Record<string, any> => {
  const database: Record<string, any> = {};

  for (const record of records) {
    const normalized = normalizeStudioDatabaseRecord(record);
    if (!normalized) continue;
    database[normalized.id] = normalized.data;
  }

  return database;
};
