# @rpgjs/common

## 5.2.0

### Minor Changes

- 7125c23: Add emotion bubbles: `player.showEmotionBubble("like")` (also on events) shows an icon above the character that follows it, with a bounce pop-in and pop-out. The icon sheet is sent as animation params and defaults to a sheet bundled with the client.
- 5e1b68c: Add generic projectile trajectories and behaviors. `trajectory.type` now accepts `arc` (a lob with a height) and `return` (out and back to the launcher), and `defineTrajectory()` registers custom paths shared by the server simulation and the client renderer. Projectiles can fly through targets (`pierce`), bounce, return or stick on walls (`wall`), collide only with walls or nothing (`collide`), and stay visible where they end (`linger`), with per-projectile `onHit`, `onWall`, `onLand` and `onEnd` hooks. Components receive `z` and `phase`. Any event can react to a hit with `onProjectileHit` and reply `stop`, `pass` or `stick`; players and modules get the same hook. Projectiles fly over loot pickups.

  Fixes a physics raycast that returned `NaN` points for rays parallel to a box edge.

- d6040a3: Add world loot. `event.dropLoot()` and `map.dropLoot()` pop gold (split into coins) and items as pickups that arc out, bounce, and are collected by magnet, by touch or with the action key. Options cover owned loot (scenario events), magnet radius per player, lifetime, `canCollect` and `onCollect`. Items can declare a `loot` config (`visual`, `color`, `sound`, `rarity`, `use`), and the `loot` client hook registers custom pickup components, default sounds and a collect text.

  Action Battle enemies pop their rewards as loot with `rewards.drop`, after the impact freeze. `defineActionBattleEnemy()` now accepts `graphic` and declarative `stats`, applied by `createActionEnemy()`.

### Patch Changes

- Updated dependencies [5e1b68c]
  - @rpgjs/physic@5.1.0

## 5.1.1

### Patch Changes

- 3dba915: The collisions of a Studio map can follow its placed elements while it runs. `@rpgjs/common` gets `map.replaceStaticHitboxes(match, hitboxes)`, which replaces the static hitboxes whose id matches, whether they came with the map data or from a streamed chunk. `@rpgjs/studio` gets `rebuildElementCollisions({ low })` in the context of a map extension, which rebuilds the hitboxes of the placed elements on the client map and tells the server, and `createStudioElementCollisionsServer({ authorize })` (from `@rpgjs/studio/server`), the server module that applies it for the players it allows, on a standalone or an online (MMORPG) server.
- Updated dependencies [aa0fa28]
  - @rpgjs/physic@5.0.4

## 5.1.0

### Minor Changes

- fcf625e: Weather supports every CanvasEngine effect and preset, and custom weather components.

  - `WeatherState.preset` is forwarded to CanvasEngine's `<Weather>`, `effect` is optional when a preset gives it, and every param is forwarded as it is. `map.setWeather()` and `patchWeather()` accept a preset without an effect, and a patch with a new preset or effect replaces the previous one.
  - `WeatherEffect` accepts the CanvasEngine effects (`rays`, `embers`, `ash`, `leaves`, `petals`, `fireflies`, `spores`, `sand`) and custom ids; `WeatherParams` is open. `@rpgjs/common` exports the catalog (`WEATHER_EFFECTS`, `WEATHER_PRESET_EFFECTS`, `WEATHER_PRESET_NAMES`, `getWeatherPresetEffect()`, `resolveWeatherEffect()`) without importing the renderer.
  - New `weathers: [{ id, component }]` client module option: when `effect` is a registered id, the scene renders that component in the weather layer, and a registered id replaces a built-in effect of the same name. An unknown effect or preset is reported once and renders nothing.

### Patch Changes

- 3d240d7: Add a day night cycle based on the `DayNightCycle` preset of CanvasEngine. Maps enable it with `lighting.dayNight`, and light spots get `halo` and `schedule` (hours they are on). With the Time Manager, `lighting: { dayNight: true }` drives the scene from the synchronized server hour; `state.hourFloat` and `state.phase` expose the hour with decimals and the phase of the day.

  Time Manager fixes: the lighting phases are now merged into the lighting of the map instead of replacing it (light spots were lost), and the client projects the time from the clock of the server so a client clock that is off no longer shifts the displayed hour.

  The Time Manager lighting accepts per map overrides (`lighting.maps`, `false` to leave a map untouched) and a map can opt out with `lighting.dayNight.enabled: false`. A new `onPhaseChange` hook fires with `onLightingPhaseChange`, the client warns when the server drives the cycle with the Time Manager and the client module is missing, and the docs state the unit of `scale` (game minutes per real minute).

- 9f92e2d: Fix the walk / stand flicker of a character that is not really moving (an NPC pushing against an obstacle): the movement animation now follows a movement only once it lasts 120 ms.
- 8abce20: An event set to `through` and placed on a collision (a seller behind a counter) stays where it was placed and no longer jumps. The collision filter only let `through` events cross other characters: walls and map hitboxes still pushed the event out (5 px at a time) before its position was put back, at every physics step. A `through` event now ignores them too (players are unchanged), and the Studio init applies `through` before it teleports the event to its position.
- 6a924a3: Add a shared `withTimeManager()` module that synchronizes authoritative map time snapshots, exposes server and client time managers, supports calendars and pause/scale controls, and can optionally drive map lighting and weighted weather ambiences without adding new public methods to `RpgMap`.

  The time manager now also exposes map-aware environment hooks for plugin-level rules and event-level reactions when time, day, lighting phase, or weather ambience changes.

- acf93b3: With Action Battle, the action key talks to an NPC (or uses a chest) instead of attacking. Events with an `onAction` hook are now synchronized as `interactive` (enemies with a `BattleAi` are not), `map.getInteractableObjectIds()` lists what is in front of a character, and the `onInput` hooks receive the action with `interactedWithEvent` when an interactive event handled it. The client no longer plays its predicted attack when it faces an interactive event.
- 7b2e8d6: Lighting shadows are now opt-in: sprites, elements and terrain only cast a shadow when `lighting.shadows.enabled` is `true`. An active sun or a light spot no longer turns shadows on by itself (it put a harsh shadow on every character and made walking NPCs flicker).
- 831d23a: Add a clock on screen for the Time Manager: `withTimeManager({ hud: true })` (or `hud: { position, size, fastScale }`) draws a pill with the day and the hour, and a round medallion whose sky, sun, moon and stars follow the hour of the server, with a badge when the time is paused or fast. `@rpgjs/ui-css` gets the `rpg-ui-clock` styles and Storybook stories.

## 5.0.0

### Minor Changes

- decf73e: Add a server-authoritative Actor selection API, runtime Actor switching that preserves acquired progression, a responsive cinematic CanvasEngine character selector, resolved Actor and Class object inputs, class skill progression for CMS-backed data, RPGJS Studio new-game Actor selection settings, character-select/change-class event blocks, and a native query-area block with per-target child execution.
- b74236b: Add server-authoritative custom gameplay rooms with registered room paths,
  session-preserving player transfers, synchronized client room state, and
  CanvasEngine scene adapters that run independently of maps and map physics.
  Room providers also accept concrete `RpgGameplayRoom` subclasses with their
  typed constructor context, so strict TypeScript applications can register them.
  Returning from a custom room now waits for a fresh map-stream packet before
  remounting the map component and keeps the room scene visible until that data
  is ready. Map components are also gated on non-null render data, preventing
  stale or incomplete values from reaching CanvasEngine presets.
- 041d5ee: Add a persistent server-authoritative, type-extensible hotbar for skills, items, and custom gameplay entries. The hotbar now supports a dynamic 1–10 slot capacity, retained locked-slot assignments, unlock hints, a persistent active slot, automatic refresh after level/class/inventory/map changes, direct keyboard shortcuts, a radial gamepad selector, LT/RT slot cycling with X activation, mobile centering, cooldown/cost/quantity presentation, and serialized `instant`, `select`, or `target` activation handlers.

  Replace Action Battle's dedicated `ui.actionBar` and component with the generic `ui.hotbar`. Action Battle skills enrich generic entries with targeting, cooldown, projectile, sound, animation, and visual metadata while their authoritative execution continues through native skill and item hooks. This is an intentional breaking configuration and export cleanup.

  Keep direct 1–0 Zelda-style menu assignment, display unavailable slots with their unlock condition in the root-level assignment picker, execute Studio skill workflows through the native `onUse` hook, make instant skills soft-target without a confirmation step, preserve skill impact media through AI damage feedback, and add translated Studio presentation fields, visual area targeting, phase-specific CanvasEngine cast/trail/impact presets, a default projectile renderer compatible with Studio skill records, and robust object-signal hydration for class and hotbar sync payloads. Upgrade to `@signe/sync` 3.1.1 so object-signal hydration uses the upstream fix without a local package patch.

  Expose a complete set of `--rpg-hotbar-*` CSS variables, bridge them through
  `@rpgjs/ui-css`, document the public client and server APIs with generated
  JSDoc references, and add a farm-themed playground showing mixed item and skill
  slots, menu assignment, and the persistent hotbar show/hide lifecycle.

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

- 0512640: Add reusable typed input and textarea controls for standalone forms and dialog boxes, with shared server-side validation and an RPGJS Studio block that stores the submitted value.

### Patch Changes

- b6ab003: Establish `defineModule()` as the canonical runtime module authoring API, export it from the client and server packages, keep `createModule()` for advanced provider composition, and align runtime-specific module installation documentation and examples.
- ccb9495: Fix TypeScript declaration errors across the package build, align multi-target declaration exports, complete movement API overloads, and make package and root builds fail when declaration generation reports a type error.
- e7d8d13: Hydrate Studio event hitboxes from the API initially, apply synchronized hitbox object payloads to client physics bodies, publish runtime Studio hitbox changes through the synced event collection instead of a separate setHitbox websocket path, and keep standalone map transfers on the restored room so transferred player positions and hitboxes are preserved in sample-dev.
- c69f516: Add `map.findSpawnPosition()` (#367): a deterministic search for the closest collision-free position of a character hitbox near a preferred point. It honors map bounds, map hitboxes and their `z` range, static shapes and blocking events, requires room to move by default, and returns `null` instead of placing a character inside a collider.
- e892732: Keep the camera attached when MMORPG streaming refreshes Tiled layers and synchronize instant following with the rendered character position so the viewport cannot trail by one frame. Stabilize predicted movement by publishing finalized input batches only after their client physics step, applying every input from the same client tick in one authoritative server step, capturing the matching acknowledged position, ignoring delayed acknowledgements whose prediction history expired, routing local-player snapshots through prediction instead of applying them directly, and sharing the same movement idle window on both peers.
- 00ac672: Prevent npm releases from containing unresolved `workspace:` dependency protocols, and publish release candidates directly under the npm `latest` tag.
- 50611c7: Keep combat recoil authoritative across RPG and MMORPG runtimes. Prevent velocity accumulation, premature cancellation by idle or locked input, and replay of pre-impact positions. Synchronize the transient recoil phase, smooth its presentation, and release completed attack locks without restarting locomotion during an impact.
- 15ae51e: Publish release candidates under the npm `latest` tag so fresh RPGJS projects install the current release.
- 98a30f0: Publish release candidates under npm's `latest` tag while retaining the repository's prerelease mode.
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

- 85aea0c: Restore authoritative player onMove hooks and dispatch onDisconnected from lobby, map, and gameplay rooms. Do not report successful room transfers as disconnections or dispatch duplicate disconnection hooks for the same connection.
- 66c0d77: Add game-catalogue language selection with browser negotiation, project-scoped persistence, reactive client labels and validated per-player connection/action synchronization. Preserve the current language when loading saves.

  Stabilize dialogue heights across desktop, portrait and landscape layouts. Measure rich-text pagination against available space, retain reading progress on resize, reserve scrollable choice/input space and add a touch-friendly continuation triangle with reduced-motion support.

- e5ad24a: Establish the stable RPGJS-owned boundary for reactive gameplay properties,
  dependency-injection providers, Node room storage, and Cloudflare room hosting.
  Remove accidental Signe re-exports from the client and server roots, keep
  direct Signe imports as an explicitly advanced plugin path, and protect every
  published TypeScript entry with declaration reachability snapshots in CI.
  Keep provider creation strategies mutually exclusive, support asynchronous
  provider factories, and preserve strict member checking on the server engine.
  Enforce these public contracts in CI, test the RPGJS-owned Node storage
  lifecycle, and document complete stable migration examples.
- be412cf: Let Studio event-touch pressure plates overlap pushed events without physical separation, wait until ground sensors are mostly covered before firing, clean up touch tracking when collisions exit after z changes, and clamp route overshoot frames that could make pushed events jitter.
- 0dbe078: Make Tiled tile collisions depend on the character `z`, as in RPGJS v4 (#370). Collision tiles are generated for every Tiled level (layer `z` + tile `z`). A tile on level `n` only blocks characters whose `z` is in `[n * zTileHeight, (n + 1) * zTileHeight)`, so `player.z.set(map.zTileHeight)` lets a player walk over level `0` collisions such as water. Static map hitboxes accept an optional `z`/`zHeight` range, and hitboxes without `z` still block every height.
- Updated dependencies [ccb9495]
  - @rpgjs/physic@5.0.3

## 5.0.0-rc.6

### Patch Changes

- c69f516: Add `map.findSpawnPosition()` (#367): a deterministic search for the closest collision-free position of a character hitbox near a preferred point. It honors map bounds, map hitboxes and their `z` range, static shapes and blocking events, requires room to move by default, and returns `null` instead of placing a character inside a collider.
- 0dbe078: Make Tiled tile collisions depend on the character `z`, as in RPGJS v4 (#370). Collision tiles are generated for every Tiled level (layer `z` + tile `z`). A tile on level `n` only blocks characters whose `z` is in `[n * zTileHeight, (n + 1) * zTileHeight)`, so `player.z.set(map.zTileHeight)` lets a player walk over level `0` collisions such as water. Static map hitboxes accept an optional `z`/`zHeight` range, and hitboxes without `z` still block every height.

## 5.0.0-rc.5

### Patch Changes

- d88267a: Keep combat recoil authoritative across RPG and MMORPG runtimes. Prevent velocity accumulation, premature cancellation by idle or locked input, and replay of pre-impact positions. Synchronize the transient recoil phase, smooth its presentation, and release completed attack locks without restarting locomotion during an impact.

## 5.0.0-rc.4

### Patch Changes

- Publish release candidates under npm's `latest` tag while retaining the repository's prerelease mode.

## 5.0.0-rc.3

### Patch Changes

- Publish release candidates under the npm `latest` tag so fresh RPGJS projects install the current release.

## 5.0.0-rc.2

### Patch Changes

- Prevent npm releases from containing unresolved `workspace:` dependency protocols.

## 5.0.0-rc.32

### Patch Changes

- 66c0d77: Add game-catalogue language selection with browser negotiation, project-scoped persistence, reactive client labels and validated per-player connection/action synchronization. Preserve the current language when loading saves.

  Stabilize dialogue heights across desktop, portrait and landscape layouts. Measure rich-text pagination against available space, retain reading progress on resize, reserve scrollable choice/input space and add a touch-friendly continuation triangle with reduced-motion support.

## 5.0.0-beta.31

### Minor Changes

- b74236b: Add server-authoritative custom gameplay rooms with registered room paths,
  session-preserving player transfers, synchronized client room state, and
  CanvasEngine scene adapters that run independently of maps and map physics.
  Room providers also accept concrete `RpgGameplayRoom` subclasses with their
  typed constructor context, so strict TypeScript applications can register them.
  Returning from a custom room now waits for a fresh map-stream packet before
  remounting the map component and keeps the room scene visible until that data
  is ready. Map components are also gated on non-null render data, preventing
  stale or incomplete values from reaching CanvasEngine presets.

### Patch Changes

- 85aea0c: Restore authoritative player onMove hooks and dispatch onDisconnected from lobby, map, and gameplay rooms. Do not report successful room transfers as disconnections or dispatch duplicate disconnection hooks for the same connection.

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
