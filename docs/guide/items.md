---
title: "Items System"
description: "Guide for Items System in RPGJS."
---

# Items System

The items system in RPGJS allows you to manage player inventory, equipment, and item usage. An item is a plain object typed with `ItemObject`: its data (name, price, effects) and its hooks (`onUse`, `onEquip`…) side by side, with autocompletion and type checking, and no decorator or class to write.

Studio regular items can also select a spritesheet animation, a personal sound,
and/or a built-in particle preset for successful use. This feedback runs from
the authoritative native `onUse` hook and can be combined with an item
workflow.

## Define an item

Write the item as an `ItemObject` in a file of your database:

```ts
// src/database/potion.ts
import type { ItemObject } from '@rpgjs/server'

export const potion: ItemObject = {
  id: 'potion',      // same ID as its key in the database
  name: 'Potion',
  description: 'Restores 100 HP',
  price: 200,
  hpValue: 100,      // restored before `onUse` runs
  consumable: true,
  onAdd(player) {
    console.log('Potion added to inventory')
  },
  onUse(player) {
    // `hpValue` is already applied: only add what is specific to the item
    player.showText('You feel better!')
  }
}
```

The parameters of the hooks are typed (`player` is an `RpgPlayer`), and a misspelled field is a compile error. The fields an item understands are those of `ItemData`: `name`, `description`, `price`, `hpValue`, `mpValue` (SP), `hitRate`, `consumable`, `addStates`, `removeStates`, `elements`, `paramsModifier`, `atk`, `pdef`, `sdef` and `_type`.

## Adding Items

### Method 1: String ID (Pre-registered Items)

Items must be registered in the `database` property of `provideServerModules` before they can be used with string IDs. The key of an entry is the ID of the item.

```ts
import { createServer, provideServerModules } from '@rpgjs/server'
import { potion } from './database/potion'

export default createServer({
  providers: [
    provideServerModules([
      {
        database: {
          potion  // Registered with the ID "potion"
        },
        player: {
          // ... your player hooks
        }
      }
    ])
  ]
});
```

Then you can use it:

```ts
// In your server hooks or events
player.addItem('potion', 5);  // Add 5 potions
```

> **Note**: The `@RpgModule` decorator is available for backward compatibility with v4, but the modern approach is to use `provideServerModules` with the `database` property directly.

### Method 2: Item Object (Auto-registered)

When you give the object itself, it is automatically added to the map's database if not already present, under its `id`. Give it the same `id` as its key in `database`, so the object and the string ID name the same item (without an `id`, an ID is generated and it becomes another item).

```ts
import { potion } from './database/potion'

// The object is automatically registered in the map database
player.addItem(potion, 3);
```

### Method 3: Inline Item Object (Dynamic Items)

You can create items on the fly. These are automatically added to the map's database.

```ts
// Create a dynamic item
player.addItem({
  id: 'custom-potion',
  name: 'Custom Potion',
  description: 'A special potion',
  price: 150,
  hpValue: 50,
  consumable: true,
  onAdd(player) {
    console.log('Custom potion added!');
  },
  onUse(player) {
    player.showText('You feel better!');
  }
}, 2);
```

If you don't provide an `id`, one will be auto-generated:

```ts
// Auto-generated ID
player.addItem({
  name: 'Dynamic Item',
  price: 100,
  onUse(player) {
    console.log('Dynamic item used!');
  }
});
```

<Note>
Classes decorated with `@Item` from `@rpgjs/database` (the v4 style) are still accepted wherever an item is expected (`database`, `addItem`, `addInDatabase`). Prefer `ItemObject`: same fields and hooks, without a decorator.
</Note>

## Dynamic Item Creation in Events

When creating items dynamically (especially in events), you should first add them to the map's database, then add them to the player.

### Example: Event Giving an Item

```ts
import { RpgPlayer, type ItemObject } from '@rpgjs/server'

export function ChestEvent() {
  return {
    name: "CHEST-1",
    onInit() {
      this.setGraphic("chest");
    },
    async onAction(player: RpgPlayer) {
      const map = player.getCurrentMap();
      
      // Step 1: Add the item to the map database
      const itemData: ItemObject = {
        id: 'treasure-coin',
        name: 'Treasure Coin',
        description: 'A rare coin found in a chest',
        price: 500,
        onAdd(player) {
          player.showText('You found a rare coin!');
        },
        onUse(player) {
          player.gold += 500;
          player.showText('You sold the coin for 500 gold!');
        }
      };
      
      // Add to database first
      map.addInDatabase('treasure-coin', itemData);
      
      // Step 2: Add the item to the player
      player.addItem('treasure-coin', 1);
      
      // Or add directly with the object (it will auto-register)
      // player.addItem(itemData, 1);
    }
  };
}
```

### Using String ID After Dynamic Registration

If you want to use a string ID after dynamically adding an item:

```ts
// In an event
async onAction(player: RpgPlayer) {
  const map = player.getCurrentMap();
  
  // Create and register the item
  const specialItem: ItemObject = {
    id: 'quest-item-1',
    name: 'Ancient Artifact',
    description: 'A mysterious artifact',
    price: 0,  // Cannot be sold
    consumable: false
  };
  
  // Register in database
  map.addInDatabase('quest-item-1', specialItem);
  
  // Now you can use string ID
  player.addItem('quest-item-1', 1);
  
  // Later, you can also use the string ID
  if (player.hasItem('quest-item-1')) {
    console.log('Player has the quest item!');
  }
}
```

## Item Hooks

Items can implement lifecycle hooks that are called at specific moments (they are typed by `ItemHooks`):

- **`onAdd(player)`**: Called when the item is added to inventory
- **`onUse(player)`**: Called when the item is successfully used
- **`onUseFailed(player)`**: Called when item usage fails (e.g., chance roll)
- **`onRemove(player)`**: Called when the item is removed from inventory
- **`onEquip(player, equip)`**: Called when the item is equipped/unequipped

Use `onUse` and `onUseFailed` for consumable items. Weapons and armors use
`onEquip` instead and should not declare consumable-use hooks.

When an item is used by string ID, RPGJS resolves object-based lifecycle hooks
from the current map database. Updating that database entry therefore replaces
the hook used by an item that is already present in the player's inventory.
Class-based items keep using their instantiated class hooks.

## Weapons and Armors

A weapon or an armor is an item with `_type: 'weapon'` or `_type: 'armor'`. While it is equipped, its `atk`, `pdef` and `sdef` are added to `player.atk`, `player.pdef` and `player.sdef`.

```ts
import { createServer, provideServerModules, type ItemObject } from '@rpgjs/server'

export const magicSword: ItemObject = {
  name: 'Magic Sword',
  price: 1000,
  _type: 'weapon',
  atk: 30,
  onAdd(player) {
    player.showText('You obtained the Magic Sword!');
  },
  onEquip(player, equip) {
    if (equip) {
      player.showText('Magic Sword equipped!');
    } else {
      player.showText('Magic Sword unequipped!');
    }
  }
};

// Register in provideServerModules
export default createServer({
  providers: [
    provideServerModules([
      {
        database: {
          'magic-sword': magicSword  // The key is the ID: "magic-sword"
        }
      }
    ])
  ]
});
```

Then `player.addItem('magic-sword')` and `player.equip('magic-sword')`.

## Managing Database

### Adding Items to Database

```ts
const map = player.getCurrentMap();

// Add an item object
map.addInDatabase('potion', potion);

// Add an item defined inline
map.addInDatabase('custom-item', {
  name: 'Custom Item',
  price: 100
});

// Force overwrite existing item
map.addInDatabase('potion', { ...potion, hpValue: 150 }, { force: true });
```

### Removing Items from Database

```ts
const map = player.getCurrentMap();

// Remove item
const removed = map.removeInDatabase('potion');
if (removed) {
  console.log('Item removed successfully');
}
```

## Complete Example: Shop Event

```ts
import { createServer, provideServerModules, RpgPlayer, type ItemObject } from '@rpgjs/server'

// Shop items, as typed objects
export const shopPotion: ItemObject = {
  name: 'Shop Potion',
  description: 'A potion sold in shops',
  price: 200,
  hpValue: 100,   // restored before `onUse` runs
  consumable: true,
  onUse(player) {
    player.showText('HP restored!');
  }
};

export const ironSword: ItemObject = {
  name: 'Iron Sword',
  description: 'A basic sword',
  price: 500,
  _type: 'weapon',
  atk: 10,
  onEquip(player, equip) {
    if (equip) {
      player.showText('Iron Sword equipped!');
    }
  }
};

export function ShopEvent() {
  return {
    name: "SHOP-1",
    onInit() {
      this.setGraphic("shopkeeper");
    },
    async onAction(player: RpgPlayer) {
      const map = player.getCurrentMap();
      
      // Option 1: Use pre-registered items from database
      await player.showText('Welcome to my shop!');
      try {
        player.buyItem('shop-potion', 1);
        player.showText('Thank you for your purchase!');
      } catch (err) {
        player.showText('Not enough gold!');
      }
      
      // Option 2: Create dynamic items on the fly
      const dynamicItem: ItemObject = {
        id: 'limited-edition-potion',
        name: 'Limited Edition Potion',
        description: 'A rare potion',
        price: 500,
        hpValue: 200,
        consumable: true,
        onUse(player) {
          player.showText('Super HP restored!');
        }
      };
      
      // Register in database first
      map.addInDatabase('limited-edition-potion', dynamicItem);
      
      // Then add to player
      player.addItem('limited-edition-potion', 1);
    }
  };
}

export default createServer({
  providers: [
    provideServerModules([
      {
        database: {
          'shop-potion': shopPotion,  // Pre-registered items
          'iron-sword': ironSword
        },
        player: {
          // ... your player hooks
        },
        maps: [
          {
            id: "town",
            events: [{ event: ShopEvent() }]
          }
        ]
      }
    ])
  ]
});
```
