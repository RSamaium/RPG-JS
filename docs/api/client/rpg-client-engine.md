---
title: "Rpg Client Engine"
description: "Reference for the `RpgClientEngine` class."
---

# Rpg Client Engine

Reference for the `RpgClientEngine` class.

## Members

- [addComponentAnimation](#addcomponentanimation)
- [addEventComponentResolver](#addeventcomponentresolver)
- [addSound](#addsound)
- [addSpriteComponentBehind](#addspritecomponentbehind)
- [addSpriteComponentInFront](#addspritecomponentinfront)
- [cameraFollowRevision](#camerafollowrevision)
- [cameraFollowSmoothMove](#camerafollowsmoothmove)
- [cameraFollowTargetId](#camerafollowtargetid)
- [clear](#clear)
- [clearClientPredictionStates](#clearclientpredictionstates)
- [dashDefaults](#dashdefaults)
- [flash](#flash)
- [getComponentAnimation](#getcomponentanimation)
- [getSound](#getsound)
- [getSpriteComponent](#getspritecomponent)
- [getSpriteSheet](#getspritesheet)
- [interactions](#interactions)
- [interruptCurrentPlayerMovement](#interruptcurrentplayermovement)
- [mapShakeTrigger](#mapshaketrigger)
- [music](#music)
- [playClientVisual](#playclientvisual)
- [playSound](#playsound)
- [pointer](#pointer)
- [processAction](#processaction)
- [processDash](#processdash)
- [registerClientVisual](#registerclientvisual)
- [registerClientVisuals](#registerclientvisuals)
- [registerSpriteComponent](#registerspritecomponent)
- [resolveEventComponent](#resolveeventcomponent)
- [setCameraFollow](#setcamerafollow)
- [setKeyboardControls](#setkeyboardcontrols)
- [setSoundResolver](#setsoundresolver)
- [setSpritesheetResolver](#setspritesheetresolver)
- [startTransition](#starttransition)
- [stopAllSounds](#stopallsounds)
- [stopSound](#stopsound)
- [visualPause](#visualpause)

## addComponentAnimation

Add a component animation to the engine

Component animations are temporary visual effects that can be displayed
on sprites or objects, such as hit indicators, spell effects, or status animations.

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `method`
- Defined in: `RpgClientEngine`

### Signature

```ts
addComponentAnimation(componentAnimation: {
    component: any,
    id: string
  })
```

### Parameters

- `componentAnimation`: `{
    component: any,
    id: string
  }`

### Returns

The added component animation configuration

### Examples

```ts
// Add a hit animation component
engine.addComponentAnimation({
  id: 'hit',
  component: HitComponent
});

// Add an explosion effect component
engine.addComponentAnimation({
  id: 'explosion',
  component: ExplosionComponent
});
```

## addEventComponentResolver

Register a custom event component resolver.

The last resolver returning a component wins. This lets later modules
override earlier defaults without replacing the whole map scene.

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `method`
- Defined in: `RpgClientEngine`

### Signature

```ts
addEventComponentResolver(resolver: EventComponentResolver)
```

### Parameters

- `resolver`: `EventComponentResolver`

### Returns

The registered resolver

## addSound

Add a sound to the engine

Adds a sound to the engine's sound cache. The sound can be:
- A simple object with `id` and `src` properties
- A Howler instance
- An object with a `play()` method

If the sound has a `src` property, a Howler instance will be created automatically.

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `method`
- Defined in: `RpgClientEngine`

### Signature

```ts
addSound(sound: any, id?: string): any
```

### Parameters

- `sound`: `any`
- `id?`: `string`

### Returns

The added sound

### Examples

```ts
// Simple sound object
engine.addSound({ id: 'click', src: 'click.mp3' });

// With explicit ID
engine.addSound({ src: 'music.mp3' }, 'background-music');
```

## addSpriteComponentBehind

Add a component to render behind sprites
Components added with this method will be displayed with a lower z-index than the sprite

Supports multiple formats:
1. Direct component: `ShadowComponent`
2. Configuration object: `{ component: LightHalo, props: {...} }`
3. With dynamic props: `{ component: LightHalo, props: (object) => {...} }`
4. With dependencies: `{ component: HealthBar, dependencies: (object) => [object.hp, object.param.maxHp] }`

Components with dependencies will only be displayed when all dependencies are resolved (!= undefined).
The object (sprite) is passed to the dependencies function to allow sprite-specific dependency resolution.

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `method`
- Defined in: `RpgClientEngine`

### Signature

```ts
addSpriteComponentBehind(component: any)
```

### Parameters

- `component`: `any`

### Returns

The added component or configuration

### Examples

```ts
// Add a shadow component behind all sprites
engine.addSpriteComponentBehind(ShadowComponent);

// Add a component with static props
engine.addSpriteComponentBehind({ 
  component: LightHalo, 
  props: { radius: 30 } 
});

// Add a component with dynamic props and dependencies
engine.addSpriteComponentBehind({ 
  component: HealthBar, 
  props: (object) => ({ hp: object.hp(), maxHp: object.param.maxHp() }),
  dependencies: (object) => [object.hp, object.param.maxHp]
});
```

## addSpriteComponentInFront

Add a component to render in front of sprites
Components added with this method will be displayed with a higher z-index than the sprite

Supports multiple formats:
1. Direct component: `HealthBarComponent`
2. Configuration object: `{ component: StatusIndicator, props: {...} }`
3. With dynamic props: `{ component: HealthBar, props: (object) => {...} }`
4. With dependencies: `{ component: HealthBar, dependencies: (object) => [object.hp, object.param.maxHp] }`

Components with dependencies will only be displayed when all dependencies are resolved (!= undefined).
The object (sprite) is passed to the dependencies function to allow sprite-specific dependency resolution.

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `method`
- Defined in: `RpgClientEngine`

### Signature

```ts
addSpriteComponentInFront(component: any | { component: any, props: (object: any) => any, dependencies?: (object: any) => any[] })
```

### Parameters

- `component`: `any | { component: any, props: (object: any) => any, dependencies?: (object: any) => any[] }`

### Returns

The added component or configuration

### Examples

```ts
// Add a health bar component in front of all sprites
engine.addSpriteComponentInFront(HealthBarComponent);

// Add a component with static props
engine.addSpriteComponentInFront({ 
  component: StatusIndicator, 
  props: { type: 'poison' } 
});

// Add a component with dynamic props and dependencies
engine.addSpriteComponentInFront({ 
  component: HealthBar, 
  props: (object) => ({ hp: object.hp(), maxHp: object.param.maxHp() }),
  dependencies: (object) => [object.hp, object.param.maxHp]
});
```

## cameraFollowRevision

Incremented for each camera follow command so repeated commands on the same target are applied

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `property`
- Defined in: `RpgClientEngine`

### Signature

```ts
cameraFollowRevision
```

## cameraFollowSmoothMove

Camera follow transition options used by character components when the target changes

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `property`
- Defined in: `RpgClientEngine`

### Signature

```ts
cameraFollowSmoothMove: CameraFollowSmoothMove
```

## cameraFollowTargetId

ID of the sprite that the camera should follow. null means follow the current player

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `property`
- Defined in: `RpgClientEngine`

### Signature

```ts
cameraFollowTargetId
```

## clear

Clear all client resources and reset state

This method should be called to clean up all client-side resources when
shutting down or resetting the client engine. It:
- Destroys the PIXI renderer
- Stops all sounds
- Cleans up subscriptions and event listeners
- Resets scene map
- Stops ping/pong interval
- Clears prediction states

## Design

This method is used primarily in testing environments to ensure clean
state between tests. In production, the client engine typically persists
for the lifetime of the application.

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `method`
- Defined in: `RpgClientEngine`

### Signature

```ts
clear(): void
```

### Examples

```ts
// In test cleanup
afterEach(() => {
  clientEngine.clear();
});
```

## clearClientPredictionStates

Clear client prediction states for cleanup

Removes old prediction states and input history to prevent memory leaks.
Should be called when changing maps or disconnecting.

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `method`
- Defined in: `RpgClientEngine`

### Signature

```ts
clearClientPredictionStates()
```

### Examples

```ts
// Clear prediction states when changing maps
engine.clearClientPredictionStates();
```

## dashDefaults

Runtime defaults used by modules that specialize the built-in dash.

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `property`
- Defined in: `RpgClientEngine`

### Signature

```ts
dashDefaults: Partial<RpgDashInput>
```

## flash

Trigger a flash animation on a sprite

This method allows you to trigger a flash effect on any sprite from client-side code.
The flash can be configured with various options including type (alpha, tint, or both),
duration, cycles, and color.

## Design

The flash is applied directly to the sprite object using its flash trigger.
This is useful for client-side visual feedback, UI interactions, or local effects
that don't need to be synchronized with the server.

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `method`
- Defined in: `RpgClientEngine`

### Signature

```ts
flash(spriteId?: string, options?: {
      type?: 'alpha' | 'tint' | 'both';
      duration?: number;
      cycles?: number;
      alpha?: number;
      tint?: number | string;
    }): void
```

### Parameters

- `spriteId?`: `string`
- `options?`: `{
      type?: 'alpha' | 'tint' | 'both';
      duration?: number;
      cycles?: number;
      alpha?: number;
      tint?: number | string;
    }`

### Examples

```ts
// Flash the current player with default settings
engine.flash();

// Flash a specific sprite with red tint
engine.flash('sprite-id', { type: 'tint', tint: 0xff0000 });

// Flash with both alpha and tint for dramatic effect
engine.flash(undefined, { 
  type: 'both', 
  alpha: 0.5, 
  tint: 0xff0000,
  duration: 200,
  cycles: 2
});

// Quick damage flash on current player
engine.flash(undefined, { 
  type: 'tint', 
  tint: 'red', 
  duration: 150,
  cycles: 1
});
```

## getComponentAnimation

Get a component animation by its ID

Retrieves the EffectManager instance for a specific component animation,
which can be used to display the animation on sprites or objects.

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `method`
- Defined in: `RpgClientEngine`

### Signature

```ts
getComponentAnimation(id: string): AnimationManager
```

### Parameters

- `id`: `string`

### Returns

The EffectManager instance for the animation

### Examples

```ts
// Get the hit animation and display it
const hitAnimation = engine.getComponentAnimation('hit');
hitAnimation.displayEffect({ text: "Critical!" }, player);
```

## getSound

Get a sound by ID, using resolver if not found in cache

This method first checks if the sound exists in the cache.
If not found and a resolver is set, it calls the resolver to create the sound.
The resolved sound is automatically cached for future use.

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `method`
- Defined in: `RpgClientEngine`

### Signature

```ts
getSound(id: string): any | Promise<any>
```

### Parameters

- `id`: `string`

### Returns

The sound if found or created, or undefined if not found and no resolver

### Examples

```ts
// Synchronous usage
const sound = engine.getSound('my-sound');

// Asynchronous usage (when resolver returns Promise)
const sound = await engine.getSound('dynamic-sound');
```

## getSpriteComponent

Get a reusable sprite component by id.

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `method`
- Defined in: `RpgClientEngine`

### Signature

```ts
getSpriteComponent(id: string)
```

### Parameters

- `id`: `string`

### Returns

The CanvasEngine component, or undefined when missing

## getSpriteSheet

Get a spritesheet by ID, using resolver if not found in cache

This method first checks if the spritesheet exists in the cache.
If not found and a resolver is set, it calls the resolver to create the spritesheet.
The resolved spritesheet is automatically cached for future use.

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `method`
- Defined in: `RpgClientEngine`

### Signature

```ts
getSpriteSheet(id: string | number): any | Promise<any>
```

### Parameters

- `id`: `string | number`

### Returns

The spritesheet if found or created, or undefined if not found and no resolver

### Examples

```ts
// Synchronous usage
const spritesheet = engine.getSpriteSheet('my-sprite');

// Asynchronous usage (when resolver returns Promise)
const spritesheet = await engine.getSpriteSheet('dynamic-sprite');
```

## interactions

Register client-only pointer behaviors for map sprites. Interactions remain
local unless a behavior explicitly sends an action to the server.

See the [client interactions guide](../../guide/interactions.md) for hover,
selection, hit testing, drag-and-drop, overlays, and network rules.

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `property`
- Member of: `RpgClientEngine`
- Defined in: `RpgClientEngine`

### Signature

```ts
interactions: RpgClientInteractions
```

### Examples

```ts
engine.interactions.use('Guard', {
  cursor: 'pointer',
  click(ctx) {
    ctx.action('guard:talk', { eventId: ctx.target.id })
  }
})
```

## interruptCurrentPlayerMovement

Stop local movement immediately and discard pending predicted movement.

Use this before a blocking action such as an A-RPG attack, dialog, dash
startup, or any client-side state where already buffered movement inputs
must not be replayed after server reconciliation.

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `method`
- Defined in: `RpgClientEngine`

### Signature

```ts
interruptCurrentPlayerMovement(player?: any): boolean
```

### Parameters

- `player?`: `any`

### Returns

`true` when a player was found and interrupted.

### Examples

```ts
engine.interruptCurrentPlayerMovement();
```

## mapShakeTrigger

Trigger for map shake animation

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `property`
- Defined in: `RpgClientEngine`

### Signature

```ts
mapShakeTrigger: ConfigurableTrigger<MapShakeOptions>
```

## music

Client-only controller for temporary looping music and map BGM crossfades.

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `property`
- Defined in: `RpgClientEngine`

### Signature

```ts
music
```

## playClientVisual

Play a registered client visual locally.

This is also used by the websocket listener when the server calls
`player.clientVisual()` or `map.clientVisual()`.

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `method`
- Defined in: `RpgClientEngine`

### Signature

```ts
playClientVisual(packet: ClientVisualPacket)
```

### Parameters

- `packet`: `ClientVisualPacket`

## playSound

Play a sound by its ID

This method retrieves a sound from the cache or resolver and plays it.
If the sound is not found, it will attempt to resolve it using the soundResolver.
Uses Howler.js for audio playback instead of native Audio elements.

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `method`
- Defined in: `RpgClientEngine`

### Signature

```ts
playSound(soundId: string, options?: { volume?: number; loop?: boolean }): Promise<void>
```

### Parameters

- `soundId`: `string`
- `options?`: `{ volume?: number; loop?: boolean }`

### Examples

```ts
// Play a sound synchronously
engine.playSound('item-pickup');

// Play a sound with volume and loop
engine.playSound('background-music', { volume: 0.5, loop: true });

// Play a sound asynchronously (when resolver returns Promise)
await engine.playSound('dynamic-sound', { volume: 0.8 });
```

## pointer

Read the latest pointer position tracked by the client canvas. World
coordinates are suitable for action payloads and map interactions.

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `property`
- Member of: `RpgClientEngine`
- Defined in: `RpgClientEngine`

### Signature

```ts
pointer: ClientPointerContext
```

### Examples

```ts
const target = engine.pointer.world()
if (target) engine.processAction('projectile:shoot', { target })
```

## processAction

Send an action intent to the authoritative server. Client-provided data
must be validated by the receiving player input handler or action.

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `method`
- Member of: `RpgClientEngine`
- Defined in: `RpgClientEngine`

### Signature

```ts
processAction(action: RpgActionName | RpgActionInput, data?: any): void
```

### Parameters

- `action`: `RpgActionName`
- `data?`: `any`

### Returns

Nothing.

### Examples

```ts
engine.processAction('projectile:shoot', {
  target: engine.pointer.world(),
  source: 'map-click',
})
```

## processDash

Start a predicted dash for the current player and send it through the
authoritative movement channel.

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `method`
- Member of: `RpgClientEngine`
- Defined in: `RpgClientEngine`

### Signature

```ts
processDash(input?: Partial<RpgDashInput>): Promise<void>
```

### Parameters

- `input?`: `Partial<RpgDashInput>`

### Returns

A promise resolved after the dash input has been processed locally.

### Examples

```ts
await engine.processDash({
  direction: { x: 1, y: 0 },
  additionalSpeed: 10,
  duration: 220,
  cooldown: 600,
})
```

## registerClientVisual

Register a named client visual macro.

Client visuals are small client-side functions that group existing visual
primitives such as flash, sound, component animations, sprite animation, or
map shake. The server sends only the visual name and a serializable payload.

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `method`
- Defined in: `RpgClientEngine`

### Signature

```ts
registerClientVisual(name: string, handler: ClientVisualHandler)
```

### Parameters

- `name`: `string`
- `handler`: `ClientVisualHandler`

### Returns

The registered handler

## registerClientVisuals

Register several named client visual macros.

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `method`
- Defined in: `RpgClientEngine`

### Signature

```ts
registerClientVisuals(visuals: ClientVisualMap)
```

### Parameters

- `visuals`: `ClientVisualMap`

## registerSpriteComponent

Register a reusable sprite component that can be addressed by the server.

Server-side component definitions only carry the component id and
serializable props. The client registry maps that id to the CanvasEngine
component that performs the actual rendering.

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `method`
- Defined in: `RpgClientEngine`

### Signature

```ts
registerSpriteComponent(id: string, component: any)
```

### Parameters

- `id`: `string`
- `component`: `any`

### Returns

The registered component

### Examples

```ts
engine.registerSpriteComponent('guildBadge', GuildBadgeComponent);
```

## resolveEventComponent

Resolve the custom CanvasEngine component for an event, if any.

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `method`
- Defined in: `RpgClientEngine`

### Signature

```ts
resolveEventComponent(event: RpgClientEvent): EventComponentConfig | null
```

### Parameters

- `event`: `RpgClientEvent`

### Returns

The component/config returned by the last matching resolver

## setCameraFollow

Set the camera to follow a specific sprite

This method changes which sprite the camera viewport should follow.
The camera can smoothly animate to the target sprite before continuous follow starts.

## Design

The camera follow target is stored in a signal that is read by sprite components.
Each sprite checks if it should be followed by comparing its ID with the target ID.
When smoothMove options are provided, the transition is handled by pixi-viewport's
animation plugin, then continuous follow is handled by CanvasEngine's viewport system.

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `method`
- Defined in: `RpgClientEngine`

### Signature

```ts
setCameraFollow(targetId: string | null, smoothMove?: CameraFollowSmoothMove): void
```

### Parameters

- `targetId`: `string | null`
- `smoothMove?`: `CameraFollowSmoothMove`

### Examples

```ts
// Follow another player with default smooth animation
engine.setCameraFollow(otherPlayerId, true);

// Follow an event with custom smooth animation
engine.setCameraFollow(eventId, {
  time: 1000,
  ease: "easeInOutQuad"
});

// Follow without animation (instant)
engine.setCameraFollow(targetId, false);

// Return to following current player
engine.setCameraFollow(null);
```

## setKeyboardControls

Assigns a CanvasEngine KeyboardControls instance to the dependency injection context

This method registers a KeyboardControls instance from CanvasEngine into the DI container,
making it available for injection throughout the application. The particularity is that
this method is automatically called when a sprite is displayed on the map, allowing the
controls to be automatically associated with the active sprite.

## Design

- The instance is stored in the DI context under the `KeyboardControls` token
- It's automatically assigned when a sprite component mounts (in `character.ce`)
- The controls instance comes from the CanvasEngine component's directives
- Once registered, it can be retrieved using `inject(KeyboardControls)` from anywhere

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `method`
- Defined in: `RpgClientEngine`

### Signature

```ts
setKeyboardControls(controlInstance: any)
```

### Parameters

- `controlInstance`: `any`

### Examples

```ts
// The method is automatically called when a sprite is displayed:
// client.setKeyboardControls(element.directives.controls)

// Later, retrieve and use the controls instance:
import { Input, inject, KeyboardControls } from '@rpgjs/client'

const controls = inject(KeyboardControls)
const control = controls.getControl(Input.Enter)

if (control) {
  console.log(control.actionName) // 'action'
}
```

## setSoundResolver

Set a resolver function for sounds

The resolver is called when a sound is requested but not found in the cache.
It can be synchronous (returns directly) or asynchronous (returns a Promise).
The resolved sound is automatically cached for future use.

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `method`
- Defined in: `RpgClientEngine`

### Signature

```ts
setSoundResolver(resolver: (id: string) => any | Promise<any>): void
```

### Parameters

- `resolver`: `(id: string) => any | Promise<any>`

### Examples

```ts
// Synchronous resolver
engine.setSoundResolver((id) => {
  if (id === 'dynamic-sound') {
    return { id: 'dynamic-sound', src: 'path/to/sound.mp3' };
  }
  return undefined;
});

// Asynchronous resolver (loading from API)
engine.setSoundResolver(async (id) => {
  const response = await fetch(`/api/sounds/${id}`);
  const data = await response.json();
  return data;
});
```

## setSpritesheetResolver

Set a resolver function for spritesheets

The resolver is called when a spritesheet is requested but not found in the cache.
It can be synchronous (returns directly) or asynchronous (returns a Promise).
The resolved spritesheet is automatically cached for future use.

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `method`
- Defined in: `RpgClientEngine`

### Signature

```ts
setSpritesheetResolver(resolver: (id: string | number) => any | Promise<any>): void
```

### Parameters

- `resolver`: `(id: string | number) => any | Promise<any>`

### Examples

```ts
// Synchronous resolver
engine.setSpritesheetResolver((id) => {
  if (id === 'dynamic-sprite') {
    return { id: 'dynamic-sprite', image: 'path/to/image.png', framesWidth: 32, framesHeight: 32 };
  }
  return undefined;
});

// Asynchronous resolver (loading from API)
engine.setSpritesheetResolver(async (id) => {
  const response = await fetch(`/api/spritesheets/${id}`);
  const data = await response.json();
  return data;
});
```

## startTransition

Start a transition

Convenience method to display a transition by its ID using the GUI system.

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `method`
- Defined in: `RpgClientEngine`

### Signature

```ts
startTransition(id: string, props?: any): Promise<void>
```

### Parameters

- `id`: `string`
- `props?`: `any`

### Examples

```ts
// Start a fade transition
engine.startTransition('fade', { duration: 1000, color: 'black' });

// Start with onFinish callback
engine.startTransition('fade', {
  duration: 1000,
  onFinish: () => console.log('Fade complete')
});

// Wait until the transition component calls onFinish
await engine.startTransition('fade', { duration: 1000 });
```

## stopAllSounds

Stop all currently playing sounds

This method stops all sounds that are currently playing.
Useful when changing maps to prevent sound overlap.

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `method`
- Defined in: `RpgClientEngine`

### Signature

```ts
stopAllSounds(): void
```

### Examples

```ts
// Stop all sounds
engine.stopAllSounds();
```

## stopSound

Stop a sound that is currently playing

This method stops a sound that was previously started with `playSound()`.

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `method`
- Defined in: `RpgClientEngine`

### Signature

```ts
stopSound(soundId: string): void
```

### Parameters

- `soundId`: `string`

### Examples

```ts
// Start a looping sound
engine.playSound('background-music', { loop: true });

// Later, stop it
engine.stopSound('background-music');
```

## visualPause

Freezes map rendering for short presentation-only beats such as combat
hit-stop. It is deliberately separate from menu/gameplay pause ownership.

- Source: `packages/client/src/RpgClientEngine.ts`
- Kind: `property`
- Defined in: `RpgClientEngine`

### Signature

```ts
visualPause
```
