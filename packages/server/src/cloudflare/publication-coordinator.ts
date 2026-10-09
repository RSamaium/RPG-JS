import { z } from 'zod';
import { isMapUpdateAuthorized, MAP_UPDATE_TOKEN_ENV } from '../map-update';
import {
  getMapOwner, ownershipKey, readManifest, validatePublication,
  type RpgPublicationBucket, type RpgPublicationHead,
} from './publication';

/** Bindings enabling private, versioned Cloudflare map publication. */
export interface RpgPublicationOptions {
  /** Private R2 bucket binding containing immutable publication artifacts. */
  bucket: string;
  /** Namespace binding for RpgPublicationDurableObject, one instance per project. */
  coordinator: string;
}
interface Namespace {
  idFromName(name: string): unknown;
  get(id: unknown): { fetch(request: Request): Promise<Response> };
}
interface Storage {
  get<T>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<unknown>;
  list<T>(options: { prefix: string; limit?: number; startAfter?: string }): Promise<Map<string, T>>;
  setAlarm(time: number): Promise<unknown>;
  transaction<T>(callback: (storage: Storage) => Promise<T>): Promise<T>;
}
interface RoomStatus {
  session: string;
  revision: number;
  failed: boolean;
  retired?: boolean;
}
interface Configuration extends RpgPublicationOptions { rooms: string; partiesPath: string }
let configuration: Configuration | undefined;
export function configurePublications(options: Configuration | undefined) { configuration = options; }
export function publicationBindings(env: Record<string, unknown>) {
  if (!configuration) throw new Error('Publication is not configured');
  return {
    config: configuration,
    bucket: env[configuration.bucket] as RpgPublicationBucket,
    coordinator: env[configuration.coordinator] as Namespace,
    rooms: env[configuration.rooms] as Namespace,
  };
}
export function publicationHeaders(env: Record<string, unknown>) {
  const token = env[MAP_UPDATE_TOKEN_ENV];
  if (typeof token !== 'string' || !token) throw new Error('Missing publication secret');
  return { 'content-type': 'application/json', 'x-rpgjs-map-update-token': token };
}
export function authorizedPublication(request: Request, env: Record<string, unknown>) {
  const token = env[MAP_UPDATE_TOKEN_ENV];
  return typeof token === 'string' && token.length > 0 && isMapUpdateAuthorized(request.headers, token);
}
export async function coordinatorRequest(env: Record<string, unknown>, projectId: string, path: string, body?: unknown) {
  const { coordinator } = publicationBindings(env);
  return coordinator.get(coordinator.idFromName(projectId)).fetch(new Request(
    `https://publication.internal/publications/${encodeURIComponent(projectId)}${path}`, {
      method: body === undefined ? 'GET' : 'POST', headers: publicationHeaders(env),
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
  ));
}

/**
 * Per-project Durable Object that atomically activates versions and durably
 * retries notifications to registered rooms. Export from the Worker module and
 * bind a new SQLite namespace; never expose its internal room registration API.
 * @example
 * export { RpgPublicationDurableObject } from '@rpgjs/server/cloudflare';
 */
export class RpgPublicationDurableObject {
  constructor(private readonly ctx: { storage: Storage }, private readonly env: Record<string, unknown>) {}

  /** Handle authenticated publication activation/status and internal room lifecycle messages. */
  async fetch(request: Request): Promise<Response> {
    if (!authorizedPublication(request, this.env)) return new Response('Unauthorized', { status: 401 });
    const match = new URL(request.url).pathname.match(/^\/publications\/([a-zA-Z0-9_-]{1,200})(?:\/(activate|register|ack|leave|head))?$/);
    if (!match) return new Response('Not found', { status: 404 });
    const [, projectId, action] = match;
    try {
      const owner = await this.ctx.storage.get<string>('project');
      if (owner && owner !== projectId) return new Response('Project mismatch', { status: 409 });
      if (!action && request.method === 'GET') {
        const rooms = await this.ctx.storage.list<RoomStatus>({ prefix: 'room:' });
        const head = await this.ctx.storage.get<RpgPublicationHead>('head') ?? null;
        return Response.json({ head, rooms: Array.from(rooms, ([key, state]) => ({
          mapId: key.slice(5), revision: state.revision, failed: state.failed, retired: state.retired ?? false,
        })) });
      }
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
      if (action === 'activate') return await this.activate(projectId, await request.json());
      const input = z.object({ mapId: z.string().regex(/^[a-zA-Z0-9_-]{1,200}$/), session: z.string().uuid(), revision: z.number().int().nonnegative().optional(), retired: z.boolean().optional() }).strict().parse(await request.json());
      return await this.ctx.storage.transaction(async storage => {
        const head = await storage.get<RpgPublicationHead>('head');
        if (!head) return new Response('No published version', { status: 404 });
        const key = `room:${input.mapId}`;
        const room = await storage.get<RoomStatus>(key);
        if (action === 'register') {
          await storage.put(key, { session: input.session, revision: room?.revision ?? 0, failed: false });
          await storage.put(`pending:${input.mapId}`, true);
          await storage.setAlarm(Date.now() + 1000);
        } else if (room?.session === input.session) {
          if (action === 'leave') {
            await storage.delete(key); await storage.delete(`pending:${input.mapId}`);
          } else if (action === 'ack' && input.revision !== undefined && input.revision <= head.revision) {
            await storage.put(key, { ...room, revision: input.retired ? room.revision : Math.max(room.revision, input.revision), failed: false, retired: input.retired ?? false });
            if (input.revision === head.revision) await storage.delete(`pending:${input.mapId}`);
          }
        }
        return Response.json(head);
      });
    } catch (error) {
      if (error instanceof z.ZodError) return new Response('Invalid publication request', { status: 400 });
      console.error('RPGJS publication failed', error);
      return new Response('Publication failed', { status: 503 });
    }
  }

  private async activate(projectId: string, body: unknown): Promise<Response> {
    const input = z.object({ manifest: z.string().regex(/^[a-f0-9]{64}$/), expectedRevision: z.number().int().nonnegative() }).strict().parse(body);
    const { bucket } = publicationBindings(this.env);
    const current = await this.ctx.storage.get<RpgPublicationHead>('head');
    const currentManifest = current ? await readManifest(bucket, projectId, current.manifest) : undefined;
    const manifest = await readManifest(bucket, projectId, input.manifest);
    await validatePublication(bucket, manifest);
    // Claims are immutable: a failed activation may reserve IDs but cannot
    // expose a half-written publication or steal a map from another project.
    for (const mapId of Object.keys(manifest.maps)) {
      await bucket.put(ownershipKey(mapId), JSON.stringify(projectId), { onlyIf: { etagDoesNotMatch: '*' } });
      if (await getMapOwner(bucket, mapId) !== projectId) return new Response('Map belongs to another project', { status: 409 });
    }
    return this.ctx.storage.transaction(async storage => {
      const owner = await storage.get<string>('project');
      if (owner && owner !== projectId) return new Response('Project mismatch', { status: 409 });
      const previous = await storage.get<RpgPublicationHead>('head');
      if (previous?.manifest === input.manifest) return Response.json(previous);
      if ((previous?.revision ?? 0) !== input.expectedRevision) return new Response('Publication revision conflict', { status: 409 });
      const head = { revision: input.expectedRevision + 1, manifest: input.manifest };
      await storage.put('project', projectId);
      await storage.put('head', head);
      for (const [key, room] of await storage.list<RoomStatus>({ prefix: 'room:' })) {
        const mapId = key.slice(5);
        if (current?.revision === previous?.revision && room.revision === previous?.revision
          && currentManifest?.maps[mapId] === manifest.maps[mapId]
          && currentManifest?.shared === manifest.shared
          && currentManifest?.startMapId === manifest.startMapId) {
          await storage.put(key, { ...room, revision: head.revision });
        } else await storage.put(`pending:${mapId}`, true);
      }
      await storage.setAlarm(Date.now() + 1);
      return Response.json(head);
    });
  }

  /** Retry a bounded batch; persisted pending entries survive failures/restarts. */
  async alarm(): Promise<void> {
    const storage = this.ctx.storage;
    if (!(await storage.list({ prefix: 'pending:', limit: 1 })).size) return;
    // Schedule before external I/O: a crash or exhausted platform retry budget
    // must not strand pending propagation.
    await storage.setAlarm(Date.now() + 30_000);
    const head = await storage.get<RpgPublicationHead>('head');
    const projectId = await storage.get<string>('project');
    if (!head || !projectId) return;
    const cursor = await storage.get<string>('cursor');
    let pending = await storage.list({ prefix: 'pending:', limit: 16, ...(cursor ? { startAfter: cursor } : {}) });
    if (!pending.size && cursor) pending = await storage.list({ prefix: 'pending:', limit: 16 });
    const { rooms, config } = publicationBindings(this.env);
    for (const key of pending.keys()) {
      const mapId = key.slice(8);
      const room = await storage.get<RoomStatus>(`room:${mapId}`);
      if (!room) { await storage.delete(key); continue; }
      let success = false;
      try {
        const response = await rooms.get(rooms.idFromName(`map-${mapId}`)).fetch(new Request(
          `https://publication.internal${config.partiesPath}/map-${mapId}/publication/update`, {
            method: 'POST', headers: publicationHeaders(this.env),
            body: JSON.stringify({ projectId, ...head, session: room.session }),
          },
        ));
        success = response.ok;
        await response.body?.cancel();
      } catch { /* retry through the persisted queue */ }
      if (!success) await storage.transaction(async tx => {
        const current = await tx.get<RoomStatus>(`room:${mapId}`);
        if (current?.session === room.session) await tx.put(`room:${mapId}`, { ...current, failed: true });
      });
      await storage.put('cursor', key);
    }
    const last = await storage.get<string>('cursor');
    if (last && (await storage.list({ prefix: 'pending:', limit: 1, startAfter: last })).size) {
      await storage.setAlarm(Date.now() + 1000);
    }
  }
}
