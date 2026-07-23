---
title: "RpgMap"
description: "Reference for the `RpgMap` class."
---

# RpgMap

Reference for the `RpgMap` class.

## Members

- [addInDatabase](#addindatabase)
- [applySyncToClient](#applysynctoclient)
- [broadcast](#broadcast)
- [clear](#clear)
- [Clear streamed static hitboxes](#clear-streamed-static-hitboxes)
- [clearLighting](#clearlighting)
- [clearPhysic](#clearphysic)
- [clearWeather](#clearweather)
- [clientVisual](#clientvisual)
- [createDynamicEvent](#createdynamicevent)
- [createDynamicWorldMaps](#createdynamicworldmaps)
- [createMovingHitbox](#createmovinghitbox)
- [createShape](#createshape)
- [damageFormulas](#damageformulas)
- [database](#database)
- [dataIsReady$](#dataisready)
- [deleteWorldMaps](#deleteworldmaps)
- [events](#events)
- [getBody](#getbody)
- [getBodyPosition](#getbodyposition)
- [getEvent](#getevent)
- [getEventBy](#geteventby)
- [getEvents](#getevents)
- [getEventsBy](#geteventsby)
- [getInWorldMaps](#getinworldmaps)
- [getLighting](#getlighting)
- [getPlayer](#getplayer)
- [getPlayers](#getplayers)
- [getShape](#getshape)
- [getShapes](#getshapes)
- [getTick](#gettick)
- [getWeather](#getweather)
- [getWorldMaps](#getworldmaps)
- [getWorldMapsManager](#getworldmapsmanager)
- [globalConfig](#globalconfig)
- [guiExit](#guiexit)
- [guiInteraction](#guiinteraction)
- [heightPx](#heightpx)
- [hooks](#hooks)
- [id](#id)
- [interceptorPacket](#interceptorpacket)
- [isMoving](#ismoving)
- [maps](#maps)
- [nextTick](#nexttick)
- [off](#off)
- [on](#on)
- [onAction](#onaction)
- [onInput](#oninput)
- [onJoin](#onjoin)
- [onLeave](#onleave)
- [onRestore](#onrestore)
- [patchLighting](#patchlighting)
- [patchWeather](#patchweather)
- [players](#players)
- [playSound](#playsound)
- [processInput](#processinput)
- [queryArea](#queryarea)
- [queryHitbox](#queryhitbox)
- [refreshCharacterHitboxes](#refreshcharacterhitboxes)
- [removeEvent](#removeevent)
- [removeFromWorldMaps](#removefromworldmaps)
- [removeInDatabase](#removeindatabase)
- [removeShape](#removeshape)
- [Replace streamed static hitboxes](#replace-streamed-static-hitboxes)
- [setAutoTick](#setautotick)
- [setBodyPosition](#setbodyposition)
- [setDay](#setday)
- [setInWorldMaps](#setinworldmaps)
- [setLighting](#setlighting)
- [setNight](#setnight)
- [setSync](#setsync)
- [setWeather](#setweather)
- [shakeMap](#shakemap)
- [showAnimation](#showanimation)
- [showComponentAnimation](#showcomponentanimation)
- [sounds](#sounds)
- [stopSound](#stopsound)
- [tick$](#tick)
- [transitionLighting](#transitionlighting)
- [updateHitbox](#updatehitbox)
- [updateMap](#updatemap)
- [updateWorld](#updateworld)
- [updateWorldMaps](#updateworldmaps)
- [widthPx](#widthpx)
- [worldX](#worldx)
- [worldY](#worldy)

## addInDatabase

Add data to the map's database

This method delegates to BaseRoom's implementation to avoid code duplication.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
addInDatabase(id: string, data: any, options?: { force?: boolean }): boolean
```

### Parameters

- `id`: `string`
- `data`: `any`
- `options?`: `{ force?: boolean }`

### Returns

true if data was added, false if ignored (ID already exists)

### Examples

```ts
// Add an item class to the database
map.addInDatabase('Potion', PotionClass);

// Add an item object to the database
map.addInDatabase('custom-item', {
  name: 'Custom Item',
  price: 100
});

// Force overwrite existing data
map.addInDatabase('Potion', UpdatedPotionClass, { force: true });
```

## applySyncToClient

Apply sync to the client

This method applies sync to the client by calling the `$applySync()` method.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
applySyncToClient()
```

### Examples

```ts
map.applySyncToClient();
```

## broadcast

Broadcast a custom websocket event to all clients connected to this map.

This is a convenience wrapper around `$broadcast({ type, value })`.
On the client side, receive the event by injecting `WebSocketToken`
and subscribing with `socket.on(type, cb)`.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
map.broadcast(type, value)
```

### Parameters

- `type`: `string`
- `value?`: `T`

### Examples

```ts
map.broadcast("weather:warning", {
  level: "storm",
});
```

```ts
import { inject } from "@rpgjs/client";
import { WebSocketToken, type AbstractWebsocket } from "@rpgjs/client";

const socket = inject<AbstractWebsocket>(WebSocketToken);

socket.on("weather:warning", (payload) => {
  console.log(payload.level);
});
```

## clear

Clear all server resources and reset state

This method should be called to clean up all server-side resources when
shutting down or resetting the map. It stops the input processing loop
and ensures that all subscriptions are properly cleaned up.

## Design

This method is used primarily in testing environments to ensure clean
state between tests. It stops the tick subscription to prevent memory leaks.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
clear(): void
```

### Examples

```ts
// In test cleanup
afterEach(() => {
  map.clear();
});
```

## Clear streamed static hitboxes

Remove prediction collision geometry previously registered for a map chunk.

- Source: `packages/common/src/rooms/Map.ts`
- Kind: `method`
- Member of: `RpgCommonMap`
- Defined in: `RpgCommonMap`

### Signature

```ts
map.clearStreamedStaticHitboxes
```

### Parameters

- `namespace`: `string`

## clearLighting

Clear lighting for this map.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
clearLighting(options?: LightingSetOptions): void
```

### Parameters

- `options?`: `LightingSetOptions`

## clearPhysic

Clear all physics content and reset to initial state

This method completely clears the physics system by:
- Removing all hitboxes (static and movable)
- Removing all zones
- Clearing all collision data and events
- Clearing all movement events and sliding data
- Unsubscribing from the tick subscription
- Resetting the physics engine to a clean state

Use this method when you need to completely reset the map's physics
system, such as when changing maps or restarting a level.

- Source: `packages/common/src/rooms/Map.ts`
- Kind: `method`
- Defined in: `RpgCommonMap`

### Signature

```ts
clearPhysic()
```

### Examples

```ts
// Clear all physics when changing maps
map.clearPhysic();

// Then reload physics for the new map
map.loadPhysic();
```

## clearWeather

Clear weather for this map.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
clearWeather(options?: WeatherSetOptions): void
```

### Parameters

- `options?`: `WeatherSetOptions`

## clientVisual

Trigger a named client visual for all players on the map.

Client visuals are registered in the client module with `clientVisuals`.
They are client-side macros for grouping existing visual primitives such as
flash, sound, component animations, sprite animations, or camera shake.
The map broadcasts one compact packet containing the visual name and a
serializable payload; each client resolves and renders the visual locally.

Prefer direct APIs such as `playSound()`, `showComponentAnimation()`, or
`flash()` for a single visual operation. Use `clientVisual()` when one
gameplay moment should trigger several client-side visuals together.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
clientVisual(name: string, data?: TData): void
```

### Parameters

- `name`: `string`
- `data?`: `TData`

### Examples

```ts
map.clientVisual("explosion", {
  position: { x: 320, y: 180 },
  power: 2,
});
```

## createDynamicEvent

Creates a dynamic event on the map

This method handles both class-based events and object-based events with hooks.
For class-based events, it creates a new instance of the class.
For object-based events, it creates a dynamic class that extends RpgEvent and
implements the hook methods from the object.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
createDynamicEvent(eventObj: EventPosOption, options?: CreateDynamicEventOptions): Promise<string | undefined>
```

### Parameters

- `eventObj`: `EventPosOption`
- `options?`: `CreateDynamicEventOptions`

### Examples

```ts
// Using a class-based event
class MyEvent extends RpgEvent {
  onInit() {
    console.log('Event initialized');
  }
}

map.createDynamicEvent({
  x: 100,
  y: 200,
  event: MyEvent
});

// Using an object-based event
map.createDynamicEvent({
  x: 100,
  y: 200,
  event: {
    onInit() {
      console.log('Event initialized');
    },
    onPlayerTouch(player) {
      console.log('Player touched event');
    }
  }
});
```

## createDynamicWorldMaps

Create a world manager dynamically

Creates a new WorldMapsManager instance and configures it with the provided
map configurations. This is used when loading world data from Tiled or
other map editors.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
createDynamicWorldMaps(world: { id?: string; maps: WorldMapConfig[] }): WorldMapsManager
```

### Parameters

- `world`: `{ id?: string; maps: WorldMapConfig[] }`

### Returns

The newly created WorldMapsManager instance

### Examples

```ts
const manager = map.createDynamicWorldMaps({
  id: 'my-world',
  maps: [
    { id: 'map1', worldX: 0, worldY: 0, width: 800, height: 600 },
    { id: 'map2', worldX: 800, worldY: 0, width: 800, height: 600 }
  ]
});
```

## createMovingHitbox

Create a temporary and moving hitbox on the map

Allows to create a temporary hitbox that moves through multiple positions sequentially.
For example, you can use it to explode a bomb and find all the affected players,
or for a gameplay effect that should emit when entities enter a moving area.
For instant melee/combat checks, prefer `queryHitbox()`.

The method creates a zone sensor that moves through the specified hitbox positions
at the given speed, detecting collisions with players and events at each step.

- Source: `packages/common/src/rooms/Map.ts`
- Kind: `method`
- Defined in: `RpgCommonMap`

### Signature

```ts
createMovingHitbox(hitboxes: Array<{ x: number; y: number; width: number; height: number }>, options?: { speed?: number }): Observable<(T | any)[]>
```

### Parameters

- `hitboxes`: `Array<{ x: number; y: number; width: number; height: number }>`
- `options?`: `{ speed?: number }`

### Returns

Observable that emits arrays of hit entities and completes when movement is finished

### Examples

```ts
// Create a sword slash effect that moves through two positions
map.createMovingHitbox([
  { x: 100, y: 100, width: 50, height: 50 },
  { x: 120, y: 100, width: 50, height: 50 }
], { speed: 2 }).subscribe({
  next(hits) {
    // hits contains RpgPlayer or RpgEvent objects that were hit
    console.log('Hit entities:', hits);
  },
  complete() {
    console.log('Movement finished');
  }
});
```

## createShape

Create a shape dynamically on the map

This method creates a static hitbox on the map that can be used for
collision detection, area triggers, or visual boundaries. The shape is
backed by the physics engine's static entity system for accurate collision detection.

## Architecture

Creates a static entity (hitbox) in the physics engine at the specified position and size.
The shape is stored internally and can be retrieved by name. When players or events
collide with this hitbox, the `onInShape` and `onOutShape` hooks are automatically
triggered on both the player and the event.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
createShape(obj: {
    x: number;
    y: number;
    width: number;
    height: number;
    name?: string;
    z?: number;
    color?: string;
    collision?: boolean;
    properties?: Record<string, any>;
  }): RpgShape
```

### Parameters

- `obj`: `{
    x: number;
    y: number;
    width: number;
    height: number;
    name?: string;
    z?: number;
    color?: string;
    collision?: boolean;
    properties?: Record<string, any>;
  }`

### Returns

The created RpgShape instance

### Examples

```ts
// Create a simple rectangular shape
const shape = map.createShape({
  x: 100,
  y: 200,
  width: 50,
  height: 50,
  name: "spawn-zone"
});

// Create a shape with visual properties
const triggerZone = map.createShape({
  x: 300,
  y: 400,
  width: 100,
  height: 100,
  name: "treasure-area",
  color: "#FFD700",
  z: 1,
  collision: false,
  properties: {
    type: "treasure",
    value: 100
  }
});

// Player hooks will be triggered automatically
const player: RpgPlayerHooks = {
  onInShape(player: RpgPlayer, shape: RpgShape) {
    console.log('in', player.name, shape.name);
  },
  onOutShape(player: RpgPlayer, shape: RpgShape) {
    console.log('out', player.name, shape.name);
  }
};
```

## damageFormulas

Damage formulas configuration for the map

Contains formulas for calculating damage from skills, physical attacks,
critical hits, and element coefficients. Default formulas are merged
with custom formulas when the map is loaded.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `property`
- Defined in: `RpgMap`

### Signature

```ts
damageFormulas: DamageFormulas
```

## database

Signal containing the map's database of items, classes, and other game data

This database can be dynamically populated using `addInDatabase()` and
`removeInDatabase()` methods. It's used to store game entities like items,
classes, skills, etc. that are specific to this map.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `property`
- Defined in: `RpgMap`

### Signature

```ts
database
```

### Examples

```ts
// Add data to database
map.addInDatabase('Potion', PotionClass);

// Access database
const potion = map.database()['Potion'];
```

## dataIsReady$

BehaviorSubject that completes when the map data is ready

This subject is used to signal when the map has finished loading all its data.
Players wait for this to complete before the map is fully initialized.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `property`
- Defined in: `RpgMap`

### Signature

```ts
dataIsReady$
```

### Examples

```ts
// Wait for map data to be ready
map.dataIsReady$.subscribe(() => {
  console.log('Map is ready!');
});
```

## deleteWorldMaps

Delete a world manager by id

Removes the world maps manager from this map instance. Currently, only
one world manager is supported, so this clears the single manager.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
deleteWorldMaps(id: string): boolean
```

### Parameters

- `id`: `string`

### Returns

true if the manager was deleted, false if it didn't exist

### Examples

```ts
const deleted = map.deleteWorldMaps('my-world');
if (deleted) {
  console.log('World manager removed');
}
```

## events

Synchronized signal containing all events (NPCs, objects) on the map

This signal is automatically synchronized with clients by RPGJS.
Events are indexed by their unique ID.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `property`
- Defined in: `RpgMap`

### Signature

```ts
events
```

### Examples

```ts
// Get all events
const allEvents = map.events();

// Get a specific event
const event = map.events()['event-id'];
```

## getBody

Get physics body (entity) for an id

- Source: `packages/common/src/rooms/Map.ts`
- Kind: `method`
- Defined in: `RpgCommonMap`

### Signature

```ts
getBody(id: string): Entity | undefined
```

### Parameters

- `id`: `string`

## getBodyPosition

Get body position in different modes

- Source: `packages/common/src/rooms/Map.ts`
- Kind: `method`
- Defined in: `RpgCommonMap`

### Signature

```ts
getBodyPosition(id: string, mode?: "center" | "top-left"): { x: number; y: number } | undefined
```

### Parameters

- `id`: `string`
- `mode?`: `"center" | "top-left"`

### Returns

Position coordinates or undefined if entity not found

## getEvent

Get an event by its ID

Returns the event with the specified ID, or undefined if not found.
The return type can be narrowed using TypeScript generics.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
getEvent(eventId: string): T | undefined
```

### Parameters

- `eventId`: `string`

### Returns

The event instance, or undefined if not found

### Examples

```ts
// Get any event
const event = map.getEvent('npc-1');

// Get event with type narrowing
const npc = map.getEvent<MyNPC>('npc-1');
if (npc) {
  npc.speak('Hello!');
}
```

## getEventBy

Get the first event that matches a condition

Searches through all events on the map and returns the first one that
matches the provided callback function.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
getEventBy(cb: (event: RpgEvent) => boolean): RpgEvent | undefined
```

### Parameters

- `cb`: `(event: RpgEvent) => boolean`

### Returns

The first matching event, or undefined if none found

### Examples

```ts
// Find an event by name
const npc = map.getEventBy(event => event.name === 'Merchant');

// Find an event at a specific position
const chest = map.getEventBy(event => 
  event.x === 100 && event.y === 200
);
```

## getEvents

Get all events on the map

Returns an array of all events (NPCs, objects, etc.) that are currently
on this map.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
getEvents(): RpgEvent[]
```

### Returns

Array of all RpgEvent instances on the map

### Examples

```ts
const events = map.getEvents();
console.log(`There are ${events.length} events on the map`);

events.forEach(event => {
  console.log(`- ${event.name} at (${event.x}, ${event.y})`);
});
```

## getEventsBy

Get all events that match a condition

Searches through all events on the map and returns all events that
match the provided callback function.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
getEventsBy(cb: (event: RpgEvent) => boolean): RpgEvent[]
```

### Parameters

- `cb`: `(event: RpgEvent) => boolean`

### Returns

Array of all matching events

### Examples

```ts
// Find all NPCs
const npcs = map.getEventsBy(event => event.name.startsWith('NPC-'));

// Find all events in a specific area
const nearbyEvents = map.getEventsBy(event => 
  event.x >= 0 && event.x <= 100 &&
  event.y >= 0 && event.y <= 100
);
```

## getInWorldMaps

Get attached World

Recover the world attached to this map (undefined if no world attached)

- Source: `packages/common/src/rooms/Map.ts`
- Kind: `method`
- Defined in: `RpgCommonMap`
- Since: `3.0.0-beta.8`

### Signature

```ts
getInWorldMaps(): RpgWorldMaps | undefined
```

### Returns

The world maps manager instance if attached, otherwise undefined

### Examples

```ts
const world = map.getInWorldMaps();
if (world) {
  console.log(world.getAllMaps());
}
```

## getLighting

Get the current map lighting state.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
getLighting(): LightingState | null
```

## getPlayer

Get a player by their ID

Returns the player with the specified ID, or undefined if not found.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
getPlayer(playerId: string): RpgPlayer | undefined
```

### Parameters

- `playerId`: `string`

### Returns

The player instance, or undefined if not found

### Examples

```ts
const player = map.getPlayer('player-123');
if (player) {
  console.log(`Player ${player.name} is on the map`);
}
```

## getPlayers

Get all players currently on the map

Returns an array of all players that are currently connected to this map.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
getPlayers(): RpgPlayer[]
```

### Returns

Array of all RpgPlayer instances on the map

### Examples

```ts
const players = map.getPlayers();
console.log(`There are ${players.length} players on the map`);

players.forEach(player => {
  console.log(`- ${player.name}`);
});
```

## getShape

Get a shape by its name

Returns a shape with the specified name, or undefined if no shape
with that name exists on the map.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
getShape(name: string): RpgShape | undefined
```

### Parameters

- `name`: `string`

### Returns

The RpgShape instance, or undefined if not found

### Examples

```ts
// Create a shape with a specific name
map.createShape({
  x: 100,
  y: 200,
  width: 50,
  height: 50,
  name: "spawn-point"
});

// Retrieve it later
const spawnZone = map.getShape("spawn-point");
if (spawnZone) {
  console.log(`Spawn zone at (${spawnZone.x}, ${spawnZone.y})`);
}
```

## getShapes

Get all shapes on the map

Returns an array of all shapes that have been created on this map,
regardless of whether they are static shapes or player-attached shapes.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
getShapes(): RpgShape[]
```

### Returns

Array of RpgShape instances

### Examples

```ts
// Create multiple shapes
map.createShape({ x: 0, y: 0, width: 50, height: 50, name: "zone1" });
map.createShape({ x: 100, y: 100, width: 50, height: 50, name: "zone2" });

// Get all shapes
const allShapes = map.getShapes();
console.log(allShapes.length); // 2
```

## getTick

Get the current physics tick

- Source: `packages/common/src/rooms/Map.ts`
- Kind: `method`
- Defined in: `RpgCommonMap`

### Signature

```ts
getTick(): number
```

### Returns

Current tick number

## getWeather

Get the current map weather state.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
getWeather(): WeatherState | null
```

## getWorldMaps

Get a world manager by id

Returns the world maps manager for the given world ID. Currently, only
one world manager is supported per map instance.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
getWorldMaps(id: string): WorldMapsManager | null
```

### Parameters

- `id`: `string`

### Returns

The WorldMapsManager instance, or null if not initialized

### Examples

```ts
const worldManager = map.getWorldMaps('my-world');
if (worldManager) {
  const mapInfo = worldManager.getMapInfo('map1');
}
```

## getWorldMapsManager

Get the world maps manager

- Source: `packages/common/src/rooms/Map.ts`
- Kind: `method`
- Defined in: `RpgCommonMap`

### Signature

```ts
getWorldMapsManager(): WorldMapsManager | null
```

### Returns

WorldMapsManager instance or null if not configured

### Examples

```ts
const worldMaps = map.getWorldMapsManager();
if (worldMaps) {
  const adjacentMaps = worldMaps.getAdjacentMaps(currentMap, coordinates);
}
```

## globalConfig

Global configuration object for the map

This object contains configuration settings that apply to the entire map.
It's populated from the map data when `updateMap()` is called.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `property`
- Defined in: `RpgMap`

### Signature

```ts
globalConfig: any
```

## guiExit

Handle GUI exit from a player

This method is called when a player closes or exits a GUI.
It removes the GUI from the player's active GUIs.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
guiExit(player: RpgPlayer, { guiId, data, guiOpenId })
```

### Parameters

- `player`: `RpgPlayer`
- `{ guiId, data, guiOpenId }`

### Examples

```ts
// This method is called automatically when a player closes a GUI
// The GUI is removed from the player's active GUIs
```

## guiInteraction

Handle GUI interaction from a player

This method is called when a player interacts with a GUI element.
It synchronizes the player's changes to ensure the client state is up to date.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
guiInteraction(player: RpgPlayer, value: { guiId: string, name: string, data: any })
```

### Parameters

- `player`: `RpgPlayer`
- `value`: `{ guiId: string, name: string, data: any }`

### Examples

```ts
// This method is called automatically when a player interacts with a GUI
// The interaction data is sent from the client
```

## heightPx

Get the height of the map in pixels

- Source: `packages/common/src/rooms/Map.ts`
- Kind: `getter`
- Defined in: `RpgCommonMap`

### Signature

```ts
heightPx
```

### Returns

The height of the map in pixels, or 0 if not loaded

### Examples

```ts
const height = map.heightPx;
console.log(`Map height: ${height}px`);
```

## hooks

Get the hooks system for this map

Returns the dependency-injected Hooks instance that allows you to trigger
and listen to various game events.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `getter`
- Defined in: `RpgMap`

### Signature

```ts
hooks
```

### Returns

The Hooks instance for this map

### Examples

```ts
// Trigger a custom hook
map.hooks.callHooks('custom-event', data).subscribe();
```

## id

Get the unique identifier of the map

- Source: `packages/common/src/rooms/Map.ts`
- Kind: `getter`
- Defined in: `RpgCommonMap`

### Signature

```ts
id
```

### Returns

The map ID, or empty string if not loaded

### Examples

```ts
const mapId = map.id;
console.log(`Current map: ${mapId}`);
```

## interceptorPacket

Intercepts and modifies packets before they are sent to clients

This method is automatically called by the RPGJS room runtime for each packet sent to clients.
It adds timestamp and acknowledgment information to sync packets for client-side
prediction reconciliation. This helps with network synchronization and reduces
perceived latency.

## Architecture

Adds metadata to packets:
- `timestamp`: Current server time for client-side prediction
- `ack`: Acknowledgment info with last processed frame and authoritative position

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
interceptorPacket(player: RpgPlayer, packet: any, conn: RpgRoomConnection)
```

### Parameters

- `player`: `RpgPlayer`
- `packet`: `any`
- `conn`: `RpgRoomConnection`

### Returns

Modified packet with timestamp and ack info, or null if player is invalid

### Examples

```ts
// This method is called automatically by the framework
// You typically don't call it directly
```

## isMoving

Check if an entity is currently moving

- Source: `packages/common/src/rooms/Map.ts`
- Kind: `method`
- Defined in: `RpgCommonMap`

### Signature

```ts
isMoving(id: string): boolean
```

### Parameters

- `id`: `string`

### Returns

Boolean indicating if the entity is in motion

### Examples

```ts
// Check if player is moving
if (map.isMoving('player1')) {
  // Player is in motion
}
```

## maps

Array of map configurations - can contain MapOptions objects or instances of map classes

This array stores the configuration for this map and any related maps.
It's populated when the map is loaded via `updateMap()`.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `property`
- Defined in: `RpgMap`

### Signature

```ts
maps: (MapOptions | any)[]
```

## nextTick

Manually trigger a single game tick

This method allows you to manually advance the game by one tick (16ms at 60fps).
It's primarily useful for testing where you need precise control over when
physics updates occur, rather than relying on the automatic tick$ subscription.

## Use Cases

- **Testing**: Control exactly when physics steps occur in unit tests
- **Manual control**: Step through game state manually for debugging
- **Deterministic testing**: Ensure consistent timing in test scenarios

## Important

This method should NOT be used in production code alongside the automatic `tick$`
subscription, as it will cause double-stepping. Use either:
- Automatic ticks (via `loadPhysic()` which subscribes to `tick$`)
- Manual ticks (via `nextTick()` without `loadPhysic()` subscription)

- Source: `packages/common/src/rooms/Map.ts`
- Kind: `method`
- Defined in: `RpgCommonMap`

### Signature

```ts
nextTick(deltaMs?: number): number
```

### Parameters

- `deltaMs?`: `number`

### Returns

Number of physics ticks executed

### Examples

```ts
// In tests: manually advance game by one tick
map.nextTick(); // Advances by 16ms (one frame at 60fps)

// With custom delta
map.nextTick(32); // Advances by 32ms (two frames at 60fps)

// In a test loop
for (let i = 0; i < 60; i++) {
  map.nextTick(); // Simulate 1 second of game time
}
```

## off

Remove all listeners for a custom client event on this map.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
map.off(type)
```

### Parameters

- `type`: `string`

## on

Listen to custom websocket events sent by clients on this map.

The callback receives the player who sent the event and the payload.
This is useful for map-wide custom interactions that are not covered
by built-in actions such as movement, GUI events, or the action button.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
map.on(type, cb)
```

### Parameters

- `type`: `string`
- `cb`: `(player: RpgPlayer, data: T) => void | Promise<void>`

### Examples

```ts
map.on("chat:message", (player, data) => {
  console.log(player.id, data.text);
});
```

## onAction

Handle action input from a player

This method is called when a player performs an action (like pressing a button).
It checks for collisions with events and triggers the appropriate hooks.

## Architecture

1. Gets all entities colliding with the player
2. Triggers `onAction` hook on colliding events
3. Triggers `onInput` hook on the player

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
onAction(player: RpgPlayer, action: RpgActionInput<unknown>): void
```

### Parameters

- `player`: `RpgPlayer`
- `action`: `RpgActionInput<unknown>`

### Examples

```ts
// This method is called automatically when a player presses an action button
// Events near the player will have their onAction hook triggered
```

## onInput

Handle movement input from a player

This method is called when a player sends movement input from the client.
It queues the input for processing by the game loop. Inputs are processed
with frame numbers to ensure proper ordering and client-side prediction.

## Architecture

- Inputs are queued in `player.pendingInputs`
- Duplicate frames are skipped to prevent processing the same input twice
- Inputs are processed asynchronously by the game loop

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
onInput(player: RpgPlayer, input: any)
```

### Parameters

- `player`: `RpgPlayer`
- `input`: `any`

### Examples

```ts
// This method is called automatically when a player moves
// The input is queued and processed by processInput()
```

## onJoin

Called when a player joins the map

This method is automatically called by the RPGJS room runtime when a player connects to the map.
It initializes the player's connection, sets up the map context, and waits for
the map data to be ready before playing sounds and triggering hooks.

## Architecture

1. Sets player's map reference and context
2. Initializes the player
3. Waits for map data to be ready
4. Plays map sounds for the player
5. Triggers `server-player-onJoinMap` hook

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
onJoin(player: RpgPlayer, conn: RpgRoomConnection)
```

### Parameters

- `player`: `RpgPlayer`
- `conn`: `RpgRoomConnection`

### Examples

```ts
// This method is called automatically by the framework
// You can listen to the hook to perform custom logic
server.addHook('server-player-onJoinMap', (player, map) => {
  console.log(`Player ${player.id} joined map ${map.id}`);
});
```

## onLeave

Called when a player leaves the map

This method is automatically called by the RPGJS room runtime when a player disconnects from the map.
It cleans up the player's pending inputs and triggers the appropriate hooks.

## Architecture

1. Triggers `server-player-onLeaveMap` hook
2. Clears pending inputs to prevent processing after disconnection

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
onLeave(player: RpgPlayer, conn: RpgRoomConnection)
```

### Parameters

- `player`: `RpgPlayer`
- `conn`: `RpgRoomConnection`

### Examples

```ts
// This method is called automatically by the framework
// You can listen to the hook to perform custom cleanup
server.addHook('server-player-onLeaveMap', (player, map) => {
  console.log(`Player ${player.id} left map ${map.id}`);
});
```

## onRestore

Rebuild non-serializable map resources after a room restart or hibernation.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
onRestore()
```

## patchLighting

Patch the current lighting state.

Nested `ambient`, `sun`, and `shadows` values are merged.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
patchLighting(patch: Partial<LightingState>, options?: LightingSetOptions): LightingState | null
```

### Parameters

- `patch`: `Partial<LightingState>`
- `options?`: `LightingSetOptions`

## patchWeather

Patch the current weather state.

Nested `params` values are merged.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
patchWeather(patch: Partial<WeatherState>, options?: WeatherSetOptions): WeatherState | null
```

### Parameters

- `patch`: `Partial<WeatherState>`
- `options?`: `WeatherSetOptions`

## players

Synchronized signal containing all players currently on the map

This signal is automatically synchronized with clients by RPGJS.
Players are indexed by their unique ID.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `property`
- Defined in: `RpgMap`

### Signature

```ts
players
```

### Examples

```ts
// Get all players
const allPlayers = map.players();

// Get a specific player
const player = map.players()['player-id'];
```

## playSound

Play a sound for all players on the map

This method plays a sound for all players currently on the map by iterating
over each player and calling `player.playSound()`. The sound must be defined
on the client side (in the client module configuration).
This is ideal for environmental sounds, battle music, or map-wide events that
all players should hear simultaneously.

## Design

Iterates over all players on the map and calls `player.playSound()` for each one.
This avoids code duplication and reuses the existing player sound logic.
For player-specific sounds, use `player.playSound()` directly.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
playSound(soundId: string, options?: { volume?: number; loop?: boolean }): void
```

### Parameters

- `soundId`: `string`
- `options?`: `{ volume?: number; loop?: boolean }`

### Examples

```ts
// Play a sound for all players on the map
map.playSound("explosion");

// Play background music for everyone with volume and loop
map.playSound("battle-theme", {
  volume: 0.7,
  loop: true
});

// Play a door opening sound at low volume
map.playSound("door-open", { volume: 0.4 });
```

## processInput

Process pending inputs for a player with anti-cheat validation

This method processes pending inputs for a player while performing
anti-cheat validation to prevent time manipulation and frame skipping.
It validates the time deltas between inputs and ensures they are within
acceptable ranges. To preserve movement itinerary under network bursts,
the number of inputs processed per call is capped.

## Architecture

**Important**: This method only updates entity velocities - it does NOT step
the physics engine. Physics simulation is handled centrally by the game loop
(`tick$` -> `runFixedTicks`). This ensures:
- Consistent physics timing (60fps fixed timestep)
- No double-stepping when multiple inputs are processed
- Deterministic physics regardless of input frequency

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
processInput(playerId: string, controls?: Controls): Promise<{
    player: RpgPlayer,
    inputs: any[]
  }>
```

### Parameters

- `playerId`: `string`
- `controls?`: `Controls`

### Returns

Promise containing the player and processed movement inputs

### Examples

```ts
// Process inputs with default anti-cheat settings
const result = await map.processInput('player1');
console.log('Processed inputs:', result.inputs);

// Process inputs with custom anti-cheat configuration
const result = await map.processInput('player1', {
  maxTimeDelta: 100,
  maxFrameDelta: 5,
  minTimeBetweenInputs: 16,
  enableAntiCheat: true
});
```

## queryArea

Query players, events, and optional custom targets inside an arbitrary area.

`queryArea()` is a low-level selection primitive. It uses the shape bounds as
a broad phase, then delegates the precise inclusion logic to
`shape.contains()`. Built-in helpers such as `AreaShape.circle()` and
`AreaShape.cross()` are conveniences over the same shape contract.

The method does not apply gameplay effects. Use the returned hits for damage,
healing, target selection, AI, traps, previews, or any custom gameplay.

In a networked game, apply those gameplay effects on the server so the
authoritative state remains synchronized.

Options:
- `center`: point or object with `x`, `y`, and optional `hitbox`; objects
  are resolved to their hitbox center.
- `shape`: area shape used for broad-phase bounds and precise inclusion.
- `targets`: `"players"`, `"events"`, `"custom"`, an array of them, or
  `"all"`. Defaults to players and events, plus custom targets when
  `customTargets` is provided.
- `customTargets`: plain objects to include in the query. They should expose
  `x` and `y`, and may expose `id`, `width`/`height`, or `hitbox`.
- `excludeIds`: target ids to ignore, typically the caster or owner.
- `filter`: final predicate called before `shape.contains()`.

Built-in shape helpers:
- `AreaShape.circle({ radius, offset? })`
- `AreaShape.rect({ width, height, offset?, angle? })`
- `AreaShape.line({ length, thickness, direction, offset? })`
- `AreaShape.cross({ armLength, thickness, offset? })`
- `AreaShape.composite([shapeA, shapeB])`
- `AreaShape.custom({ bounds, contains, distance?, maxDistance? })`

Each hit includes `target`, `id`, `kind`, `x`, `y`, `bounds`, `distance`,
`distanceRatio`, and `falloff`.

`distanceRatio` is clamped between `0` and `1`. `falloff.linear()` returns
strong values near the center and weaker values near the edge, which is
useful for explosions and other radial effects.

- Source: `packages/common/src/rooms/Map.ts`
- Kind: `method`
- Defined in: `RpgCommonMap`

### Signature

```ts
queryArea(options: MapAreaQueryOptions<TCustom>): Array<MapAreaHit<TCustom | T | any>>
```

### Parameters

- `options`: `MapAreaQueryOptions<TCustom>`

### Examples

```ts
import { AreaShape } from "@rpgjs/server";

const hits = map.queryArea({
  center: player,
  shape: AreaShape.circle({ radius: 120 }),
  targets: ["players", "events"],
  excludeIds: [player.id],
});

for (const hit of hits) {
  const damage = Math.round(80 * hit.falloff.linear());
  hit.target.hp -= damage;
}
```

```ts
import { AreaShape } from "@rpgjs/server";

function explodeBomb(map, bomb, ownerId?: string) {
  const hits = map.queryArea({
    center: bomb,
    shape: AreaShape.circle({ radius: 96 }),
    targets: ["players", "events"],
    excludeIds: ownerId ? [ownerId] : [],
    filter: (target) => target.id !== bomb.id,
  });

  for (const hit of hits) {
    const damage = Math.round(120 * hit.falloff.linear());
    hit.target.hp = Math.max(0, hit.target.hp - damage);
  }
}
```

```ts
const hits = map.queryArea({
  center: { x: 320, y: 240 },
  shape: AreaShape.custom({
    bounds: ({ center }) => ({
      x: center.x - 160,
      y: center.y - 160,
      width: 320,
      height: 320,
    }),
    contains: (target, { center }) => {
      const distance = Math.hypot(target.x - center.x, target.y - center.y);
      return distance >= 64 && distance <= 160;
    },
    maxDistance: () => 160,
  }),
  targets: "custom",
  customTargets: projectiles,
});
```

## queryHitbox

Query players and events whose physics bodies overlap a rectangular hitbox.

Unlike `createMovingHitbox()`, this is an immediate deterministic query. It
is intended for melee attacks, AoE checks, and other server-authoritative
gameplay that needs to hit entities already inside the area.

- Source: `packages/common/src/rooms/Map.ts`
- Kind: `method`
- Defined in: `RpgCommonMap`

### Signature

```ts
queryHitbox(rect: MapHitboxQueryRect, options?: MapHitboxQueryOptions): Array<T | any>
```

### Parameters

- `rect`: `MapHitboxQueryRect`
- `options?`: `MapHitboxQueryOptions`

## refreshCharacterHitboxes

- Source: `packages/common/src/rooms/Map.ts`
- Kind: `method`
- Defined in: `RpgCommonMap`

### Signature

```ts
refreshCharacterHitboxes(): void
```

## removeEvent

Remove an event from the map

Removes the event with the specified ID from the map. The event will
be removed from the synchronized events signal, causing it to disappear
on all clients.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
removeEvent(eventId: string)
```

### Parameters

- `eventId`: `string`

### Examples

```ts
// Remove an event
map.removeEvent('npc-1');

// Remove event after interaction
const chest = map.getEvent('chest-1');
if (chest) {
  // ... do something with chest ...
  map.removeEvent('chest-1');
}
```

## removeFromWorldMaps

Remove this map from the world

Remove this map from the world

- Source: `packages/common/src/rooms/Map.ts`
- Kind: `method`
- Defined in: `RpgCommonMap`
- Since: `3.0.0-beta.8`

### Signature

```ts
removeFromWorldMaps(): boolean | undefined
```

### Returns

True if removed, false if not found, undefined if no world attached

### Examples

```ts
const removed = map.removeFromWorldMaps();
```

## removeInDatabase

Remove data from the map's database

This method delegates to BaseRoom's implementation to avoid code duplication.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
removeInDatabase(id: string): boolean
```

### Parameters

- `id`: `string`

### Returns

true if data was removed, false if ID didn't exist

### Examples

```ts
// Remove an item from the database
map.removeInDatabase('Potion');

// Check if removal was successful
const removed = map.removeInDatabase('custom-item');
if (removed) {
  console.log('Item removed successfully');
}
```

## removeShape

Delete a shape from the map

Removes a shape by its name and cleans up the associated static hitbox entity.
If the shape doesn't exist, the method does nothing.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
removeShape(name: string): void
```

### Parameters

- `name`: `string`

### Returns

void

### Examples

```ts
// Create and then remove a shape
const shape = map.createShape({
  x: 100,
  y: 200,
  width: 50,
  height: 50,
  name: "temp-zone"
});

// Later, remove it
map.removeShape("temp-zone");
```

## Replace streamed static hitboxes

Replace the client-prediction collision geometry owned by one streamed map chunk.

The authoritative server still owns collision results. This method only keeps
the predicting client aligned with chunks that the server has disclosed.

- Source: `packages/common/src/rooms/Map.ts`
- Kind: `method`
- Member of: `RpgCommonMap`
- Defined in: `RpgCommonMap`

### Signature

```ts
map.replaceStreamedStaticHitboxes
```

### Parameters

- `namespace`: `string`
- `hitboxes`: `MapChunkHitbox[]`

## setAutoTick

Enable or disable automatic server tick processing

When disabled, the unified input/physics/projectile loop will not run
automatically. This is useful for unit tests where you want manual control
over server ticks.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
setAutoTick(enabled: boolean): void
```

### Parameters

- `enabled`: `boolean`

### Examples

```ts
// Disable auto tick for testing
map.setAutoTick(false);

// Manually trigger tick processing
await map.nextTickAsync();
```

## setBodyPosition

Set body position

- Source: `packages/common/src/rooms/Map.ts`
- Kind: `method`
- Defined in: `RpgCommonMap`

### Signature

```ts
setBodyPosition(id: string, x: number, y: number, mode?: "center" | "top-left"): Entity | undefined
```

### Parameters

- `id`: `string`
- `x`: `number`
- `y`: `number`
- `mode?`: `"center" | "top-left"`

### Returns

True if position was set successfully

## setDay

Apply the default daytime lighting preset.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
setDay(options?: LightingSetOptions): LightingState | null
```

### Parameters

- `options?`: `LightingSetOptions`

## setInWorldMaps

Assign the map to a world

Assign the map to a world

- Source: `packages/common/src/rooms/Map.ts`
- Kind: `method`
- Defined in: `RpgCommonMap`
- Since: `3.0.0-beta.8`

### Signature

```ts
setInWorldMaps(worldMap: RpgWorldMaps): void
```

### Parameters

- `worldMap`: `RpgWorldMaps`

### Examples

```ts
const world = new WorldMapsManager();
world.configure([{ id: 'm1', worldX: 0, worldY: 0, width: 1024, height: 1024 }]);
map.setInWorldMaps(world);
```

## setLighting

Set the full lighting state for this map.

When `sync` is true (default), all connected clients receive the new lighting.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
setLighting(next: LightingState | null, options?: LightingSetOptions): LightingState | null
```

### Parameters

- `next`: `LightingState | null`
- `options?`: `LightingSetOptions`

## setNight

Apply the default nighttime lighting preset.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
setNight(options?: LightingSetOptions): LightingState | null
```

### Parameters

- `options?`: `LightingSetOptions`

## setSync

Configure runtime synchronized properties on the map

This method allows you to dynamically add synchronized properties to the map
that will be automatically synced with clients. The schema follows the same
structure as module properties with `$initial`, `$syncWithClient`, and `$permanent` options.

## Architecture

- Reads a schema object shaped like module props
- Creates typed synchronized signals through the RPGJS gameplay contract
- Properties are accessible as `map.propertyName`

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
setSync(schema: Record<string, any>)
```

### Parameters

- `schema`: `Record<string, any>`

### Examples

```ts
// Add synchronized properties to the map
map.setSync({
  weather: {
    $initial: 'sunny',
    $syncWithClient: true,
    $permanent: false
  },
  timeOfDay: {
    $initial: 12,
    $syncWithClient: true,
    $permanent: false
  }
});

// Use the properties
map.weather.set('rainy');
const currentWeather = map.weather();
```

## setWeather

Set the full weather state for this map.

When `sync` is true (default), all connected clients receive the new weather.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
setWeather(next: WeatherState | null, options?: WeatherSetOptions): WeatherState | null
```

### Parameters

- `next`: `WeatherState | null`
- `options?`: `WeatherSetOptions`

## shakeMap

Shake the map for all players

This method triggers a shake animation on the map for all players currently on the map.
The shake effect creates a visual feedback that can be used for earthquakes, explosions,
impacts, or any dramatic event that should affect the entire map visually.

## Architecture

Broadcasts a shake event to all clients connected to the map. Each client receives
the shake configuration and triggers the shake animation on the map container using
Canvas Engine's shake directive.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
shakeMap(options?: {
    intensity?: number;
    duration?: number;
    frequency?: number;
    direction?: 'x' | 'y' | 'both';
  }): void
```

### Parameters

- `options?`: `{
    intensity?: number;
    duration?: number;
    frequency?: number;
    direction?: 'x' | 'y' | 'both';
  }`

### Examples

```ts
// Basic shake with default settings
map.shakeMap();

// Intense earthquake effect
map.shakeMap({
  intensity: 25,
  duration: 1000,
  frequency: 15,
  direction: 'both'
});

// Horizontal shake for side impact
map.shakeMap({
  intensity: 15,
  duration: 400,
  direction: 'x'
});

// Vertical shake for ground impact
map.shakeMap({
  intensity: 20,
  duration: 600,
  direction: 'y'
});
```

## showAnimation

Display a spritesheet animation at a specific position on the map

This method displays a temporary visual animation using a spritesheet at any
location on the map. It's a convenience method that internally uses showComponentAnimation
with the built-in 'animation' component. This is useful for spell effects, environmental
animations, or any visual feedback that uses predefined spritesheets.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
showAnimation(position: { x: number, y: number }, graphic: string, animationName?: string)
```

### Parameters

- `position`: `{ x: number, y: number }`
- `graphic`: `string`
- `animationName?`: `string`

### Examples

```ts
// Show explosion at specific coordinates
map.showAnimation({ x: 100, y: 200 }, "explosion");

// Show spell effect at player position
const playerPos = { x: player.x, y: player.y };
map.showAnimation(playerPos, "spell-effects", "lightning");

// Show environmental effect
map.showAnimation({ x: 300, y: 150 }, "nature-effects", "wind-gust");

// Show portal opening animation
map.showAnimation({ x: 500, y: 400 }, "portals", "opening");
```

## showComponentAnimation

Display a component animation at a specific position on the map

This method broadcasts a component animation to all clients connected to the map,
allowing temporary visual effects to be displayed at any location on the map.
Component animations are custom Canvas Engine components that can display
complex effects with custom logic and parameters.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
showComponentAnimation(id: string, position: { x: number, y: number }, params: any)
```

### Parameters

- `id`: `string`
- `position`: `{ x: number, y: number }`
- `params`: `any`

### Examples

```ts
// Show explosion at specific coordinates
map.showComponentAnimation("explosion", { x: 300, y: 400 }, {
  intensity: 2.5,
  duration: 1500
});

// Show area damage effect
map.showComponentAnimation("area-damage", { x: player.x, y: player.y }, {
  radius: 100,
  color: "red",
  damage: 50
});

// Show treasure spawn effect
map.showComponentAnimation("treasure-spawn", { x: 150, y: 200 }, {
  sparkle: true,
  sound: "treasure-appear"
});
```

## sounds

Array of sound IDs to play when players join the map

These sounds are automatically played for each player when they join the map.
Sounds must be defined on the client side.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `property`
- Defined in: `RpgMap`

### Signature

```ts
sounds: string[]
```

### Examples

```ts
// Set sounds for the map
map.sounds = ['background-music', 'ambient-forest'];
```

## stopSound

Stop a sound for all players on the map

This method stops a sound that was previously started with `map.playSound()`
for all players on the map by iterating over each player and calling `player.stopSound()`.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
stopSound(soundId: string): void
```

### Parameters

- `soundId`: `string`

### Examples

```ts
// Start background music for everyone
map.playSound("battle-theme", { loop: true });

// Later, stop it for everyone
map.stopSound("battle-theme");
```

## tick$

Observable representing the game loop tick

This observable emits elapsed time and the current epoch timestamp at roughly
60fps. It is shared using the share() operator, meaning that all subscribers
receive events from a single timer rather than creating multiple timers.

## Physics Loop Architecture

The physics simulation is centralized in this game loop:

1. **Input Processing** (`processInput`): Only updates entity velocities, does NOT step physics
2. **Game Loop** (`tick$` -> `runFixedTicks`): Executes physics simulation with fixed timestep
3. **Fixed Timestep Pattern**: Accumulator-based approach ensures deterministic physics

```
Input Events ─────────────────────────────────────────────────────────────►
    │
    ▼ (update velocity only)
┌─────────────────────────────────────────────────────────────────────────┐
│                        Game Loop (tick$)                                │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐       │
│  │ updateMovements │ → │  stepOneTick    │ → │ postTickUpdates │       │
│  │ (apply velocity)│   │ (physics step)  │   │ (zones, sync)   │       │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
```

- Source: `packages/common/src/rooms/Map.ts`
- Kind: `property`
- Defined in: `RpgCommonMap`

### Signature

```ts
tick$
```

### Examples

```ts
// Subscribe to the game tick for custom updates
map.tick$.subscribe(({ delta, timestamp }) => {
  // Custom game logic runs alongside physics
  this.updateCustomEntities(delta);
});
```

## transitionLighting

Transition lighting over time by broadcasting intermediate lighting states.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
transitionLighting(toLighting: Partial<LightingState>, options?: LightingTransitionOptions & LightingSetOptions): LightingState | null
```

### Parameters

- `toLighting`: `Partial<LightingState>`
- `options?`: `LightingTransitionOptions & LightingSetOptions`

## updateHitbox

Update hitbox position and size

- Source: `packages/common/src/rooms/Map.ts`
- Kind: `method`
- Defined in: `RpgCommonMap`

### Signature

```ts
updateHitbox(id: string, x: number, y: number, width?: number, height?: number): boolean
```

### Parameters

- `id`: `string`
- `x`: `number`
- `y`: `number`
- `width?`: `number`
- `height?`: `number`

### Returns

True if hitbox was updated successfully

## updateMap

Update the map configuration and data

This endpoint receives map data from the client and initializes the map.
It loads the map configuration, damage formulas, events, and physics.

## Architecture

1. Validates the request body using MapUpdateSchema
2. Updates map data, global config, and damage formulas
3. Merges events and sounds from map configuration
4. Triggers hooks for map loading
5. Loads physics engine
6. Creates all events on the map
7. Completes the dataIsReady$ subject

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
updateMap(request: Request)
```

### Parameters

- `request`: `Request`

### Returns

Promise that resolves when the map is fully loaded

### Examples

```ts
// This endpoint is called automatically when a map is loaded
// POST /map/update
// Body: { id: string, width: number, height: number, config?: any, damageFormulas?: any }
```

## updateWorld

Update (or create) a world configuration and propagate to all maps in that world

This endpoint receives world map configuration data (typically from Tiled world import)
and creates or updates the world manager. The world ID is extracted from the URL path.

## Architecture

1. Authenticates the administrative update request
2. Extracts the world ID from the `/world/:id/update` path segment
3. Normalizes input to array of WorldMapConfig
4. Persists the topology so it survives Durable Object hibernation
5. Creates or updates the world manager

Expected payload examples:
- `{ id: string, maps: WorldMapConfig[] }`
- `WorldMapConfig[]`

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
updateWorld(request: Request)
```

### Parameters

- `request`: `Request`

### Returns

Promise resolving to `{ ok: true }` when complete

### Examples

```ts
// POST /world/my-world/update
// Body: [{ id: 'map1', worldX: 0, worldY: 0, width: 800, height: 600 }]

// Or with nested structure
// Body: { id: 'my-world', maps: [{ id: 'map1', ... }] }
```

## updateWorldMaps

Update world maps by id. Auto-create when missing.

Updates the world maps configuration. If the world manager doesn't exist,
it is automatically created. This is useful for dynamically loading world
data or updating map positions.

- Source: `packages/server/src/rooms/map.ts`
- Kind: `method`
- Defined in: `RpgMap`

### Signature

```ts
updateWorldMaps(id: string, maps: WorldMapConfig[])
```

### Parameters

- `id`: `string`
- `maps`: `WorldMapConfig[]`

### Returns

Promise that resolves when the update is complete

### Examples

```ts
await map.updateWorldMaps('my-world', [
  { id: 'map1', worldX: 0, worldY: 0, width: 800, height: 600 },
  { id: 'map2', worldX: 800, worldY: 0, width: 800, height: 600 }
]);
```

## widthPx

Get the width of the map in pixels

- Source: `packages/common/src/rooms/Map.ts`
- Kind: `getter`
- Defined in: `RpgCommonMap`

### Signature

```ts
widthPx
```

### Returns

The width of the map in pixels, or 0 if not loaded

### Examples

```ts
const width = map.widthPx;
console.log(`Map width: ${width}px`);
```

## worldX

Get the X position of this map in the world coordinate system

This is used when maps are part of a larger world map. The world position
indicates where this map is located relative to other maps.

- Source: `packages/common/src/rooms/Map.ts`
- Kind: `getter`
- Defined in: `RpgCommonMap`

### Signature

```ts
worldX
```

### Returns

The X position in world coordinates, or 0 if not in a world

### Examples

```ts
const worldX = map.worldX;
console.log(`Map is at world position (${worldX}, ${map.worldY})`);
```

## worldY

Get the Y position of this map in the world coordinate system

This is used when maps are part of a larger world map. The world position
indicates where this map is located relative to other maps.

- Source: `packages/common/src/rooms/Map.ts`
- Kind: `getter`
- Defined in: `RpgCommonMap`

### Signature

```ts
worldY
```

### Returns

The Y position in world coordinates, or 0 if not in a world

### Examples

```ts
const worldY = map.worldY;
console.log(`Map is at world position (${map.worldX}, ${worldY})`);
```
