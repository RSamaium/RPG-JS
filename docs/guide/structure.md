---
title: "Structure"
description: "Understand the default RPGJS project structure."
---

# Structure

The starter separates client boot, server boot, shared client config, and modules.

## `client.ts`

`client.ts` starts the browser client in MMORPG mode:

```ts
import { startGame, provideMmorpg } from "@rpgjs/client";
import configClient from "./config/config.client";

startGame({
  ...configClient,
  providers: [...configClient.providers, provideMmorpg({})],
});
```

Use this entry when the client connects to a remote RPGJS server.

By default, MMORPG mode stores a stable session id in `localStorage` and passes it
to the RPGJS room adapter as the connection session id. Refreshes and multiple tabs from
the same browser therefore restore the same player session while each WebSocket
keeps its own connection id. Use `connectionIdScope: "session"` to keep the
session only for one browser tab, or `connectionIdScope: "ephemeral"` to create a
new player session on each page load:

```ts
providers: [provideMmorpg({ connectionIdScope: "session" })]
```

If your server uses `engine.auth()`, send the token with the MMORPG connection
query. RPGJS includes this query on the initial lobby connection and on map-room
reconnects:

```ts
providers: [
  provideMmorpg({
    query: () => ({
      token: localStorage.getItem("token")
    })
  })
]
```

## `server.ts`

`server.ts` creates the game server and registers your providers:

```ts
import { createServer, provideServerModules, LocalStorageSaveStorageStrategy } from "@rpgjs/server";
import mainServerModule from "./modules/server";
import { provideSaveStorage } from "@rpgjs/server";
import { provideTiledMap } from "@rpgjs/tiledmap/server";

export default createServer({
  providers: [
    provideServerModules([mainServerModule]),
    provideSaveStorage(new LocalStorageSaveStorageStrategy({ key: "save" })),
    provideTiledMap()
  ]
});
```

This is where you plug modules, maps, database content, save strategies, or server adapters.

## `standalone.ts`

`standalone.ts` runs the client and server together for a standalone RPG:

```ts
import { provideRpg, startGame } from "@rpgjs/client";
import startServer from "./server";
import configClient from "./config/config.client";

startGame({
  ...configClient,
  providers: [...configClient.providers, provideRpg(startServer)],
});
```

Use this entry when you want a single-player RPG running entirely from the client app.

<Warning>
Because standalone mode runs the server inside the browser, its production
bundle includes the code imported by `server.ts`. Do not put secrets or private
service credentials in a standalone game bundle.
</Warning>

## `config/config.client.ts`

`config.client.ts` contains the common client setup shared by MMORPG and standalone RPG:

```ts
import { provideClientGlobalConfig, provideClientModules, Presets } from "@rpgjs/client";
import mainClientModule from "../modules/client";
import { provideTiledMap } from "@rpgjs/tiledmap/client";

export default {
  providers: [
    provideTiledMap({
      basePath: "map",
    }),
    provideClientGlobalConfig(),
    provideClientModules([
      mainClientModule,
      {
        spritesheets: [
          {
            id: "hero",
            image: "spritesheets/hero.png",
            ...Presets.RMSpritesheet(3, 4)
          }
        ]
      }
    ])
  ],
};
```

Put here everything the client always needs: map loading, global config, modules, spritesheets, sounds, and resolvers.

### `provideClientGlobalConfig()`

`provideClientGlobalConfig()` is the client-side place for shared global configuration.
It can hold built-in options such as `keyboardControls`, and also any custom object you want
to expose everywhere in the client through dependency injection.

```ts
import { provideClientGlobalConfig } from "@rpgjs/client";

export default {
  providers: [
    provideClientGlobalConfig({
      keyboardControls: {
        up: "z",
        down: "s",
        left: "q",
        right: "d",
        action: "enter",
        escape: "escape"
      },
      ui: {
        locale: "fr",
        showDamagePreview: true
      },
      api: {
        baseUrl: "/api"
      }
    })
  ]
};
```

If you omit `keyboardControls`, RPGJS injects the default bindings automatically:

```ts
{
  up: "up",
  down: "down",
  left: "left",
  right: "right",
  action: "space",
  dash: "shift",
  escape: "escape"
}
```

Partial `keyboardControls` objects are merged with these defaults, so a game can
override one key without redefining every movement/action binding.

The `action` binding also accepts an object when the action key should send a
custom action input. This keeps the key generic in built-in components while
letting the game decide which action and payload to send.

The `dash` binding is a movement input. In MMORPG mode the client predicts it
locally through the same movement queue as directional inputs, while the server
validates and acknowledges the dash position.

```ts
provideClientGlobalConfig({
  keyboardControls: {
    up: "z",
    down: "s",
    left: "q",
    right: "d",
    action: {
      bind: "space",
      action: "projectile:shoot",
      data: (client, sprite) => ({
        target: client.pointer.world(),
        source: "keyboard",
        playerId: sprite.id
      })
    },
    escape: "escape"
  }
})
```

### Custom action inputs

Custom action inputs use the same client-to-server flow whether they come from
the configured action key or from code. The client sends a payload shaped like
`{ action, data }`, and the server receives that payload in the player's
`onInput()` hook.

```ts
// Client code
client.processAction("projectile:shoot", {
  target: client.pointer.world(),
  source: "mouse"
})
```

```ts
// Server player hook
export const player = {
  onInput(player, input) {
    if (input.action !== "projectile:shoot") return

    const target = input.data?.target
    // Validate all client-provided data before using it.
  }
}
```

Only the default `"action"` input, or `Control.Action`, automatically triggers
nearby event `onAction()` hooks. A custom action such as `"projectile:shoot"`
goes directly to `player.onInput()` and does not trigger event interactions by
itself.

Do not confuse this player hook with map movement input processing. Custom
actions are sent with `client.processAction()` and handled in `player.onInput()`;
movement inputs are queued separately by the map and processed by the movement
loop.

You can retrieve this global config anywhere on the client with `inject(GlobalConfigToken)`:

```ts
import { inject, GlobalConfigToken } from "@rpgjs/client";
import type { KeyboardActionConfig } from "@rpgjs/client";

const config = inject(GlobalConfigToken) as {
  keyboardControls: {
    up: string;
    down: string;
    left: string;
    right: string;
    action: string | KeyboardActionConfig;
    escape: string;
  };
  ui?: {
    locale?: string;
    showDamagePreview?: boolean;
  };
};

console.log(config.keyboardControls.action);
console.log(config.ui?.locale);
```

This is useful in client services, GUI components, or custom systems that need access to
global input bindings or project-specific client configuration.

## `modules/server.ts` and `modules/client.ts`

The main module keeps client and server ownership explicit. Define server hooks
in `modules/server.ts`:

```ts
import { defineModule, type RpgServer } from "@rpgjs/server";

export default defineModule<RpgServer>({
  player: {
    onConnected(player) {
      console.log("Player connected", player.id);
    }
  }
});
```

Define visual behavior in `modules/client.ts`, then install each definition with
the matching runtime provider as shown above. This keeps server code out of the
client bundle and client components out of the server bundle when building an
MMORPG. This isolation depends on the import graph: never import the server
module from client code. See [Creating Modules](/guide/create-module) for the
complete bundle-ownership rules and the standalone exception.
