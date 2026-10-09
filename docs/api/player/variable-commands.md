---
title: "Variable Commands"
description: "Store and retrieve player variables that persist across saves and map transfers."
---

# Variable Commands

Store and retrieve player variables that persist across saves and map transfers.

## Members

- [clearVariables](#clearvariables)
- [getVariable](#getvariable)
- [getVariableKeys](#getvariablekeys)
- [hasVariable](#hasvariable)
- [removeVariable](#removevariable)
- [setVariable](#setvariable)
- [variables](#variables)
- [WithVariableManager](#withvariablemanager)

## clearVariables

Clear all variables

- Source: `packages/server/src/Player/VariableManager.ts`
- Kind: `method`
- Defined in: `IVariableManager`

### Signature

```ts
clearVariables(): void
```

## getVariable

Get a variable value

- Source: `packages/server/src/Player/VariableManager.ts`
- Kind: `method`
- Defined in: `IVariableManager`

### Signature

```ts
getVariable(key: string): T | undefined
```

### Parameters

- `key`: `string`

### Returns

The stored value or undefined if not found

## getVariableKeys

Get all variable keys

- Source: `packages/server/src/Player/VariableManager.ts`
- Kind: `method`
- Defined in: `IVariableManager`

### Signature

```ts
getVariableKeys(): string[]
```

### Returns

Array of all variable keys

## hasVariable

Check if a variable exists

- Source: `packages/server/src/Player/VariableManager.ts`
- Kind: `method`
- Defined in: `IVariableManager`

### Signature

```ts
hasVariable(key: string): boolean
```

### Parameters

- `key`: `string`

### Returns

true if the variable exists, false otherwise

## removeVariable

Remove a variable

- Source: `packages/server/src/Player/VariableManager.ts`
- Kind: `method`
- Defined in: `IVariableManager`

### Signature

```ts
removeVariable(key: string): boolean
```

### Parameters

- `key`: `string`

### Returns

true if a variable existed and has been removed, false otherwise

## setVariable

Assign a variable to the player.

Use player variables for quest flags, per-player event state, and any value
that must survive saves and map transitions.

- Source: `packages/server/src/Player/VariableManager.ts`
- Kind: `method`
- Member of: `VariableManager`
- Defined in: `IVariableManager`

### Signature

```ts
setVariable(key: string, val: T): void
```

### Parameters

- `key`: `string`
- `val`: `T`

## variables

Map storing all player variables.

These values belong to the player, are persisted, and travel with the
player snapshot when switching maps or servers.

- Source: `packages/server/src/Player/VariableManager.ts`
- Kind: `property`
- Defined in: `IVariableManager`

### Signature

```ts
variables: RpgWritableSignal<Record<string, unknown>>
```

## WithVariableManager

Variable Manager Mixin

Provides variable management capabilities to any class. Variables are key-value
pairs that can store any type of data associated with the player, such as
quest progress, game flags, inventory state, and custom game data.

Player variables have two main roles:

1. Persist player-specific state so it can be restored from saves.
2. Carry that state across maps and map servers through the player snapshot.

- Source: `packages/server/src/Player/VariableManager.ts`
- Kind: `function`

### Signature

```ts
WithVariableManager(Base: TBase)
```

### Parameters

- `Base`: `TBase`

### Returns

Extended class with variable management methods

### Examples

```ts
class MyPlayer extends WithVariableManager(BasePlayer) {
  constructor() {
    super();
    // Variables are automatically initialized
  }
}

const player = new MyPlayer();
player.setVariable('questCompleted', true);
```
