export interface TransformOptions {
    opacity?: number
    pivot?: number[]
    anchor?: number[]
    angle?: number
    rotation?: number
    scale?: number[]
    skew?: number[]
    x?: number
    y?: number
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
    images?: {
        [id: string]: string
    }
    id?: string
    image?: string,
    framesWidth?: number,
    framesHeight?: number,
    width?: number,
    height?: number,
    animations?: AnimationOptions
}

export function frameTo() {

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