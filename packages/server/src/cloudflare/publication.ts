import { z } from 'zod';

/** Private object storage needed by versioned publications (compatible with R2). */
export interface RpgPublicationBucket {
  /** Read an immutable artifact. */
  get(key: string): Promise<{ text(): Promise<string> } | null>;
  /** Create an artifact only if its key does not already exist. */
  put(key: string, value: string, options: { onlyIf: { etagDoesNotMatch: string } }): Promise<unknown>;
}

const identifier = z.string().min(1).max(200).regex(/^[a-zA-Z0-9_-]+$/);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const mapSchema = z.object({
  id: identifier,
  width: z.number().positive().finite(),
  height: z.number().positive().finite(),
}).passthrough();
const sharedSchema = z.object({
  config: z.record(z.string(), z.unknown()),
  database: z.union([z.array(z.unknown()), z.record(z.string(), z.unknown())]),
}).strict();
const manifestSchema = z.object({
  schemaVersion: z.literal(1),
  projectId: identifier,
  startMapId: identifier,
  shared: digest,
  maps: z.record(identifier, digest),
}).strict().refine(value => Object.hasOwn(value.maps, value.startMapId), 'Starting map is missing');

/** Immutable project version. Hashes address private objects within this project. */
export type RpgPublicationManifest = z.infer<typeof manifestSchema>;
/** Server-owned prepared map, before its shared config/database are attached. */
export type RpgPublicationMap = z.infer<typeof mapSchema>;
/** Data shared by all maps in a publication. */
export type RpgPublicationShared = z.infer<typeof sharedSchema>;
/** Compact durable pointer to an activated project version. */
export interface RpgPublicationHead {
  /** Monotonically increasing activation number. */
  revision: number;
  /** SHA-256 of the project's immutable manifest. */
  manifest: string;
}

/**
 * Upload one complete version without activating it. Objects are addressed by
 * content hash; identical input reuses the same keys. Call the authenticated
 * activation endpoint with the returned hash and the expected current revision.
 * @example
 * const manifest = await prepareRpgPublication(env.GAME_DATA, {
 *   projectId: 'game', startMapId: 'town',
 *   shared: { config: {}, database: [] }, maps: [{ id: 'town', width: 640, height: 480 }],
 * });
 */
export async function prepareRpgPublication(bucket: RpgPublicationBucket, input: {
  /** Stable project identifier. Map identifiers must be globally unique per room binding. */
  projectId: string;
  /** First map entered by new players. */
  startMapId: string;
  /** Project configuration (including world topology) and database. */
  shared: RpgPublicationShared;
  /** Complete server-prepared maps, with config/database stored in shared instead. */
  maps: RpgPublicationMap[];
}): Promise<string> {
  identifier.parse(input.projectId);
  const shared = sharedSchema.parse(input.shared);
  const maps: Record<string, string> = Object.create(null);
  for (const source of input.maps) {
    const map = mapSchema.parse(source);
    if (Object.hasOwn(maps, map.id)) throw new Error('Duplicate publication map');
    if ('config' in map || 'database' in map) throw new Error('Store config and database in shared');
    maps[map.id] = await writeArtifact(bucket, input.projectId, map);
  }
  return writeArtifact(bucket, input.projectId, manifestSchema.parse({
    schemaVersion: 1, projectId: input.projectId, startMapId: input.startMapId,
    shared: await writeArtifact(bucket, input.projectId, shared), maps,
  }));
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    const result = JSON.stringify(value);
    if (result === undefined) throw new Error('Publication data must be JSON');
    return result;
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`;
}
async function hash(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}
function artifactKey(projectId: string, ref: string): string {
  identifier.parse(projectId); digest.parse(ref);
  return `rpgjs/publications/${projectId}/${ref}.json`;
}
async function writeArtifact(bucket: RpgPublicationBucket, projectId: string, value: unknown) {
  const text = canonical(value);
  const ref = await hash(text);
  await bucket.put(artifactKey(projectId, ref), text, { onlyIf: { etagDoesNotMatch: '*' } });
  return ref;
}
async function readArtifact(bucket: RpgPublicationBucket, projectId: string, ref: string): Promise<unknown> {
  const object = await bucket.get(artifactKey(projectId, ref));
  if (!object) throw new Error('Missing publication artifact');
  const text = await object.text();
  if (await hash(text) !== ref) throw new Error('Publication artifact integrity failure');
  return JSON.parse(text);
}
export async function readManifest(bucket: RpgPublicationBucket, projectId: string, ref: string) {
  const manifest = manifestSchema.parse(await readArtifact(bucket, projectId, ref));
  if (manifest.projectId !== projectId) throw new Error('Publication project mismatch');
  return manifest;
}
export async function readPublicationMap(bucket: RpgPublicationBucket, manifest: RpgPublicationManifest, mapId: string) {
  if (!Object.hasOwn(manifest.maps, mapId)) throw new Error('Map is not published');
  const map = mapSchema.parse(await readArtifact(bucket, manifest.projectId, manifest.maps[mapId]));
  if (map.id !== mapId) throw new Error('Publication map mismatch');
  const shared = sharedSchema.parse(await readArtifact(bucket, manifest.projectId, manifest.shared));
  return { ...map, config: { ...shared.config, startMapId: manifest.startMapId }, database: shared.database };
}
export async function validatePublication(bucket: RpgPublicationBucket, manifest: RpgPublicationManifest) {
  // Read every artifact before activation, without retaining the entire project in memory.
  sharedSchema.parse(await readArtifact(bucket, manifest.projectId, manifest.shared));
  for (const [id, ref] of Object.entries(manifest.maps)) {
    const map = mapSchema.parse(await readArtifact(bucket, manifest.projectId, ref));
    if (map.id !== id || 'config' in map || 'database' in map) throw new Error('Invalid publication map');
  }
}
export function ownershipKey(mapId: string) {
  identifier.parse(mapId);
  return `rpgjs/publications/owners/${mapId}.json`;
}
export async function getMapOwner(bucket: RpgPublicationBucket, mapId: string): Promise<string | null> {
  const object = await bucket.get(ownershipKey(mapId));
  return object ? identifier.parse(JSON.parse(await object.text())) : null;
}
