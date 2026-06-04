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

Media fields must use media `_id` values resolved through `/api/media?query=<search>`.

### `PUT /api/maps/:mapId`

This endpoint accepts partial section updates. Omitted fields are preserved. Send only the section that changed when possible:

- Start position only: `{ "startX": 0, "startY": 0 }`
- Events only: `{ "events": [{ "eventId": "...", "x": 10, "y": 20 }] }` or `{ "events": [] }`
- Terrain morphology only: `{ "terrainMorphologyLayer": { ... } }` or `{ "terrainMorphologyLayer": null }`
- Terrain only: send `terrain`, and optionally `terrainLayer` plus `terrainControlTexture`
- Elements only: send `elementsAlwaysLow`, `elementsLow`, and `elementsHigh`
- Tileset params only: send `baseTerrainId`, `tilesetId`, `terrainTilesetIds`, `elementTilesetIds`, `primaryTerrainTilesetId`, or `primaryElementTilesetId`

Useful fields from `mapSchema` when a full map update is needed:

- `name?: string`
- `data?: string`
- `params?: object`
- `weather?: object | null`
- `lighting?: { sun: { enabled: boolean, intensity: number } } | null`
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

`terrainMorphologyLayer` stores hole and wall strokes in world pixels. Hole params support `depth`, `roundness`, `roughness`, optional facade `textureId`, optional bottom-fill `fillTextureId`, and `fillHeight` clamped to `0..100`; `textureId` is not used as the bottom-fill fallback. Wall params support `height`, `roundness`, `roughness`, and optional facade `textureId`. The editor wall smoothness control maps to `roughness = 1 - smoothness`. The brush tool modifies the terrain surface; hole/wall tools use the selected terrain texture as the vertical facade while the top surface remains the already-painted base terrain. The renderer merges hole/wall masks as signed terrain levels before drawing, so overlapping strokes are clipped or neutralized instead of being rendered as independent overlays. The editor renders this layer after `terrainLayer` and treats intersecting hole/wall cells as blocking collision.

`lighting.sun` controls the map-level sun option. `enabled` toggles automatic sunlight shadows for walls, characters, and elements. `intensity` is clamped to `0..1`.

`GET /api/game/maps/:mapId` returns event placement data for runtime use. Event media references under `event.params.graphic`, `event.params.faceset`, `event.triggers[].graphic`, and `event.triggers[].faceset` are returned as hydrated media objects when the media exists, including `_id`, `id`, `type`, `fileName`, `metadata`, `width`, and `height`. Runtime code should use the media object metadata directly instead of treating these fields as storage filenames.

When map event blocks reference common events through `call_common_event` or `spawn_common_event`, the runtime response also includes `commonEvents[]`. Each returned common event includes its trigger media and resolved `triggers[].blocks`, so the RPGJS Studio runtime can call or spawn it without a second API lookup.

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
