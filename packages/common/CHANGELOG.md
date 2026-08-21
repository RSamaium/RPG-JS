# @rpgjs/common

## 5.0.0-beta.30

### Minor Changes

- decf73e: Add a server-authoritative Actor selection API, runtime Actor switching that preserves acquired progression, a responsive cinematic CanvasEngine character selector, resolved Actor and Class object inputs, class skill progression for CMS-backed data, RPGJS Studio new-game Actor selection settings, character-select/change-class event blocks, and a native query-area block with per-target child execution.

## 5.0.0-beta.29

### Patch Changes

- e892732: Keep the camera attached when MMORPG streaming refreshes Tiled layers and synchronize instant following with the rendered character position so the viewport cannot trail by one frame. Stabilize predicted movement by publishing finalized input batches only after their client physics step, applying every input from the same client tick in one authoritative server step, capturing the matching acknowledged position, ignoring delayed acknowledgements whose prediction history expired, routing local-player snapshots through prediction instead of applying them directly, and sharing the same movement idle window on both peers.

## 5.0.0-beta.28

### Patch Changes

- e0bba29: Fix Studio world-map transitions and preserve the reactive HUD state during
  map transfers.

  - Normalize scaled Studio world coordinates to integer pixels and resolve
    automatic transitions from exact directional neighbors.
  - Keep explicit border-entry coordinates through map-room transfers instead of
    falling back to the destination map's `start` position.
  - Restore Studio's generated class from every destination map database so a
    standalone session transfer keeps the player snapshot, including HP and SP,
    while deferring a runtime class until the destination database has loaded.
  - Apply synchronized player parameters through their signal and keep the Studio
    HUD mounted so the avatar, HP, and SP remain reactive across map changes.

## 5.0.0-beta.27

### Minor Changes

- 4cc3086: Add a persistent server-authoritative, type-extensible hotbar for skills, items, and custom gameplay entries. The hotbar now supports a dynamic 1–10 slot capacity, retained locked-slot assignments, unlock hints, a persistent active slot, automatic refresh after level/class/inventory/map changes, direct keyboard shortcuts, a radial gamepad selector, LT/RT slot cycling with X activation, mobile centering, cooldown/cost/quantity presentation, and serialized `instant`, `select`, or `target` activation handlers.

  Replace Action Battle's dedicated `ui.actionBar` and component with the generic `ui.hotbar`. Action Battle skills enrich generic entries with targeting, cooldown, projectile, sound, animation, and visual metadata while their authoritative execution continues through native skill and item hooks. This is an intentional breaking configuration and export cleanup.

  Keep direct 1–0 Zelda-style menu assignment, display unavailable slots with their unlock condition in the root-level assignment picker, execute Studio skill workflows through the native `onUse` hook, make instant skills soft-target without a confirmation step, preserve skill impact media through AI damage feedback, and add translated Studio presentation fields, visual area targeting, phase-specific CanvasEngine cast/trail/impact presets, a default projectile renderer compatible with Studio skill records, and robust object-signal hydration for class and hotbar sync payloads. Upgrade to `@signe/sync` 3.1.1 so object-signal hydration uses the upstream fix without a local package patch.

  Expose a complete set of `--rpg-hotbar-*` CSS variables, bridge them through
  `@rpgjs/ui-css`, document the public client and server APIs with generated
  JSDoc references, and add a farm-themed playground showing mixed item and skill
  slots, menu assignment, and the persistent hotbar show/hide lifecycle.

## 5.0.0-beta.26

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

## 5.0.0-beta.25

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

## 5.0.0-beta.24

### Minor Changes

- 0512640: Add reusable typed input and textarea controls for standalone forms and dialog boxes, with shared server-side validation and an RPGJS Studio block that stores the submitted value.

### Patch Changes

- ccb9495: Fix TypeScript declaration errors across the package build, align multi-target declaration exports, complete movement API overloads, and make package and root builds fail when declaration generation reports a type error.
- Updated dependencies [ccb9495]
  - @rpgjs/physic@5.0.2-beta.0

## 5.0.0-beta.23

### Patch Changes

- be412cf: Let Studio event-touch pressure plates overlap pushed events without physical separation, wait until ground sensors are mostly covered before firing, clean up touch tracking when collisions exit after z changes, and clamp route overshoot frames that could make pushed events jitter.

## 5.0.0-beta.22

### Patch Changes

- e7d8d13: Hydrate Studio event hitboxes from the API initially, apply synchronized hitbox object payloads to client physics bodies, publish runtime Studio hitbox changes through the synced event collection instead of a separate setHitbox websocket path, and keep standalone map transfers on the restored room so transferred player positions and hitboxes are preserved in sample-dev.

## 5.0.0-beta.20

### Patch Changes

- Release the next RPGJS beta while keeping the physics package unchanged.

## 5.0.0-beta.19

### Patch Changes

- Release the next RPGJS beta while keeping the physics package unchanged.

## 5.0.0-beta.16

### Patch Changes

- Release the next RPGJS beta while keeping the physics package on its stable release line.

## 5.0.0-beta.15

### Patch Changes

- Release the next RPGJS beta with terrain rendering performance improvements and a unified server tick loop.

## 5.0.0-beta.14

### Patch Changes

- c96b31a: Add generic event touch hooks, shared map variables, and automatic variable change synchronization.

## 5.0.0-beta.13

### Patch Changes

- Release the next RPGJS beta with client interactions, i18n support, movement and physics improvements, Studio fixes, action battle updates, playground migration, and related runtime documentation.
- Updated dependencies
  - @rpgjs/physic@5.0.1-beta.0

## 5.0.0-beta.12

### Patch Changes

- Prepare beta.12 with action battle AI, area queries, client visuals, event component resolvers, projectile handling, and related Vite/runtime updates.

## 5.0.0-beta.11

### Patch Changes

- Add shared action input definitions and module metadata updates used by projectile and interaction flows.

## 5.0.0-beta.10

### Patch Changes

- Prepare beta.10 release.

## 5.0.0-beta.9

### Major Changes

- c456d25: beta.9

## 5.0.0-beta.8

### Major Changes

- 35e7fa4: beta.8
