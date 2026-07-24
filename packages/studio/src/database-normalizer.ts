const getRecordType = (record: any): string | undefined => {
  return record?._type ?? record?.itemType ?? record?.type ?? record?.resourceType;
};

const normalizeHitRate = (value: unknown): number | undefined => {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return value > 1 ? value / 100 : value;
};

const normalizeSkillRecord = (record: any): any => {
  const hitRate = normalizeHitRate(record.hitRate ?? record.successRate);
  return {
    ...record,
    spCost: record.spCost ?? record.mpCost ?? 0,
    hitRate: hitRate ?? 1,
    coefficient: record.coefficient ?? {},
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
