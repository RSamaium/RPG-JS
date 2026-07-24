import { RpgClientEngine } from "@rpgjs/client";
import { Presets } from "@rpgjs/client";
import { assetsUrl } from "./constants";
import { LPCSpritesheetPreset } from "./spritesheets/lpc";
import { CharacterSpritesheet } from "./spritesheets/character";
import { getGameDataProvider } from "./data-provider";

export const STUDIO_DEFAULT_CHARACTER_DISPLAY_SCALE = 0.7;

const resolveCharacterDisplayScale = (scale: unknown): number => {
  return typeof scale === "number"
    ? STUDIO_DEFAULT_CHARACTER_DISPLAY_SCALE * scale
    : STUDIO_DEFAULT_CHARACTER_DISPLAY_SCALE;
};

const isAbsolutePath = (value: string): boolean => {
  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/") ||
    value.startsWith("data:") ||
    value.startsWith("blob:")
  );
};

export const resolveAssetSource = (fileName?: string): string => {
  if (!fileName) return "";
  if (isAbsolutePath(fileName)) return fileName;
  return `${assetsUrl}/${fileName}`;
};

/**
 * Generates a looping animation sequence based on frame dimensions
 *
 * @param framesWidth - Number of frames horizontally
 * @param framesHeight - Number of frames vertically
 * @param speed - Speed multiplier for animation timing
 * @returns An array of animation frames with time, frameX, and frameY properties
 *
 * @example
 * ```ts
 * const animationFrames = generateLoopAnimation(4, 4, 50);
 * // Returns frames with appropriate time values and coordinates
 * ```
 */
const generateLoopAnimation = (
  framesWidth: number,
  framesHeight: number,
  speed: number = 5
) => {
  const frames: any[] = [];

  for (let y = 0; y < framesHeight; y++) {
    for (let x = 0; x < framesWidth; x++) {
      const frameIndex = y * framesWidth + x;
      frames.push({
        time: frameIndex * speed,
        frameX: x,
        frameY: y,
      });
    }
  }

  return frames;
};

/**
 * Creates a spritesheet object configuration based on media type
 * 
 * This function generates the appropriate spritesheet configuration object
 * for different media types (character, spritesheet, faceset, animation)
 * without adding it to the client.
 * 
 * @param media - Media object containing type, metadata, etc.
 * @param spritesheetId - Optional custom ID for the spritesheet (defaults to #type_id format)
 * @returns Promise that resolves with the spritesheet configuration object or null for unsupported types
 * 
 * @example
 * ```ts
 * const spritesheetObj = await createSpriteSheetObject(mediaData, "#spritesheet_123");
 * if (spritesheetObj) {
 *   client.addSpriteSheet(spritesheetObj);
 * }
 * ```
 */
export const createSpriteSheetObject = async (
  media: any,
  spritesheetId?: string
): Promise<any> => {
  const id = spritesheetId || `#${media.type}_${media.id ?? media._id}`;
  const url = resolveAssetSource(media.fileName);

  switch (media.type) {
    case "character":
    case "spritesheet":
      if (media.metadata?.lpc) {
        const scale =
          typeof media.metadata?.scale === "number"
            ? media.metadata.scale
            : undefined;
        const spritesheet = LPCSpritesheetPreset({
          id,
          imageSource: url,
        });
        return {
          ...spritesheet,
          displayScale: resolveCharacterDisplayScale(scale),
          ...(media.metadata?.fourDirections === true
            ? { trimTransparentBounds: true }
            : {}),
        };
      } else {
        const scale =
          typeof media.metadata?.scale === "number"
            ? media.metadata.scale
            : undefined;
        
        const spritesheet = CharacterSpritesheet({
          id,
          imageSource: url,
          framesWidth: media.metadata?.frameWidth ?? 4,
          framesHeight: media.metadata?.frameHeight ?? 4,
        });
        return {
          ...spritesheet,
          displayScale: resolveCharacterDisplayScale(scale),
          ...(media.metadata?.fourDirections === true
            ? { trimTransparentBounds: true }
            : {}),
        };

      }
    case "faceset":
      return Presets.FacesetPreset({
        id,
        image: url,
      }, 3, 4, {
        // 1ère ligne (0,0), (1,0), (2,0)
        neutral: [0, 0],      // Neutre – expression de base sans émotion visible
        tired: [1, 0],        // Fatigué(e) – yeux mi-clos, léger soupir
        thoughtful: [2, 0],    // Pensif(ve) – regard ailleurs, réflexion

        // 2ème ligne (0,1), (1,1), (2,1)
        happy: [0, 1],        // Heureux(se) – grand sourire, yeux brillants
        playful: [1, 1],      // Enjoué(e)/taquin(e) – sourire malicieux, sourcils relevés
        relieved: [2, 1],     // Soulagé(e) – exhale un soupir, sourire rassuré

        // 3ème ligne (0,2), (1,2), (2,2)
        angry: [0, 2],        // En colère – sourcils froncés, bouche crispée
        annoyed: [1, 2],      // Agacé(e) – roulement d'yeux, air blasé
        suspicious: [2, 2],   // Méfiant(e) – sourcils baissés, regard de côté

        // 4ème ligne (0,3), (1,3), (2,3)
        sad: [0, 3],          // Triste – regard baissé, lèvres tremblantes
        terrified: [1, 3],    // Terrifié(e) – yeux grands ouverts, tremblements
        ashamed: [2, 3]       // Honteux(se)/mal à l'aise – rougissement, évite le regard
      });
    case "animation":
      return {
        id,
        image: url,
        framesWidth: media.framesWidth ?? 4,
        framesHeight: media.framesHeight ?? 4,
        textures: {
          default: {
            animations: () => [
              generateLoopAnimation(
                media.framesWidth ?? 4,
                media.framesHeight ?? 4,
                media.speed
              ),
            ],
          },
        },
      };
    case "icon":
      return {
        id,
        image: url,
        width: media.width,
        height: media.height,
        framesWidth: 1,
        framesHeight: 1,
        textures: {
          stand: {
            animations: () => [[{ time: 0, frameX: 0, frameY: 0 }]],
          },
        },
      };
    case "bgs":
    case "bgm":
    case "sound":
      // Sounds are handled separately, not as spritesheets
      return null;
    default:
      console.warn(`Unknown media type: ${media.type}`);
      return null;
  }
};

/**
 * Resolves spritesheet by fetching media data from the API.
 */
export const resolveSpritesheet = async (id: string): Promise<any> => {
  try {
    const rawId = id.startsWith('#') ? id.slice(1) : id;
    const normalizedId = rawId.startsWith('spritesheet_') ? rawId.slice('spritesheet_'.length) : rawId;

    try {
      const media = await getGameDataProvider().getMedia(normalizedId);
      if (media && !media.__placeholder) {
        return await createSpriteSheetObject(media, normalizedId);
      }
    } catch {
      // File-name graphics can be direct asset references rather than media ids.
    }

    if (normalizedId.includes('.') || normalizedId.includes('/')) {
      const media = {
        type: "spritesheet",
        fileName: normalizedId,
        metadata: {
          frameWidth: 4,
          frameHeight: 4
        }
      };
      return await createSpriteSheetObject(media, normalizedId);
    }

    return null;
  } catch (error) {
    console.error(`Error resolving spritesheet ${id}:`, error);
    return null;
  }
};

/**
 * Centralized function to add spritesheets to the RPGJS client
 * 
 * This function handles all spritesheet types (character, spritesheet, faceset, animation)
 * and adds them to the client with the appropriate configuration.
 * 
 * @param client - The RpgClientEngine instance
 * @param media - Media object containing type, metadata, etc.
 * @param spritesheetId - Optional custom ID for the spritesheet (defaults to #type_id format)
 * 
 * @example
 * ```ts
 * await addSpriteSheetToClient(client, mediaData, "#spritesheet_123");
 * ```
 */
export const addSpriteSheetToClient = async (
  client: RpgClientEngine,
  media: any,
  spritesheetId?: string
): Promise<void> => {
  const id = spritesheetId || `#${media.type}_${media.id ?? media._id}`;
  const url = resolveAssetSource(media.fileName);

  // Handle sounds separately
  if (media.type === "bgs" || media.type === "bgm" || media.type === "sound") {
    client.addSound({
      id,
      file: url,
    });
    return;
  }

  const spritesheetObj = await createSpriteSheetObject(media, spritesheetId);
  if (spritesheetObj) {
    client.addSpriteSheet(spritesheetObj);
  }
};

/**
 * Centralized function to add sounds to the RPGJS client
 * 
 * This function handles all sound types (bgs, bgm, sound) and adds them
 * to the client with the appropriate configuration.
 * 
 * @param client - The RpgClientEngine instance
 * @param media - Media object containing type, fileName, etc.
 * @param soundId - Optional custom ID for the sound (defaults to #type_id format)
 * 
 * @example
 * ```ts
 * await addSoundToClient(client, mediaData, "#sound_123");
 * ```
 */
export const addSoundToClient = (
  client: RpgClientEngine,
  media: any,
  soundId?: string
): void => {
  const id = soundId || `#${media.type}_${media.id ?? media._id}`;
  const url = resolveAssetSource(media.fileName);

  if (media.type === "bgs" || media.type === "bgm" || media.type === "sound") {
    client.addSound({
      id,
      file: url,
    });
    console.log('Add Sound:', id, url);
  } else {
    console.warn(`Invalid media type for sound: ${media.type}. Expected bgs, bgm, or sound.`);
  }
};
