import { Utils } from '@rpgjs/common'
import { spritesheets } from '../Sprite/Spritesheets'
import { SpritesheetOptions, TextureOptions, AnimationFrames, FrameOptions } from '../Sprite/Spritesheet'
import RpgSprite from '../Sprite/Character'
import { log } from '../Logger'
import { RpgSound } from '../Sound/RpgSound'

const { isFunction, arrayEquals } = Utils

type AnimationDataFrames = {
    container: PIXI.Container,
    sprites: {
        [time: number]: FrameOptions
    },
    maxTime: number,
    frames: PIXI.Texture[][],
    name: string,
    animations: AnimationFrames,
    params: any[],
    data: any
} 

export class Animation extends PIXI.Sprite {

    public attachTo: RpgSprite
    public hitbox: { w: number, h: number }
    public applyTransform: Function
    private frames: PIXI.Texture[][] = []
    private spritesheet: SpritesheetOptions
    private currentAnimation: AnimationDataFrames | null = null
    private time: number = 0
    private animations: Map<string, AnimationDataFrames> = new Map()

    onFinish: () => void

    constructor(public id: string) {
        super()
        this.spritesheet = spritesheets.get(this.id)
        if (!this.spritesheet) {
            throw log(`Impossible to find the ${this.id} spritesheet. Did you put the right name or create the spritesheet?`)
        }
        this.createAnimations()
    }

    createTextures(options: TextureOptions): PIXI.Texture[][] {
        const { width, height, framesHeight, framesWidth, image, offset }: any = options
        const { baseTexture } = PIXI.Texture.from(image)
        const spriteWidth = options['spriteWidth']
        const spriteHeight = options['spriteHeight']
        const frames: any = []
        const offsetX = (offset && offset.x) || 0
        const offsetY = (offset && offset.y) || 0
        for (let i = 0; i < framesHeight ; i++) {
            frames[i] = []
            for (let j = 0; j < framesWidth; j++) {
                const rectX = j * spriteWidth + offsetX
                const rectY = i * spriteHeight + offsetY
                if (rectY > height) {
                    throw log(`Warning, there is a problem with the height of the "${this.id}" spritesheet. When cutting into frames, the frame exceeds the height of the image.`)
                }
                if (rectX > width) {
                    throw log(`Warning, there is a problem with the width of the "${this.id}" spritesheet. When cutting into frames, the frame exceeds the width of the image.`)
                }
                frames[i].push(
                    new PIXI.Texture(baseTexture, new PIXI.Rectangle(rectX, rectY, spriteWidth, spriteHeight))
                )
            }
        }
        return frames
    }

    createAnimations() {
        const { textures } = this.spritesheet
        for (let animationName in textures) {
            const parentObj = ['width', 'height', 'framesHeight', 'framesWidth', 'rectWidth', 'rectHeight', 'offset', 'image', 'sound']
                .reduce((prev, val) => ({ ...prev, [val]: this.spritesheet[val] }), {})
            const optionsTextures: any = {
                ...parentObj,
                ...textures[animationName]
            }
            const { rectWidth, width, framesWidth, rectHeight, height, framesHeight } = optionsTextures
            optionsTextures.spriteWidth = rectWidth ? rectWidth : width / framesWidth
            optionsTextures.spriteHeight = rectHeight ? rectHeight : height / framesHeight
            this.animations.set(animationName, {
                container: new PIXI.Sprite(),
                maxTime: 0,
                frames: this.createTextures(optionsTextures),
                name: animationName,
                animations: textures[animationName].animations,
                params: [],
                data: optionsTextures,
                sprites: {}
            })
        }
    }

    has(name: string): boolean {
        return this.animations.has(name)
    }

    get(name: string): AnimationDataFrames {
        return this.animations.get(name) as AnimationDataFrames
    }

    isPlaying(name?: string): boolean {
        if (!name) return !!this.currentAnimation
        if (this.currentAnimation == null) return false
        return this.currentAnimation.name == name
    }

    stop() {
        this.currentAnimation = null
        this.parent.removeChild(this)
    }

    play(name: string, params: any[] = []) {

        const animParams = this.currentAnimation?.params

        if (this.isPlaying(name) && arrayEquals(params, animParams || [])) return
       
        const animation = this.get(name)

        if (!animation) {
            throw new Error(`Impossible to play the ${name} animation because it doesn't exist on the ${this.id} spritesheet`)
        }

        this.removeChildren()
        animation.sprites = {}
        this.currentAnimation = animation
        this.currentAnimation.params = params
        this.time = 0

        let animations: any = animation.animations;
        animations = isFunction(animations) ? (animations as Function)(...params) : animations

        this.currentAnimation.container = new PIXI.Container()

        for (let container of (animations as FrameOptions[][])) {
            const sprite = new PIXI.Sprite()
            for (let frame of container) {
                this.currentAnimation.sprites[frame.time] = frame
                this.currentAnimation.maxTime = Math.max(this.currentAnimation.maxTime, frame.time)
            }
           this.currentAnimation.container.addChild(sprite)
        }

        const sound = this.currentAnimation.data.sound

        if (this.currentAnimation.data.sound) {
            RpgSound.get(sound).play()
        }

        this.addChild(this.currentAnimation.container)
        // Updates immediately to avoid flickering
        this.update()
    }

    update() {
        if (!this.isPlaying() || !this.currentAnimation) return  

        const { frames, container, sprites, data } = this.currentAnimation

        if (this.attachTo) {
            const { x, y } = this.attachTo.getPositionsOfGraphic('middle')
            container.x = x
            container.y = y
        }

        for (let _sprite of container.children) {
            const sprite = _sprite as PIXI.Sprite
            let frame = sprites[this.time]
            if (!frame || frame.frameY == undefined || frame.frameX == undefined) {
                continue
            }
            sprite.texture = frames[frame.frameY][frame.frameX]
            
            const getVal = (prop) => frame[prop] || data[prop] || this.spritesheet[prop]
            
            const applyTransform = (prop) => {
                const val = getVal(prop)
                if (val) {
                    sprite[prop].set(...val)
                }
            }
            const applyTransformValue = (prop, alias = '') => {
                const optionProp = alias || prop
                const val = getVal(optionProp)
                if (val !== undefined) {
                    sprite[prop] = val
                }
            }

            if (this.applyTransform) {
                frame = {
                    ...frame,
                    ...this.applyTransform(frame, data, this.spritesheet)
                }
    
            }

            const applyAnchorBySize = () => {
                const prop = 'anchorBySize'
                const val = getVal(prop)
                if (val && this.hitbox) {
                    const w = ((data.spriteWidth - this.hitbox.w) / 2) / data.spriteWidth
                    const h = 1 - (this.hitbox.h / (val[1] || val[0]))
                    sprite.anchor.set(w, h)
                }
            }

            if (frame.sound) {
                RpgSound.get(frame.sound).play()
            }

            applyAnchorBySize()

            applyTransform('anchor')
            applyTransform('scale')
            applyTransform('skew')
            applyTransform('pivot')

            applyTransformValue('alpha', 'opacity')
            applyTransformValue('x')
            applyTransformValue('y')
            applyTransformValue('angle')
            applyTransformValue('rotation')
            applyTransformValue('visible')
        }
        this.time++
        if (this.time > this.currentAnimation.maxTime) {
            this.time = 0
            if (this.onFinish) this.onFinish()
        }
    }
}