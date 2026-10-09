---
title: "Create hero in map"
description: "Spawn the player in a map and assign the first hero graphic."
---

# Create hero in map

Once your first map exists, the next step is to put the player inside it and assign a spritesheet.

## Spawn the player on connection

In your player hooks:

```ts
import { RpgPlayer, type RpgPlayerHooks } from "@rpgjs/server";

export const player: RpgPlayerHooks = {
  onConnected(player: RpgPlayer) {
    player.initializeDefaultStats();
    player.changeMap("simplemap");
    player.name = "YourName";
    player.setGraphic("hero");
  }
};
```

This does three things:

1. Sends the player to `simplemap`
2. Places the player at the Tiled point named `start`, if it exists
3. Uses the `hero` spritesheet on the client

It also initializes the built-in default stats so HP, SP, and parameters such as
`maxHp` are available immediately on the client.

To use the automatic start position, create an object layer in Tiled, add a point,
and set its name to `start`. You can also target any named point explicitly:

```ts
player.changeMap("simplemap", "entrance");
```

If you prefer coordinates, pass them directly:

```ts
player.changeMap("simplemap", {
  x: 100,
  y: 100
});
```

## Avoid spawning inside an obstacle

A start point can end up under an obstacle, for example when a map is generated
or when an event stands on it. `map.findSpawnPosition()` returns the closest
position where the player hitbox overlaps no wall, tile collision, static shape
or blocking event, or `null` when nothing is free nearby. It never disables
collisions.

Resolve the position once the player has joined the map, on the server:

```ts
import { RpgPlayer, type RpgPlayerHooks } from "@rpgjs/server";

export const player: RpgPlayerHooks = {
  async onJoinMap(player: RpgPlayer, map) {
    const hitbox = player.hitbox();
    const spawn = map.findSpawnPosition({
      preferred: { x: player.x(), y: player.y() },
      hitbox: { width: hitbox.w, height: hitbox.h },
      z: player.z(),
      ignoreIds: [player.id],
      maxDistance: 256,
    });
    if (spawn) {
      await player.teleport(spawn);
    }
  }
};
```

The search is deterministic: tested positions grow in rings around `preferred`
(every `step` pixels, half the hitbox by default), and the closest free
position wins. By default a position is only accepted when the player can also
move to one neighboring position. Pass `requireClearance: false` to accept any
free position. The method exists on the client map as well, but only the server
result is authoritative. It works in standalone RPG and MMORPG modes.

## Initialize default stats only when needed

Use `player.initializeDefaultStats()` if you want RPGJS to define the default
parameter curves (`maxHp`, `maxSp`, `str`, `int`, `dex`, `agi`) and initialize
HP/SP from those values.

This is useful if:

- you define the starting stats directly in your game
- you rely on RPGJS built-in default values
- you want HP/SP and parameter displays to be ready on the client as soon as the game starts

Do not call `player.initializeDefaultStats()` after loading player data from:

- your own database
- a save slot
- a snapshot

In those cases, restore your saved data instead, otherwise you may overwrite the
existing values.

If you only need the built-in parameter curves without restoring HP/SP, use
`player.applyDefaultParameters()`.

## Use `onStart()` when the game begins after a GUI

If your game starts after a title screen or another GUI interaction, initialize the
default stats in `onStart()` instead of `onConnected()`.

`onStart()` is executed after a GUI interaction returns `data.id === 'start'`.

```ts
import { RpgPlayer, type RpgPlayerHooks } from "@rpgjs/server";

export const player: RpgPlayerHooks = {
  async onConnected(player: RpgPlayer) {
    await player.gui("rpg-title-screen").open();
  },

  onStart(player: RpgPlayer) {
    player.initializeDefaultStats();
    player.changeMap("simplemap");
    player.name = "YourName";
    player.setGraphic("hero");
  }
};
```

## Make sure the `hero` graphic exists

The `hero` identifier must exist in your client configuration:

```ts
import { provideClientModules, Presets } from "@rpgjs/client";

provideClientModules([
  {
    spritesheets: [
      {
        id: "hero",
        image: "spritesheets/hero.png",
        ...Presets.RMSpritesheet(3, 4)
      }
    ]
  }
]);
```

## Open the main menu on input

You can also add simple input behavior directly in the same hook:

```ts
onInput(player, { action }) {
  if (action == "escape") {
    player.callMainMenu();
  }
}
```

## Next step

Continue with [Create spritesheet](/guide/create-spritesheet).
