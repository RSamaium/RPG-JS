# Event Examples

Use this reference when the user asks for a concrete event pattern rather than raw endpoint documentation.

## Chest event

Goal:

- page 1 shows a closed chest
- pressing action opens it once
- player gets feedback about the reward
- self switch `A` becomes `true`
- optional chest opening sound is played if available
- page 2 shows the opened chest
- page 2 has no workflow, so the chest cannot be opened again

## Recommended structure

### Page 1: closed chest

Use:

- closed chest graphic
- trigger: `action_button`
- no page condition

Workflow on page 1:

1. show reward feedback
2. optionally play chest-open sound
3. set self switch `A` to `true`

You can use either:

- `show_text` for classic RPG dialogue
- `show_notification` for lighter feedback

### Page 2: opened chest

Use:

- page condition with self switch `A` enabled
- opened chest graphic
- no workflow blocks

Because page 2 is the lower page with the matching condition, it becomes active after the first opening.

## Data dependencies

Before building the event:

1. resolve the target map
2. resolve the closed chest graphic media ID
3. resolve the opened chest graphic media ID
4. optionally resolve a chest opening sound media ID

If the sound is not found, skip the sound block.

## Example event payload

```json
{
  "name": "Treasure Chest",
  "eventType": "chest",
  "description": "A one-time chest that gives loot to the player",
  "mapId": "MAP_ID",
  "position": { "x": 12, "y": 8 },
  "pages": [
    {
      "id": "page-closed",
      "graphic": "CLOSED_CHEST_MEDIA_ID",
      "trigger": "action_button",
      "direction": "down",
      "pattern": "initial",
      "conditions": {}
    },
    {
      "id": "page-opened",
      "graphic": "OPENED_CHEST_MEDIA_ID",
      "trigger": "action_button",
      "direction": "down",
      "pattern": "initial",
      "conditions": {
        "selfSwitch": "A"
      }
    }
  ]
}
```

## Example block workflow for page 1

Use one trigger collection, usually `onAction`.

### Option A: classic text

```json
[
  {
    "id": "block_1711711711711_rewardtext",
    "type": "show_text",
    "level": 0,
    "data": {
      "text": "You found 50 gold in the chest.",
      "position": "bottom"
    }
  },
  {
    "id": "block_1711711711712_sound",
    "type": "play_se",
    "level": 0,
    "data": {
      "sound": "CHEST_OPEN_SOUND_MEDIA_ID"
    }
  },
  {
    "id": "block_1711711711713_selfswitch",
    "type": "self_switch",
    "level": 0,
    "data": {
      "switchName": "A",
      "value": true
    }
  }
]
```

If no sound exists, omit the `play_se` block.

### Option B: notification style

```json
[
  {
    "id": "block_1711711711711_rewardnotif",
    "type": "show_notification",
    "level": 0,
    "data": {
      "message": "You received 50 gold",
      "type": "info"
    }
  },
  {
    "id": "block_1711711711712_selfswitch",
    "type": "self_switch",
    "level": 0,
    "data": {
      "switchName": "A",
      "value": true
    }
  }
]
```

## Trigger payload

After creating the block collection, attach it to the event:

```json
{
  "triggers": [
    {
      "type": "onAction",
      "enabled": true,
      "blockCollectionId": "BLOCK_COLLECTION_ID"
    }
  ]
}
```

## Notes

- Keep the opened chest page after the closed chest page so it has higher priority when `A` is enabled.
- Use `self_switch` instead of a global variable for a chest that should track only its own state.
- Use `change_gold`, `change_item`, or `show_text` depending on the reward logic you want to attach.

## Enemy event

Goal:

- create an enemy in the database first
- configure its appearance, stats, rewards, and starter equipment
- place that enemy on the map as an event of type `enemy`
- set the enemy level on the map event page

## Required workflow

### Step 1: resolve equipment dependencies

An enemy can use starter equipment:

- `startingEquipment.weaponId`
- `startingEquipment.armorId`

Workflow:

1. Search existing items in `/api/database/items?query=<search>`.
2. Reuse matching weapon and armor if they already exist.
3. If missing, create them first in the database.
4. Reuse the returned item `_id`s in the enemy payload.

### Step 2: resolve reward item dependencies

If the enemy can drop items:

1. Search items first in `/api/database/items?query=<search>`.
2. Reuse the existing item `_id` if found.
3. Create missing reward items if needed.
4. Use those `_id`s in `reward.items`.

### Step 3: resolve appearance media

For the enemy database entry:

- `graphic`
- `faceset`

must use media `_id`s.

Workflow:

1. Search in `/api/media?query=<search>`.
2. Reuse if found.
3. If missing and the asset should be generated, ask for permission before spending credits.

## Example database enemy payload

This creates the reusable enemy entry in the database.

```json
{
  "name": "Forest Wolf",
  "graphic": "ENEMY_GRAPHIC_MEDIA_ID",
  "faceset": "ENEMY_FACESET_MEDIA_ID",
  "initialLevel": 3,
  "finalLevel": 8,
  "expCurve": {
    "basis": 30,
    "extra": 20,
    "accelerationA": 30,
    "accelerationB": 30
  },
  "parameters": {
    "maxHp": { "start": 220, "end": 520 },
    "maxSp": { "start": 20, "end": 60 },
    "str": { "start": 24, "end": 60 },
    "agi": { "start": 18, "end": 48 },
    "int": { "start": 8, "end": 18 },
    "dex": { "start": 14, "end": 34 }
  },
  "startingEquipment": {
    "weaponId": "WEAPON_ITEM_ID",
    "armorId": "ARMOR_ITEM_ID"
  },
  "startingInventory": [
    {
      "itemId": "HEALING_HERB_ITEM_ID",
      "amount": 1
    }
  ],
  "reward": {
    "exp": 25,
    "gold": 12,
    "items": [
      {
        "itemId": "WOLF_PELT_ITEM_ID",
        "amount": 1,
        "chance": 35
      }
    ]
  }
}
```

## Example API request to create the database enemy

```bash
curl -sS -X POST "$BASE_URL/api/database/enemies" \
  -H "x-api-key:$RPGSTUDIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Forest Wolf",
    "graphic": "'"$ENEMY_GRAPHIC_MEDIA_ID"'",
    "faceset": "'"$ENEMY_FACESET_MEDIA_ID"'",
    "initialLevel": 3,
    "finalLevel": 8,
    "startingEquipment": {
      "weaponId": "'"$WEAPON_ITEM_ID"'",
      "armorId": "'"$ARMOR_ITEM_ID"'"
    },
    "reward": {
      "exp": 25,
      "gold": 12,
      "items": [
        {
          "itemId": "'"$WOLF_PELT_ITEM_ID"'",
          "amount": 1,
          "chance": 35
        }
      ]
    }
  }'
```

## Example map event payload for the enemy

Once the database enemy exists, place it on the map as an event of type `enemy`.

Important page data:

- `typeData.enemyId`: the database enemy `_id`
- `typeData.level`: the encounter level on the map

```json
{
  "name": "Forest Wolf Encounter",
  "eventType": "enemy",
  "description": "A roaming wolf in the forest",
  "mapId": "MAP_ID",
  "position": { "x": 18, "y": 11 },
  "pages": [
    {
      "id": "page-default",
      "graphic": "ENEMY_GRAPHIC_MEDIA_ID",
      "trigger": "action_button",
      "direction": "down",
      "pattern": "initial",
      "typeData": {
        "enemyId": "ENEMY_DATABASE_ID",
        "level": 4
      }
    }
  ]
}
```

## Notes

- The enemy must exist in `/api/database/enemies` before you place it on the map.
- Equipment should be created or reused before enemy creation.
- Reward items should be created or reused before enemy creation.
- Tune `parameters` and `startingEquipment` together so the encounter strength stays coherent.
- The map event level is stored in `typeData.level`.
