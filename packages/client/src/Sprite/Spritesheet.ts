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
}

export interface FrameOptions extends TransformOptions {
    time: number,
    frameX?: number
    frameY?: number
}

export interface AnimationOptions {
    [animationName: string]: FrameOptions[][]
}

export interface SpritesheetOptions extends TransformOptions {
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
    images?: {
        [id: string]: string
    }

    /** 
     * Spritesheet identifier.
     * The key of the object is the identifier of the spritesheet and the value and the link to the image.
     * 
     * > Do not use the `images` property
     * 
     * @prop {string} [id]
     * @memberof Spritesheet
     * */
    id?: string

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
     * The number of frames on the width
     * 
     * @prop {number} [framesWidth]
     * @memberof Spritesheet
     * */
    framesWidth?: number,

    /** 
     * The number of frames on the height
     * 
     * @prop {number} [framesHeight]
     * @memberof Spritesheet
     * */
    framesHeight?: number,

     /** 
     * The width of the image (in pixels)
     * 
     * @prop {number} [width]
     * @memberof Spritesheet
     * */
    width?: number,

    /** 
     * The height of the image (in pixels)
     * 
     * @prop {number} [height]
     * @memberof Spritesheet
     * */
    height?: number,

     /** 
     * Object containing all animations. 
     * The key to the object is the name of the animation. The value is a two-dimensional array
     * 
     * ```ts
     * animations: {
     *      myanim: [
     *          [ { time: 0, frameX: 0, frameY: 0 } ]
     *      ]
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
     * 
     * 
     * @prop { { [animName: string]: Array<Array<FrameOptions>> } } [animations]
     * @memberof Spritesheet
     * */
    animations?: AnimationOptions
}

export function Spritesheet(options: SpritesheetOptions) {
    return (target) => {
        target.images = options.images
        target.id = options.id
        for (let key in options) {
            target.prototype[key] = options[key]
        }
    }
}