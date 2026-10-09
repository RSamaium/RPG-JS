---
title: "Hotbar Commands"
description: "Assign and use persistent server-authoritative skill and item slots."
---

# Hotbar Commands

Assign and use persistent server-authoritative skill and item slots.

## Members

- [action](#action)
- [allowedEntryTypes](#allowedentrytypes)
- [Assign Hotbar Slot](#assign-hotbar-slot)
- [capacity](#capacity)
- [Clear Hotbar Slot](#clear-hotbar-slot)
- [Configure Hotbar](#configure-hotbar)
- [entry](#entry)
- [Get Hotbar](#get-hotbar)
- [Get Hotbar Capacity](#get-hotbar-capacity)
- [Get Hotbar Locked Slot Hint](#get-hotbar-locked-slot-hint)
- [getHotbarEntryType](#gethotbarentrytype)
- [Initialize Hotbar](#initialize-hotbar)
- [Is Hotbar Entry Type Allowed](#is-hotbar-entry-type-allowed)
- [lockedSlotHint](#lockedslothint)
- [Refresh Hotbar](#refresh-hotbar)
- [registerHotbarEntryType](#registerhotbarentrytype)
- [resolve](#resolve)
- [resolveHotbarEntryPresentation](#resolvehotbarentrypresentation)
- [Select Hotbar Slot](#select-hotbar-slot)
- [slot](#slot)
- [slot](#slot)
- [state](#state)
- [target](#target)
- [type](#type)
- [use](#use)
- [Use Active Hotbar Slot](#use-active-hotbar-slot)
- [Use Hotbar Slot](#use-hotbar-slot)
- [validate](#validate)

## action

Mutation or refresh that produced the snapshot.

- Source: `packages/server/src/Player/HotbarManager.ts`
- Kind: `property`
- Defined in: `HotbarChangePayload`

### Signature

```ts
action: "initialize" | "assign" | "clear" | "select" | "refresh"
```

## allowedEntryTypes

Entry types available in this hotbar.

Omit this option to allow every registered entry type.

- Source: `packages/server/src/Player/HotbarManager.ts`
- Kind: `property`
- Defined in: `HotbarConfiguration`

### Signature

```ts
allowedEntryTypes: HotbarAllowedEntryTypesResolver
```

## Assign Hotbar Slot

Assign an available slot, moving any duplicate entry.

- Source: `packages/server/src/Player/HotbarManager.ts`
- Kind: `method`
- Member of: `RpgPlayer`
- Defined in: `HotbarManagerMixin`

### Signature

```ts
player.assignHotbarSlot(slot,entry)
```

### Parameters

- `slot`: `number`
- `entry`: `HotbarEntry`

### Returns

The updated detached state.

## capacity

Number of currently accessible slots or a dynamic player resolver.

- Source: `packages/server/src/Player/HotbarManager.ts`
- Kind: `property`
- Defined in: `HotbarConfiguration`

### Signature

```ts
capacity: HotbarCapacityResolver
```

## Clear Hotbar Slot

Clear a slot while preserving all other assignments.

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

The updated detached state.

## Configure Hotbar

Configure dynamic capacity, allowed entry types, and locked-slot
messaging for this player.

The resolver is evaluated on refresh and gameplay changes. Reducing
capacity keeps assignments in locked slots so they return if capacity
grows again.

- Source: `packages/server/src/Player/HotbarManager.ts`
- Kind: `method`
- Member of: `RpgPlayer`
- Defined in: `HotbarManagerMixin`

### Signature

```ts
player.configureHotbar(options)
```

### Parameters

- `options?`: `HotbarConfiguration`

### Returns

The refreshed detached hotbar state.

### Examples

```ts
player.configureHotbar({
  capacity: current => Math.min(10, current.level + 2),
  allowedEntryTypes: ["skill", "item"],
  lockedSlotHint: (_current, slot) => `Unlocks at level ${slot + 1}`,
});
```

## entry

Assigned or selected entry when available.

- Source: `packages/server/src/Player/HotbarManager.ts`
- Kind: `property`
- Defined in: `HotbarChangePayload`

### Signature

```ts
entry: HotbarEntry
```

## Get Hotbar

Return a detached snapshot of the player's persistent hotbar.

- Source: `packages/server/src/Player/HotbarManager.ts`
- Kind: `method`
- Member of: `RpgPlayer`
- Defined in: `HotbarManagerMixin`

### Signature

```ts
player.getHotbar()
```

### Returns

The current detached ten-slot state.

## Get Hotbar Capacity

Return the number of slots currently available to the player.

- Source: `packages/server/src/Player/HotbarManager.ts`
- Kind: `method`
- Member of: `RpgPlayer`
- Defined in: `HotbarManagerMixin`

### Signature

```ts
player.getHotbarCapacity()
```

### Returns

An integer between 1 and 10.

## Get Hotbar Locked Slot Hint

Return the optional unlock hint for a slot.

- Source: `packages/server/src/Player/HotbarManager.ts`
- Kind: `method`
- Member of: `RpgPlayer`
- Defined in: `HotbarManagerMixin`

### Signature

```ts
player.getHotbarLockedSlotHint(slot)
```

### Parameters

- `slot`: `number`

### Returns

The resolved hint, or `undefined`.

## getHotbarEntryType

Return the registered definition for an entry type.

- Source: `packages/server/src/Player/HotbarManager.ts`
- Kind: `function`

### Signature

```ts
getHotbarEntryType(type: string): HotbarEntryTypeDefinition | undefined
```

### Parameters

- `type`: `string`

### Returns

The definition, or `undefined` when the type is unknown.

## Initialize Hotbar

Seed the hotbar once from explicit entries or the player loadout.

Learned skills are placed before usable consumable items when `entries`
is omitted. Invalid explicit entries are ignored. Calling this method
after initialization preserves the player's assignments.

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

The initialized state, or the existing state when already seeded.

### Examples

```ts
player.initializeHotbar([
  { type: "item", id: "berry-snack" },
  { type: "skill", id: "water-crops" },
]);
```

## Is Hotbar Entry Type Allowed

Return whether an entry type is enabled by the current configuration.

A missing `allowedEntryTypes` option allows every registered or
plugin-provided type.

- Source: `packages/server/src/Player/HotbarManager.ts`
- Kind: `method`
- Member of: `RpgPlayer`
- Defined in: `HotbarManagerMixin`

### Signature

```ts
player.isHotbarEntryTypeAllowed(type)
```

### Parameters

- `type`: `string`

### Returns

`true` when entries of this type may be displayed and used.

## lockedSlotHint

Player-visible unlock hint or a per-slot resolver.

- Source: `packages/server/src/Player/HotbarManager.ts`
- Kind: `property`
- Defined in: `HotbarConfiguration`

### Signature

```ts
lockedSlotHint: HotbarLockedSlotHintResolver
```

## Refresh Hotbar

Re-evaluate dynamic configuration and refresh an open hotbar GUI.

- Source: `packages/server/src/Player/HotbarManager.ts`
- Kind: `method`
- Member of: `RpgPlayer`
- Defined in: `HotbarManagerMixin`

### Signature

```ts
player.refreshHotbar()
```

### Returns

The refreshed detached hotbar state.

## registerHotbarEntryType

Register a server-side hotbar entry type.

The definition owns validation, client presentation, and authoritative use.
The returned function restores the previous definition.

- Source: `packages/server/src/Player/HotbarManager.ts`
- Kind: `function`

### Signature

```ts
registerHotbarEntryType(definition: HotbarEntryTypeDefinition): () => void
```

### Parameters

- `definition`: `HotbarEntryTypeDefinition`

### Returns

A cleanup function that restores the previous definition.

### Examples

```ts
const unregister = registerHotbarEntryType({
  type: "emote",
  validate(_player, id) {
    if (id !== "wave") throw new Error("Unknown emote");
  },
  resolve(_player, id) {
    return {
      id,
      type: "emote",
      name: "Wave",
      usable: true,
      activation: { mode: "instant" },
    };
  },
  use(player) {
    player.showAnimation("wave");
  },
});
```

## resolve

Build the serializable presentation sent to the current player.

- Source: `packages/server/src/Player/HotbarManager.ts`
- Kind: `method`
- Defined in: `HotbarEntryTypeDefinition`

### Signature

```ts
resolve(player: RpgPlayer, id: string): HotbarEntryPresentation
```

### Parameters

- `player`: `RpgPlayer`
- `id`: `string`

## resolveHotbarEntryPresentation

Resolve the serializable client presentation for a hotbar entry.

Unavailable or unknown entries return a disabled fallback instead of
exposing an authoritative validation error to the client.

- Source: `packages/server/src/Player/HotbarManager.ts`
- Kind: `function`

### Signature

```ts
resolveHotbarEntryPresentation(player: RpgPlayer, entry: HotbarEntry): HotbarEntryPresentation
```

### Parameters

- `player`: `RpgPlayer`
- `entry`: `HotbarEntry`

### Returns

Serializable presentation for the generic hotbar GUI.

## Select Hotbar Slot

Persist the player's active available slot.

- Source: `packages/server/src/Player/HotbarManager.ts`
- Kind: `method`
- Member of: `RpgPlayer`
- Defined in: `HotbarManagerMixin`

### Signature

```ts
player.selectHotbarSlot(slot)
```

### Parameters

- `slot`: `number`

### Returns

The updated detached state.

## slot

Zero-based slot used by the player.

- Source: `packages/server/src/Player/HotbarManager.ts`
- Kind: `property`
- Defined in: `HotbarUseContext`

### Signature

```ts
slot: number
```

## slot

Affected zero-based slot when the action targets one slot.

- Source: `packages/server/src/Player/HotbarManager.ts`
- Kind: `property`
- Defined in: `HotbarChangePayload`

### Signature

```ts
slot: number
```

## state

Detached state after the change.

- Source: `packages/server/src/Player/HotbarManager.ts`
- Kind: `property`
- Defined in: `HotbarChangePayload`

### Signature

```ts
state: HotbarState
```

## target

Optional targeting data supplied by the client or battle module.

- Source: `packages/server/src/Player/HotbarManager.ts`
- Kind: `property`
- Defined in: `HotbarUseContext`

### Signature

```ts
target: unknown
```

## type

Unique serialized entry type.

- Source: `packages/server/src/Player/HotbarManager.ts`
- Kind: `property`
- Defined in: `HotbarEntryTypeDefinition`

### Signature

```ts
type: string
```

## use

Execute the authoritative gameplay action.

- Source: `packages/server/src/Player/HotbarManager.ts`
- Kind: `method`
- Defined in: `HotbarEntryTypeDefinition`

### Signature

```ts
use(player: RpgPlayer, id: string, context: HotbarUseContext): unknown | Promise<unknown>
```

### Parameters

- `player`: `RpgPlayer`
- `id`: `string`
- `context`: `HotbarUseContext`

## Use Active Hotbar Slot

Use the currently active slot, if one is selected.

- Source: `packages/server/src/Player/HotbarManager.ts`
- Kind: `method`
- Member of: `RpgPlayer`
- Defined in: `HotbarManagerMixin`

### Signature

```ts
player.useActiveHotbarSlot(target)
```

### Parameters

- `target?`: `unknown`

### Returns

The entry handler result, or `null` when no slot is active.

## Use Hotbar Slot

Use an entry through its registered authoritative type handler.

- Source: `packages/server/src/Player/HotbarManager.ts`
- Kind: `method`
- Member of: `RpgPlayer`
- Defined in: `HotbarManagerMixin`

### Signature

```ts
player.useHotbarSlot(slot,target)
```

### Parameters

- `slot`: `number`
- `target?`: `unknown`

### Returns

The entry handler result, or `null` for an empty slot.

## validate

Throw when the player may not assign or use this entry.

- Source: `packages/server/src/Player/HotbarManager.ts`
- Kind: `method`
- Defined in: `HotbarEntryTypeDefinition`

### Signature

```ts
validate(player: RpgPlayer, id: string): void
```

### Parameters

- `player`: `RpgPlayer`
- `id`: `string`
