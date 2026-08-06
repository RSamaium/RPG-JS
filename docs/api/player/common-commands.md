---
title: "Common Commands"
description: "Core server-side player commands defined on the main Player class."
---

# Common Commands

Core server-side player commands defined on the main Player class.

## Members

- [applyDefaultParameters](#applydefaultparameters)
- [attachShape](#attachshape)
- [cameraFollow](#camerafollow)
- [changeMap](#changemap)
- [changeRoom](#changeroom)
- [clientVisual](#clientvisual)
- [createDynamicEvent](#createdynamicevent)
- [emit](#emit)
- [flash](#flash)
- [getCurrentRoom](#getcurrentroom)
- [getInShapes](#getinshapes)
- [getShapes](#getshapes)
- [getTile](#gettile)
- [initializeDefaultStats](#initializedefaultstats)
- [lastProcessedInputTs](#lastprocessedinputts)
- [Listen one-time to data from the client](#listen-one-time-to-data-from-the-client)
- [Listen to data from the client](#listen-to-data-from-the-client)
- [load](#load)
- [otherPlayersCollision](#otherplayerscollision)
- [pendingMapPosition](#pendingmapposition)
- [playSound](#playsound)
- [position](#position)
- [position](#position)
- [Remove listeners of the client event](#remove-listeners-of-the-client-event)
- [room](#room)
- [Run Sync Changes](#run-sync-changes)
- [save](#save)
- [setAnimation](#setanimation)
- [setGraphicAnimation](#setgraphicanimation)
- [setGraphicAnimation](#setgraphicanimation)
- [setHitbox](#sethitbox)
- [setMass](#setmass)
- [setSizes](#setsizes)
- [setSync](#setsync)
- [shapes](#shapes)
- [showAnimation](#showanimation)
- [showComponentAnimation](#showcomponentanimation)
- [stopAllSounds](#stopallsounds)
- [stopSound](#stopsound)
- [tiles](#tiles)
- [worldPositionX](#worldpositionx)
- [worldPositionY](#worldpositiony)

## applyDefaultParameters

Apply the built-in default parameter curves to this player.

Use this when you want RPGJS to provide the initial parameter setup
instead of restoring values from your own database or a saved snapshot.

This method only defines the parameter curves and related defaults.
It does not restore custom persisted data for you.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `method`
- Defined in: `RpgPlayer`

### Signature

```ts
player.applyDefaultParameters()
```

## attachShape

Attach a zone shape to this player using the physic zone system

This method creates a zone attached to the player's entity in the physics engine.
The zone can be circular or cone-shaped and will detect other entities (players/events)
entering or exiting the zone.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `method`
- Defined in: `RpgPlayer`

### Signature

```ts
attachShape(idOrOptions: string | AttachShapeOptions, options?: AttachShapeOptions): RpgShape | undefined
```

### Parameters

- `idOrOptions`: `string | AttachShapeOptions`
- `options?`: `AttachShapeOptions`

### Examples

```ts
// Create a circular detection zone
player.attachShape("vision", {
  radius: 150,
  angle: 360,
});

// Create a cone-shaped vision zone
player.attachShape("vision", {
  radius: 200,
  angle: 120,
  direction: Direction.Right,
  limitedByWalls: true,
});

// Create a zone with width/height (radius calculated automatically)
player.attachShape({
  width: 100,
  height: 100,
  positioning: "center",
});
```

## cameraFollow

Make the camera follow another player or event

This method sends an instruction to the client to fix the viewport on another sprite.
The camera will follow the specified player or event, with optional smooth animation.

## Design

The camera follow instruction is sent only to this player's client connection.
This allows each player to have their own camera target, useful for cutscenes,
following NPCs, or focusing on specific events.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `method`
- Defined in: `RpgPlayer`

### Signature

```ts
cameraFollow(otherPlayer: RpgPlayer | RpgEvent, options?: {
      smoothMove?: boolean | {
        enabled?: boolean;
        time?: number;
        ease?: CameraFollowEase;
        speed?: number;
        acceleration?: number | null;
        radius?: number | null;
      };
    }): void
```

### Parameters

- `otherPlayer`: `RpgPlayer | RpgEvent`
- `options?`: `{
      smoothMove?: boolean | {
        enabled?: boolean;
        time?: number;
        ease?: CameraFollowEase;
        speed?: number;
        acceleration?: number | null;
        radius?: number | null;
      };
    }`

### Examples

```ts
// Follow another player with default smooth animation
player.cameraFollow(otherPlayer, { smoothMove: true });

// Follow an event with custom smooth animation
player.cameraFollow(npcEvent, {
  smoothMove: {
    time: 1000,
    ease: "easeInOutQuad"
  }
});

// Follow without animation (instant)
player.cameraFollow(targetPlayer, { smoothMove: false });
```

## changeMap

Change the map for this player

- Source: `packages/server/src/Player/Player.ts`
- Kind: `method`
- Defined in: `RpgPlayer`

### Signature

```ts
changeMap(mapId: string, positions?: { x: number; y: number; z?: number } | string): Promise<boolean>
```

### Parameters

- `mapId`: `string`
- `positions?`: `{ x: number; y: number; z?: number } | string`

### Returns

A promise that resolves when the map change is complete

### Examples

```ts
// Change player to map "town" at position {x: 10, y: 20}
await player.changeMap("town", {x: 10, y: 20});

// Change player to map "dungeon" at a named position
await player.changeMap("dungeon", "entrance");

// Change player to map "town" at the Tiled "start" position, if present
await player.changeMap("town");
```

## changeRoom

Transfer this player to a registered custom gameplay room.

The server resolves the destination, runs authorization hooks, creates a
Signe session-transfer token, and tells the client which scene kind to
mount. Clients cannot select a destination on their own.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `method`
- Defined in: `RpgPlayer`

### Signature

```ts
player.changeRoom(target)
```

### Parameters

- `target`: `RpgRoomTarget`

### Returns

`false` when a hook rejects the transfer; otherwise `true`.

### Examples

```ts
await player.changeRoom({
  kind: "battle",
  params: { id: "encounter-42" },
})
```

## clientVisual

Trigger a named client visual for this player only.

Client visuals are registered in the client module with `clientVisuals`.
They group existing client-side visual primitives such as flash, sound,
component animations, sprite animations, or camera shake. The server sends
only the visual name and a serializable payload, which keeps rendering
details on the client and avoids sending several visual packets for one
gameplay moment.

Use direct APIs like `playSound()`, `flash()`, or
`showComponentAnimation()` for one-off visuals. Use `clientVisual()` when
several visuals should be orchestrated together by the client.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `method`
- Defined in: `RpgPlayer`

### Signature

```ts
clientVisual(name: string, data?: TData): void
```

### Parameters

- `name`: `string`
- `data?`: `TData`

### Examples

```ts
player.clientVisual("hit", {
  targetId: enemy.id,
  damage: 25,
});
```

## createDynamicEvent

Legacy v4 helper to create a dynamic event from the player's current map.

Prefer `player.getCurrentMap()?.createDynamicEvent(...)` in new code.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `method`
- Defined in: `RpgPlayer`

### Signature

```ts
createDynamicEvent(eventObj: EventPosOption): Promise<string | undefined> | undefined
```

### Parameters

- `eventObj`: `EventPosOption`

### Returns

The created event id, or `undefined` if the player is not on a map.

## emit

Send a custom event to the current player's client.

Use this to push arbitrary websocket payloads to one client only.
On the client side, receive the event by injecting `WebSocketToken`
and subscribing with `socket.on(...)`.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `method`
- Defined in: `RpgPlayer`

### Signature

```ts
player.emit(type, value)
```

### Parameters

- `type`: `string`
- `value?`: `T`

### Examples

```ts
player.emit("inventory:updated", {
  slots: player.items().length,
});
```

```ts
import { inject } from "@rpgjs/client";
import { WebSocketToken, type AbstractWebsocket } from "@rpgjs/client";

const socket = inject<AbstractWebsocket>(WebSocketToken);

socket.on("inventory:updated", (payload) => {
  console.log(payload.slots);
});
```

## flash

Trigger a flash animation on this player

This method sends a flash animation event to the client, creating a visual
feedback effect on the player's sprite. The flash can be configured with
various options including type (alpha, tint, or both), duration, cycles, and color.

## Design

The flash is sent as a broadcast event to all clients viewing this player.
This is useful for visual feedback when the player takes damage, receives
a buff, or when an important event occurs.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `method`
- Defined in: `RpgPlayer`

### Signature

```ts
flash(options?: {
    type?: 'alpha' | 'tint' | 'both';
    duration?: number;
    cycles?: number;
    alpha?: number;
    tint?: number | string;
  }): void
```

### Parameters

- `options?`: `{
    type?: 'alpha' | 'tint' | 'both';
    duration?: number;
    cycles?: number;
    alpha?: number;
    tint?: number | string;
  }`

### Examples

```ts
// Simple flash with default settings (alpha flash)
player.flash();

// Flash with red tint when taking damage
player.flash({ type: 'tint', tint: 0xff0000 });

// Flash with both alpha and tint for dramatic effect
player.flash({ 
  type: 'both', 
  alpha: 0.5, 
  tint: 0xff0000,
  duration: 200,
  cycles: 2
});

// Quick damage flash
player.flash({ 
  type: 'tint', 
  tint: 'red', 
  duration: 150,
  cycles: 1
});
```

## getCurrentRoom

Return the active map-independent RPGJS room.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `method`
- Defined in: `RpgPlayer`

### Signature

```ts
getCurrentRoom(): T | null
```

## getInShapes

Get all shapes where this player is currently located

Returns all shapes (from any player/event) where this player is currently inside.
This is updated automatically when the player enters or exits shapes.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `method`
- Defined in: `RpgPlayer`

### Signature

```ts
getInShapes(): RpgShape[]
```

### Returns

Array of RpgShape instances where this player is located

### Examples

```ts
// Another player has a detection zone
otherPlayer.attachShape("detection", { radius: 200 });

// Check if this player is in any shape
const inShapes = player.getInShapes();
if (inShapes.length > 0) {
  console.log("Player is being detected!");
}
```

## getShapes

Get all shapes attached to this player

Returns all shapes that were created using `attachShape()` on this player.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `method`
- Defined in: `RpgPlayer`

### Signature

```ts
getShapes(): RpgShape[]
```

### Returns

Array of RpgShape instances attached to this player

### Examples

```ts
player.attachShape("vision", { radius: 150 });
player.attachShape("detection", { radius: 100 });

const shapes = player.getShapes();
console.log(shapes.length); // 2
```

## getTile

Legacy v4 Tiled tile lookup.

This helper is available only when the current map was loaded through
`@rpgjs/tiledmap` / `@canvasengine/tiled`. Coordinates are pixel positions,
matching CanvasEngine Tiled's `getTileByPosition(...)` API.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `method`
- Defined in: `RpgPlayer`

### Signature

```ts
getTile(x: number, y: number, z?: number): RpgTiledTile | undefined
```

### Parameters

- `x`: `number`
- `y`: `number`
- `z?`: `number`

### Returns

Tiled tile information, or `undefined` when unavailable.

## initializeDefaultStats

Initialize the built-in default player stats.

This applies the default parameter curves and then restores HP/SP to their
current maximum values so the client receives coherent bars on first load.

Call this manually in `onConnected()` or `onStart()` when your game relies
on the built-in defaults. Do not call it after loading a snapshot or
hydrating player data from your own database unless you explicitly want to
overwrite those values.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `method`
- Defined in: `RpgPlayer`

### Signature

```ts
player.initializeDefaultStats()
```

## lastProcessedInputTs

Last processed client input timestamp for reconciliation

- Source: `packages/server/src/Player/Player.ts`
- Kind: `property`
- Defined in: `RpgPlayer`

### Signature

```ts
lastProcessedInputTs: number
```

## Listen one-time to data from the client

Listen one time to custom data sent by the current player's client.

After the first matching event is received, the listener is removed
automatically.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `method`
- Defined in: `RpgPlayer`
- Since: `3.0.0-beta.5`

### Signature

```ts
player.once(key, cb)
```

### Parameters

- `key`: `string`
- `cb`: `(data: T) => void | Promise<void>`

### Examples

```ts
player.once("tutorial:ready", (payload) => {
  console.log("Ready once:", payload.step);
});
```

## Listen to data from the client

Listen to custom data sent by the current player's client.

This listens to websocket actions emitted from the client with
`socket.emit(key, data)`. It is intended for custom client events
that are not already handled by built-in server actions such as
`move`, `action`, or GUI interactions.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `method`
- Defined in: `RpgPlayer`
- Since: `3.0.0-beta.5`

### Signature

```ts
player.on(key, cb)
```

### Parameters

- `key`: `string`
- `cb`: `(data: T) => void | Promise<void>`

### Examples

```ts
player.on("chat:message", ({ text }) => {
  console.log("Client says:", text);
});
```

```ts
import { inject } from "@rpgjs/client";
import { WebSocketToken, type AbstractWebsocket } from "@rpgjs/client";

const socket = inject<AbstractWebsocket>(WebSocketToken);
socket.emit("chat:message", { text: "Hello server" });
```

## load

Load player state.

For v4 compatibility, pass a JSON string or plain snapshot object to apply
it directly. Pass a slot (`"auto"` or a number) to use the v5 storage
strategy.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `method`
- Defined in: `RpgPlayer`

### Signature

```ts
load(slot: SaveSlotIndex, context?: SaveRequestContext, options?: { changeMap?: boolean }): Promise<RpgPlayerSlotLoadResult>
```

### Parameters

- `slot`: `SaveSlotIndex`
- `context?`: `SaveRequestContext`
- `options?`: `{ changeMap?: boolean }`

## otherPlayersCollision

Legacy v4 list of other players or events currently colliding with this player.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `getter`
- Defined in: `RpgPlayer`

### Signature

```ts
otherPlayersCollision
```

### Returns

Runtime players and events whose physics bodies overlap this player.

## pendingMapPosition

Internal: named map position to resolve after the target map data is ready

- Source: `packages/server/src/Player/Player.ts`
- Kind: `property`
- Defined in: `RpgPlayer`

### Signature

```ts
pendingMapPosition
```

## playSound

Play a sound on the client side for this player only

This method emits an event to play a sound only for this specific player.
The sound must be defined on the client side (in the client module configuration).

## Design

The sound is sent only to this player's client connection, making it ideal
for personal feedback sounds like UI interactions, notifications, or personal
achievements. For map-wide sounds that all players should hear, use `map.playSound()` instead.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `method`
- Defined in: `RpgPlayer`

### Signature

```ts
playSound(soundId: string, options?: { volume?: number; loop?: boolean } | boolean): void
```

### Parameters

- `soundId`: `string`
- `options?`: `{ volume?: number; loop?: boolean } | boolean`

### Examples

```ts
// Play a sound for this player only (default behavior)
player.playSound("item-pickup");

// Play a sound with volume and loop
player.playSound("background-music", {
  volume: 0.5,
  loop: true
});

// Play a notification sound at low volume
player.playSound("notification", { volume: 0.3 });
```

## position

Legacy v4 position object.

Prefer the reactive `x`, `y`, and `z` signals in new code.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `getter`
- Defined in: `RpgPlayer`

### Signature

```ts
position
```

### Returns

Current top-left player position.

## position

Set the legacy v4 position object.

This updates the player's top-left coordinates and keeps the physics body in sync
when the player is currently attached to a map.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `setter`
- Defined in: `RpgPlayer`

### Signature

```ts
position
```

## Remove listeners of the client event

Remove all listeners for a custom client event on this player.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `method`
- Defined in: `RpgPlayer`
- Since: `3.0.0-beta.5`

### Signature

```ts
player.off(key)
```

### Parameters

- `key`: `string`

### Examples

```ts
player.off("chat:message");
```

## room

Active RPGJS room. Unlike `map`, this also covers non-spatial gameplay rooms.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `property`
- Defined in: `RpgPlayer`

### Signature

```ts
room: RpgPlayerRoom | null
```

## Run Sync Changes

Run the change detection cycle. Normally, as soon as a hook is called in a class, the cycle is started. But you can start it manually
The method calls the `onChanges` method on events and synchronizes all map data with the client.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `method`
- Member of: `Player`
- Defined in: `RpgPlayer`

### Signature

```ts
player.syncChanges()
```

## save

Save the player state.

For v4 compatibility, calling `save()` without arguments returns a JSON
snapshot string. Pass a slot (`"auto"` or a number) to use the v5 storage
strategy.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `method`
- Defined in: `RpgPlayer`

### Signature

```ts
save(): Promise<string>
```

## setAnimation

- Source: `packages/server/src/Player/Player.ts`
- Kind: `method`
- Defined in: `RpgPlayer`

### Signature

```ts
setAnimation(animationName: string, nbTimes?: number)
```

### Parameters

- `animationName`: `string`
- `nbTimes?`: `number`

## setGraphicAnimation

Set the current animation of the player's sprite

This method changes the animation state of the player's current sprite.
It's used to trigger character animations like attack, skill, or custom movements.
When `nbTimes` is set to a finite number, the animation will play that many times
before returning to the previous animation state.

If `animationFixed` is true, this method will not change the animation.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `method`
- Defined in: `RpgPlayer`

### Signature

```ts
setGraphicAnimation(animationName: string, nbTimes: number): void
```

### Parameters

- `animationName`: `string`
- `nbTimes`: `number`

## setGraphicAnimation

Set the current animation of the player's sprite with a temporary graphic change

This method changes the animation state of the player's current sprite and temporarily
changes the player's graphic (sprite sheet) during the animation. The graphic is
automatically reset when the animation finishes.

When `nbTimes` is set to a finite number, the animation will play that many times
before returning to the previous animation state and graphic.

If `animationFixed` is true, this method will not change the animation.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `method`
- Defined in: `RpgPlayer`

### Signature

```ts
setGraphicAnimation(animationName: string, graphic: string | string[], nbTimes: number): void
```

### Parameters

- `animationName`: `string`
- `graphic`: `string | string[]`
- `nbTimes`: `number`

## setHitbox

Set the hitbox of the player for collision detection

This method defines the hitbox used for collision detection in the physics engine.
The hitbox can be smaller or larger than the visual representation of the player,
allowing for precise collision detection.

## Design

The hitbox is used by the physics engine to detect collisions with other entities,
static obstacles, and shapes. Changing the hitbox will immediately update the
collision detection without affecting the visual appearance of the player.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `method`
- Defined in: `RpgPlayer`

### Signature

```ts
setHitbox(width: number, height: number): void
```

### Parameters

- `width`: `number`
- `height`: `number`

### Examples

```ts
// Set a 20x20 hitbox for precise collision detection
player.setHitbox(20, 20);

// Set a larger hitbox for easier collision detection
player.setHitbox(40, 40);
```

## setMass

Set the physical mass for this player or event.

A mass of `0` or `Infinity` makes the physics body immovable.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `method`
- Defined in: `RpgPlayer`

### Signature

```ts
setMass(mass: number): void
```

### Parameters

- `mass`: `number`

## setSizes

Legacy v4 size setter.

In v5, collision size is represented by the hitbox. This bridge maps the
legacy object to `setHitbox(...)`.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `method`
- Defined in: `RpgPlayer`

### Signature

```ts
setSizes(obj: { width: number; height: number; hitbox?: { width: number; height: number } }): void
```

### Parameters

- `obj`: `{ width: number; height: number; hitbox?: { width: number; height: number } }`

## setSync

Set the sync schema for the map

- Source: `packages/server/src/Player/Player.ts`
- Kind: `method`
- Defined in: `RpgPlayer`

### Signature

```ts
setSync(schema: RpgSyncSchema): void
```

### Parameters

- `schema`: `RpgSyncSchema`

## shapes

Legacy v4 list of shapes attached to this player.

Prefer `player.getShapes()` in new code.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `getter`
- Defined in: `RpgPlayer`

### Signature

```ts
shapes
```

### Returns

Shapes created with `player.attachShape(...)`.

## showAnimation

- Source: `packages/server/src/Player/Player.ts`
- Kind: `method`
- Defined in: `RpgPlayer`

### Signature

```ts
showAnimation(graphic: string, animationName: string, replaceGraphic?: boolean)
```

### Parameters

- `graphic`: `string`
- `animationName`: `string`
- `replaceGraphic?`: `boolean`

## showComponentAnimation

Show a temporary component animation on this player

This method broadcasts a component animation to all clients, allowing
temporary visual effects like hit indicators, spell effects, or status animations
to be displayed on the player.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `method`
- Defined in: `RpgPlayer`

### Signature

```ts
showComponentAnimation(id: string, params?: TParams): void
```

### Parameters

- `id`: `string`
- `params?`: `TParams`

### Examples

```ts
// Show a hit animation with damage text
player.showComponentAnimation("hit", {
  text: "150",
  color: "red"
});

// Show a heal animation
player.showComponentAnimation("heal", {
  amount: 50
});
```

## stopAllSounds

Stop all currently playing sounds for this player

This method stops all sounds that are currently playing for the player.
Useful when changing maps to prevent sound overlap.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `method`
- Defined in: `RpgPlayer`

### Signature

```ts
stopAllSounds(): void
```

### Examples

```ts
// Stop all sounds before changing map
player.stopAllSounds();
await player.changeMap("new-map");
```

## stopSound

Stop a sound that is currently playing for this player

This method stops a sound that was previously started with `playSound()`.
The sound must be defined on the client side.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `method`
- Defined in: `RpgPlayer`

### Signature

```ts
stopSound(soundId: string): void
```

### Parameters

- `soundId`: `string`

### Examples

```ts
// Start a looping background music
player.playSound("background-music", { loop: true });

// Later, stop it
player.stopSound("background-music");
```

## tiles

Legacy v4 list of Tiled tiles currently covered by the player's hitbox.

This helper is available only when the current map was loaded through
`@rpgjs/tiledmap` / `@canvasengine/tiled`. For non-Tiled maps, it returns `[]`.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `getter`
- Defined in: `RpgPlayer`

### Signature

```ts
tiles
```

### Returns

Tile information for each Tiled cell touched by the player.

## worldPositionX

Computed signal for world X position

Calculates the absolute world X position from the map's world position
plus the player's local X position. Returns 0 if no map is assigned.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `getter`
- Defined in: `RpgPlayer`

### Signature

```ts
worldPositionX
```

### Examples

```ts
const worldX = player.worldX();
console.log(`Player is at world X: ${worldX}`);
```

## worldPositionY

Computed signal for world Y position

Calculates the absolute world Y position from the map's world position
plus the player's local Y position. Returns 0 if no map is assigned.

- Source: `packages/server/src/Player/Player.ts`
- Kind: `getter`
- Defined in: `RpgPlayer`

### Signature

```ts
worldPositionY
```

### Examples

```ts
const worldY = player.worldY();
console.log(`Player is at world Y: ${worldY}`);
```
