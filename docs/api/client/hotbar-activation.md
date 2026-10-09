---
title: "Hotbar Activation"
description: "Client preparation helpers for server-authoritative hotbar entries."
---

# Hotbar Activation

Client preparation helpers for server-authoritative hotbar entries.

## Members

- [activateHotbarSlot](#activatehotbarslot)
- [entry](#entry)
- [index](#index)
- [locked](#locked)
- [lockedHint](#lockedhint)
- [registerHotbarActivationHandler](#registerhotbaractivationhandler)
- [select](#select)
- [slot](#slot)
- [use](#use)

## activateHotbarSlot

Activate a client slot according to its serialized activation metadata.

Locked and unusable slots are ignored. Unknown handlers fall back to the
normal authoritative `useSlot` interaction.

- Source: `packages/client/src/services/hotbar.ts`
- Kind: `function`

### Signature

```ts
activateHotbarSlot(context: HotbarActivationContext): Promise<void>
```

### Parameters

- `context`: `HotbarActivationContext`

### Returns

A promise resolved after client preparation has completed.

## entry

Serializable authoritative entry reference.

- Source: `packages/client/src/services/hotbar.ts`
- Kind: `property`
- Defined in: `HotbarClientSlot`

### Signature

```ts
entry: HotbarEntry
```

## index

Zero-based persistent slot index.

- Source: `packages/client/src/services/hotbar.ts`
- Kind: `property`
- Defined in: `HotbarClientSlot`

### Signature

```ts
index: number
```

## locked

Whether the slot is outside the player's current capacity.

- Source: `packages/client/src/services/hotbar.ts`
- Kind: `property`
- Defined in: `HotbarClientSlot`

### Signature

```ts
locked: boolean
```

## lockedHint

Optional player-visible explanation for unlocking the slot.

- Source: `packages/client/src/services/hotbar.ts`
- Kind: `property`
- Defined in: `HotbarClientSlot`

### Signature

```ts
lockedHint: string
```

## registerHotbarActivationHandler

Register a client preparation handler for a serialized hotbar activation id.

Targeting modules can use this to prepare a target and call `context.use()`
without coupling the generic hotbar component to their gameplay rules.

- Source: `packages/client/src/services/hotbar.ts`
- Kind: `function`

### Signature

```ts
registerHotbarActivationHandler(id: string, handler: HotbarActivationHandler): () => void
```

### Parameters

- `id`: `string`
- `handler`: `HotbarActivationHandler`

### Returns

A function that restores the previous handler for the same id.

### Examples

```ts
const unregister = registerHotbarActivationHandler("pick-crop", ({ use }) => {
  use({ eventId: "crop-12" });
});
```

## select

Select the slot without using its entry.

- Source: `packages/client/src/services/hotbar.ts`
- Kind: `method`
- Defined in: `HotbarActivationContext`

### Signature

```ts
select(): void
```

## slot

Slot being activated.

- Source: `packages/client/src/services/hotbar.ts`
- Kind: `property`
- Defined in: `HotbarActivationContext`

### Signature

```ts
slot: HotbarClientSlot
```

## use

Ask the server to use the entry with optional serializable target data.

- Source: `packages/client/src/services/hotbar.ts`
- Kind: `method`
- Defined in: `HotbarActivationContext`

### Signature

```ts
use(target?: unknown): void
```

### Parameters

- `target?`: `unknown`
