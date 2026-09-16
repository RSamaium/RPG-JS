---
title: "Authentication"
description: "Authenticate RPGJS players before they join MMORPG rooms."
---

# Authentication

Use the server engine `auth()` hook to authenticate a player before RPGJS lets the
WebSocket connection join a room.

In MMORPG mode, RPGJS connects to one room at a time. The first connection
usually targets `lobby-*`, then map changes reconnect the player to `map-*`
rooms. The `auth()` hook is called for each RPGJS room connection. If it throws,
the connection is refused before a `RpgPlayer` is created or restored in that
room.

## Mental model

Use `auth()` as the global RPGJS gate:

- it runs on the lobby connection;
- it runs again when the player reconnects to a map room;
- it accepts or refuses the room connection;
- it returns the stable public player id used by RPGJS and Signe user
  collections.

Use Signe guards for narrower authorization after authentication, such as
protecting an admin action, a custom room, or an HTTP endpoint.

## Server

Add `auth()` to the server engine hooks. Return the stable public player id for
the authenticated account. Return `{ id, data }` when later player hooks also
need server-only account context. RPGJS never synchronizes or saves `data`.

```ts
import { RpgServerEngine, type RpgServerEngineHooks } from "@rpgjs/server";

const engine: RpgServerEngineHooks = {
  async auth(server: RpgServerEngine, socket: any) {
    const token = socket.handshake.query.token;

    if (!token) {
      throw "Authentication failed: No token provided";
    }

    const user = await verifyToken(token);
    return user.id;
  },
};

export default {
  engine,
};
```

## Player authentication hooks

After `auth()` identifies the account, `canAuth()` can perform a final
player-aware authorization check. Returning `false` or throwing refuses the
connection. `onAuthSuccess()` then runs before the regular player connection and
room hooks.

```ts
import type { RpgPlayerHooks, RpgServerEngineHooks } from "@rpgjs/server";

type AccountAuthData = { status: string };

export const engine: RpgServerEngineHooks<AccountAuthData> = {
  async auth(_server, socket) {
    const account = await verifyToken(socket.handshake.query.token);
    return { id: account.id, data: { status: account.status } };
  },
  onAuthFailed(_server, error) {
    console.error("Authentication refused", error);
  },
};

export const player: RpgPlayerHooks<AccountAuthData> = {
  canAuth(_player, auth) {
    return auth.data?.status !== "banned";
  },
  onAuthSuccess(player, auth) {
    console.log(`${player.id} authenticated in ${auth.roomId}`);
  },
};
```

The lifecycle order is:

```text
auth() -> create/restore player -> canAuth() -> onAuthSuccess()
       -> onConnected()/room hooks -> title screen
```

`auth()`, `canAuth()`, and `onAuthSuccess()` run for every physical room
connection, including map transfers. Keep player hooks idempotent.

Unlike RPGJS v4, `onAuthFailed` is an engine hook and does not receive a player:
invalid credentials can be rejected before any `RpgPlayer` exists. `canAuth`
also receives an authentication context rather than a database record or GUI.

The returned id becomes the Signe/RPGJS `publicId` used by `@users(RpgPlayer)`.
Return the same id for the same account on every room connection so the player
keeps the same identity when moving between maps.

If `auth()` returns `undefined`, RPGJS keeps the default behavior and lets the
room system generate the public player id.

## Use the authenticated id for save slots

Authentication and save loading are separate operations:

1. `auth()` verifies the credential and returns the account's stable public id.
2. RPGJS exposes that id as `player.id` to server-side game code and storage
   strategies.
3. A [`SaveStorageStrategy`](/guide/save-load) uses `player.id` to list, save, or
   retrieve that account's slots.
4. The game explicitly calls `player.load(slot)` after it has selected a slot.

Returning the same id does not automatically call `player.load()`. It only gives
the server a stable, trusted key with which to find the correct saves.

```text
auth token -> auth() -> stable player.id -> save storage -> selected slot
```

Do not use the private WebSocket `sessionId` as the long-term account key. It is
useful for reconnecting a browser, but it can change when the player clears local
storage, changes device, or starts a new browser session.

Similarly, do not accept a `playerId` sent in a save/load request from the
browser. Use the authenticated `player.id` already attached to the server-side
`RpgPlayer` instance.

### What happens on reconnect

- A map change authenticates the connection again and transfers the live player
  state to the destination room. Do not reload a save slot on every map join.
- A browser refresh may restore the current private session and room state, but
  this is not a long-term save load.
- A new session can authenticate as the same account. Your login or title-screen
  flow must then list or load the desired slot explicitly.

For a one-character game, loading slot `0` in the server-side `onConnected` hook
is a simple policy. For multiple characters, list the slots after authentication
and let the player select one. See [When an MMORPG save is loaded](/guide/save-load#when-an-mmorpg-save-is-loaded)
for both approaches.

### Public lobby, protected maps

If your lobby must stay public, return `undefined` for lobby rooms and only
enforce authentication on map rooms:

```ts
import { RpgServerEngine, type RpgServerEngineHooks } from "@rpgjs/server";

const engine: RpgServerEngineHooks = {
  async auth(server: RpgServerEngine, socket: any) {
    if (server.getCurrentRoomId()?.includes("lobby")) {
      return undefined;
    }

    const token = socket.handshake.query.token;

    if (!token) {
      throw "Authentication failed: No token provided";
    }

    const user = await verifyToken(token);

    if (!user) {
      throw "Authentication failed: Invalid token";
    }

    return user.id;
  },
};
```

With this pattern, any client can enter the lobby, but a map connection is
refused unless `auth()` returns a valid stable player id.

If the public lobby displays account save slots, authenticate the account before
listing them. A generated anonymous lobby id cannot identify the account's
long-term saves.

## Client

For the built-in pre-connection sign-in/sign-up GUI, use
[`@rpgjs/account`](/gui/account). It combines `deferConnection: true` with the
query shown below while keeping the identity provider application-owned.

In a browser, send credentials through the connection query. RPGJS sends this
query on the initial connection and again when the player reconnects to another
room.

```ts
import { provideMmorpg } from "@rpgjs/client";

export default [
  provideMmorpg({
    query: () => ({
      token: localStorage.getItem("token"),
    }),
  }),
];
```

On map changes, RPGJS keeps its own session and transfer parameters and merges
your query into the reconnect request:

```txt
?id=<private-session-id>&token=<auth-token>&transferToken=<room-transfer-token>
```

Handle refused authentication with the client engine `onConnectError` hook:

```ts
import { type RpgClientEngineHooks } from "@rpgjs/client";

const engine: RpgClientEngineHooks = {
  onConnectError(engine, error) {
    console.error("Connection refused:", error);
    // Show your login screen, refresh the token, or redirect the player.
  },
};
```

When the server refuses the connection, the MMORPG client waits for the server
acceptance packet before starting the visual scene. This means an invalid token
does not enter a half-loaded map; `onConnectError` is the place to recover.
The client `onConnected` hook runs only after the server accepts the RPGJS
connection.

By default, the MMORPG client does not retry a connection that closes before
RPGJS accepts it. This avoids retry loops when a token is invalid. If you need
custom retry behavior, pass PartySocket options through `socketOptions`:

```ts
provideMmorpg({
  query: () => ({ token: localStorage.getItem("token") }),
  socketOptions: {
    maxRetries: 3,
  },
});
```

## Guards

`auth()` is global RPGJS authentication. It decides whether the player may enter
the game and which public id represents the player.

Signe room guards are still useful for more specific authorization rules:

- protect a custom room;
- protect one action;
- protect an HTTP request handler;
- check roles or permissions after authentication.

For example, use `auth()` to identify the player, then use a Signe `@Guard()` to
restrict an admin action.
