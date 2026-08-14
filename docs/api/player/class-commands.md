---
title: "Class Commands"
description: "Assign and inspect player classes and class-driven behaviors."
---

# Class Commands

Assign and inspect player classes and class-driven behaviors.

## Members

- [createClassInstance](#createclassinstance)
- [changeActor](#changeactor)
- [resolveClassSnapshot](#resolveclasssnapshot)
- [setActor](#setactor)
- [setClass](#setclass)
- [WithClassManager](#withclassmanager)

## createClassInstance

Create a class instance without side effects.

- Source: `packages/server/src/Player/ClassManager.ts`
- Kind: `method`

### Signature

```ts
createClassInstance(classInput: ClassInput)
```

### Parameters

- `classInput`: `ClassInput` (`ClassConstructor | ClassData | string`)

## changeActor

Replace the active actor identity without resetting the player's acquired
progression.

- Source: `packages/server/src/Player/ClassManager.ts`
- Kind: `method`
- Defined in: `IClassManager`

### Signature

```ts
changeActor(actor: ActorInput): ActorData
```

### Parameters

- `actor`: an actor constructor, registered database ID, or resolved actor object

### Returns

The resolved actor object.

The actor's identity, appearance, hitbox, default class, experience curve, and
parameter curves are applied. Existing level and experience are retained, the
new curves are evaluated at that level, and HP/SP retain their previous fill
ratios. Inventory, equipment, learned skills, states, and parameter modifiers
are not cleared. Unlike `setActor`, this method does not grant starting
equipment.

## resolveClassSnapshot

Resolve class snapshot entry into a class instance without side effects.

- Source: `packages/server/src/Player/ClassManager.ts`
- Kind: `method`

### Signature

```ts
resolveClassSnapshot(snapshot: { _class?: any }, mapOverride?: any)
```

### Parameters

- `snapshot`: `{ _class?: any }`
- `mapOverride?`: `any`

## setActor

Set up the player as a specific actor archetype

- Source: `packages/server/src/Player/ClassManager.ts`
- Kind: `method`
- Defined in: `IClassManager`

### Signature

```ts
setActor(actor: ActorInput): ActorData
```

### Parameters

- `actor`: `ActorInput`

### Returns

The resolved actor object

## setClass

Assign a class to the player

- Source: `packages/server/src/Player/ClassManager.ts`
- Kind: `method`
- Defined in: `IClassManager`

### Signature

```ts
setClass(_class: ClassInput): ClassData
```

### Parameters

- `_class`: a class constructor, registered database ID, or resolved class object

### Returns

The instantiated class object

The assigned instance is stored in `player._class`, its `onSet` hook runs, and
eligible `skillsToLearn` entries up to the player's current level are learned.
This makes resolved objects returned by a CMS usable without generating a
constructor at runtime.

## WithClassManager

Class Manager Mixin

Provides class and actor management capabilities to any class. This mixin handles
character class assignment and actor setup, including automatic parameter configuration,
starting equipment, and skill progression based on class definitions.

- Source: `packages/server/src/Player/ClassManager.ts`
- Kind: `function`

### Signature

```ts
WithClassManager(Base: TBase)
```

### Parameters

- `Base`: `TBase`

### Returns

Extended class with class management methods

### Examples

```ts
class MyPlayer extends WithClassManager(BasePlayer) {
  constructor() {
    super();
    // Class system is automatically initialized
  }
}

const player = new MyPlayer();
player.setClass(Fighter);
player.setActor(Hero);
```
