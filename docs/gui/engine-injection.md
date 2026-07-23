---
title: "Engine Injection in .ce Files"
description: "Guide for Engine Injection in .ce Files in RPGJS."
---

# Engine Injection in .ce Files

This guide explains how to access the RPG-JS client engine and retrieve events and players data within Canvas Engine (`.ce`) component files.

## Injecting the Engine

To access the RPG-JS client engine in a `.ce` file, you need to use the dependency injection system:

```html
<script>
import { inject, RpgClientEngine } from "@rpgjs/client";

const engine = inject(RpgClientEngine);
</script>
```

## Accessing Events and Players

Once you have injected the engine, you can access the events and players through the scene map:

```html
<script>
import { inject, RpgClientEngine } from "@rpgjs/client";

const engine = inject(RpgClientEngine);
const players = engine.sceneMap.players;
const events = engine.sceneMap.events;
</script>
```

## Understanding Signals

Both `players` and `events` are **signals** - reactive data structures that automatically notify components when their data changes. This means:

- **Automatic Updates**: When a player moves or an event changes on the server, the signal automatically updates
- **Reactive Rendering**: Your component will re-render automatically when the data changes
- **Real-time Synchronization**: Changes from the server are synchronized in real-time through WebSocket connections

### Signal Properties

```javascript
// players and events are signals containing Record<string, Object>
const players = engine.sceneMap.players; // Signal<Record<string, RpgClientPlayer>>
const events = engine.sceneMap.events;   // Signal<Record<string, RpgClientEvent>>
```

## Complete Example

Here's a complete example showing how to use the engine injection to display events and players:

```html
<Container sortableChildren={true}>
    @for ((event, id) of events) {
        <Character id={id} object={event} isMe={false} />
    }

    @for ((player, id) of players) {
        <Character id={id} object={player} isMe={true} />
    }
</Container>

<script>
    import { inject, RpgClientEngine } from "@rpgjs/client";
    import Character from "../character.ce";
   
    const engine = inject(RpgClientEngine);
    const players = engine.sceneMap.players;
    const events = engine.sceneMap.events;
</script>
```

## GUI System with Dependencies

RPG-JS provides an advanced GUI system that supports automatic display management based on signal dependencies. This allows you to create GUIs that only appear when certain conditions are met.

### Basic GUI Configuration

```typescript
import { defineModule, RpgClient } from '@rpgjs/client'
import InventoryComponent from './inventory.ce'

defineModule<RpgClient>({
    gui: [
        {
            id: 'inventory',
            component: InventoryComponent
        }
    ]
})
```

### Auto Display

You can configure a GUI to automatically display when it's added to the system:

```typescript
defineModule<RpgClient>({
    gui: [
        {
            id: 'inventory',
            component: InventoryComponent,
            autoDisplay: true  // GUI will show immediately when loaded
        }
    ]
})
```

### Dependencies-Based Display

The most powerful feature is the ability to define dependencies that must be resolved before the GUI appears:

```typescript
import { inject, RpgClientEngine } from "@rpgjs/client";

defineModule<RpgClient>({
    gui: [
        {
            id: 'player-stats',
            component: PlayerStatsComponent,
            autoDisplay: true,
            dependencies: () => {
                const engine = inject(RpgClientEngine);
                return [
                    engine.scene.currentPlayer,  // Wait for player to be loaded
                ];
            }
        }
    ]
})
```

### Advanced Dependencies Example

Here's a more complex example showing multiple dependencies:

```typescript
defineModule<RpgClient>({
    gui: [
        {
            id: 'shop-interface',
            component: ShopComponent,
            autoDisplay: true,
            dependencies: () => {
                const engine = inject(RpgClientEngine);
                const gui = inject(RpgGui);
                
                return [
                    engine.scene.currentPlayer,     // Player must be loaded
                    engine.scene.data,              // Scene data must be available
                    someCustomSignal                // Your custom signal
                ];
            }
        },
        {
            id: 'minimap',
            component: MinimapComponent,
            autoDisplay: true,
            dependencies: () => {
                const engine = inject(RpgClientEngine);
                return [
                    engine.scene.data,              // Wait for map data
                   computed(() => engine.scene.players().length == 0 ? undefined : engine.scene.players())           // Wait for players data
                ];
            }
        }
    ]
})
```

### Manual GUI Control

You can still manually control GUIs using the `RpgGui` service:

```typescript
// In a .ce component or hook
import { inject, RpgGui, RpgClientEngine } from "@rpgjs/client";

const gui = inject(RpgGui);
const engine = inject(RpgClientEngine);

// Display a GUI manually
gui.display('inventory', { items: [] });

// Display with runtime dependencies (overrides config dependencies)
gui.display('shop', { shopId: 1 }, [engine.scene.currentPlayer]);

// Hide a GUI
gui.hide('inventory');

// Check if GUI exists
if (gui.exists('inventory')) {
    // GUI is registered
}
```

### Best Practices for GUI Dependencies

1. **Specific Dependencies**: Only include signals that are truly required for your GUI
2. **Avoid Circular Dependencies**: Don't create dependency chains that could cause loops
3. **Performance**: Keep dependency arrays small for better performance
4. **Error Handling**: Ensure your dependencies can handle undefined states gracefully
5. **Testing**: Test your GUIs with different loading scenarios

### Common Dependency Patterns

```typescript
// Wait for player authentication
dependencies: () => [inject(RpgClientEngine).playerIdSignal]

// Wait for scene to be fully loaded
dependencies: () => {
    const engine = inject(RpgClientEngine);
    return [engine.scene.data, engine.scene.currentPlayer];
}

// Wait for specific game state
dependencies: () => {
    const engine = inject(RpgClientEngine);
    return [
        engine.scene.currentPlayer,
        customGameStateSignal,
        inventorySignal
    ];
}

// Multiple related GUIs
dependencies: () => {
    const engine = inject(RpgClientEngine);
    const gui = inject(RpgGui);
    return [
        engine.scene.currentPlayer,
        // Wait for another GUI to be ready
        gui.get('main-menu')?.display
    ];
}
```

## Additional Engine Properties

The engine provides access to many other useful properties:

```javascript
const engine = inject(RpgClientEngine);

// Scene and map data
const sceneData = engine.sceneMap.data;
const componentAnimations = engine.componentAnimations;

// Resources
const spritesheets = engine.spritesheets;
const sounds = engine.sounds;

// Configuration
const globalConfig = engine.globalConfig;

// Particle settings
const particleSettings = engine.particleSettings;
```

## Entity Property Signals

Use `getEntityProp()` to read player or event properties through a single typed API.
It returns a signal, so you can read it with `()` and compose it in `computed()` or `effect()`.

```javascript
import { getEntityProp } from "@rpgjs/client";
import { computed } from "canvasengine";
import { inject } from "@rpgjs/client";
import { RpgClientEngine } from "@rpgjs/client";

const engine = inject(RpgClientEngine);
const currentPlayer = engine.scene.currentPlayer;

const level = getEntityProp(currentPlayer, "level");
const maxHp = getEntityProp(currentPlayer, "params.maxHp");
const hp = getEntityProp(currentPlayer, "hp");

const hpPercent = computed(() => (hp() / (maxHp() || 1)) * 100);
```

You can also use it with events:

```javascript
const someEvent = engine.scene.events()[eventId];
const eventName = getEntityProp(someEvent, "name");
```

## Signal Synchronization

The signals are automatically synchronized with the server through the RPGJS synchronization layer:

- **Server Changes**: When the server updates player positions, event states, or other data
- **WebSocket Events**: Changes are sent via WebSocket `sync` events
- **Automatic Updates**: The `load()` function updates the signals with new data
- **Component Re-rendering**: Canvas Engine components automatically re-render when signals change

This creates a seamless real-time experience where your UI components stay synchronized with the game state without manual intervention.

## Best Practices

1. **Import Path**: Always use the correct relative path for imports based on your file location
2. **Signal Access**: Access signals directly - they will automatically update your component
3. **Performance**: Signals are optimized for performance and only trigger updates when data actually changes
4. **Type Safety**: Use TypeScript for better development experience with proper typing
5. **GUI Dependencies**: Use the dependency system to ensure GUIs only appear when appropriate data is available
6. **Memory Management**: The system automatically handles subscription cleanup, but be mindful of creating custom subscriptions

## Common Use Cases

- **Player Lists**: Display all connected players
- **Event Interaction**: Show interactive events on the map  
- **Real-time Updates**: Automatically update UI when game state changes
- **Character Movement**: Track and display character positions
- **Game Effects**: Access and display visual effects
- **Conditional GUIs**: Show/hide interfaces based on game state
- **Loading States**: Display GUIs only when required data is available
- **Progressive Enhancement**: Build interfaces that enhance as more data becomes available 
