---
title: "Item Commands"
description: "Inventory, equipment, and item usage commands for players."
---

# Item Commands

Inventory, equipment, and item usage commands for players.

## Members

- [_type](#type)
- [addItem](#additem)
- [addStates](#addstates)
- [atk](#atk)
- [buyItem](#buyitem)
- [consumable](#consumable)
- [createItemInstance](#createiteminstance)
- [description](#description)
- [elements](#elements)
- [equip](#equip)
- [getItem](#getitem)
- [hasItem](#hasitem)
- [hitRate](#hitrate)
- [hpValue](#hpvalue)
- [id](#id)
- [mpValue](#mpvalue)
- [name](#name)
- [onAdd](#onadd)
- [onEquip](#onequip)
- [onRemove](#onremove)
- [onUse](#onuse)
- [onUseFailed](#onusefailed)
- [paramsModifier](#paramsmodifier)
- [pdef](#pdef)
- [price](#price)
- [removeItem](#removeitem)
- [removeStates](#removestates)
- [resolveEquipmentsSnapshot](#resolveequipmentssnapshot)
- [resolveItemsSnapshot](#resolveitemssnapshot)
- [sdef](#sdef)
- [sellItem](#sellitem)
- [useItem](#useitem)
- [WithItemManager](#withitemmanager)

## _type

Item type (for equipment validation)

- Source: `packages/server/src/Player/ItemManager.ts`
- Kind: `property`
- Defined in: `ItemData`

### Signature

```ts
_type: 'item' | 'weapon' | 'armor'
```

## addItem

Add an item in the player's inventory

You can add items using:
- Item class (automatically registered in database if needed)
- Item object (automatically registered in database if needed)
- String ID (must be pre-registered in database)

The `onAdd()` method is called on the ItemClass or ItemObject when the item is added.

- Source: `packages/server/src/Player/ItemManager.ts`
- Kind: `method`
- Defined in: `IItemManager`

### Signature

```ts
addItem(item: ItemClass | ItemObject | string, nb?: number): Item
```

### Parameters

- `item`: `ItemClass | ItemObject | string`
- `nb?`: `number`

### Returns

The item instance added to inventory

### Examples

```ts
import Potion from 'your-database/potion'

// Add using class
player.addItem(Potion, 5)

// Add using string ID (must be registered in database)
player.addItem('Potion', 3)

// Add using object
player.addItem({
  id: 'custom-potion',
  name: 'Custom Potion',
  price: 200,
  onAdd(player) {
    console.log('Custom potion added!')
  }
}, 2)
```

## addStates

States to add when used

- Source: `packages/server/src/Player/ItemManager.ts`
- Kind: `property`
- Defined in: `ItemData`

### Signature

```ts
addStates: StateApplication[]
```

## atk

Get the player's attack (sum of items equipped)

Returns the total attack value from all equipped items on the player.

- Source: `packages/server/src/Player/ItemManager.ts`
- Kind: `property`
- Defined in: `IItemManager`

### Signature

```ts
atk: number
```

### Returns

Total attack value from equipped items

### Examples

```ts
console.log(player.atk) // 150 (sum of all equipped weapons/armors attack)
```

## buyItem

Purchases an item and reduces the amount of gold

The player's gold is reduced by `nb * item.price`. The item is then added to the inventory.
The `onAdd()` method is called on the ItemClass when the item is added.

- Source: `packages/server/src/Player/ItemManager.ts`
- Kind: `method`
- Defined in: `IItemManager`

### Signature

```ts
buyItem(item: ItemClass | ItemObject | string, nb?: number): Item
```

### Parameters

- `item`: `ItemClass | ItemObject | string`
- `nb?`: `number`

### Returns

Item instance added to inventory

### Examples

```ts
import Potion from 'your-database/potion'

try {
  player.buyItem(Potion)
} catch (err) {
  if (err.id === 'NOT_ENOUGH_GOLD') {
    console.log('Not enough gold!')
  } else if (err.id === 'NOT_PRICE') {
    console.log('Item has no price!')
  }
}
```

## consumable

Whether the item is consumable

- Source: `packages/server/src/Player/ItemManager.ts`
- Kind: `property`
- Defined in: `ItemData`

### Signature

```ts
consumable: boolean
```

## createItemInstance

Create an item instance without inventory changes or hook execution.

- Source: `packages/server/src/Player/ItemManager.ts`
- Kind: `method`

### Signature

```ts
createItemInstance(item: ItemClass | ItemObject | string, nb?: number)
```

### Parameters

- `item`: `ItemClass | ItemObject | string`
- `nb?`: `number`

## description

Item description

- Source: `packages/server/src/Player/ItemManager.ts`
- Kind: `property`
- Defined in: `ItemData`

### Signature

```ts
description: string
```

## elements

Elemental properties

- Source: `packages/server/src/Player/ItemManager.ts`
- Kind: `property`
- Defined in: `ItemData`

### Signature

```ts
elements: ElementAffinity[]
```

## equip

Equips a weapon or armor on a player

Think first to add the item in the inventory with the `addItem()` method before equipping the item,
or pass `"auto"` to add the item if it is missing and equip it.

The `onEquip()` method is called on the ItemClass when the item is equipped or unequipped.

- Source: `packages/server/src/Player/ItemManager.ts`
- Kind: `method`
- Defined in: `IItemManager`

### Signature

```ts
equip(itemId: string, equip?: boolean | 'auto'): void
```

### Parameters

- `itemId`: `string`
- `equip?`: `boolean | 'auto'`

### Examples

```ts
try {
  player.addItem('sword')
  player.equip('sword')
  // Later, unequip it
  player.equip('sword', false)
} catch (err) {
  console.log(err)
}
```

## getItem

Retrieves the information of an object: the number and the instance

The returned Item instance contains the quantity information accessible via `quantity()` method.

- Source: `packages/server/src/Player/ItemManager.ts`
- Kind: `method`
- Defined in: `IItemManager`

### Signature

```ts
getItem(itemClass: ItemClass | string): Item
```

### Parameters

- `itemClass`: `ItemClass | string`

### Returns

Item instance containing quantity and item data

### Examples

```ts
import Potion from 'your-database/potion'

player.addItem(Potion, 5)
const inventory = player.getItem(Potion)
console.log(inventory.quantity()) // 5
console.log(inventory) // <instance of Item>
```

## hasItem

Check if the player has the item in his inventory

- Source: `packages/server/src/Player/ItemManager.ts`
- Kind: `method`
- Defined in: `IItemManager`

### Signature

```ts
hasItem(itemClass: ItemClass | string): boolean
```

### Parameters

- `itemClass`: `ItemClass | string`

### Returns

`true` if player has the item, `false` otherwise

### Examples

```ts
import Potion from 'your-database/potion'

player.hasItem(Potion) // false
player.addItem(Potion, 1)
player.hasItem(Potion) // true
```

## hitRate

Chance to successfully use the item (0-1)

- Source: `packages/server/src/Player/ItemManager.ts`
- Kind: `property`
- Defined in: `ItemData`

### Signature

```ts
hitRate: number
```

## hpValue

HP value restored when used

- Source: `packages/server/src/Player/ItemManager.ts`
- Kind: `property`
- Defined in: `ItemData`

### Signature

```ts
hpValue: number
```

## id

Item identifier (required if not using class or string)

- Source: `packages/server/src/Player/ItemManager.ts`
- Kind: `property`

### Signature

```ts
id: string
```

## mpValue

MP/SP value restored when used

- Source: `packages/server/src/Player/ItemManager.ts`
- Kind: `property`
- Defined in: `ItemData`

### Signature

```ts
mpValue: number
```

## name

Item name

- Source: `packages/server/src/Player/ItemManager.ts`
- Kind: `property`
- Defined in: `ItemData`

### Signature

```ts
name: string
```

## onAdd

Called when the item is added to the player's inventory

- Source: `packages/server/src/Player/ItemManager.ts`
- Kind: `property`
- Defined in: `ItemHooks`

### Signature

```ts
onAdd: (player: RpgPlayer) => void | Promise<void>
```

### Parameters

- `` - The player receiving the item

## onEquip

Called when the item is equipped or unequipped

- Source: `packages/server/src/Player/ItemManager.ts`
- Kind: `property`
- Defined in: `ItemHooks`

### Signature

```ts
onEquip: (player: RpgPlayer, equip: boolean) => void | Promise<void>
```

### Parameters

- `` - true if equipping, false if unequipping

## onRemove

Called when the item is removed from the inventory

- Source: `packages/server/src/Player/ItemManager.ts`
- Kind: `property`
- Defined in: `ItemHooks`

### Signature

```ts
onRemove: (player: RpgPlayer) => void | Promise<void>
```

### Parameters

- `` - The player losing the item

## onUse

Called when the item is successfully used

- Source: `packages/server/src/Player/ItemManager.ts`
- Kind: `property`
- Defined in: `ItemHooks`

### Signature

```ts
onUse: (player: RpgPlayer) => void | Promise<void>
```

### Parameters

- `` - The player using the item

## onUseFailed

Called when the item usage fails (e.g., chance roll failed)

- Source: `packages/server/src/Player/ItemManager.ts`
- Kind: `property`
- Defined in: `ItemHooks`

### Signature

```ts
onUseFailed: (player: RpgPlayer) => void | Promise<void>
```

### Parameters

- `` - The player attempting to use the item

## paramsModifier

Parameter modifiers

- Source: `packages/server/src/Player/ItemManager.ts`
- Kind: `property`
- Defined in: `ItemData`

### Signature

```ts
paramsModifier: Record<string, unknown>
```

## pdef

Get the player's physical defense (sum of items equipped)

Returns the total physical defense value from all equipped items on the player.

- Source: `packages/server/src/Player/ItemManager.ts`
- Kind: `property`
- Defined in: `IItemManager`

### Signature

```ts
pdef: number
```

### Returns

Total physical defense value from equipped items

### Examples

```ts
console.log(player.pdef) // 80 (sum of all equipped armors physical defense)
```

## price

Item price

- Source: `packages/server/src/Player/ItemManager.ts`
- Kind: `property`
- Defined in: `ItemData`

### Signature

```ts
price: number
```

## removeItem

Deletes an item from inventory

Decreases the quantity by `nb`. If the quantity falls to 0 or below, the item is removed from the inventory.
The method returns `undefined` if the item is completely removed.

The `onRemove()` method is called on the ItemClass when the item is removed.

- Source: `packages/server/src/Player/ItemManager.ts`
- Kind: `method`
- Defined in: `IItemManager`

### Signature

```ts
removeItem(itemClass: ItemClass | string, nb?: number): Item | undefined
```

### Parameters

- `itemClass`: `ItemClass | string`
- `nb?`: `number`

### Returns

Item instance or `undefined` if the item was completely removed

### Examples

```ts
import Potion from 'your-database/potion'

try {
  player.removeItem(Potion, 5)
} catch (err) {
  console.log(err) // { id: 'ITEM_NOT_INVENTORY', msg: '...' }
}
```

## removeStates

States to remove when used

- Source: `packages/server/src/Player/ItemManager.ts`
- Kind: `property`
- Defined in: `ItemData`

### Signature

```ts
removeStates: StateApplication[]
```

## resolveEquipmentsSnapshot

Resolve equipment snapshot entries into Item instances without side effects.

- Source: `packages/server/src/Player/ItemManager.ts`
- Kind: `method`

### Signature

```ts
resolveEquipmentsSnapshot(snapshot: { equipments?: any[]; items?: any[] }, mapOverride?: any)
```

### Parameters

- `snapshot`: `{ equipments?: any[]; items?: any[] }`
- `mapOverride?`: `any`

## resolveItemsSnapshot

Resolve item snapshot entries into Item instances without side effects.

- Source: `packages/server/src/Player/ItemManager.ts`
- Kind: `method`

### Signature

```ts
resolveItemsSnapshot(snapshot: { items?: any[] }, mapOverride?: any)
```

### Parameters

- `snapshot`: `{ items?: any[] }`
- `mapOverride?`: `any`

## sdef

Get the player's skill defense (sum of items equipped)

Returns the total skill defense value from all equipped items on the player.

- Source: `packages/server/src/Player/ItemManager.ts`
- Kind: `property`
- Defined in: `IItemManager`

### Signature

```ts
sdef: number
```

### Returns

Total skill defense value from equipped items

### Examples

```ts
console.log(player.sdef) // 60 (sum of all equipped armors skill defense)
```

## sellItem

Sell an item and the player wins the amount of the item divided by 2

The player receives `(item.price / 2) * nbToSell` gold. The item is removed from the inventory.
The `onRemove()` method is called on the ItemClass when the item is removed.

- Source: `packages/server/src/Player/ItemManager.ts`
- Kind: `method`
- Defined in: `IItemManager`

### Signature

```ts
sellItem(itemClass: ItemClass | string, nbToSell?: number): Item
```

### Parameters

- `itemClass`: `ItemClass | string`
- `nbToSell?`: `number`

### Returns

Item instance that was sold

### Examples

```ts
import Potion from 'your-database/potion'

try {
  player.addItem(Potion)
  player.sellItem(Potion)
} catch (err) {
  console.log(err)
}
```

## useItem

Use an object. Applies effects and states. Removes the object from the inventory

When an item is used:
- Effects are applied to the player (HP/MP restoration, etc.)
- States are applied/removed as defined in the item
- The item is removed from inventory (consumed)

If the item has a `hitRate` property (0-1), there's a chance the usage might fail.
If usage fails, the item is still removed and `onUseFailed()` is called instead of `onUse()`.

The `onUse()` method is called on the ItemClass if the use was successful.
The `onUseFailed()` method is called on the ItemClass if the chance roll failed.
The `onRemove()` method is called on the ItemClass when the item is removed.

- Source: `packages/server/src/Player/ItemManager.ts`
- Kind: `method`
- Defined in: `IItemManager`

### Signature

```ts
useItem(itemClass: ItemClass | string): Item
```

### Parameters

- `itemClass`: `ItemClass | string`

### Returns

Item instance that was used

### Examples

```ts
import Potion from 'your-database/potion'

try {
  player.addItem(Potion)
  player.useItem(Potion)
} catch (err) {
  if (err.id === 'USE_CHANCE_ITEM_FAILED') {
    console.log('Item usage failed due to chance roll')
  } else {
    console.log(err)
  }
}
```

## WithItemManager

Item Manager Mixin

Provides comprehensive item management capabilities to any class. This mixin handles
inventory management, item usage, equipment, buying/selling, and item effects.
It manages the complete item system including restrictions, transactions, and equipment.

- Source: `packages/server/src/Player/ItemManager.ts`
- Kind: `function`

### Signature

```ts
WithItemManager(Base: TBase)
```

### Parameters

- `Base`: `TBase`

### Returns

Extended class with item management methods

### Examples

```ts
class MyPlayer extends WithItemManager(BasePlayer) {
  constructor() {
    super();
    // Item system is automatically initialized
  }
}

const player = new MyPlayer();
player.addItem('potion', 5);
player.useItem('potion');
```
