import { Utils, RpgPlugin, HookClient } from '@rpgjs/common'
import { spritesheets } from './Spritesheets'
import { Animation } from '../Effects/Animation'
import { Animation as AnimationEnum } from '../Effects/AnimationCharacter'
import { RpgComponent } from '../Components/Component'
import { TransformOptions } from './Spritesheet'
import { Sprite } from 'pixi.js'

const { capitalize } = Utils

export default class Character extends Sprite {
    static readonly id: string = 'graphic'

    private spritesheet: any
    private playStandardAnimation: boolean = true
    public animation: Animation
    private objSaved: object = {}
    private data: any = {}
    
     /** @internal */
     h: number = 1
     /** @internal */
     w: number = 1
    
    /** @internal */
    anim: Animation

    constructor(private component: RpgComponent, private graphic: string) {
        super()
        this.data = component.logic
        this.setGraphic(graphic)
    }

    /** @internal */
    showAnimation(graphic: string | string[], animationName: string): Animation | null {
        const refreshAnimation = (graphic: string) => {
            this.removeChild(this.animation)
            this.animation = new Animation(graphic)
            this.addChild(this.animation)
            this.setAnimationAnchor()
        }
        const memoryGraphic = this.graphic
        let graphicId: string | undefined = ''

         // Changes only graphics already defined on the character
        if (Utils.isArray(graphic)) {
            graphicId = (graphic as string[]).find(id => id == this.graphic)
        }
        else {
            graphicId = graphic as string
        }

        if (!graphicId) {
            return null
        }

        refreshAnimation(graphicId)

        this.component.animationIsPlaying = true
        
        this.animation.onFinish = () => {
            this.playStandardAnimation = true
            this.component.animationIsPlaying = false
            refreshAnimation(memoryGraphic)
            this.update(this.objSaved)
        }

        this.playStandardAnimation = false
        this.playAnimation(animationName)
        return this.animation
    }

    /** @internal */
    setGraphic(graphic: string) {
        (this.children as Animation[]).forEach((graphic: Animation, index: number) => {
            if (graphic.id == this.graphic) {
                this.removeChildAt(index)
            }
        })
        this.graphic = graphic
        this.spritesheet = spritesheets.get(this.graphic)
        this.animation = new Animation(this.graphic)
        this.addChild(this.animation)
        this.setAnimationAnchor()
    }

    getGraphicHeight(): number {
        return this.animation.getSpriteHeight()
    }

    getGraphicWidth(): number {
        return this.animation.getSpriteWidth()
    }

    animationSprite() {
        return this.animation.animation$
    }

    private setAnimationAnchor(): void {
        this.animation.hitbox = { h: this.data.hHitbox, w: this.data.wHitbox }
        this.animation.applyTransform = (frame, animation, spritesheet) => {
            const { spriteWidth, spriteHeight } = animation
            const prop: keyof TransformOptions = 'spriteRealSize'
            const currentAnchor = frame[prop] || animation[prop] || spritesheet[prop]
            if (currentAnchor) {
                return {}
            }
            return {
                spriteRealSize: {
                    width: spriteWidth,
                    height: spriteHeight
                }
            }
        }
    }

    /** @internal */
    update(obj, options: any = {}, deltaRatio: number = 1): {
        moving: boolean
        instance: Character
    } {
        const { moving } = options
        this.data = obj
        if (this.anim) this.anim.update(deltaRatio)
        if (this.animation) this.animation.update(deltaRatio)

        if (this.playStandardAnimation) {
            if (moving) {
               RpgPlugin.emit(HookClient.SpriteMove, this)
               this.playAnimation(AnimationEnum.Walk)
            }
            else {
               this.playAnimation(AnimationEnum.Stand)
            }
        }

        this.objSaved = obj

        return {
            moving,
            instance: this
        }
    }

    /** @internal */
    playAnimation(name: string) {
        const hook = `onCharacter${capitalize(name)}`
        if (!this.spritesheet) return
        if (this.spritesheet[hook]) {
            this.spritesheet[hook](this)
        }
        else if (this.animation.has(name)) {
            this.animation.play(name, [this.data.direction])
        }
    }

}