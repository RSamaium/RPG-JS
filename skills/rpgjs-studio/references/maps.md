# Maps API

Use this reference for map CRUD and map-specific secondary operations.

## Core endpoints

- List maps: `GET /api/maps`
- Create map: `POST /api/maps/v2`
- Read one map: `GET /api/maps/:mapId`
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

Useful fields from `mapSchema` when a full map update is needed:

- `name?: string`
- `data?: string`
- `params?: object`
- `weather?: object | null`
- `events?: Array<{ eventId: string, x: number, y: number }>`
- `elementsAlwaysLow?: string`
- `elementsLow?: string`
- `elementsHigh?: string`
- `hitboxes?: array`
- `polygons?: array`
- `creationDetails?: { prompt?: string, mapStyle?: string, state?: string }`

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
