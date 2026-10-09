---
title: "Create an event"
description: "Create your first NPC or interactive event."
---

# Create an event

An event is any interactive object on the map: an NPC, a chest, a switch, an enemy, or a trigger.

## Create a simple event

You can define an event as an object with hooks:

```ts
import { RpgPlayer, type EventDefinition } from "@rpgjs/server";

export function ChestEvent(): EventDefinition {
  return {
    onInit() {
      this.setGraphic("chest-closed");
    },
    onChanges(player: RpgPlayer) {
      const isOpened = player.getVariable("chest-1-opened");
      this.setGraphic(isOpened ? "chest-opened" : "chest-closed");
    },
    async onAction(player: RpgPlayer) {
      if (player.getVariable("chest-1-opened")) {
        await player.showText("The chest is already open.");
        return;
      }

      player.setVariable("chest-1-opened", true);
      await player.showText("You found a potion.");
    }
  };
}
```

## Attach the event to a map

Register it in your server module:

```ts
import { defineModule, type RpgServer } from "@rpgjs/server";
import { ChestEvent } from "./events/chest";

export default defineModule<RpgServer>({
  maps: [
    {
      id: "simplemap",
      events: [
        {
          id: "chest-1",
          x: 200,
          y: 120,
          event: ChestEvent()
        }
      ]
    }
  ]
});
```

`EventDefinition` only describes the event behavior. Map placement fields such as `id`, `x`, and `y` belong to the outer wrapper in `maps[].events`.
Inside object-based hooks, `this` is typed as `RpgEvent`, so methods like `this.setGraphic()` are inferred correctly by TypeScript.

Events block players without being pushed by player collisions by default. They
can still move through scripted movement such as `moveRoutes()`. Set
`pushable: true` when an event should move from physical collision response,
then use `mass` to tune how hard it is to push. A mass of `0` or `Infinity`
still makes the body immovable.

```ts
{
  id: "crate-1",
  x: 200,
  y: 120,
  event: {
    name: "Crate",
    pushable: true,
    mass: 20
  }
}
```

You can also change these values at runtime:

```ts
this.pushable = true;
this.setMass(20);
```

When using Tiled, you can omit `x` and `y` and place the event with a point object.
Set the point name to the event name, for example `chest-1`, and RPGJS will use
that point as the event position.

## Event hooks

The most common hooks are:

- `onInit()` for base event setup when the instance is created
- `onChanges(player)` for reactive updates based on player state
- `onAction(player)` when the player interacts with the event
- `onPlayerTouch(player)` when the player touches the event

Other hooks are also available for shape-based behaviors:

- `onInShape(zone, player)`
- `onOutShape(zone, player)`
- `onDetectInShape(player, shape)`
- `onDetectOutShape(player, shape)`

See the complete reference in [Event hooks for created events](/api/map/hooks).

## `onInit()` vs `onChanges(player)`

The most important distinction is `onChanges(player)`.

`onInit()` runs when the event instance is created. Use it for default data that is not tied to a specific player interaction yet: a base graphic, speed, direction, or movement route.

`onChanges(player)` runs during the change-detection cycle for that player. When player state changes, especially player variables, RPGJS re-runs this cycle and the event can react to it. You can also trigger it manually with `player.syncChanges()`.

This means that some code can legitimately appear in both hooks:

- `onInit()` gives the event a correct initial state
- `onChanges(player)` keeps that state in sync when the player data changes

For a chest, `onInit()` can set an initial graphic so the chest is immediately visible in the right state. Then `onChanges(player)` can recompute the same condition from a player variable and switch the graphic to opened or closed whenever that variable changes.

Use player variables for this kind of per-player state. They are persisted with the player and are available again after a save, a reconnect, or a map change.

## Shared or scenario

When building an MMORPG, choose the right mode:

- use shared for global world state
- use scenario for per-player progression

See [Event modes](/guide/event-modes) for the full behavior.

## Next step

Continue with [Create database](/guide/create-database).
