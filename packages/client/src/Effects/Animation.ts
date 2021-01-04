import * as PIXI from 'pixi.js'
import { spritesheets } from '../Sprite/Spritesheets'
import { SpritesheetOptions } from '../Sprite/Spritesheet'

export class Animation extends PIXI.Sprite {

    private frames: PIXI.Texture[][] = []
    private spritesheet: SpritesheetOptions
    private currentAnimation: PIXI.Sprite | null = null
    private time: number = 0
    private animations: Map<string, PIXI.Sprite> = new Map()

    constructor(private id: string) {
        super()
        this.spritesheet = spritesheets.get(this.id)
        if (!this.spritesheet) {
            throw new Error(`Impossible to find the ${this.id} spritesheet. Did you put the right name or create the spritesheet?`)
        }
        this.createTextures()
        this.createAnimations()
    }

    createTextures(): void {
        if (!this.spritesheet.image) return
        const { baseTexture } = PIXI.Texture.from(this.spritesheet.image)
        const { width, height, framesHeight, framesWidth } = this.spritesheet
        if (!width || !framesWidth || !height || !framesHeight) return
        const spriteWidth = width / framesWidth
        const spriteHeight = height / framesHeight
        for (let i = 0; i < framesHeight; i++) {
            this.frames[i] = []
            for (let j = 0; j < framesWidth; j++) {
                this.frames[i].push(
                    new PIXI.Texture(baseTexture, new PIXI.Rectangle(j * spriteWidth, i * spriteHeight, spriteWidth, spriteHeight))
                )
            }
        }
    }

    createAnimations() {
        const { animations } = this.spritesheet
        for (let animationName in animations) {
            const animation = animations[animationName]
            const animSprite = new PIXI.Sprite()
            animSprite.name = animationName
            animSprite['maxTime'] = 0
            for (let layer of animation) {
                const sprite = new PIXI.Sprite()
                const obj: any = {}
                for (let frame of layer) {
                    obj[frame.time] = frame
                    animSprite['maxTime'] = Math.max(animSprite['maxTime'], frame.time)
                }
                sprite['animationObj'] = obj
                animSprite.addChild(sprite)
            }
            this.animations.set(animationName, animSprite)
        }
    }

    has(name: string): boolean {
        return this.animations.has(name)
    }

    get(name: string): PIXI.Sprite {
        return this.animations.get(name) as PIXI.Sprite
    }

    isPlaying(name?: string): boolean {
        if (!name) return !!this.currentAnimation
        if (this.currentAnimation == null) return false
        return this.currentAnimation.name == name
    }

    stop() {
        this.currentAnimation = null
    }

    play(name: string) {
        if (this.isPlaying(name)) return
       
        const animation: PIXI.Sprite = this.get(name)

        if (!animation) {
            throw new Error(`Impossible to play the ${name} animation because it doesn't exist on the ${this.id} spritesheet`)
        }
        
        this.removeChildren()
        this.currentAnimation = animation
        this.time = 0
        this.addChild(animation)
        // Updates immediately to avoid flickering
        this.update()
    }

    update() {
        if (!this.isPlaying() || !this.currentAnimation) return
        for (let container of this.currentAnimation.children) {
            const sprite = container as PIXI.Sprite
            const frame = sprite['animationObj'][this.time]
            if (!frame) continue
            sprite.texture = this.frames[frame.frameY][frame.frameX]
            if (frame.anchor) {
                sprite.anchor.set(frame.anchor)
            }
            else if (this.spritesheet.anchor) {
                sprite.anchor.set(...this.spritesheet.anchor)
            }
        }
        this.time++
        if (this.time > this.currentAnimation['maxTime']) {
            this.time = 0
        }
    }
}