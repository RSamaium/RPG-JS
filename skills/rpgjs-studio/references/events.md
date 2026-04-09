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

## Recommended workflow

1. Resolve the map first.
2. If the user already gave a map ID, use it.
3. Otherwise, search the target map by title or description from the map list and choose the closest match.
4. Fetch `GET /api/maps/:mapId/events` to understand the current scenario and nearby event logic.
5. If the user targets an existing event, identify it by ID, or match by `name` or `description` from the map events.
6. Create or update the event.
7. If the event needs a real workflow, create or update block collections and link them through triggers.

## Map resolution

Use the map list as the search base when the user gives a title or description:

- `GET /api/maps`

Then filter client-side or in the agent logic by:

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

Before sending media references in an event payload:

1. Search media with `GET /api/media?query=<search>`.
2. If found, use the returned `_id`.
3. If not found and the missing asset is supposed to be AI-generated, ask the user for permission first because generation consumes credits.
4. Create or generate the missing media, capture the returned `_id`, then continue with event creation or update.

Typical dependent fields:

- `graphic`
- `faceset`
- `pages[].graphic`
- Media references used by blocks linked to the event

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
- `movement?: { type, speed, frequency, route }`
- `trigger?: "action_button" | "player_touch" | "event_touch" | "autorun" | "parallel"`
- `options?: { directionFix?: boolean, through?: boolean, alwaysOnTop?: boolean }`
- `blockCollectionId?: string`

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
