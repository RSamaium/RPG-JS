---
title: "Class Commands"
description: "Assign and inspect player classes and class-driven behaviors."
---

# Class Commands

Assign and inspect player classes and class-driven behaviors.

## Members

- [createClassInstance](#createclassinstance)
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
createClassInstance(classInput: ClassClass | string)
```

### Parameters

- `classInput`: `ClassClass | string`

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
setActor(actorClass: ActorConstructor | string): ActorData
```

### Parameters

- `actorClass`: `ActorConstructor | string`

### Returns

The instantiated actor object

## setClass

Assign a class to the player

- Source: `packages/server/src/Player/ClassManager.ts`
- Kind: `method`
- Defined in: `IClassManager`

### Signature

```ts
setClass(_class: ClassConstructor | string): ClassData
```

### Parameters

- `_class`: `ClassConstructor | string`

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
