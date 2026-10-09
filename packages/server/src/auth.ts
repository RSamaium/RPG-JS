import { lastValueFrom } from "rxjs";
import type { Hooks } from "@rpgjs/common";
import type { RpgPlayer } from "./Player/Player";
import type { RpgServerEngine } from "./RpgServerEngine";
import type {
  RpgAuthContext,
  RpgServerAuthSocket,
} from "./RpgServer";

type AuthenticationState = {
  context: RpgAuthContext;
  server: RpgServerEngine;
  socket: RpgServerAuthSocket;
};

const authenticationByConnection = new WeakMap<object, AuthenticationState>();

/** @internal Keep authentication data server-only for the physical connection. */
export function setConnectionAuthentication(
  connection: object,
  state: AuthenticationState,
): void {
  authenticationByConnection.set(connection, state);
}

/** @internal Run player authentication hooks before regular room lifecycle hooks. */
export async function runPlayerAuthenticationHooks(
  hooks: Hooks,
  player: RpgPlayer,
  connection: object,
): Promise<void> {
  const state = authenticationByConnection.get(connection);
  if (!state) return;

  try {
    const results = await lastValueFrom(
      hooks.callHooks("server-player-canAuth", player, state.context),
    );
    if (results.some((result) => result === false)) {
      throw new Error("Authentication failed: canAuth() returned false");
    }
    await lastValueFrom(
      hooks.callHooks("server-player-onAuthSuccess", player, state.context),
    );
  }
  catch (error) {
    await state.server.rejectAuthenticatedConnection(
      state.context.id,
      connection,
      { request: state.socket.request },
    );
    try {
      await lastValueFrom(
        hooks.callHooks(
          "server-engine-onAuthFailed",
          state.server,
          error,
          state.socket,
        ),
      );
    }
    catch {
      // Failure observers must not replace the authoritative rejection reason.
    }
    throw error;
  }
}
