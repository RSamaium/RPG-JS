---
title: "Solo and multiplayer"
description: "Factions, targets, PvP, teams and MMORPG mode in Action Battle."
---

# Solo and multiplayer

Action Battle works the same in standalone (RPG) and multiplayer (MMORPG) games. Factions and target selectors decide who fights whom.

## Factions and targets

`BattleAi` can target players, other battle events, every combat entity, hostile
factions, or an explicit list of factions.

```ts
new BattleAi(this, {
  faction: "monsters",
  targets: "players"
});
```

Available target selectors:

- `players`: target all players.
- `events`: target action-battle events.
- `all`: target players and action-battle events.
- `hostile`: target entities with a different faction.
- `["guards", "bandits"]`: target only these factions.
- `(context) => boolean`: fully custom target rule.

An allied event can share the player faction and attack only monster groups:

```ts
new BattleAi(this, {
  faction: "players",
  targets: ["monsters", "bandits"]
});
```

Two enemy groups can fight each other:

```ts
new BattleAi(this, {
  faction: "guards",
  targets: ["bandits"]
});
```

You can change faction and targets at runtime:

```ts
const ai = new BattleAi(this, {
  faction: "guards",
  targets: ["bandits"]
});

ai.setFaction("bandits");
ai.setTargets("hostile");
```

Players keep the previous behavior by default: their action attack targets
action-battle events. To enable PvP or teams, set the player target selector and
faction on the server:

```ts
player.actionBattleFaction = "red-team";
player.actionBattleTargets = ["blue-team"];
```

Use `"hostile"` as the selector to target every entity of another faction. For a
free-for-all, give each player its own faction:

```ts
player.actionBattleFaction = player.id;
player.actionBattleTargets = "hostile";
```

<Warning>
**MMORPG mode**: Set the faction and targets in `onJoinMap`, not in `onConnected`. In MMORPG mode,
`changeMap()` transfers the player to the map room, which only keeps synchronized
properties (name, hp, ...). `actionBattleFaction`, `actionBattleTargets` and
`player.param[...]` values such as `ATK` set before the transfer are lost: no hit
lands, or damage is `0`. Set them again in `onJoinMap`.
</Warning>

## Server authority and client presentation

Gameplay is decided on the server in both standalone and MMORPG games; the
client only presents it.

| Server-authoritative | Client presentation |
| --- | --- |
| Damage, charge duration, cooldowns and invulnerability | Attack preview and other local input feedback |
| Guard and parry | Cast and impact FX lifecycle (does not delay server damage, cooldowns or actions) |
| Projectile collision (damage and impact happen only when it collides) | Projectile look (graphic, scale, rotation, trail, shadow, impact) |
| Hit, hurt, skill and enemy attack feedback timing (one compact visual event) | Resolving and grouping that visual event (flash, hit text, sound, animation) |
| Damage, SP consumption, targeting and hit resolution | Visual hints such as component animations |
| Hotbar | Targeting and attack-preview components |
| Enemy attack damage and action locks | Attack animation duration (`animationDefaults.durationMs`, `metadata.attackDurationMs`) |
| Combat threat (per player) and enemy AI, including `wait(ms)` timers | Locally predicted basic-attack sounds (the matching authoritative cue is suppressed for 250ms) |

See [Recommended composable DX](/combat/action-battle/customization#recommended-composable-dx)
and [Enemy attack cadence](/combat/action-battle/enemies-and-ai#enemy-attack-cadence) for details.
