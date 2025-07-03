# @rpgjs/vue

Vue.js integration for RPGJS - Allows rendering Vue components over the game canvas.

## Description

This package enables you to use Vue.js components as overlays on top of the RPGJS game canvas. It provides a seamless integration between Vue.js reactive components and the game engine, allowing for rich user interfaces while maintaining game performance.

## Key Features

- **Vue Component Overlay**: Render Vue.js components on top of the game canvas
- **Event Propagation**: Mouse and keyboard events are properly propagated between Vue components and the game
- **Reactive Integration**: Full Vue.js reactivity system support
- **Dependency Injection**: Access to game engine, socket, and GUI services
- **Tooltip System**: Support for sprite-attached tooltips and overlays
- **Component Filtering**: Automatically filters and handles only Vue components, leaving CanvasEngine (.ce) components to the main engine

## Installation

```bash
npm install @rpgjs/vue vue
```

## Usage

### Basic Setup with Dependency Injection (Recommended)

```typescript
import { provideVueGui } from '@rpgjs/vue'
import { RpgClient } from '@rpgjs/client'

@RpgClient({
  providers: [
    // Provide Vue GUI service with dependency injection
    provideVueGui({
      selector: '#vue-gui-overlay',
      createIfNotFound: true
    })
  ],
  gui: [
    // Vue components will be automatically handled
    InventoryVueComponent,
    // Canvas Engine components continue to work
    DialogCanvasComponent
  ]
})
export class MyRpgClient {}
```

### Manual Setup (Advanced)

```typescript
import { VueGui, VueGuiToken } from '@rpgjs/vue'
import { inject } from '@signe/di'

// Manual initialization (if needed)
const vueGui = inject(context, VueGuiToken)
```

### Provider Options

The `provideVueGui()` function accepts the following options:

```typescript
interface VueGuiProviderOptions {
  /** The HTML element where Vue components will be mounted */
  mountElement?: HTMLElement | string
  /** Custom CSS selector for the mount element */
  selector?: string
  /** Whether to create a new div element if none is found */
  createIfNotFound?: boolean
}
```

**Examples:**

```typescript
// Basic usage with CSS selector
provideVueGui({
  selector: '#vue-gui-overlay',
  createIfNotFound: true
})

// Custom mount element
provideVueGui({
  mountElement: document.getElementById('my-ui-container')
})

// Automatic element creation
provideVueGui({
  selector: '.game-ui-overlay',
  createIfNotFound: true
})
```

### Component Separation

The system automatically separates Vue and CanvasEngine components:

```typescript
gui: [
  // Vue component - automatically handled by VueGui service
  {
    name: 'inventory',
    component: VueInventoryComponent,
    display: false
  },
  
  // Canvas Engine component - handled by main RpgGui
  {
    name: 'dialog', 
    component: DialogCanvasComponent,
    display: false
  }
]
```

### Vue Component Example

```vue
<template>
  <div class="inventory-panel" v-propagate>
    <h2>Inventory</h2>
    <div v-for="item in items" :key="item.id" class="inventory-item">
      {{ item.name }}
    </div>
  </div>
</template>

<script>
export default {
  name: 'InventoryComponent',
  inject: ['engine', 'socket', 'gui'],
  data() {
    return {
      items: []
    }
  },
  mounted() {
    // Access game engine
    console.log('Player:', this.engine.getCurrentPlayer())
    
    // Listen to socket events
    this.socket.on('inventory-update', (items) => {
      this.items = items
    })
  }
}
</script>

<style scoped>
.inventory-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 20px;
  border-radius: 8px;
}
</style>
```

### Available Injections

Vue components have access to all these injected services:

#### Legacy Injections (for backward compatibility)
- `engine`: RpgClientEngine instance
- `socket`: WebSocket connection to the server
- `gui`: RpgGui instance for GUI management

#### Standard RPGJS Vue Injections

| Injection | Type | Description |
|-----------|------|-------------|
| `rpgEngine` | `RpgClientEngine` | Main game engine instance |
| `rpgSocket` | `Function` | Returns the WebSocket connection |
| `rpgGui` | `RpgGui` | GUI management service |
| `rpgScene` | `Function` | Returns the current game scene |
| `rpgStage` | `PIXI.Container` | Main PIXI display container |
| `rpgResource` | `Object` | Game resources `{ spritesheets: Map, sounds: Map }` |
| `rpgObjects` | `Observable` | Stream of all scene objects (players + events) |
| `rpgCurrentPlayer` | `Observable` | Stream of current player data |
| `rpgGuiClose` | `Function` | Close GUI with data `(name, data?)` |
| `rpgGuiInteraction` | `Function` | GUI interaction `(guiId, name, data)` |
| `rpgKeypress` | `Observable` | Stream of keyboard events |
| `rpgSound` | `Object` | Sound service with `get(id)`, `play(id)` methods |

#### Usage Examples

```vue
<script>
export default {
  inject: [
    'rpgEngine',
    'rpgSocket', 
    'rpgGui',
    'rpgScene',
    'rpgStage',
    'rpgResource',
    'rpgObjects',
    'rpgCurrentPlayer',
    'rpgGuiClose',
    'rpgGuiInteraction',
    'rpgKeypress',
    'rpgSound'
  ],
  mounted() {
    // Engine access
    const player = this.rpgEngine.getCurrentPlayer()
    
    // Socket communication
    const socket = this.rpgSocket()
    socket.emit('player-action', { type: 'move' })
    
    // Scene control
    const scene = this.rpgScene()
    scene.stopInputs()
    
    // PIXI stage effects
    if (this.rpgStage) {
      const blur = new PIXI.BlurFilter()
      this.rpgStage.filters = [blur]
    }
    
    // Resources
    const spritesheet = this.rpgResource.spritesheets.get('player')
    
    // Observables (remember to unsubscribe!)
    this.playerSub = this.rpgCurrentPlayer.subscribe((player) => {
      console.log('Player updated:', player.object)
    })
    
    this.objectsSub = this.rpgObjects.subscribe((objects) => {
      console.log('Scene objects:', objects)
    })
    
    this.keysSub = this.rpgKeypress.subscribe(({ inputName, control }) => {
      if (control.actionName === 'escape') {
        this.rpgGuiClose('my-component')
      }
    })
    
    // Sound
    this.rpgSound.play('click-sound')
    
    // GUI interaction
    this.rpgGuiInteraction('inventory', 'add-item', { 
      itemId: 'sword', 
      quantity: 1 
    })
  },
  unmounted() {
    // Clean up subscriptions
    this.playerSub?.unsubscribe()
    this.objectsSub?.unsubscribe()
    this.keysSub?.unsubscribe()
  }
}
</script>
```

### Event Propagation

Use the `v-propagate` directive to ensure mouse events are properly forwarded to the game canvas:

```vue
<template>
  <div v-propagate>
    <!-- Events will be propagated to the game -->
  </div>
</template>
```

## Component Types

- **Fixed GUI**: Components that are positioned statically on screen
- **Attached GUI**: Components that follow sprites and game objects (tooltips, health bars, etc.)

The system automatically handles both types based on the `attachToSprite` property in the component configuration.

## Architecture

This package modifies the default behavior of the RPGJS GUI system:

1. **Main RpgGui**: Now only accepts CanvasEngine components (.ce files)
2. **VueGui**: Handles all Vue.js components separately
3. **Event Bridge**: Ensures proper event propagation between Vue and the game canvas
4. **Component Filter**: Automatically separates Vue components from CanvasEngine components

## License

MIT