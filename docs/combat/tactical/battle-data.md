---
title: "Battle data"
description: "Skills, units, items, roles and encounters of the tactical battle in the RPGJS database, and the hero of a player."
---

# Battle data

Data lives in the RPGJS database. The native fields are shared with every battle system (`name`, `description`, `spCost` and `power` of a skill, `hpValue` and `spValue` of an item); the `tactical` field carries what only a tactical battle needs. Helpers add the `_type` and type the record: `tacticalSkill` and `tacticalItem` make ordinary RPGJS skills and items (players learn and carry them), `tacticalUnit`, `tacticalRole` and `tacticalEncounter` the records of the tactical battle.

```ts
import { tacticalEncounter, tacticalItem, tacticalSkill, tacticalUnit } from "@rpgjs/tactical-rpg/server";

export const database = {
  nova: tacticalSkill({ name: "Nova", spCost: 14, power: 30, tactical: { range: 3, shape: "square", visual: "fire", color: 0xff995d } }),
  kael: tacticalUnit({ name: "Kael", tactical: { role: "warrior", battler: "hero", stats: { hp: 120, sp: 20, power: 24, range: 1, move: 3 }, skills: ["nova"] } }),
  sentinel: tacticalUnit({ name: "Sentinel", tactical: { role: "archer", battler: "guard", stats: { hp: 60, sp: 0, power: 12, range: 3, move: 2 } } }),
  potion: tacticalItem({ name: "Potion", hpValue: 40 }),
  sanctuary: tacticalEncounter({
    name: "Sanctuary",
    tactical: { allies: [{ hero: true, x: 3, y: 5 }, { unit: "kael", x: 4, y: 5 }], enemies: [{ unit: "sentinel", x: 4, y: 1 }] },
  }),
};
```

The server reads the data when a battle starts: the `units`, `skills`, `items`, `roles` and `encounters` server options first, then the database (see [Customization](/combat/tactical/customization#server-options-providetacticalserver)).

## Skill

Native fields: `spCost` (SP cost) and `power` (damage or healing power). The `tactical` field:

| Field | Meaning |
|---|---|
| `range` | Reach, in cells. |
| `shape` | Area shape around the target. |
| `mask` | Area drawn as rows of text: a character other than `.`, space or `0` is a hit cell, the target is the middle. Wins over `shape`. |
| `visual`, `color` | Built-in look and accent colour (`0xrrggbb`). |
| `uses` | Uses per battle (default 1). |
| `effect`, `castEffect`, `impactEffect` | Visual Effects (see [battle kit](/combat/battle-kit)): one effect from the caster to the target, or a cast and an impact effect. They replace `visual`. |

`range`, `shape`, `visual` and `color` are required. `shape` is `single`, `cross`, `square` or `pierce`; `visual` is `slash`, `shockwave`, `arrow`, `volley`, `fire` or `frost`.

```ts
blast: tacticalSkill({
  name: "Blast",
  spCost: 10,
  power: 26,
  tactical: { range: 4, shape: "single", mask: [".x.", "xxx", ".x."], visual: "fire", color: 0xff7744, uses: 2 },
}),
```

## Unit (`tactical`)

| Field | Meaning |
|---|---|
| `role` | `warrior`, `archer`, `mage`, or the id of a `tacticalRole`. |
| `battler` | Spritesheet id with `stand-<dir>` and `walk-<dir>` textures (see `walkingSheet`). |
| `portrait`, `tint` | Portrait image id and tint. |
| `stats` | `hp`, `sp`, `power`, `range`, `move`. |
| `skills` | Skill ids. |
| `items` | Items carried: id → count. |
| `params` | Parameters under RPGJS names; the map's damage formulas are used when present. |

A battler is a client spritesheet. `walkingSheet(id, image)` (from `@rpgjs/tactical-rpg/client`) turns a 4 × 4 walking sheet into one:

```ts
import { walkingSheet } from "@rpgjs/tactical-rpg/client";

defineModule<RpgClient>({ spritesheets: [walkingSheet("guard", "/sprites/guard.png")] });
```

## Item

Native fields: `hpValue`, `spValue` restored to a unit next to the user. The `tactical` field may give an `effect`: a Visual Effect played from the user to that unit.

## Role (`tactical`)

`attack`: `melee` (charge), `ranged` (arrow) or `magic` (bolt); `glyph` (one-character badge, default ◆); `color`.

```ts
import { tacticalRole } from "@rpgjs/tactical-rpg/server";

export const database = {
  paladin: tacticalRole({ name: "Paladin", tactical: { attack: "melee", glyph: "✠", color: 0xffe29a } }),
};
```

## Encounter (`tactical`)

| Field | Meaning |
|---|---|
| `allies`, `enemies` | Placements: `unit` (or `hero: true`), `x`, `y`, `seat` (index of the commanding player, coop and PvP), `invincible` (keeps one hit point). |
| `chapter`, `intro` | Texts shown at the start. |
| `objective` | Display text only: what the HUD says the heroes have to do. Without it, the HUD shows the text of the `goal` type (`tactical.objective.<type>`). It decides nothing. |
| `board` | Grid size and position; `origin` (map pixels) defaults to around the player. |
| `rules` | What the heroes may do (everything by default). |
| `turnSeconds` | Seconds a side has to play its phase when several players are in the battle (0: no limit). |
| `goal` | The objective type that decides the battle: `type` is `eliminate` (default), `boss` (`enemy`: index of the chief among `enemies`), `survive` (`turns`), `reach` (`cell`) or a type added with `registerObjectiveType`; `limit` is the number of rounds the heroes have. The heroes always lose when none of them stands, and win when no enemy stands. **Ignored in PvP**: a duel is won when the other side is down or surrenders. |

`board` takes `columns`, `rows`, `cellSize` (a 9 × 7 grid of 64-pixel cells by default), `origin` and `blocked` (cells written `"x,y"`). `rules` takes `canAttack`, `canUseSkills`, `canUseItems`, `canGuard` and `canEscape`.

```ts
"bridge-ambush": tacticalEncounter({
  name: "Bridge ambush",
  tactical: {
    chapter: "Chapter 2",
    intro: "Bandits block the bridge.",
    objective: "Defeat the sentinel on the bridge",
    board: { columns: 9, rows: 7, blocked: ["4,3"] },
    rules: { canEscape: false },
    goal: { type: "boss", enemy: 0, limit: 12 },
    allies: [{ hero: true, x: 4, y: 6 }],
    enemies: [{ unit: "sentinel", x: 4, y: 0 }, { unit: "sentinel", x: 2, y: 1 }, { unit: "sentinel", x: 6, y: 1, invincible: true }],
  },
}),
```

## The hero of a player

A `hero: true` placement is the hero of a player of the battle (`seat`: the index of the player in its side, the first one by default). It is read from the `RpgPlayer`: its name, HP and SP, its parameters (equipment and states included, used by the damage formulas of the map), the skills it knows that have a `tactical` field, and the items of its inventory that restore HP or SP. Its role comes from the `hero` server option, else from the `tactical.role` of the class of the player (`warrior` otherwise); its battler is the graphic of the player.

When the battle ends, its HP, SP and the items it spent are written back on the player (never in PvP, never for a player who left). A seat that no player takes leaves its hero out.

```ts
import { provideTacticalServer } from "@rpgjs/tactical-rpg/server";

// The heroes of the opposing side of a duel are archers, the others mages, whatever their class.
provideTacticalServer({
  hero: (player, { side }) => ({ role: side === "enemy" ? "archer" : "mage" }),
});
```
