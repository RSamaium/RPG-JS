# @rpgjs/studio

## 5.0.0-beta.30

### Patch Changes

- 7da338c: Render only terrain chunks affected by consolidated Studio map stream updates.

## 5.0.0-beta.29

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
  - @rpgjs/action-battle@5.0.0-beta.28
  - @rpgjs/client@5.0.0-beta.28
  - @rpgjs/vite@5.0.0-beta.28

## 5.0.0-beta.28

### Patch Changes

- ecb31da: Scope Studio player initialization and starting database records to the joined
  map project so multi-project Workers do not leak global project configuration.
- e5ad24a: Establish the stable RPGJS-owned boundary for reactive gameplay properties,
  dependency-injection providers, Node room storage, and Cloudflare room hosting.
  Remove accidental Signe re-exports from the client and server roots, keep
  direct Signe imports as an explicitly advanced plugin path, and protect every
  published TypeScript entry with declaration reachability snapshots in CI.
  Keep provider creation strategies mutually exclusive, support asynchronous
  provider factories, and preserve strict member checking on the server engine.
  Enforce these public contracts in CI, test the RPGJS-owned Node storage
  lifecycle, and document complete stable migration examples.
- 9673224: Allow trusted Studio map publishers to inject a server-owned data provider for
  project, map, media, and database reads without calling the public Studio API.
- Updated dependencies [dc6aed5]
- Updated dependencies [e5ad24a]
  - @rpgjs/client@5.0.0-beta.27
  - @rpgjs/server@5.0.0-beta.27
  - @rpgjs/action-battle@5.0.0-beta.27
  - @rpgjs/common@5.0.0-beta.26
  - @rpgjs/vite@5.0.0-beta.27

## 5.0.0-beta.27

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
  - @rpgjs/action-battle@5.0.0-beta.26
  - @rpgjs/client@5.0.0-beta.26
  - @rpgjs/common@5.0.0-beta.25
  - @rpgjs/server@5.0.0-beta.26
  - @rpgjs/vite@5.0.0-beta.26

## 5.0.0-beta.26

### Patch Changes

- 4441d3f: Keep Studio map elements constrained to their repeat axis when a placed element only overrides one dimension, and render repeat/edge-repeat segments by tiling the repeated slice instead of scaling every segment across the resized axis.
- eb4a3a7: Add reusable Studio string templates for nested player properties and persistent variables, and resolve them in player-visible block text.

## 5.0.0-beta.25

### Minor Changes

- 0512640: Add reusable typed input and textarea controls for standalone forms and dialog boxes, with shared server-side validation and an RPGJS Studio block that stores the submitted value.

### Patch Changes

- fe6c2b9: Animate textured and color-filled terrain holes automatically, including subtle texture refraction driven by the Studio map water speed and intensity.
- a72a1e8: Support per-hole wave intensity, direction, and speed settings, and tint liquid wave highlights from each fill's local color or texture.
- ccb9495: Fix TypeScript declaration errors across the package build, align multi-target declaration exports, complete movement API overloads, and make package and root builds fail when declaration generation reports a type error.
- Updated dependencies [ccb9495]
- Updated dependencies [f6aa046]
- Updated dependencies [0512640]
  - @rpgjs/client@5.0.0-beta.25
  - @rpgjs/common@5.0.0-beta.24
  - @rpgjs/server@5.0.0-beta.25
  - @rpgjs/vite@5.0.0-beta.25
  - @rpgjs/action-battle@5.0.0-beta.25

## 5.0.0-beta.24

### Patch Changes

- 3fb2765: Apply Studio media scale as a multiplier of the default RPGJS display scale, then combine it with event instance scale instead of overwriting it.
- be412cf: Let Studio event-touch pressure plates overlap pushed events without physical separation, wait until ground sensors are mostly covered before firing, clean up touch tracking when collisions exit after z changes, and clamp route overshoot frames that could make pushed events jitter.
- Updated dependencies [e11f2ed]
- Updated dependencies [3fb2765]
- Updated dependencies [be412cf]
  - @rpgjs/client@5.0.0-beta.24
  - @rpgjs/common@5.0.0-beta.23
  - @rpgjs/server@5.0.0-beta.24
  - @rpgjs/action-battle@5.0.0-beta.24
  - @rpgjs/vite@5.0.0-beta.24

## 5.0.0-beta.23

### Patch Changes

- e7d8d13: Hydrate Studio event hitboxes from the API initially, apply synchronized hitbox object payloads to client physics bodies, publish runtime Studio hitbox changes through the synced event collection instead of a separate setHitbox websocket path, and keep standalone map transfers on the restored room so transferred player positions and hitboxes are preserved in sample-dev.
- Updated dependencies [e7d8d13]
  - @rpgjs/client@5.0.0-beta.23
  - @rpgjs/common@5.0.0-beta.22
  - @rpgjs/server@5.0.0-beta.23
  - @rpgjs/action-battle@5.0.0-beta.23
  - @rpgjs/vite@5.0.0-beta.23

## 5.0.0-beta.22

### Patch Changes

- 016aa37: Fix Studio animation blocks to keep event erase animations attached to the sprite being removed.
- Updated dependencies [1028c17]
- Updated dependencies [06afecc]
  - @rpgjs/client@5.0.0-beta.22
  - @rpgjs/vite@5.0.0-beta.22
  - @rpgjs/action-battle@5.0.0-beta.22
  - @rpgjs/server@5.0.0-beta.22

## 5.0.0-beta.20

### Patch Changes

- Release the next RPGJS beta while keeping the physics package unchanged.
- Updated dependencies
  - @rpgjs/action-battle@5.0.0-beta.20
  - @rpgjs/client@5.0.0-beta.20
  - @rpgjs/common@5.0.0-beta.20
  - @rpgjs/server@5.0.0-beta.20
  - @rpgjs/vite@5.0.0-beta.20

## 5.0.0-beta.19

### Patch Changes

- Release the next RPGJS beta while keeping the physics package unchanged.
- Updated dependencies
  - @rpgjs/action-battle@5.0.0-beta.19
  - @rpgjs/client@5.0.0-beta.19
  - @rpgjs/common@5.0.0-beta.19
  - @rpgjs/server@5.0.0-beta.19
  - @rpgjs/vite@5.0.0-beta.19

## 5.0.0-beta.17

### Patch Changes

- Release the next RPGJS beta while keeping the physics package on its stable release line.
- Updated dependencies
  - @rpgjs/action-battle@5.0.0-beta.17
  - @rpgjs/client@5.0.0-beta.17
  - @rpgjs/common@5.0.0-beta.16
  - @rpgjs/server@5.0.0-beta.17
  - @rpgjs/vite@5.0.0-beta.17

## 5.0.0-beta.16

### Patch Changes

- Release the next RPGJS beta with terrain rendering performance improvements and a unified server tick loop.
- Updated dependencies
  - @rpgjs/action-battle@5.0.0-beta.16
  - @rpgjs/client@5.0.0-beta.16
  - @rpgjs/common@5.0.0-beta.15
  - @rpgjs/server@5.0.0-beta.16
  - @rpgjs/vite@5.0.0-beta.16

## 5.0.0-beta.15

### Patch Changes

- Updated dependencies [dba133e]
  - @rpgjs/client@5.0.0-beta.15
  - @rpgjs/action-battle@5.0.0-beta.15
  - @rpgjs/server@5.0.0-beta.15
  - @rpgjs/vite@5.0.0-beta.15

## 5.0.0-beta.14

### Patch Changes

- Updated dependencies [c96b31a]
  - @rpgjs/common@5.0.0-beta.14
  - @rpgjs/server@5.0.0-beta.14
  - @rpgjs/action-battle@5.0.0-beta.14
  - @rpgjs/client@5.0.0-beta.14
  - @rpgjs/vite@5.0.0-beta.14

## 5.0.0-beta.13

### Patch Changes

- Release the next RPGJS beta with client interactions, i18n support, movement and physics improvements, Studio fixes, action battle updates, playground migration, and related runtime documentation.
- Updated dependencies
  - @rpgjs/action-battle@5.0.0-beta.13
  - @rpgjs/client@5.0.0-beta.13
  - @rpgjs/common@5.0.0-beta.13
  - @rpgjs/server@5.0.0-beta.13
  - @rpgjs/vite@5.0.0-beta.13

## 5.0.0-beta.12

### Patch Changes

- Updated dependencies
  - @rpgjs/action-battle@5.0.0-beta.12
  - @rpgjs/client@5.0.0-beta.12
  - @rpgjs/common@5.0.0-beta.12
  - @rpgjs/server@5.0.0-beta.12
  - @rpgjs/vite@5.0.0-beta.12

## 5.0.0-beta.11

### Patch Changes

- Update Studio CanvasEngine components for the current renderer behavior and align CanvasEngine dependencies with the beta.11 package set.

  - @rpgjs/action-battle@5.0.0-beta.11
  - @rpgjs/client@5.0.0-beta.11
  - @rpgjs/common@5.0.0-beta.11
  - @rpgjs/server@5.0.0-beta.11
  - @rpgjs/vite@5.0.0-beta.11

## 5.0.0-beta.10

### Patch Changes

- Updated dependencies
  - @rpgjs/client@5.0.0-beta.10
  - @rpgjs/action-battle@5.0.0-beta.10
  - @rpgjs/server@5.0.0-beta.10
  - @rpgjs/vite@5.0.0-beta.10

## 5.0.0-beta.9

### Major Changes

- c456d25: beta.9

### Patch Changes

- Updated dependencies [c456d25]
  - @rpgjs/action-battle@5.0.0-beta.9
  - @rpgjs/client@5.0.0-beta.9
  - @rpgjs/common@5.0.0-beta.9
  - @rpgjs/server@5.0.0-beta.9
  - @rpgjs/vite@5.0.0-beta.9

## 5.0.0-beta.8

### Major Changes

- 35e7fa4: beta.8

### Patch Changes

- Updated dependencies [35e7fa4]
  - @rpgjs/action-battle@5.0.0-beta.8
  - @rpgjs/client@5.0.0-beta.8
  - @rpgjs/common@5.0.0-beta.8
  - @rpgjs/server@5.0.0-beta.8
  - @rpgjs/vite@5.0.0-beta.8
