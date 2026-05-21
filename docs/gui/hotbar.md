---
title: "Hotbar"
description: "Build a generic numbered action bar for items, skills, actions, and custom shortcuts."
---

# Hotbar

The hotbar is a client-side GUI module for numbered shortcuts. It stores only
small references such as `{ type: "skill", id: "fireball" }`; the game resolves
those references into display data and trigger behavior at runtime.

Use it for desktop MMO-style bars that can mix items, skills, emotes, tools, or
project-specific actions without making the client authoritative for gameplay.

## Register the hotbar

Add `provideHotbar()` to the client providers. The default component is a
CanvasEngine GUI registered as `rpg-hotbar`.

```ts
import {
  provideClientGlobalConfig,
  provideHotbar,
  provideHotbarEntries,
} from "@rpgjs/client";

export default {
  providers: [
    provideClientGlobalConfig(),
    provideHotbar({
      slots: 10,
      bindings: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
      storageKey: "main",
    }),
    provideHotbarEntries("combat", ({ client }) => [
      {
        ref: { type: "action", id: "shoot" },
        label: "Shoot",
        icon: "bow-icon",
        action: {
          type: "input",
          input: "projectile:shoot",
          data: () => ({
            target: client?.pointer.world(),
            source: "hotbar",
          }),
        },
      },
    ]),
  ],
};
```

The default bindings are `1` through `9`, then `0`. You can change the number of
slots, the keys, the storage key, the position, or replace the component.

## Entry model

Each shortcut has a stable `ref` and display metadata:

```ts
{
  ref: { type: "item", id: "potion" },
  label: "Potion",
  icon: "potion-icon",
  quantity: 12,
  rarity: "rare",
  disabled: false,
  action: {
    type: "input",
    input: "use:item",
    data: ({ ref }) => ({ id: ref.id })
  }
}
```

Actions can be:

| Type | Use |
| --- | --- |
| `input` | Calls `client.processAction()` and reaches `player.onInput()` on the server. |
| `callback` | Runs client-side UI logic. Use it for menus, targeting overlays, or local effects. |
| `none` | Displays a slot without trigger behavior. |

Gameplay validation still belongs on the server. A hotbar input sends intent and
optional data; the server should verify the item, skill, cooldown, target, and
permissions before applying gameplay changes.

## Assign shortcuts

Inject the manager anywhere on the client to assign, move, clear, or trigger
slots.

```ts
import { HotbarManager, inject } from "@rpgjs/client";

const hotbar = inject(HotbarManager);

hotbar.assign(0, { type: "skill", id: "fireball" });
hotbar.move(0, 1);
hotbar.clear(1);
hotbar.trigger(0);
```

When a menu wants to let the player choose a slot, resolve or build the entry and
open the assignment menu:

```ts
hotbar.openAssignMenu({
  ref: { type: "item", id: "potion" },
  label: "Potion",
  quantity: 3,
  action: {
    type: "input",
    input: "use:item",
    data: ({ ref }) => ({ id: ref.id }),
  },
});
```

The default assignment GUI is `rpg-hotbar-assign-menu`.

## Custom GUI

You can replace the default CanvasEngine components from the hotbar options:

```ts
import MyHotbar from "./gui/my-hotbar.ce";
import MyAssignMenu from "./gui/my-hotbar-assign-menu.ce";

provideHotbar({
  component: MyHotbar,
  assignComponent: MyAssignMenu,
  position: "bottom",
  className: "my-hotbar",
});
```

Custom components can inject `HotbarManager` and read reactive data:

```html
<DOMContainer width="100%" height="100%">
  <div>
    @for (slot of slots) {
      <button click={() => hotbar.trigger(slot.index)}>
        {slot.binding} {slot.entry?.label || ""}
      </button>
    }
  </div>
</DOMContainer>

<script>
  import { computed } from "canvasengine";
  import { HotbarManager, inject } from "@rpgjs/client";

  const hotbar = inject(HotbarManager);
  const slots = computed(() => hotbar.data().slots);
</script>
```

`hotbar.data()` contains `slots`, `refs`, `bindings`, `selectedSlot`, and the
resolved options. `hotbar.assignData()` contains the currently selected entry
for assignment menus.

## Client and server ownership

The hotbar itself is client-side. It persists references in `localStorage` when
`storageKey` is enabled. It does not synchronize inventory, skill availability,
or cooldown state by itself.

In standalone RPG mode and MMORPG mode, use `input` actions for gameplay so the
same `player.onInput()` path can validate and execute the command.
