# Studio playground

This game exercises the same Studio module in two modes:

- `pnpm dev` keeps the existing standalone Vite workflow;
- `pnpm dev:mmorpg` runs the MMORPG client with the Node.js room hosted by Vite;
- `pnpm dev:cloudflare` runs the MMORPG client with a local Wrangler Durable
  Object on `http://127.0.0.1:8787`.

## Standalone

From the repository root, start the playground launcher and select **Studio**:

```bash
pnpm playground
```

To run only this game:

```bash
pnpm --dir playground dev:studio
```

The direct URL is `http://localhost:5182`.

The playground is configured with the local Studio project
`f54814b5-02ba-4712-a174-d84c900b7ff3` and starts on map
`6c524591-c8b8-4bc6-843e-43ea8d8b7c49`.

## Node.js MMORPG

The Node.js provider does not require the Cloudflare map-update token:

```bash
pnpm dev:mmorpg
```

Equivalently, `RPG_TYPE=mmorpg pnpm dev` selects the same MMORPG client and
keeps the room hosted by the Vite Node.js transport. The
`RPGJS_SERVER_ADAPTER=cloudflare` selector is reserved for the Wrangler command
below.

## Cloudflare Durable Object

Prepare the same map-update secret for Vite and Wrangler:

```bash
cp .env.example .env.local
cp .dev.vars.example .dev.vars
```

Then start both processes:

```bash
pnpm dev:cloudflare
```

Wrangler owns the authoritative map room. Vite loads the configured Studio v2
map in a trusted Node process and publishes it to the Durable Object. The client
receives only nearby render and collision chunks; it never downloads the full
Studio map, event rules, database, or global physics definition.

Studio media such as terrain textures and character images remain public because
the browser must download them to draw the game.

## Publish test data

With Wrangler running, publish the deterministic v2 fixture:

```bash
pnpm seed:cloudflare
```

The fixture includes a fixed test NPC and a collision wall, so the same seed
checks entity synchronization, rendering, and client-prediction collisions.

Publish a real Studio map through the same preparation code as Vite:

```bash
pnpm seed:cloudflare -- \
  --studio \
  --project-id <project-id> \
  --map-id <map-id>
```

`RPGJS_STUDIO_PROJECT_ID` can replace `--project-id`. Use `--target` for another
Worker origin or `--file` to publish a different prepared JSON fixture. The seed
reads `RPGJS_MAP_UPDATE_TOKEN` from the environment or `.dev.vars` and does not
print it. Studio seeds also publish the runtime world topology through the
authenticated `/world/:id/update` endpoint for every map room in the project,
so moving maps in Studio does not require restarting the MMORPG server.

The equivalent direct HTTP request is:

```bash
curl --fail-with-body \
  -X POST \
  -H 'content-type: application/json' \
  -H 'x-rpgjs-map-update-token: local-map-update-token' \
  --data-binary @fixtures/studio-map-v2.json \
  http://127.0.0.1:8787/parties/main/map-seed-studio/map/update
```

The token must match `.dev.vars`. A missing or invalid token returns `401`. A
successful update returns a 2xx response and creates or refreshes the map room
even before a player connects.

This direct `curl` updates only `map-seed-studio`. It does not propagate world
topology to other rooms. For a real Studio project, prefer the complete
`seed:cloudflare --studio` command shown above; it publishes the map and calls
`/world/:id/update` for every map in the project.

## Checks and deployment

```bash
pnpm test
pnpm build:cloudflare
pnpm types
pnpm deploy:dry-run
```

For production, use the same explicit Wrangler environment for the secret and
the deployment:

```bash
pnpm wrangler secret put RPGJS_MAP_UPDATE_TOKEN --env production
pnpm wrangler deploy --env production
pnpm wrangler tail --env production
```

Then point the trusted Studio publisher at the deployed Worker URL. Never expose
the update token through Vite client variables.
