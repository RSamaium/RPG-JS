# Vue.js 3 Integration with RPGJS GUI System

## Overview

The `@rpgjs/vue` package enables seamless integration of Vue.js 3 components as user interfaces in RPGJS games. This system provides a unified API for managing both CanvasEngine components (.ce files) and Vue.js components through the same `RpgGui` service.

## Features

- **Unified API**: Use the same methods (`display()`, `hide()`, `get()`, `exists()`) for both Vue.js and CanvasEngine components
- **Automatic Synchronization**: Vue components are automatically synchronized with the game state
- **Dependency Management**: Support for Signal-based dependencies, just like CanvasEngine components
- **Event Propagation**: Mouse and keyboard events are properly forwarded between Vue components and the game canvas
- **Auto Display**: Components can be configured to display automatically when dependencies are resolved
- **Memory Management**: Automatic cleanup of subscriptions to prevent memory leaks
- **Vue 3 Composition API**: Full support for Vue 3's Composition API and modern features

## Installation and Setup

### 1. Install the Vue Package

```bash
npm install @rpgjs/vue vue@^3.0.0
```

### 2. Configure the Client

```typescript
// config/config.client.ts
import { provideVueGui } from '@rpgjs/vue';
import { provideClientModules } from '@rpgjs/client';
import InventoryComponent from '../components/InventoryComponent.vue';
import ShopComponent from '../components/ShopComponent.vue';

export default {
  providers: [
    // Add Vue GUI provider
    provideVueGui({
      selector: '#vue-gui-overlay',  // Optional: custom mount element
      createIfNotFound: true         // Optional: create element if not found
    }),
    provideClientModules([
      {
        id: 'dialog',
        component: DialogCanvasComponent
      },
      // Vue.js components
      {
        id: 'inventory',
        component: InventoryComponent,
        autoDisplay: true,
        dependencies: () => [playerSignal]
      },
      {
        id: 'shop',
        component: ShopComponent
      }
    ])
  ],
};
```

### 3. Provider Options

```typescript
interface VueGuiProviderOptions {
  /** The HTML element where Vue components will be mounted */
  mountElement?: HTMLElement | string;
  /** Custom CSS selector for the mount element */
  selector?: string;
  /** Whether to create a new div element if none is found */
  createIfNotFound?: boolean;
}
```

## Creating Vue 3 Components

### Basic Vue 3 Component (Options API)

```vue
<template>
  <div class="game-ui-panel">
    <h2>{{ title }}</h2>
    <div class="content">
      <p>Player Gold: {{ playerGold }}</p>
      <button @click="closePanel">Close</button>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'GameUIPanel',
  inject: ['rpgGui', 'rpgGuiClose'],
  props: {
    title: {
      type: String,
      required: true
    },
    playerGold: {
      type: Number,
      default: 0
    }
  },
  methods: {
    closePanel() {
      this.rpgGuiClose('game-ui-panel');
    }
  }
});
</script>

<style scoped>
.game-ui-panel {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #2c3e50;
  color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}
</style>
```

### Advanced Component with Composition API

```vue
<template>
  <div class="inventory-panel" v-propagate>
    <div class="header">
      <h3>Inventory</h3>
      <button @click="closeInventory">×</button>
    </div>
    
    <!-- Player Information -->
    <div v-if="currentPlayer" class="player-info">
      <p>Name: {{ currentPlayer.object.name }}</p>
      <p>Level: {{ currentPlayer.object.level }}</p>
      <p>HP: {{ currentPlayer.object.hp }}/{{ currentPlayer.object.maxHp }}</p>
    </div>
    
    <!-- Inventory Items -->
    <div class="items-grid">
      <div 
        v-for="item in items" 
        :key="item.id" 
        class="item-slot"
        @click="useItem(item)"
      >
        <img :src="item.icon" :alt="item.name" />
        <span class="quantity">{{ item.quantity }}</span>
      </div>
    </div>
    
    <!-- Sound Controls -->
    <div class="controls">
      <button @click="playSound('click')">Play Click Sound</button>
      <button @click="testInteraction">Send Data to Server</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, inject } from 'vue';

// Define props
const props = defineProps({
  items: {
    type: Array,
    default: () => []
  }
});

// Inject RPGJS services
const rpgEngine = inject('rpgEngine');
const rpgSocket = inject('rpgSocket');
const rpgGui = inject('rpgGui');
const rpgScene = inject('rpgScene');
const rpgResource = inject('rpgResource');
const rpgObjects = inject('rpgObjects');
const rpgCurrentPlayer = inject('rpgCurrentPlayer');
const rpgGuiClose = inject('rpgGuiClose');
const rpgGuiInteraction = inject('rpgGuiInteraction');
const rpgKeypress = inject('rpgKeypress');
const rpgSound = inject('rpgSound');

// Reactive state
const currentPlayer = ref(null);
const playerSubscription = ref(null);
const keypressSubscription = ref(null);

// Component lifecycle
onMounted(() => {
  // Subscribe to current player changes
  if (rpgCurrentPlayer) {
    playerSubscription.value = rpgCurrentPlayer.subscribe((player) => {
      currentPlayer.value = player;
    });
  }
  
  // Subscribe to keypress events
  if (rpgKeypress) {
    keypressSubscription.value = rpgKeypress.subscribe((keyData) => {
      if (keyData.control?.actionName === 'escape') {
        closeInventory();
      }
    });
  }
});

onUnmounted(() => {
  // Clean up subscriptions
  if (playerSubscription.value) {
    playerSubscription.value.unsubscribe();
  }
  if (keypressSubscription.value) {
    keypressSubscription.value.unsubscribe();
  }
});

// Methods
const closeInventory = () => {
  rpgGuiClose('inventory', {
    closedBy: 'user',
    timestamp: Date.now()
  });
};

const useItem = (item) => {
  rpgGuiInteraction('inventory', 'use-item', {
    itemId: item.id,
    playerId: currentPlayer.value?.object?.id
  });
};

const playSound = (soundId) => {
  rpgSound.play(soundId);
};

const testInteraction = () => {
  rpgGuiInteraction('inventory', 'test-action', {
    message: 'Hello from Vue 3 component!',
    playerData: currentPlayer.value
  });
};
</script>

<style scoped>
.inventory-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
  color: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  min-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.player-info {
  background: rgba(0, 0, 0, 0.2);
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 8px;
  margin-bottom: 16px;
}

.item-slot {
  position: relative;
  aspect-ratio: 1;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.item-slot:hover {
  border-color: #3498db;
  background: rgba(52, 152, 219, 0.1);
}

.quantity {
  position: absolute;
  bottom: 2px;
  right: 2px;
  background: #e74c3c;
  color: white;
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 10px;
  min-width: 16px;
  text-align: center;
}

.controls {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

button {
  background: #3498db;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

button:hover {
  background: #2980b9;
}

.close-btn {
  background: #e74c3c;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
}

.close-btn:hover {
  background: #c0392b;
}
</style>
```

### Using Composables (Vue 3 Best Practice)

```vue
<script setup>
import { useRpgPlayer } from '../composables/useRpgPlayer';
import { useRpgGui } from '../composables/useRpgGui';
import { useRpgSound } from '../composables/useRpgSound';

// Custom composables for better code organization
const { currentPlayer, playerStats } = useRpgPlayer();
const { closeGui, sendInteraction } = useRpgGui();
const { playSound } = useRpgSound();

const props = defineProps({
  shopItems: Array,
  shopId: String
});

const buyItem = (item) => {
  sendInteraction('shop', 'buy-item', {
    itemId: item.id,
    shopId: props.shopId,
    price: item.price
  });
  playSound('purchase');
};
</script>
```

### Custom Composables

```typescript
// composables/useRpgPlayer.ts
import { ref, computed, onMounted, onUnmounted, inject } from 'vue';

export function useRpgPlayer() {
  const rpgCurrentPlayer = inject('rpgCurrentPlayer');
  const currentPlayer = ref(null);
  let subscription = null;

  const playerStats = computed(() => {
    if (!currentPlayer.value) return null;
    
    return {
      name: currentPlayer.value.object.name,
      level: currentPlayer.value.object.level,
      hp: currentPlayer.value.object.hp,
      maxHp: currentPlayer.value.object.maxHp,
      mp: currentPlayer.value.object.mp,
      maxMp: currentPlayer.value.object.maxMp,
      gold: currentPlayer.value.object.gold
    };
  });

  onMounted(() => {
    if (rpgCurrentPlayer) {
      subscription = rpgCurrentPlayer.subscribe((player) => {
        currentPlayer.value = player;
      });
    }
  });

  onUnmounted(() => {
    if (subscription) {
      subscription.unsubscribe();
    }
  });

  return {
    currentPlayer: readonly(currentPlayer),
    playerStats: readonly(playerStats)
  };
}
```

```typescript
// composables/useRpgGui.ts
import { inject } from 'vue';

export function useRpgGui() {
  const rpgGui = inject('rpgGui');
  const rpgGuiClose = inject('rpgGuiClose');
  const rpgGuiInteraction = inject('rpgGuiInteraction');

  const closeGui = (guiId: string, data?: any) => {
    rpgGuiClose(guiId, data);
  };

  const sendInteraction = (guiId: string, action: string, data?: any) => {
    rpgGuiInteraction(guiId, action, data);
  };

  const displayGui = (guiId: string, props?: any) => {
    rpgGui.display(guiId, props);
  };

  const hideGui = (guiId: string) => {
    rpgGui.hide(guiId);
  };

  return {
    closeGui,
    sendInteraction,
    displayGui,
    hideGui
  };
}
```

## Available Injections

Vue 3 components have access to these RPGJS injections:

| Injection | Type | Description |
|-----------|------|-------------|
| `rpgEngine` | `RpgClientEngine` | Main game engine instance |
| `rpgSocket` | `Function` | Returns WebSocket connection |
| `rpgGui` | `RpgGui` | GUI management service |
| `rpgScene` | `Function` | Returns current scene |
| `rpgResource` | `Object` | Access to spritesheets and sounds |
| `rpgObjects` | `Observable` | Stream of all game objects |
| `rpgCurrentPlayer` | `Observable` | Stream of current player |
| `rpgGuiClose` | `Function` | Close GUI component |
| `rpgGuiInteraction` | `Function` | Send interaction to server |
| `rpgKeypress` | `Observable` | Stream of keypress events |
| `rpgSound` | `Object` | Sound management service |

## Usage Examples

### Displaying Components

```typescript
// From client-side code using Composition API
import { inject } from 'vue';

export default {
  setup() {
    const gui = inject('rpgGui');

    const showInventory = () => {
      // Display immediately
      gui.display('inventory', { 
        items: playerItems.value,
        gold: playerGold.value 
      });
    };

    const showShop = () => {
      // Display with dependencies
      gui.display('shop', { 
        shopId: 'weapon-shop',
        items: shopItems.value 
      }, [playerSignal, shopSignal]);
    };

    const hideInventory = () => {
      gui.hide('inventory');
    };

    return {
      showInventory,
      showShop,
      hideInventory
    };
  }
};
```

### From Server-Side

```typescript
// In server events
export default {
  player: {
    onInput(player: RpgPlayer, input: any) {
      if (input.action) {
        // Open inventory
        player.gui('inventory').open({
          items: player.inventory.items,
          gold: player.gold
        });
      }
    }
  }
}
```

### With TypeScript Support

```vue
<script setup lang="ts">
import { ref, computed, inject } from 'vue';
import type { RpgGui, RpgPlayer } from '@rpgjs/client';

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  icon: string;
}

interface Props {
  items: InventoryItem[];
  playerId: string;
}

const props = defineProps<Props>();

const rpgGui = inject<RpgGui>('rpgGui');
const rpgCurrentPlayer = inject<Observable<RpgPlayer>>('rpgCurrentPlayer');

const selectedItem = ref<InventoryItem | null>(null);

const totalItems = computed(() => {
  return props.items.reduce((sum, item) => sum + item.quantity, 0);
});

const selectItem = (item: InventoryItem) => {
  selectedItem.value = item;
};
</script>
```

## Event Propagation

Use the `v-propagate` directive to ensure mouse events are properly forwarded to the game canvas:

```vue
<template>
  <div class="ui-panel" v-propagate>
    <!-- Events will be propagated to the game canvas -->
    <button @click="handleClick">Click me</button>
  </div>
</template>
```

## Component Lifecycle

### Auto Display

Components can be configured to display automatically:

```typescript
{
  id: 'hud',
  component: HUDComponent,
  autoDisplay: true,
  dependencies: () => [playerSignal]
}
```

### Manual Control

```typescript
// Check if component exists
if (gui.exists('inventory')) {
  // Display with data
  gui.display('inventory', { items: [] });
  
  // Hide when done
  gui.hide('inventory');
}
```

## Server Integration

### Opening GUIs from Server

```typescript
// In server player events
onInput(player: RpgPlayer, input: any) {
  if (input.action) {
    player.gui('shop').open({
      shopId: 'general-store',
      items: getShopItems(),
      playerGold: player.gold
    });
  }
}
```

### Handling GUI Interactions

```typescript
// In server player events  
onGuiInteraction(player: RpgPlayer, guiId: string, name: string, data: any) {
  if (guiId === 'inventory' && name === 'use-item') {
    const item = player.inventory.getItem(data.itemId);
    if (item) {
      player.useItem(item);
    }
  }
}
```

### Closing GUIs

```typescript
onGuiExit(player: RpgPlayer, guiId: string, data: any) {
  console.log(`Player closed ${guiId}`, data);
  // Handle cleanup if needed
}
```

## Best Practices

### 1. Use Composition API for Complex Components

```vue
<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRpgPlayer } from '../composables/useRpgPlayer';

const { currentPlayer, playerStats } = useRpgPlayer();
const isVisible = ref(false);

// Reactive computations
const canAfford = computed(() => {
  return playerStats.value?.gold >= itemPrice.value;
});

// Watchers
watch(currentPlayer, (newPlayer) => {
  if (newPlayer) {
    isVisible.value = true;
  }
});
</script>
```

### 2. Component Structure with Vue 3

```vue
<template>
  <!-- Always use a root container with proper styling -->
  <Teleport to="#vue-gui-overlay">
    <div class="game-component" v-propagate>
      <div class="header">
        <h3>{{ title }}</h3>
        <button @click="close" class="close-btn">×</button>
      </div>
      <div class="content">
        <!-- Component content -->
      </div>
    </div>
  </Teleport>
</template>
```

### 3. Memory Management with Vue 3

```javascript
// Automatic cleanup with onUnmounted
import { onUnmounted } from 'vue';

onUnmounted(() => {
  if (subscription.value) {
    subscription.value.unsubscribe();
  }
});
```

### 4. Modern Styling with CSS Variables

```css
.game-component {
  --primary-color: #3498db;
  --secondary-color: #2c3e50;
  --danger-color: #e74c3c;
  --success-color: #27ae60;
  
  position: fixed;
  z-index: 1000;
  pointer-events: auto;
  background: var(--secondary-color);
  color: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  
  /* Modern CSS features */
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

@media (max-width: 768px) {
  .game-component {
    width: 90vw;
    max-width: none;
  }
}
```

### 5. Error Handling with Vue 3

```vue
<script setup>
import { ref, onErrorCaptured } from 'vue';

const error = ref(null);

onErrorCaptured((err, target, info) => {
  console.error('Component error:', err);
  error.value = err;
  return false; // Prevent error from propagating
});

const safeAction = async () => {
  try {
    await rpgGuiInteraction('component', 'action', data);
  } catch (err) {
    console.error('GUI interaction failed:', err);
    error.value = err;
  }
};
</script>

<template>
  <div v-if="error" class="error-state">
    <p>Something went wrong: {{ error.message }}</p>
    <button @click="error = null">Retry</button>
  </div>
  <div v-else>
    <!-- Normal component content -->
  </div>
</template>
```

### 6. Performance Optimization

```vue
<script setup>
import { ref, shallowRef, markRaw } from 'vue';

// Use shallowRef for large objects that don't need deep reactivity
const gameObjects = shallowRef([]);

// Use markRaw for objects that should never be reactive
const gameEngine = markRaw(inject('rpgEngine'));
</script>
```

## Migration from Vue 2

### Key Changes

1. **Composition API**: Use `setup()` or `<script setup>` instead of Options API
2. **Inject**: Use `inject()` function instead of `inject` option
3. **Lifecycle**: Use `onMounted()`, `onUnmounted()` instead of `mounted`, `destroyed`
4. **Reactive**: Use `ref()`, `reactive()`, `computed()` for reactivity
5. **TypeScript**: Better TypeScript support with `defineProps<T>()`

### Migration Example

```vue
<!-- Vue 2 -->
<script>
export default {
  inject: ['rpgGui'],
  data() {
    return {
      visible: false
    };
  },
  mounted() {
    this.visible = true;
  }
};
</script>

<!-- Vue 3 -->
<script setup>
import { ref, onMounted, inject } from 'vue';

const rpgGui = inject('rpgGui');
const visible = ref(false);

onMounted(() => {
  visible.value = true;
});
</script>
```
