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

## Execution contexts

Blocks can declare `requiredCapabilities`.

- `player`: needs a current RPGJS player.
- `event`: needs a current RPGJS event.
- `map`: needs a current map.
- `variables`, `inventory`, `equipment`, `skills`, `ui`, `audio`: domain-specific capabilities.

When building a map entry workflow (`mapLoadBlockCollectionId` / `mapLoadBlocks`), use
blocks that can run with a current player and map, but without a current event. The
Studio UI uses `eventBuilderProfiles.mapLoad` for this context; it hides blocks that
require `event`, and removes field options such as `current_event` from compatible
schemas.

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

### `query_area`

Run child blocks once for each player or event selected through the native
`RpgMap.queryArea()` API. Results run from nearest to farthest, with IDs used as
the deterministic tie-breaker.

```json
{
  "type": "query_area",
  "data": {
    "centerType": "entity",
    "centerEventId": "$this",
    "shape": "circle",
    "radius": 64,
    "targets": "all",
    "includeOrigin": false,
    "offsetX": 0,
    "offsetY": 0
  },
  "children": []
}
```

Supported shapes are `circle`, `rect`, `line`, and `cross`. The center may be
an entity (`$player`, `$this`, or an event ID) or an absolute pixel position.
Inside children, a player hit becomes the current player and an event hit
becomes `$this`.

### `call_character_select`

Open the character selector for the active player. Use every database Actor or
provide an ordered unique subset. When the player confirms, the selected Actor
is applied and persisted for that player/save while acquired progression is
preserved. Cancelling leaves the current Actor unchanged.

All Actors:

```json
{
  "type": "call_character_select",
  "data": {
    "allActors": true,
    "actorIds": [],
    "allowCancel": false
  }
}
```

Selected Actors:

```json
{
  "type": "call_character_select",
  "data": {
    "allActors": false,
    "actorIds": ["ACTOR_ID_1", "ACTOR_ID_2"],
    "allowCancel": true
  }
}
```

`actorIds` values must be Actor `_id` values from `/api/database/actors`. At
least one valid ID is required when `allActors` is `false`.

### `change_class`

Assign a database Class to the active player.

```json
{
  "type": "change_class",
  "data": {
    "classId": "CLASS_ID"
  }
}
```

`classId` must be a Class `_id` from `/api/database/classes`.

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

To collect a value in the same dialog, enable input and select an existing
database variable (or create one through the Studio variable picker):

```json
{
  "type": "show_text",
  "data": {
    "text": "How old are you?",
    "inputEnabled": true,
    "inputVariableId": "VARIABLE_ID",
    "inputControl": "input",
    "inputType": "number",
    "inputRequired": true,
    "inputMin": 1,
    "inputMax": 120
  }
}
```

`inputControl` accepts `input` or `textarea`. Single-line inputs accept
`text`, `number`, `password`, or `email`; textareas always resolve to text.
Optional settings include placeholder/default value, confirm/cancel labels,
cancel-button visibility, length limits, numeric min/max/step, and textarea
rows. The submitted string or number is stored in `inputVariableId`; cancelling
stores `null`.

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

Use to set or modify a game variable. This is the only public variable-value
block; do not create `change_variable` in new payloads.

```json
{
  "type": "set_variable",
  "data": {
    "variableId": "VARIABLE_ID",
    "operation": "set",
    "valueSource": "constant",
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

Allowed `valueSource`:

- `constant`: use `value` as a free text field
- `variable`: use `sourceVariableId`
- `random`: use `randomMin` and `randomMax`
- `area_target_id`, `area_target_kind`, `area_distance`,
  `area_distance_ratio`, and `area_falloff_linear`: read the current
  `query_area` hit; outside its children they resolve to `""` or `0`
- `player_x`
- `player_y`
- `player_direction`
- `map_id`
- `gold`
- `player_id`
- `player_name`
- `level`
- `hp`
- `sp`

Examples:

```json
{
  "type": "set_variable",
  "data": {
    "variableId": "VARIABLE_ID",
    "operation": "add",
    "valueSource": "variable",
    "sourceVariableId": "OTHER_VARIABLE_ID"
  }
}
```

```json
{
  "type": "set_variable",
  "data": {
    "variableId": "VARIABLE_ID",
    "operation": "set",
    "valueSource": "random",
    "randomMin": 1,
    "randomMax": 10
  }
}
```

```json
{
  "type": "set_variable",
  "data": {
    "variableId": "VARIABLE_ID",
    "operation": "set",
    "valueSource": "player_x"
  }
}
```

```json
{
  "type": "set_variable",
  "data": {
    "variableId": "VARIABLE_ID",
    "operation": "set",
    "valueSource": "map_id"
  }
}
```

```json
{
  "type": "set_variable",
  "data": {
    "variableId": "VARIABLE_ID",
    "operation": "set",
    "valueSource": "gold"
  }
}
```

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

### `change_skill`

Use to teach or remove a database skill from the player.

```json
{
  "type": "change_skill",
  "data": {
    "skillId": "SKILL_ID",
    "state": "learn"
  }
}
```

Allowed `state`: `learn`, `forget`.

### `use_skill`

Use to make the player use a learned skill.

```json
{
  "type": "use_skill",
  "data": {
    "skillId": "SKILL_ID"
  }
}
```

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
- `set_always_on_bottom`
- `set_can_move`
- `set_through_other_player`

Actions that require `value`:

- `change_speed`: `0.2 | 0.5 | 1 | 3 | 5 | 7 | 10`
- `change_frequency`: `600 | 400 | 200 | 100 | 50 | 25 | 0`
- boolean toggles: `true | false`

Use either `set_always_on_top` or `set_always_on_bottom` for a route step, not both at the same time for the same target.

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

### `camera_follow`

Use to make the current player's camera follow a player or event target.

```json
{
  "type": "camera_follow",
  "data": {
    "eventId": "$player"
  }
}
```

Allowed `eventId` values:

- `$player`: return the camera to the current player
- `$this`: follow the current event
- any map event id: follow that event

By default, `smoothMove` is `true`. Use `false` for an instant camera change:

```json
{
  "type": "camera_follow",
  "data": {
    "eventId": "EVENT_ID",
    "smoothMove": false
  }
}
```

Advanced smooth transition options are passed to RPGJS `player.cameraFollow()`:

```json
{
  "type": "camera_follow",
  "data": {
    "eventId": "EVENT_ID",
    "time": 1000,
    "ease": "easeInOutQuad"
  }
}
```

Allowed `ease` values are the easing names exposed by the Studio dropdown, including `linear`, `easeInQuad`, `easeOutQuad`, `easeInOutQuad`, `easeInCubic`, `easeOutCubic`, `easeInOutCubic`, `easeInSine`, `easeOutSine`, `easeInOutSine`, `easeInBack`, `easeOutBack`, and related `Quart`, `Quint`, `Expo`, and `Circ` variants.

### `set_hitbox`

Use to change the hitbox size of the current player or a map event.

```json
{
  "type": "set_hitbox",
  "data": {
    "eventId": "$this",
    "width": 48,
    "height": 32
  }
}
```

Allowed `eventId` values:

- `$player`: current player
- `$this`: current event
- any map event id: target that event

`width` and `height` are positive RPGJS-pixel dimensions. They are not scaled by the target graphic/media scale.

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

### `spawn_common_event`

Use to create a visible reusable event object on the current map. The event ID must be a common event ID from the game response or event database.

```json
{
  "type": "spawn_common_event",
  "data": {
    "commonEventId": "COMMON_EVENT_ID",
    "positionMode": "player"
  }
}
```

Fixed position:

```json
{
  "type": "spawn_common_event",
  "data": {
    "commonEventId": "COMMON_EVENT_ID",
    "positionMode": "fixed",
    "position": { "x": 10, "y": 5 }
  }
}
```

Variable position:

```json
{
  "type": "spawn_common_event",
  "data": {
    "commonEventId": "COMMON_EVENT_ID",
    "positionMode": "variable",
    "positionVariableXId": "VARIABLE_X_ID",
    "positionVariableYId": "VARIABLE_Y_ID"
  }
}
```

Allowed `positionMode`:

- `player`
- `current_event`
- `variable`
- `fixed`

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

### `call_common_event`

Use to execute another reusable event workflow in the current context.

```json
{
  "type": "call_common_event",
  "data": {
    "commonEventId": "COMMON_EVENT_ID",
    "parameters": {},
    "maxDepth": 10
  }
}
```

## Notes

- Reuse variable IDs already used by other events on the same map when that preserves scenario coherence.
- Create a new variable only if no existing one matches the intended meaning.
- For event page conditions, use variable IDs for `switch1`, `switch2`, `variable`, and `goldVariableId`.
- Stay inside the allowed block list only.
# Semantic search

`GET /api/blocks` accepts `query` and optional `minScore` (`0..1`, default `0.40`). Block collections expose root `name` and `description`; legacy metadata values remain readable.
