---
name: rpgjs-studio
description: Use the RPGJS Studio HTTP API to create or manage a 2D RPG game. Trigger this skill when Codex needs to CRUD maps, map events, database records, media assets, or general project settings in RPGJS Studio, especially when the task should be done through `curl` or another HTTP client with an API key and configurable base URL.
---

# RPGJS Studio API Skill

Use this skill to execute content-management tasks against an RPGJS Studio instance.

## Inputs

- Check whether a local `RPGSTUDIO.md` file exists in the current working directory.
- If `RPGSTUDIO.md` exists, treat it as local project context and read it first.
- Use it to recover persistent values such as:
  - `BASE_URL`
  - any other project-specific instructions relevant to API usage
- Do not recover, request, or persist a `projectId`. The API key is scoped to the RPGJS Studio project, so work directly on the user's requested resource.
- If `RPGSTUDIO.md` does not exist, continue normally.
- Resolve `BASE_URL` from the user if provided.
- Default `BASE_URL` to `https://rpgjs.studio` when the user did not specify another host.
- Read the API key from the environment variable `RPGSTUDIO_API_KEY`.

## Mandatory startup workflow

1. Check whether `RPGSTUDIO_API_KEY` exists before any API call.
2. When checking `RPGSTUDIO_API_KEY`, never print its value in the terminal and never echo it back in the response.
3. If the variable is missing or empty, stop and tell the user to create an API key first on `${BASE_URL}/api-keys`, then export `RPGSTUDIO_API_KEY`.
4. Build authenticated requests with these headers:

```bash
-H "x-api-key:$RPGSTUDIO_API_KEY"
-H "Content-Type: application/json"
```

5. Prefer `curl` for HTTP calls. Use another HTTP client only if there is a clear reason.
6. Fail fast on authentication errors. If the API returns an invalid-key style response, `401`, or `403`, stop the task and tell the user to verify the key or contact support.
7. Read only the reference file that matches the user task:
   - `references/database.md`
   - `references/maps.md`
   - `references/events.md`
   - `references/event-examples.md`
   - `references/blocks.md`
   - `references/media.md`
   - `references/settings.md`

## Local memory file

Use `RPGSTUDIO.md` as a lightweight local memory file for the current project.

- Read it at the start if it exists.
- Reuse values already stored there instead of asking again.
- After the task, update or create it with stable, non-secret context discovered during execution.

Typical contents:

- last used `BASE_URL`
- project-specific conventions or notes useful for future calls

Do not use `RPGSTUDIO.md` to select a project. The current `RPGSTUDIO_API_KEY` already identifies the target project, so proceed directly with the user's request.

Never store secrets in this file.

- Do not store `RPGSTUDIO_API_KEY`.
- Do not print `RPGSTUDIO_API_KEY`.
- Do not copy raw secret values into logs, terminal output, or markdown.

## Request pattern

Define the base command once and reuse it:

```bash
BASE_URL="${BASE_URL:-https://rpgjs.studio}"
curl -sS \
  -H "x-api-key:$RPGSTUDIO_API_KEY" \
  -H "Content-Type: application/json"
```

For write operations, prefer:

```bash
curl -sS -X POST "$BASE_URL/..." \
  -H "x-api-key:$RPGSTUDIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

## Execution rules

- Start by identifying the resource domain, then load the matching reference file.
- Use REST semantics: `GET`, `POST`, `PUT`, `DELETE`.
- Resolve foreign keys before creation or update:
  - Search media with `/api/media?query=<search>`.
  - Search database records with `/api/database/:type?query=<search>`.
  - If a matching dependency exists, reuse its returned `_id`.
  - If not found, create it first, then continue with the returned `_id`.
- Never call a project listing endpoint just to choose a project. The API key determines the project context.
- When the user asks to create game objects, send the smallest valid payload first, then enrich it only if the task requires more fields.
- Reuse IDs returned by the API instead of guessing them.
- When the user provides a database `_id` for a read, update, or delete task, call `GET /api/database/:type/:id` first and inspect the existing record before deciding the payload or reporting the content.
- If an endpoint shape is uncertain, inspect the response from a nearby `GET` endpoint first and adapt from that live payload.
- Do not continue after an auth failure.
- If a missing dependency would require AI media generation, always call the unified media generation endpoint with `action: "estimate"` first.
- After the estimate, report the required credits to the user and ask for confirmation before calling `action: "execute"`.
- Never start an AI media generation directly without this estimate and confirmation step.
- For `POST /api/maps/generate`, rely on `references/maps.md` for the AI map generation workflow and endpoint-specific failure behavior.
- Summarize the exact records created, updated, or deleted in the final response.
- When a task reveals stable project context such as `BASE_URL` or local conventions, persist that non-secret context into `RPGSTUDIO.md` for future runs.

## Common checks

- `database` task: read [references/database.md](./references/database.md)
- `map` task: read [references/maps.md](./references/maps.md)
- `event` task: read [references/events.md](./references/events.md)
- `event example` task: read [references/event-examples.md](./references/event-examples.md)
- `event workflow block` task: read [references/blocks.md](./references/blocks.md)
- `media` task: read [references/media.md](./references/media.md)
- `settings` task: read [references/settings.md](./references/settings.md)

## Current schema notes

- Maps may expose a shader terrain `terrainLayer` object with `version: 1`, `mode: "control-texture"`, pixel `width`/`height`, `tileSize`, `palette`, and `controlTexture` metadata. The control texture is RGBA8; terrain palette index is encoded as `R + G * 256`, optional light uses `B` with `128` as neutral, and `A` stores terrain mask coverage for pixel brush strokes. Soft edges are computed from transition/blend metadata at render time. Legacy tile grids are normalized into `tileSize x tileSize` blocks, but brush edits can update individual world pixels in the control texture.
- Maps may expose a terrain morphology `terrainMorphologyLayer` object with `version: 1`, `mode: "terrain-morphology"`, pixel `width`/`height`, `tileSize`, and `features[]`. Each feature is either `{ kind: "hole", params, strokes }` or `{ kind: "wall", params, strokes }`; strokes store world-pixel `points[]` and `radius`. Hole params support `depth`, `roundness`, `roughness`, optional facade `textureId`, optional bottom-fill `fillTextureId`, and `fillHeight` clamped to `0..100`; `textureId` is not used as the bottom-fill fallback. Wall params support `height`, `roundness`, `roughness`, and optional facade `textureId`; the editor's wall smoothness control maps to `roughness = 1 - smoothness`. The brush tool modifies the terrain surface; hole/wall tools use the selected terrain texture as the vertical facade while the top surface remains the already-painted base terrain. The renderer merges hole/wall masks as signed terrain levels before drawing, so overlapping strokes are clipped or neutralized instead of being rendered as independent overlays. The editor renders morphology after the base terrain control texture and merges morphology strokes into terrain collision as blocking cells.
- `PUT /api/maps/:mapId` supports partial section updates. Omitted map fields are preserved, so prefer sending only changed sections: `startX/startY` for start position, `events` for placements, `terrainMorphologyLayer` for morphology, terrain fields for terrain/control texture, element layer arrays for objects, and tileset params for media selection.
- Maps may expose top-level lighting settings as `lighting: { sun: { enabled: boolean, intensity: number } }`. The sun intensity is clamped to `0..1`; when enabled, runtime/editor integrations can use it to display automatic shadows for walls, characters, and elements.
- Terrain media metadata exposes `sourceTexture`, direct `rows` and `columns`, `textureGrid: { columns, rows, tileSize? }`, `terrainTextures[]`, and `transitions[]`. Each `terrainTextures[]` entry is `{ id, index, label, collision?, renderTileSize?, defaultRenderMode? }`; `index` is the atlas-cell source of truth, `collision` marks painted map cells as blocking, and `renderTileSize` controls the repeated texture size in map-editor world pixels, defaulting to the legacy `320` pattern size when absent. `defaultRenderMode` supports `hard`, `fade`, `water`, and `custom`: `hard` is crisp, `fade` uses `width`, the UI `grass edge` preset is stored as `fade` with `width: 12` and `curve: "sharp"` and renders as a grass fringe, `water` is the stored generic liquid mode and keeps the atlas texture while deriving clipped tint, shoreline depth, static ripples, and edge glints from the atlas cell color so lava/swamp/acid/oil do not get a fixed blue outline, and unknown `custom` modes fall back to an edge highlight unless their `shaderKey` is liquid-like. `transitions[]` stores exception rules `{ from, to, mode, priority? }` between terrain ids; it is not a generated Wang transition matrix. Studio terrain generation defaults to a `4x4` source texture atlas in the UI and persists the generated atlas directly; it no longer creates Wang/autotile output through the image-processing container. Generation requests can set `metadata.sourceTextureColumns` and `metadata.sourceTextureRows`; Studio also sends `terrainAtlasColumns`, `terrainAtlasRows`, `terrainStyleId`, and `terrainStylePrompt` so the server prompt can build a shader-friendly seamless material atlas. Element set (`tileset`) generation can pass `metadata.terrainReferenceImage` and `metadata.terrainReferenceMediaId` to use an existing terrain image as a style-compatibility guide; the image data is execution-only and should not be persisted.
- Project settings and database enemies both support combat animation spritesheet media IDs under `animations`: `attack`, `hurt`, `die`, and `castSpell`.
- The RPGJS starter runtime uses these spritesheets in action battle: attack actions, damage/hurt feedback, delayed death removal, and skill/cast usage can temporarily switch to the configured spritesheet.
- Database enemies support action battle AI options under `behavior`: `enemyType`, `attackCooldown`, `visionRange`, `attackRange`, `dodgeChance`, `dodgeCooldown`, `fleeThreshold`, `attackPatterns`, `patrolWaypoints`, and `groupBehavior`.
- Project settings and database enemies both support level-gated skill acquisition under `skills`: `{ skillId, level }`.
- Database skills support media IDs under `icon`, `animation`, and `sound`.
- Game/runtime code can read media data usable in the game with `GET /api/game/media/:mediaId`; use `references/media.md` for details.
- Media type changes should use `PUT /api/media/update/:mediaId` instead of the metadata-only admin endpoint; this synchronizes `metadata.type` with the root `type` field.
- Game map responses from `GET /api/game/maps/:mapId` hydrate event `params.graphic`, `params.faceset`, `triggers[].graphic`, and `triggers[].faceset` as media objects when possible; use `references/maps.md` for the runtime response shape.
- Database common events use type `commonEvent` and path `common-events`: `GET/POST /api/database/common-events` and `GET/PUT/DELETE /api/database/common-events/:id`. A common event stores `name`, optional `description`, optional `parameters`, and event-page trigger data in `triggers[]` using the same page fields as map events (`type`, `blockCollectionId`, `enabled`, `conditions`, `typeData`, `graphic`, `faceset`, `direction`, `pattern`, `movement`, `options`).
- Common event blocks use `commonEventId`, not `eventId`. `call_common_event` executes the selected common event workflow in the current context with optional key/value `parameters` and a recursion guard `maxDepth` defaulting to `10`. `spawn_common_event` creates a visible runtime object on the current map with RPGJS `map.createDynamicEvent(...)`, supports `positionMode: "current_event" | "player" | "explicit"`, optional `x/y`, and `mode: "shared" | "scenario"` defaulting to `shared`. Spawned common events are not persistent in v1.
- Game map responses from `GET /api/game/maps/:mapId` include `commonEvents[]` when event blocks reference common events through `call_common_event` or `spawn_common_event`; the response hydrates their trigger media and block collections for runtime preview.
