---
title: "Combat modes"
description: "Choose how your game fights: real-time action on the map, turn-based battles, or tactical battles on a grid, in solo and in multiplayer."
---

# Combat modes

RPGJS ships three combat modes. Each one is a separate package that you install as a module, and each one works in a solo game (standalone RPG) and in an online game (MMORPG) with the same code.

<CardGroup cols={3}>
  <Card title="Action Battle System" icon="bolt" href="/combat/action-battle">
    Real-time combat on the map: enemies with an AI, combos, dashes, skills, projectiles.
  </Card>
  <Card title="Turn-based battle" icon="hourglass-half" href="/combat/turn-based">
    Classic turn-based fights in a battle scene shown above the map.
  </Card>
  <Card title="Tactical battle" icon="chess-board" href="/combat/tactical">
    Units move on a grid, act in phases and fight for an objective.
  </Card>
</CardGroup>

## Which mode?

| | Action Battle System | Turn-based battle | Tactical battle |
|---|---|---|---|
| Package | `@rpgjs/action-battle` | `@rpgjs/turn-battle` | `@rpgjs/tactical-rpg` |
| Where it plays | On the map, in real time | In a battle scene above the map | On a grid drawn on the map, with its own HUD |
| How a fight starts | No start call: an event with a `BattleAi` engages the players it targets, and players attack with the action control | Your server code calls `startTurnBattle(player, troop)` | Your server code calls `startTacticalBattle(player, encounter)` |
| Who decides the rules | The server (hits, damage, AI, cooldowns) | The server (turn order, damage, AI, rewards) | The server (movement, range, areas, AI, objectives) |
| Several players | Everyone on the map; PvP and teams with factions | Co-op, player versus player, spectators | Co-op, player versus player, spectators |
| Battle data | Standard RPGJS stats, skills, items, classes and states | The `turnBattle` field of database records | The `tactical` field of database records |

The turn-based and tactical battles read the native fields of the database (`name`, `spCost`, `power`, `hpValue`, `spValue`…) and keep what only they need in their own field, so one skill record can serve both. They do not depend on each other: install one, or both.

## Solo and multiplayer

The same rule holds in every mode: **the server owns the combat**. The client draws it, plays the animations and sends the player's inputs; the server checks them, applies the rules and synchronizes the result.

- **Solo (standalone RPG)**: the server runs inside the game, in the browser. You write the same server code as for an online game, and battles start the same way.
- **Multiplayer (MMORPG)**: the server is shared. A battle lives in the room of its map, so every fighter and spectator must be on that map. A player who disconnects leaves the battle, and the battle goes on without them.

Each mode explains what this means for it:

- [Action Battle System: factions and multiplayer](/combat/action-battle/factions-and-multiplayer)
- [Turn-based battle: start a battle](/combat/turn-based/starting-battles)
- [Tactical battle: start a battle](/combat/tactical/starting-battles)

## Build your own combat mode

The turn-based and tactical battles are built on [`@rpgjs/battle-kit`](/combat/battle-kit): the registry of running battles (busy players, spectators, disconnections), the hooks of the game modules, the reading and writing of a player, the controls of a battle screen, sound cues and presentation pieces. Start from it to write a combat mode of your own that behaves like the built-in ones.
