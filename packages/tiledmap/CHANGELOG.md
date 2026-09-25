# @rpgjs/tiledmap

## 5.0.0-rc.8

### Patch Changes

- 973878b: Update CanvasEngine to 2.3.0. The 2.3 compiler no longer injects `computed`, `h`, `cond` and `loop` into every component, so components now import the helpers their script uses. `rpgjs()` declares its `Plugin[]` return type.
- 0dbe078: Make Tiled tile collisions depend on the character `z`, as in RPGJS v4 (#370). Collision tiles are generated for every Tiled level (layer `z` + tile `z`). A tile on level `n` only blocks characters whose `z` is in `[n * zTileHeight, (n + 1) * zTileHeight)`, so `player.z.set(map.zTileHeight)` lets a player walk over level `0` collisions such as water. Static map hitboxes accept an optional `z`/`zHeight` range, and hitboxes without `z` still block every height.
- Updated dependencies [973878b]
- Updated dependencies [a0710ce]
- Updated dependencies [c69f516]
- Updated dependencies [7846969]
- Updated dependencies [13517b8]
- Updated dependencies [72d3e5d]
- Updated dependencies [1a45ca5]
- Updated dependencies [327185b]
- Updated dependencies [fc86ec2]
- Updated dependencies [a7f44ba]
- Updated dependencies [0dbe078]
  - @rpgjs/client@5.0.0-rc.8
  - @rpgjs/server@5.0.0-rc.8
  - @rpgjs/vite@5.0.0-rc.8
  - @rpgjs/common@5.0.0-rc.6

## 5.0.0-rc.7

### Patch Changes

- Updated dependencies
- Updated dependencies [ef47908]
  - @rpgjs/client@5.0.0-rc.7
  - @rpgjs/server@5.0.0-rc.7
  - @rpgjs/vite@5.0.0-rc.7

## 5.0.0-rc.6

### Patch Changes

- Updated dependencies [d88267a]
- Updated dependencies
  - @rpgjs/common@5.0.0-rc.5
  - @rpgjs/server@5.0.0-rc.6
  - @rpgjs/client@5.0.0-rc.6
  - @rpgjs/vite@5.0.0-rc.6

## 5.0.0-rc.5

### Patch Changes

- Updated dependencies [f488e28]
  - @rpgjs/client@5.0.0-rc.5
  - @rpgjs/server@5.0.0-rc.5
  - @rpgjs/vite@5.0.0-rc.5

## 5.0.0-rc.4

### Patch Changes

- Publish release candidates under npm's `latest` tag while retaining the repository's prerelease mode.
- Updated dependencies
  - @rpgjs/client@5.0.0-rc.4
  - @rpgjs/common@5.0.0-rc.4
  - @rpgjs/server@5.0.0-rc.4
  - @rpgjs/vite@5.0.0-rc.4

## 5.0.0-rc.3

### Patch Changes

- Publish release candidates under the npm `latest` tag so fresh RPGJS projects install the current release.
- Updated dependencies
  - @rpgjs/client@5.0.0-rc.3
  - @rpgjs/common@5.0.0-rc.3
  - @rpgjs/server@5.0.0-rc.3
  - @rpgjs/vite@5.0.0-rc.3

## 5.0.0-rc.2

### Patch Changes

- Prevent npm releases from containing unresolved `workspace:` dependency protocols.
- Updated dependencies
  - @rpgjs/client@5.0.0-rc.2
  - @rpgjs/common@5.0.0-rc.2
  - @rpgjs/server@5.0.0-rc.2
  - @rpgjs/vite@5.0.0-rc.2

## 5.0.0-rc.36

### Patch Changes

- Updated dependencies [94cbdac]
- Updated dependencies [4d53aa7]
- Updated dependencies [66c0d77]
- Updated dependencies [66c0d77]
- Updated dependencies [94cbdac]
- Updated dependencies [94cbdac]
- Updated dependencies [94cbdac]
- Updated dependencies [f624302]
- Updated dependencies [66c0d77]
  - @rpgjs/client@5.0.0-rc.36
  - @rpgjs/server@5.0.0-rc.36
  - @rpgjs/common@5.0.0-rc.32
  - @rpgjs/vite@5.0.0-rc.36

## 5.0.0-beta.35

### Patch Changes

- Updated dependencies [e7b12ab]
  - @rpgjs/client@5.0.0-beta.35
  - @rpgjs/server@5.0.0-beta.35
  - @rpgjs/vite@5.0.0-beta.35

## 5.0.0-beta.34

### Patch Changes

- aaa44f3: Preserve Tiled tile and layer `z` metadata and their tile ID positions in MMORPG map streams so foreground tiles render above characters without assigning depth to the wrong tiles, while other private custom properties remain server-side.
- b74236b: Add server-authoritative custom gameplay rooms with registered room paths,
  session-preserving player transfers, synchronized client room state, and
  CanvasEngine scene adapters that run independently of maps and map physics.
  Room providers also accept concrete `RpgGameplayRoom` subclasses with their
  typed constructor context, so strict TypeScript applications can register them.
  Returning from a custom room now waits for a fresh map-stream packet before
  remounting the map component and keeps the room scene visible until that data
  is ready. Map components are also gated on non-null render data, preventing
  stale or incomplete values from reaching CanvasEngine presets.
- Updated dependencies [b74236b]
- Updated dependencies [1fb8040]
- Updated dependencies [6b8d872]
- Updated dependencies [85aea0c]
  - @rpgjs/client@5.0.0-beta.34
  - @rpgjs/common@5.0.0-beta.31
  - @rpgjs/server@5.0.0-beta.34
  - @rpgjs/vite@5.0.0-beta.34

## 5.0.0-beta.33

### Patch Changes

- Updated dependencies [0909491]
- Updated dependencies [c849207]
  - @rpgjs/client@5.0.0-beta.33
  - @rpgjs/server@5.0.0-beta.33
  - @rpgjs/vite@5.0.0-beta.33

## 5.0.0-beta.32

### Patch Changes

- Updated dependencies [decf73e]
- Updated dependencies [1bcd9fc]
  - @rpgjs/common@5.0.0-beta.30
  - @rpgjs/client@5.0.0-beta.32
  - @rpgjs/server@5.0.0-beta.32
  - @rpgjs/vite@5.0.0-beta.32

## 5.0.0-beta.31

### Patch Changes

- Updated dependencies [e892732]
  - @rpgjs/client@5.0.0-beta.31
  - @rpgjs/common@5.0.0-beta.29
  - @rpgjs/server@5.0.0-beta.31
  - @rpgjs/vite@5.0.0-beta.31

## 5.0.0-beta.30

### Patch Changes

- Updated dependencies [e0bba29]
- Updated dependencies [aed4d3e]
  - @rpgjs/client@5.0.0-beta.30
  - @rpgjs/common@5.0.0-beta.28
  - @rpgjs/server@5.0.0-beta.30
  - @rpgjs/vite@5.0.0-beta.30

## 5.0.0-beta.29

### Patch Changes

- Updated dependencies [512e637]
- Updated dependencies [4b6fe16]
- Updated dependencies [512e637]
- Updated dependencies [4cc3086]
- Updated dependencies [9f317fb]
- Updated dependencies [512e637]
- Updated dependencies [aa4a517]
  - @rpgjs/server@5.0.0-beta.29
  - @rpgjs/client@5.0.0-beta.29
  - @rpgjs/common@5.0.0-beta.27
  - @rpgjs/vite@5.0.0-beta.29

## 5.0.0-beta.28

### Patch Changes

- 995277f: Upgrade the RPGJS workspace and published package compatibility ranges to
  CanvasEngine 2.1, including its compiler, presets, testing, and Tiled
  integrations. Keep PixiJS on the CanvasEngine-supported 8.19 line and verify the
  existing client, server, sample, and playground builds against the new runtime.
- Updated dependencies [37a4fb0]
- Updated dependencies [995277f]
- Updated dependencies [995277f]
- Updated dependencies [335b768]
  - @rpgjs/server@5.0.0-beta.28
  - @rpgjs/client@5.0.0-beta.28
  - @rpgjs/vite@5.0.0-beta.28

## 5.0.0-beta.27

### Patch Changes

- e5ad24a: Establish the stable RPGJS-owned boundary for reactive gameplay properties,
  dependency-injection providers, Node room storage, and Cloudflare room hosting.
  Remove accidental Signe re-exports from the client and server roots, keep
  direct Signe imports as an explicitly advanced plugin path, and protect every
  published TypeScript entry with declaration reachability snapshots in CI.
  Keep provider creation strategies mutually exclusive, support asynchronous
  provider factories, and preserve strict member checking on the server engine.
  Enforce these public contracts in CI, test the RPGJS-owned Node storage
  lifecycle, and document complete stable migration examples.
- Updated dependencies [dc6aed5]
- Updated dependencies [e5ad24a]
  - @rpgjs/client@5.0.0-beta.27
  - @rpgjs/server@5.0.0-beta.27
  - @rpgjs/common@5.0.0-beta.26
  - @rpgjs/vite@5.0.0-beta.27

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
  - @rpgjs/client@5.0.0-beta.26
  - @rpgjs/common@5.0.0-beta.25
  - @rpgjs/server@5.0.0-beta.26
  - @rpgjs/vite@5.0.0-beta.26

## 5.0.0-beta.25

### Patch Changes

- ccb9495: Fix TypeScript declaration errors across the package build, align multi-target declaration exports, complete movement API overloads, and make package and root builds fail when declaration generation reports a type error.
- Updated dependencies [ccb9495]
- Updated dependencies [f6aa046]
- Updated dependencies [0512640]
  - @rpgjs/client@5.0.0-beta.25
  - @rpgjs/common@5.0.0-beta.24
  - @rpgjs/server@5.0.0-beta.25
  - @rpgjs/vite@5.0.0-beta.25

## 5.0.0-beta.24

### Patch Changes

- Updated dependencies [e11f2ed]
- Updated dependencies [3fb2765]
- Updated dependencies [be412cf]
  - @rpgjs/client@5.0.0-beta.24
  - @rpgjs/common@5.0.0-beta.23
  - @rpgjs/server@5.0.0-beta.24
  - @rpgjs/vite@5.0.0-beta.24

## 5.0.0-beta.23

### Patch Changes

- Updated dependencies [e7d8d13]
  - @rpgjs/client@5.0.0-beta.23
  - @rpgjs/common@5.0.0-beta.22
  - @rpgjs/server@5.0.0-beta.23
  - @rpgjs/vite@5.0.0-beta.23

## 5.0.0-beta.22

### Patch Changes

- Updated dependencies [1028c17]
- Updated dependencies [06afecc]
  - @rpgjs/client@5.0.0-beta.22
  - @rpgjs/vite@5.0.0-beta.22
  - @rpgjs/server@5.0.0-beta.22

## 5.0.0-beta.20

### Patch Changes

- Release the next RPGJS beta while keeping the physics package unchanged.
- Updated dependencies
  - @rpgjs/client@5.0.0-beta.20
  - @rpgjs/common@5.0.0-beta.20
  - @rpgjs/server@5.0.0-beta.20
  - @rpgjs/vite@5.0.0-beta.20

## 5.0.0-beta.19

### Patch Changes

- Release the next RPGJS beta while keeping the physics package unchanged.
- Updated dependencies
  - @rpgjs/client@5.0.0-beta.19
  - @rpgjs/common@5.0.0-beta.19
  - @rpgjs/server@5.0.0-beta.19
  - @rpgjs/vite@5.0.0-beta.19

## 5.0.0-beta.17

### Patch Changes

- Release the next RPGJS beta while keeping the physics package on its stable release line.
- Updated dependencies
  - @rpgjs/client@5.0.0-beta.17
  - @rpgjs/common@5.0.0-beta.16
  - @rpgjs/server@5.0.0-beta.17
  - @rpgjs/vite@5.0.0-beta.17

## 5.0.0-beta.16

### Patch Changes

- Release the next RPGJS beta with terrain rendering performance improvements and a unified server tick loop.
- Updated dependencies
  - @rpgjs/client@5.0.0-beta.16
  - @rpgjs/common@5.0.0-beta.15
  - @rpgjs/server@5.0.0-beta.16
  - @rpgjs/vite@5.0.0-beta.16

## 5.0.0-beta.15

### Patch Changes

- Updated dependencies [dba133e]
  - @rpgjs/client@5.0.0-beta.15
  - @rpgjs/server@5.0.0-beta.15
  - @rpgjs/vite@5.0.0-beta.15

## 5.0.0-beta.14

### Patch Changes

- Updated dependencies [c96b31a]
  - @rpgjs/common@5.0.0-beta.14
  - @rpgjs/server@5.0.0-beta.14
  - @rpgjs/client@5.0.0-beta.14
  - @rpgjs/vite@5.0.0-beta.14

## 5.0.0-beta.13

### Patch Changes

- Release the next RPGJS beta with client interactions, i18n support, movement and physics improvements, Studio fixes, action battle updates, playground migration, and related runtime documentation.
- Updated dependencies
  - @rpgjs/client@5.0.0-beta.13
  - @rpgjs/common@5.0.0-beta.13
  - @rpgjs/server@5.0.0-beta.13
  - @rpgjs/vite@5.0.0-beta.13

## 5.0.0-beta.12

### Patch Changes

- Updated dependencies
  - @rpgjs/client@5.0.0-beta.12
  - @rpgjs/common@5.0.0-beta.12
  - @rpgjs/server@5.0.0-beta.12
  - @rpgjs/vite@5.0.0-beta.12

## 5.0.0-beta.11

### Patch Changes

- Align CanvasEngine tiled, peer, and compiler dependencies with the beta.11 package set.

  - @rpgjs/client@5.0.0-beta.11
  - @rpgjs/common@5.0.0-beta.11
  - @rpgjs/server@5.0.0-beta.11
  - @rpgjs/vite@5.0.0-beta.11

## 5.0.0-beta.10

### Patch Changes

- Updated dependencies
  - @rpgjs/client@5.0.0-beta.10
  - @rpgjs/server@5.0.0-beta.10
  - @rpgjs/vite@5.0.0-beta.10

## 5.0.0-beta.9

### Major Changes

- c456d25: beta.9

### Patch Changes

- Updated dependencies [c456d25]
  - @rpgjs/client@5.0.0-beta.9
  - @rpgjs/common@5.0.0-beta.9
  - @rpgjs/server@5.0.0-beta.9
  - @rpgjs/vite@5.0.0-beta.9

## 5.0.0-beta.8

### Major Changes

- 35e7fa4: beta.8

### Patch Changes

- Updated dependencies [35e7fa4]
  - @rpgjs/client@5.0.0-beta.8
  - @rpgjs/common@5.0.0-beta.8
  - @rpgjs/server@5.0.0-beta.8
  - @rpgjs/vite@5.0.0-beta.8
