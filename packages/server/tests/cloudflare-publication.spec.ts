// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { prepareRpgPublication, readManifest, readPublicationMap, type RpgPublicationBucket } from '../src/cloudflare/publication';
import { configurePublications, RpgPublicationDurableObject } from '../src/cloudflare/publication-coordinator';
import { PublicationRoom } from '../src/cloudflare/publication-room';
import { readMapSource, writeMapSource } from '../src/map-source-storage';

class Bucket implements RpgPublicationBucket {
  objects = new Map<string, string>();
  reads: string[] = [];
  async get(key: string) {
    this.reads.push(key);
    const text = this.objects.get(key);
    return text === undefined ? null : { text: async () => text };
  }
  async put(key: string, value: string) { if (!this.objects.has(key)) this.objects.set(key, value); }
}
class Storage {
  values = new Map<string, unknown>();
  alarm: number | null = null;
  private queue = Promise.resolve();
  async get<T>(key: string) { return structuredClone(this.values.get(key)) as T | undefined; }
  async put(key: string, value: unknown) { this.values.set(key, structuredClone(value)); }
  async delete(key: string) { return this.values.delete(key); }
  async list<T>({ prefix, limit, startAfter }: { prefix: string; limit?: number; startAfter?: string }) {
    return new Map([...this.values.entries()].filter(([key]) => key.startsWith(prefix) && (!startAfter || key > startAfter)).sort(([a], [b]) => a.localeCompare(b)).slice(0, limit).map(([key, value]) => [key, structuredClone(value) as T]));
  }
  async setAlarm(time: number) { this.alarm = time; }
  transaction<T>(callback: (storage: Storage) => Promise<T>): Promise<T> {
    const result = this.queue.then(async () => {
      const snapshot = structuredClone(this.values);
      try { return await callback(this); }
      catch (error) { this.values = snapshot; throw error; }
    });
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }
}
const headers = { 'content-type': 'application/json', 'x-rpgjs-map-update-token': 'test-secret' };
function harness() {
  configurePublications({ bucket: 'DATA', coordinator: 'PROJECTS', rooms: 'ROOMS', partiesPath: '/parties/main' });
  const bucket = new Bucket();
  const projects = new Map<string, RpgPublicationDurableObject>();
  const stores = new Map<string, Storage>();
  const rooms = new Map<string, PublicationRoom>();
  const notify = vi.fn(async (id: string, request: Request) => {
    const room = rooms.get(id);
    if (!room) return new Response('Unavailable', { status: 503 });
    try {
      const body = await request.json() as { session: string };
      await room.refresh(body.session); return new Response(null, { status: 204 });
    }
    catch { return new Response('Failed', { status: 503 }); }
  });
  const env: Record<string, unknown> = {
    DATA: bucket, RPGJS_MAP_UPDATE_TOKEN: 'test-secret',
    ROOMS: { idFromName: (id: string) => id, get: (id: string) => ({ fetch: (request: Request) => notify(id, request) }) },
    PROJECTS: { idFromName: (id: string) => id, get: (id: string) => ({ fetch: (request: Request) => project(id).fetch(request) }) },
  };
  function project(id = 'game') {
    if (!stores.has(id)) stores.set(id, new Storage());
    if (!projects.has(id)) projects.set(id, new RpgPublicationDurableObject({ storage: stores.get(id)! }, env));
    return projects.get(id)!;
  }
  const request = (id: string, action: string, body?: unknown) => project(id).fetch(new Request(`https://internal/publications/${id}${action}`, {
    method: body === undefined ? 'GET' : 'POST', headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }));
  const prepare = (version = 1, ids = ['town', 'forest'], projectId = 'game') => prepareRpgPublication(bucket, {
    projectId, startMapId: ids[0], shared: { config: { name: `Game ${version}` }, database: [{ id: 'potion' }] },
    maps: ids.map(id => ({ id, width: 640, height: 480, events: [], data: { version } })),
  });
  const activate = (manifest: string, expectedRevision = 0, id = 'game') => request(id, '/activate', { manifest, expectedRevision });
  function room(id = 'town', storage = new Storage()) {
    let active = false;
    let current: unknown;
    const low = { id: `map-${id}`, storage };
    const apply = vi.fn(async (source: Record<string, unknown>) => {
      await writeMapSource(low, source);
      current = source;
    });
    const instance = new PublicationRoom(low, env, apply, () => active);
    rooms.set(low.id, instance);
    return { instance, storage, apply, low, current: () => current,
      async connect() { await instance.connect(); active = true; },
      async disconnect() { active = false; await instance.disconnect(); },
    };
  }
  return { bucket, env, stores, projects, project, request, prepare, activate, room, notify };
}

describe('versioned Cloudflare publication', () => {
  it('addresses identical artifacts by content, regardless of object key order', async () => {
    const h = harness();
    const first = await h.prepare();
    const count = h.bucket.objects.size;
    expect(await h.prepare()).toBe(first);
    expect(h.bucket.objects.size).toBe(count);
    const manifest = await readManifest(h.bucket, 'game', first);
    const map = await readPublicationMap(h.bucket, manifest, 'town');
    expect(map.config).toMatchObject({ name: 'Game 1', startMapId: 'town' });
    expect(map.database).toEqual([{ id: 'potion' }]);
  });

  it('activates many empty maps without initializing any room, and stops polling', async () => {
    const h = harness();
    const manifest = await h.prepare(1, Array.from({ length: 100 }, (_, i) => `map-${i}`));
    expect((await h.activate(manifest)).status).toBe(200);
    h.stores.get('game')!.alarm = null;
    await h.project().alarm();
    expect(h.notify).not.toHaveBeenCalled();
    expect(h.stores.get('game')!.alarm).toBeNull();
  });

  it('hydrates on entry, persists a compact reference and restores without Studio reads', async () => {
    const h = harness();
    await h.activate(await h.prepare());
    const room = h.room();
    await room.connect();
    expect(room.apply).toHaveBeenCalledTimes(1);
    expect(room.storage.values.has('$room:rpgjs-map-source')).toBe(false);
    expect(JSON.stringify([...room.storage.values])).not.toContain('potion');
    const restarted = h.room('town', room.storage);
    await restarted.connect();
    expect(restarted.current()).toEqual(room.current());
    expect(await readMapSource(restarted.low)).toEqual(room.current());
  });

  it('notifies active rooms and skips reapplying an identical publication', async () => {
    const h = harness(); const first = await h.prepare();
    await h.activate(first); const room = h.room(); await room.connect();
    await h.activate(first); await h.project().alarm();
    expect(room.apply).toHaveBeenCalledTimes(1);
    await h.activate(await h.prepare(2), 1); await h.project().alarm();
    expect(h.notify).toHaveBeenCalledTimes(1);
    expect(room.current()).toMatchObject({ config: { name: 'Game 2' } });
    expect(room.apply).toHaveBeenCalledTimes(2);
    await room.disconnect();
    await h.activate(await h.prepare(3), 2); await h.project().alarm();
    expect(h.notify).toHaveBeenCalledTimes(1);
  });

  it('does not reload a room when only another map changed', async () => {
    const h = harness(); await h.activate(await h.prepare());
    const town = h.room(); const forest = h.room('forest'); await town.connect(); await forest.connect();
    const next = await prepareRpgPublication(h.bucket, {
      projectId: 'game', startMapId: 'town', shared: { config: { name: 'Game 1' }, database: [{ id: 'potion' }] },
      maps: ['town', 'forest'].map(id => ({ id, width: 640, height: 480, events: [], data: { version: id === 'town' ? 1 : 2 } })),
    });
    await h.activate(next, 1); await h.project().alarm();
    expect(town.apply).toHaveBeenCalledTimes(1); expect(forest.apply).toHaveBeenCalledTimes(2);
    expect(h.notify.mock.calls.map(([id]) => id)).toEqual(['map-forest']);
  });

  it('rejects missing or tampered artifacts without changing the active head', async () => {
    const h = harness(); const first = await h.prepare(); await h.activate(first);
    const next = await h.prepare(2); const manifest = await readManifest(h.bucket, 'game', next);
    h.bucket.objects.set(`rpgjs/publications/game/${manifest.maps.town}.json`, '{}');
    expect((await h.activate(next, 1)).status).toBe(503);
    expect(await h.stores.get('game')!.get('head')).toEqual({ manifest: first, revision: 1 });
  });

  it('compares revisions atomically for concurrent and stale publications', async () => {
    const h = harness(); const a = await h.prepare(1); const b = await h.prepare(2);
    const responses = await Promise.all([h.activate(a), h.activate(b)]);
    expect(responses.map(r => r.status).sort()).toEqual([200, 409]);
    const head = await h.stores.get('game')!.get<{ manifest: string; revision: number }>('head');
    expect((await h.activate(head!.manifest)).status).toBe(200);
    expect((await h.activate(await h.prepare(3), 0)).status).toBe(409);
  });

  it('rejects cross-project artifact access and map ownership theft', async () => {
    const h = harness(); const first = await h.prepare(); await h.activate(first);
    await expect(readManifest(h.bucket, 'other', first)).rejects.toThrow();
    expect((await h.activate(await h.prepare(1, ['town'], 'other'), 0, 'other')).status).toBe(409);
    const denied = await h.project().fetch(new Request('https://internal/publications/game', { headers: { 'x-rpgjs-map-update-token': 'wrong' } }));
    expect(denied.status).toBe(401);
  });

  it('keeps a removed occupied map running while refusing new entrants', async () => {
    const h = harness(); await h.activate(await h.prepare());
    const room = h.room('forest'); await room.connect();
    await h.activate(await h.prepare(2, ['town']), 1); await h.project().alarm();
    expect(room.apply).toHaveBeenCalledTimes(1);
    await expect(room.instance.connect()).rejects.toThrow('no longer published');
    expect(room.current()).toMatchObject({ id: 'forest', data: { version: 1 } });
  });

  it('retains the old reference on application failure and retries after coordinator restart', async () => {
    const h = harness(); await h.activate(await h.prepare());
    const room = h.room(); await room.connect();
    const previous = await room.storage.get('$room:rpgjs-publication');
    room.apply.mockRejectedValueOnce(new Error('bad runtime update'));
    await h.activate(await h.prepare(2), 1); await h.project().alarm();
    expect(await room.storage.get('$room:rpgjs-publication')).toEqual(previous);
    expect(room.current()).toMatchObject({ data: { version: 1 } });
    expect(await h.stores.get('game')!.get('pending:town')).toBe(true);
    h.projects.clear(); await h.project().alarm();
    expect(room.current()).toMatchObject({ data: { version: 2 } });
    expect(await h.stores.get('game')!.get('pending:town')).toBeUndefined();
  });

  it('loads sources larger than the room per-value limit through R2', async () => {
    const h = harness();
    const manifest = await prepareRpgPublication(h.bucket, {
      projectId: 'game', startMapId: 'town', shared: { config: {}, database: [] },
      maps: [{ id: 'town', width: 640, height: 480, data: { text: 'x'.repeat(3 * 1024 * 1024) } }],
    });
    await h.activate(manifest); const room = h.room();
    const put = room.storage.put.bind(room.storage);
    room.storage.put = async (key, value) => {
      if (JSON.stringify(value).length > 2 * 1024 * 1024) throw new Error('Value too large');
      await put(key, value);
    };
    await room.connect();
    expect(room.apply).toHaveBeenCalledTimes(1);
    expect(JSON.stringify([...room.storage.values]).length).toBeLessThan(512);
  });

  it('removes a stale registration after an empty room restarts without rehydrating it', async () => {
    const h = harness(); await h.activate(await h.prepare());
    const original = h.room(); await original.connect();
    const restarted = h.room('town', original.storage);
    await h.activate(await h.prepare(2), 1); await h.project().alarm();
    expect(restarted.apply).not.toHaveBeenCalled();
    expect(await h.stores.get('game')!.get('room:town')).toBeUndefined();
    expect(await h.stores.get('game')!.get('pending:town')).toBeUndefined();
  });
});
