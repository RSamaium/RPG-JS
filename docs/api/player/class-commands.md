---
title: "Class Commands"
description: "Assign and inspect player classes and class-driven behaviors."
---

# Class Commands

Assign and inspect player classes and class-driven behaviors.

## Members

- [Change Actor](#change-actor)
- [changeActor](#changeactor)
- [createClassInstance](#createclassinstance)
- [resolveClassSnapshot](#resolveclasssnapshot)
- [setActor](#setactor)
- [setClass](#setclass)
- [WithClassManager](#withclassmanager)

## Change Actor

Replace the player's active actor identity while preserving acquired
progression. The new actor's parameter curves are evaluated at the
current level and HP/SP keep their previous fill ratios. Starting
equipment is intentionally not granted.

- Source: `packages/server/src/Player/ClassManager.ts`
- Kind: `method`
- Member of: `RpgPlayer`

### Signature

```ts
player.changeActor(actor)
```

### Parameters

- `actorInput`: `ActorInput`

### Returns

The resolved actor object.

## changeActor

Change the active actor without granting starting equipment or resetting
the player's acquired progression.

- Source: `packages/server/src/Player/ClassManager.ts`
- Kind: `method`
- Defined in: `IClassManager`

### Signature

```ts
changeActor(actor: ActorInput): ActorData
```

### Parameters

- `actor`: `ActorInput`

### Returns

The resolved actor object

## createClassInstance

Create a class instance without side effects.

- Source: `packages/server/src/Player/ClassManager.ts`
- Kind: `method`

### Signature

```ts
createClassInstance(classInput: ClassInput)
```

### Parameters

- `classInput`: `ClassInput`

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

- `_class`: `ClassInput`

### Returns

The instantiated class object

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
