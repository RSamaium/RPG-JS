# @rpgjs/vue

Vue 3 GUI integration for RPGJS v5.

`@rpgjs/vue` renders Vue components in a DOM overlay above the CanvasEngine game canvas while keeping the server-side RPGJS GUI API (`player.gui(id).open()`, interactions, close events) unchanged.

## Installation

```bash
npm install @rpgjs/vue vue
```

Projects that import `.vue` files must also enable Vue in Vite:

```ts
import vue from '@vitejs/plugin-vue'

export default {
  plugins: [
    vue(),
    // RPGJS Vite plugins...
  ],
}
```

## Client Setup

Register the Vue overlay provider and add Vue components in the regular client `gui` list:

```ts
import { provideClientModules } from '@rpgjs/client'
import { provideVueGui, vueGui } from '@rpgjs/vue'
import Inventory from './gui/inventory.vue'
import Tooltip from './gui/tooltip.vue'
import DialogBox from './gui/dialog-box.ce'

export default {
  providers: [
    provideVueGui({
      selector: '#vue-gui-overlay',
      createIfNotFound: true,
    }),
    provideClientModules([
      {
        gui: [
          vueGui({
            id: 'inventory',
            component: Inventory,
          }),
          vueGui({
            id: 'player-tooltip',
            component: Tooltip,
            attachToSprite: true,
          }),
          {
            id: 'dialog',
            component: DialogBox,
            renderer: 'canvas',
          },
        ],
      },
    ]),
  ],
}
```

CanvasEngine `.ce` GUI components continue to render inside the canvas. Vue components render through the DOM overlay managed by `@rpgjs/vue`.
Use `vueGui()` for Vue registrations and `renderer: 'canvas'` for explicit
CanvasEngine registrations. Legacy renderer inference remains available for v4
compatibility.

## Server Usage

Use the same server API for Vue and CanvasEngine GUI components:

```ts
await player.gui('inventory').open({
  items: player.items,
  gold: player.gold,
})

player.gui('inventory').on('use-item', ({ itemId }) => {
  player.useItem(itemId)
})
```

Inside Vue, call `rpgGuiInteraction(guiId, action, data)` to send an interaction to the server, and `rpgGuiClose(guiId, data?)` to close the GUI.

## Vue Component

```vue
<script setup>
import { inject } from 'vue'

defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  gold: {
    type: Number,
    default: 0,
  },
})

const rpgGuiClose = inject('rpgGuiClose')
const rpgGuiInteraction = inject('rpgGuiInteraction')

function useItem(item) {
  rpgGuiInteraction('inventory', 'use-item', { itemId: item.id })
}
</script>

<template>
  <div class="inventory-panel" v-propagate>
    <button @click="rpgGuiClose('inventory')">Close</button>
    <p>Gold: {{ gold }}</p>
    <button v-for="item in items" :key="item.id" @click="useItem(item)">
      {{ item.name }}
    </button>
  </div>
</template>
```

`v-propagate` forwards mouse, pointer, and wheel events to the RPGJS canvas when the GUI should let the game continue receiving them.

## Attached Vue GUI

Attached Vue GUI components follow visible game objects in the DOM overlay. Use `attachToSprite: true` in the GUI config:

```ts
vueGui({
  id: 'player-tooltip',
  component: Tooltip,
  attachToSprite: true,
})
```

For RPGJS v4 compatibility, a Vue component may also expose `rpgAttachToSprite: true`; v5 projects should prefer `attachToSprite` in the GUI config.

```vue
<script setup>
defineOptions({
  name: 'player-tooltip',
  rpgAttachToSprite: true,
})

defineProps({
  object: Object,
  spriteData: Object,
})
</script>

<template>
  <div class="tooltip">
    {{ object?.name || spriteData?.object?.name }}
  </div>
</template>
```

Show or hide attached GUI components from the server:

```ts
player.showAttachedGui()
player.hideAttachedGui()
```

## Injections

Vue components receive these injections:

| Injection | Description |
| --- | --- |
| `engine` / `rpgEngine` | `RpgClientEngine` instance |
| `socket` / `rpgSocket` | WebSocket access |
| `gui` / `rpgGui` | `RpgGui` service |
| `rpgScene` | Function returning the current client scene |
| `rpgStage` | PIXI stage when available |
| `rpgResource` | `{ spritesheets, sounds }` |
| `rpgObjects` | Observable of scene players and events |
| `rpgCurrentPlayer` | Observable of the current player |
| `rpgGuiClose` | Close a GUI and notify the server |
| `rpgGuiInteraction` | Send a GUI action to the server |
| `rpgKeypress` | Observable of mapped keypresses |
| `rpgSound` | Sound helper with `get(id)` and `play(id)` |

## Vue Directives

Use `v-propagate` on an element when events inside a Vue GUI must also be sent to the RPGJS canvas:

```vue
<template>
  <div v-propagate>
    Test
  </div>
</template>
```

The directive forwards mouse, pointer, and wheel events from the Vue element to `#rpg canvas`.

## Provider Options

```ts
interface VueGuiProviderOptions {
  mountElement?: HTMLElement | string
  selector?: string
  createIfNotFound?: boolean
}
```

If no mount element exists and `createIfNotFound` is `true`, the provider creates `#vue-gui-overlay` inside `#rpg`.
