import type { Hooks } from '@rpgjs/common';
import { lastValueFrom } from 'rxjs';
import type { RpgPlayer } from '../Player/Player';
import type { RpgRoomConnection } from './map';

const lifecycleKey = '__rpgjsConnectionLifecycle';

const connectionState = (connection: RpgRoomConnection): Record<string, unknown> =>
  connection.state && typeof connection.state === 'object'
    ? connection.state as Record<string, unknown>
    : {};

/** Mark a successful server-authorized transfer before telling the client to reconnect. */
export function markRoomTransfer(connection: RpgRoomConnection, token: unknown): void {
  if (typeof token !== 'string' || token.length === 0) return;
  connection.setState({ ...connectionState(connection), [lifecycleKey]: 'transferring' });
}

/** Dispatch once for a closed connection, excluding deliberate room transfers. */
export async function dispatchPlayerDisconnected(
  hooks: Hooks,
  player: RpgPlayer,
  connection: RpgRoomConnection | null,
): Promise<void> {
  if (!connection) return;
  const state = connectionState(connection);
  if (state[lifecycleKey] === 'transferring' || state[lifecycleKey] === 'disconnected') return;
  // Connection state survives room hibernation and is not part of the player snapshot.
  connection.setState({ ...state, [lifecycleKey]: 'disconnected' });
  await lastValueFrom(hooks.callHooks('server-player-onDisconnected', player));
}
