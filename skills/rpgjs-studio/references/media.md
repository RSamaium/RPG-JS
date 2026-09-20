# Media API

## Cinematic event blocks

`show_cinematic` accepts `video` (required media ID), `allowSkip` (default `true`; false hides Skip), `bgm` (`"duck"` by default, or `"pause"` to pause/resume music), and `preload` (default `true`, best-effort buffering of up to three videos on map entry). Adjacent cinematic blocks without children share one blocking overlay and retain per-video options. Other blocks end the playlist. Errors remain dismissible with skipping disabled. Old `{ video }` blocks remain compatible.

Use this reference for browsing media, updating metadata, replacing files, or calling AI media generation endpoints.

## Search first

When another API needs a media reference such as an icon, character appearance, faceset, BGM, BGS, or other media field, search first:

- Search media: `GET /api/media?query=<search>`

Workflow:

1. Search `/api/media?query=<search>`.
2. If a suitable media record exists, use its `_id`.
3. If not found, decide whether to upload/create it or generate it.
4. If generation is needed, call `POST /api/media/generate` with `action: "estimate"` first.
5. Tell the user how many credits will be used and whether the current actor has enough credits.
6. Ask for explicit confirmation before calling `action: "execute"`.
7. Reuse the created media `_id` in the original request.

## Read endpoints

- List all media: `GET /api/media/all`
- List media by type: `GET /api/media/all/:type`
- Get media group: `GET /api/media/group/:groupId`
- Read game-ready media data: `GET /api/game/media/:mediaId`
- Read a generated character's linked animations in-game: `GET /api/game/media/:mediaId/animations` (public, returns only media in the same project whose `metadata.groupId` matches an idle character).

`GET /api/game/media/:mediaId` returns the media data shape intended for the RPGJS runtime. Use it when the game needs to inspect a Studio media record and consume the fields available in-game. Prefer this endpoint over admin media endpoints from runtime code.

The RPGJS runtime reads the 2×2 idle directions from `metadata.idleDirections`, then uses the linked media named `walk` for movement and its saved proportional `metadata.scale`. Other linked names can be played as actions. The game endpoint above is the runtime counterpart of the project-scoped editor group endpoint.

## Write and generation endpoints

- Update media metadata only: `PUT /api/media/:id`
- Update media metadata and synchronize the root media type: `PUT /api/media/update/:id`
- Replace media file: `POST /api/media/replace/:id`
- Delete an associated character animation and its image: `DELETE /api/media/character/:characterId/animations/:animationId` (Studio project cookie access; the animation must have `metadata.groupId` equal to the character ID). This removes the associated media record, stored file, and any entry in the character's `metadata.animations`. It cannot delete the base idle media or another character's animation. Confirm with the user before deletion because the image is permanent.
- Estimate or execute generation: `POST /api/media/generate`

Use `PUT /api/media/update/:id` when the payload can change the media category/type. The request body is `{ "metadata": { ... }, "type"?: string }`; when `metadata.type` or `type` is a non-empty string, the endpoint writes both `metadata.type` and the root `type` field so media filters and type-specific tools stay consistent.

## Generation inputs

Common payload confirmed in server code:

- `POST /api/media/generate`: `{ "action": "estimate" | "execute", "type": string, "userPrompt": string, "metadata"?: { "source"?: string, "referenceImage"?: string, "referenceImages"?: string[], "duration"?: number, ... } }`
- `GET /api/media/generate/:instanceId`: returns the project-scoped canonical workflow status and, once complete, the generated `media` record. The public API does not expose internal workflow `steps`. For a known run it falls back to the persisted application status when Cloudflare temporarily reports `instance.not_found`; unknown or cross-project ids return `404`.

Studio terrain generation defaults to a `4x4` `sourceTexture` atlas in the UI and persists the generated atlas directly. It no longer creates Wang/autotile output through the image-processing container. Requests can set `metadata.sourceTextureColumns` and `metadata.sourceTextureRows` to choose the atlas layout, and can pass `terrainStyleId` plus `terrainStylePrompt` to guide the technical terrain prompt. Consumers should read `metadata.rows` and `metadata.columns` or the mirrored `metadata.textureGrid`.

Each terrain texture may use `defaultRenderMode: { "type": "nine-slice", "center": { "x": 12, "y": 12, "width": 24, "height": 24 } }`. Center coordinates are integer source pixels relative to that atlas cell. Keep at least one source pixel outside the center on all four sides. Studio repeats the center, maps the remaining bands along the painted contour, and forces a hard boundary without fade bleed. Set `renderingStyle: "hd-2d"` for generated hand-painted terrain; omit it for legacy pixel-art media.

Workflow to follow:

1. Call `POST /api/media/generate` with `action: "estimate"`.
2. Report the returned `credits`, `availableCredits`, and `hasEnoughCredits`.
3. Ask the user to confirm the spend.
4. Only after confirmation, call the same endpoint with `action: "execute"`.
5. A non-chat API client may poll `GET /api/media/generate/:instanceId` until completion if it requires the final media record. In the Studio assistant, stop after the generation tool returns its `assetWorkflowWatcher`; the client progress card owns polling and resumes the assistant once at a terminal status.

Credit costs available in `common/permissions/credit.ts`:

- `icon`: 2
- `soundEffect`: 2
- `backgroundAmbientSound`: 5
- `backgroundMusic`: 10
- `faceset`: 5
- `animation`: 15
- `spritesheet` with `metadata.generationMode: "idle"`: 5
- `spritesheet` (animations and existing API calls): 15
- `spritesheetPreview`: 1
- `terrain`: 5
- `tileset`: 15
- `illustration`: 5
- `image`: 5

`illustration` generates one transparent full- or three-quarter-body JRPG
character image intended for a vertical 4:5 hero selector. Pass the character
spritesheet URL or data URI as `metadata.referenceImage`. After generation,
store the returned media `_id` in the owning spritesheet's
`metadata.illustration`; Actors using that spritesheet inherit it.

`image` generates an opaque full-scene landscape illustration. The generation
workflow center-crops its stored PNG to an exact 16:9 ratio, making it suitable
for `menus.titleScreen.settings.backgroundImage` and generic in-game artwork.
`metadata.referenceImage` may be supplied as an optional visual guide and is not
persisted with the generated media.

## Example: list all media

```bash
curl -sS "$BASE_URL/api/media/all" \
  -H "x-api-key:$RPGSTUDIO_API_KEY" \
  -H "Content-Type: application/json"
```

## Example: read game media data

```bash
curl -sS "$BASE_URL/api/game/media/$MEDIA_ID"
```

## Example: generate an icon

```bash
curl -sS -X POST "$BASE_URL/api/media/generate" \
  -H "x-api-key:$RPGSTUDIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "estimate",
    "type": "icon",
    "userPrompt": "Golden potion bottle icon for a 2D RPG inventory",
    "metadata": {
      "source": "rpgjs"
    }
  }'
```

## Example: replace a media file

For file replacement, do not force the JSON content type on the multipart body. Keep the API key header and let `curl` set the form boundary.

```bash
curl -sS -X POST "$BASE_URL/api/media/replace/$MEDIA_ID" \
  -H "x-api-key:$RPGSTUDIO_API_KEY" \
  -F "file=@/absolute/path/to/image.png"
```

## Notes

- Use `GET /api/media/all` or `GET /api/media/all/:type` first when the user knows a file by name but not by ID.
- Prefer `GET /api/media?query=<search>` for name-based lookup when a task needs a specific referenced asset.
- Use `GET /api/game/media/:mediaId` when the caller is game/runtime code and needs the media fields usable in the game.
- For metadata-only updates, use `PUT /api/media/:id` with JSON. If the update includes a media type change, use `PUT /api/media/update/:id` so the root `type` field is synchronized with metadata.
- Media generation is now unified and workflow-based. Always estimate first, ask for confirmation, then execute.


## Multiple references and cinematic videos

Images and videos accept `metadata.referenceImages`, an ordered list of up to 9 image URLs or base64 data URIs. Spritesheets and VFX animations accept up to 15. Do not also send `referenceImage`, even with an empty list. The old singular field remains supported for existing integrations. Empty lists mean no reference. All images are passed to the image provider; they are not assembled into a collage. Internal reference payloads are omitted from persisted media metadata.

Read a library record using `GET /api/media/data/:id`, then obtain its image bytes with `GET /api/media/<fileName>`. Read a project's existing map thumbnail with `GET /api/maps/:mapId/thumbnail` (404 when absent or outside the project). Encode these image bytes as data URIs when the provider cannot access their authenticated URLs. Never send map IDs as image URLs. `referenceImageFiles` is internal and cannot be supplied in public requests.

```json
{
  "action": "estimate",
  "type": "video",
  "userPrompt": "Image 1 is the hero, Image 2 is the environment. Show the hero entering the village.",
  "metadata": {
    "duration": 8,
    "referenceImages": ["https://example.com/hero.png", "https://example.com/village.png"]
  }
}
```

This example costs 32 credits. Follow the existing estimate/execute workflow above.


### Map references as environment context

Base64 reference MIME headers may include parameters such as `charset=utf-8`. Recognized PNG, JPEG, GIF, or WebP signatures take precedence over missing or incorrect MIME headers (including a PNG served as `text/xml`). Malformed base64 and unrecognized non-image references return HTTP 400, with the startup debit refunded.

Generation billing: `action: "estimate"` is free; `action: "execute"` debits the API key's numeric `creditBalance` before enqueueing. Keys configured with a null balance retain unlimited behavior. Reference upload and workflow creation failures refund the debit; terminal workflow execution failures refund through a persisted `refund-credits` step. `queued` means accepted, not completed. Poll the instance status before using its media. The API externalizes both legacy singular base64 references and ordered reference arrays before workflow creation; remaining workflow parameters exceeding 1 MiB return HTTP 413 and refund the debit. Do not send internal storage-reference fields yourself.

Image and video requests accept optional `metadata.mapReferenceIndices`: unique, zero-based integer indices into `referenceImages`. For example, `referenceImages: [heroImage, villageMapImage]` with `mapReferenceIndices: [1]` identifies Image 2 as a map. Indices must be in range; the parameter cannot be used with legacy `referenceImage`. Omit it or send an empty array with `referenceImages` for ordinary references.

Studio calculates these indices from the Maps source when sending the request, recalculating them after references are removed. Other API clients must supply the indices themselves. Their order and meaning survive temporary image storage and workflow retries.

The provider prompt treats maps as environment context (buildings, materials, vegetation, colors, atmosphere, and spatial organization), rather than a required overhead camera or tile-sheet presentation. It honors explicitly requested camera perspectives, including top-down, and the technical layout/perspective required by the asset type. Full-scene images and videos default to an immersive character-eye-level view only when no camera perspective is requested. The user's original prompt is unchanged; this guidance is added only to the provider prompt.

For video, `metadata.style: "reference"` preserves the supplied images' rendering technique, linework, pixel treatment, textures, palette and detail. It requires at least one reference image (the new list or legacy singular field). This does not copy the reference camera: map perspective guidance still applies. New map cutscenes in Studio default to this option; explicit preset styles remain available.


### Studio actor references

Generated or imported video media can be played with the `show_cinematic` event block: `{ video: "media-id" }`. The RPGJS Studio client resolves that media id and displays the cinematic GUI. The event waits until playback ends, is skipped, or an error is dismissed; movement is blocked only for the triggering player. The video is not linked to a map. See the RPGJS cinematic guide for player controls and recovery behavior.

Actor selection loads the project's actors on demand, prefers each actor's faceset, and otherwise uses its character graphic. Actors without a linked image cannot be selected. These images become ordinary ordered references after map regions, share the existing nine-image total/eight-additional-image limits, and may be removed individually. Actor ids are not added to the provider request. Generated videos remain available in the media library and are not linked to the source map.
