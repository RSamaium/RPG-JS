---
title: "Hide Map Objects"
description: "Hide events and other players for the local player only, while a module draws its own scene on the map."
---

# Hide Map Objects

A module that draws its own scene in the map world (a battle board, a cutscene,
a minigame) often needs the other characters of the map out of the way: the
events, and in an MMORPG the other players. `engine.hideMapObjects()` hides them
**for this client only**.

```ts
import { inject, RpgClientEngine } from "@rpgjs/client";

const engine = inject(RpgClientEngine);

// Enter the battle: hide the events and every player but the local one
const restore = engine.hideMapObjects({ events: true, players: "others" });

// Leave the battle
restore();
```

## What is hidden

Only the drawing of the objects: their sprite, name, sprite components, attached
GUIs and lighting shadow. A hidden object no longer receives the pointer.

Everything else keeps running:

- the objects stay on the map and keep being synchronized (position, state,
  collisions);
- the camera follow and the `onAction` of the events are not affected;
- the server and the other players see no change.

## Choosing the objects

Each kind takes `true` (all of them), a list of ids, or a function that tests the
object. `players` also accepts `'others'`, every player but the local one.

```ts
engine.hideMapObjects({ events: ["guard-1", "guard-2"] });
engine.hideMapObjects({ events: (event, id) => id.startsWith("npc-") });
engine.hideMapObjects({ players: true }); // the local player too
```

The function is read reactively: when it reads a signal of the object, the
object is hidden or shown again as that signal changes.

## Objects that come later, and several calls

Objects that enter the map after the call (a new event, a player who joins)
follow the same filter until it is restored.

Calls compose. An object is shown again once no remaining call hides it, so a
cutscene can hide the merchant during a battle and both can end in any order.
Calling a restore function a second time does nothing.

The filters are dropped when the client changes map.

## Drawing a marker for a hidden object

`engine.isMapObjectHidden(id)` tells whether an object is hidden. It is reactive
inside CanvasEngine computations, so a module can draw its own marker in place of
the hidden sprite:

```ts
const showMarker = computed(() => engine.isMapObjectHidden(eventId));
```

## Client and server

| | |
| --- | --- |
| Runs on | the client only |
| Synchronized | nothing: no packet is sent |
| Standalone RPG | yes |
| MMORPG | yes, each client hides objects on its own |

To change how an object looks for everyone, change it on the server instead, for
example with `player.setGraphic()`.

See [`hideMapObjects`](../api/client/rpg-client-engine.md#hidemapobjects) in the
client API reference.
