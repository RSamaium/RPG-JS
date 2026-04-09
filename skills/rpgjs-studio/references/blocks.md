# Blocks API

Use this reference for event workflows built with block collections.

## Strict rule

Only use the existing blocks listed below.

Do not invent:

- a new block type
- a new parameter name
- a new enum value
- a custom output port
- a custom behavior outside the listed payloads

Build every block payload with:

```json
{
  "type": "<one-of-the-allowed-types>",
  "data": { "...": "only schema-supported fields" }
}
```

For every created block, generate an `id` with this pattern:

```js
"block_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
```

Also set a `level` property on each block.

## Core endpoints

- List all block collections: `GET /api/blocks`
- Create block collection: `POST /api/blocks`
- Read one collection: `GET /api/blocks/:collectionId`
- Update collection: `PUT /api/blocks/:collectionId`
- Delete collection: `DELETE /api/blocks/:collectionId`
- Add a block: `POST /api/blocks/:collectionId/blocks`
- Update a block: `PUT /api/blocks/:collectionId/blocks/:blockId`
- Delete a block: `DELETE /api/blocks/:collectionId/blocks/:blockId`
- Duplicate a block: `POST /api/blocks/:collectionId/blocks/:blockId/duplicate`

## Block collection payload

```json
{
  "blocks": [],
  "metadata": {
    "description": "onAction workflow for village guard"
  }
}
```

## Variable and reference resolution

Some blocks require existing IDs.

### Variables

When a payload uses:

- `variableId`
- `amountVariableId`
- `compareVariableId`
- `switchId`
- `switchName`
- event page conditions such as `switch1`, `switch2`, `variable`, `goldVariableId`

the value must be a variable ID from the database.

Workflow:

1. Search existing variables with `GET /api/database/variables?query=<search>`.
2. Reuse a variable already used by other events on the same map when it matches the scenario.
3. If no suitable variable exists, create one with `POST /api/database/variables`.
4. Use the returned `_id` in the block or event payload.

Example variable:

```json
{
  "name": "quest_forest_done",
  "description": "Tracks whether the forest quest is completed"
}
```

### Items

Fields like `itemId` must use an item `_id` from `/api/database/items`.

### Media

Fields like `icon`, `sound`, `music`, `spritesheet`, `animation`, `faceset` must use media `_id`s resolved from `/api/media`.

## Tree structure rules

Some blocks can contain nested scenarios.

### Shared rules

- Every block must have an `id`.
- Every block should have a `level`.
- A child block must have `parentId` equal to the parent block `id`.
- Top-level blocks usually use `level: 0`.
- Blocks nested inside another block use a higher `level` than the parent.

### Conditional branch

`conditional_branch` can contain nested blocks in:

- `children: []`

Those child blocks represent the scenario executed when the condition is true.

Example shape:

```json
{
  "id": "block_1711711711711_abcd123ef",
  "type": "conditional_branch",
  "level": 0,
  "data": {
    "conditionType": "variable",
    "variableId": "VARIABLE_ID",
    "comparison": "greater_equal",
    "valueType": "constant",
    "constantValue": 1
  },
  "children": [
    {
      "id": "block_1711711711712_qwerty123",
      "type": "show_text",
      "level": 1,
      "parentId": "block_1711711711711_abcd123ef",
      "data": {
        "text": "The door opens."
      }
    }
  ]
}
```

### Show choices

`show_choices` has:

- `choices`
- `choiceChildren`

`choiceChildren` is an array of scenarios. Each array entry matches the choice at the same index in `choices`.

Each block inside a choice scenario:

- must have its own `id`
- must have a higher `level` than the `show_choices` block
- must have `parentId` equal to the `show_choices` block `id`

Example shape:

```json
{
  "id": "block_1711711711713_parent123",
  "type": "show_choices",
  "level": 0,
  "data": {
    "question": "What will you do?",
    "choices": [
      { "text": "Attack" },
      { "text": "Leave" }
    ],
    "choiceChildren": [
      [
        {
          "id": "block_1711711711714_childaaa",
          "type": "show_text",
          "level": 1,
          "parentId": "block_1711711711713_parent123",
          "data": {
            "text": "You prepare for battle."
          }
        }
      ],
      [
        {
          "id": "block_1711711711715_childbbb",
          "type": "transfer_player",
          "level": 1,
          "parentId": "block_1711711711713_parent123",
          "data": {
            "destination": {
              "mapId": "MAP_ID",
              "x": 4,
              "y": 9
            },
            "direction": "down"
          }
        }
      ]
    ]
  }
}
```

## Generic payload patterns

These patterns cover many blocks.

### Numeric modification blocks

Used by:

- `change_gold`
- `change_hp`
- `change_sp`
- `change_exp`
- `change_level`
- `change_parameter`
- `change_variable`

Pattern:

```json
{
  "type": "change_gold",
  "data": {
    "type": "constant",
    "operation": "add",
    "amount": 100
  }
}
```

Or variable-driven:

```json
{
  "type": "change_gold",
  "data": {
    "type": "variable",
    "operation": "set",
    "amountVariableId": "VARIABLE_ID"
  }
}
```

Allowed `type` values:

- `constant`
- `variable`

Common `operation` values:

- `set`
- `add`
- `sub`
- `mul`
- `div`
- `mod`

Not all blocks support all operations:

- `change_hp`, `change_sp`, `change_exp`, `change_level`, `change_parameter`: `set`, `add`, `sub`
- `change_gold`: `set`, `add`, `sub`, `mul`
- `change_variable`: `set`, `add`, `sub`, `mul`, `div`, `mod`

### Conditional branch

`conditional_branch` uses a condition payload and can branch through `true` and `false`.

Common condition types:

- `switch`
- `self_switch`
- `variable`
- `player`
- `gold`
- `item`
- `level`
- `equipped`

Example with variable:

```json
{
  "type": "conditional_branch",
  "data": {
    "conditionType": "variable",
    "variableId": "VARIABLE_ID",
    "comparison": "greater_equal",
    "valueType": "constant",
    "constantValue": 1
  }
}
```

Example with switch:

```json
{
  "type": "conditional_branch",
  "data": {
    "conditionType": "switch",
    "switchId": "VARIABLE_ID",
    "switchValue": true
  }
}
```

Example with self switch:

```json
{
  "type": "conditional_branch",
  "data": {
    "conditionType": "self_switch",
    "selfSwitchName": "A",
    "selfSwitchValue": true
  }
}
```

## Available blocks and payloads

### `show_text`

Use for dialogue or narration.

```json
{
  "type": "show_text",
  "data": {
    "text": "The forest ahead is dangerous.",
    "speaker": "EVENT_ID",
    "faceset": "FACESET_MEDIA_ID",
    "position": "bottom"
  }
}
```

Allowed `position`:

- `top`
- `middle`
- `bottom`

### `show_choices`

Use for player decisions. Supports 2 to 4 choices.

```json
{
  "type": "show_choices",
  "data": {
    "question": "What will you do?",
    "choices": [
      { "text": "Attack" },
      { "text": "Leave" }
    ],
    "choiceChildren": [
      [],
      []
    ]
  }
}
```

Outputs:

- `choice1`
- `choice2`
- `choice3`
- `choice4`

### `show_notification`

Use for short HUD-style messages.

```json
{
  "type": "show_notification",
  "data": {
    "message": "Quest updated",
    "time": 3000,
    "icon": "ICON_MEDIA_ID",
    "sound": "SOUND_MEDIA_ID",
    "type": "info"
  }
}
```

Allowed `type`:

- `info`
- `warn`
- `error`

### `conditional_branch`

Use for scenario branching.

```json
{
  "type": "conditional_branch",
  "data": {
    "conditionType": "gold",
    "goldComparison": "greater_equal",
    "goldValueType": "constant",
    "goldAmount": 100
  }
}
```

### `wait`

Use to pause execution.

```json
{
  "type": "wait",
  "data": {
    "duration": 1.5
  }
}
```

### `set_variable`

Use to set or modify a game variable directly.

```json
{
  "type": "set_variable",
  "data": {
    "variableId": "VARIABLE_ID",
    "operation": "set",
    "value": "1"
  }
}
```

Allowed `operation`:

- `set`
- `add`
- `subtract`
- `multiply`
- `divide`
- `modulo`

### `set_switch`

Use for ON/OFF global state. `switchName` must be a variable ID.

```json
{
  "type": "set_switch",
  "data": {
    "switchName": "VARIABLE_ID",
    "value": true
  }
}
```

### `self_switch`

Use for event-local state.

```json
{
  "type": "self_switch",
  "data": {
    "switchName": "A",
    "value": true
  }
}
```

Allowed `switchName`:

- `A`
- `B`
- `C`
- `D`
- `E`
- `F`

### `change_gold`

```json
{
  "type": "change_gold",
  "data": {
    "type": "constant",
    "operation": "add",
    "amount": 50
  }
}
```

### `change_hp`

```json
{
  "type": "change_hp",
  "data": {
    "type": "constant",
    "operation": "sub",
    "amount": 10
  }
}
```

### `change_sp`

```json
{
  "type": "change_sp",
  "data": {
    "type": "constant",
    "operation": "add",
    "amount": 5
  }
}
```

### `change_exp`

```json
{
  "type": "change_exp",
  "data": {
    "type": "constant",
    "operation": "add",
    "amount": 100
  }
}
```

### `change_level`

```json
{
  "type": "change_level",
  "data": {
    "type": "constant",
    "operation": "add",
    "amount": 1
  }
}
```

### `change_parameter`

Use for `maxHp`, `maxSp`, `str`, `agi`, `int`, `dex`.

```json
{
  "type": "change_parameter",
  "data": {
    "parameterId": "str",
    "type": "constant",
    "operation": "add",
    "amount": 5
  }
}
```

Allowed `parameterId`:

- `maxHp`
- `maxSp`
- `str`
- `agi`
- `int`
- `dex`

### `recover_all`

Use to fully recover the player.

```json
{
  "type": "recover_all",
  "data": {}
}
```

### `change_variable`

Use to modify an existing variable numerically.

```json
{
  "type": "change_variable",
  "data": {
    "variableId": "VARIABLE_ID",
    "type": "constant",
    "operation": "add",
    "amount": 1
  }
}
```

### `change_item`

Use to add or remove inventory items.

```json
{
  "type": "change_item",
  "data": {
    "itemId": "ITEM_ID",
    "operation": "add",
    "amountType": "constant",
    "amount": 1
  }
}
```

Variable-driven amount:

```json
{
  "type": "change_item",
  "data": {
    "itemId": "ITEM_ID",
    "operation": "remove",
    "amountType": "variable",
    "amountVariableId": "VARIABLE_ID"
  }
}
```

### `change_equipment`

Use to equip or unequip a player slot.

```json
{
  "type": "change_equipment",
  "data": {
    "operation": "equip",
    "slot": "weapon",
    "itemId": "ITEM_ID"
  }
}
```

Allowed `operation`:

- `equip`
- `unequip`

Allowed `slot`:

- `weapon`
- `armor`
- `helmet`
- `gloves`
- `boots`
- `shield`

### `move_route`

Use for scripted movement or rotation.

```json
{
  "type": "move_route",
  "data": {
    "eventId": "EVENT_ID",
    "repeat": false,
    "ignoreIfBlocked": false,
    "route": [
      { "action": "move_up" },
      { "action": "turn_right" }
    ]
  }
}
```

Actions include:

- `move_down`
- `move_left`
- `move_right`
- `move_up`
- `move_random`
- `move_toward_player`
- `move_away_from_player`
- `turn_down`
- `turn_left`
- `turn_right`
- `turn_up`
- `turn_90_right`
- `turn_90_left`
- `turn_180`
- `turn_90_left_or_right`
- `turn_random`
- `turn_toward_player`
- `turn_away_from_player`
- `change_speed`
- `change_frequency`
- `set_visible`
- `set_move_animation`
- `set_direction_fix`
- `set_through`
- `set_always_on_top`
- `set_can_move`
- `set_through_other_player`

Actions that require `value`:

- `change_speed`: `0.2 | 0.5 | 1 | 3 | 5 | 7 | 10`
- `change_frequency`: `600 | 400 | 200 | 100 | 50 | 25 | 0`
- boolean toggles: `true | false`

### `change_character_graphic`

Use to swap an event or player sprite.

```json
{
  "type": "change_character_graphic",
  "data": {
    "eventId": "EVENT_ID",
    "spritesheet": "SPRITESHEET_MEDIA_ID"
  }
}
```

### `apply_graphic_animation`

Use to apply an animation state to a target.

```json
{
  "type": "apply_graphic_animation",
  "data": {
    "eventId": "EVENT_ID",
    "spritesheet": "ANIMATION_MEDIA_ID",
    "repeatType": "count",
    "repeatCount": 2
  }
}
```

Allowed `repeatType`:

- `infinite`
- `count`

### `show_up_animation`

Use for an icon/text pop-up above the player.

```json
{
  "type": "show_up_animation",
  "data": {
    "text": "Quest Complete",
    "icon": "ICON_MEDIA_ID",
    "sound": "SOUND_MEDIA_ID"
  }
}
```

### `transfer_player`

Use to move the player to another map position.

```json
{
  "type": "transfer_player",
  "data": {
    "destination": {
      "mapId": "MAP_ID",
      "x": 10,
      "y": 5
    },
    "direction": "down"
  }
}
```

Allowed `direction`:

- `up`
- `down`
- `left`
- `right`

### `show_animation`

Use to play a visual animation at a position or on an event.

```json
{
  "type": "show_animation",
  "data": {
    "targetType": "event",
    "eventId": "EVENT_ID",
    "spritesheet": "ANIMATION_MEDIA_ID"
  }
}
```

Or on map position:

```json
{
  "type": "show_animation",
  "data": {
    "targetType": "position",
    "position": { "x": 12, "y": 8 },
    "spritesheet": "ANIMATION_MEDIA_ID"
  }
}
```

### `set_weather`

Use to replace map weather.

Preset mode:

```json
{
  "type": "set_weather",
  "data": {
    "preset": "lightRain"
  }
}
```

Custom mode:

```json
{
  "type": "set_weather",
  "data": {
    "preset": "custom",
    "effect": "rain",
    "params": {
      "density": 0.6,
      "speed": 1.2,
      "opacity": 0.7
    }
  }
}
```

Custom `effect`:

- `rain`
- `snow`
- `fog`
- `clouds`

### `call_main_menu`

```json
{
  "type": "call_main_menu",
  "data": {
    "disabledSave": false
  }
}
```

### `call_gameover`

```json
{
  "type": "call_gameover",
  "data": {
    "title": "Defeat",
    "subtitle": "You were overwhelmed."
  }
}
```

### `show_save`

```json
{
  "type": "show_save",
  "data": {}
}
```

### `call_shop`

Use to open a shop with item IDs from the database.

```json
{
  "type": "call_shop",
  "data": {
    "items": ["ITEM_ID_1", "ITEM_ID_2"],
    "sellMultiplier": 0.5,
    "message": "Take a look at my wares.",
    "face": "FACESET_EXPRESSION"
  }
}
```

### `erase_event`

Use to remove an event from the current map.

```json
{
  "type": "erase_event",
  "data": {
    "eventId": "EVENT_ID",
    "animation": "ANIMATION_MEDIA_ID"
  }
}
```

### `play_bgm`

```json
{
  "type": "play_bgm",
  "data": {
    "music": "BGM_MEDIA_ID"
  }
}
```

### `play_se`

```json
{
  "type": "play_se",
  "data": {
    "sound": "SOUND_MEDIA_ID"
  }
}
```

## Notes

- Reuse variable IDs already used by other events on the same map when that preserves scenario coherence.
- Create a new variable only if no existing one matches the intended meaning.
- For event page conditions, use variable IDs for `switch1`, `switch2`, `variable`, and `goldVariableId`.
- Stay inside the allowed block list only.
