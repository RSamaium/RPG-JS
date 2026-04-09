# Media API

Use this reference for browsing media, updating metadata, replacing files, or calling AI media generation endpoints.

## Search first

When another API needs a media reference such as an icon, character appearance, faceset, BGM, BGS, or other media field, search first:

- Search media: `GET /api/media?query=<search>`

Workflow:

1. Search `/api/media?query=<search>`.
2. If a suitable media record exists, use its `_id`.
3. If not found, decide whether to upload/create it or generate it.
4. If generation would consume credits, ask the user before calling a `/api/media/generate/...` endpoint.
5. Reuse the created media `_id` in the original request.

## Read endpoints

- List all media: `GET /api/media/all`
- List media by type: `GET /api/media/all/:type`
- Get media group: `GET /api/media/group/:groupId`

## Write and generation endpoints

- Update media metadata: `PUT /api/media/:id`
- Replace media file: `POST /api/media/replace/:id`
- Generate sound effect: `POST /api/media/generate/sound-effect`
- Generate background music: `POST /api/media/generate/background-music`
- Generate ambient sound: `POST /api/media/generate/background-ambient-sound`
- Generate tileset: `POST /api/media/generate/tileset`
- Generate terrain: `POST /api/media/generate/terrain`
- Generate icon: `POST /api/media/generate/icon`
- Generate image: `POST /api/media/generate/image`
- Generate spritesheet preview: `POST /api/media/generate/spritesheet-preview`

## Generation inputs

Common payloads confirmed in server code:

- `POST /api/media/generate/icon`: `{ "prompt": string, "referenceImage"?: string }`
- `POST /api/media/generate/tileset`: `{ "prompt": string, "referenceImage"?: string }`
- `POST /api/media/generate/terrain`: `{ "prompt": string, "referenceImage"?: string }`
- `POST /api/media/generate/sound-effect`: `{ "prompt": string }`
- `POST /api/media/generate/background-music`: `{ "prompt": string }`
- `POST /api/media/generate/background-ambient-sound`: `{ "prompt": string }`
- `POST /api/media/generate/spritesheet-preview`: `{ "prompt": string, "count"?: number, "referenceImage"?: string, "source": string, "type"?: string, "style"?: string, "structuredPrompt"?: string }`
- `POST /api/media/generate/image`: `{ "type": string, "source": string, "prompt"?: string, "referenceImage"?: string, "animationPrompt"?: string, "animationType"?: string, "parentId"?: string, "templateImage"?: string, "simplifiedDescription"?: string }`

Credit costs available in `common/permissions/credit.ts`:

- `icon`: 2
- `soundEffect`: 2
- `backgroundAmbientSound`: 5
- `backgroundMusic`: 10
- `faceset`: 5
- `spritesheet`: 10
- `spritesheetPreview`: 1
- `terrain`: 5
- `tileset`: 15

## Example: list all media

```bash
curl -sS "$BASE_URL/api/media/all" \
  -H "x-api-key:$RPGSTUDIO_API_KEY" \
  -H "Content-Type: application/json"
```

## Example: generate an icon

```bash
curl -sS -X POST "$BASE_URL/api/media/generate/icon" \
  -H "x-api-key:$RPGSTUDIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Golden potion bottle icon for a 2D RPG inventory"
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
- For metadata-only updates, use `PUT /api/media/:id` with JSON.
- Generation endpoints are prompt-driven. Keep prompts short and concrete.
