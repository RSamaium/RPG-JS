import { RpgClientEngine } from "@rpgjs/client";
import { Presets } from "@rpgjs/client";
import { assetsUrl } from "./constants";
import { LPCSpritesheetPreset } from "./spritesheets/lpc";
import { CharacterSpritesheet } from "./spritesheets/character";
import { Animation, Direction } from "./spritesheets/types";
import { getGameDataProvider } from "./data-provider";
import { Assets } from "pixi.js";
import { loadedCharacterHeight, loadedCharacterFrames, characterFrameTransform } from "./character-proportions";

export const STUDIO_DEFAULT_CHARACTER_DISPLAY_SCALE = 0.7;
export const STUDIO_DEFAULT_ATTACK_ANIMATION_DURATION_MS = 350;

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
      if (media.metadata?.generationMode === "idle") {
        const directions = Array.isArray(media.metadata.idleDirections)
          ? media.metadata.idleDirections
          : [Direction.Down, Direction.Left, Direction.Right, Direction.Up];
        const columns = media.metadata.columns ?? 2;
        const rows = media.metadata.rows ?? 2;
        const width = media.width ?? media.metadata.width ?? 1024;
        const height = media.height ?? media.metadata.height ?? 768;
        const cellSize = Math.max(width / columns, height / rows);
        const stand = {
          animations: ({ direction }: { direction: Direction }) => {
            const index = Math.max(0, directions.indexOf(direction));
            return [[{ time: 0, frameX: index % columns, frameY: Math.floor(index / columns) }]];
          },
        };
        return {
          id,
          image: url,
          framesWidth: columns,
          framesHeight: rows,
          scale: [1, 1],
          displayScale: (128 / cellSize) *
            (typeof media.metadata.scale === "number" ? media.metadata.scale : 1),
          textures: {
            [Animation.Stand]: stand,
            [Animation.Walk]: stand,
          },
        };
      }
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
          frameDurationMs:
            typeof media.metadata?.frameDurationMs === "number"
              ? media.metadata.frameDurationMs
              : undefined,
          lanes: Array.isArray(media.metadata?.lanes)
            ? media.metadata.lanes
            : undefined,
          attackDurationMs:
            typeof media.metadata?.attackDurationMs === "number"
              ? media.metadata.attackDurationMs
              : STUDIO_DEFAULT_ATTACK_ANIMATION_DURATION_MS,
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
      const faceset = Presets.FacesetPreset({
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
      return {
        ...faceset,
        textures: {
          ...faceset.textures,
          // RPGJS UI components request `default` when no expression is set.
          default: faceset.textures.neutral,
        },
      };
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
    case "illustration": {
      const iconTexture = {
        animations: () => [[{ time: 0, frameX: 0, frameY: 0 }]],
      };
      return {
        id,
        image: url,
        width: media.width,
        height: media.height,
        framesWidth: 1,
        framesHeight: 1,
        textures: {
          default: iconTexture,
          stand: iconTexture,
        },
      };
    }
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

export const attachCharacterAnimations = async (
  spritesheet: any,
  idleMedia: any,
  animations: any[],
): Promise<any> => {
  if (idleMedia.metadata?.generationMode !== "idle") return spritesheet;
  const textures = { ...spritesheet.textures };
  for (const media of animations) {
    const name = media.metadata?.name?.trim()?.toLowerCase();
    if (!name || !media.fileName || media.metadata?.groupId !== (idleMedia._id ?? idleMedia.id)) continue;
    const animation = name === "walk" ? Animation.Walk : name === "attack" ? Animation.Attack : name;
    const sheet = await createSpriteSheetObject(media);
    const texture = sheet?.textures?.[animation] ?? sheet?.textures?.[Animation.Walk];
    if (!texture) continue;
    const idleScale = typeof idleMedia.metadata.scale === "number" ? idleMedia.metadata.scale : 1;
    const animationScale = typeof media.metadata.scale === "number" ? media.metadata.scale : idleScale;
    textures[animation] = {
      ...texture,
      image: sheet.image,
      framesWidth: sheet.framesWidth,
      framesHeight: sheet.framesHeight,
      scale: [animationScale / idleScale, animationScale / idleScale],
    };
  }
  return { ...spritesheet, textures };
};

/** Resolve linked animations and await their images before exposing a sprite to the client. */
export const prepareSpriteSheetObject = async (media: any, id?: string): Promise<any> => {
  let spritesheet = await createSpriteSheetObject(media, id);
  if (!spritesheet) return null;
  let parentSheet: any;
  let parentMedia: any;
  if (media.type === "spritesheet" && media.metadata?.groupId && media.metadata?.generationMode !== "idle") {
    parentMedia = await getGameDataProvider().getMedia(media.metadata.groupId);
    if (parentMedia?.metadata?.generationMode === "idle") {
      parentSheet = await createSpriteSheetObject(parentMedia);
    }
  }
  if (media.metadata?.generationMode === "idle") {
    let animations: any[] = [];
    try {
      animations = await getGameDataProvider().getMediaGroup?.(media._id ?? media.id ?? id) ?? [];
    } catch (error) {
      console.warn(`Could not load animations for character ${id}:`, error);
    }
    spritesheet = await attachCharacterAnimations(spritesheet, media, animations);
  }
  const images = new Set<string>();
  if (parentSheet?.image) images.add(parentSheet.image);
  if (spritesheet.image) images.add(spritesheet.image);
  for (const texture of Object.values(spritesheet.textures ?? {}) as Array<{ image?: string }>) {
    if (texture.image) images.add(texture.image);
  }
  await Promise.all([...images].map(async (image) => {
    try {
      await Assets.load(image);
    } catch {
      // Direct file-name graphics may not be registered with Pixi yet.
    }
  }));
  if (parentSheet) {
    const idleHeight = loadedCharacterHeight(parentSheet.image, parentSheet.framesWidth, parentSheet.framesHeight);
    const animationHeight = loadedCharacterHeight(spritesheet.image, spritesheet.framesWidth, spritesheet.framesHeight);
    const baseScale = parentMedia.metadata.scale ?? 1;
    const proportion = idleHeight && animationHeight
      ? idleHeight / animationHeight
      : (media.metadata.scale ?? baseScale) / baseScale;
    spritesheet.displayScale = parentSheet.displayScale * proportion;
  }
  if (media.metadata?.generationMode === "idle") {
    const idleHeight = loadedCharacterHeight(spritesheet.image, spritesheet.framesWidth, spritesheet.framesHeight);
    if (idleHeight) {
      for (const texture of Object.values(spritesheet.textures) as Array<{ image?: string; framesWidth: number; framesHeight: number; scale?: number[] }>) {
        if (!texture.image) continue;
        const animationHeight = loadedCharacterHeight(texture.image, texture.framesWidth, texture.framesHeight);
        if (animationHeight) texture.scale = [idleHeight / animationHeight, idleHeight / animationHeight];
      }
    }
  }
  // Calibrate each direction from its first pose, never from attack effects in
  // later frames. The same path handles linked and explicitly selected attacks.
  const referenceSheet = parentSheet ?? (media.metadata?.generationMode === "idle" ? spritesheet : undefined);
  if (referenceSheet) {
    const referenceFrames = loadedCharacterFrames(referenceSheet.image, referenceSheet.framesWidth, referenceSheet.framesHeight);
    if (referenceFrames.length) {
      const referenceAnimation = referenceSheet.textures[Animation.Stand].animations;
      let calibrated = false;
      const frameCache = new Map<string, ReturnType<typeof loadedCharacterFrames>>();
      type Frame = { frameX?: number; frameY?: number; time: number };
      type Texture = {
        image?: string; framesWidth?: number; framesHeight?: number;
        animations: (params: { direction: Direction }) => Frame[][];
      };
      for (const [name, texture] of Object.entries(spritesheet.textures) as Array<[string, Texture]>) {
        const image = texture.image ?? spritesheet.image;
        const columns = texture.framesWidth ?? spritesheet.framesWidth;
        const rows = texture.framesHeight ?? spritesheet.framesHeight;
        const key = `${image}:${columns}:${rows}`;
        if (!frameCache.has(key)) frameCache.set(key, loadedCharacterFrames(image, columns, rows));
        const bounds = frameCache.get(key)!;
        if (!bounds.some(Boolean)) continue;
        calibrated = true;
        const animations = texture.animations;
        spritesheet.textures[name] = {
          ...texture,
          animations: (params: { direction: Direction }) => {
            const groups = animations(params);
            const first = groups[0]?.find(frame => frame.frameX != null && frame.frameY != null);
            const reference = referenceAnimation(params)[0]?.[0];
            const sourceBounds = first && bounds[first.frameY! * columns + first.frameX!];
            const targetBounds = reference && referenceFrames[reference.frameY * referenceSheet.framesWidth + reference.frameX];
            if (!sourceBounds || !targetBounds) return groups;
            const transform = characterFrameTransform(targetBounds, sourceBounds);
            return groups.map(group => group.map(frame => ({ ...frame, ...transform })));
          },
        };
      }
      if (calibrated) spritesheet.displayScale = referenceSheet.displayScale;
    }
  }
  return spritesheet;
};

/**
 * Resolves spritesheet by fetching media data from the API.
 */
export const resolveSpritesheet = async (id: string): Promise<any> => {
  if (typeof id !== "string" || !id.trim()) return null;
  try {
    const rawId = id.startsWith('#') ? id.slice(1) : id;
    const normalizedId = rawId.startsWith('spritesheet_') ? rawId.slice('spritesheet_'.length) : rawId;

    try {
      const media = await getGameDataProvider().getMedia(normalizedId);
      if (media && !media.__placeholder) {
        return await prepareSpriteSheetObject(media, normalizedId);
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
      return await prepareSpriteSheetObject(media, normalizedId);
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
      src: url,
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
      src: url,
    });
    console.log('Add Sound:', id, url);
  } else {
    console.warn(`Invalid media type for sound: ${media.type}. Expected bgs, bgm, or sound.`);
  }
};
