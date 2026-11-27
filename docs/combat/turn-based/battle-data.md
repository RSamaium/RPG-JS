---
title: "Battle data"
description: "Skills, items, weapons, enemies, troops, summons and actions of the turn-based battle in the RPGJS database."
---

# Battle data

Battle data lives in the RPGJS database like any other game data. The native fields (`name`, `description`, `spCost`, `power`, `hpValue`, `spValue`, `gain`…) are shared with every battle system; the `turnBattle` field carries what only a turn-based battle needs.

```ts
import { turnBattleEnemy, turnBattleItem, turnBattleSkill, turnBattleTroop } from "@rpgjs/turn-battle/server";

defineModule<RpgServer>({
  database: {
    fire: turnBattleSkill({ name: "Fire", spCost: 18, power: 105, turnBattle: { kind: "magical", scope: "allEnemies", element: "fire" } }),
    potion: turnBattleItem({ name: "Potion", hpValue: 150, consumable: true, turnBattle: { scope: "ally" } }),
    goblin: turnBattleEnemy({ name: "Goblin", gain: { exp: 24 }, turnBattle: { battler: "goblin", stats: { /* ... */ } } }),
    goblins: turnBattleTroop({ turnBattle: { enemies: ["goblin", "goblin"] } }),
  },
});
```

Record kinds and their helpers: skills (default, `turnBattleSkill`), `item` (`turnBattleItem`), `enemy` (`turnBattleEnemy`), `troop` (`turnBattleTroop`), `weapon` (`turnBattleWeapon`), `summon` (`turnBattleSummon`) and `command` (`turnBattleAction`, an action described as data). Each helper returns the record unchanged, with its `_type`. The fields of each `turnBattle` object are typed and commented in `SkillBattleData`, `ItemBattleData`, `WeaponBattleData`, `EnemyBattleData`, `SummonBattleData` and `TroopBattleData`. A tactical battle reads the `tactical` field of the same records, so one skill can serve both.

The data is read on the server only, when a battle starts. The server options `skills`, `items`, `enemies`, `troops` and `summons` give extra data by id, used before the database, and `adapt` turns records of another source into these shapes (see [Customization](/combat/turn-based/customization#server-options-turnbattleserveroptions)).

## Skill

`turnBattleSkill(record)`. Native fields: `name`, `description`, `spCost`, `power`, `element`, `coefficient` (multipliers of the `damageSkill` formula of the map). The `turnBattle` field (`SkillBattleData`):

| Field | Meaning |
|---|---|
| `kind` | `physical` (atk / def, default), `magical` (mag / mdef) or `heal`. |
| `scope` | Who can be targeted: `enemy` (default), `allEnemies`, `ally`, `allAllies`, `self`, `deadAlly`. |
| `power` | Overrides the native `power` (100 = a regular attack). |
| `element` | `physical`, `fire`, `ice`, `thunder`, `light`, `dark`, `wind`, `earth`, `water`, or any other string. |
| `hits` | Hits per target (1 by default: the blows of the weapon are for the basic attack). |
| `stagger` | Stagger damage multiplier. |
| `weight` | Turn-order cost (attack = 1): heavier skills come back later. |
| `anim` | Battler animation (default `skill`). |
| `melee` | The actor runs to the target. |
| `fx` | Effect id: a CanvasEngine preset, a recipe of the plugin (`slash`, `stab`, `hit`, `fire`, `ice`, `thunder`, `light`, `dark`, `heal`, `burst`) or your own (client option `fx`). |
| `line` | Limit skills: line of the cut-in. |
| `video` | Limit skills: cinematic video URL played before the burst. |

## Item

`turnBattleItem(record)` (`_type: "item"`). Native fields: `name`, `description`, `hpValue`, `spValue`, `consumable`, `price`. The `turnBattle` field (`ItemBattleData`):

| Field | Meaning |
|---|---|
| `scope` | Who can be targeted. Default: `ally`. |
| `hp`, `sp` | Override the native `hpValue` / `spValue`. |
| `hpRate` | Heals a ratio (0..1) of max HP. |
| `revive` | Raises a fallen ally (use with `scope: "deadAlly"`). |
| `fx` | Effect id. |

## Weapon

`turnBattleWeapon(record)` (`_type: "weapon"`). Native fields: `name`, `description`, `atk` (added to the attack), `elements` (`{ rate, element }[]`: the first one colours its attack), `price`. The `turnBattle` field (`WeaponBattleData`):

| Field | Meaning |
|---|---|
| `type` | Picks the attack effect and number of hits (`WEAPON_STYLES`): `sword` (default), `greatsword`, `axe`, `katana`, `dualblades`, `dagger`, `spear`, `claw`, `fist`, `hammer`, `mace`, `whip`, `staff`, `rod`, `bow`, or your own. |
| `element` | Element of the attack. |
| `color` | Effect tint (CSS colour); defaults to the element colour. |
| `fx` | Effect id. |
| `hits` | Number of hits. |
| `power` | Total power of the attack (100 = regular). |
| `stagger` | Stagger multiplier. |
| `melee` | The attacker runs to the target. |

```ts
"iron-sword": turnBattleWeapon({ name: "Iron sword", atk: 6, turnBattle: { type: "sword" } }),
```

## Enemy

`turnBattleEnemy(record)` (`_type: "enemy"`) takes one of two shapes.

**With a `turnBattle` field** (`EnemyBattleData`), and the native rewards in `gain` (`exp`, `gold`, `items: { id, chance, quantity }[]`):

| Field | Meaning |
|---|---|
| `battler` | Battler id registered on the client. Required. |
| `stats` | `maxHp`, `maxSp`, `atk`, `def`, `mag`, `mdef`, `agi`, `luk` (and optionally `str`, `int`, `dex` for the RPGJS damage formulas). Required. |
| `skills` | Skill ids. |
| `weaknesses`, `resists` | Elements. |
| `stagger` | Stagger gauge size; 0 disables stagger. Default 100. |
| `weapon` | Weapon id of the database: attack style and `atk`. |
| `attack` | Attack style without a weapon (`melee`, `fx`, `element`, `color`, `hits`, `power`, `stagger`, `weapon`). |
| `ai` | AI id (server option `ai`). |
| `commands` | Custom commands the AI may use (server option `commands`). |
| `rewards` | Overrides the native `gain`. |

**Shaped like an RPGJS actor** (`TurnBattleEnemyRecord`): its parameters are read at `initialLevel`, as for a player.

| Field | Meaning |
|---|---|
| `parameters` | Parameter curves `{ start, end }`: `maxHp`, `str`, `pdef`, `agi`, `int`, and optionally `maxSp`, `sdef`, `dex`, `atk`. |
| `initialLevel`, `finalLevel` | Levels of the curves. |
| `reward` | `exp`, `gold`, `items: { itemId, amount, chance }[]` (`chance` is a percentage). |
| `battler` | Battler id. Default: the `battlers.enemy` option of the server. |
| `elementsEfficiency` | `{ element, rate }[]`: a rate above 1 is a vulnerability, below 1 a resistance. |
| `skills`, `stagger`, `weapon`, `attack`, `ai`, `commands` | As above. |

```ts
goblin: turnBattleEnemy({
  name: "Goblin",
  gain: { exp: 24, gold: 10 },
  turnBattle: { battler: "goblin", stats: { maxHp: 120, maxSp: 0, atk: 30, def: 12, mag: 5, mdef: 8, agi: 14, luk: 5 }, weaknesses: ["fire"] },
}),
```

## Troop

`turnBattleTroop(record)` (`_type: "troop"`): the enemies that fight together. The data sits in `turnBattle`, or at the root of the record (`TroopBattleData`):

| Field | Meaning |
|---|---|
| `enemies` | Enemy ids of the database, in slot order. Required. |
| `background` | Backdrop id (client option `backdrops`). |
| `bgm` | Music id played during the battle. |
| `victoryBgm` | Music id played when the heroes win, instead of the small victory jingle. |
| `canEscape` | Default: true. |

```ts
goblins: turnBattleTroop({ turnBattle: { enemies: ["goblin", "goblin"], background: "meadow" } }),
```

A troop given as an object (to `startTurnBattle`, or in the `troops` server option, `TroopDef`) can also list `TroopMember`s in `enemies`: `{ enemy, level, levelSpread, invincible, position, condition }`. `level` is a number or `"party"` (the average level of the players); `condition` is checked by the `enemyCondition` server option. It also takes `forbid` (commands the heroes cannot use; `escape` is the same as `canEscape: false`; `skill` covers the limit burst and the skills of the database played as commands, `action` the other custom commands) and `heroesPosition`.

## Summon

`turnBattleSummon(record)` (`_type: "summon"`): a creature an action calls (`act.summon(id)`). The `turnBattle` field (`SummonBattleData`):

| Field | Meaning |
|---|---|
| `battler`, `stats` | As for an enemy. Required. |
| `skills`, `weaknesses`, `resists`, `weapon`, `attack`, `commands` | As for an enemy. |
| `ai` | AI id when not controlled. |
| `turns` | Own turns before it leaves. Default 3. |
| `controlled` | Commanded by the summoner's player instead of the AI. |

## Action

`turnBattleAction(record)` (`_type: "command"`): a custom command described as data instead of code. Give it to units with `commands: ["<id>"]`.

```ts
"power-strike": turnBattleAction({ name: "Power strike", icon: "⚔", spCost: 8, melee: true, effects: [{ type: "damage", power: 180 }] }),
```

| Field | Meaning |
|---|---|
| `name`, `description`, `icon` | Menu data. |
| `scope` | Who can be targeted. Default: enemy, or self for an action that only summons. |
| `melee`, `anim`, `fx`, `element`, `color` | Look. |
| `spCost`, `weight` | Cost and turn-order cost. |
| `cooldown` | Own turns of its user during which it cannot be used again. |
| `once` | Usable once in the battle. |
| `inSkills` | Listed among the skills of the menu instead of in the menu itself. |
| `ai` | How the AI of an enemy uses it: `weight` (1 by default) and `hpBelow` (a share of its life, in percent). |
| `triggers` | The phases whose triggers the action has (your game runs them, server option `runTrigger`). |
| `castFx`, `castSound`, `impactSound`, `impactAnimation` | Cast effect and sounds. |
| `effects` | What it does, in order (below). |

The `effects` (`ActionEffect`), each with an optional `target` (`self` or `target`) when it applies:

| `type` | Fields |
|---|---|
| `damage` | `power`, `kind`, `element`, `hits`, `stagger`, `coefficient` (the parameters of the user that scale `power`, as for a skill; a skill played as a command gives its own to its damage effects that have none). A target that falls takes no more hits. |
| `heal` | `amount`, or `rate` percent of the max life, or `of: "damage"` with `rate` percent of the damage done |
| `sp` | `amount` |
| `steal` | `chance`, `successText`, `failText`, `emptyText` |
| `reveal` | Shows HP, weaknesses and resistances of the target |
| `text` | `text` |
| `summon` | `creatures`: `{ id, label, turns, controlled, enemy, level }[]` (a sub-menu asks which one when there are several) |
| `chance` | `chance` percent: the `then` effects, else the `otherwise` ones |

A command written as code (`turnBattleCommand`) goes in the `commands` server option instead (see [Customization](/combat/turn-based/customization)).

## Visual Effects

Skills (`SkillDef`) and actions carry the Visual Effects of the Studio, resolved by the server: `effect` plays from the caster to each target and the damage lands at its `hitAt`; `castEffect` plays on the caster while it casts and `impactEffect` on each target when it is hit. They replace `castFx` / `fx` and, when they have sounds, `castSound` / `impactSound`. An item (`ItemDef`) takes `effect`, the heal landing at its `hitAt`. Records of another shape reach them through the `adapt` server option, whose `lookup(id)` reads the Visual Effect a skill names. See the [battle kit](/combat/battle-kit).
