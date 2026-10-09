---
title: "Server Map Hooks"
description: "Guide for Server Map Hooks in RPGJS."
---

# Server Map Hooks

Map hooks are global hooks that apply to all maps.

They are defined in the `map` property of your server module.

## Usage

```ts
import { defineModule, type RpgServer } from "@rpgjs/server";

export default defineModule<RpgServer>({
  map: {
    onBeforeUpdate(mapData, map) {
      // Mutate or validate the incoming data before the update is applied.
    },
    onPhysicsInit(map, { mapData }) {
      // Build shared physics metadata
    },
    onPhysicsEntityAdd(map, { owner, entity, kind }) {
      // Attach entity-level collision rules
    },
    onPhysicsEntityRemove(map, { owner }) {
      // Cleanup entity-level rules
    },
    onPhysicsReset(map) {
      // Cleanup map-level physics extension state
    },
  },
});
```

## Lifecycle Hooks

### `onBeforeUpdate(mapData, map)`

Called before a map update is applied.

Use this to inspect, normalize, or validate map data before `loadPhysic()`. Its
return value is ignored; mutate the provided data when normalization is required.

### `onLoad(map)`

Called when a map is loaded and initialized.

### `onJoin(player, map)`

Called when a player joins a map.

### `onLeave(player, map)`

Called when a player leaves a map.

## Physics Extension Hooks

### `onPhysicsInit(map, context)`

Called when map physics is initialized.

- `context.mapData`: map data used by `loadPhysic()`

### `onPhysicsEntityAdd(map, context)`

Called when a dynamic physics body is created.

- `context.owner`: player/event owning the body
- `context.entity`: physics entity instance
- `context.kind`: `"hero" | "npc" | "generic"`

### `onPhysicsEntityRemove(map, context)`

Called before a dynamic physics body is removed.

Use this to unregister handlers attached in `onPhysicsEntityAdd`.

### `onPhysicsReset(map)`

Called when map physics is reset before a reload.

Use this for map-level cleanup.

## Shared Logic Pattern

For client prediction parity, put collision rules in shared functions, then call them from:

- `server.map.onPhysics*`
- `client.sceneMap.onPhysics*`

This guarantees the same movement constraints on both sides.
