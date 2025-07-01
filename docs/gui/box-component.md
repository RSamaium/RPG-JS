# BoxComponent Documentation

## Overview

The `BoxComponent` is a versatile UI component in RPG JS that provides a styled container with customizable dimensions, positioning, and appearance. It serves as a foundation for creating dialog boxes, panels, and other UI elements in your game.

## Basic Usage

### Import

```javascript
import { BoxComponent } from "@rpgjs/client";
```

### Basic Implementation

```vue
<BoxComponent width={120} height={70} top={10} left={10}>
    <Container positionType="absolute">
        <Text text="Hello World!" color="white" />
    </Container>
</BoxComponent>
```

## Properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `width` | number | Yes | - | Width of the box in pixels |
| `height` | number | Yes | - | Height of the box in pixels |
| `top` | number | No | 0 | Top position offset in pixels |
| `left` | number | No | 0 | Left position offset in pixels |
| `color` | string | No | - | Custom background color (overrides global config) |

## Advanced Example

Here's a more complex example showing how to create a resource display UI:

```vue
<BoxComponent width={120} height={70} top={10} left={10}>
    <Container positionType="absolute">
        <Container flexDirection="row" alignItems="center" top={0}>
            <Sprite image="wood.png" width={64} />
            <Text text={`: ${wood}`} color="white" />
        </Container>    
    </Container>
</BoxComponent>

<script>
    import { BoxComponent, RpgClientEngine, inject } from "@rpgjs/client";
    
    const engine = inject(RpgClientEngine)
    
    const wood = computed(() => {
        const currentPlayer = engine.getCurrentPlayer()
        return currentPlayer.wood()
    })
</script>
```

## Customization

### Global Configuration

The BoxComponent can be customized globally through the `provideClientGlobalConfig` function. This allows you to set default styles that apply to all BoxComponents in your game.

#### Setting Up Global Config

In your client configuration file (e.g., `config.client.ts`):

```javascript
import { provideClientGlobalConfig } from "@rpgjs/client";

export default {
  providers: [
    provideClientGlobalConfig({
      gui: {
        windowColor: "#2c3e50"  // Custom default box color
      },
      keyboardControls: {
        up: 'up',
        down: 'down',
        left: 'left',
        right: 'right',
        action: 'space'
      }
    }),
    // ... other providers
  ],
};
```

#### Available GUI Configuration Options

```typescript
interface GuiConfig {
  windowColor?: string;  // Default background color for all BoxComponents
  // Additional GUI options can be added here
}
```

### Color Priority

The BoxComponent determines its background color using the following priority order:

1. **Component-level `color` prop** - Highest priority
2. **Global config `gui.windowColor`** - Medium priority  
3. **Default color `#1a1a2e`** - Lowest priority (fallback)

```vue
<!-- This will use red color (component-level override) -->
<BoxComponent width={100} height={50} color="red">
  <!-- content -->
</BoxComponent>

<!-- This will use global config windowColor or default #1a1a2e -->
<BoxComponent width={100} height={50}>
  <!-- content -->
</BoxComponent>
```

### Dynamic Styling

You can also make the color reactive by using computed properties:

```vue
<BoxComponent width={100} height={50} color={dynamicColor}>
  <!-- content -->
</BoxComponent>

<script>
const dynamicColor = computed(() => {
  // Your logic here
  return playerHealth > 50 ? "green" : "red";
});
</script>
```

## Implementation Details

### Internal Structure

The BoxComponent is built using the following structure:

```vue
<Container positionType="absolute" top={top} left={left}>
    <Container anchor={[0.5, 0.5]} height width>
        <Rect width height color={_color} />
        <Container attach={child}></Container>
    </Container>  
</Container>
```

### Engine Integration

The component automatically injects the `RpgClientEngine` to access global configuration:

```javascript
const engine = inject(RpgClientEngine)
const _color = computed(() => 
  engine.globalConfig.gui?.windowColor || color?.() || "#1a1a2e"
)
```

## Best Practices

1. **Consistent Sizing**: Use consistent width and height values across your UI for better visual coherence.

2. **Global Theming**: Set up global GUI configuration for consistent styling across all BoxComponents.

3. **Responsive Design**: Consider different screen sizes when positioning your boxes.

4. **Performance**: Use computed properties for dynamic content to ensure reactive updates.

5. **Accessibility**: Ensure sufficient contrast between text and background colors.

## Common Use Cases

### Dialog Boxes
```vue
<BoxComponent width={300} height={150} top={100} left={50}>
    <Container positionType="absolute" padding={10}>
        <Text text="Welcome to the game!" color="white" />
    </Container>
</BoxComponent>
```

### Status Panels
```vue
<BoxComponent width={200} height={80} top={10} left={10}>
    <Container flexDirection="column" padding={5}>
        <Text text={`HP: ${playerHP}`} color="red" />
        <Text text={`MP: ${playerMP}`} color="blue" />
    </Container>
</BoxComponent>
```

### Inventory Slots
```vue
<BoxComponent width={64} height={64} top={y} left={x}>
    <Container positionType="absolute">
        <Sprite image={itemIcon} width={48} height={48} />
    </Container>
</BoxComponent>
```

## Persistent GUI with Dependencies

When creating persistent GUI elements that remain on screen (like resource counters, health bars, or status displays), it's crucial to properly configure dependencies to ensure the GUI only displays when the required data is available.

### The Problem

Without proper dependencies, your GUI might:
- Display before the player data is loaded
- Show undefined or null values
- Cause runtime errors when accessing player properties
- Create a poor user experience with flickering or empty displays

### Solution: Using Dependencies with currentPlayer

Configure your GUI with `dependencies` that wait for `currentPlayer` to be available:

```javascript
// In your client configuration (e.g., config.client.ts)
import { inject, RpgClientEngine } from "@rpgjs/client";

export default {
  providers: [
    provideClientModules([
      {
        gui: [
          {
            id: "wood-ui",
            component: WoodUiComponent,
            autoDisplay: true,
            dependencies: () => {
              const engine = inject(RpgClientEngine);
              return [engine.scene.currentPlayer];
            }
          }
        ]
      }
    ])
  ]
};
```

### Complete Example: Resource Counter

Here's a complete example showing how to create a persistent resource counter:

#### 1. Component Implementation (`wood-ui.ce`)

```vue
<BoxComponent width={120} height={70} top={10} left={10}>
    <Container positionType="absolute">
        <Container flexDirection="row" alignItems="center" top={0}>
            <Sprite image="wood.png" width={64} />
            <Text text={`: ${wood}`} color="white" />
        </Container>    
    </Container>
</BoxComponent>

<script>
    import { BoxComponent, RpgClientEngine, inject } from "@rpgjs/client";
    
    const engine = inject(RpgClientEngine);
    
    // This will be reactive and safe because dependencies ensure currentPlayer exists
    const wood = computed(() => {
        const currentPlayer = engine.getCurrentPlayer();
        return currentPlayer?.wood() || 0; // Safe access with fallback
    });
</script>
```

#### 2. GUI Configuration

```javascript
gui: [
  {
    id: "wood-ui",
    component: WoodUiComponent,
    autoDisplay: true,
    dependencies: () => {
      const engine = inject(RpgClientEngine);
      return [engine.scene.currentPlayer];
    }
  }
]
```

### Advanced Dependencies

For more complex scenarios, you can add multiple dependencies:

```javascript
dependencies: () => {
  const engine = inject(RpgClientEngine);
  return [
    engine.scene.currentPlayer,    // Wait for player
    engine.scene.data,             // Wait for scene data
    customGameStateSignal          // Wait for custom state
  ];
}
```

### Best Practices for Persistent GUIs

1. **Always Use Dependencies**: Never create persistent GUIs without proper dependencies
2. **Safe Property Access**: Use optional chaining (`?.`) and fallback values
3. **Minimal Dependencies**: Only include dependencies that are truly required
4. **Performance Considerations**: Keep dependency arrays small for better performance

### Common Patterns

#### Health Bar
```javascript
{
  id: "health-bar",
  component: HealthBarComponent,
  autoDisplay: true,
  dependencies: () => {
    const engine = inject(RpgClientEngine);
    return [engine.scene.currentPlayer];
  }
}
```

#### Inventory Counter
```javascript
{
  id: "inventory-counter",
  component: InventoryCounterComponent,
  autoDisplay: true,
  dependencies: () => {
    const engine = inject(RpgClientEngine);
    return [
      engine.scene.currentPlayer,
      inventorySignal  // Custom inventory signal
    ];
  }
}
```

#### Multi-Resource Display
```javascript
{
  id: "resources-panel",
  component: ResourcesPanelComponent,
  autoDisplay: true,
  dependencies: () => {
    const engine = inject(RpgClientEngine);
    return [
      engine.scene.currentPlayer,
      engine.scene.data  // Might need scene data for resource calculations
    ];
  }
}
```

### Debugging Dependencies

If your GUI isn't displaying, check your dependencies:

```javascript
// In your component or configuration
const engine = inject(RpgClientEngine);
console.log('Current Player:', engine.scene.currentPlayer());
console.log('Scene Data:', engine.scene.data());

// Check if dependencies are resolved
const deps = [engine.scene.currentPlayer];
console.log('Dependencies resolved:', deps.every(dep => dep() !== undefined));
```

### Migration from Manual Display

If you're currently manually displaying GUIs, migrate to the dependency system:

```javascript
// ❌ Old way - manual display (unreliable)
sceneMap: {
  onAfterLoading: (scene) => {
    const gui = inject(RpgGui);
    gui.display('wood-ui'); // Might display before player is ready
  }
}

// ✅ New way - dependency-based (reliable)
gui: [
  {
    id: "wood-ui",
    component: WoodUiComponent,
    autoDisplay: true,
    dependencies: () => {
      const engine = inject(RpgClientEngine);
      return [engine.scene.currentPlayer];
    }
  }
]
```

## Troubleshooting

### Common Issues

1. **Box not visible**: Check that width, height, and positioning values are correct.
2. **Color not applying**: Verify the color string format and global config setup.
3. **Content overflow**: Ensure child content fits within the specified dimensions.
4. **Positioning issues**: Remember that positioning is absolute and relative to the parent container.
5. **GUI not displaying**: Ensure dependencies are properly configured and resolved.
6. **Undefined player data**: Always use dependencies when accessing currentPlayer properties.

### Debug Tips

```javascript
// Log the current global config to verify settings
const engine = inject(RpgClientEngine);
console.log('Global Config:', engine.globalConfig);

// Check if currentPlayer is available
console.log('Current Player:', engine.getCurrentPlayer());
console.log('Player Signal:', engine.scene.currentPlayer());

// Verify GUI dependencies
const gui = inject(RpgGui);
console.log('GUI Instance:', gui.get('your-gui-id'));
```