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

## Troubleshooting

### Common Issues

1. **Box not visible**: Check that width, height, and positioning values are correct.
2. **Color not applying**: Verify the color string format and global config setup.
3. **Content overflow**: Ensure child content fits within the specified dimensions.
4. **Positioning issues**: Remember that positioning is absolute and relative to the parent container.

### Debug Tips

```javascript
// Log the current global config to verify settings
const engine = inject(RpgClientEngine);
console.log('Global Config:', engine.globalConfig);
```