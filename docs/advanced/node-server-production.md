---
title: "Node server in production"
description: "Run RPGJS without Vite in production, secure map updates, and mount the transport in a Node HTTP server."
---

# Node server in production

`@rpgjs/server/node` lets you run the RPGJS server runtime without Vite.

If this is your first deployment, complete the shared setup in
[Put an MMORPG online](/guide/deploy-mmorpg) first. This page then takes the
starter through a Docker deployment. The container serves the browser client,
HTTP room routes, and WebSockets from the same public origin.

If you want to structure an MMORPG project with a framework-agnostic `src/server.ts` plus host-specific entries such as Express, read [/advanced/mmorpg-entries](/advanced/mmorpg-entries) first.

Use it when you want to mount the server in your own Node stack:

- Express
- Fastify
- Hono on Node
- a custom `http.createServer()` setup

## Dev vs production

In development with `@rpgjs/vite`, Vite acts as a trusted map publisher. It
builds the map payload and calls the same administration endpoint used by an
editor or deployment pipeline. Gameplay clients never publish map definitions.

In production, map updates must come from a trusted backend source. To protect `/map/update`, set `RPGJS_MAP_UPDATE_TOKEN`.

When this environment variable is set:

- gameplay clients cannot update maps
- trusted backend code must send the token
- you can use `transport.updateMap()` or call the HTTP endpoint yourself

## 1. Install the Node adapter dependencies

From the starter project:

```bash
npm install express ws
npm install --save-dev @types/express @types/ws
```

`express` and `ws` must be production dependencies because the built adapter
imports them when the container starts.

## 2. Create the transport

Create `src/entries/express.ts`. This version fails at startup if the map update
token is missing, stores room state on a configurable SQLite path, serves the
built client, and exposes a health check for the container host.

```ts
import http from "node:http"
import express from "express"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { WebSocketServer } from "ws"
import {
  createRpgServerTransport,
  createSqliteNodeRoomStorage,
} from "@rpgjs/server/node"
import ServerModule from "../server"

const mapUpdateToken = process.env.RPGJS_MAP_UPDATE_TOKEN
if (!mapUpdateToken) {
  throw new Error("RPGJS_MAP_UPDATE_TOKEN is required")
}

const app = express()
const server = http.createServer(app)
const wsServer = new WebSocketServer({ noServer: true })
const currentDir = dirname(fileURLToPath(import.meta.url))
const clientDistDir = resolve(currentDir, "../client")
const clientIndexFile = join(clientDistDir, "index.html")
const port = Number(process.env.PORT ?? 3000)

const transport = createRpgServerTransport(ServerModule, {
  initializeMaps: false,
  mapUpdateToken,
  storage: createSqliteNodeRoomStorage({
    databasePath: process.env.RPGJS_ROOM_DB ?? "./data/rooms.sqlite",
  }),
})

app.get("/healthz", (_req, res) => {
  res.status(200).send("ok")
})

app.use("/parties", (req, res, next) => {
  void transport.handleNodeRequest(req, res, next, {
    mountedPath: "/parties",
  })
})

app.use(express.static(clientDistDir))

app.get(/.*/, (_req, res) => {
  res.sendFile(clientIndexFile)
})

server.on("upgrade", (request, socket, head) => {
  void transport.handleUpgrade(wsServer, request, socket, head)
})

server.listen(port, "0.0.0.0", () => {
  console.log(`RPGJS server listening on port ${port}`)
})
```

## 3. Build the MMORPG

Configure the `entryPoints.mmorpg.adapters.express` entry and the
`build:mmorpg` script shown in [Put an MMORPG online](/guide/deploy-mmorpg), then
run:

```ts
mmorpg: {
  client: "./src/client.ts",
  server: "./src/server.ts",
  adapters: {
    express: "./src/entries/express.ts",
  },
}
```

```bash
npm run build:mmorpg
```

The relevant output is:

```txt
dist/
  client/
  server/
    server.js
    express.js
```

Verify that `dist/client` contains images and browser assets but no `.tmx` or
`.tsx` source maps.

## 4. Create the Docker image

Create `Dockerfile` at the project root:

```dockerfile
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build:mmorpg

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV RPGJS_ROOM_DB=/data/rooms.sqlite
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
RUN mkdir -p /data
VOLUME ["/data"]
EXPOSE 3000
CMD ["node", "dist/server/express.js"]
```

Create `.dockerignore`:

```gitignore
.git
.env*
data
dist
node_modules
```

Build and test the same image that you will deploy:

```bash
docker build -t my-rpgjs-game .
```

Create an uncommitted `.env.production` file:

```dotenv
RPGJS_MAP_UPDATE_TOKEN=replace-with-a-long-random-secret
```

Make sure `.env.production` is ignored by Git, then run:

```bash
docker volume create rpgjs-rooms
docker run --rm \
  --env-file .env.production \
  -p 3000:3000 \
  -v rpgjs-rooms:/data \
  my-rpgjs-game
```

Open `http://localhost:3000/healthz`, then `http://localhost:3000`.

## 5. First production deployment

Push the image to the registry supported by your container host. Configure the
host with:

- container port `3000`
- `RPGJS_MAP_UPDATE_TOKEN` as a secret
- a persistent volume mounted at `/data`
- health check path `/healthz`
- HTTPS with WebSocket upgrades enabled

Use one container replica. The SQLite Node adapter coordinates one process;
starting several independent replicas would create separate room state. Your
host supplies the public URL, for example `https://game.example.com`.

Create an uncommitted `.env.publisher` on the trusted development or CI machine:

```dotenv
RPGJS_PUBLISH_TARGET=https://game.example.com
RPGJS_MAP_UPDATE_TOKEN=the-same-secret-configured-on-the-host
RPGJS_MAP_IDS=simplemap
```

Publish the authoritative maps using the script from the beginner guide:

```bash
node --env-file=.env.publisher --import tsx src/entries/publish-maps.ts
```

Do this after the server is healthy on the first deployment and whenever a map
changes. A `Published map: simplemap` message confirms that the server accepted
and persisted the update. Then open the public URL in two independent browser
sessions.

## Push trusted map updates from application code

If your map data is produced inside the same trusted Node process, use `transport.updateMap()`.

```ts
await transport.updateMap("town", {
  id: "town",
  width: 3200,
  height: 2400,
  events: [],
  data: tiledXml,
})
```

`transport.updateMap("town", ...)` targets the room `map-town` automatically.

## Call `/map/update` from another trusted backend

If your editor pipeline, admin API, or deploy step runs outside the game server process, call the endpoint directly with the token.

Endpoint format:

```txt
POST /parties/main/map-<mapId>/map/update
```

Example:

```ts
import { createMapUpdateHeaders } from "@rpgjs/server/node"

await fetch("http://localhost:3000/parties/main/map-town/map/update", {
  method: "POST",
  headers: createMapUpdateHeaders(process.env.RPGJS_MAP_UPDATE_TOKEN),
  body: JSON.stringify({
    id: "town",
    width: 3200,
    height: 2400,
    events: [],
    data: tiledXml,
  }),
})
```

You can also send the token as:

- `x-rpgjs-map-update-token: <token>`
- `Authorization: Bearer <token>`

## Recommended production flow

1. Start your Node server with `RPGJS_MAP_UPDATE_TOKEN` set.
2. Mount `transport.handleNodeRequest()` and `transport.handleUpgrade()`.
3. Keep `initializeMaps: false` in production.
4. From a trusted backend source, call `transport.updateMap()` or `POST /parties/main/map-<id>/map/update`.
5. Let gameplay clients use only normal movement and game actions.

The memory storage remains the default for tests and short-lived development
servers. Configure SQLite for a production process so synchronized room state
and sessions survive a restart. This Node adapter deliberately targets one
process; horizontal coordination is a separate World/Shard deployment concern.

Room SQLite storage is not the same as long-term player save storage. The
starter's `LocalStorageSaveStorageStrategy` only works for standalone browser
games. Configure a server-side save strategy before relying on save slots or
account persistence in an MMORPG.

## Memory snapshots and SQLite ownership

The memory provider can snapshot all party and room values for a test, a local
tool, or an explicit short-lived backup:

```ts
import { createMemoryNodeRoomStorage } from "@rpgjs/server/node"

const storage = createMemoryNodeRoomStorage()
const room = await storage.getStorage("main", "map-town")

await room.put("weather", { kind: "rain" })
const snapshot = storage.snapshot()

storage.clear()
storage.restore(snapshot)

// Reacquire handles after clear() or restore().
const restoredRoom = await storage.getStorage("main", "map-town")
console.log(await restoredRoom.get("weather"))
```

`snapshot()` returns an independent representation of the current data.
`clear()` and `restore()` replace the provider's room registry, so reacquire
room handles afterward. Memory data is process-local and disappears when the
process exits unless the application persists the snapshot itself.

For SQLite, pass exactly one database source:

- `databasePath` lets RPGJS open and own the SQLite connection;
- `database` reuses a compatible connection owned by the application.

Passing neither source or both sources is invalid. A filesystem path is the
simplest production configuration for the single-process Node adapter shown
above.

## WebSocket session ids

The Node transport uses the RPGJS room adapter and follows its session model:

- `conn.id` is unique for each active WebSocket connection.
- `conn.sessionId` is the stable private session id sent by the client.

`provideMmorpg()` sends this stable id through PartySocket, so a browser refresh
or a second tab can restore the same player session without replacing the first
active WebSocket. When you need to address or exclude a single physical socket,
use `conn.id`; when you need to inspect the restored player session, use
`conn.sessionId`.

## Hono and other runtimes

The same transport can be used outside Express:

- use `transport.fetch()` when your framework exposes Fetch `Request`/`Response`
- use `transport.handleNodeRequest()` when your framework gives Node `req`/`res`
- use `transport.acceptWebSocket()` or `transport.handleUpgrade()` for WebSocket upgrades

## Security note

Do not expose `/map/update` without a token in public MMORPG production deployments.

`/map/update` is a trusted server-side operation. It can redefine map geometry, events, and world metadata.

## Development with Vite

With `@rpgjs/vite`, you do not need this manual flow for local development.

The Vite plugin creates the transport internally and performs the server-side map bootstrap automatically.
