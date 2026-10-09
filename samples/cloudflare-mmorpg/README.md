# RPGJS Cloudflare MMORPG sample

This sample runs the browser client with Vite and the authoritative RPGJS
server with Wrangler. Vite acts as a trusted development editor: it builds the
`demo` map payload and publishes it to the Worker administration endpoint.

The `map-demo` room is a Cloudflare Durable Object and remains authoritative for
movement, collisions, NPCs, events, and projectiles. It keeps the complete TMX/TSX
payload private. The browser receives only nearby tile/image references and static
hitboxes, then adds or removes them as the authoritative player crosses chunks.
The NPC uses the same interest stream and is sent with its complete `hero` graphic
snapshot when it becomes visible.

```bash
cp .env.example .env.local
cp .dev.vars.example .dev.vars
pnpm install
pnpm dev
```

The value of `RPGJS_MAP_UPDATE_TOKEN` must be strictly identical in
`.env.local` (Vite publisher) and `.dev.vars` (Wrangler Worker). A mismatch is
rejected with `401 Unauthorized`.

Vite serves the client on `http://localhost:5173` and proxies `/parties` to
Wrangler on `http://127.0.0.1:8787`.

Open the browser build output after `pnpm build`: `dist/client/map` contains image
assets, but no `.tmx` or `.tsx`. Only the trusted publisher reads those project
files; the Worker receives and persists the compiled authoritative payload. The
game server module itself is provider-neutral and can also be mounted by the
RPGJS Node.js transport without changing gameplay code.

In production, an editor, deployment pipeline, or trusted backend sends the
same authenticated request:

```text
POST /parties/main/map-demo/map/update
x-rpgjs-map-update-token: <RPGJS_MAP_UPDATE_TOKEN>
```

Configure the production secret interactively with:

```bash
pnpm wrangler secret put RPGJS_MAP_UPDATE_TOKEN --env production
```

Before deployment, run `pnpm build`, `pnpm types`, `pnpm test`, and
`pnpm deploy:dry-run`.

Deploy with the same environment used when creating the secret, then inspect the
Worker logs during the first map publication:

```bash
pnpm wrangler deploy --env production
```

Create an uncommitted `.env.publisher` containing the deployed URL, the same
secret, and the map id:

```dotenv
RPGJS_PUBLISH_TARGET=https://rpgjs-cloudflare-mmorpg-production.<your-subdomain>.workers.dev
RPGJS_MAP_UPDATE_TOKEN=the-production-secret
RPGJS_MAP_IDS=demo
```

Publish the authoritative map, then inspect the Worker logs:

```bash
node --env-file=.env.publisher --import tsx src/publish-maps.ts
pnpm wrangler tail --env production
```

The publisher exits with an error on a non-2xx response and automatically fans
out `worldUpdates` to every affected room. A successful run prints
`Published map: demo`.

For multi-map worlds, a complete trusted publisher must also call
`POST /parties/main/map-<each-map>/world/<world-id>/update` for every map room.
The RPGJS Vite publisher performs that fan-out automatically when the resolved
map payload contains `worldUpdates`.

This sample pins the last Wrangler 3 runtime that supports the GLIBC 2.31
development host used by the repository. Projects on a newer operating system
should update Wrangler and `@cloudflare/vitest-pool-workers` together to their
current compatible major versions.
