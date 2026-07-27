---
title: "Hotbar Commands"
description: "Assign and use persistent server-authoritative skill and item slots."
---

# Hotbar Commands

Assign and use persistent server-authoritative skill and item slots.

## Members

- [Assign Hotbar Slot](#assign-hotbar-slot)
- [Clear Hotbar Slot](#clear-hotbar-slot)
- [Get Hotbar](#get-hotbar)
- [Initialize Hotbar](#initialize-hotbar)
- [Use Hotbar Slot](#use-hotbar-slot)
- [WithHotbarManager](#withhotbarmanager)

## Assign Hotbar Slot

Assign a learned skill or usable inventory item to a slot.

Assigning the same entry to another slot moves it instead of duplicating
it.

- Source: `packages/server/src/Player/HotbarManager.ts`
- Kind: `method`
- Member of: `RpgPlayer`
- Defined in: `HotbarManagerMixin`

### Signature

```ts
player.assignHotbarSlot(slot, entry)
```

### Parameters

- `slot`: `number`
- `entry`: `HotbarEntry`

### Returns

The updated hotbar state.

## Clear Hotbar Slot

Clear a hotbar slot without shifting the remaining entries.

- Source: `packages/server/src/Player/HotbarManager.ts`
- Kind: `method`
- Member of: `RpgPlayer`
- Defined in: `HotbarManagerMixin`

### Signature

```ts
player.clearHotbarSlot(slot)
```

### Parameters

- `slot`: `number`

### Returns

The updated hotbar state.

## Get Hotbar

Return a clone of the player's hotbar.

- Source: `packages/server/src/Player/HotbarManager.ts`
- Kind: `method`
- Member of: `RpgPlayer`
- Defined in: `HotbarManagerMixin`

### Signature

```ts
player.getHotbar()
```

### Returns

The persistent ten-slot hotbar state.

## Initialize Hotbar

Seed an uninitialized hotbar. Calling it again preserves player choices.

- Source: `packages/server/src/Player/HotbarManager.ts`
- Kind: `method`
- Member of: `RpgPlayer`
- Defined in: `HotbarManagerMixin`

### Signature

```ts
player.initializeHotbar(entries)
```

### Parameters

- `entries?`: `HotbarEntry[]`

### Returns

The initialized hotbar state.

### Examples

```ts
player.initializeHotbar([
  { type: "skill", id: "fireball" },
  { type: "item", id: "potion" },
]);
```

## Use Hotbar Slot

Use the entry assigned to a slot with standard RPGJS item/skill rules.

Battle modules may resolve the entry with `getHotbar()` and provide their
own targeting before invoking their authoritative action.

- Source: `packages/server/src/Player/HotbarManager.ts`
- Kind: `method`
- Member of: `RpgPlayer`
- Defined in: `HotbarManagerMixin`

### Signature

```ts
player.useHotbarSlot(slot, target)
```

### Parameters

- `slot`: `number`
- `target?`: `RpgPlayer | RpgPlayer[]`

### Returns

The used skill/item data, or `null` for an empty slot.

## WithHotbarManager

Adds a server-authoritative, persistent skill and item hotbar to a player.

The hotbar content is synchronized through the player's `hotbar` signal. The
physical keyboard and gamepad bindings remain client configuration.

- Source: `packages/server/src/Player/HotbarManager.ts`
- Kind: `function`

### Signature

```ts
WithHotbarManager(Base: TBase): new (...args: ConstructorParameters<TBase>) => InstanceType<TBase> & IHotbarManager
```

### Parameters

- `Base`: `TBase`
