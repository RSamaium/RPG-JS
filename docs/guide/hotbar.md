---
title: "Skill and item hotbar"
description: "Assign skills and consumable items to persistent keyboard and gamepad slots."
---

# Skill and item hotbar

RPGJS provides a persistent, server-authoritative ten-slot hotbar for skills and
usable inventory items. Slot contents are synchronized to clients and included
in player snapshots. The server remains responsible for validating ownership,
consuming SP or items, and applying gameplay effects.

## Display the built-in hotbar

Open the prebuilt CanvasEngine GUI from a server player hook:

```ts
import { RpgPlayer } from "@rpgjs/server"

export default {
  player: {
    onJoinMap(player: RpgPlayer) {
      player.initializeHotbar()
      player.showHotbar()
    }
  }
}
```

The default keyboard controls are `1` through `0`. Holding the left gamepad
bumper opens the radial selector; choose with the left stick and release the
bumper to use the slot.

Games can replace these client bindings through their normal RPGJS control
configuration. Bind the actions `hotbar1`, `hotbar2`, …, `hotbar0`; the slot
assignment itself does not contain a physical keyboard or gamepad key.

## Assign entries on the server

Slots use zero-based indexes:

```ts
player.assignHotbarSlot(0, { type: "skill", id: "fireball" })
player.assignHotbarSlot(1, { type: "item", id: "potion" })

player.clearHotbarSlot(1)
```

A skill must be learned and an item must be present, usable, and consumable.
Assigning an entry already present in another slot moves it. Empty slots are
preserved when `initializeHotbar()` is called again.

When no explicit entries are supplied, initialization reads numeric skill keys
first, then fills free slots with the remaining learned skills and usable items.

## Use a slot

For standard RPGJS gameplay:

```ts
player.useHotbarSlot(0, target)
```

Battle modules that own targeting should read `player.getHotbar()` and route the
selected entry through their own authoritative action. `@rpgjs/action-battle`
does this automatically, including cooldowns, projectiles, and target selection.

## React to assignments

Modules can listen to `onHotbarChange`:

```ts
export default {
  player: {
    onHotbarChange(player, change) {
      console.log(change.action, change.slot, change.entry)
    }
  }
}
```

The hook runs for initialization, assignment, and clearing. Its `state` value is
a cloned hotbar snapshot safe to inspect or send to another service.
