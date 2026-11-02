---
title: "Loot"
description: "Pop gold and items out of an event, a player or any point of the map, as pickups the player collects."
---

# Loot

Loot makes gold and items pop out of a point of the map. Each pickup arcs out,
bounces on the ground, then is collected: it flies to the player who comes near
it, the player walks on it, or the player presses the action key next to it.

Use it for a tree that is cut, a chest, a barrel, a defeated enemy or any
scripted reward. It is built in: there is nothing to install. The playground
game `playground/games/action-loot` shows it in action.

## Drop loot from an event

Call `dropLoot()` on an event (or a player) on the server. The pickups pop out of
its center:

```ts
import type { EventDefinition, RpgPlayer } from "@rpgjs/server";

export const Tree: EventDefinition = {
  name: "Tree",
  onAction(player: RpgPlayer) {
    this.dropLoot(
      { items: [{ itemId: "wood", amount: 2 }, { itemId: "apple", chance: 30 }] },
      { owner: player, ownership: "player" }
    );
  },
};
```

The first argument is the reward table:

- `gold`: split into coins (one coin per 5 gold, 6 coins at most);
- `items`: item ids or `{ itemId, amount, chance }`, where `chance` is a
  percentage (100 by default);
- `showNotification`: show the inventory notification when an item is collected.

To drop loot from any point, use the map:

```ts
await player.getCurrentMap()?.dropLoot({
  x: 320,
  y: 240,
  rewards: { gold: 30 },
});
```

Both return the ids of the spawned pickups.

## Collect modes

```ts
this.dropLoot(rewards, {
  pickup: "magnet", // "magnet" | "touch" | "action"
  magnet: { radius: 64, delayMs: 250 },
});
```

| `pickup` | Collected when |
| --- | --- |
| `magnet` (default) | a player comes within `magnet.radius`: the pickup flies to them |
| `touch` | a player walks on the pickup |
| `action` | a player presses the action key next to the pickup |

The magnet radius can depend on the player, for example with a magnet amulet:

```ts
magnet: { radius: (player) => (player.hasState("magnet") ? 160 : 64) }
```

## Options

| Option | Default | Description |
| --- | --- | --- |
| `ownership` | `"shared"` | `"shared"`: everyone sees the loot. `"player"`: only `owner` sees and collects it. |
| `owner` | none | Player owning the loot with `ownership: "player"`. |
| `goldPiles` | 1 per 5 gold | Number of coins the gold is split into (6 at most). |
| `splitItems` | `false` | One pickup per unit instead of one pickup with a `x3` badge. |
| `spread` | `[22, 58]` | Landing distance from the origin, in pixels. |
| `despawnMs` | `30000` | Lifetime of an uncollected pickup. `0` keeps it forever. |
| `flightMs` | `560` | Duration of the arc. |
| `height` | `42` | Peak height of the arc, in pixels. |
| `pickupSound` | none | Sound played to the collector when the item has none. |
| `item` | none | Overrides the item `loot` config for this drop. |
| `canCollect` | none | Return `false` to leave the pickup on the ground. |
| `onCollect` | none | Called on the server after a player collected a pickup. |

```ts
this.dropLoot({ items: ["ruby"] }, {
  canCollect: ({ player }) => player.items().length < 30,
  onCollect: ({ player, drop }) => console.log(player.name, "picked", drop),
});
```

## Items and their `loot` config

A pickup is linked to its item in the database:

- it shows the item `icon` (a spritesheet id); items without an icon show a gem;
- collecting it calls `player.addItem(item, amount)`, so the inventory, the menu
  and the hotbar update as usual;
- gold is not an item: it shows a spinning coin and adds to `player.gold`.

Declare how an item behaves on the ground with its `loot` field:

```ts
export const Apple = {
  id: "apple",
  name: "Apple",
  icon: "apple",
  hpValue: 30,
  _type: "item" as const,
  loot: {
    color: "#ef4444",   // glow color
    sound: "crunch",    // sound played to the collector
    use: true,          // used as soon as it is collected
  },
};

export const Ruby = {
  id: "ruby",
  name: "Ruby",
  _type: "item" as const,
  loot: { visual: "ruby", rarity: "rare" },
};
```

| Field | Description |
| --- | --- |
| `visual` | Client component drawing the pickup (see below). |
| `color` | Glow color. |
| `sound` | Sound played to the collector. |
| `rarity` | `common`, `rare` or `epic`: stronger glow, and the pickup stays twice as long. |
| `use` | Use the item when it is collected (a heart, a potion) instead of keeping it. |

The `item` option of `dropLoot()` takes precedence over the item config.

## Client presentation

The engine always animates the motion: the arc, the bounce, the idle bob, the
magnet and the flight to the collector. The `loot` client hook changes what is
drawn and heard:

```ts
import { provideClientModules } from "@rpgjs/client";
import RubyLoot from "./components/ruby-loot.ce";

export default provideClientModules([
  {
    loot: {
      components: { ruby: RubyLoot },
      sounds: { land: "loot-land", collect: "coin" },
      collectText: true,
    },
  },
]);
```

- `components`: components drawing a pickup, addressed by the item `loot.visual`.
- `sounds.land`: played when a pickup lands; `sounds.collect`: played to the
  collector when the item has no sound.
- `collectText`: shows `+5 gold` or `+2 Wood` above the collector. The texts use
  the `rpg.loot.gold` and `rpg.loot.item` translation keys.

A custom component only draws the pickup. It receives `kind`, `amount`, `icon`,
`name`, `color`, `rarity`, `state` (`flying`, `idle`, `collecting`, `expiring`)
and `progress` (0 to 1 within the state):

```html
<!-- ruby-loot.ce -->
<Container scale={scale}>
  <Graphics draw={drawRuby} />
</Container>

<script>
  import { computed } from "canvasengine";

  const { state, progress } = defineProps({
    state: { default: "idle" },
    progress: { default: 0 },
  });

  const scale = computed(() => (state() === "collecting" ? 1 - progress() * 0.6 : 1));

  function drawRuby(g) {
    g.clear();
    g.poly([0, -10, 8, -3, 5, 8, -5, 8, -8, -3]);
    g.fill({ color: 0xc9184a });
  }
</script>
```

## Action Battle enemies

With `@rpgjs/action-battle`, add `drop` to the enemy rewards. The experience is
granted on defeat, the gold and the items pop as loot owned by the attacker:

```ts
import { defineActionBattleEnemy } from "@rpgjs/action-battle/server";

export const Slime = defineActionBattleEnemy({
  graphic: "slime",
  stats: { maxHp: 60 },
  rewards: {
    exp: 5,
    gold: 18,
    items: [{ itemId: "ruby", chance: 10 }],
    drop: { ownership: "player", magnet: { radius: 72 } },
  },
});
```

`drop: true` uses the default settings. The loot waits for the end of the impact
freeze (hit-stop) before popping.

## Client, server and multiplayer

- **Server:** rolls the drops, places the pickups, checks the distance to the
  players and grants the gold and items. Pickups are dynamic events with a small
  hitbox and `through`, so they never block movement or attacks.
- **Synchronized:** each pickup is an event carrying a `componentsCenter`
  component with its kind, icon, name, color, rarity, sound and arc settings.
- **Client:** the built-in `rpg:loot` sprite component animates the pickup and
  plays the sounds and the collect text for the collector. A player who joins
  long after the drop sees the pickups already on the ground.
- **Standalone RPG and MMORPG:** both work the same. With
  `ownership: "player"`, pickups are scenario events that only their owner
  receives.
