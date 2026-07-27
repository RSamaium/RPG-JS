---
title: "Skill Commands"
description: "Learn, forget, and use skills from the server-side player API."
---

# Skill Commands

Learn, forget, and use skills from the server-side player API.

## Members

- [_type](#type)
- [coefficient](#coefficient)
- [createSkillInstance](#createskillinstance)
- [description](#description)
- [forgetSkill](#forgetskill)
- [forgetSkill](#forgetskill)
- [getSkill](#getskill)
- [getSkill](#getskill)
- [hitRate](#hitrate)
- [id](#id)
- [learnSkill](#learnskill)
- [learnSkill](#learnskill)
- [name](#name)
- [onForget](#onforget)
- [onLearn](#onlearn)
- [onUse](#onuse)
- [onUseFailed](#onusefailed)
- [power](#power)
- [resolveSkillsSnapshot](#resolveskillssnapshot)
- [spCost](#spcost)
- [useSkill](#useskill)
- [useSkill](#useskill)
- [WithSkillManager](#withskillmanager)

## _type

Type marker for database

- Source: `packages/server/src/Player/SkillManager.ts`
- Kind: `property`
- Defined in: `SkillObject`

### Signature

```ts
_type: 'skill'
```

## coefficient

Coefficient multipliers for damage calculation

- Source: `packages/server/src/Player/SkillManager.ts`
- Kind: `property`
- Defined in: `SkillObject`

### Signature

```ts
coefficient: Record<string, number>
```

## createSkillInstance

Create a skill instance without learning side effects.

- Source: `packages/server/src/Player/SkillManager.ts`
- Kind: `method`

### Signature

```ts
createSkillInstance(skillInput: SkillClass | SkillObject | string)
```

### Parameters

- `skillInput`: `SkillClass | SkillObject | string`

## description

Description of the skill

- Source: `packages/server/src/Player/SkillManager.ts`
- Kind: `property`
- Defined in: `SkillObject`

### Signature

```ts
description: string
```

## forgetSkill

Forget a learned skill

Removes a skill from the player's skill list.

- Source: `packages/server/src/Player/SkillManager.ts`
- Kind: `method`

### Signature

```ts
forgetSkill(skillInput: SkillClass | SkillObject | string, options?: SkillChangeOptions): SkillData
```

### Parameters

- `skillInput`: `SkillClass | SkillObject | string`
- `options?`: `SkillChangeOptions`

### Returns

The forgotten skill data

### Examples

```ts
player.forgetSkill('fire');
// or
player.forgetSkill(FireSkill);
```

## forgetSkill

Forget a skill

- Source: `packages/server/src/Player/SkillManager.ts`
- Kind: `method`
- Defined in: `ISkillManager`

### Signature

```ts
forgetSkill(skillInput: SkillClass | SkillObject | string, options?: SkillChangeOptions): SkillData
```

### Parameters

- `skillInput`: `SkillClass | SkillObject | string`
- `options?`: `SkillChangeOptions`

### Returns

The forgotten skill data

## getSkill

Retrieves a learned skill

Searches the player's learned skills by ID, class, or object.

- Source: `packages/server/src/Player/SkillManager.ts`
- Kind: `method`

### Signature

```ts
getSkill(skillInput: SkillClass | SkillObject | string): Skill | null
```

### Parameters

- `skillInput`: `SkillClass | SkillObject | string`

### Returns

The skill data if found, null otherwise

### Examples

```ts
const skill = player.getSkill('fire');
if (skill) {
  console.log(`Fire skill costs ${skill.spCost} SP`);
}
```

## getSkill

Retrieves a learned skill. Returns null if not found

- Source: `packages/server/src/Player/SkillManager.ts`
- Kind: `method`
- Defined in: `ISkillManager`

### Signature

```ts
getSkill(skillInput: SkillClass | SkillObject | string): Skill | null
```

### Parameters

- `skillInput`: `SkillClass | SkillObject | string`

### Returns

The skill data or null

## hitRate

Hit rate (0-1) - probability of successful skill usage

- Source: `packages/server/src/Player/SkillManager.ts`
- Kind: `property`
- Defined in: `SkillObject`

### Signature

```ts
hitRate: number
```

### Default

```ts
1
```

## id

Unique identifier for the skill
If not provided, one will be auto-generated

- Source: `packages/server/src/Player/SkillManager.ts`
- Kind: `property`
- Defined in: `SkillObject`

### Signature

```ts
id: string
```

## learnSkill

Learn a new skill

Adds a skill to the player's skill list. Supports three input formats:
- **String ID**: Retrieves the skill from the database
- **Class**: Creates an instance and adds to database if needed
- **Object**: Uses directly and adds to database if needed

- Source: `packages/server/src/Player/SkillManager.ts`
- Kind: `method`

### Signature

```ts
learnSkill(skillInput: SkillClass | SkillObject | string, options?: SkillChangeOptions): SkillObject
```

### Parameters

- `skillInput`: `SkillClass | SkillObject | string`
- `options?`: `SkillChangeOptions`

### Returns

The learned skill data

### Examples

```ts
// From database
player.learnSkill('fire');

// From class
player.learnSkill(FireSkill);

// From object
player.learnSkill({
  id: 'custom-skill',
  name: 'Custom Skill',
  spCost: 20,
  onLearn(player) {
    console.log('Learned custom skill!');
  }
});
```

## learnSkill

Learn a skill

Supports three input formats:
- String ID: Retrieves from database
- Class: Creates instance and adds to database
- Object: Uses directly and adds to database

- Source: `packages/server/src/Player/SkillManager.ts`
- Kind: `method`
- Defined in: `ISkillManager`

### Signature

```ts
learnSkill(skillInput: SkillClass | SkillObject | string, options?: SkillChangeOptions): SkillObject
```

### Parameters

- `skillInput`: `SkillClass | SkillObject | string`
- `options?`: `SkillChangeOptions`

### Returns

The learned skill data

## name

Display name of the skill

- Source: `packages/server/src/Player/SkillManager.ts`
- Kind: `property`
- Defined in: `SkillObject`

### Signature

```ts
name: string
```

## onForget

Called when the skill is forgotten

- Source: `packages/server/src/Player/SkillManager.ts`
- Kind: `property`
- Defined in: `SkillHooks`

### Signature

```ts
onForget: (player: RpgPlayer) => void | Promise<void>
```

### Parameters

- `` - The player forgetting the skill

## onLearn

Called when the skill is learned by the player

- Source: `packages/server/src/Player/SkillManager.ts`
- Kind: `property`
- Defined in: `SkillHooks`

### Signature

```ts
onLearn: (player: RpgPlayer) => void | Promise<void>
```

### Parameters

- `` - The player learning the skill

## onUse

Called when the skill is successfully used

- Source: `packages/server/src/Player/SkillManager.ts`
- Kind: `property`
- Defined in: `SkillHooks`

### Signature

```ts
onUse: (player: RpgPlayer, target?: RpgPlayer | RpgPlayer[]) => void | Promise<void>
```

### Parameters

- `` - The target player(s) if any

## onUseFailed

Called when the skill usage fails (e.g., chance roll failed)

- Source: `packages/server/src/Player/SkillManager.ts`
- Kind: `property`
- Defined in: `SkillHooks`

### Signature

```ts
onUseFailed: (player: RpgPlayer, target?: RpgPlayer | RpgPlayer[]) => void | Promise<void>
```

### Parameters

- `` - The intended target player(s) if any

## power

Base power of the skill for damage calculation

- Source: `packages/server/src/Player/SkillManager.ts`
- Kind: `property`
- Defined in: `SkillObject`

### Signature

```ts
power: number
```

## resolveSkillsSnapshot

Resolve skill snapshot entries into Skill instances without side effects.

- Source: `packages/server/src/Player/SkillManager.ts`
- Kind: `method`

### Signature

```ts
resolveSkillsSnapshot(snapshot: { skills?: any[] }, mapOverride?: any)
```

### Parameters

- `snapshot`: `{ skills?: any[] }`
- `mapOverride?`: `any`

## spCost

SP (Skill Points) cost to use the skill

- Source: `packages/server/src/Player/SkillManager.ts`
- Kind: `property`
- Defined in: `SkillObject`

### Signature

```ts
spCost: number
```

### Default

```ts
0
```

## useSkill

Use a learned skill

Executes a skill, consuming SP and applying effects to targets.
The skill must be learned and the player must have enough SP.

- Source: `packages/server/src/Player/SkillManager.ts`
- Kind: `method`

### Signature

```ts
useSkill(skillInput: SkillClass | SkillObject | string, otherPlayer?: RpgPlayer | RpgPlayer[]): SkillData
```

### Parameters

- `skillInput`: `SkillClass | SkillObject | string`
- `otherPlayer?`: `RpgPlayer | RpgPlayer[]`

### Returns

The used skill data

### Examples

```ts
// Use skill without target
player.useSkill('fire');

// Use skill on a target
player.useSkill('fire', enemy);

// Use skill on multiple targets
player.useSkill('fire', [enemy1, enemy2]);
```

## useSkill

Use a skill

- Source: `packages/server/src/Player/SkillManager.ts`
- Kind: `method`
- Defined in: `ISkillManager`

### Signature

```ts
useSkill(skillInput: SkillClass | SkillObject | string, otherPlayer?: RpgPlayer | RpgPlayer[]): SkillData
```

### Parameters

- `skillInput`: `SkillClass | SkillObject | string`
- `otherPlayer?`: `RpgPlayer | RpgPlayer[]`

### Returns

The used skill data

## WithSkillManager

Skill Manager Mixin

Provides skill management capabilities to any class. This mixin handles
learning, forgetting, and using skills, including SP cost management,
hit rate calculations, and skill effects application.

Supports three input formats for skills:
- **String ID**: References a skill in the database
- **Class**: A skill class that will be instantiated
- **Object**: A skill object with properties and hooks

- Source: `packages/server/src/Player/SkillManager.ts`
- Kind: `function`

### Signature

```ts
WithSkillManager(Base: TBase): TBase
```

### Parameters

- `Base`: `TBase`

### Returns

Extended class with skill management methods

### Examples

```ts
// Using string ID (from database)
player.learnSkill('fire');

// Using skill class
player.learnSkill(FireSkill);

// Using skill object
player.learnSkill({
  id: 'ice',
  name: 'Ice',
  spCost: 15,
  onUse(player) {
    console.log('Ice spell cast!');
  }
});
```
