---
title: "Put an MMORPG online"
description: "Take an RPGJS starter from local MMORPG mode to a public Node or Cloudflare deployment."
---

# Put an MMORPG online

This guide starts with the RPGJS v5 starter and ends with a public URL that two
players can open at the same time. You can deploy the same game server to Node
in a Docker container or to Cloudflare Workers with Durable Objects.

<Note>
RPGJS starts in standalone RPG mode when `RPG_TYPE` is not set. Standalone mode
runs the server in the browser. Always set `RPG_TYPE=mmorpg` when developing or
building the multiplayer version.
</Note>

## What changes in MMORPG mode

An online RPGJS game has three parts:

- the browser client renders the game and sends player input
- an authoritative server validates gameplay and owns map state
- a trusted publisher sends complete maps to that server

Gameplay clients are never allowed to publish a map. The publisher uses a
private `RPGJS_MAP_UPDATE_TOKEN`, compiles your local map source, and sends the
authoritative payload to each map room. Keep this token out of `VITE_` variables,
browser code, Git, and public build artifacts.

## 1. Create and test the project

```bash
npx degit rpgjs/starter#v5 my-rpg-game
cd my-rpg-game
npm install
npm install --save-dev cross-env tsx
```

Add explicit scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "dev:mmorpg": "cross-env RPG_TYPE=mmorpg vite",
    "build": "vite build",
    "build:mmorpg": "cross-env RPG_TYPE=mmorpg vite build",
    "publish:maps": "tsx src/entries/publish-maps.ts"
  }
}
```

Start the MMORPG locally:

```bash
npm run dev:mmorpg
```

Open `http://localhost:5173` in two different browsers, or in one normal window
and one private window. Both players must reach the same map and see each other
before you continue.

## 2. Separate public and private map files

In `vite.config.ts`, declare the MMORPG entries and publish only map images to
the browser build:

```ts
import { defineConfig } from "vite";
import { rpgjs, tiledMapFolderPlugin } from "@rpgjs/vite";
import serverModule from "./src/server";

export default defineConfig({
  plugins: [
    tiledMapFolderPlugin({
      sourceFolder: "./src/tiled",
      publicPath: "/map",
      buildOutputPath: "assets/data",
      allowedExtensions: [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"],
    }),
    ...rpgjs({
      server: serverModule,
      entryPoints: {
        rpg: "./src/standalone.ts",
        mmorpg: {
          client: "./src/client.ts",
          server: "./src/server.ts",
        },
      },
    }),
  ],
});
```

The MMORPG build produces `dist/client` and `dist/server`; `.tmx` and `.tsx`
files must not appear under `dist/client`. The Node path adds its Express adapter
to this configuration later. Cloudflare compiles its Worker entry with Wrangler.

## 3. Add the trusted map publisher

Create `src/entries/publish-maps.ts`:

```ts
import { createRpgServerTransport } from "@rpgjs/server/node";
import serverModule from "../server";

const target = process.env.RPGJS_PUBLISH_TARGET;
const token = process.env.RPGJS_MAP_UPDATE_TOKEN;
const mapIds = (process.env.RPGJS_MAP_IDS ?? "simplemap")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

if (!target) throw new Error("RPGJS_PUBLISH_TARGET is required");
if (!token) throw new Error("RPGJS_MAP_UPDATE_TOKEN is required");
if (mapIds.length === 0) throw new Error("RPGJS_MAP_IDS must contain a map id");

const publisher = createRpgServerTransport(serverModule, {
  initializeMaps: false,
  mapUpdateToken: token,
  tiledBasePaths: ["src/tiled"],
});

for (const mapId of mapIds) {
  const response = await publisher.publishMap(mapId, { target });
  if (!response.ok) {
    throw new Error(
      `Unable to publish ${mapId}: ${response.status} ${await response.text()}`
    );
  }
  console.log(`Published map: ${mapId}`);
}

process.exit(0);
```

Add the publisher environment files to `.gitignore` before storing any real
secret:

```gitignore
.env.production
.env.publisher
```

The starter map id is `simplemap`. Replace it or set `RPGJS_MAP_IDS` to a
comma-separated list for your project. `publishMap()` also publishes every
`worldUpdates` entry in the generated payload, so connected rooms receive the
same world topology.

## 4. Choose a deployment target

Both targets run the same `src/server.ts` game module and use the publisher from
the previous step.

| Target                                               | Runtime                                 | Persistent room state           | Best fit                                                |
| ---------------------------------------------------- | --------------------------------------- | ------------------------------- | ------------------------------------------------------- |
| [Node and Docker](/advanced/node-server-production)  | One persistent Node process             | SQLite file on a mounted volume | A container host where you control the process and disk |
| [Cloudflare](/advanced/cloudflare-server-production) | Worker plus one Durable Object per room | Durable Object SQLite           | Managed edge hosting without maintaining a Node process |

Follow either page through its **First production deployment** section. Do not
open the game to players until the initial map publication succeeds.

## 5. Verify the public game

After deploying and publishing the maps:

1. Open the public HTTPS URL in two independent browser sessions.
2. Confirm that both players join the start map and see each other.
3. Move both players and interact with a server-controlled event.
4. Refresh one browser and confirm that it reconnects.
5. Check the server logs for authorization, map loading, or WebSocket errors.

If the page loads but the map does not, check map publication first. A deployed
client and server do not automatically mean that the authoritative map has been
published.

## 6. Add accounts and long-term saves

A deployed room and a saved character are two different things. Before opening
an MMORPG to players, choose how accounts are authenticated and where character
saves are stored.

| Data                                | Purpose                                           | Long-term character save? |
| ----------------------------------- | ------------------------------------------------- | ------------------------- |
| WebSocket session                   | Reconnect a browser and transfer it between rooms | No                        |
| Node or Durable Object room storage | Preserve synchronized room and map state          | No                        |
| `SaveStorageStrategy`               | Store a player's save slots                       | Yes                       |

The starter's `LocalStorageSaveStorageStrategy` is intended for a standalone
server running inside the browser. It does not persist MMORPG saves on Node or
Cloudflare. Without another strategy, the server falls back to memory-only
storage, which is lost on restart and is not shared by several server instances.

Use this beginner flow for persistent characters:

1. Implement [`auth()`](/advanced/auth) so the same account always receives the
   same `player.id`.
2. Implement a server-side [`SaveStorageStrategy`](/guide/save-load) backed by a
   shared database or trusted HTTP API.
3. Register it with `provideSaveStorage()` in the server configuration.
4. After authentication, either show the account's slots or explicitly call
   `player.load(slot)` for the slot your game selected.
5. Call `player.save(slot)` from server-controlled game logic or let the player
   request a manual save through the built-in save GUI.

<Warning>
Authentication identifies the account, but it does not automatically load a
save slot. Likewise, refreshing a browser may restore its current room session,
but it does not call `player.load()` for you.
</Warning>

Do not load the long-term save again on every map change. RPGJS already transfers
the current player between map rooms. Read the save when starting or resuming a
character; use room transfer for normal movement through the game world.
