const getRecordType = (record: any): string | undefined => {
  return record?._type ?? record?.itemType ?? record?.type ?? record?.resourceType;
};

const normalizeHitRate = (value: unknown): number | undefined => {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return value > 1 ? value / 100 : value;
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
  return {
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
  const source = type === "skill" ? normalizeSkillRecord(record) : record;
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
