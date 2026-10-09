---
title: "Battle Commands"
description: "Battle formulas and server-side battle helpers for players."
---

# Battle Commands

Battle formulas and server-side battle helpers for players.

## Members

- [applyDamage](#applydamage)
- [getFormulas](#getformulas)

## applyDamage

Apply damage. Player will lose HP. the `attackerPlayer` parameter is the other player, the one who attacks.

If you don't set the skill parameter, it will be a physical attack.
The attack formula is already defined but you can customize it in the server options.
This method handles all aspects of damage calculation including critical hits,
elemental vulnerabilities, guard effects, and applies the final damage to HP.

- Source: `packages/server/src/Player/BattleManager.ts`
- Kind: `method`
- Defined in: `IBattleManager`

### Signature

```ts
applyDamage(attackerPlayer: RpgPlayer, skill?: SkillData): DamageResult
```

### Parameters

- `attackerPlayer`: `RpgPlayer`
- `skill?`: `SkillData`

### Returns

Object containing damage details and special effects that occurred

### Examples

```ts
// Physical attack
const result = player.applyDamage(attackerPlayer);
console.log(`Physical damage: ${result.damage}, Critical: ${result.critical}`);

// Magical attack with skill
const fireSkill = { id: 'fire', power: 50, element: 'fire' };
const magicResult = player.applyDamage(attackerPlayer, fireSkill);
console.log(`Magic damage: ${magicResult.damage}, Vulnerable: ${magicResult.elementVulnerable}`);

// Check for guard effects
if (result.guard) {
  console.log('Attack was partially blocked!');
}
if (result.superGuard) {
  console.log('Attack was heavily reduced by super guard!');
}
```

## getFormulas

Get damage formulas from the current map

Retrieves the damage calculation formulas defined in the current map's configuration.
These formulas are used to calculate different types of damage including physical,
magical, critical hits, and guard effects. The formulas provide flexibility in
customizing the battle system's damage calculations.

- Source: `packages/server/src/Player/BattleManager.ts`
- Kind: `method`

### Signature

```ts
getFormulas(name: string)
```

### Parameters

- `name`: `string`

### Returns

The formula function or undefined if not found

### Examples

```ts
// Get physical damage formula
const physicFormula = player.getFormulas('damagePhysic');
if (physicFormula) {
  const damage = physicFormula(attackerParams, defenderParams);
}

// Get critical damage formula
const criticalFormula = player.getFormulas('damageCritical');
if (criticalFormula) {
  const criticalDamage = criticalFormula(baseDamage, attackerParams, defenderParams);
}
```
