---
title: "Event hooks"
description: "Hooks for events created as plain objects, as shown in the create-event guide."
---

# Event hooks

Hooks for events created as plain objects, as shown in the create-event guide.

## Members

- [onAction](#onaction)
- [onChanges](#onchanges)
- [onDetectInShape](#ondetectinshape)
- [onDetectOutShape](#ondetectoutshape)
- [onInit](#oninit)
- [onInShape](#oninshape)
- [onOutShape](#onoutshape)
- [onPlayerTouch](#onplayertouch)
- [onTouch](#ontouch)
- [onTouchEnd](#ontouchend)

## onAction

Called when a player performs an action on this event

- Source: `packages/server/src/rooms/map-types.ts`
- Kind: `property`
- Defined in: `EventHooks`

### Signature

```ts
onAction: (this: RpgEvent, player: RpgPlayer, input: RpgActionInput<unknown>) => void | Promise<void>
```

## onChanges

Called during the change-detection cycle for the current player.

Use this hook to recompute the event state from player data, especially
player variables. This is useful for reactive visuals such as an opened
chest, a hidden door, or a conditional NPC graphic.

- Source: `packages/server/src/rooms/map-types.ts`
- Kind: `property`
- Defined in: `EventHooks`

### Signature

```ts
onChanges: (this: RpgEvent, player: RpgPlayer) => void
```

## onDetectInShape

Called when a player is detected entering a detection shape attached to the event

- Source: `packages/server/src/rooms/map-types.ts`
- Kind: `property`
- Defined in: `EventHooks`

### Signature

```ts
onDetectInShape: (this: RpgEvent, player: RpgPlayer, shape: RpgShape) => void
```

## onDetectOutShape

Called when a player is detected exiting a detection shape attached to the event

- Source: `packages/server/src/rooms/map-types.ts`
- Kind: `property`
- Defined in: `EventHooks`

### Signature

```ts
onDetectOutShape: (this: RpgEvent, player: RpgPlayer, shape: RpgShape) => void
```

## onInit

Called when the event is first initialized.

Use this hook for default setup that does not depend on a player interaction,
such as setting the initial graphic, speed, or movement route.

- Source: `packages/server/src/rooms/map-types.ts`
- Kind: `property`
- Defined in: `EventHooks`

### Signature

```ts
onInit: (this: RpgEvent) => void
```

## onInShape

Called when a player enters a shape attached to the event

- Source: `packages/server/src/rooms/map-types.ts`
- Kind: `property`
- Defined in: `EventHooks`

### Signature

```ts
onInShape: (this: RpgEvent, zone: RpgShape, player: RpgPlayer) => void
```

## onOutShape

Called when a player exits a shape attached to the event

- Source: `packages/server/src/rooms/map-types.ts`
- Kind: `property`
- Defined in: `EventHooks`

### Signature

```ts
onOutShape: (this: RpgEvent, zone: RpgShape, player: RpgPlayer) => void
```

## onPlayerTouch

Called when a player touches this event

- Source: `packages/server/src/rooms/map-types.ts`
- Kind: `property`
- Defined in: `EventHooks`

### Signature

```ts
onPlayerTouch: (this: RpgEvent, player: RpgPlayer) => void
```

## onTouch

Called when this event starts touching a player or another event

- Source: `packages/server/src/rooms/map-types.ts`
- Kind: `property`
- Defined in: `EventHooks`

### Signature

```ts
onTouch: (this: RpgEvent, other: RpgPlayer | RpgEvent, context: RpgTouchContext) => void | Promise<void>
```

## onTouchEnd

Called when this event stops touching a player or another event

- Source: `packages/server/src/rooms/map-types.ts`
- Kind: `property`
- Defined in: `EventHooks`

### Signature

```ts
onTouchEnd: (this: RpgEvent, other: RpgPlayer | RpgEvent, context: RpgTouchContext) => void | Promise<void>
```
