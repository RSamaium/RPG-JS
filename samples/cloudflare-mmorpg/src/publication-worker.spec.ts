import { SELF, env, runDurableObjectAlarm } from 'cloudflare:test';
import { prepareRpgPublication, type RpgPublicationBucket } from '@rpgjs/server/cloudflare';
import { describe, expect, it } from 'vitest';

const headers = { 'content-type': 'application/json', 'x-rpgjs-map-update-token': 'test-map-update-token' };
const bucket = (env as unknown as { GAME_DATA: RpgPublicationBucket }).GAME_DATA;

describe('versioned publication with real R2 and SQLite Durable Objects', () => {
  it('stores a large map privately and connects a player without a large room storage value', async () => {
    const manifest = await prepareRpgPublication(bucket, {
      projectId: 'large-game', startMapId: 'large-town',
      shared: { config: {}, database: [] },
      maps: [{ id: 'large-town', width: 640, height: 480, events: [], data: { secret: 'private-source-'.repeat(250_000) } }],
    });
    const publish = await SELF.fetch('https://test/publications/large-game/activate', {
      method: 'POST', headers, body: JSON.stringify({ manifest, expectedRevision: 0 }),
    });
    expect(publish.status).toBe(200);
    const connection = await SELF.fetch('https://test/parties/main/map-large-town?_pk=publication-player', { headers: { Upgrade: 'websocket' } });
    expect(connection.status).toBe(101);
    const socket = connection.webSocket!;
    const packet = new Promise<string>(resolve => socket.addEventListener('message', event => resolve(String(event.data)), { once: true }));
    socket.accept();
    expect(await packet).not.toContain('private-source');
    const status = await SELF.fetch('https://test/publications/large-game', { headers });
    expect(await status.json()).toMatchObject({ head: { revision: 1 }, rooms: [{ mapId: 'large-town', revision: 1 }] });
    const updated = await prepareRpgPublication(bucket, {
      projectId: 'large-game', startMapId: 'large-town',
      shared: { config: {}, database: [] },
      maps: [{ id: 'large-town', width: 800, height: 480, events: [] }],
    });
    expect((await SELF.fetch('https://test/publications/large-game/activate', {
      method: 'POST', headers, body: JSON.stringify({ manifest: updated, expectedRevision: 1 }),
    })).status).toBe(200);
    const namespace = (env as unknown as { PUBLICATIONS: DurableObjectNamespace }).PUBLICATIONS;
    await runDurableObjectAlarm(namespace.get(namespace.idFromName('large-game')));
    await expect.poll(async () => (await SELF.fetch('https://test/publications/large-game', { headers })).json())
      .toMatchObject({ head: { revision: 2 }, rooms: [{ mapId: 'large-town', revision: 2, failed: false }] });
    expect(socket.readyState).toBe(WebSocket.OPEN);
    socket.close();
  });

  it('does not expose status, activation, or internal membership routes to players', async () => {
    expect((await SELF.fetch('https://test/publications/large-game')).status).toBe(401);
    expect((await SELF.fetch('https://test/publications/large-game/activate', { method: 'POST' })).status).toBe(401);
    expect((await SELF.fetch('https://test/publications/large-game/register', { method: 'POST', headers })).status).toBe(404);
    expect((await SELF.fetch('https://test/parties/main/map-large-town/publication/update', { method: 'POST', headers })).status).toBe(404);
  });
});
