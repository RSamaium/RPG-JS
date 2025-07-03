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

### Basic Setup

```typescript
import { VueGui } from '@rpgjs/vue'
import { RpgGui } from '@rpgjs/client'

// Initialize Vue GUI overlay
const vueGui = new VueGui(rootElement, rpgGuiInstance)
```

### Adding Vue Components

By default, the main `RpgGui` class now only accepts CanvasEngine components (.ce files). Vue components should be added through this package:

```typescript
// This will be ignored by the main RpgGui (CanvasEngine components only)
gui.add({
  name: 'inventory',
  component: VueInventoryComponent, // Vue component - will be handled by @rpgjs/vue
})

// This will be accepted by the main RpgGui
gui.add({
  name: 'dialog',
  component: DialogCanvasComponent, // .ce component - handled by main engine
})
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

Vue components have access to these injected services:

- `engine`: RpgClientEngine instance
- `socket`: WebSocket connection to the server
- `gui`: RpgGui instance for GUI management

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