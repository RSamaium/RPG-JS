# Maps API

Use this reference for map CRUD and map-specific secondary operations.

## Core endpoints

- List maps: `GET /api/maps`
- Create map: `POST /api/maps/v2`
- Read one map: `GET /api/maps/:mapId`
- Read one game/runtime map: `GET /api/game/maps/:mapId`
- Update map: `PUT /api/maps/:mapId`
- Delete map: `DELETE /api/maps/:mapId`

## Secondary endpoints

- List events on a map: `GET /api/maps/:mapId/events`
- Update map params/settings: `PUT /api/maps/:mapId/params`
- Update tileset: `POST /api/maps/:mapId/update-tileset`
- Update thumbnail: `PUT /api/maps/:mapId/thumbnail`
- Update world position: `PUT /api/maps/:mapId/world-position`
- Generate a new map with AI: `POST /api/maps/generate`
- Complete an existing map with AI: `POST /api/maps/:mapId/generate`
- Prepare or execute the durable map workflow: `POST /api/map-generations`
- Poll the durable map workflow: `GET /api/map-generations/:instanceId`
- Retry a failed and refunded workflow: `POST /api/map-generations/:instanceId/retry`
- Read legacy/diagnostic drawing references: `GET /api/map-generations/:requestId/drawing-plan`
- Finalize a legacy prepared run: `POST /api/map-generations/:requestId/finalize`
- Cancel it: `DELETE /api/map-generations/:requestId`

## Workflow

1. If the user refers to a map by name, list maps first or fetch the target map to resolve the real `_id`.
2. For a settings change limited to map parameters, use `PUT /api/maps/:mapId/params` instead of replacing the whole map.
3. For event lookup on a map, prefer `GET /api/maps/:mapId/events` before editing event placement.
4. If map params require media IDs such as `backgroundMusic` or `backgroundAmbientSound`, search media first with `GET /api/media?query=<search>`.
5. If the required media does not exist and would need AI generation, ask for user permission before consuming credits.

## Durable map-generation workflow

Specify visual style in the client-supplied `objective`, for example
`"An oasis with a market. Visual style: Cel shading."`. Natural-language style
instructions in any language take precedence over the fallback: high-definition
pixel art is used only when no style is specified. There is no separate `style`
API field. Layer separation and generated terrain/wall atlases preserve the
concept's art direction. An attached image used directly as the concept keeps its
existing appearance and bypasses concept generation, including this fallback.

Use `POST /api/map-generations` with `action: "prepare"`. A create payload contains `mode: "create"`, `name`, optional `description`, optional `assistantConversationId`, `objective`, `kind`, `width`, `height`, and optional `terrainMediaId` / `elementTilesetMediaId`. It may also contain `followUpPlan`; its optional `music` suggestion is `{ id, title, description, prompt }`, and each of its three event suggestions accepts an optional pixel `position: { x, y }` strictly inside `width * 48` by `height * 48`. Existing clients may omit the plan, music, conversation id, or positions. When description is omitted, the server persists the objective as its fallback. An edit payload contains `mode: "edit"`, `scope: "full-map" | "partial-edit"`, `mapId`, a base64 `currentMapImage`, `objective`, `kind`, optional media IDs, and `regions`. A partial edit requires one to eight normalized polygons; a full edit requires an empty region list.

Preparation does not charge credits. It returns a UUID `confirmationId`, an estimate, expiry, and exact confirm/cancel choice IDs. After explicit user confirmation, call the same endpoint with `{ "action": "execute", "confirmationId": "..." }`. Poll the returned `instanceId`; do not poll tightly. Use `finalized: true` together with `mapId` to detect a fully persisted result; workflow `status: "complete"` alone is not sufficient. The result also includes `ignoredElementCount`. An `errored` or `terminated` response exposes `creditsRestored: true` after the debit is refunded and `retryAvailable: true` when the prepared inputs remain reusable. Only then may a client call `POST /api/map-generations/:instanceId/retry`; it returns a fresh instance and does not require another confirmation.

The server generates the concept, runs the configured layerizer, audits every semantic layer once, separates disconnected elements while preserving their map rectangles, converts masks into terrain and morphology, and persists the final RPGJS map. At most one existing terrain and one existing element set are accepted; both are optional. A combined layer such as grass plus dirt path exposes distinct `terrainPatterns`; discrete rocks and contained decorative water such as fountains or ornamental ponds are positioned elements. Gameplay-scale rivers, lakes and flooded passages remain water holes with `fillTextureId`. Large fitted carpets become terrain with the procedural `carpet-border` mode, while loose rugs remain low elements. Structural walls persist an exact top/face/trim/void control texture plus collision-only morphology; organic or failed segmentation keeps the procedural morphology fallback. A selected terrain is reused only when its metadata covers every required pattern, otherwise a complete 4×4 atlas is derived from its style. A partial edit inherits current assets and merges wall pixels outside its normalized regions.

No separate drawing phase follows execution. A client may poll until `complete` and then navigate to the returned map. Do not read `drawing-plan`, redraw terrain or morphology, or call `finalize` for a normal new workflow; those endpoints remain only for legacy or diagnostic integrations.

When a user selects a generated event suggestion, Studio forwards its optional
position to the compact event-map resolver. The resolver returns only map
identity, dimensions, start, and the chosen bounded position. Missing or
out-of-bounds positions use the map start; complete map layers are never loaded
into the event-creation conversation.

The fixed deployment cost is 45 credits. Failure refunds once and retains private intermediate artifacts until the run expires so a Cloudflare step can be restarted; deferred cleanup then removes them. Explicit cancellation cleans immediately. API retry starts a fresh attempt from the prepared inputs and charges that attempt normally. The older `/api/maps/generate` endpoints remain available, but new integrations should use the two-phase `/api/map-generations` workflow.

### Direct generation progress and preview

The intermediate Studio release uses `/generate-map` without a chat or GUI editor.
It supplies a visible editable objective for image-only input; the API still
requires `objective`. Keep the normal prepare/execute credit confirmation.
Concurrent confirmation claims return 409 before a second charge.

`GET /api/map-generations/:instanceId` also exposes `currentStep`,
`completedSteps` (empty for older runs), `previewAvailable`, and `finalized`.
Completed step names describe actual work; conditional steps may be omitted.
A committed run remains readable even when the Cloudflare workflow is no longer
retained. An unexecuted confirmation reports `status: "awaiting-confirmation"`.
The browser remembers the known instance id before confirming execution so a lost
HTTP response can be recovered through status without spending credits again.

Fetch an intermediate concept with
`GET /api/map-generations/:requestId/preview` only when `previewAvailable` is true.
This project-scoped endpoint streams an image with `Cache-Control: private,
no-store`; it returns 404 for unavailable/cleaned-up concepts and other projects.
Do not present the concept as the final rendered map. Use the saved map/editor
for the final preview and the existing game test URL for exploration.

Automatic collision-free spawn resolution is pending
https://github.com/RSamaium/RPG-JS/issues/367. Do not promise that every generated
map has an unobstructed center spawn.

## Payloads from schemas

### `PUT /api/maps/:mapId/params`

Fields supported by `mapParamsSchema`:

- `width?: number`
- `height?: number`
- `scale?: number`
- `backgroundMusic?: string`
- `backgroundAmbientSound?: string`

Music and ambience fields must use media `_id` values resolved through `/api/media?query=<search>`. Combat audio is configured at project, enemy, and skill level rather than on maps.

### `PUT /api/maps/:mapId`

This endpoint accepts partial section updates. Omitted fields are preserved. Send only the section that changed when possible:

- Start position only: `{ "startX": 0, "startY": 0 }`
- Events only: `{ "events": [{ "eventId": "...", "x": 10, "y": 20 }] }` or `{ "events": [] }`
- Terrain morphology only: `{ "terrainMorphologyLayer": { ... } }` or `{ "terrainMorphologyLayer": null }`
- Semantic generated walls: send `wallSurfaceLayer` together with base64 `wallSurfaceControlTexture`; send `{ "wallSurfaceLayer": null }` to remove the semantic visual layer
- Terrain only: send `terrain`, and optionally `terrainLayer` plus `terrainControlTexture`
- Elements only: send `elementsAlwaysLow`, `elementsLow`, and `elementsHigh`
- Tileset params only: send `baseTerrainId`, `tilesetId`, `terrainTilesetIds`, `elementTilesetIds`, `primaryTerrainTilesetId`, or `primaryElementTilesetId`
- Map entry workflow only: `{ "mapLoadBlockCollectionId": "..." }` or `{ "mapLoadBlockCollectionId": null }`

Useful fields from `mapSchema` when a full map update is needed:

- `name?: string`
- `description?: string`
- `assistantConversationId?: string` links a generated map to its Studio assistant conversation
- `data?: string`
- `params?: object`
- `weather?: object | null`
- `lighting?: { sun: { enabled: boolean, intensity: number } } | null`
- `waterAnimation?: { enabled: boolean, speed?: number, intensity?: number, direction?: number }`
- `mapLoadBlockCollectionId?: string | null`
- `events?: Array<{ eventId: string, x: number, y: number }>`
- `elementsAlwaysLow?: string`
- `elementsLow?: string`
- `elementsHigh?: string`
- `terrainLayer?: { version: 1, mode: "control-texture", width: number, height: number, tileSize: number, palette: string[], controlTexture: { fileName: string, encoding: "rgba8", terrainIndex: ["r", "g"], light?: "b", coverage?: "a", reserved?: "a" } }`
- `terrainMorphologyLayer?: { version: 1, mode: "terrain-morphology", width: number, height: number, tileSize: number, features: Array<{ id: string, kind: "hole" | "wall", params: object, strokes: Array<{ id: string, points: Array<{ x: number, y: number }>, radius: number }> }> }`
- `wallSurfaceLayer?: { version: 1, mode: "wall-surface", width: number, height: number, tileSize: number, materials: Array<{ id: string, label: string, topTextureId: string, faceTextureId: string, trimTextureId: string, baseTextureId?: string }>, controlTexture: { fileName: string, encoding: "rgba8", materialIndex: "r", role: "g", reserved: "b", coverage: "a" } }`
- `wallSurfaceControlTexture?: string` base64 PNG used with `wallSurfaceLayer` during updates; the API stores it and persists only the project-scoped filename
- `terrainControlTexture?: string` base64 `data:image/png` payload used with `terrainLayer` during map updates; the API stores it and writes the resulting `controlTexture.fileName`.
- `hitboxes?: array`
- `polygons?: array`
- `creationDetails?: { prompt?: string, mapStyle?: string, state?: string }`

`terrainLayer` is the shader terrain V1 contract. The control texture is stored as an RGBA8 media/storage file, with the terrain palette index encoded as `R + G * 256`. `B` is optional light data and treats `128` as neutral when present. `A` is terrain mask coverage for pixel brush strokes, with `255` as fully covered. Soft edges are computed from transition/blend metadata at render time. Legacy tile grids are normalized into `tileSize x tileSize` blocks at load time, but editor brush edits may update the control texture at world-pixel resolution.

Use `@rpgjs/render-map2d` when rendering this contract outside the built-in
runtime. `normalizeTerrainMap()` accepts the API map shape, while
`prepareTerrainMap()` receives already-decoded RGBA terrain/control textures and
optional namespaced preset callbacks. `renderTerrainRegion()` returns a
world-positioned RGBA buffer and accepts an optional deterministic `timeMs` for
liquid animation. The package performs no URL, file, DOM, Pixi, CanvasEngine, or
Angular work; those responsibilities remain in the caller adapter.

`terrainMorphologyLayer` stores hole and wall strokes in world pixels. Hole params support `depth`, `roundness`, `roughness`, optional facade `textureId`, optional bottom-fill `fillTextureId`, `fillHeight` clamped to `0..100`, and optional per-hole `waveIntensity`, `waveDirection`, and `waveSpeed`; `textureId` is not used as the bottom-fill fallback. Wall params support `height`, `roundness`, `roughness`, optional facade `textureId`, cap `surfaceTextureId`, rim `trimTextureId`, base `baseTextureId`, `renderMode`, and `wallStyle`. `wallStyle: "rock"` draws seamless stratified rock faces (unless `textureId` is set), a rock rim along the top edges and a soft contact shadow on the floor; Studio dug caves use it on a wall spanning the whole map, carved by erase operations. Studio also stores `rockTexture: "masonry" | "natural"` on rock walls (procedural face texture chosen in the editor, default `masonry`); the game renderer does not use it yet. When the cap is opaque (`surfaceTextureId` set), face parts over the wall top are not drawn, as in the Studio editor. The special value `__solid_black__` draws a solid black cutaway cap. A `collision-only` wall stays in collision but skips the procedural visual pass because `wallSurfaceLayer` is authoritative.

`wallSurfaceLayer` references a map-sized RGBA8 PNG. `R` selects `materials[R]`; `G` stores `0=void`, `1=top`, `2=face`, or `3=trim`; `B` is reserved; `A` is coverage. Studio fills each exact role mask with its dedicated repeatable texture, so it does not reconstruct wall bands from morphology strokes. The morphology eraser and undo/redo update semantic pixels and collision together.

`waterAnimation` defines map-level liquid animation defaults. `speed` defaults to `1`, `intensity` to `0.45`, and `direction` to `90`. Directions use clockwise screen-space degrees: `0` moves right, `90` down, `180` left, and `270` up. Direction values are normalized around the circle.

Filled holes animate independently. Their optional `waveIntensity` (`0..1`), `waveDirection` (degrees), and `waveSpeed` (`0.1..4`) params override the matching map-level `waterAnimation` value; omit a field to inherit the map default. Set `waveIntensity` to `0` to keep the color or texture fill visible without animated waves or refraction. Wave highlights derive their color from the local fill pixels, so colored liquids and textured fills keep their dominant hue instead of receiving a fixed blue tint.

Example map excerpt with a right-moving, stronger wave override for one filled hole:

```json
{
  "waterAnimation": {
    "enabled": false,
    "speed": 1,
    "intensity": 0.45,
    "direction": 90
  },
  "terrainMorphologyLayer": {
    "features": [
      {
        "kind": "hole",
        "params": {
          "fillHeight": 60,
          "fillTextureId": "lava-texture-id",
          "waveIntensity": 0.7,
          "waveDirection": 0,
          "waveSpeed": 1.5
        }
      }
    ]
  }
}
```

The excerpt omits the unchanged morphology metadata and strokes. The map-level `enabled` flag controls painted-water animation; filled holes animate automatically unless their effective intensity is `0`.

`lighting.sun` controls the map-level sun option. `enabled` toggles automatic sunlight shadows for walls, characters, and elements. `intensity` is clamped to `0..1`.

`mapLoadBlockCollectionId` points to a block collection executed by the RPGJS server `map.onJoin(player, map)` hook when a player enters the map. Use `null` to disable it. This workflow has a current player and map, but no current event; do not use `current_event` / `this event` targeting.

`GET /api/game/maps/:mapId` returns event placement data for runtime use. Event media references under `event.params.graphic`, `event.params.faceset`, `event.triggers[].graphic`, and `event.triggers[].faceset` are returned as hydrated media objects when the media exists, including `_id`, `id`, `type`, `fileName`, `metadata`, `width`, and `height`. When an active event page has a hitbox, the runtime event also exposes `event.hitbox: { width, height }` using RPGJS-pixel dimensions; `event.triggers[].hitbox` keeps the page-level value for compatibility. If `mapLoadBlockCollectionId` is configured, the runtime response also includes `mapLoadBlocks`, the hydrated block array executed by `map.onJoin(player, map)`. Runtime code should use the media object metadata directly instead of treating these fields as storage filenames.

## Example: read all maps

```bash
curl -sS "$BASE_URL/api/maps" \
  -H "x-api-key:$RPGSTUDIO_API_KEY" \
  -H "Content-Type: application/json"
```

## Example: update map params

```bash
curl -sS -X PUT "$BASE_URL/api/maps/$MAP_ID/params" \
  -H "x-api-key:$RPGSTUDIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "width": 100,
    "height": 80
  }'
```

## Notes

- Map settings inside the editor are exposed through the `params` route.
- Use IDs returned by the API. Do not invent `mapId` values.
- If the user wants a full map creation flow and the exact payload shape is unclear, fetch one existing map first and mirror its shape minimally.
- `POST /api/maps/generate` now captures and logs failures across the whole generation pipeline, including tileset generation, tileset storage reads, terrain generation, map synthesis, and final map insertion.
# Semantic search

`GET /api/maps` accepts `query` and optional `minScore` (`0..1`, default `0.40`). Search results are ordered by Vectorize relevance and remain scoped to the API key project.


## Read an existing thumbnail

`GET /api/maps/:mapId/thumbnail` returns the stored thumbnail image with its MIME type, using the current project access. It returns 404 for a map outside the project, a missing thumbnail or a missing storage object. Use these bytes as a generation reference (base64 data URI), not the map ID. See [media.md](media.md) for ordered multiple references and video generation.
