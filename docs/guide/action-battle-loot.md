---
title: "Action Battle Loot"
description: "Pop gold and items out of defeated enemies as pickups the player collects by walking near them."
---

# Action Battle Loot

With `@rpgjs/action-battle`, a defeated enemy can pop its gold and its items into
the world instead of adding them straight to the inventory. Each pickup arcs out
of the enemy, bounces on the ground, then flies to the player who walks near it.

The playground game `playground/games/action-loot` shows the result.

## Drop the rewards of an enemy

Add `drop: true` to the enemy rewards:

```ts
import { createActionEnemy, defineActionBattleEnemy } from "@rpgjs/action-battle/server";

export const Slime = defineActionBattleEnemy({
  graphic: "slime",
  stats: { maxHp: 60, atk: 6, pdef: 2 },
  rewards: {
    exp: 5,
    gold: 18,
    items: [
      { itemId: "potion", chance: 40 },
      { itemId: "gem", chance: 10 },
    ],
    drop: true,
  },
});

// In the event
export default {
  onInit() {
    createActionEnemy(this, Slime);
  },
};
```

When the enemy is defeated by a player:

- the experience is granted right away;
- the gold is split into coins (one coin per 5 gold, 6 coins at most);
- every item that passes its `chance` becomes one pickup.

`gold` and `items` keep their meaning: without `drop`, they still go straight to
the inventory.

## Loot settings

Pass an object instead of `true` to tune the loot:

```ts
rewards: {
  gold: 40,
  drop: {
    ownership: "attacker",
    magnetRadius: 96,
    despawnMs: 60000,
    pickupSound: "coin",
  },
}
```

| Option | Default | Description |
| --- | --- | --- |
| `ownership` | `"shared"` | `"shared"`: everyone sees the loot, the first player in range collects it. `"attacker"`: only the player who defeated the enemy sees and collects it. |
| `goldPiles` | 1 per 5 gold | Number of coins the gold is split into (6 at most). |
| `spread` | `[22, 58]` | Landing distance from the enemy, in pixels. |
| `magnetRadius` | `64` | Distance at which a pickup flies to the player and is collected. |
| `pickupDelayMs` | `250` | Extra delay after landing before a pickup can be collected. |
| `despawnMs` | `30000` | Lifetime of an uncollected pickup. `0` keeps it forever. |
| `flightMs` | `560` | Duration of the arc. |
| `height` | `42` | Peak height of the arc, in pixels. |
| `pickupSound` | none | Sound played to the collector. |

## Drop loot from a chest or a script

`dropActionBattleLoot()` spawns the same loot anywhere, for example from a chest:

```ts
import { dropActionBattleLoot } from "@rpgjs/action-battle/server";

export default {
  name: "Chest",
  async onAction(player) {
    await dropActionBattleLoot(this.getCurrentMap(), {
      x: this.x() + 16,
      y: this.y() + 16,
      rewards: { gold: 30, items: ["potion"] },
      spread: [30, 70],
      onCollect({ player, drop }) {
        console.log(player.id, "collected", drop);
      },
    });
  },
};
```

It returns the ids of the spawned pickup events. `onCollect` runs on the server
after a player collected a pickup.

## Item icons

An item pickup shows the item `icon` from the database, as a spritesheet id.
Items without an icon show a gem, and gold shows a spinning coin.

## Client, server and multiplayer

- **Server:** rolls the drops, places the pickups, checks the distance to the
  players and grants the gold and items. Pickups are dynamic events with a small
  hitbox and `through`, so they never block movement or attacks.
- **Synchronized:** each pickup is an event carrying a `componentsCenter`
  component with its kind, icon and arc settings.
- **Client:** the `action-battle-loot` sprite component animates the arc, the
  shadow, the bounce, the idle bob and the flight to the collector. A player who
  joins long after the drop sees the pickups already on the ground.
- **Standalone RPG and MMORPG:** both work the same. With
  `ownership: "attacker"`, pickups are scenario events that only their owner
  receives.
