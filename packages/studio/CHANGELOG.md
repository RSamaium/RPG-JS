# @rpgjs/studio

## 5.3.0

### Minor Changes

- 353eb32: New startup flow `{ projectId, flow: "new-game", startMapId? }` for `provideStudioGame({ resolveStartup })`. It keeps the framework-owned new-game flow without the title screen: the character selection first (when the project enabled `menus.characterSelect`), then the actor, the default stats and the start map, exactly as after "Start" on the title screen. A shared MMORPG runtime can now send a player who has a save straight to their map with `direct`, and a new player to the character selection with `new-game`. Set `displayTitleScreen: false` in the client options as well so the title is not drawn.
- 32312a3: The game loads the client files of the plugins of a Studio project, before the engine starts. A plugin is `.ce` components (each one a GUI named `<pluginId>_<file>`) and `.js` modules (`index.js` default-exports a client module of RPGJS); a file imports the runtime of CanvasEngine, the client API (`defineModule`, `hoverPopover`…) and the other files of its plugin through `host.require`. `loadStudioPluginClientModules(projectId)` gives the modules to `provideClientModules`; `StudioPlugin` has an optional `client` list.
- 0400b58: The game applies the theme of the project (`project.theme`: `{ id, base, css }`): the boundary `data-rpg-theme` and the class of its built-in base (`rpg-ui-theme-default` or `-pixel`) on `#rpg`, and its css in one `<style>`. One theme applies at a time; a project with none keeps the default look. `applyStudioTheme` is exported.
- ab20ff9: New `published` runtime mode for `provideStudioGame` (and `configureStudioGameRuntime`): the game reads the bundle of a published snapshot (`bundleBasePath`, a path or the complete URL such as `<api>/published/<projectId>`), keeps its project id, and resolves the events of the maps from the `events.json` of the bundle whatever the project id. A page opened with `?editor` or `?preview` still reads the draft online, with an optional preview token sent in the `x-studio-preview-token` header (`previewToken`, or `?preview=<token>`, kept for the tab and taken off the address bar). `GameDataProvider.getPlugins(projectId?)` reads `plugins.json` of a bundle or `/game/plugins` of the API. With `provideStudioGame({ scripts })` (the `ScriptService` of `@rpgjs/script`) the plugins are installed when the server starts (`<pluginId>/<scriptName>`) and kept in step with the data: read again, replaced or uninstalled when the data of the project is invalidated. `installPlugins` hands the same list to another interpreter. In an MMORPG the plugins come with the published version (`plugins` of the map update): they are installed or replaced in every room together with its maps, and a room that restarts reads the version it runs.

### Patch Changes

- ca75784: Follow-ups of the review of the map builder branch.

  - `keyValueMapStore` keeps its log in memory after the first read instead of reading the storage on every appended change.
  - Colliders are resynced after an `element.data` patch.
  - Studio: a failed import of the map builder layers is no longer cached, the cell size of a v2 map is a named constant, and the docs of the map extension context are on the right methods.

- c8457f2: Temporary, opt-in link with `@rpgjs/map-builder` (experimental). With `mapBuilderRenderer: true` in the global configuration of the client, the map elements that the map builder can draw (plain sprites: no shadow, light, liquid submersion or drawing rule) go through it; the others stay on the Studio renderer. Off by default, and nothing is loaded when it is off. Also keeps spec files out of the declaration build, which failed since the reference snapshots spec was added.
- 4d3d3d1: A Studio map extension can teach the map an element set it was not loaded with: `context.addElementTileset(tileset)` makes the elements of a set that was added while editing resolvable, drawn and solid like those of the sets the map came with, without loading the map again.
- e73e238: With `mapBuilderRenderer`, the elements drawn by the map builder in the ground and high layers are now one container per element carrying its sort key, so they are sorted by depth together with the elements the Studio renderer keeps, instead of all being drawn above them.
- 86cb9d4: `@rpgjs/studio` gets one extension point, `registerStudioMapExtension`: a function called each time a Studio map is loaded, with the engine, the id and size of the map, the placed elements as stored, the function that resolves one of them to what the runtime draws, and `updateData` to give the scene new data. Tools, overlays or an editor plug into it; the runtime knows nothing of what goes through. `@rpgjs/map-builder` gets `@rpgjs/map-builder/embed` (a game embedded in an iframe lets another page join its map as a trusted session, drive its tools and pause it) and a `draw: false` option for `createMapView`, for a host that draws the map itself and only wants the selection and the tools.

  The editor channels also carry named commands (`frame.command("copy", args)`, registered by the game with `commands`) and values the game keeps for the Studio (`host.publish(key, value)`, `frame.onState(key, listener)`).

  The extension context also gives `tilesetImage(tilesetId)`, the address of the picture of an element tileset, for an overlay that shows the element about to be placed, `readData()`, the data the scene shows now, and `resolveAsset(fileName)`, the address a stored asset is served from, and `normalizeMorphology(layer)`, the holes and walls the runtime draws for a stored terrain morphology layer.

- 3dba915: The collisions of a Studio map can follow its placed elements while it runs. `@rpgjs/common` gets `map.replaceStaticHitboxes(match, hitboxes)`, which replaces the static hitboxes whose id matches, whether they came with the map data or from a streamed chunk. `@rpgjs/studio` gets `rebuildElementCollisions({ low })` in the context of a map extension, which rebuilds the hitboxes of the placed elements on the client map and tells the server, and `createStudioElementCollisionsServer({ authorize })` (from `@rpgjs/studio/server`), the server module that applies it for the players it allows, on a standalone or an online (MMORPG) server.
- 1f0f84a: A Studio map extension can hide the events the game runs: `updateData({ hideEvents: true })` stops drawing them (the characters of the players are still drawn) and `false` draws them again. A map editor uses it to show the events of the map as its own markers while the map is edited.

  `@rpgjs/studio/client` also gives `resolveStudioEventDisplay({ media, frame, hitbox })`: how big an event is on the map as the game runs it (the size its character is drawn at, and its hitbox once a generated character has scaled it), for a map editor that draws events at the size the player sees.

- 3dba915: A Studio map can be drawn with some of its layers see-through: `updateData({ layerOpacity: { terrain: 0.4, elementsLow: 0.6 } })` (from `registerStudioMapExtension`) sets the opacity, from 0 to 1, of the `terrain`, `elementsAlwaysLow`, `elementsLow` and `elementsHigh` layers. A layer that is not named stays opaque, and characters and events are never affected.
- 4de4837: Choosing a hero in the character selection of an MMORPG no longer leaves the player on a black screen. The player is still in the lobby at that moment, and `setActor` looks the class and the skills of the actor up in the database of its room, which only received the Studio records once the player joined a map (`The ID=<skill> data is not found in the database`, then the transfer to the start map never happened). The Studio database is now registered in the room of the player before `setActor`.
- 1f0f84a: A map editor in the page can change the events the game runs without loading the map again. The server map gets `placeStudioEvent(record, { x, y, runtimeId })` (puts an event of the project on the map as the load does: media resolved, workflows and hitbox of the project, so an enemy attacks and a character answers), `moveStudioEvent(runtimeId, x, y)`, `removeStudioEvent(runtimeId)` and `listStudioEvents()`. Positions are those the map stores; the game applies the map scale.

  A map can give a size to one placement of an event: `scale` (multiplies its character and its hitbox) and `hitbox` (`{ width, height }`, instead of the hitbox of the event). The runtime applies them when it makes the event, `resolveStudioEventDisplay` takes a `scale`, and `placeStudioEvent` takes both. The graphic scale of an event no longer reads its position (`x`, `y`) as a scale.

- 7dd8403: Drawing a terrain chunk again no longer pays for the whole liquid hole each time. The edges of a hole's surface (its contact band, inner transitions and meniscus) are made once per surface instead of once per chunk, and the masks and surfaces of a morphology feature are kept from one render to the next, since a feature that changed is another object. On a map with a large water hole this takes a chunk from about 480 ms to about 110 ms after the first one, and the load of the map takes about half the time. `setStudioTerrainChunkSize(size)` sets the chunk size of the terrain renderers created afterwards, for an editor that wants smaller chunks.

  When only some chunks are drawn again (a stroke touched them), the masks and surfaces of the relief are made for those chunks and their surroundings instead of the whole feature, so redrawing after an erase follows the size of what was erased.

  The water level of a filled hole (its projected mask and the scan of its pixels) and the foam dots along the edge of a liquid surface are made once per render instead of once per chunk. Redrawing the chunks of a map with a large water hole takes about 60 ms per chunk, from about 270 ms.

  The size of a liquid hole (what its water level, insets and edge widths are made from) no longer depends on the part of it that was made when only some chunks are drawn again. A large water hole used to get a smaller, shifted shore after a brush stroke elsewhere, because the geometry was measured on the mask cut to the chunks being redrawn; it is now measured on the strokes of the whole feature.

  A stream update of the terrain renderer no longer loses chunks when the camera moves while it draws: the chunks it asked for and did not draw yet stay pending for the next call (and the ones in view are drawn first), the chunks in view that were never drawn are drawn by the next call, and the chunks shown are those of the view the camera has when the drawing ends, not of the one it had when it began.

  The terrain renderer draws once more, when the camera rests, the chunks of a stream update that were drawn while the camera moved, so a row of the map cannot stay out of date on screen.

  The terrain container of the Studio map has no width or height any more: Pixi scaled it so that the chunks drawn at that moment filled the map width, so the terrain was drawn larger than the map (and out of line with the elements) once the map data was updated while the camera had moved.

- e7095ad: With a deferred connection (`provideMmorpg({ deferConnection: true })`), Studio no longer draws the title screen over the sign-in screen at start: it waits for the connection, then shows the title. The client engine gets `isConnectionDeferred()` and `isConnected()` for this.
- dbfc241: The context of a Studio map extension gets `updateParams(patch)` and `resolveAudio(value)`. `updateParams({ scale: 2, backgroundMusic: "<url>" })` changes the params of the map the scene shows without loading it again: they go to the params the map is drawn from and, for `backgroundMusic` and `backgroundAmbientSound`, to where the client plays the music and the ambient sound from (`undefined` takes a key off, which stops the sound). `resolveAudio(value)` gives the address a sound of the map settings is played from. A map editor uses them to apply the map settings without a reload.
- Updated dependencies [84494ca]
  - @rpgjs/render-map2d@5.0.1

## 5.2.0

### Minor Changes

- ddc9fd5: Add a startup splash that shows at the first paint. A page declares `#rpg-splash` (the new `rpg-ui-splash` classes of `@rpgjs/ui-css`, pure HTML and CSS, so it keeps turning while the main thread is busy); the client fills its translated label, and `dismissStartupSplash()`, `setStartupSplashLabel()` and `hasStartupSplash()` are exported. Studio dismisses it when the first map is revealed or the title screen is shown, and shows its own loader without delay on the first map load.
- bf87927: Let a game add block executors with `provideStudioGame({ blockExecutors })` (applied by every Studio workflow), and run a Studio event or a skill phase from game code with `runStudioEvent(player, eventId, variables)` and `runStudioSkillTrigger(player, skillId, phase, options)`.
- 2197f72: Add `provideStudioGame({ enemyInteraction })` so a host chooses how an enemy event reacts: the real-time action battle (default), nothing, or a touch handler.
- 3911107: Let the scene data carry a `layerOpacity` (`terrain`, `elementsAlwaysLow`, `elementsLow`, `elementsHigh`, each from 0 to 1, default 1) so the map editor can dim layers without drawing the map again.
- 93fefe0: Paint the terrain chunks in a worker (on `OffscreenCanvas`) so a map with terrain no longer freezes the page while it loads. The chunks nearest to the middle of the screen are drawn first, and the page falls back to painting itself where workers are not available.
- 3288d2e: Paint the terrain walls (occlusion and shadow slices) in the terrain worker too, so building them no longer blocks the page while a map with walls loads.
- c1dd4a7: Draw the water animation of the terrain with a shader instead of 2D canvases redrawn on the CPU. Each region of water is one quad that shifts the surface in bands (refraction), adds the pale glow and is cut by the shape of the water; a frame only updates the phase, so the water moves on every frame and no longer costs a canvas redraw. Where no shader can be made, the water is drawn on the CPU as before, and the unseen wave lines (drawn with an alpha of 0) are no longer drawn.

### Patch Changes

- cd51839: Update CanvasEngine to 2.4.1.
- 9abf360: Load the media of a map with far fewer requests: the media a map, the heroes and the preload need are asked together (`GET /game/media?ids=`, by slices of 100), and so are the animations of the idle characters (`GET /game/animations?ids=`). A media the API already sent whole (the tilesets a map carries) is not asked again. A server without these routes is still served, one media at a time.
- 2fbd534: Route the remaining player-facing texts through the i18n service: stat labels and close buttons of the menu, the action-battle menu button, level-up, skill and reward notifications, and item error notifications. The server now ships default `en`/`fr` messages (`rpg.notification.*`, `rpg.error.*`) that games can override with `provideI18n()`.
- 703db76: Fix: the conditional branch on the player direction now reads the `direction` signal of the player, so it matches the direction the player is facing instead of never matching.
- 1cb8919: Read the pixels of a character spritesheet once, with a faster scan, and keep the result: loading a map with several characters no longer blocks the page for a second to measure them. The calibration is unchanged.
- 3f935d9: Ask the terrain worker for the next chunk while the page builds the sprite of the previous one, share one paint request per chunk between overlapping renders, and do not repaint a chunk already drawn for the same state.
- 62aa9c2: Answer simultaneous requests for the same map, project or media with one request, and give each caller its own copy. The client and the server of a standalone game no longer download the same media twice.
- dc603e8: Shorten the time before the first map is shown: the scene no longer asks the worker to paint the same terrain walls several times, only the hero's spritesheets are awaited before the map loads, and the other startup media (combat animations, actors, illustrations) load while the map loads, with the reveal waiting for them at most 800 ms.
- 238589f: Resolve the media and events of a map together instead of one round trip after the other, which shortens the map loading.
- e93ecd1: Ask for the database and the start map as soon as Studio starts, so their round trips overlap the project request instead of following it.
- 13707d4: Have the warmed terrain workers fetch and decode the terrain atlas as soon as the map data is known, so the first chunk no longer waits for its image.
- 0419221: Wait for the terrain walls (the mountains) before revealing a map, so they no longer pop in a few seconds after it, and make a terrain render wait for the chunks another render is already painting. A terrain worker request that is never answered now times out and falls back to painting on the page.
- 4bcce78: Share the answers of the API between the client and the server of a standalone page: a request is shared while it is on its way and, once the client has asked for it with `keepStudioApiAnswers()`, for ten seconds after its answer. The page no longer downloads the project, the database or a media twice. A server process keeps nothing after an answer.
- b47ef05: Do not start the game again when a connection only transfers the player into a map. Every reconnection to the map room used to send the player to the start map again, so the client loaded the map about eight times before the first one was shown.
- 0a53d94: Start the terrain workers when Studio starts, so they are booted by the time the first map needs them. An unused warmed worker is stopped after a minute.
- cae633c: Ask for the project, the database, the start map and the tilesets of that map when the Studio client module is created, long before the engine starts, instead of one round trip after the other once it has.
- ba85abe: Draw a terrain texture without `renderTileSize` at its size in the atlas instead of 48 px, so the game matches the map editor.

## 5.1.0

### Minor Changes

- ad3a1ad: Studio maps can use every CanvasEngine weather effect and preset: light rays, embers, ash, leaves, petals, fireflies, spores and sand, with their params (`colors`, `particleSize`, `haze`, `rayFan`, `rayColor`, `cloudOpacity`, ...). The runtime keeps the output of the former presets unchanged, and the map renderers forward the extra params to `<Weather>`.

### Patch Changes

- 32a6ae2: Studio characters are displayed 35% bigger by default (`STUDIO_CHARACTER_DISPLAY_BOOST`), to fit the size of the decor. The hitbox of an event with a generated character follows the same scale. Stand and walk are calibrated on the median pose of their frames, the other animations (attacks) on their first pose.
- 3d240d7: Add a day night cycle based on the `DayNightCycle` preset of CanvasEngine. Maps enable it with `lighting.dayNight`, and light spots get `halo` and `schedule` (hours they are on). With the Time Manager, `lighting: { dayNight: true }` drives the scene from the synchronized server hour; `state.hourFloat` and `state.phase` expose the hour with decimals and the phase of the day.

  Time Manager fixes: the lighting phases are now merged into the lighting of the map instead of replacing it (light spots were lost), and the client projects the time from the clock of the server so a client clock that is off no longer shifts the displayed hour.

  The Time Manager lighting accepts per map overrides (`lighting.maps`, `false` to leave a map untouched) and a map can opt out with `lighting.dayNight.enabled: false`. A new `onPhaseChange` hook fires with `onLightingPhaseChange`, the client warns when the server drives the cycle with the Time Manager and the client module is missing, and the docs state the unit of `scale` (game minutes per real minute).

- 8abce20: An event set to `through` and placed on a collision (a seller behind a counter) stays where it was placed and no longer jumps. The collision filter only let `through` events cross other characters: walls and map hitboxes still pushed the event out (5 px at a time) before its position was put back, at every physics step. A `through` event now ignores them too (players are unchanged), and the Studio init applies `through` before it teleports the event to its position.
- 1f2f2aa: Fix the battle music of the project not playing when an enemy is approached. An enemy without its own battle music sent an empty track that hid the project one (Studio now drops empty values and Action Battle falls back to the project music on a blank track). A threat re-sent by a re-created enemy AI no longer piles up, and `engine.music.enter()` ignores a call for the track it already targets instead of cancelling its own transition on every tick (which also created a duplicate sound each time).
- 9f92e2d: Studio events with a generated character: the hitbox saved in the map (in pixels of the source image) now follows the scale the character is displayed at, instead of staying as big as its cell.

  Studio random movement waits for the frequency of the event between two moves, at map load as well as after an interaction: the `frequencyRatio: 1` override is removed, and `replayRoutes()` keeps the options (`onStuck`, `frequencyRatio`) of the infinite route it replays. The event now starts its route from its final position, after the teleport of its initialization.

- 1f2f2aa: Fix an enemy that came back invisible after being defeated: a map reload (`updateMap`, run about twenty times when a Studio map loads) replaces the events, but the Action Battle AI of each replaced event kept running, unseen, and kept attacking and holding the battle music. The AI now stops as soon as its event is no longer the one registered on the map.

  Fix "Start" doing nothing after Game Over → Title screen: the title screen opened over the map, where nothing handles "Start". Studio now handles the title entries there: "Start" resets the hero, selects the actor and restarts on the start map, "Load" opens the load menu.

- 8558980: Studio blocks that were never opened in the editor now behave with their schema defaults. The "Show Notification" block defaults to the `info` type and a 2000 ms duration (the engine defaults), empty optional fields (`null` or an empty value) are ignored when running it, and the "Wait" block waits 1 second when it has no duration. `applyBlockSchemaDefaults()` is exported to fill a block's missing fields with the defaults of its schema.
- dfe56ed: Studio elements with a sloped polygon hitbox, such as a mountain, are now drawn in 8 px columns that each sort on the bottom edge of the hitbox at their own x, so a character standing in front of the slope is no longer hidden behind it. A concave hitbox, whose columns cross several ridges, is also cut into one slice per ridge, each sorted on its own base. Flat hitboxes (trees, walls) keep a single sort key. A new `sortMode` on an element (`"auto"` by default, `"hitbox"` to keep the single key, `"slope"` to force the columns) overrides the automatic 16 px slope threshold.
- 1a7befc: Align the animations of a Studio character on its feet. Each direction of an animation is now calibrated on the median pose of its frames (height and feet position) instead of its first image, and a frame can carry a `footAnchor` that the client puts on the bottom center of the hitbox. Switching between stand and walk no longer shifts or resizes the character. A warning is logged when the pixels of a sheet cannot be read.
- 8558980: A Studio event keeps its current page while its action/touch workflow is running. A Self Switch set in the middle of the workflow (for example opening a chest) is still saved immediately, but the event only switches to the new page once the workflow has ended, so the remaining blocks (text, gold…) no longer run while the event already shows another page.
- 4c51c73: Fix Studio maps with a `scale`: only the map is scaled. The characters/events layer is no longer scaled twice, and the physical world (map size, element/polygon/terrain hitboxes) is expressed in scaled pixels, like the start position and the events, so the camera, the hero and the collisions line up with the scaled map.
- e908cae: Fix #379: in map streaming (`RPG_TYPE=mmorpg`), a Studio map's `backgroundMusic` and `backgroundAmbientSound` are now resolved to the assets URL (like `loadMap` does), instead of being requested on the game origin. Absolute URLs (`http(s)://`, `/`, `data:`, `blob:`) are left unchanged and media objects (`{ fileName }`) are supported.
- 1f2f2aa: The hitbox of a Studio hero (actor) with a generated character now follows the display scale of the character, like the hitbox of an event, instead of being as big as the cell of its image (it was 160x105 next to a 32x32 enemy). The default attack zones of Action Battle are anchored on the real hitbox of the attacker (centered on its body, pushed out of its edge in the facing direction) instead of assuming a 32x32 body.

## 5.0.0

### Minor Changes

- decf73e: Add a server-authoritative Actor selection API, runtime Actor switching that preserves acquired progression, a responsive cinematic CanvasEngine character selector, resolved Actor and Class object inputs, class skill progression for CMS-backed data, RPGJS Studio new-game Actor selection settings, character-select/change-class event blocks, and a native query-area block with per-target child execution.
- 1bcd9fc: Keep `playSound()` as the single canonical sound API while adding persisted mixer channels, spatial playback, native interface cues, coordinated map and battle music, and Studio audio configuration, so framework users do not have to choose between overlapping concepts.
- e48f8f0: Add opt-in extraction of embedded element ground shadows into a texture cache
  and dedicated layer below Studio characters in standalone and streamed MMORPG
  maps. Preserve anti-aliased object contours and expose the tileset-element
  configuration through the Studio runtime schema.
- 041d5ee: Add a persistent server-authoritative, type-extensible hotbar for skills, items, and custom gameplay entries. The hotbar now supports a dynamic 1–10 slot capacity, retained locked-slot assignments, unlock hints, a persistent active slot, automatic refresh after level/class/inventory/map changes, direct keyboard shortcuts, a radial gamepad selector, LT/RT slot cycling with X activation, mobile centering, cooldown/cost/quantity presentation, and serialized `instant`, `select`, or `target` activation handlers.

  Replace Action Battle's dedicated `ui.actionBar` and component with the generic `ui.hotbar`. Action Battle skills enrich generic entries with targeting, cooldown, projectile, sound, animation, and visual metadata while their authoritative execution continues through native skill and item hooks. This is an intentional breaking configuration and export cleanup.

  Keep direct 1–0 Zelda-style menu assignment, display unavailable slots with their unlock condition in the root-level assignment picker, execute Studio skill workflows through the native `onUse` hook, make instant skills soft-target without a confirmation step, preserve skill impact media through AI damage feedback, and add translated Studio presentation fields, visual area targeting, phase-specific CanvasEngine cast/trail/impact presets, a default projectile renderer compatible with Studio skill records, and robust object-signal hydration for class and hotbar sync payloads. Upgrade to `@signe/sync` 3.1.1 so object-signal hydration uses the upstream fix without a local package patch.

  Expose a complete set of `--rpg-hotbar-*` CSS variables, bridge them through
  `@rpgjs/ui-css`, document the public client and server APIs with generated
  JSDoc references, and add a farm-themed playground showing mixed item and skill
  slots, menu assignment, and the persistent hotbar show/hide lifecycle.

- c849207: Add a post-acceptance player lifecycle context and a connection-scoped Studio MMORPG startup resolver with discriminated title/direct flows, single evaluation, URL project loading, and authoritative project/map validation.
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

- 8fcee7d: Use generated spritesheet lane metadata and frame timing when rendering character movement.
- fe6c2b9: Animate textured and color-filled terrain holes automatically, including subtle texture refraction driven by the Studio map water speed and intensity.
- a72a1e8: Support per-hole wave intensity, direction, and speed settings, and tint liquid wave highlights from each fill's local color or texture.
- 331787c: Deduplicate Studio project, map, database, and media reads within each runtime provider. Cache in-flight and resolved requests by resource identifier, keep project and map lookup keys distinct, and evict failed requests so later calls can retry.
- 8ef3f4a: Add type-aware Studio item fields and lifecycle workflows. Regular items expose
  consumable use hooks, while weapons and armors expose equipment modifiers and
  the native equip hook. Regular items can also display a configured spritesheet
  animation, play a personal sound, and display a built-in particle effect after
  successful use. The editor groups Item fields into dedicated layouts. Because
  the Item schema is conditional, it resolves the selected Item, Weapon, or Armor
  branch before distributing fields across editor tabs, avoiding duplicate
  generic property sections. Online Studio games refresh database records when a
  player joins a map, and item use resolves lifecycle hooks from the current map
  database so a removed use animation no longer survives in an inventory
  snapshot.

  Clarify the built-in hotbar model: it accepts learned skills and usable regular
  items, while weapons and armors remain browseable in Items and are managed from
  Equip. Studio now labels these choices as usable items, filters starting
  equipment selectors by slot type, and ignores invalid saved equipment without
  adding it to the player's inventory.

  The Studio Item editor now derives its tabs from the selected item type.
  Regular items expose Usage and Presentation, while weapons and armors expose
  Equipment, so conditional schemas no longer leave empty tabs visible.
  Custom fields now leave their schema description to the shared CMS field
  wrapper, preventing duplicate help text, and Item and Skill lifecycle actions
  are consistently presented as triggers in the editor.

  Creating a trigger now persists its parent Item or Skill first, keeps the
  editor on the newly created record, and immediately saves the trigger
  attachment. Failed attachments restore the previous form state instead of
  leaving an untracked trigger.

  The Studio Skill editor now presents its schema layouts as translated tabs,
  matching the Item editor while keeping Action Battle and its triggers together.
  Area size, presets, and individual area-mask edits now notify the Skill form,
  so the updated targeting area is saved and restored after reloading the editor.
  Translated Skill and Item media fields now render the same native media preview
  as icon fields, including image, spritesheet, and audio previews.
  The Studio sidebar now uses a supported panel icon for the GUI editor entry.

- d005fdd: Reduce Studio terrain CPU usage by coalescing terrain asset loading, lazily rasterizing non-streamed chunks around the viewport, reusing morphology masks and filtered overlays across chunks, and rendering cropped water animations at a smooth capped frame rate. Keep the existing map loader visible until the initial terrain viewport has been rasterized and presented.
- b6ab003: Establish `defineModule()` as the canonical runtime module authoring API, export it from the client and server packages, keep `createModule()` for advanced provider composition, and align runtime-specific module installation documentation and examples.
- 973878b: Update CanvasEngine to 2.3.0. The 2.3 compiler no longer injects `computed`, `h`, `cond` and `loop` into every component, so components now import the helpers their script uses. `rpgjs()` declares its `Plugin[]` return type.
- 1cae469: Update CanvasEngine to 2.4.0. Templates now read computed signals explicitly (`position().x` in the HP bar, light halo and dynamic bar components) and the action-battle projectile trail passes `loop={true}` to its `Fx`.
- e7b12ab: Add cinematic video playback through the existing GUI lifecycle, with aspect-preserving presentation, fades, accessible skip controls, autoplay recovery, temporary music attenuation, and error recovery. Register the Studio show_cinematic block and resolve its media through the game data provider without adding map-media associations.

  Support per-clip skip/music options, map video preloading and consecutive video playlists. Guard overlapping player event interactions and let gameplay release movement keys during cinematics.

  Skip immediately on click, tap or Escape, honoring non-skippable clips and ignoring key repeats and late responses from skipped clips.

- ccb9495: Fix TypeScript declaration errors across the package build, align multi-target declaration exports, complete movement API overloads, and make package and root builds fail when declaration generation reports a type error.
- f496a5a: Build hole and water collision borders from the final painted surface instead of every brush segment. Apply paint and erase operations in order, remove internal overlapping edges, simplify the resulting contours, and clip bridge openings precisely. This reduces collision bodies and loading work while keeping erased paths and islands walkable in standalone games and authoritative multiplayer maps.
- e7d8d13: Hydrate Studio event hitboxes from the API initially, apply synchronized hitbox object payloads to client physics bodies, publish runtime Studio hitbox changes through the synced event collection instead of a separate setHitbox websocket path, and keep standalone map transfers on the restored room so transferred player positions and hitboxes are preserved in sample-dev.
- 94cbdac: Move equipment details into a compact inspector beside the list, add a Status menu entry returning to the hero overview, and extend local key preferences to Action and Back with immediate menu/game updates and preserved action payloads.
- 94cbdac: Polish equipment attribute comparisons and expose Studio's Options menu with per-project movement key preferences, conflict validation, reset controls and existing channel-based audio sliders.
- e473d14: Keep Studio tileset elements at their source proportions when tileset metadata contains the dimensions of the complete atlas image.
- a5e6ff8: Reduce animated terrain water rendering cost by copying only the pixels covered by each refraction band instead of redrawing the full terrain chunk for every band. Configure the Studio playground with a large animated-water map for local performance testing.
- fd12af7: Make Adventure combat more responsive and readable with overlap-safe control locks, guard/parry/counter gameplay, soft targeting, coordinated enemy attack turns, Studio-driven combat animations, skill hit-rate handling, anchored impact feedback, configurable hit-stop, and enemy death effects.

  Let temporary attack spritesheets finish their visual follow-through after gameplay recovery instead of forcing the character back to `stand` mid-animation. Studio four-direction attack spritesheets now play in 350ms by default without changing locomotion speed, with an optional `attackDurationMs` media metadata override.

  Keep repeated Studio event placements as independent runtime entities with deterministic instance ids and separate hitboxes.

  Add configurable attack, skill, hit, hurt, and defeat sounds plus per-player dynamic combat music. Battle music crossfades against map BGM, restores it after a configurable grace period, keeps ambient audio intact, and selects enemy, map, or project tracks with stable boss-aware priority.

  Expose Studio combat-audio project/map fields and `createStudioActionBattleAudio()` / `createStudioActionBattlePreset()` helpers. Studio sound resolution no longer stops every currently playing sound.

- 00ac672: Prevent npm releases from containing unresolved `workspace:` dependency protocols, and publish release candidates directly under the npm `latest` tag.
- 171726f: Restore idle scale after linked animations and preload all character animation images before exposing spritesheets to the game. Apply the same preparation to media objects and media IDs.

  Normalize generated characters to a 128-pixel reference frame before applying their saved scale.

  Match Character Editor's visible-height normalization across idle and linked animations, even when their saved scales have not been proportionally adjusted.

  Apply the same parent normalization when combat plays a linked attack as a separate graphic.

- f254e58: Expose a `default` animation for Studio icons and facesets so RPGJS UI components can render them without rejecting spritesheet playback.
- 041d5ee: Initialize the RPGJS map weather runtime from weather saved in Studio map
  parameters so connected clients receive and render the configured effect.
- a5e6ff8: Use the native named map start position when spawning players in Studio games,
  avoiding asynchronous database refreshes moving a player away from the `(0, 0)`
  sentinel before the configured start position is applied.
- 0909491: Preserve weather WebSocket payloads through server reconciliation and render
  them as authoritative so runtime updates and `clearWeather()` replace weather
  initially configured in Studio map data.
- 995277f: Upgrade the RPGJS workspace and published package compatibility ranges to
  CanvasEngine 2.1, including its compiler, presets, testing, and Tiled
  integrations. Keep PixiJS on the CanvasEngine-supported 8.19 line and verify the
  existing client, server, sample, and playground builds against the new runtime.
- ecb31da: Scope Studio player initialization and starting database records to the joined
  map project so multi-project Workers do not leak global project configuration.
- 7da338c: Render only terrain chunks affected by consolidated Studio map stream updates.
- 0fa8fb9: Respect enemy attack phase and cooldown overrides, keep attack facing stable,
  preserve remote locomotion, and fit complete visual cycles to authoritative
  combat timings. Expose per-pattern enemy timing overrides in Studio.
- 94cbdac: Repair Studio hero initialization when a class skill is already learned, prefer canonical media references, and guard missing spritesheet identifiers. Refine the integrated status, inventory, equipment, skills, save and shop interfaces with theme-driven layouts, localized empty/unavailable states, safe icon fallbacks and window-local close buttons. Make the mobile hotbar scrollable instead of clipping its slots.
- e0bba29: Keep the legacy Action Battle-specific action bar available alongside the new
  persistent hotbar, including configured slot ordering, menu access, keyboard
  activation, and direct activation from its slots. Studio icon spritesheets now
  expose the default texture expected by GUI components.
- 016aa37: Fix Studio animation blocks to keep event erase animations attached to the sprite being removed.
- 6b8d872: Preserve switched actors, chosen classes and progression when restoring Studio players. Persist parameter curve bounds and Studio initialization state, rebuild derived parameters instead of loading over their runtime signal, restore actor presentation without granting starting inventory again, and normalize Studio media and hitbox records for character selection. Apply combat animation bindings in changeActor.
- 15ae51e: Publish release candidates under the npm `latest` tag so fresh RPGJS projects install the current release.
- e52b9be: Allow Studio games to start players immediately without requiring a title-screen interaction.
- b1a7ebc: Keep water surface refraction while removing graphical wave lines.
- 59c06c9: Match Studio terrain texture sampling by excluding atlas cell borders before repeating textures. Measure the HUD portrait frame so facesets fit reliably on first display and after resizing in standalone and multiplayer games.
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

- 11c68d1: Add a framework-agnostic CPU terrain renderer shared by RPGJS Studio editors and
  the game runtime, including typed RGBA region rendering and terrain presets.
- 8ce9856: Render Studio walls with `wallStyle: "rock"` as stratified rock faces with a rock rim and a floor contact shadow, as used by dug caves. Wall faces now match the Studio map editor: they are extruded straight, their sides come from the wall's own sides, and face parts over an opaque wall top are no longer drawn, which removes stray lines along cave and room sides.
- 602c360: Render the faces of Studio `wallStyle: "rock"` walls without `textureId` per pixel from the wall mask, as the Studio map editor does: faces lit at the top and darker at the foot, covering at most 55% of the opening below them, with a contact shadow on the floor. The new `rockTexture` wall param picks the procedural face texture: `masonry` (default, cut stone courses) or `natural` (irregular weathered rock).
- 4441d3f: Keep Studio map elements constrained to their repeat axis when a placed element only overrides one dimension, and render repeat/edge-repeat segments by tiling the repeated slice instead of scaling every segment across the resized axis.
- 1393b73: Keep top components such as enemy HP bars attached to scaled sprites when
  transparent frame bounds are still loading or cannot be scanned.

  Respect each enemy skill cooldown inside combos and choose varied special
  attacks that fit the current target distance.

  Let enemies choose among every learned skill, normal attacks, and contextual
  repositioning. Projectile and area skills now respect their targeting metadata,
  and optional structured AI logs explain each server-authoritative decision.

  Preload Studio skill impact and projectile media so enemy skills render their
  configured animation on the first use. Resolve reactive skill presentation
  and impact metadata before client transfer, consume their reactive SP and hit
  rate values, and play ranged skills as casts.

  Unwrap reactive skill combat values before RPGJS evaluates damage formulas, so
  enemy skills apply their configured power instead of resolving to zero damage.

  Remove the caster animation control from the Studio skill editor while keeping
  existing skill records compatible at runtime.

- eb4a3a7: Add reusable Studio string templates for nested player properties and persistent variables, and resolve them in player-visible block text.
- 3fb2765: Apply Studio media scale as a multiplier of the default RPGJS display scale, then combine it with event instance scale instead of overwriting it.
- 3b55a3f: Render legacy Studio terrain grids with the same soft-mask composition used by
  control-texture maps, so terrain such as grass and dirt keeps its editor fade in
  the running game.
- cff357d: Calibrate generated character animations per direction against idle, with a fixed visible ground anchor and scale across each timeline. Apply the same correction to separately played linked attacks while preserving the character's global scale and image preloading.
- e5ad24a: Establish the stable RPGJS-owned boundary for reactive gameplay properties,
  dependency-injection providers, Node room storage, and Cloudflare room hosting.
  Remove accidental Signe re-exports from the client and server roots, keep
  direct Signe imports as an explicitly advanced plugin path, and protect every
  published TypeScript entry with declaration reachability snapshots in CI.
  Keep provider creation strategies mutually exclusive, support asynchronous
  provider factories, and preserve strict member checking on the server engine.
  Enforce these public contracts in CI, test the RPGJS-owned Node storage
  lifecycle, and document complete stable migration examples.
- 85aea0c: Start immediately when displayTitleScreen is explicitly false, including when project metadata is unavailable or enables the title screen. Preserve project-driven startup when the option is omitted.
- 8ef3f4a: Allow hotbars to filter entry types dynamically, let Action Battle resolve
  visibility per player, apply RPGJS Studio project hotbar settings, expose a
  Studio event block for displaying or hiding the Hotbar, and honor the Studio
  Title Screen, HUD, and Main Menu bindings. The main menu now hides disallowed
  item or skill assignment actions, displays the item slot picker correctly, and
  clears the native assignment when the last consumable is used.
- 59c06c9: Synchronize resolved actor combat animations to clients, preserving actor
  overrides for predicted attacks and casts across map loads. Read synchronized
  animation references at playback time and retain project defaults only until
  authoritative actor presentation is available.

  Resolve the project main actor when character selection is disabled, so its
  attack and cast overrides take precedence over inherited project animations.

- be412cf: Let Studio event-touch pressure plates overlap pushed events without physical separation, wait until ground sensors are mostly covered before firing, clean up touch tracking when collisions exit after z changes, and clamp route overshoot frames that could make pushed events jitter.
- 8df5fee: Derive liquid contact colors from opaque pixels of the material's atlas region, with explicit fill-color fallback and no default blue or grey-white foam. Share palettes across Canvas and CPU renderers and honor border/foam settings.

  Add opt-in static-element `submersion: { depth: 0.2 }`, preserved in direct loads and streamed chunks. Tint the lower alpha silhouette only where it intersects the actual liquid surface, including fill levels and erasures, after optional ground-shadow extraction. Cache palettes, liquid masks and composed element pixels by terrain revision without changing collisions or server authority.

- 9673224: Allow trusted Studio map publishers to inject a server-owned data provider for
  project, map, media, and database reads without calling the public Studio API.
- 3d13f8c: Add composable boss phase helpers, delayed AI sequences, server action intents,
  movement and teleport conveniences, and a generic server-driven AI visual
  registry. Resolve animation callbacks into serializable visual packets so
  Studio combat media are honored without cloning functions across rooms.

  Add the Adventure combat preset with buffered player combos, authoritative
  charged attacks, dodge invulnerability, attack multipliers, stronger Impact
  visuals, enemy telegraphs, reuse of the existing RPGJS HUD and graphic-bound
  HP components, contextual animated damage typography, skill-specific FX,
  and optional mobile heavy-attack controls. `preset: "classic"` preserves the
  previous combat and UI defaults.

  Position transient component animations from numeric world coordinates and
  derive component bounds from visible pixels for generated Studio spritesheets,
  so telegraphs, damage popups, and HP bars stay anchored to scaled characters
  without including transparent frame padding.

- Updated dependencies [decf73e]
- Updated dependencies [b74236b]
- Updated dependencies [37a4fb0]
- Updated dependencies [8ef3f4a]
- Updated dependencies [b6ab003]
- Updated dependencies [973878b]
- Updated dependencies [1cae469]
- Updated dependencies [e7b12ab]
- Updated dependencies [ccb9495]
- Updated dependencies [e7d8d13]
- Updated dependencies [1028c17]
- Updated dependencies [777541a]
- Updated dependencies [1bcd9fc]
- Updated dependencies [a0710ce]
- Updated dependencies [94cbdac]
- Updated dependencies [59c06c9]
- Updated dependencies [4d53aa7]
- Updated dependencies [66c0d77]
- Updated dependencies [66c0d77]
- Updated dependencies [94cbdac]
- Updated dependencies [94cbdac]
- Updated dependencies [fd12af7]
- Updated dependencies [c69f516]
- Updated dependencies [f488e28]
- Updated dependencies [8ef3f4a]
- Updated dependencies [48fcd25]
- Updated dependencies [e892732]
- Updated dependencies [00ac672]
- Updated dependencies [dc6aed5]
- Updated dependencies [0909491]
- Updated dependencies [50611c7]
- Updated dependencies [995277f]
- Updated dependencies [1fb8040]
- Updated dependencies [041d5ee]
- Updated dependencies [0fa8fb9]
- Updated dependencies [995277f]
- Updated dependencies [59c06c9]
- Updated dependencies [94cbdac]
- Updated dependencies [e0bba29]
- Updated dependencies [7846969]
- Updated dependencies [6b8d872]
- Updated dependencies [13517b8]
- Updated dependencies [72d3e5d]
- Updated dependencies [15ae51e]
- Updated dependencies [e11f2ed]
- Updated dependencies [f624302]
- Updated dependencies [59c06c9]
- Updated dependencies [98a30f0]
- Updated dependencies [335b768]
- Updated dependencies [e0bba29]
- Updated dependencies [59c06c9]
- Updated dependencies [11c68d1]
- Updated dependencies [85aea0c]
- Updated dependencies [c849207]
- Updated dependencies [f6aa046]
- Updated dependencies [14f7cf9]
- Updated dependencies [1393b73]
- Updated dependencies [3fb2765]
- Updated dependencies [1a45ca5]
- Updated dependencies [327185b]
- Updated dependencies [fc86ec2]
- Updated dependencies [66c0d77]
- Updated dependencies [e5ad24a]
- Updated dependencies [a7f44ba]
- Updated dependencies [83fc2b7]
- Updated dependencies [8ef3f4a]
- Updated dependencies [be412cf]
- Updated dependencies [8df5fee]
- Updated dependencies [2719f48]
- Updated dependencies [aed4d3e]
- Updated dependencies [06afecc]
- Updated dependencies [0dbe078]
- Updated dependencies [114469c]
- Updated dependencies [ef47908]
- Updated dependencies [0512640]
- Updated dependencies [3d13f8c]
  - @rpgjs/common@5.0.0
  - @rpgjs/client@5.0.0
  - @rpgjs/server@5.0.0
  - @rpgjs/action-battle@5.0.0
  - @rpgjs/vite@5.0.0
  - @rpgjs/render-map2d@5.0.0

## 5.0.0-rc.11

### Patch Changes

- 1cae469: Update CanvasEngine to 2.4.0. Templates now read computed signals explicitly (`position().x` in the HP bar, light halo and dynamic bar components) and the action-battle projectile trail passes `loop={true}` to its `Fx`.
- 8ce9856: Render Studio walls with `wallStyle: "rock"` as stratified rock faces with a rock rim and a floor contact shadow, as used by dug caves. Wall faces now match the Studio map editor: they are extruded straight, their sides come from the wall's own sides, and face parts over an opaque wall top are no longer drawn, which removes stray lines along cave and room sides.
- Updated dependencies [1cae469]
- Updated dependencies [14f7cf9]
- Updated dependencies [114469c]
  - @rpgjs/client@5.0.0-rc.9
  - @rpgjs/server@5.0.0-rc.9
  - @rpgjs/vite@5.0.0-rc.9
  - @rpgjs/action-battle@5.0.0-rc.9

## 5.0.0-rc.10

### Patch Changes

- 973878b: Update CanvasEngine to 2.3.0. The 2.3 compiler no longer injects `computed`, `h`, `cond` and `loop` into every component, so components now import the helpers their script uses. `rpgjs()` declares its `Plugin[]` return type.
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
  - @rpgjs/action-battle@5.0.0-rc.8
  - @rpgjs/common@5.0.0-rc.6

## 5.0.0-rc.9

### Patch Changes

- Match Studio terrain texture sampling by excluding atlas cell borders before repeating textures. Measure the HUD portrait frame so facesets fit reliably on first display and after resizing in standalone and multiplayer games.
- Synchronize resolved actor combat animations to clients, preserving actor
  overrides for predicted attacks and casts across map loads. Read synchronized
  animation references at playback time and retain project defaults only until
  authoritative actor presentation is available.

  Resolve the project main actor when character selection is disabled, so its
  attack and cast overrides take precedence over inherited project animations.

- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies [ef47908]
  - @rpgjs/action-battle@5.0.0-rc.7
  - @rpgjs/client@5.0.0-rc.7
  - @rpgjs/server@5.0.0-rc.7
  - @rpgjs/vite@5.0.0-rc.7

## 5.0.0-rc.8

### Patch Changes

- f496a5a: Build hole and water collision borders from the final painted surface instead of every brush segment. Apply paint and erase operations in order, remove internal overlapping edges, simplify the resulting contours, and clip bridge openings precisely. This reduces collision bodies and loading work while keeping erased paths and islands walkable in standalone games and authoritative multiplayer maps.
- Respect enemy attack phase and cooldown overrides, keep attack facing stable,
  preserve remote locomotion, and fit complete visual cycles to authoritative
  combat timings. Expose per-pattern enemy timing overrides in Studio.
- 01860fa: Calibrate generated character animations per direction against idle, with a fixed visible ground anchor and scale across each timeline. Apply the same correction to separately played linked attacks while preserving the character's global scale and image preloading.
- 8df5fee: Derive liquid contact colors from opaque pixels of the material's atlas region, with explicit fill-color fallback and no default blue or grey-white foam. Share palettes across Canvas and CPU renderers and honor border/foam settings.

  Add opt-in static-element `submersion: { depth: 0.2 }`, preserved in direct loads and streamed chunks. Tint the lower alpha silhouette only where it intersects the actual liquid surface, including fill levels and erasures, after optional ground-shadow extraction. Cache palettes, liquid masks and composed element pixels by terrain revision without changing collisions or server authority.

- Updated dependencies [d88267a]
- Updated dependencies
- Updated dependencies [8df5fee]
  - @rpgjs/common@5.0.0-rc.5
  - @rpgjs/server@5.0.0-rc.6
  - @rpgjs/client@5.0.0-rc.6
  - @rpgjs/action-battle@5.0.0-rc.6
  - @rpgjs/render-map2d@5.0.0-rc.5
  - @rpgjs/vite@5.0.0-rc.6

## 5.0.0-rc.7

### Patch Changes

- 171726f: Restore idle scale after linked animations and preload all character animation images before exposing spritesheets to the game. Apply the same preparation to media objects and media IDs.

  Normalize generated characters to a 128-pixel reference frame before applying their saved scale.

  Match Character Editor's visible-height normalization across idle and linked animations, even when their saved scales have not been proportionally adjusted.

  Apply the same parent normalization when combat plays a linked attack as a separate graphic.

- b1a7ebc: Keep water surface refraction while removing graphical wave lines.
- Updated dependencies [f488e28]
  - @rpgjs/client@5.0.0-rc.5
  - @rpgjs/action-battle@5.0.0-rc.5
  - @rpgjs/server@5.0.0-rc.5
  - @rpgjs/vite@5.0.0-rc.5

## 5.0.0-rc.6

### Patch Changes

- Use generated spritesheet lane metadata and frame timing when rendering character movement.

## 5.0.0-rc.5

### Patch Changes

- 3b55a3f: Render legacy Studio terrain grids with the same soft-mask composition used by
  control-texture maps, so terrain such as grass and dirt keeps its editor fade in
  the running game.

## 5.0.0-rc.4

### Patch Changes

- Publish release candidates under npm's `latest` tag while retaining the repository's prerelease mode.
- Updated dependencies
  - @rpgjs/action-battle@5.0.0-rc.4
  - @rpgjs/client@5.0.0-rc.4
  - @rpgjs/common@5.0.0-rc.4
  - @rpgjs/render-map2d@5.0.0-rc.4
  - @rpgjs/server@5.0.0-rc.4
  - @rpgjs/vite@5.0.0-rc.4

## 5.0.0-rc.3

### Patch Changes

- Publish release candidates under the npm `latest` tag so fresh RPGJS projects install the current release.
- Updated dependencies
  - @rpgjs/action-battle@5.0.0-rc.3
  - @rpgjs/client@5.0.0-rc.3
  - @rpgjs/common@5.0.0-rc.3
  - @rpgjs/render-map2d@5.0.0-rc.3
  - @rpgjs/server@5.0.0-rc.3
  - @rpgjs/vite@5.0.0-rc.3

## 5.0.0-rc.2

### Patch Changes

- Prevent npm releases from containing unresolved `workspace:` dependency protocols.
- Updated dependencies
  - @rpgjs/action-battle@5.0.0-rc.2
  - @rpgjs/client@5.0.0-rc.2
  - @rpgjs/common@5.0.0-rc.2
  - @rpgjs/render-map2d@5.0.0-rc.2
  - @rpgjs/server@5.0.0-rc.2
  - @rpgjs/vite@5.0.0-rc.2

## 5.0.0-rc.38

### Patch Changes

- 94cbdac: Move equipment details into a compact inspector beside the list, add a Status menu entry returning to the hero overview, and extend local key preferences to Action and Back with immediate menu/game updates and preserved action payloads.
- 94cbdac: Polish equipment attribute comparisons and expose Studio's Options menu with per-project movement key preferences, conflict validation, reset controls and existing channel-based audio sliders.
- 94cbdac: Repair Studio hero initialization when a class skill is already learned, prefer canonical media references, and guard missing spritesheet identifiers. Refine the integrated status, inventory, equipment, skills, save and shop interfaces with theme-driven layouts, localized empty/unavailable states, safe icon fallbacks and window-local close buttons. Make the mobile hotbar scrollable instead of clipping its slots.
- 11c68d1: Add a framework-agnostic CPU terrain renderer shared by RPGJS Studio editors and
  the game runtime, including typed RGBA region rendering and terrain presets.
- Updated dependencies [94cbdac]
- Updated dependencies [4d53aa7]
- Updated dependencies [66c0d77]
- Updated dependencies [66c0d77]
- Updated dependencies [94cbdac]
- Updated dependencies [94cbdac]
- Updated dependencies [94cbdac]
- Updated dependencies [f624302]
- Updated dependencies [11c68d1]
- Updated dependencies [66c0d77]
  - @rpgjs/client@5.0.0-rc.36
  - @rpgjs/server@5.0.0-rc.36
  - @rpgjs/render-map2d@5.0.0-rc.1
  - @rpgjs/common@5.0.0-rc.32
  - @rpgjs/action-battle@5.0.0-rc.36
  - @rpgjs/vite@5.0.0-rc.36

## 5.0.0-beta.37

### Patch Changes

- e7b12ab: Add cinematic video playback through the existing GUI lifecycle, with aspect-preserving presentation, fades, accessible skip controls, autoplay recovery, temporary music attenuation, and error recovery. Register the Studio show_cinematic block and resolve its media through the game data provider without adding map-media associations.

  Support per-clip skip/music options, map video preloading and consecutive video playlists. Guard overlapping player event interactions and let gameplay release movement keys during cinematics.

  Skip immediately on click, tap or Escape, honoring non-skippable clips and ignoring key repeats and late responses from skipped clips.

- Updated dependencies [e7b12ab]
  - @rpgjs/client@5.0.0-beta.35
  - @rpgjs/action-battle@5.0.0-beta.35
  - @rpgjs/server@5.0.0-beta.35
  - @rpgjs/vite@5.0.0-beta.35

## 5.0.0-beta.36

### Patch Changes

- 331787c: Deduplicate Studio project, map, database, and media reads within each runtime provider. Cache in-flight and resolved requests by resource identifier, keep project and map lookup keys distinct, and evict failed requests so later calls can retry.
- 6b8d872: Preserve switched actors, chosen classes and progression when restoring Studio players. Persist parameter curve bounds and Studio initialization state, rebuild derived parameters instead of loading over their runtime signal, restore actor presentation without granting starting inventory again, and normalize Studio media and hitbox records for character selection. Apply combat animation bindings in changeActor.
- 85aea0c: Start immediately when displayTitleScreen is explicitly false, including when project metadata is unavailable or enables the title screen. Preserve project-driven startup when the option is omitted.
- Updated dependencies [b74236b]
- Updated dependencies [1fb8040]
- Updated dependencies [6b8d872]
- Updated dependencies [85aea0c]
  - @rpgjs/client@5.0.0-beta.34
  - @rpgjs/common@5.0.0-beta.31
  - @rpgjs/server@5.0.0-beta.34
  - @rpgjs/action-battle@5.0.0-beta.34
  - @rpgjs/vite@5.0.0-beta.34

## 5.0.0-beta.35

### Minor Changes

- e48f8f0: Add opt-in extraction of embedded element ground shadows into a texture cache
  and dedicated layer below Studio characters in standalone and streamed MMORPG
  maps. Preserve anti-aliased object contours and expose the tileset-element
  configuration through the Studio runtime schema.
- c849207: Add a post-acceptance player lifecycle context and a connection-scoped Studio MMORPG startup resolver with discriminated title/direct flows, single evaluation, URL project loading, and authoritative project/map validation.

### Patch Changes

- 0909491: Preserve weather WebSocket payloads through server reconciliation and render
  them as authoritative so runtime updates and `clearWeather()` replace weather
  initially configured in Studio map data.
- Updated dependencies [0909491]
- Updated dependencies [c849207]
  - @rpgjs/client@5.0.0-beta.33
  - @rpgjs/server@5.0.0-beta.33
  - @rpgjs/action-battle@5.0.0-beta.33
  - @rpgjs/vite@5.0.0-beta.33

## 5.0.0-beta.34

### Minor Changes

- decf73e: Add a server-authoritative Actor selection API, runtime Actor switching that preserves acquired progression, a responsive cinematic CanvasEngine character selector, resolved Actor and Class object inputs, class skill progression for CMS-backed data, RPGJS Studio new-game Actor selection settings, character-select/change-class event blocks, and a native query-area block with per-target child execution.
- 1bcd9fc: Keep `playSound()` as the single canonical sound API while adding persisted mixer channels, spatial playback, native interface cues, coordinated map and battle music, and Studio audio configuration, so framework users do not have to choose between overlapping concepts.

### Patch Changes

- Updated dependencies [decf73e]
- Updated dependencies [1bcd9fc]
  - @rpgjs/common@5.0.0-beta.30
  - @rpgjs/client@5.0.0-beta.32
  - @rpgjs/server@5.0.0-beta.32
  - @rpgjs/action-battle@5.0.0-beta.32
  - @rpgjs/vite@5.0.0-beta.32

## 5.0.0-beta.33

### Patch Changes

- bfc0933: Reduce animated terrain water rendering cost by copying only the pixels covered by each refraction band instead of redrawing the full terrain chunk for every band. Configure the Studio playground with a large animated-water map for local performance testing.
- bfc0933: Expose a `default` animation for Studio icons and facesets so RPGJS UI components can render them without rejecting spritesheet playback.
- bfc0933: Use the native named map start position when spawning players in Studio games,
  avoiding asynchronous database refreshes moving a player away from the `(0, 0)`
  sentinel before the configured start position is applied.
- Updated dependencies [e892732]
  - @rpgjs/client@5.0.0-beta.31
  - @rpgjs/common@5.0.0-beta.29
  - @rpgjs/server@5.0.0-beta.31
  - @rpgjs/action-battle@5.0.0-beta.31
  - @rpgjs/vite@5.0.0-beta.31

## 5.0.0-beta.32

### Patch Changes

- d005fdd: Reduce Studio terrain CPU usage by coalescing terrain asset loading, lazily rasterizing non-streamed chunks around the viewport, reusing morphology masks and filtered overlays across chunks, and rendering cropped water animations at a smooth capped frame rate. Keep the existing map loader visible until the initial terrain viewport has been rasterized and presented.
- e0bba29: Keep the legacy Action Battle-specific action bar available alongside the new
  persistent hotbar, including configured slot ordering, menu access, keyboard
  activation, and direct activation from its slots. Studio icon spritesheets now
  expose the default texture expected by GUI components.
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

- Updated dependencies [e0bba29]
- Updated dependencies [e0bba29]
- Updated dependencies [aed4d3e]
  - @rpgjs/action-battle@5.0.0-beta.30
  - @rpgjs/client@5.0.0-beta.30
  - @rpgjs/common@5.0.0-beta.28
  - @rpgjs/server@5.0.0-beta.30
  - @rpgjs/vite@5.0.0-beta.30

## 5.0.0-beta.31

### Minor Changes

- 4cc3086: Add a persistent server-authoritative, type-extensible hotbar for skills, items, and custom gameplay entries. The hotbar now supports a dynamic 1–10 slot capacity, retained locked-slot assignments, unlock hints, a persistent active slot, automatic refresh after level/class/inventory/map changes, direct keyboard shortcuts, a radial gamepad selector, LT/RT slot cycling with X activation, mobile centering, cooldown/cost/quantity presentation, and serialized `instant`, `select`, or `target` activation handlers.

  Replace Action Battle's dedicated `ui.actionBar` and component with the generic `ui.hotbar`. Action Battle skills enrich generic entries with targeting, cooldown, projectile, sound, animation, and visual metadata while their authoritative execution continues through native skill and item hooks. This is an intentional breaking configuration and export cleanup.

  Keep direct 1–0 Zelda-style menu assignment, display unavailable slots with their unlock condition in the root-level assignment picker, execute Studio skill workflows through the native `onUse` hook, make instant skills soft-target without a confirmation step, preserve skill impact media through AI damage feedback, and add translated Studio presentation fields, visual area targeting, phase-specific CanvasEngine cast/trail/impact presets, a default projectile renderer compatible with Studio skill records, and robust object-signal hydration for class and hotbar sync payloads. Upgrade to `@signe/sync` 3.1.1 so object-signal hydration uses the upstream fix without a local package patch.

  Expose a complete set of `--rpg-hotbar-*` CSS variables, bridge them through
  `@rpgjs/ui-css`, document the public client and server APIs with generated
  JSDoc references, and add a farm-themed playground showing mixed item and skill
  slots, menu assignment, and the persistent hotbar show/hide lifecycle.

### Patch Changes

- 512e637: Add type-aware Studio item fields and lifecycle workflows. Regular items expose
  consumable use hooks, while weapons and armors expose equipment modifiers and
  the native equip hook. Regular items can also display a configured spritesheet
  animation, play a personal sound, and display a built-in particle effect after
  successful use. The editor groups Item fields into dedicated layouts. Because
  the Item schema is conditional, it resolves the selected Item, Weapon, or Armor
  branch before distributing fields across editor tabs, avoiding duplicate
  generic property sections. Online Studio games refresh database records when a
  player joins a map, and item use resolves lifecycle hooks from the current map
  database so a removed use animation no longer survives in an inventory
  snapshot.

  Clarify the built-in hotbar model: it accepts learned skills and usable regular
  items, while weapons and armors remain browseable in Items and are managed from
  Equip. Studio now labels these choices as usable items, filters starting
  equipment selectors by slot type, and ignores invalid saved equipment without
  adding it to the player's inventory.

  The Studio Item editor now derives its tabs from the selected item type.
  Regular items expose Usage and Presentation, while weapons and armors expose
  Equipment, so conditional schemas no longer leave empty tabs visible.
  Custom fields now leave their schema description to the shared CMS field
  wrapper, preventing duplicate help text, and Item and Skill lifecycle actions
  are consistently presented as triggers in the editor.

  Creating a trigger now persists its parent Item or Skill first, keeps the
  editor on the newly created record, and immediately saves the trigger
  attachment. Failed attachments restore the previous form state instead of
  leaving an untracked trigger.

  The Studio Skill editor now presents its schema layouts as translated tabs,
  matching the Item editor while keeping Action Battle and its triggers together.
  Area size, presets, and individual area-mask edits now notify the Skill form,
  so the updated targeting area is saved and restored after reloading the editor.
  Translated Skill and Item media fields now render the same native media preview
  as icon fields, including image, spritesheet, and audio previews.
  The Studio sidebar now uses a supported panel icon for the GUI editor entry.

- c591d0c: Keep Studio tileset elements at their source proportions when tileset metadata contains the dimensions of the complete atlas image.
- 4b6fe16: Make Adventure combat more responsive and readable with overlap-safe control locks, guard/parry/counter gameplay, soft targeting, coordinated enemy attack turns, Studio-driven combat animations, skill hit-rate handling, anchored impact feedback, configurable hit-stop, and enemy death effects.

  Let temporary attack spritesheets finish their visual follow-through after gameplay recovery instead of forcing the character back to `stand` mid-animation. Studio four-direction attack spritesheets now play in 350ms by default without changing locomotion speed, with an optional `attackDurationMs` media metadata override.

  Keep repeated Studio event placements as independent runtime entities with deterministic instance ids and separate hitboxes.

  Add configurable attack, skill, hit, hurt, and defeat sounds plus per-player dynamic combat music. Battle music crossfades against map BGM, restores it after a configurable grace period, keeps ambient audio intact, and selects enemy, map, or project tracks with stable boss-aware priority.

  Expose Studio combat-audio project/map fields and `createStudioActionBattleAudio()` / `createStudioActionBattlePreset()` helpers. Studio sound resolution no longer stops every currently playing sound.

- 4cc3086: Initialize the RPGJS map weather runtime from weather saved in Studio map
  parameters so connected clients receive and render the configured effect.
- ab6723f: Allow Studio games to start players immediately without requiring a title-screen interaction.
- 9f317fb: Keep top components such as enemy HP bars attached to scaled sprites when
  transparent frame bounds are still loading or cannot be scanned.

  Respect each enemy skill cooldown inside combos and choose varied special
  attacks that fit the current target distance.

  Let enemies choose among every learned skill, normal attacks, and contextual
  repositioning. Projectile and area skills now respect their targeting metadata,
  and optional structured AI logs explain each server-authoritative decision.

  Preload Studio skill impact and projectile media so enemy skills render their
  configured animation on the first use. Resolve reactive skill presentation
  and impact metadata before client transfer, consume their reactive SP and hit
  rate values, and play ranged skills as casts.

  Unwrap reactive skill combat values before RPGJS evaluates damage formulas, so
  enemy skills apply their configured power instead of resolving to zero damage.

  Remove the caster animation control from the Studio skill editor while keeping
  existing skill records compatible at runtime.

- 512e637: Allow hotbars to filter entry types dynamically, let Action Battle resolve
  visibility per player, apply RPGJS Studio project hotbar settings, expose a
  Studio event block for displaying or hiding the Hotbar, and honor the Studio
  Title Screen, HUD, and Main Menu bindings. The main menu now hides disallowed
  item or skill assignment actions, displays the item slot picker correctly, and
  clears the native assignment when the last consumable is used.
- aa4a517: Add composable boss phase helpers, delayed AI sequences, server action intents,
  movement and teleport conveniences, and a generic server-driven AI visual
  registry. Resolve animation callbacks into serializable visual packets so
  Studio combat media are honored without cloning functions across rooms.

  Add the Adventure combat preset with buffered player combos, authoritative
  charged attacks, dodge invulnerability, attack multipliers, stronger Impact
  visuals, enemy telegraphs, reuse of the existing RPGJS HUD and graphic-bound
  HP components, contextual animated damage typography, skill-specific FX,
  and optional mobile heavy-attack controls. `preset: "classic"` preserves the
  previous combat and UI defaults.

  Position transient component animations from numeric world coordinates and
  derive component bounds from visible pixels for generated Studio spritesheets,
  so telegraphs, damage popups, and HP bars stay anchored to scaled characters
  without including transparent frame padding.

- Updated dependencies [512e637]
- Updated dependencies [4b6fe16]
- Updated dependencies [512e637]
- Updated dependencies [4cc3086]
- Updated dependencies [9f317fb]
- Updated dependencies [512e637]
- Updated dependencies [aa4a517]
  - @rpgjs/server@5.0.0-beta.29
  - @rpgjs/client@5.0.0-beta.29
  - @rpgjs/action-battle@5.0.0-beta.29
  - @rpgjs/common@5.0.0-beta.27
  - @rpgjs/vite@5.0.0-beta.29

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
