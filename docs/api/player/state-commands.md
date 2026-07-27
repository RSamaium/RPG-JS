---
title: "State Commands"
description: "Apply, remove, and inspect player states."
---

# State Commands

Apply, remove, and inspect player states.

## Members

- [addState](#addstate)
- [applyStates](#applystates)
- [createStateInstance](#createstateinstance)
- [findStateEfficiency](#findstateefficiency)
- [getState](#getstate)
- [removeState](#removestate)
- [resolveStatesSnapshot](#resolvestatessnapshot)
- [statesDefense](#statesdefense)
- [statesEfficiency](#statesefficiency)
- [WithStateManager](#withstatemanager)

## addState

Adds a state to the player

- Source: `packages/server/src/Player/StateManager.ts`
- Kind: `method`
- Defined in: `IStateManager`

### Signature

```ts
addState(stateClass: StateClass | string, chance?: number): object | null
```

### Parameters

- `stateClass`: `StateClass | string`
- `chance?`: `number`

### Returns

The state instance if successfully applied, null if already present

## applyStates

Apply states to a player from skill or item effects

- Source: `packages/server/src/Player/StateManager.ts`
- Kind: `method`
- Defined in: `IStateManager`

### Signature

```ts
applyStates(player: RpgPlayer, states: { addStates?: StateApplication[]; removeStates?: StateApplication[] }): void
```

### Parameters

- `player`: `RpgPlayer`
- `states`: `{ addStates?: StateApplication[]; removeStates?: StateApplication[] }`

## createStateInstance

Create a state instance without side effects.

- Source: `packages/server/src/Player/StateManager.ts`
- Kind: `method`

### Signature

```ts
createStateInstance(stateInput: StateClass | string)
```

### Parameters

- `stateInput`: `StateClass | string`

## findStateEfficiency

Find state efficiency modifier for a specific state class

- Source: `packages/server/src/Player/StateManager.ts`
- Kind: `method`
- Defined in: `IStateManager`

### Signature

```ts
findStateEfficiency(stateClass: StateClass): StateEfficiency | undefined
```

### Parameters

- `stateClass`: `StateClass`

### Returns

The efficiency object if found, undefined otherwise

## getState

Get a state to the player. Returns null if the state is not present

- Source: `packages/server/src/Player/StateManager.ts`
- Kind: `method`
- Defined in: `IStateManager`

### Signature

```ts
getState(stateClass: StateClass | string): StateData | undefined
```

### Parameters

- `stateClass`: `StateClass | string`

### Returns

The state instance if found, null otherwise

## removeState

Remove a state to the player

- Source: `packages/server/src/Player/StateManager.ts`
- Kind: `method`
- Defined in: `IStateManager`

### Signature

```ts
removeState(stateClass: StateClass | string, chance?: number): void
```

### Parameters

- `stateClass`: `StateClass | string`
- `chance?`: `number`

## resolveStatesSnapshot

Resolve state snapshot entries into state instances without side effects.

- Source: `packages/server/src/Player/StateManager.ts`
- Kind: `method`

### Signature

```ts
resolveStatesSnapshot(snapshot: { states?: any[] }, mapOverride?: any)
```

### Parameters

- `snapshot`: `{ states?: any[] }`
- `mapOverride?`: `any`

## statesDefense

Gets the defensive capabilities against various states from equipped items

- Source: `packages/server/src/Player/StateManager.ts`
- Kind: `property`
- Defined in: `IStateManager`

### Signature

```ts
statesDefense: StateEfficiency[]
```

### Returns

Array of state defense objects with rate and state properties

## statesEfficiency

Manages the player's state efficiency modifiers

- Source: `packages/server/src/Player/StateManager.ts`
- Kind: `property`
- Defined in: `IStateManager`

### Signature

```ts
statesEfficiency: RpgWritableSignal<StateEfficiency[]>
```

### Returns

Signal containing array of state efficiency objects

## WithStateManager

State Manager Mixin

Provides state management capabilities to any class. This mixin handles
player states (buffs/debuffs), state defense from equipment, and state
efficiency modifiers. It manages the complete state system including
application, removal, and resistance mechanics.

- Source: `packages/server/src/Player/StateManager.ts`
- Kind: `function`

### Signature

```ts
WithStateManager(Base: TBase)
```

### Parameters

- `Base`: `TBase`

### Returns

Extended class with state management methods

### Examples

```ts
class MyPlayer extends WithStateManager(BasePlayer) {
  constructor() {
    super();
    // State system is automatically initialized
  }
}

const player = new MyPlayer();
player.addState(Paralyze);
console.log(player.getState(Paralyze));
```
