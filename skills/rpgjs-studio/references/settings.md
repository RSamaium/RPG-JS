# Settings API

Use this reference for general project settings, not map-local params.

## Core endpoints

- Read current project: `GET /api/projects/:projectId`
- Update current project: `PUT /api/projects/:projectId`

## How to get `projectId`

- Reuse a project ID already provided by the user, if present.
- Otherwise, inspect the current task context or fetch the active project through the platform workflow before updating settings.

## Payloads from schema

Useful fields from `projectSchema`:

- `name?: string`
- `subtitle?: string`
- `keyboardControls?: { down?, up?, left?, right?, action?, back? }`
- `hero?: { graphic?: string, faceset?: string }`
- `startingEquipment?: { weaponId?: string, armorId?: string }`
- `startingInventory?: Array<{ itemId: string, amount: number }>`
- `initialLevel?: number`
- `finalLevel?: number`
- `expCurve?: { basis, extra, accelerationA, accelerationB }`
- `parameters?: { maxHp, maxSp, str, agi, int, dex }`
- `startMapId?: string`

## Dependency resolution workflow

### Hero appearance

- `hero.graphic` and `hero.faceset` are media `_id`s.
- Search `/api/media?query=<search>` first.
- If missing and generation is required, ask user permission before spending credits.

### Starting equipment

- `startingEquipment.weaponId` and `startingEquipment.armorId` are item `_id`s from `/api/database/items`.
- Search `/api/database/items?query=<search>` first.
- If missing, create the weapon or armor item, then reuse the returned `_id`.

### Starting inventory

- Each `startingInventory[].itemId` is an item `_id`.
- Search `/api/database/items?query=<search>` first.
- Create missing items before updating project settings.

## Example: update project settings

```bash
curl -sS -X PUT "$BASE_URL/api/projects/$PROJECT_ID" \
  -H "x-api-key:$RPGSTUDIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My RPG Project"
  }'
```

## Example: set hero starter equipment

```bash
curl -sS -X PUT "$BASE_URL/api/projects/$PROJECT_ID" \
  -H "x-api-key:$RPGSTUDIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "startingEquipment": {
      "weaponId": "'"$WEAPON_ID"'",
      "armorId": "'"$ARMOR_ID"'"
    }
  }'
```

## Notes

- This route is the right place for general project-level settings.
- For map-editor settings such as width, height, weather, or map sound, use `PUT /api/maps/:mapId/params` instead and read `references/maps.md`.
- If the exact project payload shape matters, fetch the project first and update only the keys the user asked to change.
