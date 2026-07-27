---
title: "Element Commands"
description: "Element offense, defense, and coefficient helpers for players."
---

# Element Commands

Element offense, defense, and coefficient helpers for players.

## Members

- [coefficientElements](#coefficientelements)
- [elements](#elements)
- [elementsDefense](#elementsdefense)
- [elementsEfficiency](#elementsefficiency)
- [WithElementManager](#withelementmanager)

## coefficientElements

Calculate elemental damage coefficient against another player

Determines the damage multiplier when this player attacks another player,
taking into account the attacker's offensive elements, the defender's
elemental efficiency, and elemental defense from equipment. This is used
in the battle system to calculate elemental damage modifiers.

- Source: `packages/server/src/Player/ElementManager.ts`
- Kind: `method`
- Defined in: `IElementManager`

### Signature

```ts
coefficientElements(otherPlayer: RpgPlayer): number
```

### Parameters

- `otherPlayer`: `RpgPlayer`

### Returns

Numerical coefficient to multiply base damage by

### Examples

```ts
// Calculate elemental damage coefficient
const firePlayer = new MyPlayer();
const icePlayer = new MyPlayer();

// Fire player attacks ice player (assuming ice is weak to fire)
const coefficient = icePlayer.coefficientElements(firePlayer);
console.log(`Damage multiplier: ${coefficient}`); // e.g., 2.0 for double damage

// Use in damage calculation
const baseDamage = 100;
const finalDamage = baseDamage * coefficient;
console.log(`Final damage: ${finalDamage}`);

// Check for elemental advantage
if (coefficient > 1) {
  console.log('Attacker has elemental advantage!');
} else if (coefficient < 1) {
  console.log('Defender resists this element');
}
```

## elements

Gets all offensive elements available to the player from equipped weapons and armor.
This determines what elemental damage types the player can deal in combat.
The system automatically combines elements from all equipped items and removes duplicates.

- Source: `packages/server/src/Player/ElementManager.ts`
- Kind: `property`
- Defined in: `IElementManager`

### Signature

```ts
elements: {
    rate: number;
    element: string;
  }[]
```

### Returns

Array of element objects with rate and element properties for offensive capabilities

## elementsDefense

Gets the defensive capabilities against various elements from equipped items.
The system automatically consolidates multiple defensive items, keeping only
the highest protection rate for each element type.

- Source: `packages/server/src/Player/ElementManager.ts`
- Kind: `property`
- Defined in: `IElementManager`

### Signature

```ts
elementsDefense: ElementAffinity[]
```

### Returns

Array of element defense objects with rate and element properties

## elementsEfficiency

Manages the player's elemental efficiency modifiers, which determine how
effective different elements are against this player. Values greater than 1
indicate vulnerability, while values less than 1 indicate resistance.
This combines both class-based efficiency and player-specific modifiers.

- Source: `packages/server/src/Player/ElementManager.ts`
- Kind: `property`
- Defined in: `IElementManager`

### Signature

```ts
elementsEfficiency: ElementAffinity[]
```

### Returns

Array of element efficiency objects with rate and element properties

## WithElementManager

Element Manager Mixin

Provides elemental management capabilities to any class. This mixin handles
elemental resistances, vulnerabilities, and attack elements. It manages both
defensive capabilities (elementsDefense) and offensive elements from equipment,
as well as player-specific elemental efficiency modifiers.

- Source: `packages/server/src/Player/ElementManager.ts`
- Kind: `function`

### Signature

```ts
WithElementManager(Base: TBase)
```

### Parameters

- `Base`: `TBase`

### Returns

Extended class with element management methods

### Examples

```ts
class MyPlayer extends WithElementManager(BasePlayer) {
  constructor() {
    super();
    this.elementsEfficiency = [{ rate: 0.5, element: 'fire' }];
  }
}

const player = new MyPlayer();
const fireResistance = player.elementsDefense.find(e => e.element === 'fire');
```
