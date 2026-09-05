import { expect, test, vi } from 'vitest';
import { createModule, defineModule } from '@rpgjs/common';
import { testing } from '@rpgjs/testing';
import type { RpgPlayer, RpgServer } from '../src';

test('room transfers do not disconnect the player; closing the destination does, once', async () => {
  const onDisconnected = vi.fn();
  const onLeaveMap = vi.fn();
  const onLeaveRoom = vi.fn();
  let lobbyPlayer: RpgPlayer;
  const fixture = await testing(createModule('DisconnectReview', [{
    server: defineModule<RpgServer>({
      maps: [{ id: 'test-map', file: '' }, { id: 'second-map', file: '' }],
      player: {
        async onConnected(player) { lobbyPlayer = player; await player.changeMap('test-map'); },
        onDisconnected,
        onLeaveMap,
        onLeaveRoom,
      },
    }),
    client: defineModule({}),
  }]));
  try {
    const client = await fixture.createClient();
    const player = await client.waitForMapChange('test-map');
    lobbyPlayer!.conn!.close();
    await vi.waitFor(() => expect(onLeaveRoom).toHaveBeenCalled());
    expect(onDisconnected).not.toHaveBeenCalled();

    await player.changeMap('second-map');
    const destination = await client.waitForMapChange('second-map');
    player.conn!.close();
    await vi.waitFor(() => expect(onLeaveMap).toHaveBeenCalledOnce());
    expect(onDisconnected).not.toHaveBeenCalled();
    onLeaveMap.mockClear();
    destination.conn!.close();
    await vi.waitFor(() => expect(onLeaveMap).toHaveBeenCalled());
    await vi.waitFor(() => expect(onDisconnected).toHaveBeenCalledOnce());
    destination.conn!.close();
    await vi.waitFor(() => expect(onLeaveMap).toHaveBeenCalledTimes(2));
    expect(onDisconnected).toHaveBeenCalledOnce();
  } finally {
    await fixture.clear();
  }
});
