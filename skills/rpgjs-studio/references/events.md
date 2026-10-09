# Events API

Use this reference for creating, editing, attaching, and staging map events.

## Important model

- An event is meaningful only in the context of a map.
- The practical workflow starts from the map, not from the global event list.
- A map can contain several events that together define a local scenario.
- Event pages are evaluated from the bottom of the list to the top.
- The last page has the highest priority when its conditions are satisfied.

## Core endpoints

- List all project events: `GET /api/events`
- Create event: `POST /api/events`
- Read one event: `GET /api/events/:eventId`
- Update event: `PUT /api/events/:eventId`
- Delete event: `DELETE /api/events/:eventId`
- Replace triggers: `PUT /api/events/:eventId/triggers`
- List events on a map: `GET /api/maps/:mapId/events`

## Listing and pagination

`GET /api/events` keeps the legacy response shape and returns a raw event array.

To opt into pagination, pass `page` or `limit`:

```bash
curl -sS "$BASE_URL/api/events?page=1&limit=24" \
  -H "x-api-key:$RPGSTUDIO_API_KEY" \
  -H "Content-Type: application/json"
```

The paginated response shape is:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 24,
    "total": 0,
    "pageCount": 0
  }
}
```

Use this mode for UI lists or clients that only need one page of events. The maximum `limit` is `100`. Paginated lists are sorted by newest creation date by default. Optional query params:

- `sortBy=createdAt|updatedAt|name`
- `sortDirection=asc|desc`
- `eventType=all|character|enemy|free`
- `assignment=all|assigned|unassigned`

## Recommended workflow

1. Resolve the map first.
2. If the user already gave a map ID, use it.
3. Otherwise, search the target map by title or description from the map list and choose the closest match.
4. Fetch `GET /api/maps/:mapId/events` to understand the current scenario and nearby event logic.
5. If the user targets an existing event, identify it by ID, or match by `name` or `description` from the map events.
6. Create or update the event.
7. If the event needs a real workflow, create or update block collections and link them through triggers.

For a new event workflow, read [blocks.md](./blocks.md), resolve the map ID from
`GET /api/maps`, create the event and its block collection through the documented
REST endpoints, then link the collection through the event trigger. Use the
suggested pixel position when it is inside the map bounds; otherwise use the map
start. Do not fetch complete terrain or element layers solely to place the event.

## Map resolution

Use the map list as the search base when the user gives a title or description:

- `GET /api/maps`

Then filter client-side or in the calling logic by:

- `name`
- `description`

Prefer the best semantic match, then confirm through the returned map content if ambiguity remains.

## Event resolution

For an existing event inside a map:

1. Call `GET /api/maps/:mapId/events`.
2. Match by `name`, then by `description`.
3. If still ambiguous, inspect `GET /api/events/:eventId` for the shortlisted candidates.

Use the full map event list as narrative context before writing a new event, so the new scenario stays coherent with the rest of the map.

## Creation behavior

`POST /api/events` can also attach the new event to a map when the payload includes:

- `mapId`
- `position: { "x": number, "y": number }`

The server creates the event, then links it to the target map.

## Dependency resolution workflow

Before creating a new character event, derive a semantic appearance query from
the NPC role, the map description, and the situation. This applies in every
user language. Search both required appearance types:

- `GET /api/media?type=spritesheet&query=<semantic query>`
- `GET /api/media?type=faceset&query=<semantic query>`

Then, before sending media references in an event payload:

1. Search media with `GET /api/media?query=<search>`.
2. If found, use the returned `_id`.
3. If not found and the missing asset is supposed to be AI-generated, ask the user for permission first because generation consumes credits.
4. Create or generate the missing media, capture the returned `_id`, then continue with event creation or update.

Typical dependent fields:

- `graphic`
- `faceset`
- `pages[].graphic`
- Media references used by blocks linked to the event

If either a coherent spritesheet or faceset is missing, normally estimate and
propose generation for one missing type at a time. Do not silently create a
character event with no appearance. If the user explicitly declines faceset
generation, the event may omit the faceset. If the user explicitly forbids all
asset generation, create the functional event with whichever coherent searched
appearance IDs exist and omit any missing `graphic` or `faceset`.

## Priced item shop event

For an event that sells an item, resolve or create the real database item with
`itemType: "item"` and a positive `price`, then create a `call_shop` block whose
`items` array contains that record's `_id`. RPGJS debits the configured price
before granting the item. Use the database and block collection REST endpoints
documented in [database.md](./database.md) and [blocks.md](./blocks.md) for these
writes. Do not replace the shop block with manual choice, gold, and inventory
branches, and never invent an item ID, media filename, or placeholder map name.

## One-dialogue character without a workflow

When a character only says one dialogue and has no choices, rewards, state
changes, shop, movement sequence, or other scripted behavior, store the
dialogue directly on the `onAction` trigger. Do not create a block collection:

```json
{
  "name": "Village Baker",
  "eventType": "character",
  "mapId": "MAP_ID",
  "position": { "x": 384, "y": 240 },
  "triggers": [
    {
      "id": "dialogue",
      "type": "onAction",
      "enabled": true,
      "graphic": "SPRITESHEET_MEDIA_ID",
      "faceset": "FACESET_MEDIA_ID",
      "direction": "down",
      "pattern": "initial",
      "typeData": {
        "dialogue": {
          "text": "Fresh bread is ready.",
          "position": "bottom",
          "faceset": "FACESET_MEDIA_ID"
        }
      }
    }
  ]
}
```

The RPGJS Studio runtime displays `typeData.dialogue` on action before running
any optional linked workflow. Use a block collection only when the interaction
contains actual scripted steps.

## Payloads from schema

Fields supported by `eventSchema`:

- `eventType?: "character" | "enemy" | "free"`
- `name?: string`
- `description?: string`
- `pages?: Page[]`

Common `Page` fields from `pageSchema`:

- `id: string`
- `conditions?: { switch1, switch2, variable, variableValue, selfSwitch, item, goldComparison, goldValueType, goldAmount, goldVariableId, equippedItem, equipped, level, actor }`
- `typeData?: object`
- `graphic?: string`
- `direction?: "down" | "left" | "right" | "up"`
- `pattern?: "initial" | "loop" | "stop"`
- `hitbox?: { width: number, height: number }`
- `movement?: { type, speed, frequency, route }`
- `trigger?: "action_button" | "player_touch" | "event_touch" | "autorun" | "parallel"`
- `options?: { directionFix?: boolean, through?: boolean, alwaysOnTop?: boolean, alwaysOnBottom?: boolean }`
- `blockCollectionId?: string`

Event page hitbox:

- `width` and `height` are RPGJS-pixel dimensions and must be positive numbers.
- Missing `hitbox` keeps the runtime default `32 x 32`.
- Graphic/media scale affects only the displayed sprite size; it does not scale `hitbox.width` or `hitbox.height`.
- Studio previews the hitbox at the foot of the sprite.
- Runtime game map responses expose the selected page hitbox as `event.hitbox: { width, height }`; `event.triggers[].hitbox` keeps the page-level value.

Rendering layer options:

- Use either `alwaysOnTop` or `alwaysOnBottom`, not both.
- `alwaysOnTop` draws the event above nearby characters.
- `alwaysOnBottom` draws the event below nearby characters.

Touch trigger mapping:

- `trigger: "player_touch"` maps to runtime `type: "onTouch"` with `typeData.touchTarget: "player"`.
- `trigger: "event_touch"` maps to runtime `type: "onTouch"` with `typeData.touchTarget: "event"`.
- Existing runtime `onTouch` triggers without `typeData.touchTarget` behave as player touch.
- Older records that used `type: "onChange"` for event touch should be migrated to `type: "onTouch"` with `typeData.touchTarget: "event"` when updated.
- Event/event touch workflows use map variables for variable and switch blocks. Player-only blocks receive the first player currently on the map as a temporary fallback until explicit affected-player targeting exists.

## Conditions and variable IDs

When event page conditions use:

- `switch1`
- `switch2`
- `variable`
- `goldVariableId`

use variable IDs from the database, not free text labels.

Recommended workflow:

1. Fetch the events of the same map first.
2. Reuse an existing variable already used by nearby events when it matches the same story logic.
3. Otherwise create a new variable in `/api/database/variables`.
4. Use the returned `_id` in the page conditions.

## Page priority rule

When building multi-page events:

- Place the default fallback page first.
- Place more specific conditional pages later.
- Treat the lowest page in the list as the highest-priority page.

This keeps event behavior predictable when multiple conditions can match.

## Minimal create payload

```json
{
  "name": "Village Guard",
  "eventType": "character"
}
```

## Create and attach to a map

```bash
curl -sS -X POST "$BASE_URL/api/events" \
  -H "x-api-key:$RPGSTUDIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Village Guard",
    "eventType": "character",
    "description": "Warns the player before entering the forest",
    "mapId": "'"$MAP_ID"'",
    "position": { "x": 12, "y": 8 }
  }'
```

## Update event pages

```bash
curl -sS -X PUT "$BASE_URL/api/events/$EVENT_ID" \
  -H "x-api-key:$RPGSTUDIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "pages": [
      {
        "id": "page-default",
        "trigger": "action_button",
        "direction": "down",
        "pattern": "initial"
      },
      {
        "id": "page-quest-complete",
        "conditions": {
          "switch1": "VARIABLE_ID"
        },
        "trigger": "action_button"
      }
    ]
  }'
```

## Trigger update

Use `PUT /api/events/:eventId/triggers` with:

```json
{
  "triggers": [
    { "type": "onAction", "enabled": true, "blockCollectionId": "..." }
  ]
}
```

Accepted trigger types in the current server code:

- `onInit`
- `onAction`
- `onChange`
- `onTouch`
- `onParallel`

For direct trigger updates, set `typeData.touchTarget` on `onTouch` triggers when the workflow should distinguish player contact from event/event contact.

## Blocks workflow

Typical sequence:

1. Create or update the event.
2. Build a block collection for the target trigger.
3. Add scenario blocks such as dialogue, choices, variables, transfers, item changes, or audio.
4. Attach the collection through `blockCollectionId`.

For ready-made scenario patterns such as chests, also use `references/event-examples.md`.

## Notes

- `name` is required.
- `eventType` must be a valid normalized event type. If unsure, start with `character`.
- Use `GET /api/maps/:mapId/events` first when the task is map-scoped.
- Use the existing events on the same map as context before inventing a new scenario.
# Semantic search

`GET /api/events` accepts `query` and optional `minScore` (`0..1`, default `0.40`). Existing `eventType`, `assignment`, `page`, and `limit` filters remain available.
