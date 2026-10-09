import { Howler } from 'canvasengine';
import { RpgClientEngine } from './RpgClientEngine';
import { inject } from './core/inject';

/**
 * Sound decorator options
 * 
 * Defines the configuration for a sound that can be played in the game.
 * The sound can be a single file or multiple files (for different formats).
 * 
 * @interface SoundOptions
 */
export interface SoundOptions {
  /**
   * Sound identifier. Used to retrieve the sound later with RpgSound.get()
   * 
   * @type {string}
   */
  id?: string;

  /**
   * Single sound file path. Use require() to wrap the path.
   * 
   * @type {string}
   * @example
   * sound: require('./assets/sound.ogg')
   */
  sound?: string;

  /**
   * Multiple sounds with different IDs. The key is the sound ID and the value is the file path.
   * Use require() to wrap each path.
   * 
   * @type {{ [id: string]: string }}
   * @example
   * sounds: {
   *   hero: require('./assets/hero.ogg'),
   *   monster: require('./assets/monster.ogg')
   * }
   */
  sounds?: { [id: string]: string };

  /**
   * Whether the sound should loop when it finishes playing.
   * 
   * @type {boolean}
   * @default false
   */
  loop?: boolean;

  /**
   * Volume level (0.0 to 1.0).
   * 
   * @type {number}
   * @default 1.0
   */
  volume?: number;
}

/**
 * Metadata stored on the class decorated with @Sound
 * 
 * @interface SoundMetadata
 */
interface SoundMetadata {
  id?: string;
  sound?: string;
  sounds?: { [id: string]: string };
  loop?: boolean;
  volume?: number;
}

const SOUND_METADATA_KEY = Symbol('rpgjs:sound');

/**
 * Sound decorator
 * 
 * Decorates a class to define a sound configuration. The decorated class can be
 * added to the RpgClient module configuration, and the sound will be automatically
 * registered and available through RpgSound.get().
 * 
 * ## Design
 * 
 * The decorator stores metadata on the class that is later used by the module loader
 * to register sounds with the engine. The sound is created using Howler.js for
 * advanced audio features like looping, volume control, and cross-browser compatibility.
 * 
 * @param options - Sound configuration options
 * 
 * @example
 * ```ts
 * import { Sound } from '@rpgjs/client'
 * 
 * @Sound({
 *   id: 'town-music',
 *   sound: require('./sound/town.ogg'),
 *   loop: true,
 *   volume: 0.5
 * })
 * export class TownMusic {}
 * 
 * // Multiple sounds in one class
 * @Sound({
 *   sounds: {
 *     hero: require('./assets/hero.ogg'),
 *     monster: require('./assets/monster.ogg')
 *   },
 *   loop: true
 * })
 * export class CharacterSounds {}
 * ```
 */
export function Sound(options: SoundOptions) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    const metadata: SoundMetadata = {
      id: options.id,
      sound: options.sound,
      sounds: options.sounds,
      loop: options.loop,
      volume: options.volume,
    };

    // Store metadata on the class
    (constructor as any)[SOUND_METADATA_KEY] = metadata;

    return constructor;
  };
}

/**
 * Get sound metadata from a decorated class
 * 
 * @param soundClass - The class decorated with @Sound
 * @returns The sound metadata or undefined
 */
export function getSoundMetadata(soundClass: any): SoundMetadata | undefined {
  return (soundClass as any)[SOUND_METADATA_KEY];
}

/**
 * RpgSound class
 * 
 * Provides a unified API to manage sounds in the game. Uses Howler.js internally
 * for advanced audio features. Sounds can be retrieved by ID and controlled
 * using Howler.js methods.
 * 
 * ## Design
 * 
 * RpgSound acts as a facade over Howler.js, providing easy access to sounds
 * registered in the engine. It supports both individual sound control and
 * global sound management (volume, mute, etc.).
 * 
 * @example
 * ```ts
 * import { RpgSound } from '@rpgjs/client'
 * 
 * // Play a sound
 * RpgSound.get('town-music').play()
 * 
 * // Control volume
 * RpgSound.get('town-music').volume(0.5)
 * 
 * // Stop a sound
 * RpgSound.get('town-music').stop()
 * 
 * // Global volume control
 * RpgSound.global.volume(0.2)
 * ```
 */
export class RpgSound {
  private static engine: RpgClientEngine | null = null;
  private static readonly globalFacade = new Proxy(Howler as any, {
    get(target, property) {
      if (property === "volume") {
        return (value?: number) => {
          if (value === undefined) {
            return RpgSound.engine?.getSoundVolume("master") ?? target.volume();
          }
          if (RpgSound.engine) {
            RpgSound.engine.setSoundVolume("master", value);
          } else {
            target.volume(value);
          }
          return target;
        };
      }
      const value = Reflect.get(target, property);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });

  /**
   * Initialize RpgSound with the engine instance
   * 
   * This is called automatically by the engine during initialization.
   * 
   * @param engine - The RpgClientEngine instance
   */
  static init(engine: RpgClientEngine): void {
    RpgSound.engine = engine;
  }

  /**
   * Get a sound by its ID
   * 
   * Retrieves a Howler sound instance from the engine's sound cache.
   * The sound must be registered beforehand (via @Sound decorator or manually).
   * 
   * @param id - The sound identifier
   * @returns The Howler sound instance, or undefined if not found
   * 
   * @example
   * ```ts
   * // Get and play a sound
   * const sound = RpgSound.get('town-music');
   * if (sound) {
   *   sound.play();
   * }
   * 
   * // Chain methods
   * RpgSound.get('battle-theme')?.volume(0.8).play();
   * ```
   */
  static get(id: string): any {
    if (!RpgSound.engine) {
      console.warn('RpgSound not initialized. Make sure the engine has started.');
      return undefined;
    }

    const sound = RpgSound.engine.sounds.get(id);
    if (!sound) {
      console.warn(`Sound with id "${id}" not found`);
      return undefined;
    }

    // If the sound is a Howler instance, return it directly
    if (sound && typeof sound.play === 'function') {
      return sound;
    }

    // If the sound has a src property, try to create a Howler instance
    if (sound && sound.src) {
      // This should have been handled during addSound, but just in case
      return sound;
    }

    return sound;
  }

  /**
   * Global Howler instance for managing all sounds
   * 
   * Provides access to Howler.js global methods for controlling all sounds
   * at once (volume, mute, etc.). `volume()` is kept as a backward-compatible
   * alias of the persisted RPGJS Master channel.
   * 
   * @example
   * ```ts
   * // Set global volume to 20%
   * RpgSound.global.volume(0.2)
   * 
   * // Mute all sounds
   * RpgSound.global.mute(true)
   * 
   * // Unmute all sounds
   * RpgSound.global.mute(false)
   * ```
   */
  static get global(): typeof Howler {
    return RpgSound.globalFacade;
  }
}
