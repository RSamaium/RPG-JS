# Map Builder — Specification

> Status: **draft for review**. No implementation exists yet. Every name and
> signature below is a proposal; the API is considered experimental until the
> Studio integration (step 6) validates it.
>
> Working package name: `@rpgjs/map-builder`.

## 1. Goal

Provide one map rendering and editing engine that works in three situations:

| Situation | What the user can do |
| --- | --- |
| Plain game | Play on a rendered map. Nothing is editable. |
| Builder game | Place and move elements under gameplay rules (trees, buildings), with a ghost preview and validation. |
| Editor (RPGJS Studio, any SaaS) | Paint terrain and liquids, place and select freely, undo/redo, save through an API. |

The map can also change **during gameplay**: a lever moves a gate, a quest
adds an element. That is the same mechanism as editing, driven by the server.

**The objective is a *modifiable map*:** one map whose content can change at
runtime, whoever causes the change (a player, the server, an editor) and
whatever the source of the data (code, JSON, Tiled, a database, Studio).

Studio is the first consumer, not the owner. The package must work without
Studio, without Angular and, for the core, without RPGJS. Studio is a
**higher-level layer** that assembles a map source, assets, a catalog, rich
features and a UI on top of this package (see 3.3).

### Non-goals

- Replacing the RPGJS server, physics or event system.
- Defining a map file format on disk. The model describes the in-memory map and
  its patches; persistence is delegated to an adapter.
- Supporting a renderer other than Pixi / CanvasEngine.

## 2. Current state (why this is needed)

The same map is rendered by two separate code bases:

| | Editor (`rpgjs.studio`) | Game (`RPG-JS`) |
| --- | --- | --- |
| Entry points | `map-canvas-renderer.service.ts` (~8.5k lines), `map-layers.service.ts` (~2.6k) | `packages/studio/src/map-renderer/` (~5.6k), `map-loader.ts` |
| Technique | `HTMLCanvasElement` 2D inside Angular services | CanvasEngine / Pixi (`.ce` components) |
| Coupling | Angular, PrimeNG, `TranslateService` | `RpgClientEngine` |

`@rpgjs/render-map2d` already extracted part of the pixel computation (liquids,
morphology). The editor still carries its own copies of road, carpet and
nine-slice drawing (`drawing/*`), which `render-map2d` also implements.

## 3. Architecture

### 3.1 Layers

```
 intent ─▶ tool ─▶ pipeline (policy) ─▶ committer ─▶ patch ─▶ model ─▶ renderer ─▶ skin
```

| Layer | Responsibility | Replaceable to… |
| --- | --- | --- |
| **Source / Assets** | Where the map data and the images come from (3.3). | Studio API, JSON, Tiled, code |
| **Model** | Map state, patches, inverses, revisions, history. Single source of truth. | — |
| **Committer** | Where an intention becomes a fact. | `local` / `remote` |
| **Pipeline** | Chain of middlewares that snap, validate or reject an intent. | free editor / strict game |
| **Features** | Opt-in capabilities (terrain, liquids, elements, selection, placement…). | choose per context |
| **Tools** | Gestures (select, drag, brush, place). Headless: they emit state and intents, no visuals. | game / editor |
| **Skins** | Visual representation of tool state (selection frame, ghost, handles). | SaaS / game |
| **Renderer** | Draws the model with CanvasEngine / Pixi. Shared by every context. | — |

### 3.2 Packages

One package with sub-path exports; `@rpgjs/render-map2d` stays separate.

```
@rpgjs/render-map2d            terrain pixel kernel: textures in, RGBA out. No DOM, Pixi, network.
        ▲
@rpgjs/map-builder
  /model                       MapDefinition, MapSource, AssetResolver, createMapModel, patches, batches, history, localCommitter
  /renderer                    createMapView (CanvasEngine / Pixi)
  /features                    terrain, liquids, elements, selection, history, placement
  /interaction                 headless: state, tools, intents, pipelines (snapToGrid, maxCount…), catalog
  /skins                       default skin, gameSkin
  /server                      provideMapBuilder (authority, validation, broadcast)
  /client                      provideMapBuilder (rendering, remote committer)
  .                            re-exports the common surface
```

Dependency direction (nothing goes up):

```
render-map2d ◀ model ◀ renderer ◀ features ◀ client / server
```

`render-map2d` is **not** a second renderer. It computes terrain texture pixels
(roads, liquids, nine-slice, morphology). The `renderer` calls it to build the
textures it then displays as sprites. It stays separate so that it can run in
Node or a Worker without Pixi (pre-rendering, thumbnails, export).

### 3.3 Sources and assets (independent of Studio)

Today the map renderer fetches its data from the Studio API
(`map-loader.ts`, `data-provider`, `map-streaming.ts`). The package inverts this:
the renderer receives a map that is **already described**, by any source, and
never imports Studio.

| Abstraction | Role | Implemented by |
| --- | --- | --- |
| `MapDefinition` | Neutral, minimal description of a map: size, tile size, terrain layers, elements, events. No notion of project, bundle or API. | Defined by the package |
| `MapSource` | Provides a `MapDefinition`, loadable by regions for large maps: `load(id)`, `loadRegion(id, rect)`. | Studio, JSON file, Tiled, database, code |
| `AssetResolver` | Turns a reference (`"tree-oak"`) into a texture or spritesheet plus metadata. | Studio (project CDN), local folder, a game |

```
MapSource ──▶ MapDefinition ──▶ model ──▶ renderer ◀── AssetResolver
(Studio, JSON, Tiled, code)
```

Without Studio, the minimal case is a map written in code:

```ts
const forest = defineMap(assets, {
  id: 'forest', size: [2560, 1920],            // world size in pixels
  elements: [el('tree-oak', { id: 't1', x: 128, y: 96 })],
})
const view = createMapView({
  model: createMapModel(forest),
  assets: folderAssets('/assets'),
  features: [elements()],
})
await view.mount(host)
```

Other sources plug in the same way (`httpMapSource({ baseUrl })`,
`tiledMapSource()`). Studio sits one level above:

```ts
provideMapBuilder({
  source: studioMapSource({ projectId }),
  assets: studioAssets({ projectId }),
  features: [...studioFeatures()],   // rich terrain, tilesets, editor tools
})
```

Rules:

- If Tiled and a local JSON file go through `MapSource`, Studio has no hidden
  privilege. The POC must ship at least **two sources** (code and JSON) to prove
  it.
- Region loading is generic. The streaming logic of `map-streaming.ts` is
  extracted; Studio keeps only its API calls.
- Writing mirrors reading: the committer's `persist` is the equivalent of a
  sink. Studio plugs its API, others plug a file or a database.
- `MapDefinition` starts **minimal**: elements and events, in world pixels.
  Tile layers and painted terrain (control mask) are data owned by the `terrain`
  feature (`extensions.terrain`), provided by some sources only. Features that
  need them list `terrain` in `requires`.
- Studio-specific logic (drawing rules, element sizes, spritesheet handling)
  stays in Studio and is injected through hooks such as `resolveElementSprite`.
  The `AssetResolver` stays simple: reference in, texture and metadata out.
- Studio's own format is converted by a normalizer (`map-normalizer.ts` already
  exists). That normalizer is the boundary.

### 3.4 Designing for the future

The library will be extended in ways we cannot fully list today (pixel-precise
terrain, HD-2D rendering, new editing tools, new game mechanics). The rule is to
**reserve extension points now, and build the features later**. A seam is only
added when a concrete feature on the roadmap (6.1) needs it; nothing is built
"just in case".

| Principle | What it means concretely |
| --- | --- |
| **Versioned data** | `MapDefinition` has a `version` and ships migrations. A map saved today loads tomorrow. |
| **Lossless round-trip** | Fields unknown to the running version are preserved when a map is loaded and saved again, so an older tool never destroys data written by a newer one. |
| **Namespaced extensions** | A feature stores its own data under `extensions['<feature-id>']` in the `MapDefinition`, with its own schema version. The core never needs to know about `terrain` or `postFx` to carry them. |
| **Open patch union** | Patch and intent types are an open registry, extended by features through TypeScript declaration merging. Adding a feature adds its types, without editing the core. |
| **Named render stages** | The renderer is an ordered list of stages (`ground`, `objects`, `overlay`, `lighting`, `post`). A feature contributes nodes or passes to a stage. Adding a stage or a pass does not change existing features. |
| **No tile assumption in the core** | The world is in **pixels**. A tile grid is one feature, not the base. This is what allows pixel-precise terrain without a second coordinate system. |
| **Depth from day one** | Elements carry a depth (`z`, sort anchor, optional height) in the data model, even if the first renderer only uses y-sorting. Adding it later would reopen the format. |
| **Capability negotiation** | The renderer reports what the device supports (WebGL version, filters, texture limits). Features degrade by quality tier instead of failing. |
| **Binary data by reference** | Large data (terrain masks, LUTs) is stored as blobs referenced from the definition, never inlined, so formats stay light and streamable. |
| **Deterministic time** | Effects read time from an injectable clock, so animation and post effects stay testable and replayable. |
| **Stable contract, private internals** | Only documented entry points are public. Everything else is internal and may change. The API is experimental until step 6 and then follows semver through changesets. |
| **Feature API versioning** | `defineMapFeature` declares an `apiVersion`. The runtime can reject or adapt a feature built for another contract version, with a clear message. |
| **Ordering and conflicts** | Features declare `requires` and `before`/`after` relations. Conflicting features fail at startup with an explicit message. |

The renderer stays behind a thin internal interface to limit direct coupling to
CanvasEngine. This is not to support another backend (a non-goal), but to keep
upgrades of CanvasEngine and Pixi contained.

## 4. Model and patches

### 4.1 Patches

A patch is a serializable, invertible description of one change.

```ts
interface MapPatch {
  type: string               // 'element.move', 'element.add', 'terrain.paint'…
  baseRevision: number       // revision the patch was computed against
  [key: string]: unknown     // payload, serializable only
}
```

Requirements:

- JSON-serializable (sent over the network, stored, replayed).
- Has an inverse, used by undo/redo and by rollback of rejected changes.
- Carries `baseRevision`. The authority rejects or rebases a patch built on a
  stale revision.

Granularity:

- Elements and events: one patch per element or event.
- Painted terrain (control mask): **per region** patches (rectangles), never
  full-map pixels.

### 4.2 Model API (sketch)

```ts
const model = createMapModel(data, { committer })

model.apply(patch)               // goes through the committer
model.state                      // current snapshot
model.revision
model.history.undo() / redo()
model.subscribe(cb)              // framework-neutral (no RxJS)
```

Observables are exposed through a minimal `subscribe(cb): unsubscribe`, so they
plug into Angular signals, Vue, React or CanvasEngine without imposing RxJS.

### 4.3 Batches (atomic transactions)

Some changes only make sense together, e.g. "remove the tree **and** add the
loot icons". A batch is applied atomically:

```ts
model.apply([
  { type: 'element.remove', id: treeId },
  { type: 'event.add', id: 'wood-1', graphic: 'wood-icon', x, y },
])
```

- A batch gets a **single revision**, so a client that connects at any moment
  sees either the state before or after, never in between.
- Its inverse undoes the whole batch at once.
- A rejected intent inside a batch rejects the whole batch.

### 4.4 Element data

Elements carry an optional serializable `data` payload, modified by patches
(`element.data`). It holds per-element gameplay state, e.g. the number of
remaining hits on a tree.

- Advantage: it survives late joins and saves, and travels with the batch.
- Trade-off: map data and gameplay data are mixed. Only state that must be part
  of the map's persistent truth belongs there; the rest stays in game code.

### 4.5 Transient effects (not part of the model)

Purely visual, short-lived changes must **not** go through the model, or they
would be persisted, undoable and replayed to late joiners. Examples: an element
shaking, a flash, a puff of dust.

```ts
view.effects.play(treeId, 'shake', { duration: 300 })
```

- Effects are broadcast by the server as messages and animated by the
  renderer; they are forgotten afterwards.
- They are implemented as renderer hooks (section 10), with a small registry of
  named effects that games and skins can extend.

## 5. Committers

The committer is the only part that knows *where* an intent becomes a fact. The
renderer and the tools never know which one is in use.

| Committer | Where the fact is created | Use |
| --- | --- | --- |
| `localCommitter` | Immediately in the browser; optional `persist(patches, revision)` for API saves | Standalone editor |
| `remoteCommitter` | On the server, which numbers the revision and broadcasts to all clients | Gameplay |

Authority rules for gameplay:

- The client sends **intents**, never patches.
- The server runs the pipeline, then applies, then broadcasts.
- The client replays the same pipeline locally, only to preview (ghost valid /
  invalid). The server never trusts that result.
- No optimistic prediction in the first version. It can be added later without
  changing the public API (the inverse patch already exists).

Persistence in the editor sends incremental patches, with a periodic snapshot.

### 5.1 Multiplayer (MMORPG)

The `remote` committer already gives "one player changes the map, everybody sees
it". A shared MMORPG map adds concerns that the rendering layer does not solve:

| Concern | Proposal |
| --- | --- |
| **Server persistence** | A broadcast patch is not a save. The server stores the modified state per map (snapshot + patches since it). On Cloudflare (`samples/cloudflare-mmorpg`) this goes through the map instance's storage; to be verified. |
| **Late joiners** | A client that connects receives the current snapshot plus the patches since its revision, not only future patches. The catch-up protocol is based on `revision` and must be specified. |
| **Concurrency** | The server is sequential. Two players placing a tree on the same spot: the first wins, the second gets a structured rejection (`occupied`). The UI must handle rejections. |
| **Permissions and abuse** | Who may change what, and where. The game owns the policy through the pipeline, but the package ships ready-made steps: `ownerOnly`, `rateLimit`, `protectedZone`, plus an action log to revert a player's changes. |
| **Bandwidth** | Group brush strokes into one patch per stroke (never one per pixel) and throttle. |
| **Instanced or shared map** | A design choice that changes storage and permissions: per-group instances keep changes local, a shared map makes them persistent and global. |

Elements in multiplayer are realistic in milestone 1. Painted terrain in
multiplayer depends on the terrain feasibility gate (section 13).

## 6. Features

A feature is a self-contained, opt-in capability. It groups: the intents it can
express, an optional tool, its rendering, and its skin. Rendering and tool are
separable: a game shows water without being able to paint it.

```ts
const tilling = defineMapFeature({
  id: 'tilling',
  requires: ['terrain'],               // explicit dependency, clear startup error
  intents: { 'tilling.till': (i) => ({ type: 'terrain.paint', layer: 'soil', ...i }) },
  pipeline: [snapToGrid(32), requireTerrain(['grass'])],
  tool: ({ view }) => ({ onPointerDown: (p) => view.submit({ type: 'tilling.till', x: p.tileX, y: p.tileY }) }),
  skin: TillingCursor,
})
```

Rules:

- Features are passed as **imported objects**, never as strings, so unused ones
  are tree-shaken. Example: `features: [terrain(), placement({ catalog })]`.
- A feature declares its `requires`. A missing dependency fails at startup with
  an explicit message ("placement requires elements"), and lets Studio explain
  why a tool is unavailable.
- Built-in features and third-party features use the same `defineMapFeature`
  contract. Studio gets no private API.

Planned built-in features: `terrain`, `liquids`, `elements`, `events`,
`selection`, `history`, `placement`.

### 6.1 Planned extensions (not in milestone 1)

Listed so that the seams of 3.4 are justified. None of these is built before its
milestone.

**Pixel-precise terrain** (milestone 2). The terrain is a control mask with a
material palette, not a tile grid, matching what `render-map2d` already expects
(`controlTexture`, render modes `hard`, `fade`, `nine-slice`, `water`, `custom`,
transitions, stroke-based morphology).

```ts
const terrain = defineTerrain({
  grass: { texture: '/img/grass.png', mode: { type: 'fade', width: 18 }, priority: 1 },
  water: { texture: '/img/water.png', mode: { type: 'water', foam: true }, priority: 3, collision: true },
})

defineMap(assets, {
  id: 'forest', size: [2560, 1920],            // pixels
  terrain: terrain.layers([
    paint.fill('grass'),
    paint.circle('water', { x: 800, y: 600, radius: 180 }),
    paint.stroke('road', { points: [[0, 1400], [900, 1380]], radius: 28 }),
    paint.mask('/img/forest-mask.png', { palette: { '#00ff00': 'grass' } }),
  ]),
})
```

- Shapes, strokes and mask images are ways to **write** the mask; the model
  stores the `controlTexture` (section 16, question 10, covers keeping the operations).
- Runtime edits are region patches (one patch per brush stroke).
- Materials with `collision: true` produce collision polygons from the mask,
  which must be updated incrementally on a patch.
- A map is either tile-based (milestone 1) or mask-based (milestone 2); the
  `terrain` feature declares which one it needs.

**HD-2D rendering** (milestone 2 or later). The look of games like Octopath
Traveler, approximated in 2D with Pixi:

| Effect | Approach |
| --- | --- |
| Detailed background, crisp sprites | Mask terrain with per-material `renderingStyle` (`pixel-art` / `hd-2d`, already in the terrain types) |
| Tilt-shift depth of field, bloom, color grading | A `postFx` feature: a stack of post-processing filters per map or game state |
| Dynamic lights and shadows | Extension of the existing lighting (ambient, spots, sprite shadows) |
| Walking behind objects | Y-sorting plus element depth (already reserved in 3.4) |
| Layered parallax, light perspective | Depth layers and optional mesh distortion |

Real 3D camera and volumes are out of scope (Pixi is 2D). The `postFx` feature
must also run in the editor (with a switch, since it hinders precise work) to
keep WYSIWYG.

```ts
features: [elements(), terrain(), lighting(),
  postFx({ tiltShift: { focus: 0.55, blur: 6 }, bloom: { threshold: 0.7, strength: 0.4 } })]
```

**Other candidates**: new tools (lasso, symmetry brush), collaborative editing
(the patch log already supports it), time-of-day driven by game state.

## 7. Pipeline (variable logic)

Any logic that differs between contexts is a chain of middlewares, in the Koa
style. A step may modify the intent, reject it with a reason, or pass it on.

```ts
placement({
  pipeline: [
    snapToGrid(32),
    requireTerrain(['grass', 'dirt']),
    maxCount('oak', 5),
    (intent, ctx, next) => (ctx.actor.inventory.wood >= 2 ? next() : ctx.reject('not-enough-wood')),
  ],
})
```

- Free editor: `[snapToGrid(16)]`. Strict game: add the rules.
- A rejection is structured (`{ ok: false, reason }`) so the UI can show the
  reason and the server can log it.
- The **same pipeline** is defined once in a shared module and runs on both
  sides (client preview, server validation).
- Painting tools have their own pipeline (radius, forbidden zones).

## 8. Catalog

For builder games, what can be placed is data, independent of Studio tilesets:

```ts
const catalog = defineCatalog([
  { id: 'oak', sprite: 'tree-oak', footprint: [2, 2], pipeline: [/* rules */] },
])
```

Studio supplies a rich catalog from its tilesets; a game supplies three trees.
Same structure.

## 9. Interaction and skins

The interaction layer is **headless**: it publishes observable state (hovered,
selected, dragging, ghost position and validity) and consumes intents. Skins
are replaceable CanvasEngine components that read this state.

```ts
selection({ skin: studioSkin() })                 // handles, dashed frame, guides
placement({ skin: gameSkin({ ghost: { valid: 0x66ff66, invalid: 0xff5555 } }) })
selection({ skin: { frame: MyGlowSelection } })   // partial custom skin
```

Modes (`play`, `edit`, `inspect`) are sets of active tools, not separate
engines. They can be layered (play the hero while a modifier key enables drag).

## 10. Hooks

The renderer and the features expose typed, side-effect-free extension points:
`resolveElementSprite`, `onBeforeRenderElement`, `onTerrainTileRendered`,
per-element filters and shaders, named transient effects (4.5) and custom
terrain presets (already supported by `render-map2d`).

## 11. RPGJS v5 integration

Follows the existing conventions: no decorators, separate `/server` and
`/client` entry points, `provideXxx(options)`, `defineModule` for game logic.

```ts
// shared/placement.ts   (rules written once)
export const catalog = defineCatalog([/* … */])

// server.ts
export default createServer({
  providers: [
    provideMapBuilder({
      features: [terrain(), liquids(), elements(), placement({ catalog })],
    }),
    provideServerModules([builderServer]),
  ],
})

// client.ts
startGame({
  providers: [
    provideMapBuilder({
      features: [terrain(), liquids(), elements(), placement({ catalog, skin: gameSkin() }), selection()],
    }),
    provideClientModules([builderClient]),
  ],
})
```

Constraints from the module guide:

- `server.ts` is never imported from `client.ts`; shared code lives in `shared.ts`.
- Authoritative validation stays on the server, even though the pipeline also
  runs on the client.
- Standalone mode runs the server in the browser: the same `server.ts` must work
  without a network, using the in-process committer. No secrets in the bundle.

## 12. Integration outside RPGJS (Angular)

The core has no RPGJS or Angular dependency.

```ts
model = createMapModel(data, { committer: localCommitter({ persist: (p, rev) => api.save(id, p, rev) }) })
view  = createMapView({
  model,
  features: [terrain({ edit: true }), liquids({ edit: true }), elements({ edit: true }),
             placement({ catalog, pipeline: [snapToGrid(16)] }),
             selection({ skin: studioSkin() }), history()],
})
await view.mount(hostElement)
view.tools.activate('brush')
```

A small adapter turns `subscribe(cb)` into Angular signals. Panels, toolbar and
assistant of Studio only listen to `selection`, `history` and submit intents.

## 13. Migration plan

The work is split into **two milestones separated by a decision gate**. The
first milestone proves the concept on elements and events, which are the
simplest and most valuable part. The second one (painted terrain) is the
riskiest, and is only started once measurements justify it.

Every exit criterion below also requires the typing and unit-test conditions of
section 14 for the code introduced in that step.

### Milestone 1 — Elements and events (steps 0 to 5)

Scope: `model`, committers, pipeline, `elements`, `events`, `selection`,
`placement`, skins, RPGJS integration and a local POC. Painted terrain, liquids
and morphology **stay in the existing editor** during this milestone.

| Step | Content | Exit criterion |
| --- | --- | --- |
| 0 | This specification, reviewed. | Spec approved. |
| 1 | Package skeleton; **`MapDefinition`, `MapSource`, `AssetResolver`** (3.3); `model`, patches, batches, `element.data`, inverses, revisions, history, `localCommitter`. Port existing history tests. | Runs under Node, no DOM; a map loads from code and from a JSON source. |
| 2 | `renderer` on CanvasEngine for **elements and events**, plus the transient effects channel (4.5). Reference snapshots of the old editor and game render taken **before** porting each type. | Identical pixels, or documented accepted diff. |
| 3 | Interaction: picking, selection, drag, placement pipeline, ghost, skins. | `play` and `edit` coexist on one scene. |
| 4 | RPGJS integration: `/server`, `/client`, `remoteCommitter` (intent, policy, patch, broadcast, rejection with reason). Incremental update of element hitboxes and event positions on patch. Server persistence and late-join catch-up (5.1). | Server rejects a forged client patch; moving an element updates its collision; a late joiner sees the current state. |
| 5 | Local POC in `playground/` with three scenarios and two map sources (code and JSON): **gameplay** (lever moves an element), **builder** (ghost, strict rules, then free edit), **tree cutting** (hits make the tree shake, then a batch removes it and adds loot events). Plus a standalone-mode run. | The three scenarios work end to end, on both sources. |

#### Step 1 implementation notes

Decisions taken while implementing step 1 (`packages/map-builder`, sub-path
`/model`), which refine the sketches above:

- **Package**: private and versioned `0.0.0` until the API is validated (step 6).
  A changeset records each step.
- **World in pixels**: `MapDefinition.size` is `[width, height]` in pixels;
  `tileSize` is optional. Tile layers are deferred to the `terrain` feature.
- **Depth**: `element.depth = { z?, anchorY?, height? }`, reserved in the format
  and editable with `element.update`.
- **Open patch registry**: `PatchRegistry` is a TypeScript interface that
  features extend by declaration merging on `@rpgjs/map-builder/model`; runtime
  handlers are registered with `createMapModel({ patchHandlers })`. Handlers are
  pure and return `{ ok, state, inverse }`; they never throw.
- **Rejections are values, not exceptions**: `apply` returns
  `{ ok: true, revision, patches, inverse } | { ok: false, rejection }`, with an
  open `code` and the `patchIndex` of the culprit.
- **Sync or async by type**: `MapModel<R>` returns `R` from `apply`.
  `localCommitter` gives `ApplyResult`, a remote committer will give
  `Promise<ApplyResult>`. A committer is `attach(host)` + `commit(request)`; the
  host's `integrate()` is the only way to change the model.
- **Revisions**: one per successful `apply`, a batch included. An authority can
  impose the next revision (`revision-gap` otherwise). `baseRevision` is checked
  per patch; `onStale: "reject" | "rebase"` chooses the policy.
- **History**: inverse patches, not state snapshots (the Studio history keeps
  one snapshot list per layer). It records local changes only, strips
  `baseRevision` from what it stores, and replays undo and redo *through the
  committer*, so they are persisted and broadcast like any change. `coalesce`
  merges a continuous edit (a drag) into one step; `group()` is synchronous;
  default limit 50.
- **Canonical form**: an empty `data` object is omitted. Unknown fields are
  preserved at every level.
- **Known limits**: element lookup is linear (an index will come with the
  renderer if measurements justify it); a coalesced drag keeps every move in its
  undo entry (patch compaction later); history entries become stale if someone
  else removes the element they refer to (undo then returns a rejection).

#### Step 2 implementation notes

`renderer` and `features` sub-paths of `@rpgjs/map-builder`. What was decided
while implementing them:

- **Reference snapshots are geometry, not pixels.** They were frozen from the
  Studio renderer in a separate, earlier commit
  (`packages/studio/src/map-renderer/map-builder-references.spec.ts`, fixture
  `packages/map-builder/src/renderer/__references__/studio-elements.json`). For
  15 representative Studio elements they record where each sprite part is drawn,
  which source rectangle it shows, the scaled hitbox and the depth sort key. A
  Studio spec fails if the Studio renderer stops matching the file, and the new
  renderer is checked against the same file. The test environment has no GPU
  (jsdom with a mocked WebGL), so a true pixel comparison is left to the POC of
  step 5, in a real browser.
- **Documented difference.** Studio cuts an element into several parts with its
  own drawing rules (repeat-axis, edge-repeat, frame-9slice). That segmentation
  stays in Studio and reaches the renderer through `resolveElementSprite`; for
  those cases the parity test checks that the parts are placed, sorted and
  bounded exactly as Studio does.
- **The renderer is a PixiJS container** (`view.root`), described by plain data
  (`SceneNode`) and reconciled patch by patch. CanvasEngine renders to PixiJS, so
  it hosts the view with the `mount` + `componentInstance` pattern the repository
  already uses for raw PixiJS children (`attachMapView`). `pixi.js` is a peer
  dependency; `/model` and `/interaction` do not import it (`/features` does, for
  the skins of the editing features, from step 3 on).
- **Model additions.** `MapElement.scale` (a number or `[x, y]`, editable with
  `element.update`) and `AssetDescriptor.frame` were needed to express Studio
  elements. Without a `frame`, `size` is also the size of the image; an asset
  declaring neither is measured once loaded.
- **Features** have a rendering contract (`describeAll`, `describeOne`,
  `affected(patch)`), an `apiVersion` and `requires`, validated at startup.
  `elements()` and `events()` use the same `defineMapFeature` as third parties.
  `affected` makes updates incremental; `"all"` re-describes a whole feature for
  patches it does not understand.
- **Transient effects** (`view.effects`) never touch the model. They are driven
  by `tick(deltaMs)`, never by the wall clock, and never throw: an unknown effect
  or element ends at once with a status. Broadcasting them to other clients is
  part of step 4.
- **Events** are drawn only when they have a `graphic` that is a known asset.
  Markers for the editor arrive with the skins (step 3).
- **Known limits.** Ties in the sort key follow insertion order. Culling hides
  containers but does not yet avoid creating them. Terrain, lighting and
  post-processing stages exist as empty containers and are filled in milestone 2.

#### Step 3 implementation notes

The headless layer is `@rpgjs/map-builder/interaction`, the visuals are
`@rpgjs/map-builder/skins`, and `selection()`, `placement()` and `history()` join
`elements()` and `events()` in `/features`.

- **Intent, pipeline, patch.** An intent is registered with `registerIntent`
  (`resolve` to patches, optional `footprint`). `submit` runs the pipeline, resolves,
  then calls `model.apply`: several intents are one atomic batch. A refusal is the
  same `{ ok: false, rejection }` as a model rejection, with the reason of the step as
  `code`, and is kept in `state.lastRejection`. `IntentRegistry` is open like
  `PatchRegistry`.
- **Pipeline steps are synchronous and pure** (`PipelineStep<K>` is typed on the
  intent it receives), so the same chain previews on the client and validates on a
  server. `/model` and `/interaction` do not import PixiJS, which is what makes the
  server side of step 4 possible. Provided: `snapToGrid`, `withinMap`, `requireFree`,
  `maxCount`, `minDistance`. A step sees `ctx.footprint(intent)`, the space the intent
  would take, computed with the same description the renderer uses. Elements moved
  together are left out of each other's obstacles.
- **Tools, modes.** A tool belongs to modes and may be gated (`when`, typically a
  modifier key); the first tool that takes a press also gets the moves and the release.
  `play` and `edit` coexist: `playTool` plays on a plain click while the selection tool
  answers to Alt, on the same scene and model. `inspect` is `hoverTool`. The spec's
  `view.tools.activate(name)` is replaced by modes (`interaction.setModes`).
- **Selection tool**: hover, click, shift, rubber band, drag, Delete. A drag is
  committed on release by default (works with any committer, Escape cancels for free);
  `drag: { live: true }` applies each move with a unique `coalesce` key, so it is one
  undo step and Escape takes it back with one `undo()`.
- **Placement**: the `element.place` intent, a catalog, a ghost that previews through
  the same pipeline (it sits where the steps put it, and says why when it cannot be
  placed), ids numbered per item and consumed only on success. Catalog items have no
  `footprint` (the spec's `[2, 2]`): the space comes from the asset and its hitbox.
  `maxCount` counts by asset, not by catalog id.
- **Skins** are factories `(context) => { update, tick?, destroy }` per part
  (`selection`, `hover`, `drag`, `marquee`, `ghost`), replaceable one by one and drawn
  in the `overlay` stage. `defaultSkin` is sober, `gameSkin` has a halo, game colours
  and a pulsing ghost. The spec's `studioSkin` belongs to Studio.
- **Features gained a `setup(host)`** that registers intents and tools, mounts skins and
  returns an `api`, exposed as `view.<id>` and typed by the list of features. A feature
  id cannot be a name the view already uses.
- **Pointer events are wired only when a feature has something to interact with**
  (`interactive` overrides): a view that only draws never intercepts the clicks of a
  game. Moves use `globalpointermove`, so a drag survives leaving the map.
- **Known limits.** Steps cannot be asynchronous (a remote check comes back as a
  committer rejection). Not yet provided: `requireTerrain` (milestone 2), `ownerOnly`,
  `rateLimit`, `protectedZone` (step 4). Picking uses drawn bounds or hitboxes, not
  pixels. A drag of several elements does not yet draw the group's own box.

#### Step 4 implementation notes (framework-neutral core)

The authority and its client are independent of RPGJS: `/protocol`, `/authority` and
`/remote`. The RPGJS providers (`/server`, `/client`) sit on top of them.

- **The client asks, the authority decides.** `controller.submit` passes the *intents*
  along with the patches it resolved; a remote committer sends the intents and ignores the
  patches. Patches are only accepted from a client for which `trustPatches` says yes, which
  is how an editor can undo on a shared map. The default is never.
- **Messages** (`protocol`): `sync`, `intent`, `patches` from the client; `snapshot`,
  `patches`, `rejected`, `synced`, `effect` from the authority. Both directions are
  validated (`parseClientMessage`, `parseServerMessage`): shape, size limits, JSON only.
  The request id goes **only to whoever asked**, so a client recognises its own change and
  never sees another's id.
- **Ids are given by the authority.** The placement tool no longer sends an id (the
  intent is resolved where it is decided), and reads it from the result. This replaces the
  client-side numbering of step 3 for shared maps.
- **Authority**: one model (without history), one headless interaction controller with the
  same intents and pipelines, a log of recent changes (default 512), per-session `send`
  (it knows nothing of sockets). `connect` sends the map at once; `sync` answers with the
  missing changes, `synced`, or a snapshot when the client is too far behind or ahead.
  Server-side code changes the map with `apply` (trusted, no pipeline) or `submit` (for an
  actor, with the pipeline), and shows effects with `effect`.
- **Remote committer**: a promise per request, with a timeout; the change comes back as a
  `patches` message, integrated in order. A change that answers one of our requests is
  recorded in the history, others are not. A hole in the revisions makes it ask again
  (once, not at every message), a repeat is ignored, a change that does not fit makes it
  ask for the whole map. A snapshot replaces the state through `host.reset`, which clears
  the history and makes views rebuild (`MapChange.reset`). Listening starts when the committer
  is created, so nothing sent while the model is being built is lost.
- **Persistence**: `MapStore` (`load`, `save`, optional `append`), `memoryMapStore`,
  `restoreMapAuthority`. The authority writes the starting snapshot itself when the store
  may not have one, appends each change, and writes a snapshot every `snapshotEvery`
  revisions or `saveDelayMs` after the last change. Writes are queued in order and failures are
  reported, never thrown. A log with a hole is refused rather than guessed.
- **Pipelines for a shared world**: `ownerOnly`, `rateLimit` (counted per actor, weakly held,
  a preview is not counted: `PipelineContext.preview`), `protectedZone`
  (`PipelineContext.scene` is everything drawn, `nodes` only what can be in the way).
- **Known limits.** No limit on how often one client may `sync`, nor on connections: that is
  the job of the transport. The log is in memory (a restart sends snapshots to clients that were
  behind). A server has no image to measure, so assets must declare a `size` or a `frame` for the
  authority to know footprints. Undo of another player's change is not coordinated.

#### Step 4 implementation notes (RPGJS integration)

`provideMapBuilder` exists twice, as `/server` and `/client`, following the `createModule` pattern
of the other packages (no decorators, `defineModule`, `provide…`). `@rpgjs/common`,
`@rpgjs/server`, `@rpgjs/client` and `canvasengine` are optional peer dependencies, and the package
is built after them.

- **Transport**: one socket event (`map-builder`). Server: `player.on` (bound once per player),
  `player.emit` per connection. Client: `socket.on` / `socket.emit`. Every message carries the id
  of its map in an envelope, so a player who changes map never applies the old map's changes.
- **Server**: an authority per `RpgMap` (kept in a `WeakMap`, created in `onLoad`, which RPGJS runs
  again on updates and restores, so everything is idempotent). Joining connects the player and
  sends the map. **`map.onLeave` is not called on a `changeMap`**, so a connection ends when the
  player joins another map, and an `send` to a player who is no longer on the map drops them.
- **Colliders** use `replaceStreamedStaticHitboxes` / `clearStreamedStaticHitboxes`, public on the
  server room and on the client scene, with one namespace per element. RPGJS has no public
  add/remove for static obstacles, and wipes them when the physics world is rebuilt, hence the
  re-application from `onPhysicsInit`.
- **Events**: map events become dynamic RPGJS events with an id prefix, created, teleported and
  removed in order (creation is asynchronous). RPGJS removes runtime events on a map update, so
  `onLoad` recreates them. The graphic of a map event is used as an RPGJS graphic.
- **Persistence**: `persist(map)` gives a `MapStore`. `roomStorageMapStore(map)` uses the storage of
  the room (a field outside the public types, flagged as such), `keyValueMapStore` any key-value
  storage. A store that fails makes the map non-modifiable and is reported.
- **Client**: a channel bound to the socket buffers what arrives before the scene is loaded, then
  `joinRemoteMap` builds the model, the view, the prediction colliders and the effects. Joining is
  triggered from several hooks because they are not all called in every setup (in the test
  harness `onAfterLoading` and `engine.onConnected` are not). The view is offered as a signal of
  PixiJS children for `EventLayerComponent`, which is what sorts it with the characters.
- **Tests** run the real server and client in memory (`@rpgjs/testing`) through the root Vitest
  config (`tests/rpgjs`, `pnpm test:rpgjs`). The harness creates a single client, so several
  players and map changes are tested with stand-ins for `RpgMap` and `RpgPlayer`.
- **Known limits.** The view is not mounted for you: a game puts it in its event layer (or uses
  `attachTo`); this is the part to check in a real browser in step 5. No `studioSkin`, no
  turnkey placement controls. A large map in a Durable Object key-value store may exceed the value
  size limit: write snapshots often or bring a store. Dynamic events are rebuilt one at a time.

What milestone 1 delivers on its own: a map usable without Studio (3.3), the
builder game, the living map (the server changes elements during play), the
tree-cutting style of game, and a shared element renderer.

#### Step 5 implementation notes (playground POC)

`playground/games/map-builder/` (port 5192): two maps (`forest` written in code, `meadow` in JSON) served by the same authority, and the three scenarios of the spec: a gameplay lever, a builder with ghost and strict rules then free editing, and tree cutting (shake, then removal and loot events). `src/scenarios.spec.ts` plays them end to end on both maps (31 tests), and the game was also checked by hand in a real browser (render, depth sorting with the hero, colliders, ghost, refusal, planting, drag and selection, map change).

Found while building it, and fixed in the package: the client view needs the engine step to run its effects (`engine.onStep`), and connections are tracked by player id because hooks do not always receive the same player instance (a player changing map was never disconnected from the previous authority).

Environment quirks, not related to the package: pixi 8.19 needs `optimizeDeps.include: ["pixi.js > @xmldom/xmldom"]` in the game's vite config (same issue in pressure-plate); the keyboard needs a first click on the page; `@rpgjs/testing` creates one client, so a second player is an authority session in tests; after a portal, the own player may display a stale position until the first input (RPG-JS client prediction), the server position is right.

#### Step 6 implementation notes (temporary link into the Studio runtime)

Scope: the Studio **runtime** of this repository (`packages/studio`, `draw-map-v2.ce`). The Angular editor lives in another repository and is not touched; it can use the same entry points.

- **Flag**: `mapBuilderRenderer: true` in the client global configuration (the Studio playground turns it on with `?mapBuilder`). Off by default; when off, the bridge is inert and `@rpgjs/map-builder` is never loaded (dynamic import). `@rpgjs/map-builder` is only a `devDependency` of `@rpgjs/studio` while the package is private.
- **Partition** (`map-renderer/map-builder-bridge.ts`): `studioOnlyReason` keeps on the Studio renderer every element with a shadow, a light spot, liquid submersion, a drawing rule, a ground-shadow extraction, no image, or while collisions are debugged. It asks with the same functions the Studio renderer uses, without using up the shadow budget. Everything else goes to the map builder. An element is drawn by exactly one renderer, in its original order.
- **Hosting**: the layer under the characters (`elementsLow`) must sort with them in the event layer, so it returns one container per element carrying its sort key (taken from the objects stage of a view); the two other layers return the root of a view. A layer destroys what it returned only two commits later, once the caller says it is mounted (`commit()`): the event layer keeps its own list of containers, and destroying one it still holds makes PixiJS throw.
- **Checked**: unit tests (partition reasons, geometry equal to Studio for every plain case of the frozen references, lifetime of the layer); in a real browser on a Studio project, the same map with and without the flag: 81 + 9 elements drawn by the map builder and none left behind, and 8 pixels out of 578,064 differ visibly (animated water), the hero masked.
- **Findings for the API**: the view needs no change to be hosted element by element (its node containers can be moved to another parent), but this relies on an internal detail; an official way to hand out node containers would be cleaner (decide with milestone 2). Nothing in the model had to change.
- **Found on the way**: reading `mapBounds()` synchronously in the render effect of `draw-map-v2.ce` made the whole map fail to draw (reactive reads in that effect change when it fires): read it only when needed. The Studio declaration build had been failing since step 2 (the reference snapshots spec uses Node types); specs are now excluded from it. A transient `updateRenderable` error appears a few times while a map loads, with and without the flag (the Studio renderer destroys containers the event layer still holds); not caused by this link, left alone.
- **Not covered yet** (milestone 2): shadows, lights, liquid submersion, drawing rules, terrain. After step 7, the duplicated code can go.

### Decision gate — terrain feasibility

Before committing to milestone 2, build a targeted prototype of **live editable
terrain on Pixi** and measure it. It is a prototype, not a deliverable.

Questions to answer with numbers:

- Can a brush stroke on the control mask re-render the affected region within a
  frame budget on a large map (tiles of 512 px, ~96 tiles max today)?
- Is the Pixi output close enough to the current Canvas 2D output (filtering,
  blending, sub-pixel precision) for the reference snapshots to pass?
- Does `render-map2d` plus workers keep the main thread free while editing?

Possible outcomes:

| Outcome | Decision |
| --- | --- |
| Performance and fidelity are acceptable | Proceed with milestone 2 as planned. |
| Acceptable only for display, not for live painting | Render terrain on Pixi, keep a dedicated painting path for the editor. |
| Not acceptable | Stop at milestone 1. Studio keeps its terrain editor; terrain is reused only for display. |

#### Result of the terrain gate

Prototype and measurements in `packages/map-builder/prototypes/terrain-gate/` (see its `RESULTS.md`). In short, on a 96-chunk synthetic map, in Chrome with a real GPU:

- **Fidelity: identical.** The kernel's pixels, Canvas 2D and Pixi WebGL differ by 0 on a whole chunk (nearest filtering, 1:1, opaque terrain). Partial updates, after hundreds of strokes across chunk borders, equal a fresh full render (0 different pixels).
- **Live painting: feasible with workers, not on the main thread.** The kernel costs about 290 ms per 512 px chunk and its cost follows the rendered area plus a margin of three tiles. With a `margin` option (added to `@rpgjs/render-map2d`) equal to the widest blend, a dab re-renders in about 12 ms (r=24) to 40 ms (r=64); on four workers the main thread stays at 16.7 ms frames and the stroke shows 13 to 50 ms after the pointer. A big brush needs the dirty rectangles coalesced (r=128: 94 ms instead of 228 ms and growing).
- **Three things the prototype showed that the spec did not say.** A changed mask changes pixels up to one blend radius outside the dab, so the dirty rectangle is the dab grown by the widest blend. Frames from several workers must be applied in stroke order, or stale pixels overwrite newer ones. The first render of a whole map takes 9 to 12 s on four workers, so it must be progressive.
- **Not covered**: one machine, synthetic scene without morphology, nine-slice or road presets; animated water per frame (stays on the current display path); low-end GPUs.

**Decision: proceed with milestone 2** (outcome 1 of the table, with live painting designed around a worker pool). Open question 2 (region patch format) is answered in this direction: a stroke patch (disc or polyline and a material) that every worker applies to its own copy of the mask.

### Milestone 2 — Terrain and Studio migration (steps 6 to 7)

| Step | Content | Exit criterion |
| --- | --- | --- |
| 6a | Terrain, liquids and morphology features on the renderer; region patches for the control mask. | Reference snapshots pass for every terrain type. |
| 6b | Temporary link into Studio (`link:` / `pnpm.overrides`, Vite alias) behind a feature flag, next to the old map. | Parity checked screen by screen. |
| 7 | Remove the duplicates (`drawing/*`, `studio-element-renderer`), strip Angular from rendering services, document, publish. | Old code deleted. |

If the gate leads to "stop at milestone 1", step 6b still applies to the part
that was migrated (elements, events, selection), and step 7 is limited to the
code that was actually replaced.

### Step 6a implementation notes (terrain)

`@rpgjs/map-builder/terrain` (data, patches, `defineTerrain`, intent, rules, brush; no Pixi, no kernel at runtime), `@rpgjs/map-builder/terrain-render` (the kernel inline or in a pool of workers) and the `terrain()` feature of `/features`. The gate's recommendations were followed.

- **Data**: `extensions.terrain` = materials (a palette: texture asset, render mode, priority, collision), transitions, morphology features and the mask. The mask is stored **by chunks of run-length encoded values** (base64 varints): a patch rewrites only the chunks it touches, the others are the same strings in the next state, and a flat chunk is not stored. The mask can be coarser than the world (`scale`): the kernel maps it.
- **Patches**: `terrain.paint` (a shape and a material, compact: it is what travels), `terrain.region` (a rectangle of values: the exact inverse of a paint, and the way to import), `terrain.materials` (append, or remove trailing materials the mask no longer uses: the mask stores positions) and `terrain.morphology`. A no-op paint has no inverse and no revision effect. Everything survives JSON; a bad patch is a rejection, never an exception.
- **Rendering**: `terrain()` cuts the map in 512 px chunks drawn on canvas textures (nearest, 1:1). A scheduler decides what to render: a change marks the chunks it touches with the smallest rectangle, what is on screen goes first, several renders run at once and **frames are applied in the order the renders started**, a chunk changed while it renders renders again. The rectangle re-rendered is the change grown by the widest blend, and the kernel margin is that blend (the `margin` option added to `renderTerrainRegion`): the pixels are identical to a render of the whole map, checked for every kind below and for edits made by strokes, dabs, batches, undo and redo.
- **What the prototype did not show, found here.** (1) The kernel computes nine-slice and preset overlays on the whole mask and caches them: the render host drops that cache on every mask change, and the lane marks of a road follow the whole road, so editing under `road-town-marked` (or a preset the package does not know) renders everything again. Overlays are not incremental in the kernel: making them regional is kernel work for later. (2) Each worker keeps the control image as RGBA: 4 bytes per mask pixel and per worker (100 MB for a 6144 x 4096 map at scale 1, times the number of workers): a coarser `scale` divides it. (3) A change that arrives while the backend is being given the terrain (palette change, snapshot) must be replayed afterwards: it is queued. (4) `requireTerrain` must read the region once: decoding a chunk per pixel made one stroke take three seconds in the browser.
- **Reference snapshots**: `features/__references__/terrain.json` freezes the pixels the kernel gives for 16 small maps, one per kind of terrain (hard, fade smooth/linear/sharp, the grass rim, nine-slice, water with and without border/foam, the presets grass-edge, carpet, road sidewalk and road marks, a transition rule, a hole, a wall, a half-resolution mask). The terrain feature, which assembles chunks, must give the same fingerprint. Regenerate on purpose with `UPDATE_TERRAIN_REFERENCES=1`. The references are those of the kernel, which the editor uses: they are what a pixel of the editor is. The runtime's own `StudioTerrainChunkRenderer` is a separate 4,500-line implementation that does not use the kernel; replacing it is step 7.
- **Editing**: `terrain({ edit: true })` registers the `terrain.paint` intent and `view.terrain.brush`; a press-drag-release is one undo step. Steps: `requireTerrain(["grass", "dirt"])`, `withinTerrain()`, `maxRadius(n)`. The authority takes `patchHandlers: [terrainPatchHandlers]` and the client `patchHandlers`, as for any feature that adds patches. Undo of a stroke from a client sends the inverse patches, which an authority only accepts from a trusted client.
- **Decisions**: `liquids` and `morphology` are not separate features for now: a liquid is a material in `water` mode (a hole filled with liquid is morphology data), and a feature that only forwards settings would be API without behaviour. The kernel's water animation is not run (the frame is static, as the gate said it must be).
- **Not done**: collision polygons from the mask (`collision: true` materials), animated water on the display path, `paint.mask(image)`, a `terrain.water` setting patch, regional overlays in the kernel, culling of chunk textures.

### Versioning

A changeset is added at each step (see `CONTRIBUTING.md`). The release-candidate
version switch required by `AGENTS.md` is handled at step 7, or at the end of
milestone 1 if the package is published before milestone 2.

## 14. Typing and testing requirements

Both are acceptance criteria of every step, not a final polish. A step is not
done until its types and tests are in place.

### 14.1 Typing

The public API is the product, so it must be strongly typed and **inferred**
rather than annotated by the user.

- `strict` TypeScript, no `any` in the public surface. `unknown` plus narrowing
  where the data is truly open.
- **Patches and intents are discriminated unions** on `type`. A feature
  registers its own intents, and the union is extended through the feature
  list, so `view.submit({ type: 'tilling.till', ... })` is checked and an
  unknown `type` fails to compile.
- `defineMapFeature`, `defineCatalog`, `defineMap` and `createMapView` **infer**
  their generics from their arguments (feature ids, intent payloads, catalog
  kinds). `placement.start('oak')` only accepts ids that exist in the catalog.
- `requires` is checked at the type level when possible (a feature that needs
  `terrain` is rejected if `terrain()` is absent), and at startup otherwise.
- `MapDefinition`, `MapSource`, `AssetResolver`, committers and pipeline steps
  are exported interfaces, so third parties can implement them without casts.
- Pipeline steps are typed on the **intent they receive**, so a rule for
  `placement` cannot be attached to a painting tool by mistake.
- Server and client entry points do not share runtime-only types: importing
  `/client` never pulls `/server` types or code.

### 14.2 Unit tests

Tooling follows the repository: **Vitest**, `*.spec.ts` next to the source, and
type tests with `expectTypeOf` run by `pnpm test:types`.

| Area | What is tested |
| --- | --- |
| **Model** | Every patch type applies correctly; every patch has an inverse and `apply(inverse(apply(p)))` restores the state; revision numbering; stale `baseRevision` is rejected or rebased. |
| **Batches** | Atomicity (all or nothing), single revision, whole-batch undo, a rejected step rejects the batch. |
| **History** | Undo/redo stacks, limits, interaction with batches. Existing editor history tests are ported first. |
| **Committers** | `localCommitter` calls `persist` with the right patches and revision. `remoteCommitter` is tested against an in-memory server: valid intent, rejected intent with a reason, forged patch, stale revision, broadcast to several clients. |
| **Pipeline** | Each built-in step in isolation; chain order; `next()` semantics; a step that modifies, rejects or passes; the same pipeline gives the same result on client and server. |
| **Sources** | `defineMap`, a JSON source and a Tiled source all produce an equivalent `MapDefinition`; `loadRegion` returns the right region; the Studio normalizer round-trips real Studio maps (fixtures). |
| **Features** | Dependency resolution and the explicit error for a missing `requires`; each feature's intents map to the expected patches. |
| **Multiplayer** | Late-join catch-up from a snapshot and a revision; two simultaneous conflicting intents (first wins, second rejected); `rateLimit`, `ownerOnly`, `protectedZone`. |
| **Interaction** | Tool state machines (hover, select, drag, ghost validity) driven by synthetic pointer events, without rendering. |
| **Renderer** | Reference **snapshot** tests per rendered type, taken from the old editor and game output **before** porting (see step 2); culling; incremental update touches only the affected objects. |
| **Public types** | `public-api-types.spec.ts` with `expectTypeOf` for inference of intents, catalog ids and feature generics, plus `@ts-expect-error` cases that must fail to compile. Added to `tsconfig.typetests.json`. |

Principles:

- The model, pipeline, committers and sources run **under Node, without a DOM**.
  If a test needs a browser, that is a sign the logic is in the wrong layer.
- Pure logic is tested directly. Rendering is tested through snapshots and
  through observable scene state, not by pixel-peeking by hand.
- A bug fix lands with a regression test.
- The POC scenarios of step 5 double as end-to-end tests where possible
  (gameplay, builder, tree cutting, on both map sources).

## 15. Risks

| Risk | Mitigation |
| --- | --- |
| Rendering diverges between editor and game | Reference snapshots before porting each type. |
| Live editable terrain is slow or differs from Canvas 2D | Deferred to milestone 2; decided at the terrain feasibility gate, from a measured prototype. |
| API frozen too early | Mark experimental until step 6. |
| Studio blocked by the migration | Feature flag and coexistence, never a big bang. |
| Server code leaking into the client bundle | Separate `/server` and `/client` entry points. |
| Third-party feature contract becomes a burden | Keep `defineMapFeature` minimal; expand only when Studio needs it. |

## 16. Open questions

1. **Package name.** `@rpgjs/map-builder` suggests a construction game although
   it also covers plain display. Alternatives: `@rpgjs/map`, `@rpgjs/map-kit`.
2. **Region patch format for painted terrain.** Raw mask rectangles, or a
   compressed representation? Decide after measuring in step 2.
3. **Permissions.** Does the package model editing roles (everyone, a game
   master), or does the game own them through the pipeline? Current proposal:
   the game owns them through the pipeline.
4. **Terrain edited in gameplay.** Dig, till or change ground at runtime, or
   elements only? It changes the size of the terrain patch work.
5. **`render-map2d` naming.** Keep the name and clarify its role in the README
   as a "terrain pixel kernel", or rename it. It stays a separate package.
6. **`MapDefinition` as single source of truth.** Is it the one representation,
   or does it synchronize with RPGJS's `RpgMap`? Current leaning: single source,
   to be confirmed in step 4.
7. **`element.data` boundary.** Which state belongs to the map's persistent
   truth, and which stays in game code?
8. **Shared vs instanced maps in multiplayer** (5.1), and where server
   persistence lives on each deployment target.
9. **Asset boundary.** How much of Studio's asset logic (drawing rules, element
   sizes, spritesheets) can be injected through hooks without leaking into
   `AssetResolver`.
10. **Terrain mask resolution and operations.** Fixed 1:1 with world pixels, or
    configurable per map with a default close to the current render tile setup?
    Keep the original operations (circle, polygon, stroke) next to the rasterized
    mask so a shape can be moved later, or keep only the mask?
11. **Extension data ownership.** Who owns the schema of `extensions[...]` when a
    third-party feature is removed: preserved untouched (current proposal) or
    dropped on save?
