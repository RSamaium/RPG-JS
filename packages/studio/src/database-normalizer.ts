import { createStudioItemWorkflowHooks } from "./item-workflow";
import { createStudioSkillOnUse } from "./skill-workflow";

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
      ...(record.action?.visual ? { visual: record.action.visual } : {}),
      ...(projectile ? { projectile } : {}),
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
  const workflowHooks = createStudioItemWorkflowHooks(itemId, workflowTriggers);
  const useAnimation = isRegularItem ? mediaId(record.useAnimation) : undefined;
  const useSound = isRegularItem ? mediaId(record.useSound) : undefined;
  const useParticleEffect = isRegularItem
    && typeof record.useParticleEffect === "string"
    && record.useParticleEffect !== "none"
      ? record.useParticleEffect
      : undefined;
  const showUseFeedback = useAnimation || useSound || useParticleEffect
    ? (player: any) => {
        const map = player.getCurrentMap?.() ?? player.map;
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
  const onUse = isRegularItem && (showUseFeedback || workflowHooks.onUse)
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
        ...(useSound ? { useSound } : {}),
        ...(useParticleEffect ? { useParticleEffect } : {}),
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
