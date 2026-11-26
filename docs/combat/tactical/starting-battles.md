---
title: "Start a battle"
description: "Every way to start a tactical battle (event, touch, zone, script), how to use its result, and how battles work in solo and in multiplayer: co-op, player versus player, spectators, fleeing and surrendering."
---

# Start a battle

The server owns every battle. These functions are server only, imported from `@rpgjs/tactical-rpg/server`. They work the same in standalone RPG mode (the server runs in the browser) and in MMORPG mode (an authoritative server).

```ts
import { startTacticalBattle } from "@rpgjs/tactical-rpg/server";

const result = await startTacticalBattle(player, "sanctuary", { origin: { x: 320, y: 240 } });
```

| Function | Meaning |
|---|---|
| `startTacticalBattle(player, encounter, { origin })` | One player. `encounter` is an id or a record. Resolves with the `TacticalResult` when the battle ends. |
| `startTacticalBattle({ players, encounter, spectators, versus, origin })` | Co-op (several players on the allied side); `versus` makes it PvP against the enemy side (no AI); `spectators` watch from the start. Every player must be on the leader's map. |
| `watchTacticalBattle(spectator, target)` | Watch a running battle; resolves `false` when refused (see `onSpectate`). |
| `stopTacticalBattle(player)` | Take a player out of their battle, as a disconnection does. |
| `isInTacticalBattle(player)`, `getTacticalBattle(playerOrBattleId)` | Test, or get the running `TacticalBattleHandle`. |

<Warning>
`startTacticalBattle` throws when a player is already in a tactical battle (fighting or watching), when a player is not on the leader's map, or when the encounter (or one of its units) is unknown. Check `isInTacticalBattle(player)` before starting one from a trigger that can fire twice.
</Warning>

## `StartTacticalBattleOptions`

| Option | Meaning |
|---|---|
| `origin` | World position of the grid's top-left corner (map pixels), when the encounter's `board` gives none. Without both, the grid is centred on the leader's tile, its cells on the tiles of the map. |

The group form (`TacticalBattleGroupOptions`) adds `players`, `encounter`, `versus` and `spectators`.

## Where a battle starts

A battle starts wherever your server code has the `RpgPlayer`.

### From an event (action key)

```ts
import { type EventDefinition, type RpgPlayer } from "@rpgjs/server";
import { startTacticalBattle, isInTacticalBattle } from "@rpgjs/tactical-rpg/server";

export function GateGuardEvent(): EventDefinition {
  return {
    onInit() {
      this.setGraphic("guard");
    },
    async onAction(player: RpgPlayer) {
      if (isInTacticalBattle(player)) return;
      await player.showText("Halt! Nobody enters the sanctuary.");
      const result = await startTacticalBattle(player, "sanctuary");
      if (result.outcome === "victory") this.remove();
    },
  };
}
```

`this.remove()` takes the event off the map: for everyone with a `shared` event, for this player only with a `scenario` event (see [Event modes](/guide/event-modes)).

### From a touch

`onPlayerTouch(player)` runs when the player and the event collide:

```ts
import { type EventDefinition, type RpgPlayer } from "@rpgjs/server";
import { startTacticalBattle, isInTacticalBattle } from "@rpgjs/tactical-rpg/server";

export function PatrolEvent(): EventDefinition {
  return {
    onInit() {
      this.setGraphic("guard");
    },
    async onPlayerTouch(player: RpgPlayer) {
      if (isInTacticalBattle(player)) return;
      await startTacticalBattle(player, "patrol");
    },
  };
}
```

### From a zone

A player hook `onInShape(player, shape)` runs when a player enters a zone of the map (see [Create shape](/guide/create-shape)). A zone is a good place to fix the grid with `origin`, so the battle always happens on the same ground:

```ts
import { defineModule, type RpgServer } from "@rpgjs/server";
import { startTacticalBattle, isInTacticalBattle } from "@rpgjs/tactical-rpg/server";

export default defineModule<RpgServer>({
  map: {
    onLoad(map) {
      map.createShape({ x: 256, y: 192, width: 576, height: 448, name: "bridge" });
    },
  },
  player: {
    async onInShape(player, shape) {
      if (shape.name !== "bridge" || isInTacticalBattle(player)) return;
      if (player.getVariable("bridge-cleared")) return;
      const result = await startTacticalBattle(player, "bridge-ambush", { origin: { x: 256, y: 192 } });
      if (result.outcome === "victory") player.setVariable("bridge-cleared", true);
    },
  },
});
```

### From a script

A script of `@rpgjs/script` plays a troop with `$player.startBattle(id, { kind: "tactical" })`, which calls the `startTactical` hook of the `studioBattle` hooks (see [Scripts: Battles](/guide/scripts#battles)). Implement it with `startTacticalBattle`; a player who leaves a tactical battle (`abandon`) counts as an escape for the script:

```ts
import { defineModule, type RpgPlayer, type RpgServer } from "@rpgjs/server";
import { startTacticalBattle } from "@rpgjs/tactical-rpg/server";

export default defineModule<RpgServer>({
  studioBattle: {
    startTactical: (player: RpgPlayer, encounter: string) => startTacticalBattle(player, encounter),
  },
} as RpgServer);
```

`studioBattle` is not declared on the `RpgServer` type, hence the `as RpgServer`.

## The result

`startTacticalBattle` resolves when the battle ends, with the `TacticalResult` as the first side lives it:

| Field | Meaning |
|---|---|
| `outcome` | `"victory"`, `"defeat"`, `"escape"` (the heroes fled) or `"abandon"` (the player left before the end). |
| `rounds` | Number of rounds played. |
| `survivors` | Surviving units of the player's side. |
| `winners` | Ids of the players on the winning side (PvP, co-op). |

When the battle ends, the HP, SP and items spent by each player's hero are written back on the player (never in PvP, never for a player who left), before `tactical.onEnd` runs. HP is written as at least 1. A tactical battle gives **no EXP, gold or drops** by itself: reward the victory in your game.

```ts
const result = await startTacticalBattle(player, "sanctuary");

if (result.outcome === "victory") {
  player.exp += 120;
  player.gold += 50;
  await player.showText(`Victory in ${result.rounds} rounds, ${result.survivors} units standing.`);
} else if (result.outcome === "defeat") {
  await player.changeMap("town", { x: 120, y: 200 });
  player.allRecovery();
}
```

### Fleeing and surrendering

Against the AI (solo or co-op), the heroes leave a battle by **fleeing** (`escape`): the battle is lost, and only when the encounter's `rules.canEscape` is not `false`. In a duel there is no fleeing: a side **surrenders**, at any time, and the other side wins. A surrender outside a duel is refused (`tactical.error.forbidden`).

## Solo (standalone RPG)

In a solo game the server runs inside the game, in the browser: call `startTacticalBattle(player, encounter)` from any of the places above. The same code runs in an MMORPG.

- A battle played alone has no phase timer.
- The player commands every allied unit: the hero (`hero: true`) and the units of the encounter.
- The enemy side is played by the AI, with `enemyDelay` between two actions.

## Multiplayer (MMORPG)

A battle lives in the room of its map. For every group battle:

1. **Everyone must be connected and on the leader's map.** `startTacticalBattle` throws otherwise. Pick partners and opponents among `player.getCurrentMap()?.getPlayers()`, and keep only those for which `p.isConnected()` and `sameBattleMap(p, leader)` are true: a player who disconnects stays in that list for a few minutes (their session waits for a reconnection), and the list can hold a player who is still joining or leaving the map.
2. **A player is in one tactical battle at a time.** Test `isInTacticalBattle(p)` before adding them to a group.
3. **Each player commands the units of their seat.** The `seat` of a placement is the index of the commanding player in its side; without it, units are dealt in turn. A side has `turnSeconds` (60 by default) to play its phase.

<Note>
The tactical and turn-based battles keep separate registries: `isInTacticalBattle` does not see a turn-based battle. When both packages are installed, test `isInTurnBattle` too.
</Note>

### Co-op

Each player brings their hero: give one `hero: true` placement per seat. A seat that no player takes leaves its hero out, so the same encounter serves one to three players:

```ts
import { tacticalEncounter } from "@rpgjs/tactical-rpg/server";

export const database = {
  "crypt": tacticalEncounter({
    name: "Crypt",
    tactical: {
      allies: [
        { hero: true, seat: 0, x: 3, y: 5 },
        { hero: true, seat: 1, x: 4, y: 5 },
        { hero: true, seat: 2, x: 5, y: 5 },
      ],
      enemies: [{ unit: "sentinel", x: 4, y: 1 }, { unit: "sentinel", x: 6, y: 1 }],
      turnSeconds: 45,
    },
  }),
};
```

Start it with the players around the leader (`map.getPlayers()`, see [RpgMap](/api/map/rpg-map#getplayers)):

```ts
import { type EventDefinition, type RpgPlayer } from "@rpgjs/server";
import { sameBattleMap } from "@rpgjs/battle-kit/server";
import { startTacticalBattle, isInTacticalBattle } from "@rpgjs/tactical-rpg/server";

const RADIUS = 160; // pixels

export function CryptDoorEvent(): EventDefinition {
  return {
    async onAction(leader: RpgPlayer) {
      if (isInTacticalBattle(leader)) return;
      const partners = (leader.getCurrentMap()?.getPlayers() ?? [])
        .filter((p) => p.id !== leader.id && p.isConnected() && sameBattleMap(p, leader) && !isInTacticalBattle(p))
        .filter((p) => Math.hypot(p.x() - leader.x(), p.y() - leader.y()) <= RADIUS)
        .slice(0, 2);
      await startTacticalBattle({ players: [leader, ...partners], encounter: "crypt" });
    },
  };
}
```

### Player versus player: a challenge

In PvP, the `versus` players command the enemy side of the encounter instead of the AI: a `hero: true` placement among `enemies` is the hero of a `versus` player. The `goal` of the encounter is ignored: a duel is won when the other side is down or surrenders.

```ts
import { tacticalEncounter } from "@rpgjs/tactical-rpg/server";

export const database = {
  arena: tacticalEncounter({
    name: "Arena",
    tactical: {
      allies: [{ hero: true, x: 4, y: 6 }],
      enemies: [{ hero: true, x: 4, y: 0 }],
    },
  }),
};
```

Ask the other player first; `showChoices` resolves with the chosen `{ text, value }`, or `null`. Check again after the answer:

```ts
import { type RpgPlayer } from "@rpgjs/server";
import { sameBattleMap } from "@rpgjs/battle-kit/server";
import { startTacticalBattle, isInTacticalBattle } from "@rpgjs/tactical-rpg/server";

async function challenge(challenger: RpgPlayer, rival: RpgPlayer) {
  if (isInTacticalBattle(challenger) || isInTacticalBattle(rival)) return;
  const answer = await rival.showChoices(`${challenger.name} challenges you to a duel!`, [
    { text: "Accept", value: "yes" },
    { text: "Decline", value: "no" },
  ]);
  if (answer?.value !== "yes") return;
  if (!rival.isConnected() || !sameBattleMap(challenger, rival) || isInTacticalBattle(challenger) || isInTacticalBattle(rival)) return;

  const result = await startTacticalBattle({ players: [challenger], versus: [rival], encounter: "arena" });
  await challenger.showText(result.winners.includes(challenger.id) ? "You won the duel!" : "You lost the duel.");
}
```

Nothing is written back on the players after a duel. The texts are hard-coded to keep the example short: in a game, take them from the i18n service (see [i18n](/guide/i18n)).

### Spectators

Give spectators at the start with `spectators`, or let a player join a running battle with `watchTacticalBattle`. A spectator sees every action live but commands nothing, and leaves with the `escape` control.

```ts
import { type EventDefinition, type RpgPlayer } from "@rpgjs/server";
import { getTacticalBattle, watchTacticalBattle } from "@rpgjs/tactical-rpg/server";

export function ArenaStandsEvent(): EventDefinition {
  return {
    async onAction(player: RpgPlayer) {
      const fighter = player.getCurrentMap()?.getPlayers().find((p) => getTacticalBattle(p));
      if (!fighter || !(await watchTacticalBattle(player, fighter))) {
        await player.showText("Nothing to watch.");
      }
    },
  };
}
```

`watchTacticalBattle` resolves when the spectator leaves, and `false` when there is nothing to watch, the spectator is busy or on another map, or a `tactical.onSpectate` hook refused.

### Taking a player out

```ts
import { stopTacticalBattle, isInTacticalBattle } from "@rpgjs/tactical-rpg/server";

if (isInTacticalBattle(player)) await stopTacticalBattle(player);
```

`stopTacticalBattle` resolves once the HUD of the player is closed.

## Who owns what

| | |
|---|---|
| **Server** | The battle state, the rules, the AI, the objectives, the timer of a phase, the hooks of `TacticalServerHooks`, the heroes read from the players and the outcome written back on them. Every order of a player is checked by the server before it is played. |
| **Synchronised** | The state of the battle and each event (a move, an attack…) go to every player and spectator through the GUI of the battle; a player sends their orders, the cell a unit is about to move to (so a partner does not aim at it) and the speed they want. The data is plain serialisable JSON. |
| **Client only** | The HUD, the grid and the animations drawn on the map, the cursor, the menus, the preview of a move, the forecast, the danger zone, the sound cues, the speed and the reduced motion, and the client hooks (`TacticalClientHooks`). They change what is shown, never the outcome. |

It works the same in standalone RPG mode (the server runs in the browser) and in MMORPG mode (an authoritative server). Without `provideTacticalServer`, `startTacticalBattle` is not available; without `provideTacticalClient`, the battle has no HUD and no grid on the client.

### Disconnection

When a player leaves a battle (disconnection, or `stopTacticalBattle`), their units go to a partner of the same side, who now commands them (the others see `tactical.partnerLeft`), and the cells they held are freed. A side with no player left loses: in a duel, the other side wins by forfeit; when every player has left, the battle ends. A player who left is not written back (`abandon` outcome).
