---
title: "Skill and item hotbar"
description: "Assign, theme, show, and hide persistent server-authoritative skill and item slots."
---

# Skill and item hotbar

RPGJS provides a persistent, server-authoritative ten-slot hotbar for learned
skills, usable regular items, and plugin-provided entry types. Slot contents
are synchronized to clients and included in player snapshots. The server
remains responsible for validating ownership, consuming SP or items, and
applying gameplay effects in standalone and MMORPG modes.

## Display and hide the built-in hotbar

Open the prebuilt CanvasEngine GUI from a server player hook:

```ts
import type { RpgPlayer, RpgPlayerHooks } from "@rpgjs/server"

const player: RpgPlayerHooks = {
  onJoinMap(player: RpgPlayer) {
    player.initializeHotbar()
    player.showHotbar()
  }
}
```

`showHotbar()` initializes from the current loadout by default. Pass
`autoInitialize: false` when the game needs to seed it later.

Hiding the GUI does not clear persistent assignments:

```ts
player.hideHotbar()
await player.showHotbar()
```

The default keyboard controls are `1` through `0`. Holding the left gamepad
bumper opens the radial selector; choose with the left stick and release the
bumper to use the slot.

Games can replace these client bindings through their normal RPGJS control
configuration. Bind the actions `hotbar1`, `hotbar2`, …, `hotbar0`; slot state
never stores a physical keyboard or gamepad key.

## Start with items, skills, or both

Pass an ordered list to initialize a specific loadout:

```ts
player.initializeHotbar([
  { type: "item", id: "berry-snack" },
  { type: "skill", id: "water-crops" },
  { type: "item", id: "field-tonic" },
])
```

A skill must be learned. An item must be present in the inventory, usable, and
consumable. Invalid initial entries are ignored. Calling `initializeHotbar()`
again preserves player choices, so use assignment methods for later changes:

```ts
player.assignHotbarSlot(0, { type: "skill", id: "harvest" })
player.assignHotbarSlot(1, { type: "item", id: "berry-snack" })
player.clearHotbarSlot(1)
```

Slots use zero-based indexes. Assigning the same entry elsewhere moves it
instead of duplicating it.

When no explicit list is supplied, initialization places skills with numeric
database keys first, then fills free slots with the remaining learned skills
and usable consumable items. If the loadout is still empty, the state remains
uninitialized so a later skill or inventory refresh can seed it.

## Assign from the main menu

The built-in main menu supplies Items and Skills lists. Selecting an eligible
entry exposes **Assign to hotbar**, followed by the slot picker:

```ts
player.callMainMenu()
```

The Items screen keeps separate Item, Weapon, and Armor tabs for browsing.
Weapons and armors are managed from the Equip screen and never expose Use or
Assign to hotbar. Regular items that are non-consumable, absent, or otherwise
unusable cannot be assigned through the native item entry type. Register a
custom entry type
when a game needs tools, emotes, quests, or another authoritative action.
The assignment action is also omitted from Items or Skills when that entry type
is excluded by `allowedEntryTypes`.

## Configure capacity

The persistent state always retains ten slots, while `capacity` controls how
many are currently accessible:

```ts
player.configureHotbar({
  capacity: current => Math.min(10, current.level + 2),
  lockedSlotHint: (_current, slot) => `Reach level ${slot + 1}`,
})
```

Reducing capacity preserves assignments in locked slots. Call
`player.refreshHotbar()` after game-specific state changes that can affect a
custom capacity resolver.

Restrict a hotbar to items, skills, or another registered entry type with
`allowedEntryTypes`:

```ts
player.configureHotbar({
  capacity: 6,
  allowedEntryTypes: ["skill", "item"],
})
```

The option also accepts a per-player resolver. Entries excluded by the current
configuration stay in the persistent ten-slot state, but are rendered as empty
and cannot be assigned or used. Allowing their type again restores them without
changing the player's saved layout.

When the last copy of a consumable item is used from the native hotbar, its
assignment is cleared automatically. Remaining stacks keep their assignment
and update the quantity badge.

Action Battle forwards the same configuration and can resolve visibility per
player:

```ts
provideActionBattle({
  ui: {
    hotbar: {
      enabled: player => player.level >= 2,
      autoOpen: true,
      capacity: player => Math.min(10, player.level + 2),
      allowedEntryTypes: ["skill"],
    },
  },
})
```

With `autoOpen`, the module re-evaluates `enabled` on map changes and closes an
open hotbar when the resolver returns `false`.

## Theme the native component

The built-in component uses CSS custom properties with defaults. Set them from
a client stylesheet; replacing the component is not required:

```css
:root {
  --rpg-hotbar-font-family: "Trebuchet MS", sans-serif;
  --rpg-hotbar-gold: #7f9b55;
  --rpg-hotbar-gold-bright: #f8e7a8;
  --rpg-hotbar-wood: #8a542f;
  --rpg-hotbar-wood-dark: #3f261b;
  --rpg-hotbar-gap: 5px;
  --rpg-hotbar-slot-size: 58px;
  --rpg-hotbar-slot-radius: 4px;
  --rpg-hotbar-plate-radius: 8px;
  --rpg-hotbar-key-background: #f5d98b;
}
```

### Theme variables

| Variable | Controls |
| --- | --- |
| `--rpg-hotbar-font-family` | Hotbar typography |
| `--rpg-hotbar-dock-inset`, `--rpg-hotbar-dock-bottom` | Screen position |
| `--rpg-hotbar-dock-shadow` | Complete dock filter |
| `--rpg-hotbar-gap` | Space between slots |
| `--rpg-hotbar-slot-size`, `--rpg-hotbar-mobile-slot-size` | Desktop and mobile slot size |
| `--rpg-hotbar-gold`, `--rpg-hotbar-gold-bright` | Accent and active accent |
| `--rpg-hotbar-wood`, `--rpg-hotbar-wood-dark` | Default plate gradient colors |
| `--rpg-hotbar-plate-padding`, `--rpg-hotbar-plate-border`, `--rpg-hotbar-plate-radius` | Plate geometry |
| `--rpg-hotbar-plate-background`, `--rpg-hotbar-plate-shadow` | Complete plate paint |
| `--rpg-hotbar-slot-border`, `--rpg-hotbar-slot-radius` | Slot geometry |
| `--rpg-hotbar-slot-background`, `--rpg-hotbar-empty-slot-background` | Filled and empty slot paint |
| `--rpg-hotbar-slot-color`, `--rpg-hotbar-active-shadow` | Slot text and active effect |
| `--rpg-hotbar-key-border`, `--rpg-hotbar-key-radius` | Shortcut badge geometry |
| `--rpg-hotbar-key-background`, `--rpg-hotbar-key-color` | Shortcut badge paint |
| `--rpg-hotbar-nameplate-*` | Active entry label border, radius, background, and colors |
| `--rpg-hotbar-badge-background`, `--rpg-hotbar-badge-color` | Quantity and status badges |
| `--rpg-hotbar-cost-color` | Resource cost |
| `--rpg-hotbar-wheel-background` | Gamepad radial selector paint |

The semantic `@rpgjs/ui-css` hotbar primitives remain available through the
`--rpg-ui-hotbar-*` variables. Component-specific `--rpg-hotbar-*` values take
precedence when both are provided.

## Replace the visual component

For a different layout or markup, register another GUI using the same prebuilt
id. The server APIs and persistent state remain unchanged:

```ts
import { PrebuiltGui } from "@rpgjs/common"
import MyHotbar from "./gui/my-hotbar.ce"

export default {
  gui: [{
    id: PrebuiltGui.Hotbar,
    component: MyHotbar,
    renderer: "canvas",
  }]
}
```

The last component registered for `PrebuiltGui.Hotbar` wins. See
[Prebuilt GUI Contracts](/gui/prebuilt-contracts#hotbar) for the complete data
and interaction contract.

## Use and observe slots

Standard entries can be used directly on the authoritative server:

```ts
player.selectHotbarSlot(0)
await player.useHotbarSlot(0, target)
await player.useActiveHotbarSlot(target)
```

Battle or targeting modules can inspect `player.getHotbar()` and route the
selected entry through their own authoritative action. `@rpgjs/action-battle`
does this automatically, including cooldowns, projectiles, and targeting.

Modules can observe every state transition:

```ts
export default {
  player: {
    onHotbarChange(player, change) {
      console.log(change.action, change.slot, change.entry, change.state)
    }
  }
}
```

`change.action` is `initialize`, `assign`, `clear`, `select`, or `refresh`.
`change.state` is a detached snapshot safe to inspect or send to another
service.

## Add an entry type

Plugins can register an authoritative type without changing the generic GUI:

```ts
import { registerHotbarEntryType } from "@rpgjs/server"

const unregister = registerHotbarEntryType({
  type: "tool",
  validate(player, id) {
    if (!player.getVariable(`tool.${id}`)) throw new Error("Tool unavailable")
  },
  resolve(_player, id) {
    return {
      id,
      type: "tool",
      name: id,
      usable: true,
      activation: { mode: "instant" },
    }
  },
  use(player, id) {
    player.setVariable("lastTool", id)
  },
})
```

The returned function restores the previous definition for that type. Register
shared types during module/server setup and call the cleanup function when the
owning integration is disposed.
