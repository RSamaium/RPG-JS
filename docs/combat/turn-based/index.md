---
title: "Turn-based battle"
description: "A turn-based battle system for RPGJS: server-authoritative rules, battle data in the database, and a CanvasEngine battle scene above the map."
---

# Turn-based battle

`@rpgjs/turn-battle` adds turn-based fights to a game: the server owns the rules (turn order, damage, AI, rewards), the client plays a battle scene above the map. It works in standalone RPG mode and in MMORPG mode, solo, in co-op and in player versus player, and other players can watch.

![A turn-based battle: the battle scene covers the map and a skill hits two skeletons](/assets/combat/turn-based.jpg)

Unlike the [Action Battle System](/combat/action-battle), nothing happens on the map itself: your server code calls `startTurnBattle`, the battle scene covers the map for the players who fight, and the map comes back when it ends. Unlike the [tactical battle](/combat/tactical), there is no grid and no movement: heroes and enemies face each other and act in turn. See [Combat modes](/combat) to compare the three.

It is built on [`@rpgjs/battle-kit`](/combat/battle-kit), the foundation shared by the RPGJS battle systems, and does **not** depend on any other battle system: a game can install it next to [`@rpgjs/tactical-rpg`](/combat/tactical) or alone.

```bash
npm install @rpgjs/turn-battle @rpgjs/battle-kit
```

## Install

```ts
// server
import { provideServerModules } from "@rpgjs/server";
import { provideTurnBattleServer } from "@rpgjs/turn-battle/server";

providers: [provideTurnBattleServer({ /* TurnBattleServerOptions */ }), provideServerModules([])]
```

```ts
// client
import { provideClientModules } from "@rpgjs/client";
import { provideTurnBattleClient } from "@rpgjs/turn-battle/client";

providers: [provideTurnBattleClient({ /* TurnBattleClientOptions */ }), provideClientModules([])]
```

The styles of the battle HUD are part of `@rpgjs/ui-css` (`rpg-ui-turn-battle-*` classes): a game that links the ui-css stylesheet has them, and its theme restyles the battle too.

<Note>
Without `provideTurnBattleServer`, `startTurnBattle` has no rules to run; without `provideTurnBattleClient`, the player has no battle scene. Add both.
</Note>

## Quick start

A goblin troop in the database, and a goblin on the map that starts the battle when the player talks to it.

<Steps>
  <Step title="Plug the server and client providers">
    Add `provideTurnBattleServer()` to the server providers and `provideTurnBattleClient()` to the client providers, as shown in [Install](#install).
  </Step>
  <Step title="Add an enemy and a troop to the database">
    ```ts
    // server module
    import { defineModule, type RpgServer } from "@rpgjs/server";
    import { turnBattleEnemy, turnBattleTroop } from "@rpgjs/turn-battle/server";

    export default defineModule<RpgServer>({
      database: {
        goblin: turnBattleEnemy({
          name: "Goblin",
          gain: { exp: 24, gold: 10 },
          turnBattle: {
            battler: "goblin",
            stats: { maxHp: 120, maxSp: 0, atk: 30, def: 12, mag: 5, mdef: 8, agi: 14, luk: 5 },
          },
        }),
        goblins: turnBattleTroop({ turnBattle: { enemies: ["goblin", "goblin"] } }),
      },
    });
    ```

    `battler` is the id of a spritesheet registered on the client, like any other spritesheet (see [Customization](/combat/turn-based/customization#client-options-turnbattleclientoptions)). The player's hero reads its HP, SP and parameters from the `RpgPlayer`.
  </Step>
  <Step title="Start the battle from an event">
    ```ts
    import { type EventDefinition, type RpgPlayer } from "@rpgjs/server";
    import { startTurnBattle } from "@rpgjs/turn-battle/server";

    export function GoblinEvent(): EventDefinition {
      return {
        onInit() {
          this.setGraphic("goblin");
        },
        async onAction(player: RpgPlayer) {
          const result = await startTurnBattle(player, "goblins");
          if (result.outcome === "victory") await player.showText("The goblins run away!");
        },
      };
    }
    ```

    Place the event on a map (`maps: [{ id: "simplemap", events: [{ id: "goblin-1", x: 200, y: 120, event: GoblinEvent() }] }]`, see [Create an event](/guide/create-event)), walk to it and press the action key.
  </Step>
</Steps>

When the battle ends, the result is already written on the player: HP, SP, items spent, EXP, gold and drops.

## Next steps

<CardGroup cols={2}>
  <Card title="Start a battle" icon="play" href="/combat/turn-based/starting-battles">
    Every way to start a battle, the result, solo and multiplayer (co-op, PvP, spectators).
  </Card>
  <Card title="Battle data" icon="database" href="/combat/turn-based/battle-data">
    Skills, items, weapons, enemies, troops, summons and actions in the database.
  </Card>
  <Card title="Customization" icon="sliders" href="/combat/turn-based/customization">
    Server and client options, hooks, texts and controls.
  </Card>
  <Card title="Battle kit" icon="toolbox" href="/combat/battle-kit">
    The foundation shared with the tactical battle.
  </Card>
</CardGroup>
