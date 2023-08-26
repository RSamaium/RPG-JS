import { Utils } from '@rpgjs/common'
import { spritesheets } from '../Sprite/Spritesheets'
import { SpritesheetOptions, TextureOptions, AnimationFrames, FrameOptions, TransformOptions } from '../Sprite/Spritesheet'
import { log } from '../Logger'
import { RpgSound } from '../Sound/RpgSound'
import { RpgComponent } from '../Components/Component'
import { Sprite, Container, Texture, Rectangle } from 'pixi.js'
import { Animation as AnimationEnum } from './AnimationCharacter'
import { BehaviorSubject, Observable } from 'rxjs'

const { isFunction, arrayEquals } = Utils

type Image = { image: string }

type TextureOptionsMerging = TextureOptions & {
    spriteWidth: number
    spriteHeight: number
    sound?: string
} & Image & TransformOptions

type FrameOptionsMerging = TextureOptionsMerging & FrameOptions
type SpritesheetOptionsMerging = TextureOptionsMerging & SpritesheetOptions
type TransformOptionsAsArray = Pick<TransformOptions, 'anchor' | 'scale' | 'skew' | 'pivot'>

type AnimationDataFrames = {
    container: Container,
    sprites: FrameOptionsMerging[],
    frames: Texture[][],
    name: string,
    animations: AnimationFrames,
    params: any[],
    data: TextureOptionsMerging
}

export class Animation extends Sprite {
    private _attachTo: RpgComponent | undefined
    public hitbox: { w: number, h: number }
    public applyTransform: (
        frame: FrameOptionsMerging,
        data: TextureOptionsMerging,
        spritesheet: SpritesheetOptionsMerging
    ) => Partial<FrameOptionsMerging>
    private spritesheet: SpritesheetOptionsMerging
    private currentAnimation: AnimationDataFrames | null = null
    private time: number = 0
    private frameIndex: number = 0
    private animations: Map<string, AnimationDataFrames> = new Map()
    private _animation$: BehaviorSubject<Sprite | null> = new BehaviorSubject(null as any)
    readonly animation$: Observable<Sprite | null> = this._animation$.asObservable()

    onFinish: () => void

    get attachTo(): RpgComponent | undefined {
        return this._attachTo
    }

    set attachTo(component: RpgComponent | undefined) {
        if (!component) return
        component.animationIsPlaying = true
        this._attachTo = component
    }

    constructor(public id: string) {
        super()
        this.spritesheet = spritesheets.get(this.id)
        if (!this.spritesheet) {
            throw log(`Impossible to find the ${this.id} spritesheet. Did you put the right name or create the spritesheet?`)
        }
        this.createAnimations()
    }

    private createTextures(options: Required<TextureOptionsMerging>): Texture[][] {
        const { width, height, framesHeight, framesWidth, image, offset } = options
        const { baseTexture } = Texture.from(image)
        const spriteWidth = options.spriteWidth
        const spriteHeight = options.spriteHeight
        const frames: Texture[][] = []
        const offsetX = (offset && offset.x) || 0
        const offsetY = (offset && offset.y) || 0
        for (let i = 0; i < framesHeight; i++) {
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
                    new Texture(baseTexture, new Rectangle(rectX, rectY, spriteWidth, spriteHeight))
                )
            }
        }
        return frames
    }

    private createAnimations() {
        const { textures } = this.spritesheet
        if (!textures) {
            return
        }
        for (let animationName in textures) {
            const props: (keyof TextureOptionsMerging)[] = ['width', 'height', 'framesHeight', 'framesWidth', 'rectWidth', 'rectHeight', 'offset', 'image', 'sound']
            const parentObj = props
                .reduce((prev, val) => ({ ...prev, [val]: this.spritesheet[val] }), {})
            const optionsTextures: TextureOptionsMerging = {
                ...parentObj,
                ...textures[animationName]
            } as any
            const { rectWidth, width = 0, framesWidth = 1, rectHeight, height = 0, framesHeight = 1 } = optionsTextures
            optionsTextures.spriteWidth = rectWidth ? rectWidth : width / framesWidth
            optionsTextures.spriteHeight = rectHeight ? rectHeight : height / framesHeight
            this.animations.set(animationName, {
                container: new Sprite(),
                frames: this.createTextures(optionsTextures as Required<TextureOptionsMerging>),
                name: animationName,
                animations: textures[animationName].animations,
                params: [],
                data: optionsTextures,
                sprites: []
            })
        }
    }

    private getSpriteSize(name: 'spriteHeight' | 'spriteWidth'): number {
        return this.animations.get(this.currentAnimation?.name || AnimationEnum.Stand)?.data[name] || 0
    }

    getSpriteHeight(): number {
        return this.getSpriteSize('spriteHeight')
    }

    getSpriteWidth(): number {
        return this.getSpriteSize('spriteWidth')
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
        this.parent?.removeChild(this)
    }

    play(name: string, params: any[] = []) {
        const animParams = this.currentAnimation?.params

        if (this.isPlaying(name) && arrayEquals(params, animParams || [])) return

        const animation = this.get(name)

        if (!animation) {
            throw new Error(`Impossible to play the ${name} animation because it doesn't exist on the ${this.id} spritesheet`)
        }

        this.removeChildren()
        animation.sprites = []
        this.currentAnimation = animation
        this.currentAnimation.params = params
        this.time = 0
        this.frameIndex = 0

        let animations: any = animation.animations;
        animations = isFunction(animations) ? (animations as Function)(...params) : animations

        this.currentAnimation.container = new Container()

        for (let container of (animations as FrameOptionsMerging[][])) {
            const sprite = new Sprite()
            for (let frame of container) {
                this.currentAnimation.sprites.push(frame)
            }
            this.currentAnimation.container.addChild(sprite)
        }

        const sound = this.currentAnimation.data.sound

        if (sound) {
            RpgSound.get(sound).play()
        }

        this.addChild(this.currentAnimation.container)
        // Updates immediately to avoid flickering
        this.update(1)
    }

    update(deltaRatio: number) {
        if (!this.isPlaying() || !this.currentAnimation) return

        const { frames, container, sprites, data } = this.currentAnimation
        let frame = sprites[this.frameIndex]
        const nextFrame = sprites[this.frameIndex + 1]

        if (this.attachTo) {
            const sprite = this.attachTo
            const pos = sprite?.getPositionsOfGraphic('middle')
            if (pos) {
                container.x = pos.x
                container.y = pos.y
            }
        }

        for (let _sprite of container.children) {
            const sprite = _sprite as Sprite
            
            if (!frame || frame.frameY == undefined || frame.frameX == undefined) {
                continue
            }

            sprite.texture = frames[frame.frameY][frame.frameX]

            const getVal = <T extends keyof TransformOptions>(prop: T): TransformOptions[T] | undefined =>
                frame[prop] || data[prop] || this.spritesheet[prop]

            const applyTransform = <T extends keyof TransformOptionsAsArray>(prop: T): void => {
                const val = getVal<T>(prop)
                if (val) {
                    sprite[prop as string].set(...val!)
                }
            }

            function applyTransformValue<T extends keyof TransformOptions>(prop: T);
            function applyTransformValue<T extends keyof TransformOptions>(prop: string, alias: T);
            function applyTransformValue<T extends keyof TransformOptions>(prop: T, alias?: T): void {
                const optionProp = alias || prop
                const val = getVal<T>(optionProp)
                if (val !== undefined) {
                    sprite[prop as string] = val
                }
            }

            if (this.applyTransform) {
                frame = {
                    ...frame,
                    ...this.applyTransform(frame, data, this.spritesheet)
                }

            }

            const realSize = getVal<'spriteRealSize'>('spriteRealSize')
            const heightOfSprite = typeof realSize == 'number' ? realSize : realSize?.height
            const widthOfSprite = typeof realSize == 'number' ? realSize : realSize?.width

            const applyAnchorBySize = () => {
                if (heightOfSprite && this.hitbox) {
                    const { spriteWidth, spriteHeight } = data
                    const w = ((spriteWidth - this.hitbox.w) / 2) / spriteWidth
                    const gap = (spriteHeight - heightOfSprite) / 2
                    const h = (spriteHeight - this.hitbox.h - gap) / spriteHeight
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

            this._animation$.next({
                spriteWidth: widthOfSprite || sprite.width,
                spriteHeight: heightOfSprite || sprite.height,
                anchor: sprite.anchor,
                width: getVal<any>('spriteWidth'),
                height: getVal<any>('spriteHeight')
            } as any)
        }

        if (!nextFrame) {
            this.time = 0
            this.frameIndex = 0
            if (this.attachTo) {
                this.attachTo.animationIsPlaying = false
            }
            if (this.onFinish) this.onFinish()
            return
        }

        this.time += deltaRatio

        if (this.time >= nextFrame.time) {
            this.frameIndex++
        }
    }
}