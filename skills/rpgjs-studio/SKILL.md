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
  - `references/project-env.md`
  - `references/mmorpg.md`

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
- `project env` task: read [references/project-env.md](./references/project-env.md)
- `MMORPG publication` task: read [references/mmorpg.md](./references/mmorpg.md)

## Current schema notes

- An authenticated Studio session can publish the current project with
  `POST /api/mmorpg/publish`. Publication prepares every map before sending any
  update. Failures return a stable `code`, `stage`, and optional `resourceId`;
  see `references/mmorpg.md` for the response contract.
- `show_text` blocks may set `inputEnabled: true` and must then provide
  `inputVariableId`, the `_id` of a database variable receiving the submitted
  string or number. Cancelling the input stores `null`; see
  `references/blocks.md` for the typed input options.
- Maps, events, block collections, and database records support multilingual semantic search through their existing list endpoints with `query`. The optional `minScore` parameter accepts `0..1` and defaults to `0.40`; see the matching resource reference for endpoint-specific filters and response shapes.
- Project environment variables are managed with authenticated project routes:
  `GET /api/projects/:projectId/env`,
  `PUT /api/projects/:projectId/env/:name`, and
  `DELETE /api/projects/:projectId/env/:name`. Plain values are returned in
  responses; secret values expose only `isSet` and must never be logged or
  printed.
- Playable characters are database Actors under `/api/database/actors`. The
  public runtime database includes Actors and the public project exposes
  `mainActorId` so a new game can preselect the project hero.
- Playable identities are database Classes under `/api/database/classes`.
  New Actors require a valid `classId`; existing legacy Actors without one
  remain readable. Classes own `name`, `description`, `icon`, and level-gated
  `skills`, while Actors own appearance, statistics, inventory, and equipment.
  A Class assigned to any Actor cannot be deleted until those Actors are
  reassigned.
- Character spritesheet metadata can contain `illustration`, the media `_id`
  of a transparent 4:5 JRPG character illustration inherited by every Actor
  using that spritesheet. AI generation type `illustration` costs 5 credits.
- Database create and update validation treats `null` from non-nullable form
  fields as an omitted value. When the JSON Schema declares a `default`, that
  default is applied instead; explicit `0` values and explicitly nullable
  fields are preserved. Optional object groups containing only omitted values,
  such as `{ "hitbox": { "width": null, "height": null } }`, are omitted as
  well. A validation `400` identifies the first invalid field with a dotted path
  in `message`, for example
  `{ "message": "parameters.pdef.start: Required" }`.
- `menus.characterSelect` configures the new-game Actor selector. It supports
  every Actor with `settings.allActors: true`, or an ordered list of Studio
  Actor `_id` values in `settings.actorIds`. The selection is player/save-local
  and does not mutate `mainActorId`.
- Event workflows can open the same selector with `call_character_select` and
  can assign a Class to the active player with `change_class`. The selector can
  expose every Actor or an ordered unique subset and can optionally allow
  cancellation. Applying a selected Actor preserves acquired progression; see
  `references/blocks.md` for the exact payloads.
- Maps may expose a shader terrain `terrainLayer` object with `version: 1`, `mode: "control-texture"`, pixel `width`/`height`, `tileSize`, `palette`, and `controlTexture` metadata. The control texture is RGBA8; terrain palette index is encoded as `R + G * 256`, optional light uses `B` with `128` as neutral, and `A` stores terrain mask coverage for pixel brush strokes. Soft edges are computed from transition/blend metadata at render time. Legacy tile grids are normalized into `tileSize x tileSize` blocks, but brush edits can update individual world pixels in the control texture.
- Maps may expose a terrain morphology `terrainMorphologyLayer` object with `version: 1`, `mode: "terrain-morphology"`, pixel `width`/`height`, `tileSize`, and `features[]`. Each feature is either `{ kind: "hole", params, strokes }` or `{ kind: "wall", params, strokes }`; strokes store world-pixel `points[]` and `radius`. Hole params support `depth`, `roundness`, `roughness`, optional facade `textureId`, optional bottom-fill `fillTextureId`, `fillHeight` clamped to `0..100`, and optional per-hole `waveIntensity`, `waveDirection`, and `waveSpeed`; omitted wave fields inherit the map's `waterAnimation` values, while `waveIntensity: 0` keeps the fill static. `textureId` is not used as the bottom-fill fallback. Wall params support `height`, `roundness`, `roughness`, and optional facade `textureId`; the editor's wall smoothness control maps to `roughness = 1 - smoothness`. The brush tool modifies the terrain surface; hole/wall tools use the selected terrain texture as the vertical facade while the top surface remains the already-painted base terrain. The renderer merges hole/wall masks as signed terrain levels before drawing, so overlapping strokes are clipped or neutralized instead of being rendered as independent overlays. The editor renders morphology after the base terrain control texture and merges morphology strokes into terrain collision as blocking cells.
- Maps may expose `waterAnimation: { enabled, speed, intensity, direction }` for map-level liquid animation defaults. `direction` is measured clockwise in screen-space degrees (`0` right, `90` down) and defaults to `90`. Filled holes inherit these defaults unless their params override them; wave highlights are derived from each fill's local color or texture instead of using a fixed blue tint.
- `PUT /api/maps/:mapId` supports partial section updates. Omitted map fields are preserved, so prefer sending only changed sections: `startX/startY` for start position, `events` for placements, `terrainMorphologyLayer` for morphology, terrain fields for terrain/control texture, element layer arrays for objects, and tileset params for media selection.
- Maps may expose top-level lighting settings as `lighting: { sun: { enabled: boolean, intensity: number } }`. The sun intensity is clamped to `0..1`; when enabled, runtime/editor integrations can use it to display automatic shadows for walls, characters, and elements.
- Maps may expose `mapLoadBlockCollectionId: string | null`. When set, `GET /api/game/maps/:mapId` hydrates that collection into `mapLoadBlocks`, and the RPGJS Studio runtime executes those blocks from the server `map.onJoin(player, map)` hook when a player enters the map. This workflow has a player and map context, but no current event context.
- Event workflow builders can use execution profiles. `eventBuilderProfiles.mapLoad` exposes blocks whose `requiredCapabilities` fit a player-aware map context and removes current-event field choices from compatible schemas.
- Terrain media metadata exposes `sourceTexture`, direct `rows` and `columns`, `textureGrid: { columns, rows, tileSize? }`, `terrainTextures[]`, and `transitions[]`. Each `terrainTextures[]` entry is `{ id, index, label, collision?, renderTileSize?, defaultRenderMode? }`; `index` is the atlas-cell source of truth, `collision` marks painted map cells as blocking, and `renderTileSize` controls the repeated texture size in map-editor world pixels, defaulting to the legacy `320` pattern size when absent. `defaultRenderMode` supports `hard`, `fade`, `water`, and `custom`: `hard` is crisp, `fade` uses `width`, the UI `grass edge` preset is stored as `fade` with `width: 12` and `curve: "sharp"` and renders as a grass fringe, `water` is the stored generic liquid mode and keeps the atlas texture while deriving clipped tint, shoreline depth, static ripples, and edge glints from the atlas cell color so lava/swamp/acid/oil do not get a fixed blue outline, and unknown `custom` modes fall back to an edge highlight unless their `shaderKey` is liquid-like. `transitions[]` stores exception rules `{ from, to, mode, priority? }` between terrain ids; it is not a generated Wang transition matrix. Studio terrain generation defaults to a `4x4` source texture atlas in the UI and persists the generated atlas directly; it no longer creates Wang/autotile output through the image-processing container. Generation requests can set `metadata.sourceTextureColumns` and `metadata.sourceTextureRows`; Studio also sends `terrainAtlasColumns`, `terrainAtlasRows`, `terrainStyleId`, and `terrainStylePrompt` so the server prompt can build a shader-friendly seamless material atlas. Element set (`tileset`) generation can pass `metadata.terrainReferenceImage` and `metadata.terrainReferenceMediaId` to use an existing terrain image as a style-compatibility guide; the image data is execution-only and should not be persisted.
- Playable character settings are database actors under `/api/database/actors`; the project stores the selected actor `_id` in `mainActorId`. Use `GET /api/database/actors/main` and `PUT /api/database/actors/:id/main` to read or change the main hero. The actor owns appearance, hitbox, progression, inventory, animations, and skills.
- Actor `hitbox: { width, height }` uses positive RPGJS-pixel dimensions and defaults to `32 x 32` when omitted. The public game project and offline export resolve `mainActorId` back to the runtime-compatible `hero`, `animations`, and `skills` fields.
- Database actors and enemies support combat animation spritesheet media IDs under `animations`: `attack`, `hurt`, `die`, and `castSpell`.
- The RPGJS starter runtime uses these spritesheets in action battle: attack actions, damage/hurt feedback, delayed death removal, and skill/cast usage can temporarily switch to the configured spritesheet.
- Database enemies support action battle AI options under `behavior`: `enemyType`, `attackCooldown`, `visionRange`, `attackRange`, `dodgeChance`, `dodgeCooldown`, `fleeThreshold`, `attackPatterns`, `patrolWaypoints`, and `groupBehavior`.
- Database enemies expose a lightweight preview endpoint: `GET /api/database/enemies/preview?ids=<id1,id2>`. Use it when only `_id`, `name`, and `graphic` are needed for known enemy ids instead of listing or reading full enemy records. Send at most 100 distinct ids per request.
- `GET /api/events` returns the legacy event array by default. Add `page` or `limit` to opt into paginated responses: `GET /api/events?page=1&limit=24` returns `{ data, meta }`. Paginated event lists default to `sortBy=createdAt&sortDirection=desc` and support `sortBy=createdAt|updatedAt|name`, `sortDirection=asc|desc`, `eventType=all|character|enemy|free`, and `assignment=all|assigned|unassigned`.
- Database actors and enemies support level-gated skill acquisition under `skills`: `{ skillId, level }`.
- Database skills support media IDs under `icon`, `animation`, and `sound`.
- Project settings support global `audio.ui` semantic cues (`navigate`, `confirm`, `cancel`, `open`, `close`, `error`) shared by every native menu. General Action Battle defaults live in `combatAudio` (`battleMusic`, `attack`, `skill`, `hit`, `hurt`, `die`). Both groups are edited in the Project Audio tab.
- Title-screen background music and image are configured with `menus.titleScreen.settings.backgroundMusic` and `backgroundImage`. Maps do not override combat audio. Database enemies can override battle music and source/reaction cues under `audio.combat`. Database skills use `sound` for casting and `impactSound` for impact; all sound values are Studio media IDs.
- Generate full-scene title-screen or in-game artwork with media generation type `image`. It produces an opaque, center-cropped 16:9 landscape media record; this is distinct from `illustration`, which remains a transparent 4:5 character portrait. Use the resulting media `_id` in `menus.titleScreen.settings.backgroundImage`.
- Game/runtime code can read media data usable in the game with `GET /api/game/media/:mediaId`; use `references/media.md` for details.
- Media type changes should use `PUT /api/media/update/:mediaId` instead of the metadata-only admin endpoint; this synchronizes `metadata.type` with the root `type` field.
- Game map responses from `GET /api/game/maps/:mapId` hydrate event `params.graphic`, `params.faceset`, `triggers[].graphic`, and `triggers[].faceset` as media objects when possible, and expose the active page hitbox as `event.hitbox: { width, height }`; use `references/maps.md` for the runtime response shape.
- Event workflow blocks can call or spawn reusable game events with `call_common_event` and `spawn_common_event`. Both use `commonEventId`; `spawn_common_event` can resolve its position from `player`, `current_event`, `variable`, or `fixed`.
- Event page triggers use `trigger: "player_touch"` and `trigger: "event_touch"` in page payloads. Runtime trigger payloads store both as `type: "onTouch"` and distinguish them with `typeData.touchTarget: "player" | "event"`; missing `touchTarget` means player touch for compatibility. In event/event touch workflows, variable and switch blocks use map variables. Player-only blocks receive the first player currently on the map as a temporary fallback until explicit affected-player targeting exists.
- Event page `hitbox` supports `{ width, height }` in RPGJS pixels. Missing hitbox means the runtime default `32 x 32`. Media/graphic scale changes only the displayed sprite size; it must not alter hitbox width/height.
- Event page `options` supports `directionFix`, `through`, `alwaysOnTop`, and `alwaysOnBottom`. Use only one rendering layer flag at a time: `alwaysOnTop` draws the event above nearby characters, while `alwaysOnBottom` draws it below nearby characters.
- Event workflow blocks can use `set_hitbox` to call `target.setHitbox(width, height)` on `$player`, `$this`, or a map event id. `width` and `height` are positive RPGJS-pixel dimensions and are not scaled by the target graphic scale.
- Event workflow blocks can use `camera_follow` to call `player.cameraFollow(target, { smoothMove })`. The target is resolved from `eventId` with `$player`, `$this`, or a map event id. `smoothMove` defaults to `true`; optional `time` and `ease` create the advanced smooth transition object supported by RPGJS. The `ease` field is a dropdown enum of common easing names such as `linear`, `easeInQuad`, `easeOutQuad`, and `easeInOutQuad`.
- Event workflow variable writes must use the public `set_variable` block. `change_variable` is legacy runtime compatibility only and must not be generated for new payloads. `set_variable` supports `valueSource` values `constant`, `variable`, `random`, `player_x`, `player_y`, `player_direction`, `map_id`, `gold`, `player_id`, `player_name`, `level`, `hp`, and `sp`.
