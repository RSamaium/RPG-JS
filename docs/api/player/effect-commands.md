---
title: "Effect Commands"
description: "Apply and inspect player effects."
---

# Effect Commands

Apply and inspect player effects.

## Members

- [effects](#effects)
- [hasEffect](#haseffect)
- [WithEffectManager](#witheffectmanager)

## effects

Gets all currently active effects on the player from multiple sources:
- Direct effects assigned to the player
- Effects from active states (buffs/debuffs)
- Effects from equipped weapons and armor
The returned array contains unique effects without duplicates.

- Source: `packages/server/src/Player/EffectManager.ts`
- Kind: `property`
- Defined in: `IEffectManager`

### Signature

```ts
effects: string[]
```

### Returns

Array of all active effects on the player

## hasEffect

Check if the player has a specific effect

Determines whether the player currently has the specified effect active.
This includes effects from states, equipment, and temporary conditions.
The effect system provides a flexible way to apply various gameplay
restrictions and enhancements to the player.

- Source: `packages/server/src/Player/EffectManager.ts`
- Kind: `method`
- Defined in: `IEffectManager`

### Signature

```ts
hasEffect(effect: string): boolean
```

### Parameters

- `effect`: `string`

### Returns

true if the player has the effect, false otherwise

### Examples

```ts
import { Effect } from '@rpgjs/database'

// Check for skill restriction
const cannotUseSkills = player.hasEffect(Effect.CAN_NOT_SKILL);
if (cannotUseSkills) {
  console.log('Player cannot use skills right now');
}

// Check for guard effect
const isGuarding = player.hasEffect(Effect.GUARD);
if (isGuarding) {
  console.log('Player is in guard stance');
}

// Check for cost reduction
const halfCost = player.hasEffect(Effect.HALF_SP_COST);
const actualCost = skillCost / (halfCost ? 2 : 1);
```

## WithEffectManager

Effect Manager Mixin

Provides effect management capabilities to any class. This mixin handles
player effects including restrictions, buffs, and debuffs. Effects can come
from various sources like states, equipment, and temporary conditions.

- Source: `packages/server/src/Player/EffectManager.ts`
- Kind: `function`

### Signature

```ts
WithEffectManager(Base: TBase)
```

### Parameters

- `Base`: `TBase`

### Returns

Extended class with effect management methods

### Examples

```ts
class MyPlayer extends WithEffectManager(BasePlayer) {
  constructor() {
    super();
    // Effect system is automatically initialized
  }
}

const player = new MyPlayer();
player.effects = [Effect.GUARD];
console.log(player.hasEffect(Effect.GUARD)); // true
```
