---
title: "Create database"
description: "Register items, skills, states, and other game data."
---

# Create database

The database is where you register reusable game data such as items, skills, classes, states, or custom objects.

## Write the data as typed objects

Each entry of the database is a plain object with a type of `@rpgjs/server`: its data and its hooks side by side, checked by TypeScript, without a decorator or a class.

| Kind | Type | Example fields |
|---|---|---|
| Item, weapon, armor | `ItemObject` | `name`, `price`, `hpValue`, `consumable`, `_type`, `atk`, `onUse`, `onEquip` |
| Skill | `SkillObject` | `name`, `spCost`, `power`, `hitRate`, `onUse` |
| State | `StateData` | `name`, `addStates`, `removeStates` |
| Class | `ClassData` | `name`, `description`, `icon`, `skillsToLearn` |
| Actor | `ActorData` | `name`, `initialLevel`, `parameters`, `class`, `startingEquipment`, `graphic` |

```ts
// src/database/potion.ts
import type { ItemObject } from "@rpgjs/server";

export const potion: ItemObject = {
  id: "potion",
  name: "Potion",
  price: 200,
  hpValue: 100,
  consumable: true,
};
```

```ts
// src/database/fire.ts
import type { SkillObject } from "@rpgjs/server";

export const fire: SkillObject = {
  name: "Fire",
  spCost: 10,
  power: 40,
  onUse(player, target) {
    // runs on the server once the skill is used
  },
};
```

<Note>
Classes decorated with `@Item`, `@Skill`… from `@rpgjs/database` (the v4 style) are still accepted. Prefer the typed objects.
</Note>

## Register data in `provideServerModules`

The key of an entry is its ID:

```ts
import { provideServerModules } from "@rpgjs/server";
import { potion } from "./database/potion";
import { fire } from "./database/fire";

provideServerModules([
  {
    database: {
      potion,
      fire
    }
  }
]);
```

Once registered, you can use string IDs from the server:

```ts
player.addItem("potion", 1);
player.learnSkill("fire");
```

## Add data dynamically on a map

You can also register data at runtime:

```ts
map.addInDatabase("treasure-coin", {
  id: "treasure-coin",
  name: "Treasure Coin",
  price: 500
});

player.addItem("treasure-coin", 1);
```

## What belongs in the database

- items
- skills
- states
- classes
- custom server-side objects used by your game

## Recommended flow

1. Put shared game data in `database`
2. Keep map-specific or temporary content dynamic with `map.addInDatabase()`
3. Use string IDs from gameplay code when possible

## More details

See [Items System](/guide/items) for a complete example with item hooks and dynamic items.

## Next step

Continue with [Create sounds](/guide/create-sounds).

