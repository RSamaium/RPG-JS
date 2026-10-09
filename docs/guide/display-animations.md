---
title: "Display Animations"
description: "Guide for Display Animations in RPGJS."
---

# Display Animations

This guide explains how to display animations in RPG-JS. There are three common types of animations you can create and display:

1. **Spritesheet Animations** - Using image spritesheets with the built-in animation system
2. **Custom Component Animations** - Creating your own Canvas Engine components for complex effects
3. **CanvasEngine FX Animations** - Using the prebuilt `Fx` component animation for particle effects

If one server-side gameplay moment should trigger several client visuals at
once, such as a flash, sound, hit text, and component animation, use
[Client Visuals](/guide/client-visuals) to group those primitives on the client
and send only one compact server event.

## Spritesheet Animations

Finite character animations keep the direction they started with until playback
finishes. Incoming locomotion updates do not interrupt them; afterward, a
stationary character returns to idle, while a moving character resumes walking.
This client rendering behavior applies to standalone and MMORPG games. Action
Battle also preserves an ongoing predicted attack when the server confirms the
same animation and graphic, instead of restarting it.

> **See also:** [Spritesheets Guide](/guide/spritesheets) for comprehensive information about spritesheets, including dynamic spritesheet resolution.

### 1. Creating the Animation Spritesheet

First, you need to create an animation spritesheet and add it to your module's spritesheets configuration.

#### Using AnimationSpritesheetPreset

The easiest way is to use the built-in `AnimationSpritesheetPreset` helper:

```ts
import { Presets } from "@rpgjs/client";

// In your client module configuration
spritesheets: [
  {
    id: "explosion",
    width: 1024,
    height: 1024,
    image: "explosion.png",
    ...Presets.AnimationSpritesheetPreset(4, 4), // 4x4 grid = 16 frames
  }
]
```

The `AnimationSpritesheetPreset(framesWidth, framesHeight)` automatically generates frame coordinates for a grid-based spritesheet. For example, `AnimationSpritesheetPreset(4, 4)` creates 16 frames arranged in a 4x4 grid.

#### Manual Spritesheet Configuration

You can also manually configure your spritesheet:

```ts
spritesheets: [
  {
    id: "custom-animation",
    image: "my-animation.png",
    width: 512,
    height: 512,
    framesWidth: 8,
    framesHeight: 2,
    textures: {
      default: {
        animations: () => [
          [
            { time: 0, frameX: 0, frameY: 0 },
            { time: 100, frameX: 1, frameY: 0 },
            { time: 200, frameX: 2, frameY: 0 },
            // ... more frames
          ]
        ],
      }
    }
  }
]
```

### 2. Displaying Spritesheet Animations

#### On a Player

Use the `showAnimation` method on a player instance:

```ts
/**
 * Display an animation on a player
 * @param graphic - The spritesheet ID
 * @param animationName - Animation name (default: 'default')
 * @param replaceGraphic - Whether to replace the player's graphic (default: false)
 */
player.showAnimation(graphic: string, animationName: string = 'default', replaceGraphic: boolean = false)
```

**Examples:**

```ts
// Show explosion animation on player
player.showAnimation("explosion");

// Show specific animation from spritesheet
player.showAnimation("spell-effects", "fireball");

// Replace player graphic with animation
player.showAnimation("transformation", "default", true);
```

#### On a Map

Use the `showAnimation` method on a map instance:

```ts
/**
 * Display an animation at a specific position on the map
 * @param position - The x, y coordinates where to display the animation
 * @param graphic - The spritesheet ID
 * @param animationName - Animation name (default: 'default')
 */
map.showAnimation(position: { x: number, y: number }, graphic: string, animationName: string = 'default')
```

**Examples:**

```ts
// Show explosion at specific coordinates
map.showAnimation({ x: 100, y: 200 }, "explosion");

// Show spell effect at player position
const playerPos = { x: player.x, y: player.y };
map.showAnimation(playerPos, "spell-effects", "lightning");
```

## Custom Component Animations

For more complex animations with custom logic, you can create Canvas Engine components.

<Info>
There are two different prop shapes in the client rendering pipeline:

- scene components loaded with `provideLoadMap()` receive `data` and `params`
- component animations rendered with `showComponentAnimation()` receive their props directly (`x`, `y`, `onFinish`, and your custom params)

The examples below are for `componentAnimations`, not for custom map scene components.
</Info>

### 1. Creating a Custom Animation Component

Create a Canvas Engine component file (e.g., `ExplosionComponent.ce`):

```ts
<Sprite sheet x y anchor={0.5} scale alpha={opacity} />

<script>
  import { animatedSignal, mount, tick } from "canvasengine";
  import { inject, RpgClientEngine } from "@rpgjs/client";

  // Get props passed to the component animation
  const { 
    x, 
    y, 
    onFinish,     // Required: callback to remove animation when done
    intensity,    // Custom parameter
    color,        // Custom parameter
    duration      // Custom parameter with default value
  } = defineProps({
    duration: {
      default: 1000
    },
    intensity: {
      default: 1
    },
    color: {
      default: 'white'
    }
  });

  const client = inject(RpgClientEngine);

  // Animation properties
  const scale = animatedSignal(0.1, { duration: duration() });
  const opacity = animatedSignal(1, { duration: duration() });

  // Setup spritesheet
  const sheet = {
    definition: client.getSpriteSheet('explosion'),
    playing: 'default'
  };

  // Start animation on mount
  mount(() => {
    scale.set(intensity() * 2);
    opacity.set(0);
  });

  // Handle animation completion
  let elapsedTime = 0;
  tick(({ deltaTime }) => {
    elapsedTime += deltaTime;
    
    if (elapsedTime >= duration()) {
      if (onFinish) {
        onFinish(); // This removes the animation
      }
    }
  });
</script>
```

This direct prop shape matches how component animations are rendered in `draw-map.ce`:

```html
<componentAnimation.component ...animation />
```

By contrast, custom map scene components are mounted from `canvas.ce` with a `data` object:

```html
<sceneComponent() data={map().data} params={map().params} />
```

### 2. Registering the Component Animation

Add your component to the module configuration:

```ts
import ExplosionComponent from "./components/ExplosionComponent.ce";
import { RpgClient, defineModule } from "@rpgjs/client";

export default defineModule<RpgClient>({
  componentAnimations: [
    {
      id: "explosion",
      component: ExplosionComponent
    }
  ]
});
```

### 3. Using the Prebuilt FX Component

RPGJS includes a ready-to-use component animation wrapper for the CanvasEngine
`Fx` preset system. Register it like any other component animation:

```ts
import { RpgClient, defineModule, PrebuiltComponentAnimations } from "@rpgjs/client";

export default defineModule<RpgClient>({
  componentAnimations: [
    {
      id: "explosion",
      component: PrebuiltComponentAnimations.Fx
    },
    {
      id: "heal",
      component: PrebuiltComponentAnimations.Fx
    }
  ]
});
```

Then call it with `showComponentAnimation()` and pass CanvasEngine `Fx` props:

```ts
map.showComponentAnimation("explosion", { x: 300, y: 200 }, {
  name: "explosionSmall",
  scale: 1.2,
  zIndex: 1000
});

player.showComponentAnimation("heal", {
  name: "healPulse",
  scale: 0.8
});
```

Useful built-in `Fx` names include `hitSpark`, `slashSpark`, `impactBurst`,
`smokePuff`, `dustStep`, `dashDust`, `magicBurst`, `healPulse`, `pickup`,
`levelUp`, and `explosionSmall`.

For looped FX, pass `displayDuration` to tell RPGJS when to remove the temporary
component:

```ts
player.showComponentAnimation("aura", {
  name: "magicBurst",
  loop: true,
  displayDuration: 1200
});
```

You can also pass a custom CanvasEngine `preset` object from client-side code.
When triggering an animation from the server, keep params serializable; register
a client wrapper component if the preset uses functions, Pixi textures, or other
client-only objects.

### 4. Displaying Custom Component Animations

#### On a Player

Use the `showComponentAnimation` method. On a client sprite, it returns a
promise that resolves when the component animation calls `onFinish`.

```ts
/**
 * Display a component animation on a player
 * @param id - The component animation ID
 * @param params - Parameters to pass to the component
 */
sprite.showComponentAnimation(id: string, params: any): Promise<void>
```

**Examples:**

```ts
// Basic explosion on player
await sprite.showComponentAnimation("explosion", {});

// Explosion with custom parameters
await sprite.showComponentAnimation("explosion", {
  intensity: 2.5,
  color: "red",
  duration: 1500
});

// Hit indicator with damage text
await sprite.showComponentAnimation("hit", {
  text: "150",
  color: "red"
});

// Heal animation
await sprite.showComponentAnimation("heal", {
  amount: 50,
  color: "green"
});
```

For a spritesheet animation on the same sprite, use `showAnimation()`:

```ts
await sprite.showAnimation("explosion", "default")
```

Server-side methods such as `player.showComponentAnimation()` and
`map.showComponentAnimation()` only send the animation request to clients and
remain fire-and-forget.

#### On a Map

Use the `showComponentAnimation` method on the map:

```ts
/**
 * Display a component animation at a specific position
 * @param id - The component animation ID
 * @param position - The x, y coordinates
 * @param params - Parameters to pass to the component
 */
map.showComponentAnimation(id: string, position: { x: number, y: number }, params: any)
```

**Examples:**

```ts
// Explosion at specific location
map.showComponentAnimation("explosion", { x: 300, y: 400 }, {
  intensity: 3,
  duration: 2000
});

// Area effect at multiple positions
const positions = [
  { x: 100, y: 100 },
  { x: 150, y: 120 },
  { x: 200, y: 140 }
];

positions.forEach(pos => {
  map.showComponentAnimation("sparkle", pos, {
    color: "gold",
    size: 0.8
  });
});
```
## Best Practices

### 1. Animation Performance

- Keep spritesheet sizes reasonable (max 2048x2048)
- Limit the number of simultaneous animations
- Use `onFinish` callback to properly clean up component animations

### 2. Parameter Validation

Always provide default values for component parameters:

```ts
const { 
  duration,
  intensity 
} = defineProps({
  duration: { default: 1000 },
  intensity: { default: 1 }
});
```

### 3. Memory Management

Component animations are automatically cleaned up when `onFinish` is called. Always call this callback when your animation completes:

```ts
// In your component animation
tick(({ deltaTime }) => {
  elapsedTime += deltaTime;
  
  if (elapsedTime >= duration()) {
    if (onFinish) {
      onFinish(); // Essential for cleanup
    }
  }
});
```

### Fit a temporary client animation to a duration

Use `sprite.setAnimation('attack', 1, { durationMs: 620 })` to play all poses
of one cycle over 620 ms. The alternate-graphic overload also accepts this option:
`sprite.setAnimation('attack', 'enemy-attack', 1, { durationMs: 620 })`.
Without `durationMs`, the spritesheet's original frame timing is preserved.
This changes client presentation only; server gameplay must control its own
timing. Action Battle supplies this option from the enemy's active + recovery
phase duration, through the serializable visual context's
`animationDefaults.durationMs`.
