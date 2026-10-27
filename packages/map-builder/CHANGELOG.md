# @rpgjs/map-builder

## 1.0.0

### Minor Changes

- 9caddb9: Add interaction to `@rpgjs/map-builder` (experimental, private): picking, selection, dragging, placement with a ghost preview, skins, and play / edit modes on one scene.

  - `@rpgjs/map-builder/interaction`, headless and free of PixiJS: an observable state (hovered, selection, drag, rubber band, ghost, last rejection), intents (`element.move`, `element.remove`, `element.place`, open registry), pipelines of synchronous middlewares (`snapToGrid`, `withinMap`, `requireFree`, `maxCount`, `minDistance`) that can run on the client to preview and on a server to validate, a catalog (`defineCatalog`), tools and modes.
  - `selection()`, `placement()` and `history()` features, whose APIs are exposed on the view and typed by the list of features (`view.placement.start("oak")` only accepts catalog ids). `elements()` can restrict moves and removals for every caller.
  - `@rpgjs/map-builder/skins`: replaceable parts for the selection, hover, drag, rubber band and ghost, with a sober `defaultSkin` and a `gameSkin`.
  - `play` and `edit` can be active together: a plain click plays while a modified click edits, on the same view and model.
  - Pointer events are only wired when a feature has something to interact with, so a view that only draws never intercepts the clicks of a game.

- d503ddb: Add the `@rpgjs/map-builder` package (experimental, private) with its first building block, the map model (`@rpgjs/map-builder/model`).

  - `MapDefinition`, `MapSource` (code, JSON and HTTP sources, region loading) and `AssetResolver`, so a map can be described and loaded without Studio. `defineMap` checks asset references at compile time and at runtime.
  - `createMapModel`: state changed only by serializable, invertible patches (`element.*`, `event.*`, `extension.set`), atomic batches with a single revision, `baseRevision` checks, `subscribe`, and an open patch registry that features extend by declaration merging.
  - Undo / redo based on inverse patches, with grouping, coalescing of continuous edits and a size limit.
  - `localCommitter` with ordered, non-blocking `persist`.
  - The model runs in plain Node, without a DOM.

- 289d0e2: Add multiplayer to `@rpgjs/map-builder` (experimental, private): an authority that decides and tells everybody, and a client that asks and follows. Independent of any framework: `/protocol`, `/authority`, `/remote`.

  - `createMapAuthority`: holds the truth of a map, runs the same pipelines the clients preview with, broadcasts every change in order, catches late clients up from a log (or a snapshot), and gives the ids of what is placed. Clients ask with intents; patches are only accepted from clients it trusts.
  - `remoteCommitter` and `joinRemoteMap`: a model whose changes are decided by the authority, with timeouts, detection of holes in the revisions, repeated and invalid messages ignored, and a snapshot that replaces the whole state (`MapChange.reset`).
  - Persistence: `MapStore`, `memoryMapStore`, `restoreMapAuthority` (snapshots, a log, replay, and a refusal of a log with a hole).
  - New steps for a shared world: `ownerOnly`, `rateLimit`, `protectedZone`. `PipelineContext` gains `preview` and `scene`.
  - A validated message protocol and `connectInMemory` to link a client and an authority without a network.
  - `placement` no longer chooses the id of what it places: the one who resolves the intent does, so two players cannot pick the same.

- 9d8d52e: Add the map renderer to `@rpgjs/map-builder` (experimental, private): `@rpgjs/map-builder/renderer` and `@rpgjs/map-builder/features`.

  - `createMapView` draws a model with PixiJS and follows it patch by patch: only the elements a patch touched are described again. `view.root` can be added to any PixiJS stage, and `attachMapView` hosts it in a CanvasEngine component.
  - `elements()` and `events()` features, defined with the same `defineMapFeature` contract as third-party features (id, `requires`, `apiVersion`).
  - Depth ordering, hitbox and scale rules identical to the Studio element renderer, checked against reference geometry frozen from Studio before the port. Drawing rules stay in Studio and plug in through the `resolveElementSprite` hook.
  - Viewport culling, asynchronous image loading with frame support, and hooks (`resolveElementSprite`, `onBeforeRenderElement`, `onMissingAsset`).
  - Transient effects (`view.effects.play`, built-in `shake` and `blink`) that never touch the model.
  - Model: elements gain an optional `scale`, assets an optional `frame`.

- c4505f2: Add the RPGJS integration of `@rpgjs/map-builder` (experimental, private): `@rpgjs/map-builder/server` and `@rpgjs/map-builder/client`, each with a `provideMapBuilder`.

  - Server: one authority per map, connected to the players who are on it, with the same pipelines as the clients. A map can be kept between restarts (`roomStorageMapStore`, `keyValueMapStore`, or any `MapStore`).
  - The static colliders of the physics, on the server and on the client, follow the elements one at a time, and are put back when RPGJS rebuilds its physics world. Map events become RPGJS dynamic events, to which the game gives behaviour.
  - Client: joins the map the player is on, builds the model and the view, keeps the prediction colliders in step, plays the server's effects, and offers the view as `pixiChildren` for the event layer so it is sorted with the characters. `getMapBuilder(engine)` gives game code access.
  - Game code reaches the authority with `getMapAuthority(map)`: a lever is `authority.apply(...)`.
  - A player who changes map is disconnected from the previous one, even though RPGJS does not call `onLeave` then.

### Patch Changes

- 6288e42: Editor channels (experimental), `@rpgjs/map-builder/embed`: a game embedded in an iframe can let a Studio join the authority of its map as a trusted session, drive its tools (modes, brush, placement, selection) and pause it. `createEditorHost` is the game's end, `connectEditorFrame` the Studio's. A private `MessageChannel` after a handshake that checks the origin and the window of both ends; every message is parsed strictly.
- e72aaa3: Fixes found while building the playground game: the client view now advances its effects (shake, blink) with the engine step (`onStep`), and the server module tracks connections by player id, so a player who changes map is correctly disconnected from the authority of the map they left.
- ddf75a8: Fixes from the review of the map builder branch.

  - A `terrain.paint` whose cost (pixels x stroke segments) is too high is refused by the patch handler and by `requireTerrain`, so a client cannot stall the authority with a huge stroke.
  - The remote committer settles a request whose own change is answered with a revision it already has, or with a gap, instead of failing it with `timeout`.
  - The client gives up a join still waiting for another map when the scene changes.
  - The server flushes the authority of a map when its last player leaves.

- ca75784: Follow-ups of the review of the map builder branch.

  - `keyValueMapStore` keeps its log in memory after the first read instead of reading the storage on every appended change.
  - Colliders are resynced after an `element.data` patch.
  - Studio: a failed import of the map builder layers is no longer cached, the cell size of a v2 map is a named constant, and the docs of the map extension context are on the right methods.

- 9e02c76: Painted terrain (experimental): `@rpgjs/map-builder/terrain` (data under `extensions.terrain`, a chunked run-length encoded control mask, the `terrain.paint`, `terrain.region`, `terrain.materials` and `terrain.morphology` patches with exact inverses, `defineTerrain` and `paint.*` to write a terrain in code, the `terrain.paint` intent, the brush tool and the `requireTerrain`, `withinTerrain` and `maxRadius` steps), `@rpgjs/map-builder/terrain-render` (the kernel of `@rpgjs/render-map2d`, inline or in a pool of workers) and a `terrain()` feature that draws it on chunk textures, re-rendering only what a stroke touches. `FeatureHost` gains `onViewport`; the authority and the client accept `patchHandlers`.
- 86cb9d4: `@rpgjs/studio` gets one extension point, `registerStudioMapExtension`: a function called each time a Studio map is loaded, with the engine, the id and size of the map, the placed elements as stored, the function that resolves one of them to what the runtime draws, and `updateData` to give the scene new data. Tools, overlays or an editor plug into it; the runtime knows nothing of what goes through. `@rpgjs/map-builder` gets `@rpgjs/map-builder/embed` (a game embedded in an iframe lets another page join its map as a trusted session, drive its tools and pause it) and a `draw: false` option for `createMapView`, for a host that draws the map itself and only wants the selection and the tools.

  The editor channels also carry named commands (`frame.command("copy", args)`, registered by the game with `commands`) and values the game keeps for the Studio (`host.publish(key, value)`, `frame.onState(key, listener)`).

  The extension context also gives `tilesetImage(tilesetId)`, the address of the picture of an element tileset, for an overlay that shows the element about to be placed, `readData()`, the data the scene shows now, and `resolveAsset(fileName)`, the address a stored asset is served from, and `normalizeMorphology(layer)`, the holes and walls the runtime draws for a stored terrain morphology layer.

- Updated dependencies [3c819b4]
- Updated dependencies [5ed53bc]
- Updated dependencies [0285d7e]
- Updated dependencies [56df984]
- Updated dependencies [90d44b6]
- Updated dependencies [f15d95a]
- Updated dependencies [3a7d5f5]
- Updated dependencies [f0c26af]
- Updated dependencies [aa0fa28]
- Updated dependencies [50ffe5a]
- Updated dependencies [a4faebf]
- Updated dependencies [84494ca]
- Updated dependencies [374516d]
- Updated dependencies [f63bddb]
- Updated dependencies [88fd2e7]
- Updated dependencies [3dba915]
- Updated dependencies [e7095ad]
- Updated dependencies [5b50670]
  - @rpgjs/server@5.2.0
  - @rpgjs/client@5.3.0
  - @rpgjs/render-map2d@5.0.1
  - @rpgjs/common@5.1.1
