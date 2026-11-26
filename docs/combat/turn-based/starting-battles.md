---
title: "Start a battle"
description: "Every way to start a turn-based battle (event, touch, zone, item, script), how to use its result, and how battles work in solo and in multiplayer: co-op, player versus player, spectators."
---

# Start a battle

The server owns every battle. Every function of this page is **server only** and imported from `@rpgjs/turn-battle/server`. They work the same in standalone RPG mode (the server runs in the browser) and in MMORPG mode.

```ts
import { startTurnBattle } from "@rpgjs/turn-battle/server";

const result = await startTurnBattle(player, "goblins");                          // solo, a troop id of the database
await startTurnBattle({ players: [a, b], troop: "dragon" });                      // co-op
await startTurnBattle({ players: [a], versus: [b], spectators: [c] });            // player versus player, watched by c
```

`startTurnBattle` resolves with a `BattleResult` (`outcome`, `exp`, `gold`, `items`, `bonuses`, `turns`, and `winners` in PvP). Before it resolves, the result is written on each player: HP, SP, items spent, EXP, gold and drops (nothing between players).

| Function | Meaning |
|---|---|
| `isInTurnBattle(player)` | The player fights or watches a battle. |
| `getTurnBattle(playerOrId)` | The `TurnBattleHandle` of the battle a player fights in, or of a battle id. |
| `watchTurnBattle(spectator, target)` | Watch the battle of a fighting player (or a battle id); resolves when the spectator leaves, `false` when refused. |
| `stopTurnBattle(player)` | Take a player out of their battle, as a disconnection does. |
| `getLimit`, `setLimit`, `getLimits`, `clearLimits` | The limit gauges, kept on the player between battles (a running battle keeps its own; changes apply to the next one). |
| `heroId(player)` | The combatant id of the player's own hero (`player:<id>`), to find it in `getTurnBattle(player).state()`. |

<Warning>
`startTurnBattle` throws when a player is already in a turn-based battle (fighting or watching), when a player is not on the leader's map, or when there is neither a troop nor opponents (`versus`). Check `isInTurnBattle(player)` before starting one from a trigger that can fire twice.
</Warning>

## Where a battle starts

A battle starts wherever your server code has the `RpgPlayer`: an event, a touch, a zone, a player hook, an item, a script.

### From an event (action key)

The player walks to the event and presses the action key: `onAction` runs (see [Create an event](/guide/create-event)).

```ts
import { type EventDefinition, type RpgPlayer } from "@rpgjs/server";
import { startTurnBattle, isInTurnBattle } from "@rpgjs/turn-battle/server";

export function OgreEvent(): EventDefinition {
  return {
    onInit() {
      this.setGraphic("ogre");
    },
    async onAction(player: RpgPlayer) {
      if (isInTurnBattle(player)) return;
      await player.showText("Grrr... you shall not pass!");
      const result = await startTurnBattle(player, "ogre", { bgm: "boss-theme" });
      if (result.outcome === "victory") this.remove();
    },
  };
}
```

`this.remove()` takes the event off the map. In MMORPG mode, a `shared` event disappears for everyone; make it a `scenario` event (`mode: EventMode.Scenario`) when each player must beat their own ogre (see [Event modes](/guide/event-modes)).

### From a touch (an enemy walks into the player)

`onPlayerTouch(player)` runs when the player and the event collide, whoever moved (see [Event touch and map variables](/guide/event-touch-map-variables) for `onTouch`, which also runs for events).

```ts
import { type EventDefinition, type RpgPlayer } from "@rpgjs/server";
import { startTurnBattle, isInTurnBattle } from "@rpgjs/turn-battle/server";

export function WolfEvent(): EventDefinition {
  return {
    onInit() {
      this.setGraphic("wolf");
    },
    async onPlayerTouch(player: RpgPlayer) {
      // A touch fires again while the player stays against the event
      if (isInTurnBattle(player)) return;
      const result = await startTurnBattle(player, "wolves");
      if (result.outcome === "victory") this.remove();
    },
  };
}
```

### From a zone (random encounters)

A shape is an invisible zone on the map. A player hook `onInShape(player, shape)` runs when a player enters one (see [Create shape](/guide/create-shape) and [Server player hooks](/hooks/server-player-hooks)). Create the zone in Tiled, or from the `onLoad` map hook with `map.createShape`:

```ts
import { defineModule, type RpgServer } from "@rpgjs/server";
import { startTurnBattle, isInTurnBattle } from "@rpgjs/turn-battle/server";

export default defineModule<RpgServer>({
  map: {
    onLoad(map) {
      map.createShape({ x: 320, y: 160, width: 192, height: 128, name: "tall-grass" });
    },
  },
  player: {
    async onInShape(player, shape) {
      if (shape.name !== "tall-grass" || isInTurnBattle(player)) return;
      if (Math.random() > 0.3) return; // 30% chance on each entry
      await startTurnBattle(player, "slimes", { background: "meadow" });
    },
  },
});
```

`background` and `bgm` given here are used when the troop has none of its own.

### From a player hook

Any player hook has the player. For example, an ambush the first time a player enters a map, with `onJoinMap`:

```ts
import { defineModule, type RpgServer } from "@rpgjs/server";
import { startTurnBattle } from "@rpgjs/turn-battle/server";

export default defineModule<RpgServer>({
  player: {
    async onJoinMap(player, map) {
      if (map.id !== "dark-forest" || player.getVariable("forest-ambush")) return;
      player.setVariable("forest-ambush", true);
      await startTurnBattle(player, "bandits");
    },
  },
});
```

### From an item

The `onUse` hook of an item runs on the server when the player uses it (see [Items](/guide/items)):

```ts
import { type ItemObject } from "@rpgjs/server";
import { startTurnBattle, isInTurnBattle } from "@rpgjs/turn-battle/server";

// Registered as `database: { "monster-lure": monsterLure }`
export const monsterLure: ItemObject = {
  name: "Monster lure",
  description: "Calls the monsters around",
  consumable: true,
  onUse(player) {
    if (isInTurnBattle(player)) return;
    // Not awaited: the use of the item ends now, the battle runs on its own.
    void startTurnBattle(player, "slimes");
  },
};
```

### From a script

A script of `@rpgjs/script` plays a troop with `$player.startBattle(troopId, { kind })`, which calls the `studioBattle` hooks of the modules of the game (see [Scripts: Battles](/guide/scripts#battles)). Implement them with `startTurnBattle`:

```ts
import { defineModule, type RpgPlayer, type RpgServer } from "@rpgjs/server";
import { startTurnBattle } from "@rpgjs/turn-battle/server";

export default defineModule<RpgServer>({
  studioBattle: {
    start: (player: RpgPlayer, troop: string) => startTurnBattle(player, troop),
    startTurnBased: (player: RpgPlayer, troop: string) => startTurnBattle(player, troop),
  },
} as RpgServer);
```

```js
// a script
on("player.inShape", { where: { "shape.name": "trap" } }, () => {
  const outcome = $player.startBattle("wolves", { kind: "turn" });
  if (outcome === "defeat") { $player.hp = 1; $player.changeMap("village", { x: 120, y: 200 }); }
});
```

`studioBattle` is not declared on the `RpgServer` type, hence the `as RpgServer`.

## The result

`startTurnBattle` resolves when the battle is over, after the result screen (in a group battle, once every player has left it). The `BattleResult`:

| Field | Meaning |
|---|---|
| `outcome` | `"victory"`, `"defeat"` or `"escape"`, as the leader lives it. |
| `exp`, `gold` | EXP and gold won. |
| `items` | Drops: `{ id, name, quantity }[]`. |
| `bonuses` | Bonus rewards (`noDamage`, `staggerFinish`, `swift`), each with its `exp` and `gold`. |
| `turns` | Number of turns played. |
| `winners` | PvP: ids of the players of the winning side. |

You do **not** add the rewards yourself: before the promise resolves, the server has written on each fighting player their HP and SP, the items they spent, EXP, gold and drops. HP is written as at least 1, so a defeated player is not dead on the map: what a defeat means is up to your game.

```ts
const result = await startTurnBattle(player, "goblins");

switch (result.outcome) {
  case "victory":
    await player.showText(`Victory in ${result.turns} turns! +${result.exp} EXP, +${result.gold} gold.`);
    break;
  case "defeat":
    // Back to the inn, healed
    await player.changeMap("town", { x: 120, y: 200 });
    player.allRecovery();
    break;
  case "escape":
    await player.showText("You got away...");
    break;
}
```

The turn-based hooks `onStart` and `onEnd` (see [Customization](/combat/turn-based/customization#server-hooks)) run for every battle, whatever started it: use them for what must happen after any battle (a quest counter, a log).

## `StartTurnBattleOptions` (third argument, or the group options)

| Option | Meaning |
|---|---|
| `seed` | Seed of the random numbers, for a reproducible battle. |
| `bgm` / `victoryBgm` / `background` | Music, victory music and backdrop used when the troop has none (the troop's own value wins). |
| `party` | Replaces the configured companions for this battle (solo). |
| `heroes` | Fight with these `HeroDef` allies instead of the player's hero and companions (solo). Each needs `name`, `battler`, `stats`. |
| `heroesByPlayer` | Heroes of some players of a group battle, by player id. |
| `turnTimer` | Overrides the `turnTimer` server option for this battle. |

Group battles (`TurnBattleGroupOptions`) add `players`, `troop`, `versus`, `spectators`, `background` and `bgm`. Every player must be on the leader's map: a battle lives in the room of its map.

```ts
import { DEFAULT_HERO_STATS, startTurnBattle } from "@rpgjs/turn-battle/server";

// A story battle fought by another character than the player's hero
await startTurnBattle(player, "dragon", {
  seed: 42,
  heroes: [{ name: "Old knight", battler: "knight", stats: { ...DEFAULT_HERO_STATS, atk: 80 } }],
  turnTimer: false,
});
```

## Solo (standalone RPG)

In a solo game the server runs inside the game, in the browser, and there is only one player: call `startTurnBattle(player, troop)` from any of the places above. Nothing else changes: the same code runs in an MMORPG.

- No turn timer by default (`turnTimer` applies as soon as more than one player fights).
- The player's companions come from the `party` server option, or from the `party` / `heroes` options of one battle.
- A troop can forbid escaping (`canEscape: false`, see [Battle data](/combat/turn-based/battle-data#troop)).

## Multiplayer (MMORPG)

The server is shared, and a battle lives in the room of its map. Three rules hold for every group battle:

1. **Everyone must be on the leader's map.** `startTurnBattle` throws otherwise. Pick partners and opponents among `player.getCurrentMap()?.getPlayers()`, and keep only those for which `sameBattleMap(p, leader)` is true: the list can hold a player who is still joining or leaving the map.
2. **A player is in one battle at a time.** A player who fights or watches is busy: test `isInTurnBattle(p)` before adding them to a group.
3. **Each player commands their own hero and companions.** The others' units are shown but cannot be commanded. A 30-second turn timer runs by default as soon as more than one player fights.

<Note>
The turn-based and tactical battles keep separate registries: `isInTurnBattle` does not see a tactical battle. When both packages are installed, test `isInTacticalBattle` too.
</Note>

### Co-op: fight with the players around

The players near the leader join the battle. `map.getPlayers()` lists the players of the map (see [RpgMap](/api/map/rpg-map#getplayers)):

```ts
import { type EventDefinition, type RpgPlayer } from "@rpgjs/server";
import { sameBattleMap } from "@rpgjs/battle-kit/server";
import { startTurnBattle, isInTurnBattle } from "@rpgjs/turn-battle/server";

const RADIUS = 160; // pixels

function playersAround(leader: RpgPlayer): RpgPlayer[] {
  const map = leader.getCurrentMap();
  if (!map) return [];
  return map
    .getPlayers()
    .filter((p) => p.id !== leader.id && sameBattleMap(p, leader) && !isInTurnBattle(p))
    .filter((p) => Math.hypot(p.x() - leader.x(), p.y() - leader.y()) <= RADIUS);
}

export function DragonEvent(): EventDefinition {
  return {
    onInit() {
      this.setGraphic("dragon");
    },
    async onAction(leader: RpgPlayer) {
      if (isInTurnBattle(leader)) return;
      const allies = playersAround(leader).slice(0, 3); // a party of four at most
      const result = await startTurnBattle({ players: [leader, ...allies], troop: "dragon" });
      if (result.outcome === "victory") this.remove();
    },
  };
}
```

Every player gets the full rewards, and `onStart` / `onEnd` run for each one. The `party` and `hero` server options receive a `PartyContext` (`players`, `index`, `side`, `pvp`): use it to give fewer companions in co-op. To let each partner accept first, ask them with `showChoices` as in the challenge below.

### Player versus player: a challenge

Ask the other player before starting: `showChoices` resolves with the chosen `{ text, value }`, or `null`. Check again after the answer, since the other player may have moved, left or started another battle meanwhile.

```ts
import { defineModule, type RpgPlayer, type RpgServer } from "@rpgjs/server";
import { sameBattleMap } from "@rpgjs/battle-kit/server";
import { startTurnBattle, isInTurnBattle } from "@rpgjs/turn-battle/server";

async function challenge(challenger: RpgPlayer, rival: RpgPlayer) {
  if (isInTurnBattle(challenger) || isInTurnBattle(rival)) {
    await challenger.showText(`${rival.name} is busy.`);
    return;
  }
  const answer = await rival.showChoices(`${challenger.name} challenges you to a duel!`, [
    { text: "Accept", value: "yes" },
    { text: "Decline", value: "no" },
  ]);
  if (answer?.value !== "yes") {
    await challenger.showText(`${rival.name} declined.`);
    return;
  }
  // The answer took time: check again
  if (!sameBattleMap(challenger, rival) || isInTurnBattle(challenger) || isInTurnBattle(rival)) return;

  const result = await startTurnBattle({ players: [challenger], versus: [rival], background: "arena" });
  const won = result.winners?.includes(challenger.id);
  await challenger.showText(won ? "You won the duel!" : "You lost the duel.");
}
```

Call `challenge(player, rival)` from wherever your game lets a player pick another one: an arena NPC, a GUI action, a command of the chat. In player versus player:

- there is no troop by default; `troop` adds monsters, and `background` / `bgm` set the scene of a battle without a troop;
- a duel without a troop cannot be escaped; a side that has nobody left fighting forfeits;
- `BattleResult.winners` holds the ids of the winning side;
- HP and SP are **not** written back on the players: they keep their HP and SP from before the duel.

The texts of these dialogs are hard-coded to keep the example short: in a game, take them from the i18n service (`player.t(...)`, see [i18n](/guide/i18n)).

### Spectators

Spectators see every action live but command nothing, and leave with the back control. Give them at the start with `spectators`, or let a player join a running battle with `watchTurnBattle`:

```ts
import { type EventDefinition, type RpgPlayer } from "@rpgjs/server";
import { getTurnBattle, watchTurnBattle } from "@rpgjs/turn-battle/server";

export function ArenaWatcherEvent(): EventDefinition {
  return {
    async onAction(player: RpgPlayer) {
      const fighter = player.getCurrentMap()?.getPlayers().find((p) => getTurnBattle(p));
      if (!fighter) {
        await player.showText("No fight right now.");
        return;
      }
      const watched = await watchTurnBattle(player, fighter);
      if (!watched) await player.showText("You cannot watch this fight.");
    },
  };
}
```

`watchTurnBattle` resolves when the spectator leaves, and `false` at once when there is nothing to watch, the spectator is busy or on another map, or a `turnBattle.onSpectate` hook refused (a private fight). `getTurnBattle(battleId)` and `watchTurnBattle(spectator, battleId)` also take the `id` of a battle (`getTurnBattle(player)?.id`).

### Taking a player out

`stopTurnBattle(player)` takes a fighter or a spectator out of their battle, as a disconnection does, and resolves once their battle screen is closed:

```ts
import { stopTurnBattle, isInTurnBattle } from "@rpgjs/turn-battle/server";

if (isInTurnBattle(player)) await stopTurnBattle(player);
await player.changeMap("town");
```

## Who owns what

| | |
|---|---|
| **Server** | The whole battle: turn order, commands and their validation, damage, AI, the turn timer, rewards, and what is written on the players at the end. Hooks of `TurnBattleServerHooks` and the `turnBattle*` data run there. |
| **Client** | Only the presentation: the battle scene, battlers, effects, sounds, menus and HUD, the countdown display, the speed and sound settings. Client hooks change what is shown, never the outcome. |
| **Synchronised** | After each command the server sends every player (and spectator) the new battle state (`BattleView`) with the beats to play, through the GUI data of the battle GUI. A client sends back only the command it chose; the server checks it and answers an i18n error key when it refuses it. |

It works the same in standalone RPG mode (the server runs in the browser) and in MMORPG mode. The limit gauges are saved on the player (prop `turnBattle`, not sent to the client).

### Disconnection

When a fighter disconnects (or `stopTurnBattle` takes them out), the battle goes on without them:

- the AI takes over their units (hero and companions) until the end of the battle;
- nothing is written on the player who left: no HP, SP, items, EXP, gold or drops, and `onEnd` does not run for them;
- in player versus player, a side that has nobody left forfeits, and the other side wins.

The other players keep fighting and get their result as usual. A spectator who leaves simply stops watching.
