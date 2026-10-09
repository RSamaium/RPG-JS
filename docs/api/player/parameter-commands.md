---
title: "Parameter Commands"
description: "Level, experience, HP, SP, and parameter management for players."
---

# Parameter Commands

Level, experience, HP, SP, and parameter management for players.

## Members

- [Add custom parameters](#add-custom-parameters)
- [Add custom parameters](#add-custom-parameters)
- [All Recovery](#all-recovery)
- [All Recovery](#all-recovery)
- [Change Experience](#change-experience)
- [Change Experience](#change-experience)
- [Change Experience Curve](#change-experience-curve)
- [Change HP](#change-hp)
- [Change HP](#change-hp)
- [Change Level](#change-level)
- [Change Level](#change-level)
- [Change SP](#change-sp)
- [Change SP](#change-sp)
- [Experience for next level ?](#experience-for-next-level)
- [Experience for next level ?](#experience-for-next-level)
- [Get Param Value](#get-param-value)
- [Get Param Value](#get-param-value)
- [getParamValue](#getparamvalue)
- [parameters](#parameters)
- [Recovery HP and/or SP](#recovery-hp-and-or-sp)
- [Recovery HP and/or SP](#recovery-hp-and-or-sp)
- [Set final level](#set-final-level)
- [Set final level](#set-final-level)
- [Set initial level](#set-initial-level)
- [Set initial level](#set-initial-level)
- [Set Parameters Modifier](#set-parameters-modifier)
- [Set Parameters Modifier](#set-parameters-modifier)
- [setParameter](#setparameter)
- [WithParameterManager](#withparametermanager)

## Add custom parameters

Give a new parameter. Give a start value and an end value.
The start value will be set to the level set at `player.initialLevel` and the end value will be linked to the level set at `player.finalLevel`.

```ts
const SPEED = 'speed'

player.addParameter(SPEED, {
    start: 10,
    end: 100
})

player.param[SPEED] // 10
player.level += 5
player.param[SPEED] // 14
```

- Source: `packages/server/src/Player/ParameterManager.ts`
- Kind: `method`
- Member of: `ParameterManager`
- Defined in: `IParameterManager`

### Signature

```ts
player.addParameter(name,curve)
```

### Parameters

- `name`: `string`
- `curve`: `{ start: number, end: number }`

## Add custom parameters

Give a new parameter. Give a start value and an end value.
The start value will be set to the level set at `player.initialLevel` and the end value will be linked to the level set at `player.finalLevel`.

```ts
const SPEED = 'speed'

player.addParameter(SPEED, {
    start: 10,
    end: 100
})

player.param[SPEED] // 10
player.level += 5
player.param[SPEED] // 14
```

- Source: `packages/server/src/Player/ParameterManager.ts`
- Kind: `method`
- Member of: `ParameterManager`

### Signature

```ts
player.addParameter(name,curve)
```

### Parameters

- `name`: `string`
- `value`: `ParameterValue`

## All Recovery

restores all HP and SP

```ts
import { Presets } from '@rpgjs/server'

const { MAXHP, MAXSP } = Presets

console.log(player.param[MAXHP], player.param[MAXSP]) // 800, 230
player.hp = 100
player.sp = 0
player.allRecovery()
console.log(player.hp, player.sp) // 800, 230
```

- Source: `packages/server/src/Player/ParameterManager.ts`
- Kind: `method`
- Member of: `ParameterManager`
- Defined in: `IParameterManager`

### Signature

```ts
player.allRecovery()
```

## All Recovery

restores all HP and SP

```ts
import { Presets } from '@rpgjs/server'

const { MAXHP, MAXSP } = Presets

console.log(player.param[MAXHP], player.param[MAXSP]) // 800, 230
player.hp = 100
player.sp = 0
player.allRecovery()
console.log(player.hp, player.sp) // 800, 230
```

- Source: `packages/server/src/Player/ParameterManager.ts`
- Kind: `method`
- Member of: `ParameterManager`

### Signature

```ts
player.allRecovery()
```

## Change Experience

Changing the player's experience.
```ts
player.exp += 100
```

Levels are based on the experience curve.

```ts
console.log(player.level) // 1
console.log(player.expForNextlevel) // 150
player.exp += 160
console.log(player.level) // 2
```

- Source: `packages/server/src/Player/ParameterManager.ts`
- Kind: `property`
- Member of: `ParameterManager`
- Defined in: `IParameterManager`

### Signature

```ts
{number} player.exp
```

### Default

```ts
0
```

## Change Experience

Changing the player's experience.
```ts
player.exp += 100
```

Levels are based on the experience curve.

```ts
console.log(player.level) // 1
console.log(player.expForNextlevel) // 150
player.exp += 160
console.log(player.level) // 2
```

- Source: `packages/server/src/Player/ParameterManager.ts`
- Kind: `setter`
- Member of: `ParameterManager`

### Signature

```ts
{number} player.exp
```

### Default

```ts
0
```

## Change Experience Curve

With Object-based syntax, you can use following options:
- `basis: number`
- `extra: number`
- `accelerationA: number`
- `accelerationB: number`

- Source: `packages/server/src/Player/ParameterManager.ts`
- Kind: `property`
- Member of: `ParameterManager`
- Defined in: `IParameterManager`

### Signature

```ts
{object} player.expCurve
```

### Default

```ts
```ts
{
     basis: 30,
     extra: 20,
     accelerationA: 30,
     accelerationB: 30
}
```
```

## Change HP

Changes the health points
- Cannot exceed the MaxHP parameter
- Cannot have a negative value
- If the value is 0, a hook named `onDead()` is called in the RpgPlayer class.

```ts
player.hp = 100
```

- Source: `packages/server/src/Player/ParameterManager.ts`
- Kind: `property`
- Member of: `ParameterManager`
- Defined in: `IParameterManager`

### Signature

```ts
{number} player.hp
```

### Default

```ts
MaxHPValue
```

## Change HP

Changes the health points
- Cannot exceed the MaxHP parameter
- Cannot have a negative value
- If the value is 0, a hook named `onDead()` is called in the RpgPlayer class.

```ts
player.hp = 100
```

- Source: `packages/server/src/Player/ParameterManager.ts`
- Kind: `setter`
- Member of: `ParameterManager`

### Signature

```ts
{number} player.hp
```

### Default

```ts
MaxHPValue
```

## Change Level

Changing the player's level.

```ts
player.level += 1
```

The level will be between the initial level given by the `initialLevel` and final level given by `finalLevel`

```ts
player.finalLevel = 50
player.level = 60
console.log(player.level) // 50
```

- Source: `packages/server/src/Player/ParameterManager.ts`
- Kind: `property`
- Member of: `ParameterManager`
- Defined in: `IParameterManager`

### Signature

```ts
{number} player.level
```

### Default

```ts
1
```

## Change Level

Changing the player's level.

```ts
player.level += 1
```

The level will be between the initial level given by the `initialLevel` and final level given by `finalLevel`

```ts
player.finalLevel = 50
player.level = 60
console.log(player.level) // 50
```

- Source: `packages/server/src/Player/ParameterManager.ts`
- Kind: `setter`
- Member of: `ParameterManager`

### Signature

```ts
{number} player.level
```

### Default

```ts
1
```

## Change SP

Changes the skill points
- Cannot exceed the MaxSP parameter
- Cannot have a negative value

```ts
player.sp = 200
```

- Source: `packages/server/src/Player/ParameterManager.ts`
- Kind: `property`
- Member of: `ParameterManager`
- Defined in: `IParameterManager`

### Signature

```ts
{number} player.sp
```

### Default

```ts
MaxSPValue
```

## Change SP

Changes the skill points
- Cannot exceed the MaxSP parameter
- Cannot have a negative value

```ts
player.sp = 200
```

- Source: `packages/server/src/Player/ParameterManager.ts`
- Kind: `setter`
- Member of: `ParameterManager`

### Signature

```ts
{number} player.sp
```

### Default

```ts
MaxSPValue
```

## Experience for next level ?

```ts
console.log(player.expForNextlevel) // 150
```

- Source: `packages/server/src/Player/ParameterManager.ts`
- Kind: `property`
- Member of: `ParameterManager`
- Defined in: `IParameterManager`

### Signature

```ts
{number} player.expForNextlevel
```

## Experience for next level ?

```ts
console.log(player.expForNextlevel) // 150
```

- Source: `packages/server/src/Player/ParameterManager.ts`
- Kind: `getter`
- Member of: `ParameterManager`

### Signature

```ts
{number} player.expForNextlevel
```

## Get Param Value

Read the value of a parameter. Put the name of the parameter.

```ts
import { Presets } from '@rpgjs/server'

const { MAXHP } = Presets

console.log(player.param[MAXHP])
```

> Possible to use the `player.getParamValue(name)` method instead

- Source: `packages/server/src/Player/ParameterManager.ts`
- Kind: `property`
- Member of: `ParameterManager`
- Defined in: `IParameterManager`

### Signature

```ts
{object} player.param
```

## Get Param Value

Read the value of a parameter. Put the name of the parameter.

```ts
import { Presets } from '@rpgjs/server'

const { MAXHP } = Presets

console.log(player.param[MAXHP])
```

> Possible to use the `player.getParamValue(name)` method instead

- Source: `packages/server/src/Player/ParameterManager.ts`
- Kind: `getter`
- Member of: `ParameterManager`

### Signature

```ts
{object} player.param
```

## getParamValue

Get the value of a specific parameter by name

- Source: `packages/server/src/Player/ParameterManager.ts`
- Kind: `method`
- Defined in: `IParameterManager`

### Signature

```ts
getParamValue(name: string): number
```

### Parameters

- `name`: `string`

### Returns

The calculated parameter value

### Examples

```ts
import { Presets } from '@rpgjs/server'

const { MAXHP } = Presets

// Preferred way (reactive)
const maxHp = player.param[MAXHP];

// Legacy way (still works)
const maxHp = player.getParamValue(MAXHP);
```

## parameters

Get or set the parameters object

- Source: `packages/server/src/Player/ParameterManager.ts`
- Kind: `property`
- Member of: `ParameterManager`
- Defined in: `IParameterManager`

### Signature

```ts
{object} parameters
```

## Recovery HP and/or SP

Gives back in percentage of health points to skill points

```ts
import { Presets } from '@rpgjs/server'

const { MAXHP } = Presets

console.log(player.param[MAXHP]) // 800
player.hp = 100
player.recovery({ hp: 0.5 }) // = 800 * 0.5
console.log(player.hp) // 400
```

- Source: `packages/server/src/Player/ParameterManager.ts`
- Kind: `method`
- Member of: `ParameterManager`
- Defined in: `IParameterManager`

### Signature

```ts
player.recovery(params)
```

### Parameters

- `params`: `{ hp?: number, sp?: number }`

## Recovery HP and/or SP

Gives back in percentage of health points to skill points

```ts
import { Presets } from '@rpgjs/server'

const { MAXHP } = Presets

console.log(player.param[MAXHP]) // 800
player.hp = 100
player.recovery({ hp: 0.5 }) // = 800 * 0.5
console.log(player.hp) // 400
```

- Source: `packages/server/src/Player/ParameterManager.ts`
- Kind: `method`
- Member of: `ParameterManager`

### Signature

```ts
player.recovery(params)
```

### Parameters

- `{ hp, sp }`: `{ hp?: number, sp?: number }`

## Set final level

```ts
player.finalLevel = 50
```

- Source: `packages/server/src/Player/ParameterManager.ts`
- Kind: `property`
- Member of: `ParameterManager`
- Defined in: `IParameterManager`

### Signature

```ts
{number} player.finalLevel
```

### Default

```ts
99
```

## Set final level

```ts
player.finalLevel = 50
```

The server retains this curve bound in saves and room transfers in both RPG and MMORPG modes.

- Source: `packages/server/src/Player/ParameterManager.ts`
- Kind: `getter`
- Member of: `ParameterManager`

### Signature

```ts
{number} player.finalLevel
```

### Default

```ts
99
```

## Set initial level

```ts
player.initialLevel = 5
```

- Source: `packages/server/src/Player/ParameterManager.ts`
- Kind: `property`
- Member of: `ParameterManager`
- Defined in: `IParameterManager`

### Signature

```ts
{number} player.initialLevel
```

### Default

```ts
1
```

## Set initial level

```ts
player.initialLevel = 5
```

The server retains this curve bound in saves and room transfers in both RPG and MMORPG modes.

- Source: `packages/server/src/Player/ParameterManager.ts`
- Kind: `getter`
- Member of: `ParameterManager`

### Signature

```ts
{number} player.initialLevel
```

### Default

```ts
1
```

## Set Parameters Modifier

Direct parameter modifiers (reactive signal)

> It is important that these parameters have been created beforehand with the `addParameter()` method.
> By default, the following settings have been created:
- maxhp
- maxsp
- str
- int
- dex
- agi

**Object Key**

The key of the object is the name of the parameter

> The good practice is to retrieve the name coming from a constant

**Object Value**

The value of the key is an object containing:
```
{
  value: number,
  rate: number
}
```

- value: Adds a number to the parameter
- rate: Adds a rate to the parameter

> Note that you can put both (value and rate)

This property uses reactive signals - changes automatically trigger parameter recalculation.
The final parameter values in `param` include aggregated modifiers from equipment, states, etc.

- Source: `packages/server/src/Player/ParameterManager.ts`
- Kind: `property`
- Member of: `ParameterManager`
- Defined in: `IParameterManager`

### Signature

```ts
{Object} [paramsModifier]
```

### Examples

```ts
import { Presets } from '@rpgjs/server'

const { MAXHP } = Presets

// Set direct modifiers (reactive)
player.paramsModifier = {
     [MAXHP]: {
         value: 100
     }
}

// Parameters automatically recalculate
console.log(player.param[MAXHP]); // Updated value
```

## Set Parameters Modifier

Changes the values of some parameters

> It is important that these parameters have been created beforehand with the `addParameter()` method.
> By default, the following settings have been created:
- maxhp
- maxsp
- str
- int
- dex
- agi

**Object Key**

The key of the object is the name of the parameter

> The good practice is to retrieve the name coming from a constant

**Object Value**

The value of the key is an object containing:
```
{
  value: number,
  rate: number
}
```

- value: Adds a number to the parameter
- rate: Adds a rate to the parameter

> Note that you can put both (value and rate)

In the case of a state or the equipment of a weapon or armor, the parameters will be changed but if the state disappears or the armor/weapon is de-equipped, then the parameters will return to the initial state.

- Source: `packages/server/src/Player/ParameterManager.ts`
- Kind: `setter`
- Member of: `ParameterManager`

### Signature

```ts
{Object} [paramsModifier]
```

### Examples

```ts
```ts
import { Presets } from '@rpgjs/server'

const { MAXHP } = Presets

player.paramsModifier = {
     [MAXHP]: {
         value: 100
     }
}
```

1. Player has 741 MaxHp
2. After changing the parameter, he will have 841 MaxHp
```

## setParameter

Set a parameter with either a fixed value or a level curve

A numeric value is stored as a fixed parameter where `start === end`.

- Source: `packages/server/src/Player/ParameterManager.ts`
- Kind: `method`
- Defined in: `IParameterManager`

### Signature

```ts
setParameter(name: string, value: ParameterValue): void
```

### Parameters

- `name`: `string`
- `value`: `ParameterValue`

## WithParameterManager

Parameter Manager Mixin with Reactive Signals

Provides comprehensive parameter management through RPGJS reactive gameplay signals.
This mixin handles health points (HP), skill points (SP), experience and level progression,
custom parameters, and parameter modifiers with automatic reactivity.

**Key Features:**
- ✨ **Reactive Parameters**: All parameters automatically recalculate when level or modifiers change
- 🚀 **Performance Optimized**: Uses computed signals to avoid unnecessary recalculations
- 🔄 **Real-time Updates**: Changes propagate automatically throughout the system
- 🎯 **Type Safe**: Full TypeScript support with proper type inference

- Source: `packages/server/src/Player/ParameterManager.ts`
- Kind: `function`

### Signature

```ts
WithParameterManager(Base: TBase)
```

### Parameters

- `Base`: `TBase`

### Returns

Extended class with reactive parameter management methods

### Examples

```ts
class MyPlayer extends WithParameterManager(BasePlayer) {
  constructor() {
    super();
    
    // Add custom parameters
    this.addParameter('strength', { start: 10, end: 100 });
    this.addParameter('magic', { start: 5, end: 80 });
  }
}

const player = new MyPlayer();

// Reactive parameter updates
player.level = 5;
console.log(player.param.strength); // Automatically calculated for level 5

// Reactive modifiers
player.paramsModifier = {
  [MAXHP]: { value: 100, rate: 1.2 }
};
console.log(player.param[MAXHP]); // Automatically includes modifiers
```
