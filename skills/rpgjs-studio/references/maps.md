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

## Workflow

1. If the user refers to a map by name, list maps first or fetch the target map to resolve the real `_id`.
2. For a settings change limited to map parameters, use `PUT /api/maps/:mapId/params` instead of replacing the whole map.
3. For event lookup on a map, prefer `GET /api/maps/:mapId/events` before editing event placement.
4. If map params require media IDs such as `backgroundMusic` or `backgroundAmbientSound`, search media first with `GET /api/media?query=<search>`.
5. If the required media does not exist and would need AI generation, ask for user permission before consuming credits.

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
- Terrain only: send `terrain`, and optionally `terrainLayer` plus `terrainControlTexture`
- Elements only: send `elementsAlwaysLow`, `elementsLow`, and `elementsHigh`
- Tileset params only: send `baseTerrainId`, `tilesetId`, `terrainTilesetIds`, `elementTilesetIds`, `primaryTerrainTilesetId`, or `primaryElementTilesetId`
- Map entry workflow only: `{ "mapLoadBlockCollectionId": "..." }` or `{ "mapLoadBlockCollectionId": null }`

Useful fields from `mapSchema` when a full map update is needed:

- `name?: string`
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
- `terrainControlTexture?: string` base64 `data:image/png` payload used with `terrainLayer` during map updates; the API stores it and writes the resulting `controlTexture.fileName`.
- `hitboxes?: array`
- `polygons?: array`
- `creationDetails?: { prompt?: string, mapStyle?: string, state?: string }`

`terrainLayer` is the shader terrain V1 contract. The control texture is stored as an RGBA8 media/storage file, with the terrain palette index encoded as `R + G * 256`. `B` is optional light data and treats `128` as neutral when present. `A` is terrain mask coverage for pixel brush strokes, with `255` as fully covered. Soft edges are computed from transition/blend metadata at render time. Legacy tile grids are normalized into `tileSize x tileSize` blocks at load time, but editor brush edits may update the control texture at world-pixel resolution.

`terrainMorphologyLayer` stores hole and wall strokes in world pixels. Hole params support `depth`, `roundness`, `roughness`, optional facade `textureId`, optional bottom-fill `fillTextureId`, `fillHeight` clamped to `0..100`, and optional per-hole `waveIntensity`, `waveDirection`, and `waveSpeed`; `textureId` is not used as the bottom-fill fallback. Wall params support `height`, `roundness`, `roughness`, and optional facade `textureId`. The editor wall smoothness control maps to `roughness = 1 - smoothness`. The brush tool modifies the terrain surface; hole/wall tools use the selected terrain texture as the vertical facade while the top surface remains the already-painted base terrain. The renderer merges hole/wall masks as signed terrain levels before drawing, so overlapping strokes are clipped or neutralized instead of being rendered as independent overlays. The editor renders this layer after `terrainLayer` and treats intersecting hole/wall cells as blocking collision.

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
