# Battle AI System

The RPGJS Battle AI system allows you to create intelligent enemies that can detect, pursue, and attack players automatically. This guide explains how to use and customize this system.

## Overview

The Battle AI system provides:

- **Vision Detection**: Enemies can detect players within a defined radius
- **Intelligent Pursuit**: Automatic movement towards detected targets
- **Attack System**: Automatic attacks with hitboxes and damage
- **Health Management**: Hit points and enemy death handling
- **Automatic Cleanup**: Removal of dead enemies from the map
- **Configurable Parameters**: Customizable attack ranges, hitboxes, and vision buffers

## Architecture

```
┌─────────────────┐       ┌───────────────────┐         ┌───────────────┐
│ Event Hooks     │ uses  │ BattleAi Class    │ manages │ AI Behavior   │
│ (onInit, etc.)  │──────▶│ (vision, combat)  │─────────▶ (move, attack) │
└─────────────────┘       └───────────────────┘         └───────────────┘
                                      │
                                      ▼
                          ┌───────────────────┐
                          │ BattleAiManager   │
                          │ (Central Registry)│
                          └───────────────────┘
```

## Basic Usage

### Apply AI to an Event

```typescript
import { BattleAi } from "@rpgjs/action-battle/server";
import { RpgEvent } from "@rpgjs/server";

// Create an AI instance
const battleAi = new BattleAi(event);

// Apply AI with custom configuration
const battleAi = new BattleAi(event, {
    visionRange: 200
});
```

### Custom Configuration

```typescript
// Enemy with custom statistics
new BattleAi(event, {
    attackCooldown: 800,      // Delay between attacks (ms)
    visionRange: 200,         // Vision range
    attackRange: 60,          // Attack range
    attackDistance: 40,       // Distance of attack hitbox from AI
    visionRangeBuffer: 30     // Buffer zone to prevent vision flickering
});
```

## Integration with Hooks

### onInit Hook

Automatically applies AI when creating events:

Add sword in database :

{
    name: "Sword",
    description: "A sword",
    price: 100,
    atk: 10,
    pdef: 10, 
}

```typescript
export default defineModule<RpgServer>({
    event: {
        onInit(event: RpgEvent) {
            this.addItem("sword");
            this.equip("sword");
            new BattleAi(event, {
                attackDamage: 15,
                visionRange: 120
            });
        }
    }
});
```

## Player Combat System

### Configurable Player Attacks

```typescript
import { createActionBattleModule, DEFAULT_PLAYER_ATTACK_HITBOXES } from "@rpgjs/action-battle/server";

// Create custom hitboxes
const customHitboxes = {
    ...DEFAULT_PLAYER_ATTACK_HITBOXES,
    up: { x: -20, y: -60, width: 40, height: 40 },    // Larger upward attack
    down: { x: -20, y: 20, width: 40, height: 40 }    // Larger downward attack
};

// Use the configurable module
export default createActionBattleModule({
    playerAttackHitboxes: customHitboxes,
    playerAttackDamage: 50,      // Higher damage
    playerAttackSpeed: 5         // Faster attack projectiles
});
```

## AI Behaviors

### Detection and Pursuit

1. **Circular Vision**: AI detects players within a defined radius
2. **Automatic Pursuit**: Movement towards detected player
3. **Target Loss**: Stops pursuit if player leaves vision range
4. **Vision Buffer**: Optional buffer zone to prevent flickering

### Attack System

1. **Range Check**: Only attacks if player is within range
2. **Attack Cooldown**: Delay between attacks
3. **Directional Hitbox**: Attacks in the direction of the player
4. **Visual Feedback**: Damage display
5. **Configurable Distance**: Customizable attack hitbox placement

### Death Management

1. **Hit Points**: Health system with damage
2. **Automatic Death**: Removal at 0 HP
3. **Cleanup**: Removal from map and data cleanup

## BattleAi Class API

### Constructor Options

```typescript
new BattleAi(event, {
    attackCooldown?: number,      // Attack delay in ms (default: 1000)
    visionRange?: number,         // Vision range (default: 150)
    attackRange?: number,         // Attack range (default: 40)
    attackDistance?: number,      // Attack hitbox distance (default: 30)
    visionRangeBuffer?: number    // Vision buffer (default: 0)
})
```

### Main Methods

#### `takeDamage(damage: number): boolean`

Applies damage to the AI.

**Parameters:**
- `damage: number` - Amount of damage to deal

**Returns:**
- `boolean` - `true` if the AI died, `false` otherwise


#### `getTarget(): RpgPlayer | null`

Returns current target player or null.

#### `destroy(): void`

Cleans up the AI instance and removes it from the manager.

## BattleAiManager Class API

The `BattleAiManager` provides centralized management of all AI instances.

### Static Methods

#### `damageAi(event: RpgEvent, damage: number): boolean`

Damages an AI by event reference.

```typescript
const defeated = BattleAiManager.damageAi(enemyEvent, 50);
if (defeated) {
    console.log('Enemy defeated!');
}
```

#### `getAi(eventId: string): BattleAi | undefined`

Gets an AI instance by event ID.

```typescript
const ai = BattleAiManager.getAi(event.id);
if (ai) {
    console.log(`AI Health: ${ai.getHealth()}/${ai.getMaxHealth()}`);
}
```

#### `getAiData(eventId: string): BattleAi | undefined`

Alias for `getAi()` - gets AI data for debugging.

#### `clear(): void`

Removes all AI instances (cleanup).

## Usage Examples

### Basic Enemy

```typescript
// Simple enemy with default stats
new BattleAi(goblinEvent);
```

### Powerful Boss

```typescript
// Boss with high health and attack
new BattleAi(bossEvent, {
    attackCooldown: 2000,
    visionRange: 300,
    attackRange: 80,
    attackDistance: 50
});
```

### Fast Guard

```typescript
// Guard with fast but weak attacks
new BattleAi(guardEvent, {
    attackCooldown: 500,
    visionRange: 100,
    attackRange: 30,
    visionRangeBuffer: 20  // Prevent vision flickering
});
```

### Ranged Archer

```typescript
// Archer with long range
new BattleAi(archerEvent, {
    attackCooldown: 1500,
    visionRange: 250,
    attackRange: 100,
    attackDistance: 80     // Attack from further away
});
```

### Custom Player Combat

```typescript
// Custom attack hitboxes for different weapon types
const swordHitboxes = {
    up: { x: -20, y: -50, width: 40, height: 35 },
    down: { x: -20, y: 15, width: 40, height: 35 },
    left: { x: -50, y: -20, width: 35, height: 40 },
    right: { x: 15, y: -20, width: 35, height: 40 },
    default: { x: 0, y: -35, width: 35, height: 35 }
};

const spearHitboxes = {
    up: { x: -10, y: -70, width: 20, height: 60 },
    down: { x: -10, y: 10, width: 20, height: 60 },
    left: { x: -70, y: -10, width: 60, height: 20 },
    right: { x: 10, y: -10, width: 60, height: 20 },
    default: { x: 0, y: -60, width: 20, height: 60 }
};

// Use different modules for different weapon types
export const swordCombatModule = createActionBattleModule({
    playerAttackHitboxes: swordHitboxes,
    playerAttackDamage: 40,
    playerAttackSpeed: 4
});

export const spearCombatModule = createActionBattleModule({
    playerAttackHitboxes: spearHitboxes,
    playerAttackDamage: 35,
    playerAttackSpeed: 3
});
```

## Best Practices

### Performance

1. **Limit AI Count**: Too many AI enemies can impact performance
2. **Adjust Intervals**: AI updates every 100ms by default
3. **Automatic Cleanup**: The system automatically cleans up dead AIs
4. **Use Vision Buffers**: Prevent unnecessary vision state changes

### Balancing

1. **Test Statistics**: Adjust values according to desired difficulty
2. **Vary Behaviors**: Use different configurations for different enemy types
3. **Visual Feedback**: Ensure attacks are visible to the player
4. **Range Considerations**: Balance vision vs attack ranges

### Debugging

```typescript
// Check AI state
const ai = BattleAiManager.getAi(event.id);
if (ai) {
    console.log('AI Status:', {
        hasTarget: !!ai.getTarget(),
        targetId: ai.getTarget()?.id
    });
}

// Monitor events
console.log(`AI applied to event ${event.id}`);
console.log(`Player ${player.id} defeated AI ${event.id}`);
```

## Configuration Examples

### No Vision Buffer (Immediate Response)

```typescript
new BattleAi(event, {
    visionRange: 150,
    visionRangeBuffer: 0  // No buffer - immediate vision changes
});
```

### Large Vision Buffer (Stable Tracking)

```typescript
new BattleAi(event, {
    visionRange: 150,
    visionRangeBuffer: 50  // Large buffer - stable tracking
});
```

### Close-Range Attacker

```typescript
new BattleAi(event, {
    visionRange: 100,
    attackRange: 40,
    attackDistance: 20  // Attack hitbox close to AI
});
```

### Long-Range Attacker

```typescript
new BattleAi(event, {
    visionRange: 200,
    attackRange: 80,
    attackDistance: 60  // Attack hitbox far from AI
});
```

## Current Limitations

1. **Single Target**: Each AI can only pursue one player at a time
2. **Circular Vision**: No cone or directional vision support
3. **Simple Attacks**: No complex attack patterns
4. **Basic Pathfinding**: Direct movement towards target

## Possible Extensions

The system can be extended to include:

- Multiple attack patterns
- Cooperative AI between enemies
- State system (patrol, alert, combat)
- Intelligent pathfinding
- Different vision types
- Automatic spawn system
- Formation-based AI
- Behavior trees
- Dynamic difficulty adjustment 