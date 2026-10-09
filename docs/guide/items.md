---
title: "Items System"
description: "Guide for Items System in RPGJS."
---

# Items System

The items system in RPGJS allows you to manage player inventory, equipment, and item usage. You can add items to players in three different ways: using string IDs, item classes, or item objects.

Studio regular items can also select a spritesheet animation, a personal sound,
and/or a built-in particle preset for successful use. This feedback runs from
the authoritative native `onUse` hook and can be combined with an item
workflow.

## Adding Items

### Method 1: String ID (Pre-registered Items)

Items must be registered in the `database` property of `provideServerModules` before they can be used with string IDs.

```ts
import { createServer, provideServerModules, RpgPlayer } from '@rpgjs/server'
import { Item } from '@rpgjs/database'

@Item({
  name: 'Potion',
  description: 'Restores 100 HP',
  price: 200,
  hpValue: 100,
  consumable: true
})
export class Potion {
  onAdd(player: RpgPlayer) {
    console.log('Potion added to inventory');
  }
  
  onUse(player: RpgPlayer) {
    player.hp += 100;
  }
}

export default createServer({
  providers: [
    provideServerModules([
      {
        database: {
          Potion  // Register the item in the database
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
player.addItem('Potion', 5);  // Add 5 potions
```

> **Note**: The `@RpgModule` decorator is available for backward compatibility with v4, but the modern approach is to use `provideServerModules` with the `database` property directly.

### Method 2: Item Class (Auto-registered)

When using an item class directly, it will be automatically added to the map's database if not already present.

```ts
import Potion from './database/Potion'

// The class is automatically registered in the map database
player.addItem(Potion, 3);
```

### Method 3: Item Object (Dynamic Items)

You can create items dynamically using objects. These are automatically added to the map's database.

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
    player.hp += 50;
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

## Dynamic Item Creation in Events

When creating items dynamically (especially in events), you should first add them to the map's database, then add them to the player.

### Example: Event Giving an Item

```ts
import { RpgPlayer, RpgMap } from '@rpgjs/server'

export function ChestEvent() {
  return {
    name: "CHEST-1",
    onInit() {
      this.setGraphic("chest");
    },
    async onAction(player: RpgPlayer) {
      const map = player.getCurrentMap();
      
      // Step 1: Add the item to the map database
      const itemData = {
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
  const specialItem = {
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

Items can implement lifecycle hooks that are called at specific moments:

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

### Using Classes

```ts
import { Item } from '@rpgjs/database'
import { createServer, provideServerModules, RpgPlayer } from '@rpgjs/server'

@Item({
  name: 'Magic Sword',
  price: 1000
})
export class MagicSword {
  onAdd(player: RpgPlayer) {
    player.showText('You obtained the Magic Sword!');
  }
  
  onEquip(player: RpgPlayer, equip: boolean) {
    if (equip) {
      player.showText('Magic Sword equipped!');
      // Add special effects
    } else {
      player.showText('Magic Sword unequipped!');
    }
  }
  
}

// Register in provideServerModules
export default createServer({
  providers: [
    provideServerModules([
      {
        database: {
          MagicSword
        }
      }
    ])
  ]
});
```

### Using Objects

```ts
import { createServer, provideServerModules, RpgPlayer } from '@rpgjs/server'

const magicSword = {
  id: 'magic-sword',
  name: 'Magic Sword',
  price: 1000,
  onAdd(player: RpgPlayer) {
    player.showText('You obtained the Magic Sword!');
  },
  onEquip(player: RpgPlayer, equip: boolean) {
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
          'magic-sword': magicSword  // Use string key for object items
        }
      }
    ])
  ]
});
```

## Managing Database

### Adding Items to Database

```ts
const map = player.getCurrentMap();

// Add item class
map.addInDatabase('Potion', PotionClass);

// Add item object
map.addInDatabase('custom-item', {
  name: 'Custom Item',
  price: 100
});

// Force overwrite existing item
map.addInDatabase('Potion', UpdatedPotionClass, { force: true });
```

### Removing Items from Database

```ts
const map = player.getCurrentMap();

// Remove item
const removed = map.removeInDatabase('Potion');
if (removed) {
  console.log('Item removed successfully');
}
```

## Complete Example: Shop Event

```ts
import { createServer, provideServerModules, RpgPlayer, RpgMap } from '@rpgjs/server'
import { Item } from '@rpgjs/database'

// Define shop items as classes (optional, can also be objects)
@Item({
  name: 'Shop Potion',
  description: 'A potion sold in shops',
  price: 200,
  hpValue: 100,
  consumable: true
})
export class ShopPotion {
  onUse(player: RpgPlayer) {
    player.hp += 100;
    player.showText('HP restored!');
  }
}

@Item({
  name: 'Iron Sword',
  description: 'A basic sword',
  price: 500
})
export class IronSword {
  onEquip(player: RpgPlayer, equip: boolean) {
    if (equip) {
      player.showText('Iron Sword equipped!');
    }
  }
}

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
        player.buyItem('ShopPotion', 1);
        player.showText('Thank you for your purchase!');
      } catch (err) {
        player.showText('Not enough gold!');
      }
      
      // Option 2: Create dynamic items on the fly
      const dynamicItem = {
        id: 'limited-edition-potion',
        name: 'Limited Edition Potion',
        description: 'A rare potion',
        price: 500,
        hpValue: 200,
        consumable: true,
        onUse(player) {
          player.hp += 200;
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
          ShopPotion,  // Pre-registered items
          IronSword
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
