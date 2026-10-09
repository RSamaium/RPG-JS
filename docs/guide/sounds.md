---
title: "Sounds Guide"
description: "Guide for Sounds Guide in RPGJS."
---

# Sounds Guide

This guide explains how to work with sounds in RPG-JS, including static sound configuration, playing sounds from the server, and dynamic sound resolution.

## Overview

Sounds are audio files that can be played during gameplay to provide audio feedback for actions, events, and ambient effects. RPG-JS supports both pre-loaded static sounds and dynamic sound creation through a resolver system.

## Audio channels and player preferences

The existing sound API supports four channels: `master`, `music`, `sfx`, and `ui`. Values range from `0` to `1` and are persisted in the browser for each project.

```ts
engine.setSoundVolume("master", 0.8);
engine.setSoundVolume("music", 0.6);
engine.setSoundVolume("sfx", 1);
engine.setSoundVolume("ui", 0.5);

const musicVolume = engine.getSoundVolume("music");
```

The native Options menu provides accessible 0–100 sliders for the same channels. Map music, ambient sounds, Action Battle effects, and native UI cues consume these gains automatically. The legacy `RpgSound.global.volume(value)` call is kept as an alias of the Master channel.

## Semantic menu sounds

Native menus use the semantic cues `navigate`, `confirm`, `cancel`, `open`, `close`, and `error`. RPGJS includes a small original neutral-fantasy pack generated at runtime, so these cues work without assets or attribution.

Override the global Studio interface theme with `audio.ui`:

```ts
const config = {
  projectId: "my-game",
  audio: {
    ui: {
      navigate: "wood-cursor",
      confirm: { id: ["confirm-1", "confirm-2"], volume: 0.8, cooldownMs: 60 },
    },
  },
};
```

The project theme applies to every native menu, then falls back to the built-in cue. Per-menu overrides are not used. In Studio, a missing or empty media field uses the built-in cue and a selected media file replaces it globally.

`playSound()` remains the single API for ordinary and spatial effects. Passing positions enables distance attenuation and stereo panning; without positions it behaves exactly as before.

```ts
engine.playSound("hit", {
  channel: "sfx",
  position: { x: enemy.x(), y: enemy.y() },
  listener: { x: player.x(), y: player.y() },
});
```

## Studio and Action Battle

Studio stores interface defaults in `audio.ui` and the general Action Battle defaults in `combatAudio`, both in the Project Audio tab. Title-screen presentation belongs to `menus.titleScreen.settings`, with `backgroundMusic` and `backgroundImage`. Maps keep their normal background music and ambience but do not override combat audio. Enemies can override `audio.combat`, and skills keep their dedicated `sound` and `impactSound` fields.

Action Battle resolves sounds in this order:

- cast: skill `sound`, source enemy, project, built-in default;
- impact: skill `impactSound`, source enemy, project, built-in default;
- hurt/defeat: target enemy, project, built-in default.

Combat effects use 2D spatial audio with full volume within 64 pixels, attenuation to silence at 640 pixels, and a maximum stereo pan strength of `0.75`. Battle music is optional: when no enemy or project battle track is configured, map music is not ducked. Music transitions are sequential: the current track fades out before the next track fades in, preventing two background tracks from playing audibly together.

The built-in map renderer registers its BGM with the shared Howler music manager automatically. A custom map renderer can do the same when its source changes:

```ts
engine.music.setMap(map.params.backgroundMusic);
```

Passing `null` or `undefined` stops the owned map track. The manager applies the Music channel gain and coordinates that track with title-screen and battle overrides.

The legacy project `audio.combat` shape and enemy `combatMusic` / `combatMusicPriority` fields remain supported by the runtime.

## Static Sounds

### Basic Configuration

Add sounds to your client module configuration:

```typescript
import { defineModule, RpgClient } from '@rpgjs/client';

export default defineModule<RpgClient>({
  sounds: [
    {
      id: "typewriter",
      src: "typewriter.wav",
    },
    {
      id: "cursor",
      src: "cursor.wav",
    },
    {
      id: "item-pickup",
      src: "sounds/item-pickup.mp3",
    },
  ],
});
```

### Sound Object Structure

A sound object can have the following properties:

```typescript
interface SoundDefinition {
  id: string;           // Unique identifier for the sound
  src: string;          // Path to the audio file
  // Optional: If the sound object has a play() method, it will be used directly
  play?: () => void;    // Custom play method (optional)
  stop?: () => void;    // Custom stop method (optional)
  pause?: () => void;   // Custom pause method (optional)
}
```

If a sound object has a `play()` method, it will be used directly. Otherwise, the engine will create an `Audio` element from the `src` property.

## Playing Sounds from Server

### Using `player.playSound()`

You can play sounds from the server side using the `playSound()` method on a player instance. **This method plays the sound only for the specific player**, making it ideal for personal feedback sounds.

```typescript
/**
 * Play a sound on the client side for this player only
 * @param soundId - Sound identifier, defined on the client side
 * @param options - Optional sound configuration
 * @param options.volume - Volume level (0.0 to 1.0, default: 1.0)
 * @param options.loop - Whether the sound should loop (default: false)
 */
player.playSound(soundId: string, options?: { volume?: number; loop?: boolean }): void
```

### Using `player.stopAllSounds()`

Stop all currently playing sounds for this specific player. This is useful when changing maps or resetting the audio state for a player.

```typescript
/**
 * Stop all currently playing sounds for this player
 * Useful when changing maps to prevent sound overlap.
 */
player.stopAllSounds(): void
```

### Using `map.playSound()`

To play a sound for **all players on the map**, use the `playSound()` method on the map instance. This is ideal for environmental sounds, battle music, or map-wide events.

```typescript
/**
 * Play a sound for all players on the map
 * @param soundId - Sound identifier, defined on the client side
 * @param options - Optional sound configuration
 * @param options.volume - Volume level (0.0 to 1.0, default: 1.0)
 * @param options.loop - Whether the sound should loop (default: false)
 */
map.playSound(soundId: string, options?: { volume?: number; loop?: boolean }): void
```

### Using `map.stopSound()`

Stop a specific sound for all players on the map.

```typescript
/**
 * Stop a sound for all players on the map
 * @param soundId - Sound identifier to stop
 */
map.stopSound(soundId: string): void
```

### Examples

#### Play Sound for Current Player Only

```typescript
// Play item pickup sound only for this player
player.playSound("item-pickup");

// Play a notification sound with custom volume
player.playSound("notification", { volume: 0.5 });

// Play background music for this player with loop
player.playSound("background-music", { volume: 0.7, loop: true });
```

#### Play Sound for All Players on Map

```typescript
// Play an explosion sound for everyone on the map
map.playSound("explosion");

// Play battle music for all players with volume and loop
map.playSound("battle-theme", { volume: 0.8, loop: true });

// Play a door opening sound at low volume
map.playSound("door-open", { volume: 0.4 });
```

### Stopping Sounds

You can stop sounds using `stopSound()` on either the player or map:

```typescript
// Stop a sound for this player
player.stopSound("background-music");

// Stop a sound for all players on the map
map.stopSound("battle-theme");
```

#### Stop All Sounds

You can also stop all currently playing sounds at once:

```typescript
// Stop all sounds for this player
player.stopAllSounds();

// To stop all sounds for all players on a map, iterate through players
const map = player.getCurrentMap();
map?.getPlayers().forEach(p => p.stopAllSounds());
```

This is particularly useful when changing maps to prevent sound overlap. See the [Map Sounds Configuration](#map-sounds-configuration) section below for automatic sound stopping when joining maps.

## Map Sounds Configuration

Maps can automatically play sounds when a player joins. These sounds are configured using the `sounds` property in the map configuration.

### Basic Map Sounds

The simplest way to configure map sounds is using a plain object with `provideServerModules`:

```typescript
import { provideServerModules } from '@rpgjs/server';

provideServerModules([
  {
    maps: [
      {
        id: 'town',
        sounds: ['town-bgm', 'town-ambience'] // These sounds play when player joins
      }
    ]
  }
])
```

### Stop All Sounds Before Joining

By default, sounds from the previous map continue playing when a player changes maps. If you want to stop all sounds before playing the new map's sounds, use the `stopAllSoundsBeforeJoin` option:

```typescript
import { provideServerModules } from '@rpgjs/server';

provideServerModules([
  {
    maps: [
      {
        id: 'battle-map',
        sounds: ['battle-theme'],
        stopAllSoundsBeforeJoin: true // Stop all previous sounds before playing battle theme
      }
    ]
  }
])
```

**When to use `stopAllSoundsBeforeJoin: true`:**
- Battle maps (to cut off peaceful background music)
- Important cutscenes or story moments
- Areas where you want a clean audio transition
- Maps with their own distinct audio atmosphere

**When to keep it `false` (default):**
- Smooth transitions between similar areas
- Continuous ambient sounds that should carry over
- When you want sounds to layer naturally

### Complete Map Sound Example

```typescript
import { provideServerModules } from '@rpgjs/server';

provideServerModules([
  {
    maps: [
      // Peaceful town - sounds continue from previous map
      {
        id: 'town',
        sounds: ['town-bgm']
      },
      
      // Battle arena - stops all sounds for dramatic effect
      {
        id: 'battle-arena',
        sounds: ['battle-theme'],
        stopAllSoundsBeforeJoin: true
      },
      
      // Boss room - stops all sounds and plays boss music
      {
        id: 'boss-room',
        sounds: ['boss-theme'],
        stopAllSoundsBeforeJoin: true
      }
    ]
  }
])
```

### Using defineModule

You can also use `defineModule` to define your server configuration separately:

```typescript
import { defineModule, provideServerModules, type RpgServer } from '@rpgjs/server';

// Define your server module
const serverModule = defineModule<RpgServer>({
  maps: [
    {
      id: 'town',
      sounds: ['town-bgm'],
      stopAllSoundsBeforeJoin: false
    }
  ]
});

// Then use it with provideServerModules
provideServerModules([serverModule])
```

### Alternative: Using @MapData or @RpgModule (Legacy)

For backward compatibility, you can still use decorators, though plain objects are now the recommended approach:

```typescript
import { MapData, RpgMap } from '@rpgjs/server';

@MapData({
  id: 'town',
  sounds: ['town-bgm', 'town-ambience'],
  stopAllSoundsBeforeJoin: false
})
class TownMap extends RpgMap {}
```

Or with `@RpgModule`:

```typescript
import { RpgServer, RpgModule } from '@rpgjs/server';

@RpgModule<RpgServer>({
  maps: [
    {
      id: 'town',
      sounds: ['town-bgm']
    }
  ]
})
class MyServerModule {}
```

> **Note:** Using plain objects with `provideServerModules` or `defineModule` is the recommended approach. Decorators are still supported for backward compatibility but not required.

### Use Cases

**Using `map.playSound()` (for all players):**
- Environmental sounds (explosions, doors opening)
- Battle sounds (combat start, victory fanfare)
- Map-wide events (boss spawn, treasure chest opening)
- Ambient effects that should be synchronized
- Background music that everyone should hear

**Using `player.playSound()` (for current player only):**
- UI feedback sounds (menu navigation, button clicks)
- Personal notifications (level up, achievement unlocked)
- Item pickup sounds (only the player who picked it up hears it)
- Private messages or alerts
- Personal background music

### Complete Example

```typescript
import { provideServerModules, RpgPlayer, RpgPlayerHooks, RpgMap, RpgEvent } from '@rpgjs/server';

provideServerModules([
  {
    player: {
      async onConnected(player: RpgPlayer) {
        // Stop all sounds when player first connects (clean state)
        player.stopAllSounds();
        
        // Play welcome sound for this player only
        player.playSound("welcome", { volume: 0.6 });
      },

      async onLevelUp(player: RpgPlayer) {
        // Play level up sound for this player only
        player.playSound("level-up", { volume: 0.8 });
        
        // Show level up animation
        player.showComponentAnimation("level-up", {
          text: `Level ${player.level}`,
          color: "gold"
        });
      },

      async onTouchEvent(player: RpgPlayer, event: RpgEvent) {
        if (event.name === "Treasure Chest") {
          const map = player.getCurrentMap();
          
          // Play chest opening sound for everyone on the map
          map?.playSound("chest-open", { volume: 0.7 });
          
          // Play item pickup sound only for this player
          player.playSound("item-pickup", { volume: 0.5 });
        }
      },

      async onBattleStart(player: RpgPlayer) {
        const map = player.getCurrentMap();
        
        // Play battle music for everyone with loop
        map?.playSound("battle-theme", { volume: 0.8, loop: true });
      },

      async onBattleEnd(player: RpgPlayer) {
        const map = player.getCurrentMap();
        
        // Stop battle music for everyone
        map?.stopSound("battle-theme");
        
        // Play victory sound for this player
        player.playSound("victory", { volume: 1.0 });
      }
    },
    
    maps: [
      {
        id: 'town',
        sounds: ['town-bgm'],
        stopAllSoundsBeforeJoin: false
      },
      {
        id: 'battle-arena',
        sounds: ['battle-theme'],
        stopAllSoundsBeforeJoin: true
      }
    ]
  }
]);
```

## Dynamic Sound Resolver

The sound resolver allows you to create sounds on-the-fly when they are requested but not found in the cache. This is useful for:

- Loading sounds from external APIs
- Generating sounds programmatically
- Creating sounds based on runtime data
- Lazy loading sounds to reduce initial load time

### Configuration

Add a `soundResolver` function to your client module:

```typescript
import { defineModule, RpgClient } from '@rpgjs/client';

export default defineModule<RpgClient>({
  soundResolver: (id: string) => {
    // Synchronous resolver
    if (id === 'dynamic-sound') {
      return {
        id: 'dynamic-sound',
        src: 'path/to/sound.mp3'
      };
    }
    return undefined; // Return undefined if sound cannot be created
  },
});
```

### Asynchronous Resolver

The resolver can also be asynchronous, useful for loading sounds from APIs or files:

```typescript
export default defineModule<RpgClient>({
  soundResolver: async (id: string) => {
    // Load from API
    try {
      const response = await fetch(`/api/sounds/${id}`);
      if (!response.ok) {
        return undefined;
      }
      const soundData = await response.json();
      return {
        id: id,
        src: soundData.url,
      };
    } catch (error) {
      console.error(`Failed to load sound ${id}:`, error);
      return undefined;
    }
  },
});
```

### Programmatic Generation

You can also generate sounds programmatically:

```typescript
export default defineModule<RpgClient>({
  soundResolver: (id: string) => {
    // Generate sound path based on ID pattern
    if (id.startsWith('footstep-')) {
      const surface = id.split('-')[1]; // e.g., 'footstep-grass'
      return {
        id: id,
        src: `sounds/footsteps/${surface}.mp3`,
      };
    }
    
    // Generate sound for weapon types
    if (id.startsWith('weapon-')) {
      const weaponType = id.split('-')[1];
      return {
        id: id,
        src: `sounds/weapons/${weaponType}/swing.mp3`,
      };
    }
    
    return undefined;
  },
});
```

### How It Works

1. When a sound is requested (e.g., via `player.playSound()`), the engine first checks the cache
2. If the sound is not found and a resolver is configured, the resolver is called with the sound ID
3. The resolved sound is automatically cached for future use
4. If the resolver returns `undefined` or `null`, the sound is not found and a warning is logged

### Resolver Function Signature

```typescript
type SoundResolver = (id: string) => SoundDefinition | Promise<SoundDefinition> | undefined | null;
```

**Parameters:**
- `id: string` - The sound ID that was requested

**Returns:**
- `SoundDefinition` - A sound configuration object (synchronous)
- `Promise<SoundDefinition>` - A Promise that resolves to a sound (asynchronous)
- `undefined | null` - Indicates the sound cannot be created

### Programmatic API

You can also set a resolver programmatically using the engine:

```typescript
import { RpgClientEngine, inject } from '@rpgjs/client';

// In a hook or initialization code
const engine = inject(RpgClientEngine);

engine.setSoundResolver((id: string) => {
  // Your resolver logic
  return soundDefinition;
});
```

### Example: Loading from CDN

```typescript
export default defineModule<RpgClient>({
  soundResolver: async (id: string) => {
    const cdnUrl = `https://cdn.example.com/sounds/${id}.mp3`;
    
    try {
      // Verify the sound exists
      const response = await fetch(cdnUrl, { method: 'HEAD' });
      if (!response.ok) {
        return undefined;
      }
      
      return {
        id: id,
        src: cdnUrl,
      };
    } catch (error) {
      console.warn(`Sound ${id} not found on CDN`);
      return undefined;
    }
  },
});
```

### Example: Fallback Chain

```typescript
export default defineModule<RpgClient>({
  soundResolver: async (id: string) => {
    // Try local assets first
    try {
      const localPath = `/assets/sounds/${id}.mp3`;
      const response = await fetch(localPath, { method: 'HEAD' });
      if (response.ok) {
        return {
          id: id,
          src: localPath,
        };
      }
    } catch (error) {
      // Continue to fallback
    }
    
    // Fallback to CDN
    try {
      const cdnUrl = `https://cdn.example.com/sounds/${id}.mp3`;
      const response = await fetch(cdnUrl, { method: 'HEAD' });
      if (response.ok) {
        return {
          id: id,
          src: cdnUrl,
        };
      }
    } catch (error) {
      // Continue to fallback
    }
    
    // Fallback to default sound
    if (id.startsWith('footstep-')) {
      return {
        id: id,
        src: '/assets/sounds/default-footstep.mp3',
      };
    }
    
    return undefined;
  },
});
```

## Combining Static and Dynamic

You can use both static sounds and a resolver together. Static sounds are loaded first, and the resolver is only called for sounds not found in the static list:

```typescript
export default defineModule<RpgClient>({
  // Pre-loaded sounds
  sounds: [
    { id: 'menu-click', src: 'sounds/menu-click.mp3' },
    { id: 'notification', src: 'sounds/notification.mp3' },
  ],
  
  // Resolver for dynamic sounds
  soundResolver: async (id: string) => {
    // Only called for sounds not in the static list above
    if (id.startsWith('dynamic-')) {
      return await loadDynamicSound(id);
    }
    return undefined;
  },
});
```

## Client-Side Sound API

You can also play sounds directly from the client side using the engine:

```typescript
import { RpgClientEngine, inject } from '@rpgjs/client';

// In a client hook or component
const engine = inject(RpgClientEngine);

// Play a sound
await engine.playSound('item-pickup');

// Play a sound with volume and loop
await engine.playSound('background-music', { volume: 0.6, loop: true });

// Stop a sound
engine.stopSound('background-music');

// Get a sound (with resolver support)
const sound = await engine.getSound('dynamic-sound');
if (sound && sound.play) {
  sound.play();
}
```

## Best Practices

### 1. Sound File Formats

- Use compressed formats (MP3, OGG) for better performance
- Provide multiple formats for browser compatibility:
  ```typescript
  {
    id: 'background-music',
    src: 'music.ogg', // Fallback to MP3 if OGG not supported
  }
  ```

### 2. Error Handling

Always handle errors gracefully in async resolvers:

```typescript
soundResolver: async (id: string) => {
  try {
    // Load sound
    return sound;
  } catch (error) {
    console.error(`Error loading sound ${id}:`, error);
    return undefined;
  }
}
```

### 3. Performance

- Use static sounds for frequently played sounds (UI feedback, common actions)
- Use resolvers for sounds that are rarely used or loaded on-demand
- Pre-load critical sounds in the static `sounds` array

### 4. ID Patterns

Use consistent ID patterns to make resolver logic easier:

```typescript
soundResolver: (id: string) => {
  // Pattern: category-type-variant
  // Example: weapon-sword-swing, weapon-axe-swing
  const [category, type, variant] = id.split('-');
  
  if (category === 'weapon') {
    return {
      id: id,
      src: `sounds/${category}/${type}/${variant}.mp3`,
    };
  }
  
  return undefined;
}
```

### 5. Volume Management

Consider implementing volume controls:

```typescript
// In your sound resolver or sound object
{
  id: 'background-music',
  src: 'music.mp3',
  volume: 0.5, // 50% volume
}
```

### 6. Memory Management

Resolved sounds are automatically cached. If you need to invalidate the cache:

```typescript
engine.sounds.delete('sound-id');
```

## Common Use Cases

### Dialog Box Sounds

```typescript
// In your client module
sounds: [
  {
    id: "typewriter",
    src: "typewriter.wav",
  },
  {
    id: "cursor",
    src: "cursor.wav",
  },
],

// In your global config
box: {
  sounds: {
    typewriter: "typewriter",
    cursorMove: "cursor",
    cursorSelect: "cursor",
  }
}
```

### Footstep Sounds

```typescript
// Server-side: Play footstep sound based on terrain
const player: RpgPlayerHooks = {
  async onMove(player: RpgPlayer) {
    const terrain = player.getCurrentMap().getTerrainAt(player.x(), player.y());
    player.playSound(`footstep-${terrain}`, false); // Only for this player
  }
};

// Client-side: Resolver for footstep sounds
soundResolver: (id: string) => {
  if (id.startsWith('footstep-')) {
    const surface = id.split('-')[1];
    return {
      id: id,
      src: `sounds/footsteps/${surface}.mp3`,
    };
  }
  return undefined;
}
```

### Weapon Sounds

```typescript
// Server-side: Play weapon sound when attacking
const player: RpgPlayerHooks = {
  async onAttack(player: RpgPlayer, target: RpgPlayer) {
    const weapon = player.getEquippedWeapon();
    if (weapon) {
      player.playSound(`weapon-${weapon.type}-swing`, true); // Everyone hears it
      player.playSound(`weapon-${weapon.type}-hit`, true);   // Everyone hears it
    }
  }
};
```

## See Also

- [Spritesheets Guide](/guide/spritesheets) - Learn about dynamic spritesheet resolution (similar pattern)
- [Display Animations Guide](/guide/display-animations) - Combine sounds with visual effects
- [Dialog Box Guide](/gui/dialog-box) - Using sounds in dialog boxes
