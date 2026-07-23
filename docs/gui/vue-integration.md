---
title: "Vue.js 3 Integration with RPGJS GUI System"
description: "Use Vue.js 3 components as RPGJS GUI components."
---

# Vue.js 3 Integration with RPGJS GUI System

`@rpgjs/vue` lets RPGJS v5 projects use Vue 3 components for GUI overlays while keeping the regular server API:

```ts
await player.gui('inventory').open({ items, gold })
player.gui('inventory').on('use-item', ({ itemId }) => {
  player.useItem(itemId)
})
```

CanvasEngine `.ce` GUI components still render inside the canvas. Vue GUI components render in a DOM overlay above the canvas.

## Setup

Install Vue support:

```bash
npm install @rpgjs/vue vue
```

Enable Vue in Vite when importing `.vue` files:

```ts
import vue from '@vitejs/plugin-vue'

export default {
  plugins: [
    vue(),
    // RPGJS Vite plugins...
  ],
}
```

Register the Vue GUI provider on the client:

```ts
import { provideClientModules } from '@rpgjs/client'
import { provideVueGui, vueGui } from '@rpgjs/vue'
import Inventory from './gui/inventory.vue'

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
        ],
      },
    ]),
  ],
}
```

`provideVueGui()` creates `#vue-gui-overlay` inside `#rpg` when the element does not exist and `createIfNotFound` is enabled.

## Replace Prebuilt GUI

You can replace a prebuilt CanvasEngine GUI with a Vue component by registering a Vue GUI with the same ID. Server APIs keep using the same GUI ID, but the rendered component comes from Vue:

```ts
import { provideClientModules } from '@rpgjs/client'
import { PrebuiltGui } from '@rpgjs/common'
import { provideVueGui, vueGui } from '@rpgjs/vue'
import Dialog from './gui/dialog.vue'

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
            id: PrebuiltGui.Dialog,
            component: Dialog,
          }),
        ],
      },
    ]),
  ],
}
```

`vueGui()` marks the registration with `renderer: 'vue'`. Explicit renderer
selection is recommended; component-shape detection remains available only for
v4 compatibility.

With this setup, `player.showText()` and `player.gui(PrebuiltGui.Dialog).open(data)` open the Vue dialog instead of the built-in CanvasEngine dialog. The same pattern works for other prebuilt IDs such as `PrebuiltGui.MainMenu`, `PrebuiltGui.Shop`, `PrebuiltGui.Save`, `PrebuiltGui.TitleScreen`, and `PrebuiltGui.Gameover`.

Each prebuilt GUI has a defined data and interaction contract. See [Prebuilt GUI Contracts](/gui/prebuilt-contracts) for the full list of fields, actions, and expected close values.

Use the regular Vue injections to close the GUI or send actions back to the server. For dialog boxes, closing with the selected choice index resolves `player.showChoices()`:

```vue
<script setup>
import { inject } from 'vue'
import { PrebuiltGui } from '@rpgjs/common'

defineProps({
  message: {
    type: String,
    default: '',
  },
  choices: {
    type: Array,
    default: () => [],
  },
})

const rpgGuiClose = inject('rpgGuiClose')
</script>

<template>
  <div class="dialog">
    <p>{{ message }}</p>
    <button
      v-for="(choice, index) in choices"
      :key="index"
      @click="rpgGuiClose(PrebuiltGui.Dialog, index)"
    >
      {{ choice.text }}
    </button>
    <button v-if="!choices.length" @click="rpgGuiClose(PrebuiltGui.Dialog)">
      Continue
    </button>
  </div>
</template>
```

## Vue Components

Data passed through `player.gui(id).open(data)` becomes Vue props:

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
  <div class="inventory" v-propagate>
    <button @click="rpgGuiClose('inventory')">Close</button>
    <p>Gold: {{ gold }}</p>
    <button v-for="item in items" :key="item.id" @click="useItem(item)">
      {{ item.name }}
    </button>
  </div>
</template>
```

Use `v-propagate` when mouse, pointer, and wheel events should also be forwarded to the game canvas.

## Attached Vue GUI

Vue GUI components can follow sprites or events from the DOM overlay. Configure them with `attachToSprite: true`:

```ts
import Tooltip from './gui/tooltip.vue'

{
  gui: [
    vueGui({
      id: 'player-tooltip',
      component: Tooltip,
      attachToSprite: true,
    }),
  ],
}
```

Then control visibility from the server:

```ts
player.showAttachedGui()
player.hideAttachedGui()
```

The Vue component receives `object` and `spriteData` props:

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

`rpgAttachToSprite: true` is supported for RPGJS v4 compatibility. Prefer `attachToSprite: true` in v5 GUI configuration.

## Injections

Vue components can inject:

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

## Behavior Notes

- Vue and CanvasEngine GUI components share `RpgGui.display()`, `RpgGui.hide()`, `player.gui(id).open()`, and GUI interactions.
- CanvasEngine attached GUI components render in `character.ce`.
- Vue attached GUI components render in the DOM overlay and are kept out of the CanvasEngine renderer.
- Signal dependencies and `autoDisplay` are supported for Vue GUI entries.
