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
- `mainActorId?: string` (assigned through the Actors API)
- `startMapId?: string`
- `menus.characterSelect?: { enabled, guiId?, settings: { allActors, actorIds } }`

## Dependency resolution workflow

### Character selection GUI

Set `menus.characterSelect.enabled` to show the native character selector only
for new games. With `settings.allActors: true`, every project Actor is offered.
With `allActors: false`, `settings.actorIds` contains the ordered Studio Actor
`_id` values to offer. Invalid or deleted IDs are ignored; an empty effective
list skips the GUI and uses the main Actor. The player's choice is saved on that
player and never changes the project `mainActorId`.

### Main actor

Do not write playable character configuration directly to project settings.
Create or update an actor through `/api/database/actors`, then assign it with
`PUT /api/database/actors/:id/main`. Read the current selection with
`GET /api/database/actors/main`.

The actor owns appearance, hitbox, progression, equipment, inventory,
animations, and skills. See `references/database.md` for the complete actor
shape and dependency resolution rules.

### Actor animations

- `animations.attack`, `animations.hurt`, `animations.die`, and `animations.castSpell` are spritesheet media `_id`s.
- Search `/api/media?query=<search>` first.
- If missing and generation is required, ask user permission before spending credits.

### Actor starting equipment

- `startingEquipment.weaponId` and `startingEquipment.armorId` are item `_id`s from `/api/database/items`.
- Search `/api/database/items?query=<search>` first.
- If missing, create the weapon or armor item, then reuse the returned `_id`.

### Actor starting inventory

- Each `startingInventory[].itemId` is an item `_id`.
- Search `/api/database/items?query=<search>` first.
- Create missing items before updating the actor.

### Actor skills

- Each `skills[].skillId` is a skill `_id`.
- Search `/api/database/skills?query=<search>` first.
- `skills[].level` is the minimum hero level required to acquire the skill.

## Example: update project settings

```bash
curl -sS -X PUT "$BASE_URL/api/projects/$PROJECT_ID" \
  -H "x-api-key:$RPGSTUDIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My RPG Project"
  }'
```

## Example: set actor starter equipment

```bash
curl -sS -X PUT "$BASE_URL/api/database/actors/$ACTOR_ID" \
  -H "x-api-key:$RPGSTUDIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "startingEquipment": {
      "weaponId": "'"$WEAPON_ID"'",
      "armorId": "'"$ARMOR_ID"'"
    }
  }'
```

Assign that actor as the main hero when needed:

```bash
curl -sS -X PUT "$BASE_URL/api/database/actors/$ACTOR_ID/main" \
  -H "x-api-key:$RPGSTUDIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Notes

- This route is the right place for general project-level settings.
- For map-editor settings such as width, height, weather, or map sound, use `PUT /api/maps/:mapId/params` instead and read `references/maps.md`.
- If the exact project payload shape matters, fetch the project first and update only the keys the user asked to change.
