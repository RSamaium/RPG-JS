# @rpgjs/client

## 5.0.0-beta.33

### Patch Changes

- 0909491: Preserve weather WebSocket payloads through server reconciliation and render
  them as authoritative so runtime updates and `clearWeather()` replace weather
  initially configured in Studio map data.
- c849207: Add a post-acceptance player lifecycle context and a connection-scoped Studio MMORPG startup resolver with discriminated title/direct flows, single evaluation, URL project loading, and authoritative project/map validation.
- Updated dependencies [0909491]
- Updated dependencies [c849207]
  - @rpgjs/server@5.0.0-beta.33

## 5.0.0-beta.32

### Minor Changes

- decf73e: Add a server-authoritative Actor selection API, runtime Actor switching that preserves acquired progression, a responsive cinematic CanvasEngine character selector, resolved Actor and Class object inputs, class skill progression for CMS-backed data, RPGJS Studio new-game Actor selection settings, character-select/change-class event blocks, and a native query-area block with per-target child execution.
- 1bcd9fc: Keep `playSound()` as the single canonical sound API while adding persisted mixer channels, spatial playback, native interface cues, coordinated map and battle music, and Studio audio configuration, so framework users do not have to choose between overlapping concepts.

### Patch Changes

- Updated dependencies [decf73e]
- Updated dependencies [1bcd9fc]
  - @rpgjs/common@5.0.0-beta.30
  - @rpgjs/server@5.0.0-beta.32
  - @rpgjs/ui-css@5.0.0-beta.26

## 5.0.0-beta.31

### Patch Changes

- e892732: Keep the camera attached when MMORPG streaming refreshes Tiled layers and synchronize instant following with the rendered character position so the viewport cannot trail by one frame. Stabilize predicted movement by publishing finalized input batches only after their client physics step, applying every input from the same client tick in one authoritative server step, capturing the matching acknowledged position, ignoring delayed acknowledgements whose prediction history expired, routing local-player snapshots through prediction instead of applying them directly, and sharing the same movement idle window on both peers.
- Updated dependencies [e892732]
  - @rpgjs/common@5.0.0-beta.29
  - @rpgjs/server@5.0.0-beta.31

## 5.0.0-beta.30

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

- aed4d3e: Position sprite components from intrinsic spritesheet dimensions and the scaled visible graphic bounds, with a full-frame fallback while transparent bounds are loading.
- Updated dependencies [e0bba29]
  - @rpgjs/common@5.0.0-beta.28
  - @rpgjs/server@5.0.0-beta.30

## 5.0.0-beta.29

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

- 4b6fe16: Make Adventure combat more responsive and readable with overlap-safe control locks, guard/parry/counter gameplay, soft targeting, coordinated enemy attack turns, Studio-driven combat animations, skill hit-rate handling, anchored impact feedback, configurable hit-stop, and enemy death effects.

  Let temporary attack spritesheets finish their visual follow-through after gameplay recovery instead of forcing the character back to `stand` mid-animation. Studio four-direction attack spritesheets now play in 350ms by default without changing locomotion speed, with an optional `attackDurationMs` media metadata override.

  Keep repeated Studio event placements as independent runtime entities with deterministic instance ids and separate hitboxes.

  Add configurable attack, skill, hit, hurt, and defeat sounds plus per-player dynamic combat music. Battle music crossfades against map BGM, restores it after a configurable grace period, keeps ambient audio intact, and selects enemy, map, or project tracks with stable boss-aware priority.

  Expose Studio combat-audio project/map fields and `createStudioActionBattleAudio()` / `createStudioActionBattlePreset()` helpers. Studio sound resolution no longer stops every currently playing sound.

- 512e637: Keep CanvasEngine GUIs registered while hidden and reactively mount their components when their display signal changes, restoring title screens and other GUIs after hide/show operations.
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
- Updated dependencies [4cc3086]
- Updated dependencies [512e637]
  - @rpgjs/server@5.0.0-beta.29
  - @rpgjs/common@5.0.0-beta.27
  - @rpgjs/ui-css@5.0.0-beta.25

## 5.0.0-beta.28

### Minor Changes

- 995277f: Add explicit renderer-neutral GUI registrations with an official Vue helper,
  ship the authoritative and replaceable RPGJS chat module, provide default and
  pixel chat themes over shared semantic CSS primitives, and enforce client/server
  production bundle isolation with executable fixtures. Include a runnable pixel
  chat playground and keep chat socket listeners active across standalone startup
  and player map transfers. Document client/server setup, moderation hooks,
  replacement components, themes, translations, and the public chat state API.
  Emit complete side-specific chat declarations, synchronize the built-in input
  length with client configuration, and reject explicitly unknown chat channels.

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
  - @rpgjs/ui-css@5.0.0-beta.24

## 5.0.0-beta.27

### Patch Changes

- dc6aed5: Initialize recursively nested RPGJS provider lists in client and server setup so
  sample and consumer configurations register every provider at runtime.
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
  - @rpgjs/server@5.0.0-beta.27
  - @rpgjs/common@5.0.0-beta.26

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
  - @rpgjs/common@5.0.0-beta.25
  - @rpgjs/server@5.0.0-beta.26

## 5.0.0-beta.25

### Minor Changes

- 0512640: Add reusable typed input and textarea controls for standalone forms and dialog boxes, with shared server-side validation and an RPGJS Studio block that stores the submitted value.

### Patch Changes

- ccb9495: Fix TypeScript declaration errors across the package build, align multi-target declaration exports, complete movement API overloads, and make package and root builds fail when declaration generation reports a type error.
- Updated dependencies [ccb9495]
- Updated dependencies [f6aa046]
- Updated dependencies [0512640]
  - @rpgjs/common@5.0.0-beta.24
  - @rpgjs/server@5.0.0-beta.25
  - @rpgjs/ui-css@5.0.0-beta.23

## 5.0.0-beta.24

### Patch Changes

- e11f2ed: Fix main menu Escape handling, add outside-click and touch close controls for prebuilt modal GUIs, make menu layouts responsive on small screens, restore a compact desktop menu with an integrated sidebar and column-based item views, use fade-only menu transitions, improve Skills/Equipment and save slot spacing, make active menu rows less visually harsh, and improve HUD and dialog border rendering.
- 3fb2765: Apply Studio media scale as a multiplier of the default RPGJS display scale, then combine it with event instance scale instead of overwriting it.
- be412cf: Let Studio event-touch pressure plates overlap pushed events without physical separation, wait until ground sensors are mostly covered before firing, clean up touch tracking when collisions exit after z changes, and clamp route overshoot frames that could make pushed events jitter.
- Updated dependencies [e11f2ed]
- Updated dependencies [be412cf]
  - @rpgjs/ui-css@5.0.0-beta.22
  - @rpgjs/common@5.0.0-beta.23
  - @rpgjs/server@5.0.0-beta.24

## 5.0.0-beta.23

### Patch Changes

- e7d8d13: Hydrate Studio event hitboxes from the API initially, apply synchronized hitbox object payloads to client physics bodies, publish runtime Studio hitbox changes through the synced event collection instead of a separate setHitbox websocket path, and keep standalone map transfers on the restored room so transferred player positions and hitboxes are preserved in sample-dev.
- Updated dependencies [e7d8d13]
  - @rpgjs/common@5.0.0-beta.22
  - @rpgjs/server@5.0.0-beta.23

## 5.0.0-beta.22

### Patch Changes

- 1028c17: Use workspace protocol for internal RPGJS package dependencies during prerelease development so CI installs do not fetch unpublished beta packages from npm.
  - @rpgjs/server@5.0.0-beta.22

## 5.0.0-beta.20

### Patch Changes

- Release the next RPGJS beta while keeping the physics package unchanged.
- Updated dependencies
  - @rpgjs/common@5.0.0-beta.20
  - @rpgjs/server@5.0.0-beta.20
  - @rpgjs/ui-css@5.0.0-beta.20

## 5.0.0-beta.19

### Patch Changes

- Release the next RPGJS beta while keeping the physics package unchanged.
- Updated dependencies
  - @rpgjs/common@5.0.0-beta.19
  - @rpgjs/server@5.0.0-beta.19
  - @rpgjs/ui-css@5.0.0-beta.19

## 5.0.0-beta.17

### Patch Changes

- Release the next RPGJS beta while keeping the physics package on its stable release line.
- Updated dependencies
  - @rpgjs/common@5.0.0-beta.16
  - @rpgjs/server@5.0.0-beta.17
  - @rpgjs/ui-css@5.0.0-beta.14

## 5.0.0-beta.16

### Patch Changes

- Release the next RPGJS beta with terrain rendering performance improvements and a unified server tick loop.
- Updated dependencies
  - @rpgjs/common@5.0.0-beta.15
  - @rpgjs/server@5.0.0-beta.16
  - @rpgjs/ui-css@5.0.0-beta.13

## 5.0.0-beta.15

### Patch Changes

- dba133e: Queue early changeMap packets until the client has finished loading modules and GUI definitions.
  - @rpgjs/server@5.0.0-beta.15

## 5.0.0-beta.14

### Patch Changes

- Updated dependencies [c96b31a]
  - @rpgjs/common@5.0.0-beta.14
  - @rpgjs/server@5.0.0-beta.14

## 5.0.0-beta.13

### Patch Changes

- Release the next RPGJS beta with client interactions, i18n support, movement and physics improvements, Studio fixes, action battle updates, playground migration, and related runtime documentation.
- Updated dependencies
  - @rpgjs/common@5.0.0-beta.13
  - @rpgjs/server@5.0.0-beta.13
  - @rpgjs/ui-css@5.0.0-beta.12

## 5.0.0-beta.12

### Patch Changes

- Prepare beta.12 with action battle AI, area queries, client visuals, event component resolvers, projectile handling, and related Vite/runtime updates.
- Updated dependencies
  - @rpgjs/common@5.0.0-beta.12
  - @rpgjs/server@5.0.0-beta.12

## 5.0.0-beta.11

### Patch Changes

- Add projectile runtime support with client-side prediction, action input payload handling, pointer context helpers, standalone message handling, and MMORPG connection authentication.

  Add composable CanvasEngine scene map components and update built-in GUI/dynamic components for the current CanvasEngine release.

  - @rpgjs/common@5.0.0-beta.11
  - @rpgjs/server@5.0.0-beta.11
  - @rpgjs/ui-css@5.0.0-beta.11

## 5.0.0-beta.10

### Patch Changes

- Fix current-player control binding and canMove reads when values are provided by synced or reactive state.

  Fix Vue GUI rendering for hidden fixed GUIs while keeping attached GUI targets updated.

  - @rpgjs/server@5.0.0-beta.10

## 5.0.0-beta.9

### Major Changes

- c456d25: beta.9

### Patch Changes

- Updated dependencies [c456d25]
  - @rpgjs/common@5.0.0-beta.9
  - @rpgjs/server@5.0.0-beta.9
  - @rpgjs/ui-css@5.0.0-beta.9

## 5.0.0-beta.8

### Major Changes

- 35e7fa4: beta.8

### Patch Changes

- Updated dependencies [35e7fa4]
  - @rpgjs/common@5.0.0-beta.8
  - @rpgjs/server@5.0.0-beta.8
  - @rpgjs/ui-css@5.0.0-beta.8
