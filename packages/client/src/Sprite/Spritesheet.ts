export interface AnimationOptions {
    [animationName: string]: {
        time: number,
        frameX?: number,
        frameY?: number
        x?: number
        y?: number
    }[][]
}

export interface SpritesheetOptions {
    images?: {
        [id: string]: string
    }
    id?: string
    image?: string,
    framesWidth?: number,
    framesHeight?: number,
    width?: number,
    height?: number,
    animations?: AnimationOptions,
    anchor?: number[]
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