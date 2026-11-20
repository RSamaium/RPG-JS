import type { VisualEffect } from "@common/visual-effects";
import { isStudioProjectileRecord, studioProjectileLook, type StudioProjectileRecord } from "@common/projectile";

const mediaId = (value: unknown): string | undefined => {
  const id = value && typeof value === "object"
    ? (value as any)._id ?? (value as any).id ?? (value as any).mediaId ?? (value as any).fileName
    : value;
  return typeof id === "string" && id ? id : undefined;
};

const recordId = (record: any): string | undefined => mediaId(record);
const recordType = (record: any): unknown => record?._type ?? record?.type ?? record?.resourceType;

/**
 * The looks of the Projectile records of a database, by projectile type (the id of the record), for
 * `engine.registerProjectileLook`: each one with its image and the parts of its Visual Effect.
 *
 * @param records - The records of the database, as the data provider gives them.
 */
export function studioProjectileLooks(records: unknown[]): Record<string, Record<string, unknown>> {
  const byId = new Map<string, any>();
  for (const record of records) {
    const id = recordId(record);
    if (id) byId.set(id, record);
  }
  const looks: Record<string, Record<string, unknown>> = {};
  for (const [id, record] of byId) {
    if (!isStudioProjectileRecord({ _type: recordType(record) })) continue;
    const effectRecord = typeof record.visualEffect === "string" ? byId.get(record.visualEffect) : undefined;
    const effect: VisualEffect | undefined = effectRecord && recordType(effectRecord) === "visualEffect"
      ? {
          ...effectRecord,
          sounds: Array.isArray(effectRecord.sounds)
            ? effectRecord.sounds.map((entry: any) => ({ ...entry, sound: mediaId(entry?.sound) }))
            : undefined,
        }
      : undefined;
    const projectile: StudioProjectileRecord = { ...record, graphic: mediaId(record.graphic) };
    looks[id] = studioProjectileLook(projectile, effect);
  }
  return looks;
}

/** The media ids of the images of the Projectile records, to load before they fly. */
export function studioProjectileGraphics(records: unknown[]): string[] {
  return records
    .filter((record) => recordType(record) === "projectile")
    .map((record) => mediaId((record as any).graphic))
    .filter((id): id is string => !!id);
}
