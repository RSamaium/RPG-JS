# @rpgjs/vite

## 5.0.0-beta.28

### Patch Changes

- 995277f: Upgrade the RPGJS workspace and published package compatibility ranges to
  CanvasEngine 2.1, including its compiler, presets, testing, and Tiled
  integrations. Keep PixiJS on the CanvasEngine-supported 8.19 line and verify the
  existing client, server, sample, and playground builds against the new runtime.
- 995277f: Add explicit renderer-neutral GUI registrations with an official Vue helper,
  ship the authoritative and replaceable RPGJS chat module, provide default and
  pixel chat themes over shared semantic CSS primitives, and enforce client/server
  production bundle isolation with executable fixtures. Include a runnable pixel
  chat playground and keep chat socket listeners active across standalone startup
  and player map transfers. Document client/server setup, moderation hooks,
  replacement components, themes, translations, and the public chat state API.
  Emit complete side-specific chat declarations, synchronize the built-in input
  length with client configuration, and reject explicitly unknown chat channels.
- Updated dependencies [37a4fb0]
- Updated dependencies [995277f]
- Updated dependencies [335b768]
  - @rpgjs/server@5.0.0-beta.28

## 5.0.0-beta.27

### Patch Changes

- Updated dependencies [dc6aed5]
- Updated dependencies [e5ad24a]
  - @rpgjs/server@5.0.0-beta.27

## 5.0.0-beta.26

### Minor Changes

- 83fc2b7: Add production Signe room adapters for persistent Node servers and Cloudflare Durable Objects, plus remote Vite map publication for trusted editor workflows with transient-only retries. Resolve local TMX files and their external tilesets when publishing maps, recreate configured events safely during live map updates, and restore player and event graphics after clients reload the Tiled scene.

  Add provider-neutral authoritative map streaming with progressive render/physics chunks, client prediction barriers, and spatial interest management for players, NPCs, events, and projectiles. Keep complete Tiled TMX/TSX sources server-side in MMORPG mode while sharing the same game module between Node.js, local Wrangler, and Cloudflare Durable Object hosts.

  Use the physics broad-phase index when resolving synchronized entities in each player's retained chunks, avoiding full-room player and event scans on every sync packet.

  Assign Tiled collision geometry to every streamed chunk it intersects, and preserve the generated client reference for action, dash, pointer, and interaction APIs with a dedicated interactions guide.

  Preserve initial room synchronization on older local Workerd runtimes that expose an accepted Durable Object WebSocket with a transient `CONNECTING` ready state.

  Prevent CanvasEngine rain layers from retaining tick subscriptions when an asynchronous mount overlaps destruction or another mount.

  Keep component-ready standalone Studio maps intact when sharing the in-memory server, and select the Cloudflare publisher independently from the generic MMORPG entry so local Node.js development does not require a Worker secret.

  Add Studio v2 authoritative map preparation and progressive chunk streaming, including server physics, nearby rendering data, and provider-neutral entity synchronization. Trusted Vite publishers can now resolve a complete Studio payload before sending it to Node or Cloudflare map rooms, while raw Studio map structure, events, database records, and global collision data stay server-side.

  Make initial map streaming explicit and hibernation-safe: clients request a fresh manifest after joining, trusted map updates are durably stored before acknowledgement, and recreated Durable Object room instances rebuild their transient streaming runtime. Stream Studio terrain control masks per chunk so transition rendering and prediction physics work without disclosing the complete map, and reset spatial visibility on reconnect so existing clients receive newly joined players.

  Preserve custom streaming providers when Studio's built-in streaming is disabled, refresh cached client controllers after Durable Object hibernation, and key terrain-control buffers by their complete streamed region content to prevent stale masks.

  Suppress projectile lifecycle packets that fall outside a player's disclosed interest window, clear client prediction barriers after the final streamed chunk is evicted, and coalesce concurrent requests for the same map stream. Exercise these paths with server, client, and real Workerd WebSocket tests, and run the Cloudflare MMORPG and Studio runtime suites in CI.

  Avoid dereferencing an empty Studio weather state while switching maps.

  Publish authenticated world topology updates to every map room, persist them across Durable Object hibernation, and refresh automatic world-map transitions without restarting the MMORPG server.

  Document the Durable Object room model, map-and-world publication flow, hibernation recovery, production deployment, and common Cloudflare diagnostics.

  Correct the documented default runtime to standalone RPG and add a beginner deployment path that takes the v5 starter through explicit MMORPG development, private map bundling, authenticated map publication, a persistent Node Docker deployment, or a Cloudflare Durable Object deployment. Include an executable production map publisher in the Cloudflare sample and make the production pages discoverable from both documentation navigations.

  Declare the RPGJS Durable Object binding explicitly in Wrangler staging and production environments so isolated deployments keep their room namespace.

  Cover the previous Studio scene before unmounting it during World transfers, preserve recent directional movement into the destination room, then reveal the new map through a full-screen dark transition with a centered, delayed localized loader and a bounded asset wait so stale or white frames cannot flash while fast local transitions stay unobtrusive.

### Patch Changes

- b6ab003: Establish `defineModule()` as the canonical runtime module authoring API, export it from the client and server packages, keep `createModule()` for advanced provider composition, and align runtime-specific module installation documentation and examples.
- Updated dependencies [b6ab003]
- Updated dependencies [777541a]
- Updated dependencies [48fcd25]
- Updated dependencies [83fc2b7]
  - @rpgjs/server@5.0.0-beta.26

## 5.0.0-beta.25

### Patch Changes

- ccb9495: Fix TypeScript declaration errors across the package build, align multi-target declaration exports, complete movement API overloads, and make package and root builds fail when declaration generation reports a type error.
- Updated dependencies [ccb9495]
- Updated dependencies [f6aa046]
- Updated dependencies [0512640]
  - @rpgjs/server@5.0.0-beta.25

## 5.0.0-beta.24

### Patch Changes

- Updated dependencies [be412cf]
  - @rpgjs/server@5.0.0-beta.24

## 5.0.0-beta.23

### Patch Changes

- Updated dependencies [e7d8d13]
  - @rpgjs/server@5.0.0-beta.23

## 5.0.0-beta.22

### Patch Changes

- 06afecc: Prevent Vite dev dependency optimization from prebundling RPGJS and CanvasEngine runtime packages that share PixiJS state, fixing missing TileMap render pipe registration in the starter.
  - @rpgjs/server@5.0.0-beta.22

## 5.0.0-beta.20

### Patch Changes

- Release the next RPGJS beta while keeping the physics package unchanged.
- Updated dependencies
  - @rpgjs/server@5.0.0-beta.20

## 5.0.0-beta.19

### Patch Changes

- Release the next RPGJS beta while keeping the physics package unchanged.
- Updated dependencies
  - @rpgjs/server@5.0.0-beta.19

## 5.0.0-beta.17

### Patch Changes

- Release the next RPGJS beta while keeping the physics package on its stable release line.
- Updated dependencies
  - @rpgjs/server@5.0.0-beta.17

## 5.0.0-beta.16

### Patch Changes

- Release the next RPGJS beta with terrain rendering performance improvements and a unified server tick loop.
- Updated dependencies
  - @rpgjs/server@5.0.0-beta.16

## 5.0.0-beta.15

### Patch Changes

- @rpgjs/server@5.0.0-beta.15

## 5.0.0-beta.14

### Patch Changes

- Updated dependencies [c96b31a]
  - @rpgjs/server@5.0.0-beta.14

## 5.0.0-beta.13

### Patch Changes

- Release the next RPGJS beta with client interactions, i18n support, movement and physics improvements, Studio fixes, action battle updates, playground migration, and related runtime documentation.
- Updated dependencies
  - @rpgjs/server@5.0.0-beta.13

## 5.0.0-beta.12

### Patch Changes

- Prepare beta.12 with action battle AI, area queries, client visuals, event component resolvers, projectile handling, and related Vite/runtime updates.
- Updated dependencies
  - @rpgjs/server@5.0.0-beta.12

## 5.0.0-beta.11

### Patch Changes

- Update CanvasEngine compiler and tiled integration dependencies, and include the sample projectiles workspace.

  - @rpgjs/server@5.0.0-beta.11

## 5.0.0-beta.10

### Patch Changes

- @rpgjs/server@5.0.0-beta.10

## 5.0.0-beta.9

### Major Changes

- c456d25: beta.9

### Patch Changes

- Updated dependencies [c456d25]
  - @rpgjs/server@5.0.0-beta.9

## 5.0.0-beta.8

### Major Changes

- 35e7fa4: beta.8

### Patch Changes

- Updated dependencies [35e7fa4]
  - @rpgjs/server@5.0.0-beta.8
