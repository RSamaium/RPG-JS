---
title: "MMORPG entries"
description: "Organize client, server, and adapter entry points for an MMORPG project, with an Express example."
---

# MMORPG entries

When `RPG_TYPE=mmorpg`, RPGJS now treats your project as a multi-entry application:

- a browser client
- a framework-agnostic server module
- optional hosting adapters such as Express

Use this layout when you want to keep your game server portable across:

- Vite development
- Express in production
- another Node host such as Fastify or Hono
- a custom deployment target later

`RPG_TYPE` defaults to `rpg` when it is not set. If this is your first online
deployment, start with [Put an MMORPG online](/guide/deploy-mmorpg), which covers
local verification, map publication, Node/Docker, and Cloudflare.

## Recommended structure

Keep your game logic in `src/server.ts`, and put host-specific bootstraps in `src/entries`.

```txt
src/
  client.ts
  server.ts
  standalone.ts
  entries/
    express.ts
```

Role of each file:

- `src/client.ts`: browser entry for `mmorpg`
- `src/server.ts`: RPGJS server module, without `express()`, `listen()`, or platform code
- `src/entries/express.ts`: Node entry that mounts `src/server.ts` in Express
- `src/standalone.ts`: browser entry for `RPG_TYPE=rpg`

## Configure `rpgjs()`

Declare the MMORPG entries explicitly in your Vite config.

```ts
import { defineConfig } from "vite"
import { rpgjs, tiledMapFolderPlugin } from "@rpgjs/vite"
import vue from "@vitejs/plugin-vue"
import serverModule from "./src/server"

export default defineConfig({
  plugins: [
    vue(),
    tiledMapFolderPlugin({
      sourceFolder: "./src/tiled",
      publicPath: "/map",
      buildOutputPath: "assets/data",
      // Keep authoritative Tiled sources out of the browser build.
      allowedExtensions: [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"],
    }),
    ...rpgjs({
      server: serverModule,
      entryPoints: {
        rpg: "./src/standalone.ts",
        mmorpg: {
          client: "./src/client.ts",
          server: "./src/server.ts",
          adapters: {
            express: "./src/entries/express.ts",
          },
        },
      },
    }),
  ],
})
```

## Keep `src/server.ts` agnostic

`src/server.ts` should export your RPGJS server module and nothing else.

It should not:

- create an HTTP server
- call `listen()`
- import Express directly
- depend on a specific host runtime

Example:

```ts
import { createServer, provideServerModules } from "@rpgjs/server"
import mainServerModule from "./modules/server"

export default createServer({
  providers: [
    provideServerModules([mainServerModule]),
  ],
})
```

This file is the canonical server entry for your game. Vite development can use it directly, and production adapters can import it without duplicating game setup.

## Express adapter example

Put your Express bootstrap in `src/entries/express.ts`.

```ts
import express from "express"
import { createServer } from "node:http"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { WebSocketServer } from "ws"
import { createRpgServerTransport } from "@rpgjs/server/node"
import serverModule from "../server"

const app = express()
const httpServer = createServer(app)
const wsServer = new WebSocketServer({ noServer: true })
const transport = createRpgServerTransport(serverModule)
const currentDir = dirname(fileURLToPath(import.meta.url))
const clientDistDir = resolve(currentDir, "../client")
const clientIndexFile = join(clientDistDir, "index.html")

app.use("/parties", async (req, res, next) => {
  await transport.handleNodeRequest(req, res, next, {
    mountedPath: "/parties",
  })
})

app.use(express.static(clientDistDir))

app.get(/.*/, (_req, res) => {
  res.sendFile(clientIndexFile)
})

httpServer.on("upgrade", (request, socket, head) => {
  void transport.handleUpgrade(wsServer, request, socket, head)
})

httpServer.listen(3000)
```

This adapter is responsible for:

- serving the built client from `dist/client`
- forwarding HTTP requests under `/parties`
- forwarding WebSocket upgrades to the RPGJS transport

## Build output

Run the MMORPG build with:

```bash
RPG_TYPE=mmorpg vite build
```

RPGJS produces two output folders:

```txt
dist/
  client/
    index.html
    assets/
  server/
    server.js
    express.js
```

Meaning of each output:

- `dist/client`: browser assets containing client and explicitly shared modules
- `dist/server/server.js`: built version of your agnostic `src/server.ts`
- `dist/server/express.js`: built version of your Express adapter

The MMORPG client build does not include modules imported only by
`src/server.ts`. Conversely, client-only modules and components are not part of
the server entry. Files imported by both entry graphs are shared code and may be
present in both outputs.

<Warning>
Do not import a server module, a server adapter, or a combined module index from
the client entry graph. Any file reachable from browser code can be included in
`dist/client`. Keep secrets in the deployment environment, never in source code
that a browser build can reach.
</Warning>

### Keep source maps server-side

Map assets follow the same entry boundary as modules. In MMORPG mode, install the
server side of a map provider in `src/server.ts`; its compiler reads the complete
map and streams only nearby render and prediction chunks. The client side applies
those chunks but does not fetch the source document.

For Tiled, expose image files through `tiledMapFolderPlugin()` and omit `.tmx` and
`.tsx` from `allowedExtensions`. Event definitions, object properties, collision
rules and the raw tile layer stay in the map room. The same provider module works
with a Node.js transport or a Cloudflare Durable Object.

Start the built Express server with:

```bash
node dist/server/express.js
```

## Development flow

During development, Vite still uses the server module you pass to `rpgjs({ server })`.

That means:

- `src/server.ts` stays the single source of truth for your game server
- your adapter files are only needed when you want a specific production host
- you do not need a separate `server-dev.ts`

## Add another host later

To support another runtime, keep `src/server.ts` unchanged and add another adapter file:

- `src/entries/fastify.ts`
- `src/entries/hono.ts`
- `src/entries/custom.ts`

Then declare it in `entryPoints.mmorpg.adapters`.

```ts
mmorpg: {
  client: "./src/client.ts",
  server: "./src/server.ts",
  adapters: {
    express: "./src/entries/express.ts",
    fastify: "./src/entries/fastify.ts",
  },
}
```

The build will emit one file per adapter in `dist/server`.

## Related pages

- For the complete beginner deployment path, see [/guide/deploy-mmorpg](/guide/deploy-mmorpg)
- For the Node transport API and protected map updates, see [/advanced/node-server-production](/advanced/node-server-production)
- For a Cloudflare Durable Object deployment, see [/advanced/cloudflare-server-production](/advanced/cloudflare-server-production)
