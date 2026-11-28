---
title: "Tactical battle"
description: "Grid-based tactical battles for RPGJS: units move on a grid drawn on the map, act in phases and fight for an objective; server-authoritative, solo and multiplayer."
---

# Tactical battle

`@rpgjs/tactical-rpg` adds grid-based tactical battles to an RPGJS game: units move on a grid, act in phases, use skills with areas, and fight for an objective. The server owns the rules; the client draws the grid on the map and the HUD over it. It works in standalone RPG mode and in MMORPG mode, solo, in co-op and in player versus player, and other players can watch.

![A tactical battle: units on the grid drawn on the map, with the tiles the selected unit can reach](/assets/combat/tactical.jpg)

Unlike the [turn-based battle](/combat/turn-based), the fight does not leave the map: the grid is drawn where the player stands and units walk on it, so position, range and areas matter. Unlike the [Action Battle System](/combat/action-battle), nothing is real time: each side plays its phase, and your server code starts the battle with `startTacticalBattle`. See [Combat modes](/combat) to compare the three.

It is **independent of the turn-based battle**: it does not import it and does not need it. Both are built on [`@rpgjs/battle-kit`](/combat/battle-kit), the foundation shared by the RPGJS battle systems, so they take the same options and hooks.

```bash
npm install @rpgjs/tactical-rpg @rpgjs/battle-kit
```

Peer dependencies: `@rpgjs/client`, `@rpgjs/common`, `@rpgjs/server`, `@rpgjs/battle-kit`, `canvasengine`, `@canvasengine/presets`.

## Plug the module

```ts
// server
import { provideTacticalServer } from "@rpgjs/tactical-rpg/server";
providers: [provideTacticalServer({ enemyDelay: 1200 }), provideServerModules([])]

// client
import { provideTacticalClient } from "@rpgjs/tactical-rpg/client";
providers: [provideTacticalClient({ keepGuis: ["chat"] }), provideClientModules([])]
```

The styles of the HUD are part of `@rpgjs/ui-css` (`rpg-ui-tactical-*` classes): a game that links the ui-css stylesheet has them, and its theme restyles the HUD too.

Without `provideTacticalServer`, `startTacticalBattle` is not available; without `provideTacticalClient`, the battle has no HUD and no grid on the client.

## Quick start

A sentinel to defeat, an encounter that places the player's hero and the sentinel on a grid, and an event that starts it.

<Steps>
  <Step title="Plug the server and client modules">
    Add `provideTacticalServer()` to the server providers and `provideTacticalClient()` to the client providers, as shown in [Plug the module](#plug-the-module).
  </Step>
  <Step title="Add a unit and an encounter to the database">
    ```ts
    // server module
    import { defineModule, type RpgServer } from "@rpgjs/server";
    import { tacticalEncounter, tacticalUnit } from "@rpgjs/tactical-rpg/server";

    export default defineModule<RpgServer>({
      database: {
        sentinel: tacticalUnit({
          name: "Sentinel",
          tactical: { role: "archer", battler: "guard", stats: { hp: 60, sp: 0, power: 12, range: 3, move: 2 } },
        }),
        "first-fight": tacticalEncounter({
          name: "First fight",
          tactical: {
            allies: [{ hero: true, x: 3, y: 5 }],
            enemies: [{ unit: "sentinel", x: 4, y: 1 }],
          },
        }),
      },
    });
    ```

    The `hero: true` placement is the player's own hero, read from the `RpgPlayer` (name, HP, SP, parameters, skills, items).
  </Step>
  <Step title="Register the battler on the client">
    A battler is a client spritesheet with `stand-<dir>` and `walk-<dir>` textures. `walkingSheet` turns a 4 × 4 walking sheet into one:

    ```ts
    // client module
    import { defineModule, type RpgClient } from "@rpgjs/client";
    import { walkingSheet } from "@rpgjs/tactical-rpg/client";

    export default defineModule<RpgClient>({ spritesheets: [walkingSheet("guard", "/sprites/guard.png")] });
    ```

    The player's hero uses the graphic of the player.
  </Step>
  <Step title="Start the battle from an event">
    ```ts
    import { type EventDefinition, type RpgPlayer } from "@rpgjs/server";
    import { startTacticalBattle } from "@rpgjs/tactical-rpg/server";

    export function SentinelEvent(): EventDefinition {
      return {
        onInit() {
          this.setGraphic("guard");
        },
        async onAction(player: RpgPlayer) {
          const result = await startTacticalBattle(player, "first-fight");
          if (result.outcome === "victory") await player.showText("The way is open.");
        },
      };
    }
    ```

    Place the event on a map (see [Create an event](/guide/create-event)) and press the action key next to it. The grid is drawn around the player, on the tiles of the map, unless the encounter or the `origin` option places it. The battle is drawn at the scale of the map: the characters keep their size, and the events and the other players of the map are hidden for the fighters while it lasts.
  </Step>
</Steps>

## Next steps

<CardGroup cols={2}>
  <Card title="Start a battle" icon="play" href="/combat/tactical/starting-battles">
    Every way to start a battle, the result, solo and multiplayer (co-op, PvP, spectators).
  </Card>
  <Card title="Battle data" icon="database" href="/combat/tactical/battle-data">
    Skills, units, items, roles, encounters and the hero of a player.
  </Card>
  <Card title="Customization" icon="sliders" href="/combat/tactical/customization">
    Server and client options, hooks, objectives, texts and controls.
  </Card>
  <Card title="Battle kit" icon="toolbox" href="/combat/battle-kit">
    The foundation shared with the turn-based battle.
  </Card>
</CardGroup>
