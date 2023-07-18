import { constructor } from "@rpgjs/types"
import { ClassDeclaration } from "typescript"

export interface TransformOptions {
    /** 
     * The global value of opacity (between 0 and 1)
     * 
     * @prop {number} [opacity]
     * @memberof Spritesheet
     * */
    opacity?: number
    /** 
     * The global value of pivot.
     * 
     * Invariant under rotation, scaling, and skewing. The projection of into the parent's space of the pivot is equal to position, regardless of the other three transformations. In other words, It is the center of rotation, scaling, and skewing.
     * 
     * The array has two elements: [x, y].  If y is omitted, both x and y will be set to x.
     * 
     * ```ts
     * pivot: [0.5, 0.8]
     * ```
     * 
     * @prop {Array<number>} [pivot]
     * @memberof Spritesheet
     * */
    pivot?: number[]

    /** 
    * The global value of anchor.
    * 
    * Position of the origin point
    * 
    * The array has two elements: [x, y].  If y is omitted, both x and y will be set to x.
    * 
    * ```ts
    * anchor: [0.5, 0.8]
    * ```
    * 
    * @prop {Array<number>} [anchor]
    * @memberof Spritesheet
    * */
    anchor?: number[]

    /** 
     * Defines the actual size of the sprite that is inside a larger rectangle.
     * For example, if the texture rectangle is 192x192 while the character, which is in the center, is only 64x64 then set `spriteRealSize: 64`. This way the character will be well positioned in relation to the animations that have a different rectangle
     * 
     * > You can also put `spriteRealSize: { width: 64, height: 64 }` but be aware that the width is not concerned because it will always be centered while the height depends on the hitbox
     * 
     * @prop {{ width: number, height: number } | number} [spriteRealSize]
     * @since 3.2.0
     * @memberof Spritesheet
     * */
    spriteRealSize?: { width: number, height: number } | number

    /** 
     * The global value of rotation
     * 
     * Rotation. This will rotate the display object's projection by this angle (in radians).
     * 
     * @prop {number} [angle]
     * @memberof Spritesheet
     * */
    angle?: number

    /** 
     * The global value of rotation
     * 
     * Rotation. This is an alias for rotation, but in degrees.
     * 
     * @prop {number} [rotation]
     * @memberof Spritesheet
     * */
    rotation?: number

    /** 
    * The global value of scale.
    * 
    * Scaling. This will stretch (or compress) the display object's projection. The scale factors are along the local coordinate axes. In other words, the display object is scaled before rotated or skewed. The center of scaling is the pivot.
    * 
    * The array has two elements: [x, y].  If y is omitted, both x and y will be set to x.
    * 
    * ```ts
    * scale: [0.5, 0.8]
    * ```
    * 
    * @prop {Array<number>} [scale]
    * @memberof Spritesheet
    * */
    scale?: number[]

    /** 
    * The global value of skew.
    * 
    * Skewing. This can be used to deform a rectangular display object into a parallelogram.
    * 
    * In PixiJS, skew has a slightly different behaviour than the conventional meaning. It can be thought of the net rotation applied to the coordinate axes (separately). For example, if "skew.x" is ⍺ and "skew.y" is β, then the line x = 0 will be rotated by ⍺ (y = -x*cot⍺) and the line y = 0 will be rotated by β (y = x*tanβ). A line y = x*tanϴ (i.e. a line at angle ϴ to the x-axis in local-space) will be rotated by an angle between ⍺ and β.
    * 
    * It can be observed that if skew is applied equally to both axes, then it will be equivalent to applying a rotation. Indeed, if "skew.x" = -ϴ and "skew.y" = ϴ, it will produce an equivalent of "rotation" = ϴ.
    * 
    * Another quite interesting observation is that "skew.x", "skew.y", rotation are communtative operations. Indeed, because rotation is essentially a careful combination of the two.
    * 
    * The array has two elements: [x, y].  If y is omitted, both x and y will be set to x.
    * 
    * @prop {Array<number>} [skew]
    * @memberof Spritesheet
    * */
    skew?: number[]

    /** 
    * The global value of X translation
    * 
    * @prop {number} [x]
    * @memberof Spritesheet
    * */
    x?: number

    /** 
    * The global value of Y translation
    * 
    * @prop {number} [y]
    * @memberof Spritesheet
    * */
    y?: number

    /** 
     * The global value of visible
     * 
     * @prop {boolean} [visible]
     * @memberof Spritesheet
     * */
    visible?: boolean

    /** 
    * Define the sound that will be played for all animations in the spritesheet. Remember to create the sound before with the @Sound decorator
    * 
    * @prop {string} [sound]
    * @memberof Spritesheet
    * */
    sound?: string
}

export interface FrameOptions extends TransformOptions {
    time: number
    frameX?: number
    frameY?: number
}

export interface TextureOptions {
    /** 
    * The number of frames on the width
    * 
    * @prop {number} framesWidth
    * @memberof Spritesheet
    * */
    framesWidth?: number,

    /** 
     * The number of frames on the height
     * 
     * @prop {number} framesHeight
     * @memberof Spritesheet
     * */
    framesHeight?: number,

    /** 
    * The width of the image (in pixels)
    * 
    * @prop {number} width
    * @memberof Spritesheet
    * */
    width?: number,

    /** 
     * The height of the image (in pixels)
     * 
     * @prop {number} height
     * @memberof Spritesheet
     * */
    height?: number

    /** 
    * Takes a width of a rectangle in the image. Equivalent to `width / framesWidth`
    * 
    * @prop {number} [rectWidth]
    * @memberof Spritesheet
    * */
    rectWidth?: number,

    /** 
    * Takes a height of a rectangle in the image. Equivalent to `height / framesHeight`
    * 
    * @prop {number} [rectHeight]
    * @memberof Spritesheet
    * */
    rectHeight?: number,

    /** 
    * To take the texture, start at a well defined X and Y position. Otherwise, it starts at 0,0
    * 
    * @prop {number} [offset]
    * @memberof Spritesheet
    * */
    offset?: { x: number, y: number }
}

export type AnimationFrames = FrameOptions[][] | ((...args: any) => FrameOptions[][])

export interface TexturesOptions extends TextureOptions, TransformOptions {
    animations: AnimationFrames
}

export interface SpritesheetOptions extends TransformOptions, TextureOptions {
    /** 
    * Object containing all animations. 
    * The key to the object is the name of the animation. The value is a two-dimensional array
    * 
    * ```ts
    * textures: {
    *      myanim: {
    *         animations: [
    *              [ { time: 0, frameX: 0, frameY: 0 } ]
    *         ]
    *      }
    * }
    * ```
    * 
    * The first array represents an animation group. You can put several of them together to create an animation cluster. For example, several explosions with the same spritesheet
    * The second array represents the animation itself which will animate over time. The object indicates, over a period of time (in frame), which part of the spritesheet will be taken (`frameX`, `frameY`)
    * 
    * Here are the properties:
    * 
    * * `time`: Time in frame
    * * `frameX`: Retrieve a frame from the spritesheet on the X-axis
    * * `frameY`: Retrieve a frame from the spritesheet on the Y-axis
    * * `opacity`
    * * `pivot`
    * * `anchor`
    * * `rotation`
    * * `angle`
    * * `scale`
    * * `skew`
    * * `x`
    * * `y`
    * * `visible`
    * * `sound`: The sound that will be played during the frame
    * 
    * ---
    * **Extract Animation of Spritesheet**
    * 
    * Sometimes the animation is part of the image
    * 
    * ```ts
    * textures: {
    *      myanim: {
    *          rectWidth: 64,
    *          rectHeight: 64,
    *          framesWidth: 10,
    *          framesHeight: 2,
    *          offset: {x: 0, y: 230},
    *          sound: 'my-sound-id', // You can put a sound just for the animation
    *          animations: [
    *               [ { time: 0, frameX: 0, frameY: 0 } ]
    *          ]
    *      }
    * }
    * ```
    * 
    * Above, we can specify which part we want to recover
    * 
    * 1. We go to the position {0, 230} of the image (`offset`)
    * 2. We recover cells of 64px (`rectWidth` and `rectHeight`)
    * 3. And we get 20 cells (10 on the width, 2 on the height) (`frameX` and `frameY`)
    * 
    * --- 
    * 
    * **Advanced**
    * 
    * You can create an animation that will be linked to a data. For example, different animation according to a direction of the character.
    * 
    * Full example: 
    * 
    * ```ts
    * import { Spritesheet, Animation, Direction } from '@rpgjs/client'
    * 
    * @Spritesheet({
    *      id: 'chest',
    *      image: require('./assets/chest.png'),
    *      width: 124,
    *      height: 61,
    *      framesHeight: 2,
    *      framesWidth: 4,
    *      textures: {
    *          [Animation.Stand]: {
    *              animations: direction => [[ {time: 0, frameX: 3, frameY: direction == Direction.Up ? 0 : 1 } ]]
    *          }
    *      })
    * })
    * export class Chest  { }
    * ```
    * 
    * > It is important to know that `Animation.Stand` animation is called if it exists. it only works in the case of an event that doesn't move. The direction is then sent
    * 
    * As you can see, the property contains a function that returns the array for the animation. Here, it is the direction but the parameters depend on the call of the animation. Example: 
    * 
    * ```ts
    * import { Spritesheet, Animation, Direction, RpgSprite, ISpriteCharacter } from '@rpgjs/client'
    * 
    * @Spritesheet({
    *      id: 'chest',
    *      image: require('./assets/chest.png'),
    *      width: 124,
    *      height: 61,
    *      framesHeight: 2,
    *      framesWidth: 4,
    *      textures: {
    *          [Animation.Stand]: {
    *              animations: str => [[ {time: 0, frameX: 3, frameY: str == 'hello' ? 0 : 1 } ]]
    *          }
    *      }
    * })
    * export class Chest implements ISpriteCharacter { 
    *      onCharacterStand(sprite: RpgSprite) {
    *         sprite.animation.play(Animation.Stand, ['hello'])
    *      }
    * }
    * ```
    * 
    * @prop { { [animName: string]: { animations: Array<Array<FrameOptions>> | Function, ...other } } } [textures]
    * @memberof Spritesheet
    * */
    textures?: {
        [animationName: string]: Partial<TexturesOptions> & Pick<TexturesOptions, 'animations'>
    }
}

type SpritesheetImageOptions = SpritesheetOptions & {
    /** 
     * The link to the image
     * 
     * > Do not use the `images` property
     * > Remember to wrap the link to the image with the `require` function.
     * 
     * ```ts
     * image: require('./assets/hero.png')
     * ```
     * 
     * @prop {string} [image]
     * @memberof Spritesheet
     * */
    image?: string,
    /** 
    * Spritesheet identifier.
    * 
    * > Do not use the `images` property
    * 
    * @prop {string} [id]
    * @memberof Spritesheet
    * */
    id: string
}
type SpritesheetImagesOptions = SpritesheetOptions & {
    /** 
     * Put the different images that are concerned by the properties below.
     * The key of the object is the identifier of the spritesheet and the value and the link to the image.
     * 
     * > Remember to wrap the link to the image with the `require` function.
     * 
     * ```ts
     * images: {
     *    hero: require('./assets/hero.png')
     * }
     * ```
     * 
     * @prop { { [id: string]: string } } [images]
     * @memberof Spritesheet
     * */
    images?: { [id: string]: string }
}

export function Spritesheet(options: SpritesheetImageOptions)
export function Spritesheet(options: SpritesheetImagesOptions)
export function Spritesheet(options: SpritesheetImageOptions | SpritesheetImagesOptions) {
    return (target: Function) => {
        if ('images' in options) target['images'] = options.images
        if ('id' in options) target['id'] = options.id
        for (let key in options) {
            target.prototype[key] = options[key]
        }
        return
    }
}